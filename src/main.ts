import "./styles.css";
import { Synth } from "./audio/synth";
import { DUNGEONS, MAJOR, degreeMidi } from "./data/content";
import { BARKS, CLARA_HINTS, FERMATA_TIPS, PROLOGUE, STORY, type Line } from "./data/story";
import { SAVE_KEY, computeStats, loadProfile, type Profile } from "./game/profile";
import { Run, type SimEvent } from "./game/sim";
import { Scene } from "./render/scene";
import { Hub, type HubTab } from "./ui/hub";
import { Dialog } from "./ui/dialog";
import { Hud } from "./ui/hud";

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

const STEP = 1 / 60;

class App {
  profile: Profile;
  readonly scene: Scene;
  readonly synth = new Synth();
  readonly ui = document.getElementById("ui")!;
  readonly cv = document.getElementById("board") as HTMLCanvasElement;
  readonly touch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  mode: "hub" | "run" = "hub";
  run: Run | null = null;
  hud: Hud | null = null;
  hub: Hub | null = null;
  paused = false;
  private ended = false;
  private resetting = false;
  private acc = 0;
  private last = performance.now();
  private pointerIn = false;
  private touchId = -1;
  private banked = { notas: 0, cristais: 0, partituras: 0, exp: 0 };
  readonly dialog: Dialog;
  private barkCd = 0;

