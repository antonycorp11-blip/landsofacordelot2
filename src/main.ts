import "./styles.css";
import { Synth } from "./audio/synth";
import { fmtTime } from "./core/format";
import { TAU } from "./core/math";
import { KEYS, MAJOR, ROOMS_PER_CONCERT, degreeMidi, type EnemyId } from "./data/content";
import { SAVE_KEY, computeStats, loadProfile, newProfile, type Profile } from "./game/profile";
import { Run, type SimEvent } from "./game/sim";
import { Scene } from "./render/scene";
import { Hub, type HubTab } from "./ui/hub";
import { RunHud } from "./ui/runhud";

const STEP = 1 / 60;

class App {
  profile: Profile;
  readonly scene: Scene;
  readonly synth = new Synth();
  readonly ui = document.getElementById("ui")!;
  readonly cv = document.getElementById("board") as HTMLCanvasElement;
  readonly touch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  mode: "hub" | "run" = "hub";
  run: Run;
  hud: RunHud | null = null;
  hub: Hub | null = null;
  paused = false;
  private ended = false;
  private resetting = false;
  private acc = 0;
  private last = performance.now();
  private demoT = 0;
  private pointerIn = false;
  private touchId = -1;
  private view = { hw: 400, hh: 300 };

  constructor() {
    this.profile = loadProfile(localStorage.getItem(SAVE_KEY));
    this.synth.muted = this.profile.muted;
    this.scene = new Scene(this.cv);
    document.body.classList.toggle("touch", this.touch);
    this.view = this.scene.resize(window.innerWidth, window.innerHeight);
    this.run = this.makeDemo();
    this.showHub("concert");
    this.bindInput();
    window.addEventListener("resize", () => {
      this.view = this.scene.resize(window.innerWidth, window.innerHeight);
      this.run.setView(this.view.hw, this.view.hh);
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

  private banked = 0;
  private persist(): void {
    if (this.mode === "run" && !this.ended) {
      const v = this.run.notes - this.banked;
      this.banked = this.run.notes;
      this.profile.notes += v;
      this.profile.notesTotal += v;
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
    location.reload();
  }

  // ------------------------------------------------------------ telas
  private makeDemo(): Run {
    const r = new Run(computeStats(newProfile()), 0, 11, true);
    r.setView(this.view.hw, this.view.hh);
    return r;
  }

  showHub(tab: HubTab): void {
    this.hud?.destroy();
    this.hud = null;
    this.mode = "hub";
    this.paused = false;
    document.body.classList.remove("in-run");
    this.synth.drone(null);
    this.run = this.makeDemo();
    this.hub?.destroy();
    this.hub = new Hub(
      {
        profile: this.profile,
        touch: this.touch,
        start: (k, tut) => this.startRun(k, tut),
        save: () => this.save(),
        reset: () => this.reset(),
        preview: (m) => {
          this.synth.unlock();
          m.forEach((n, i) => setTimeout(() => this.synth.pluck(n, 0.45, 1, 1.2), i * 90));
        },
      },
      this.ui,
      tab,
    );
  }

  startRun(keyIdx: number, tutorial: boolean): void {
    this.synth.unlock();
    this.hub?.destroy();
    this.hub = null;
    this.mode = "run";
    this.ended = false;
    this.paused = false;
    this.banked = 0;
    this.acc = 0;
    document.body.classList.add("in-run");
    this.run = new Run(computeStats(this.profile), tutorial ? 0 : keyIdx, (Math.random() * 1e9) | 0, tutorial);
    this.run.setView(this.view.hw, this.view.hh);
    this.synth.drone(this.run.key.root);
    const app = this;
    this.hud?.destroy();
    this.hud = new RunHud(
      {
        get run() {
          return app.run;
        },
        touch: this.touch,
        get muted() {
          return app.synth.muted;
        },
        set muted(v: boolean) {
          app.synth.setMuted(v);
        },
        setPaused: (on) => (this.paused = on),
        toggleMute: () => {
          this.synth.unlock();
          this.synth.setMuted(!this.synth.muted);
          this.profile.muted = this.synth.muted;
          this.save();
        },
        abandon: () => this.endRun(),
        tutorialFinished: () => {
          this.profile.tutorialDone = true;
          this.save();
        },
      },
      this.ui,
      tutorial,
    );
  }

  private endRun(): void {
    if (this.ended) return;
    this.ended = true;
    const r = this.run;
    const p = this.profile;
    const won = r.phase === "won";
    const v = r.notes - this.banked;
    p.notes += v;
    p.notesTotal += v;
    p.scores += r.scores;
    p.runs++;
    p.kills += r.kills;
    p.chords += r.chords;
    const reached = won ? ROOMS_PER_CONCERT + 1 : r.room;
    p.best[r.key.id] = Math.max(p.best[r.key.id] ?? 0, reached);
    let unlocked: string | null = null;
    if (won) {
      p.wins++;
      if (r.keyIdx === p.keyUnlocked && p.keyUnlocked < KEYS.length - 1) {
        p.keyUnlocked++;
        unlocked = KEYS[p.keyUnlocked].name;
      }
    }
    this.save();
    if (!won && r.room <= 1 && r.kills === 0) return this.showHub("concert");
    this.hud?.showEnd(
      { won, room: r.room, kills: r.kills, chords: r.chords, notes: r.notes, scores: r.scores, unlocked, time: fmtTime(r.t) },
      () => this.showHub("tree"),
      () => this.startRun(r.keyIdx, false),
    );
  }

  // ------------------------------------------------------------ entrada
  private bindInput(): void {
    const cv = this.cv;
    const unlock = () => this.synth.unlock();
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    const world = (e: PointerEvent) => this.scene.toWorld(e.clientX, e.clientY);
    cv.addEventListener("pointerdown", (e) => {
      if (this.mode !== "run") return;
      if (e.pointerType !== "mouse") {
        this.touchId = e.pointerId;
        cv.setPointerCapture(e.pointerId);
        const w = world(e);
        this.run.setCursor(w.x, w.y, true);
      }
    });
    cv.addEventListener("pointermove", (e) => {
      if (this.mode !== "run") return;
      const w = world(e);
      if (e.pointerType === "mouse") {
        this.pointerIn = true;
        this.run.setCursor(w.x, w.y, true);
      } else if (e.pointerId === this.touchId) this.run.setCursor(w.x, w.y, true);
    });
    const up = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerId === this.touchId) {
        this.touchId = -1;
        this.run.setCursor(this.run.cursor.x, this.run.cursor.y, false);
      }
    };
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") {
        this.pointerIn = false;
        this.run.setCursor(this.run.cursor.x, this.run.cursor.y, false);
      }
    });
    window.addEventListener("keydown", (e) => {
      if (this.mode !== "run" || this.ended) return;
      const k = e.key.toLowerCase();
      if (k === "escape" || k === "p") {
        if (this.paused) this.hud?.act("resume");
        else this.hud?.act("pause");
      } else if (k === "m") this.hud?.act("mute");
    });
  }

  // ------------------------------------------------------------ som
  private sound(evs: SimEvent[]): void {
    const s = this.synth;
    const key = this.run.key;
    let plucks = 0;
    for (const e of evs) {
      switch (e.k) {
        case "beat":
          s.tick(e.bar);
          if (e.bar) s.kick();
          break;
        case "hit":
          if (plucks++ > 5) break;
          if (e.deg < 0) s.pluck(key.root + 13, 0.3, 0.6, 0.5);
          else s.pluck(degreeMidi(key, e.deg, 1), e.crit ? 0.6 : 0.4, e.onBeat ? 1.4 : 1, 0.9);
          break;
        case "kill":
          if (plucks++ > 7) break;
          if (e.type === "tritono") s.chord([0, 4, 7, 12].map((m) => key.root + m), 0.8);
          else if (e.deg >= 0) s.pluck(degreeMidi(key, e.deg, 2), 0.22, 1.6, 1.3);
          break;
        case "chord": {
          const base = e.chord.degs[0];
          s.chord(e.chord.degs.map((d) => degreeMidi(key, d < base ? d + 7 : d, 0)), 0.65);
          break;
        }
        case "scale":
          [0, 2, 4].forEach((d, i) => setTimeout(() => s.pluck(key.root + 24 + MAJOR[d], 0.25, 1.5, 0.5), i * 60));
          break;
        case "lyra":
        case "shock":
          s.sour(key.root - 12, 0.35);
          break;
        case "tired":
          s.pluck(key.root - 24, 0.4, 0.3, 0.4);
          break;
        case "parry":
          s.pluck(key.root + 31, 0.25, 1.5, 0.4);
          break;
        case "room":
          [0, 4, 7, 12].forEach((m, i) => setTimeout(() => s.pluck(key.root + m, 0.4, 1.2, 1.4), i * 110));
          break;
        case "roomClear":
          [
            [0, 4, 7],
            [5, 9, 12],
            [7, 11, 14],
            [12, 16, 19],
          ].forEach((c, i) => setTimeout(() => s.chord(c.map((m) => key.root + m), 0.5), i * 260));
          break;
        case "boss":
          s.sour(key.root - 12, 0.6);
          s.drone(key.root + 6);
          break;
        case "level":
          [0, 4, 7, 11, 14].forEach((m, i) => setTimeout(() => s.pluck(key.root + 12 + m, 0.3, 1.6, 0.8), i * 70));
          break;
        case "won":
          s.drone(key.root);
          [
            [7, 11, 14, 17],
            [12, 16, 19, 24],
          ].forEach((c, i) => setTimeout(() => s.chord(c.map((m) => key.root + m), 0.8), i * 500));
          break;
        case "over":
          [12, 10, 8, 7, 3, 0].forEach((m, i) => setTimeout(() => s.pluck(key.root + m, 0.4, 0.6, 1.2), i * 160));
          s.drone(null);
          break;
        default:
          break;
      }
    }
  }

  // ------------------------------------------------------------ laço
  private frame(now: number): void {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const r = this.run;
    if (this.mode === "run") {
      const hud = this.hud!;
      const frozen = this.paused || this.ended || hud.offerOpen || hud.modalOpen;
      if (!frozen) {
        this.acc += dt;
        let n = 0;
        while (this.acc >= STEP && n < 5) {
          r.step(STEP);
          this.acc -= STEP;
          n++;
        }
        if (n === 5) this.acc = 0;
      }
      if (r.events.length) {
        this.scene.home = hud.notesHome();
        this.scene.consume(r, r.events);
        hud.onEvents(r.events);
        this.sound(r.events);
        const done = r.events.some((e) => e.k === "over" || e.k === "won");
        r.events.length = 0;
        if (done) setTimeout(() => this.endRun(), 900);
      }
      if (!frozen && r.pendingLevels > 0 && !hud.offerOpen && r.phase !== "over" && r.phase !== "won") hud.showOffer();
      hud.update(frozen ? 0 : dt);
      const showCursor = this.touch ? this.touchId >= 0 : this.pointerIn;
      this.scene.draw(r, frozen ? 0 : dt, hud.marker, showCursor && !frozen);
    } else {
      this.demo(dt);
      this.scene.consume(r, r.events);
      r.events.length = 0;
      this.scene.draw(r, dt, null, true);
    }
    requestAnimationFrame((t) => this.frame(t));
  }

  /** concerto automático no fundo do menu */
  private demo(dt: number): void {
    const r = this.run;
    this.demoT += dt;
    const t = this.demoT;
    const target = r.enemies[0];
    const ox = Math.sin(t * 7.1) * 50;
    const oy = Math.cos(t * 5.3) * 50;
    if (target) r.setCursor(target.x + ox, target.y + oy, true);
    else r.setCursor(Math.sin(t * 0.8) * 200, Math.cos(t * 1.1) * 140, true);
    if (r.enemies.length < 10 && Math.floor(t / 0.7) !== Math.floor((t - dt) / 0.7)) {
      const types: EnemyId[] = ["seminima", "seminima", "colcheia", "minima", "semibreve", "pausa", "sustenido", "bemol"];
      const type = types[Math.floor(Math.random() * types.length)];
      const p = r.edgePoint(Math.random() * TAU, 20);
      r.spawn(type, type === "sustenido" ? -1 : Math.floor(Math.random() * 7), p.x, p.y);
    }
    r.step(dt);
    r.lyra.hp = r.lyra.maxHp;
  }
}

(window as unknown as { __app: App }).__app = new App();
