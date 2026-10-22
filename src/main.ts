import "./styles.css";
import { fmtTime } from "./core/format";
import { TAU } from "./core/math";
import type { EnemyId, SatId } from "./data/content";
import { SAVE_KEY, computeStats, loadProfile, newProfile, type Profile } from "./game/profile";
import { Run } from "./game/sim";
import { Scene } from "./render/scene";
import { Hub, type HubTab } from "./ui/hub";
import { RunHud } from "./ui/runhud";

const STEP = 1 / 60;

class App {
  profile: Profile;
  readonly scene: Scene;
  readonly ui = document.getElementById("ui")!;
  readonly cv = document.getElementById("board") as HTMLCanvasElement;
  readonly touch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  mode: "hub" | "run" = "hub";
  run: Run;
  hud: RunHud | null = null;
  hub: Hub | null = null;
  build = false;
  paused = false;
  sel: { ring: number; slot: number } | null = null;
  private acc = 0;
  private last = performance.now();
  private resetting = false;
  private ended = false;
  private strongSrc = new Set<string>();
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; moved: boolean }>();
  private mover = -1;
  private demoT = 0;

  constructor() {
    this.profile = loadProfile(localStorage.getItem(SAVE_KEY));
    this.scene = new Scene(this.cv);
    document.body.classList.toggle("touch", this.touch);
    const v = this.scene.resize(window.innerWidth, window.innerHeight);
    this.run = this.makeDemo(v);
    this.showHub("play");
    this.bindInput();
    window.addEventListener("resize", () => {
      const vv = this.scene.resize(window.innerWidth, window.innerHeight);
      this.run.setView(vv.hw, vv.hh);
    });
    window.addEventListener("beforeunload", () => this.persist());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.persist();
        if (this.mode === "run" && !this.ended && !this.paused) this.hud?.act("pause");
      }
    });
    requestAnimationFrame((t) => this.frame(t));
  }

  // ------------------------------------------------------------ persistência
  save(): void {
    if (this.resetting) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.profile));
    } catch {
      /* armazenamento indisponível */
    }
  }

  private persist(): void {
    if (this.mode === "run" && !this.ended) {
      const m = this.run.bank();
      this.profile.matter += m;
      this.profile.matterTotal += m;
    }
    this.save();
  }

  reset(): void {
    this.resetting = true;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* nada */
    }
    this.profile = newProfile();
    location.reload();
  }

  // ------------------------------------------------------------ telas
  private makeDemo(v: { hw: number; hh: number }): Run {
    const st = computeStats(newProfile());
    st.unlocked = ["laser", "mine", "cannon", "deflector", "stasis", "collector"];
    const r = new Run(st, 7, v, true);
    r.fragments = 9999;
    const put: [number, number, SatId][] = [
      [0, 0, "laser"],
      [0, 2, "mine"],
      [1, 1, "deflector"],
      [1, 4, "cannon"],
    ];
    for (const [ri, i, t] of put) r.buy(ri, i, t);
    r.hole.x = r.hole.tx = -200;
    return r;
  }

  showHub(tab: HubTab): void {
    this.hud?.destroy();
    this.hud = null;
    this.mode = "hub";
    this.build = false;
    this.paused = false;
    this.sel = null;
    this.strongSrc.clear();
    this.run = this.makeDemo(this.run.view);
    document.body.classList.remove("in-run");
    this.hub?.destroy();
    this.hub = new Hub(
      {
        profile: this.profile,
        touch: this.touch,
        start: (tut) => this.startRun(tut),
        save: () => this.save(),
        reset: () => this.reset(),
      },
      this.ui,
      tab,
    );
  }

  startRun(tutorial: boolean): void {
    this.hub?.destroy();
    this.hub = null;
    this.mode = "run";
    this.ended = false;
    this.build = false;
    this.paused = false;
    this.sel = null;
    this.strongSrc.clear();
    this.acc = 0;
    document.body.classList.add("in-run");
    const st = computeStats(this.profile);
    this.run = new Run(st, (Math.random() * 1e9) | 0, this.run.view, tutorial);
    this.hud?.destroy();
    const app = this;
    this.hud = new RunHud(
      {
        get run() {
          return app.run;
        },
        touch: this.touch,
        get build() {
          return app.build;
        },
        set build(v: boolean) {
          app.build = v;
        },
        get sel() {
          return app.sel;
        },
        set sel(v) {
          app.sel = v;
        },
        get paused() {
          return app.paused;
        },
        set paused(v: boolean) {
          app.paused = v;
        },
        setBuild: (on) => this.setBuild(on),
        setStrong: (src, on) => this.setStrong(src, on),
        setPaused: (on) => {
          this.paused = on;
          if (on) this.clearHolds();
        },
        abandon: () => this.endRun(true),
        tutorialFinished: () => {
          this.profile.tutorialDone = true;
          this.save();
        },
      },
      this.ui,
      tutorial,
    );
  }

  setBuild(on: boolean): void {
    if (this.ended) return;
    this.build = on;
    this.sel = null;
    if (on) this.clearHolds();
  }

  private clearHolds(): void {
    this.strongSrc.clear();
    this.run.setStrong(false);
  }

  setStrong(src: string, on: boolean): void {
    if (on && (this.build || this.paused)) return;
    if (on) this.strongSrc.add(src);
    else this.strongSrc.delete(src);
    this.run.setStrong(this.strongSrc.size > 0);
  }

  private endRun(abandoned: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.build = false;
    this.sel = null;
    const r = this.run;
    const p = this.profile;
    const m = r.bank();
    p.matter += m;
    p.matterTotal += m;
    const wave = Math.max(0, r.wave);
    const record = wave > p.bestWave;
    p.bestWave = Math.max(p.bestWave, wave);
    p.runs++;
    p.kills += r.kills;
    this.save();
    if (abandoned && r.wave <= 0) return this.showHub("play");
    this.hud?.showEnd(
      { wave, kills: r.kills, impacts: r.impactKills, combo: r.bestCombo, matter: r.matter, record, time: fmtTime(r.t) },
      () => this.showHub("tree"),
      () => this.startRun(false),
    );
  }

  // ------------------------------------------------------------ entrada
  private bindInput(): void {
    const cv = this.cv;
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("pointerdown", (e) => {
      if (this.mode !== "run" || this.paused || this.ended) return;
      cv.setPointerCapture(e.pointerId);
      const w = this.scene.toWorld(e.clientX, e.clientY);
      if (e.pointerType === "mouse") {
        if (e.button === 2) {
          if (!this.build) this.run.pulse();
          return;
        }
        if (this.build) return this.tapBuild(w.x, w.y);
        this.run.setTarget(w.x, w.y);
        this.setStrong("mouse", true);
        return;
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
      if (this.mover < 0 || !this.pointers.has(this.mover)) this.mover = e.pointerId;
      else if (!this.build) this.setStrong("finger", true);
    });
    cv.addEventListener("pointermove", (e) => {
      if (this.mode !== "run") return;
      if (e.pointerType === "mouse") {
        const w = this.scene.toWorld(e.clientX, e.clientY);
        this.run.setTarget(w.x, w.y);
        return;
      }
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 10) p.moved = true;
      if (e.pointerId === this.mover && !this.build && !this.paused) {
        const k = 1.7 / this.scene.s;
        const h = this.run.hole;
        this.run.setTarget(h.tx + (e.clientX - p.x) * k, h.ty + (e.clientY - p.y) * k);
      }
      p.x = e.clientX;
      p.y = e.clientY;
    });
    const up = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        this.setStrong("mouse", false);
        return;
      }
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (p && this.build && !p.moved && this.mode === "run") {
        const w = this.scene.toWorld(e.clientX, e.clientY);
        this.tapBuild(w.x, w.y);
      }
      if (e.pointerId === this.mover) {
        const rest = [...this.pointers.keys()];
        this.mover = rest.length ? rest[0] : -1;
      }
      if (this.pointers.size < 2) this.setStrong("finger", false);
    };
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    window.addEventListener("keydown", (e) => {
      if (this.mode !== "run" || this.ended) return;
      const k = e.key.toLowerCase();
      if (k === " ") {
        e.preventDefault();
        if (!this.build && !this.paused) this.run.pulse();
      } else if (k === "shift") this.setStrong("key", true);
      else if (k === "b") this.hud?.act("build");
      else if (k === "escape" || k === "p") {
        if (this.build) this.setBuild(false);
        else if (this.paused) this.hud?.act("resume");
        else this.hud?.act("pause");
      } else if (k === "1" || k === "2" || k === "3") this.run.selectRing(Number(k) - 1);
      else if (k === "q") this.run.setSpin(-1);
      else if (k === "e") this.run.setSpin(1);
    });
    window.addEventListener("keyup", (e) => {
      const k = e.key.toLowerCase();
      if (k === "shift") this.setStrong("key", false);
      else if (k === "q" || k === "e") this.run.setSpin(0);
    });
    window.addEventListener("blur", () => this.clearHolds());
  }

  private tapBuild(x: number, y: number): void {
    const r = this.run;
    let best: { ring: number; slot: number } | null = null;
    let bd = Math.max(22, 30 / this.scene.s);
    for (let ri = 0; ri < r.st.rings; ri++)
      for (let i = 0; i < r.rings[ri].slots.length; i++) {
        const p = r.slotPos(ri, i);
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bd) {
          bd = d;
          best = { ring: ri, slot: i };
        }
      }
    this.sel = best;
    if (best) r.selectRing(best.ring);
    this.hud?.update();
  }

  // ------------------------------------------------------------ laço principal
  private frame(now: number): void {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const r = this.run;
    if (this.mode === "run") {
      if (!this.paused && !this.build && !this.ended) {
        this.acc += dt;
        let n = 0;
        while (this.acc >= STEP && n < 6) {
          r.step(STEP);
          this.acc -= STEP;
          n++;
        }
        if (n === 6) this.acc = 0;
      } else if (this.build) r.manualRotate(dt);
      this.handleEvents();
      this.hud?.update(dt);
      this.scene.draw(r, this.paused ? 0 : dt, { build: this.build, sel: this.sel, marker: this.hud?.marker ?? null });
    } else {
      this.demo(dt);
      this.scene.consume(r.events);
      r.events.length = 0;
      this.scene.draw(r, dt, { build: false, sel: null, marker: null });
    }
    requestAnimationFrame((t) => this.frame(t));
  }

  private handleEvents(): void {
    const r = this.run;
    for (const e of r.events) {
      if (e.k === "wave") this.hud?.flash(e.boss ? `<b>Onda ${e.n}</b><small>um Leviatã se aproxima</small>` : `<b>Onda ${e.n}</b>`, e.boss ? "boss" : "");
      else if (e.k === "waveClear") this.hud?.flash(`<b>Onda ${e.n} concluída</b><small>+${e.frags} ◆ · +${Math.round(e.matter)} matéria escura</small>`, "ok");
      else if (e.k === "shield") this.hud?.flash("<b>Escudo de emergência!</b>", "ok");
    }
    this.scene.consume(r.events);
    const over = r.events.some((e) => e.k === "over");
    r.events.length = 0;
    if (over) this.endRun(false);
  }

  /** partida automática no fundo do menu */
  private demo(dt: number): void {
    const r = this.run;
    this.demoT += dt;
    const t = this.demoT;
    const { hw, hh } = r.view;
    r.setTarget(Math.sin(t * 0.37) * hw * 0.72, Math.sin(t * 0.53 + 1) * hh * 0.7);
    r.setStrong(Math.sin(t * 0.9) > 0.1);
    if (r.enemies.length < 12 && Math.floor(t / 0.9) !== Math.floor((t - dt) / 0.9)) {
      const types: EnemyId[] = ["wanderer", "wanderer", "drone", "armored", "comet", "splitter", "antimatter"];
      const p = r.edgePoint(Math.random() * TAU, 30);
      r.spawn(types[Math.floor(Math.random() * types.length)], p.x, p.y);
    }
    if (Math.floor(t / 5) !== Math.floor((t - dt) / 5)) r.pulse();
    r.step(dt);
    r.core.hp = r.core.maxHp;
    r.fragments = 9999;
  }
}

(window as unknown as { __app: App }).__app = new App();