  constructor() {
    this.profile = loadProfile(localStorage.getItem(SAVE_KEY));
    this.synth.muted = this.profile.muted;
    this.scene = new Scene(this.cv);
    const layer = document.createElement("div");
    layer.className = "dlglayer";
    document.body.appendChild(layer);
    this.dialog = new Dialog(layer, this.touch, (l) => this.voice(l));
    document.body.classList.toggle("touch", this.touch);
    this.scene.resize(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", () => this.scene.resize(window.innerWidth, window.innerHeight));
    window.addEventListener("beforeunload", () => this.persist());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.persist();
        if (this.mode === "run" && !this.ended && !this.paused) this.hud?.act("pause");
      }
    });
    this.bindInput();
    this.showHub(this.profile.day === 0 ? "mapa" : "habilidades");
    requestAnimationFrame((t) => this.frame(t));
  }

  save(): void {
    if (this.resetting) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.profile));
    } catch {
      /* sem armazenamento */
    }
  }

  /** guarda no perfil o que a partida já ganhou (para não perder ao fechar a aba) */
  private bank(): void {
    const r = this.run;
    if (!r) return;
    const p = this.profile;
    for (const k of ["notas", "cristais", "partituras", "exp"] as const) {
      p[k] += r[k] - this.banked[k];
      this.banked[k] = r[k];
    }
  }

  private persist(): void {
    if (this.mode === "run" && !this.ended) this.bank();
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
  showHub(tab: HubTab): void {
    this.hud?.destroy();
    this.hud = null;
    this.run = null;
    this.mode = "hub";
    this.paused = false;
    document.body.classList.remove("in-run");
    this.synth.drone(null);
    this.hub?.destroy();
    this.hub = new Hub(
      {
        profile: this.profile,
        touch: this.touch,
        enter: (d) => this.startRun(d),
        save: () => this.save(),
        reset: () => this.reset(),
        toggleMute: () => this.toggleMute(),
        muted: () => this.synth.muted,
        sound: (m) => {
          this.synth.unlock();
          m.forEach((n, i) => setTimeout(() => this.synth.pluck(n, 0.4, 1, 1), i * 80));
        },
        talk: () => {
          this.synth.unlock();
          if (this.dialog.open) return;
          const next = DUNGEONS[this.profile.unlocked];
          const lines: Line[] = [{ who: "fermata", text: pick(FERMATA_TIPS) }];
          if (!this.profile.cleared[next.id]) lines.push({ who: "fermata", text: `A próxima página está em ${next.name}. Vá quando estiver pronta.` });
          this.dialog.say(lines);
        },
      },
      this.ui,
      tab,
    );
    this.hubScenes();
  }

  /** cenas da história na oficina: prólogo e o que acontece depois de cada vitória */
  private hubScenes(): void {
    const p = this.profile;
    const play = (id: string, lines: Line[]) => {
      p.seen[id] = true;
      this.save();
      setTimeout(() => this.dialog.say(lines), 300);
    };
    if (!p.seen.prologue) return play("prologue", PROLOGUE);
    for (let d = 0; d < DUNGEONS.length; d++) if (p.cleared[DUNGEONS[d].id] && !p.seen[`after${d}`]) return play(`after${d}`, STORY[d].after);
  }

  /** um "blip" curto de voz para cada fala */
  private voice(l: Line): void {
    const base = { tito: 72, fermata: 64, tritono: 54, clara: 79, narrador: 0 }[l.who];
    if (!base) return;
    [0, 4, 7].forEach((m, i) => setTimeout(() => this.synth.pluck(base + m + (l.who === "tritono" ? i : 0), 0.12, 1.2, 0.25), i * 70));
  }

  private barkOf(list: string[], chance = 1): void {
    if (this.barkCd > 0 || Math.random() > chance) return;
    this.scene.say(pick(list));
    this.barkCd = 4;
  }

  private toggleMute(): void {
    this.synth.unlock();
    this.synth.setMuted(!this.synth.muted);
    this.profile.muted = this.synth.muted;
    this.save();
  }

  startRun(dIdx: number): void {
    this.synth.unlock();
    this.hub?.destroy();
    this.hub = null;
    this.mode = "run";
    this.ended = false;
    this.paused = false;
    this.acc = 0;
    this.banked = { notas: 0, cristais: 0, partituras: 0, exp: 0 };
    this.profile.day++;
    this.save();
    document.body.classList.add("in-run");
    this.scene.reset();
    const run = new Run(computeStats(this.profile), dIdx, (Math.random() * 1e9) | 0);
    this.run = run;
    this.synth.drone(run.key.root);
    this.hud?.destroy();
    this.hud = new Hud(
      {
        run,
        profile: this.profile,
        touch: this.touch,
        setPaused: (on) => (this.paused = on),
        toggleMute: () => this.toggleMute(),
        muted: () => this.synth.muted,
        abandon: () => this.endRun(),
        dialog: this.dialog,
      },
      this.ui,
    );
    const p = this.profile;
    if (!p.seen[`intro${dIdx}`]) {
      p.seen[`intro${dIdx}`] = true;
      p.introDone = true;
      this.save();
      this.dialog.say(STORY[dIdx].intro);
    } else setTimeout(() => this.scene.say(pick(BARKS.start)), 600);
  }

  private endRun(): void {
    const r = this.run;
    if (!r || this.ended) return;
    this.ended = true;
    this.bank();
    const p = this.profile;
    const won = r.phase === "won";
    p.kills += r.kills;
    p.chords += r.chords;
    let unlocked: string | null = null;
    if (won) {
      p.cleared[r.dungeon.id] = true;
      if (r.dIdx === p.unlocked && p.unlocked < DUNGEONS.length - 1) {
        p.unlocked++;
        unlocked = DUNGEONS[p.unlocked].name;
      }
    }
    this.save();
    const showEnd = () =>
      this.hud?.showEnd({ won, notas: r.notas, cristais: r.cristais, partituras: r.partituras, exp: r.exp, kills: r.kills, chords: r.chords, unlocked }, () => this.showHub(won && unlocked ? "mapa" : "habilidades"));
    if (won) {
      const first = !p.seen[`win${r.dIdx}`];
      p.seen[`win${r.dIdx}`] = true;
      this.save();
      const lines = STORY[r.dIdx].win;
      this.dialog.say(first ? lines : lines.slice(-2), showEnd);
    } else if (r.phase === "over") {
      this.scene.say(pick(BARKS.lose));
      setTimeout(showEnd, 1200);
    } else this.showHub("habilidades");
  }

  // ------------------------------------------------------------ entrada
  private bindInput(): void {
    const cv = this.cv;
    window.addEventListener("pointerdown", () => this.synth.unlock(), { capture: true });
    window.addEventListener("keydown", () => this.synth.unlock(), { capture: true });
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    const iso = (e: PointerEvent) => this.scene.toIso(e.clientX, e.clientY);
    cv.addEventListener("pointerdown", (e) => {
      if (!this.run) return;
      if (e.pointerType !== "mouse") {
        this.touchId = e.pointerId;
        cv.setPointerCapture(e.pointerId);
        const w = iso(e);
        this.run.setCursor(w.u, w.v, true);
      }
    });
    cv.addEventListener("pointermove", (e) => {
      if (!this.run) return;
      const w = iso(e);
      if (e.pointerType === "mouse") {
        this.pointerIn = true;
        this.run.setCursor(w.u, w.v, true);
      } else if (e.pointerId === this.touchId) this.run.setCursor(w.u, w.v, true);
    });
    const up = (e: PointerEvent) => {
      if (this.run && e.pointerType !== "mouse" && e.pointerId === this.touchId) {
        this.touchId = -1;
        this.run.setCursor(this.run.cursor.u, this.run.cursor.v, false);
      }
    };
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("pointerleave", (e) => {
      if (this.run && e.pointerType === "mouse") {
        this.pointerIn = false;
        this.run.setCursor(this.run.cursor.u, this.run.cursor.v, false);
      }
    });
    window.addEventListener("keydown", (e) => {
      if (this.mode !== "run" || this.ended || !this.hud) return;
      const k = e.key.toLowerCase();
      if (this.dialog.open && (k === " " || k === "enter")) {
        e.preventDefault();
        this.dialog.next();
      } else if (k === "escape" || k === "p") {
        if (this.paused) this.hud.act("resume");
        else this.hud.act("pause");
      } else if (k === "m") this.toggleMute();
    });
  }

  // ------------------------------------------------------------ som e falas
  private react(evs: SimEvent[]): void {
    const r = this.run!;
    const s = this.synth;
    const key = r.key;
    let plucks = 0;
    for (const e of evs) {
      switch (e.k) {
        case "beat":
          s.kick();
          s.tick(e.n % 4 === 0);
          break;
        case "hit":
          if (plucks++ > 5) break;
          if (e.armor) s.pluck(key.root + 31, 0.18, 0.5, 0.25);
          if (e.deg >= 0) s.pluck(degreeMidi(key, e.deg, 1), e.onBeat ? 0.55 : 0.4, e.onBeat ? 1.4 : 1, 0.8);
          else s.pluck(key.root + 18, 0.3, 0.5, 0.5);
          break;
        case "broken":
          this.barkOf(BARKS.broken, 0.3);
          s.sour(key.root + 24, 0.3);
          break;
        case "execute":
          this.barkOf(BARKS.execute, 0.4);
          s.pluck(key.root - 12, 0.6, 0.5, 0.6);
          break;
        case "kill":
          if (e.marked) this.barkOf(BARKS.marked, 0.4);
          if (plucks++ > 7) break;
          if (e.type === "maestro") s.chord([0, 4, 7, 12].map((m) => key.root + m), 0.8);
          else if (e.deg >= 0) s.pluck(degreeMidi(key, e.deg, 2), 0.2, 1.6, 1.2);
          break;
        case "acertos":
          [0, 4, 7].slice(0, Math.min(3, e.n - 1)).forEach((m, i) => setTimeout(() => s.pluck(key.root + 24 + m, 0.2, 1.6, 0.4), i * 50));
          break;
        case "chord": {
          this.barkOf(BARKS.chord, 0.4);
          const b = e.chord.degs[0];
          s.chord(e.chord.degs.map((d) => degreeMidi(key, d < b ? d + 7 : d, 0)), 0.6);
          break;
        }
        case "circle":
          MAJOR.forEach((m, i) => setTimeout(() => s.pluck(key.root + 12 + m, 0.25, 1.4, 0.5), i * 35));
          break;
        case "scale":
          [0, 2, 4].forEach((d, i) => setTimeout(() => s.pluck(key.root + 24 + MAJOR[d], 0.22, 1.5, 0.4), i * 60));
          break;
        case "tito":
          if (r.tito.hp < r.tito.maxHp * 0.4) this.barkOf(BARKS.hurt, 0.5);
          s.sour(key.root - 12, 0.3);
          break;
        case "shock":
          s.sour(key.root - 12, 0.3);
          break;
        case "tired":
          this.barkOf(BARKS.tired, 0.7);
          s.pluck(key.root - 24, 0.35, 0.3, 0.4);
          break;
        case "parry":
          s.pluck(key.root + 31, 0.2, 1.5, 0.3);
          break;
        case "roomClear":
          this.barkOf(BARKS.clear, 0.8);
          [
            [0, 4, 7],
            [5, 9, 12],
            [7, 11, 14],
            [12, 16, 19],
          ].forEach((c, i) => setTimeout(() => s.chord(c.map((m) => key.root + m), 0.45), i * 240));
          break;
        case "first": {
          if (e.what === "boss") {
            s.drone(key.root + 6);
            break;
          }
          const p = this.profile;
          if (p.seen[e.what]) break;
          p.seen[e.what] = true;
          this.save();
          if (e.what === "armor") this.scene.say(BARKS.armor[0]);
          else if (e.what === "marked") this.scene.say(BARKS.markedFirst[0]);
          this.barkCd = 4;
          break;
        }
        case "enter": {
          const p = this.profile;
          const d = r.dIdx;
          if (e.boss) {
            const first = !p.seen[`boss${d}`];
            p.seen[`boss${d}`] = true;
            this.save();
            setTimeout(() => this.dialog.say(first ? STORY[d].boss : STORY[d].bossAgain), 500);
          } else if (e.i === 2 && !p.seen[`mid${d}`]) {
            p.seen[`mid${d}`] = true;
            this.save();
            setTimeout(() => this.dialog.say(STORY[d].mid), 300);
          } else if (d === 0 && e.i >= 1 && e.i <= CLARA_HINTS.length && !p.seen[`hint${e.i}`]) {
            p.seen[`hint${e.i}`] = true;
            this.save();
            setTimeout(() => this.dialog.say([{ who: "clara", text: CLARA_HINTS[e.i - 1] }]), 300);
          }
          break;
        }
        case "won":
          s.drone(key.root);
          break;
        case "over":
          [12, 10, 8, 7, 3, 0].forEach((m, i) => setTimeout(() => s.pluck(key.root + m, 0.35, 0.6, 1.1), i * 150));
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
    this.barkCd = Math.max(0, this.barkCd - dt);
    const r = this.run;
    const g = this.cv.getContext("2d")!;
    if (this.mode === "run" && r && this.hud) {
      const frozen = this.paused || this.ended || this.dialog.open || this.hud.modalOpen;
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
        this.scene.consume(r, r.events);
        this.hud.onEvents(r.events);
        this.react(r.events);
        const done = r.events.some((e) => e.k === "over" || e.k === "won");
        r.events.length = 0;
        if (done) setTimeout(() => this.endRun(), 800);
      }
      this.hud.update(frozen ? 0 : dt);
      const shown = this.touch ? this.touchId >= 0 : this.pointerIn;
      this.scene.draw(r, frozen ? 0 : dt, shown && !frozen);
    } else {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "#08060a";
      g.fillRect(0, 0, this.cv.width, this.cv.height);
    }
    requestAnimationFrame((t) => this.frame(t));
  }
}

(window as unknown as { __app: App }).__app = new App();
