import { fmt } from "../core/format";
import { TAU, clamp } from "../core/math";
import { BOSS_FORMS, CHROMA_COLOR, DEGREE_COLORS, MONSTERS, chordName, degreeNote, type TrailId } from "../data/content";
import { ROOM, isoU, isoV, type Monster, type Room, type Run, type SimEvent } from "../game/sim";
import { drawBoss, drawCage } from "./boss";
import { CHEST_SPR, PICK_SPR, PROP_SPR, SPR, monsterFrames, type Sprite } from "./pixels";
import { WALL, paintRoom, type RoomArt } from "./rooms";

const FONT = '"VT323", "Courier New", monospace';

interface Px {
  u: number;
  v: number;
  vu: number;
  vv: number;
  life: number;
  max: number;
  color: string;
  size: number;
  grav: number;
}
interface Txt {
  u: number;
  v: number;
  s: string;
  life: number;
  max: number;
  color: string;
  size: number;
  rise: number;
}
interface Ring {
  u: number;
  v: number;
  r0: number;
  r1: number;
  life: number;
  max: number;
  color: string;
}

export const degColor = (d: number) => (d < 0 ? CHROMA_COLOR : DEGREE_COLORS[d % 7]);

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Masmorra isométrica em pixel art (buffer de baixa resolução ampliado) + camada nítida de efeitos. */
export class Scene {
  /** altura do buffer em pixels de arte */
  LH = 270;
  LW = 480;
  scale = 1;
  w = 1;
  h = 1;
  dpr = 1;
  cam = { u: 0, v: 0 };
  private low: HTMLCanvasElement;
  private lg: CanvasRenderingContext2D;
  private light: HTMLCanvasElement;
  private lc: CanvasRenderingContext2D;
  private g: CanvasRenderingContext2D;
  private roomCache = new Map<Room, RoomArt>();
  private bark: { text: string; life: number } | null = null;
  private motes: { x: number; y: number; vy: number; ph: number; c: string; g: string }[] = [];
  private parts: Px[] = [];
  private texts: Txt[] = [];
  private rings: Ring[] = [];
  private trail: { x: number; y: number; t: number }[] = [];
  private circles: { pts: [number, number][]; life: number }[] = [];
  /** notas regidas que voam até o contador da HUD */
  private trailParts: { x: number; y: number; vx: number; vy: number; life: number; c: string; star: boolean }[] = [];
  private bossCanvas = (() => {
    const c = document.createElement("canvas");
    c.width = 140;
    c.height = 120;
    return c;
  })();
  private homing: { x: number; y: number; vx: number; vy: number; t: number; c: string }[] = [];
  home = { x: 0, y: 0 };
  private time = 0;
  private shake = 0;
  private flashRed = 0;
  private camInit = false;
  /** visual do rastro escolhido na oficina */
  trailSkin: TrailId = "prata";
  /** pontos de "chão" clicados (marcador de destino) */
  private dest: { u: number; v: number; life: number } | null = null;

  constructor(readonly cv: HTMLCanvasElement) {
    this.g = cv.getContext("2d")!;
    this.low = document.createElement("canvas");
    this.lg = this.low.getContext("2d")!;
    this.light = document.createElement("canvas");
    this.lc = this.light.getContext("2d")!;
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(w * this.dpr);
    this.cv.height = Math.round(h * this.dpr);
    this.LH = h < 500 ? 230 : 270;
    this.LW = Math.ceil((this.LH * w) / h);
    this.scale = h / this.LH;
    this.low.width = this.light.width = this.LW;
    this.low.height = this.light.height = this.LH;
  }

  /** tela (px CSS) → plano isométrico do mundo */
  toIso(sx: number, sy: number): { u: number; v: number } {
    return { u: sx / this.scale - this.LW / 2 + this.cam.u, v: sy / this.scale - this.LH / 2 + this.cam.v };
  }

  private lx(u: number): number {
    return Math.round(u - this.cam.u + this.LW / 2);
  }
  private ly(v: number): number {
    return Math.round(v - this.cam.v + this.LH / 2);
  }
  private cx(u: number): number {
    return (u - this.cam.u + this.LW / 2) * this.scale;
  }
  private cy(v: number): number {
    return (v - this.cam.v + this.LH / 2) * this.scale;
  }

  reset(): void {
    this.roomCache.clear();
    this.parts = [];
    this.texts = [];
    this.rings = [];
    this.circles = [];
    this.bark = null;
    this.camInit = false;
  }

  // ------------------------------------------------------------ eventos
  consume(run: Run, evs: SimEvent[]): void {
    for (const e of evs) {
      switch (e.k) {
        case "hit": {
          const col = e.armor ? "#e8f0ff" : degColor(e.deg);
          for (let i = 0; i < 7; i++) this.spark(e.u, e.v, 70, i % 2 ? col : "#ffffff", 0.35, 0);
          if (this.texts.length < 50) this.text(e.u + (Math.random() - 0.5) * 8, e.v - 8, fmt(e.dmg), e.onBeat ? "#ffd27a" : "#ffffff", e.onBeat ? 22 : 18, 18);
          if (e.onBeat && Math.random() < 0.5) this.text(e.u, e.v - 20, "No tempo!", "#ffd27a", 16, 14);
          this.shake = Math.max(this.shake, 1.2);
          break;
        }
        case "broken":
          this.text(e.u, e.v - 16, "Quebrada!", "#7fe8ff", 24, 16);
          for (let i = 0; i < 14; i++) this.spark(e.u, e.v, 110, i % 2 ? "#c8d4e8" : "#7fe8ff", 0.5, 60);
          this.shake = Math.max(this.shake, 3);
          break;
        case "execute":
          this.text(e.u, e.v - 22, "Executado!", "#ffffff", 34, 10);
          this.shake = Math.max(this.shake, 4);
          break;
        case "kill": {
          const col = degColor(e.deg);
          const big = e.type === "maestro";
          for (let i = 0; i < (big ? 80 : 16); i++) this.spark(e.u, e.v, big ? 160 : 90, i % 3 === 0 ? "#2a1a3a" : i % 3 === 1 ? col : "#ffffff", 0.6, 80);
          this.rings.push({ u: e.u, v: e.v, r0: 2, r1: big ? 80 : 16, life: 0.35, max: 0.35, color: col });
          if (big) this.shake = 12;
          for (let i = 0; i < Math.min(4, Math.ceil(e.notes / 2)); i++) this.homing.push({ x: this.cx(e.u), y: this.cy(e.v), vx: (Math.random() - 0.5) * 240, vy: -120 - Math.random() * 120, t: 0, c: col });
          break;
        }
        case "acertos":
          this.text(e.u, e.v - 10, `${e.n} Acertos!`, "#f6e7a8", 22 + Math.min(10, e.n * 2), 22);
          break;
        case "chord": {
          const cols = e.chord.degs.map((d) => DEGREE_COLORS[d]);
          cols.forEach((c, i) => this.rings.push({ u: e.u, v: e.v, r0: 4 + i * 3, r1: (e.chord.degs.length > 3 ? 75 : 55) + i * 8, life: 0.55 + i * 0.07, max: 0.55 + i * 0.07, color: c }));
          for (let i = 0; i < 30; i++) this.spark(e.u, e.v, 140, cols[i % cols.length], 0.6, 0);
          this.text(e.u, e.v - 30, `Acorde! ${chordName(run.key, e.chord)}`, cols[0], 26, 12);
          this.shake = Math.max(this.shake, 5);
          break;
        }
        case "scale":
          this.text(e.u, e.v - 40, "Escala!", "#7affb0", 20, 14);
          break;
        case "circle":
          this.circles.push({ pts: e.pts, life: 0.6 });
          if (e.hits) this.text(e.pts[0][0], e.pts[0][1] - 20, `Ciclo! ×${e.hits}`, "#ffd27a", 28, 12);
          this.shake = Math.max(this.shake, 5);
          break;
        case "parry":
          for (let i = 0; i < 8; i++) this.spark(e.u, e.v, 80, "#c08aff", 0.3, 0);
          break;
        case "tito":
          this.flashRed = 0.35;
          this.shake = Math.max(this.shake, 3);
          break;
        case "pancada":
          this.rings.push({ u: e.u, v: e.v - 6, r0: 6, r1: 75, life: 0.45, max: 0.45, color: "#ffd27a" });
          this.rings.push({ u: e.u, v: e.v - 6, r0: 4, r1: 50, life: 0.3, max: 0.3, color: "#ffffff" });
          this.shake = Math.max(this.shake, 6);
          break;
        case "skill": {
          const t = run.tito;
          const col = { rufar: "#ffd27a", forte: "#ff6a5a", pancada: "#ffffff", metro: "#7ab8ff" }[e.id];
          this.rings.push({ u: isoU(t.x, t.y), v: isoV(t.x, t.y) - 10, r0: 4, r1: 40, life: 0.5, max: 0.5, color: col });
          this.text(isoU(t.x, t.y), isoV(t.x, t.y) - 40, { rufar: "Rufar!", forte: "Fortíssimo!", pancada: "Pancada!", metro: "Metrônomo!" }[e.id], col, 26, 12);
          break;
        }
        case "prop": {
          const n = e.broke ? 16 : 5;
          for (let i = 0; i < n; i++) this.spark(e.u, e.v, e.broke ? 90 : 50, i % 2 ? "#a8743e" : "#e8d8b0", 0.5, 120);
          if (e.broke) this.shake = Math.max(this.shake, 2);
          break;
        }
        case "lock":
          for (let i = 0; i < 8; i++) this.spark(e.u, e.v, 60, degColor(e.deg), 0.4, 0);
          this.text(e.u, e.v - 8, "♪", degColor(e.deg), 22, 20);
          break;
        case "chest":
          for (let i = 0; i < 40; i++) this.spark(e.u, e.v, 130, i % 2 ? "#ffd27a" : "#ffffff", 0.8, 60);
          this.rings.push({ u: e.u, v: e.v, r0: 4, r1: 50, life: 0.6, max: 0.6, color: "#ffd27a" });
          this.text(e.u, e.v - 24, "Baú aberto!", "#ffd27a", 26, 12);
          break;
        case "strike":
          for (let i = 0; i < 18; i++) this.spark(e.u, e.v, 120, e.hit ? "#ff5a6a" : "#e8d8ff", 0.4, 0);
          this.shake = Math.max(this.shake, e.hit ? 7 : 3);
          break;
        case "spawn":
          for (let i = 0; i < 10; i++) this.spark(e.u, e.v - 4, 30, i % 2 ? "#5a3a8a" : "#2a1a3a", 0.7, -20);
          break;
        case "shock":
          this.shake = Math.max(this.shake, 4);
          break;
        default:
          break;
      }
    }
  }

  private spark(u: number, v: number, sp: number, color: string, life: number, grav: number): void {
    if (this.parts.length > 700) return;
    const a = Math.random() * TAU;
    const s = sp * (0.3 + Math.random() * 0.7);
    this.parts.push({ u, v, vu: Math.cos(a) * s, vv: Math.sin(a) * s * 0.7 - 20, life: life * (0.6 + Math.random() * 0.6), max: life, color, size: Math.random() < 0.3 ? 2 : 1, grav });
  }

  private text(u: number, v: number, s: string, color: string, size: number, rise: number): void {
    this.texts.push({ u, v, s, life: 0.9, max: 0.9, color, size, rise });
  }

  // ------------------------------------------------------------ salas (pré-renderizadas por estilo)
  private roomArt(run: Run, r: Room): RoomArt {
    let a = this.roomCache.get(r);
    if (!a) this.roomCache.set(r, (a = paintRoom(run, r)));
    return a;
  }

  markDest(u: number, v: number): void {
    this.dest = { u, v, life: 0.6 };
  }

  /** balão de fala sobre o Tito (não pausa o jogo) */
  say(text: string): void {
    this.bark = { text, life: 2.8 };
  }

  // ------------------------------------------------------------ quadro
  draw(run: Run, dt: number, cursorShown: boolean): void {
    this.time += dt;
    const T = run.tito;
    const tu = isoU(T.x, T.y);
    const tv = isoV(T.x, T.y) - 10;
    if (!this.camInit) {
      this.cam = { u: tu, v: tv };
      this.camInit = true;
    }
    const k = Math.min(1, dt * 4);
    this.cam.u += (tu - this.cam.u) * k;
    this.cam.v += (tv - this.cam.v) * k;
    this.shake = Math.max(0, this.shake - dt * 25);
    const shU = Math.round((Math.random() - 0.5) * this.shake);
    const shV = Math.round((Math.random() - 0.5) * this.shake);
    this.cam.u += shU;
    this.cam.v += shV;
    const g = this.lg;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#050308";
    g.fillRect(0, 0, this.LW, this.LH);
    // salas visíveis: as visitadas e a próxima
    const show = run.rooms.filter((r, i) => r.visited || i === run.roomI + 1).sort((a, b) => a.gx + a.gy - (b.gx + b.gy));
    const lights: { u: number; v: number; r: number; a: number; color: string }[] = [];
    for (const r of show) {
      const art = this.roomArt(run, r);
      const ox = this.lx(isoU(r.x0, r.y0)) - ROOM - 2;
      const oy = this.ly(isoV(r.x0, r.y0)) - WALL - 36;
      g.drawImage(art.canvas, ox, oy);
      if (!r.visited) continue;
      for (const l of art.lights) {
        const f = l.flicker ? 0.85 + 0.15 * Math.sin(this.time * 11 + l.x) * Math.sin(this.time * 6.7 + l.y) : 1;
        lights.push({ u: isoU(r.x0, r.y0) + (l.x - ROOM - 2), v: isoV(r.x0, r.y0) + (l.y - WALL - 36), r: l.r * f, a: 0.8, color: l.color });
      }
    }
    const mem = run.room.memory;
    if (mem && !mem.taken) lights.push({ u: isoU(mem.x, mem.y), v: isoV(mem.x, mem.y) - 6, r: 40, a: 0.8, color: "#a0d0ff" });
    const exd = run.exitDoor();
    if (exd && run.phase === "explore") lights.push({ u: isoU(exd.x, exd.y), v: isoV(exd.x, exd.y) - 8, r: 55, a: 0.8, color: "#ffe0a0" });
    if (run.room.chest && !run.room.chest.open) lights.push({ u: isoU(run.room.chest.x, run.room.chest.y), v: isoV(run.room.chest.x, run.room.chest.y) - 10, r: 34, a: 0.7, color: "#ffd27a" });
    // ondas do maestro
    for (const w of run.waves) {
      g.strokeStyle = w.hit ? "rgba(255,80,120,0.25)" : "rgba(255,60,110,0.8)";
      g.lineWidth = 2;
      g.setLineDash([4, 3]);
      g.beginPath();
      g.ellipse(this.lx(isoU(w.x, w.y)), this.ly(isoV(w.x, w.y)), w.r * 1.414, w.r * 0.707, 0, 0, TAU);
      g.stroke();
      g.setLineDash([]);
    }
    // ataques anunciados do chefe
    for (const t of run.teles) {
      const k = 1 - t.t / t.max;
      g.fillStyle = `rgba(255,40,80,${0.12 + 0.35 * k})`;
      g.strokeStyle = `rgba(255,120,140,${0.5 + 0.5 * k})`;
      g.lineWidth = 1;
      g.beginPath();
      if (t.kind === "rect") {
        const pts = [
          [t.x, t.y],
          [t.x + t.w, t.y],
          [t.x + t.w, t.y + t.h],
          [t.x, t.y + t.h],
        ];
        pts.forEach(([x, y], i) => (i ? g.lineTo(this.lx(isoU(x, y)), this.ly(isoV(x, y))) : g.moveTo(this.lx(isoU(x, y)), this.ly(isoV(x, y)))));
        g.closePath();
      } else g.ellipse(this.lx(isoU(t.x, t.y)), this.ly(isoV(t.x, t.y)), t.r * 1.414 * (0.3 + 0.7 * k), t.r * 0.707 * (0.3 + 0.7 * k), 0, 0, TAU);
      g.fill();
      g.stroke();
      if (t.kind === "circle") {
        g.strokeStyle = "rgba(255,200,210,0.8)";
        g.beginPath();
        g.ellipse(this.lx(isoU(t.x, t.y)), this.ly(isoV(t.x, t.y)), t.r * 1.414, t.r * 0.707, 0, 0, TAU);
        g.stroke();
      }
    }
    for (const e of run.embers) {
      g.fillStyle = Math.random() < 0.5 ? "#ffb040" : "#ff5a2a";
      g.globalAlpha = Math.min(1, e.life);
      g.fillRect(this.lx(isoU(e.x, e.y)) + Math.round((Math.random() - 0.5) * 2), this.ly(isoV(e.x, e.y)) - Math.round(Math.random() * 3), 2, 2);
    }
    g.globalAlpha = 1;
    // porta de saída: grades durante a luta, brilho quando abre
    {
      const ex = run.exitDoor();
      if (ex) {
        const x = this.lx(isoU(ex.x, ex.y));
        const y = this.ly(isoV(ex.x, ex.y));
        if (run.phase === "fight") {
          g.fillStyle = "#3a3440";
          for (let i = -3; i <= 3; i++) g.fillRect(x + i * 5, y - 26, 2, 26);
          g.fillRect(x - 17, y - 27, 36, 2);
        } else if (run.phase === "explore") {
          const k = 0.5 + 0.5 * Math.sin(this.time * 4);
          g.globalCompositeOperation = "lighter";
          const gr = g.createRadialGradient(x, y - 8, 0, x, y - 8, 30);
          gr.addColorStop(0, `rgba(255,230,160,${0.35 + 0.25 * k})`);
          gr.addColorStop(1, "rgba(255,230,160,0)");
          g.fillStyle = gr;
          g.fillRect(x - 30, y - 38, 60, 60);
          g.globalCompositeOperation = "source-over";
        }
      }
    }
    // destino do clique
    if (this.dest) {
      this.dest.life -= dt;
      const k = Math.max(0, this.dest.life / 0.6);
      g.strokeStyle = `rgba(255,255,255,${k})`;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(this.lx(this.dest.u), this.ly(this.dest.v), 7 * (1.4 - k * 0.4), 3.5 * (1.4 - k * 0.4), 0, 0, TAU);
      g.stroke();
      if (this.dest.life <= 0) this.dest = null;
    }
    // entidades ordenadas por profundidade
    type D = { z: number; f: () => void };
    const list: D[] = [];
    list.push({ z: T.x + T.y, f: () => this.drawTito(run) });
    for (const m of run.monsters) list.push({ z: m.x + m.y, f: () => (m.type === "maestro" ? this.drawMaestro(run, m) : this.drawMonster(run, m)) });
    const room = run.room;
    for (const p of room.props)
      list.push({
        z: p.x + p.y,
        f: () => {
          const x = this.lx(isoU(p.x, p.y)) + (p.flash > 0 ? Math.round((Math.random() - 0.5) * 3) : 0);
          const y = this.ly(isoV(p.x, p.y));
          this.shadow(x, y, 6);
          this.sprite(PROP_SPR[p.type], x, y + 1, false, p.flash > 0);
        },
      });
    if (room.chest) {
      const c = room.chest;
      list.push({
        z: c.x + c.y,
        f: () => {
          const x = this.lx(isoU(c.x, c.y));
          const y = this.ly(isoV(c.x, c.y));
          this.shadow(x, y, 9);
          this.sprite(c.open ? CHEST_SPR.open : CHEST_SPR.shut, x, y + 1, false, false);
          if (!c.open)
            c.lit.forEach((lit, i) => {
              const lp = run.lockPos(c, i);
              const lx = this.lx(lp.u);
              const ly = this.ly(lp.v) + Math.round(Math.sin(this.time * 3 + i) * 1.5);
              g.fillStyle = "#0c0810";
              g.fillRect(lx - 3, ly - 3, 7, 7);
              g.fillStyle = degColor(c.chord.degs[i]);
              g.globalAlpha = lit ? 1 : 0.55;
              g.fillRect(lx - 2, ly - 2, 5, 5);
              g.globalAlpha = 1;
              if (lit) {
                g.fillStyle = "#ffffff";
                g.fillRect(lx, ly - 1, 1, 1);
              }
            });
        },
      });
    }
    if (room.memory && !room.memory.taken) {
      const mm = room.memory;
      list.push({
        z: mm.x + mm.y,
        f: () => {
          const x = this.lx(isoU(mm.x, mm.y));
          const y = this.ly(isoV(mm.x, mm.y)) - 8 + Math.round(Math.sin(this.time * 2.5) * 2);
          g.globalCompositeOperation = "lighter";
          const gr = g.createRadialGradient(x, y, 0, x, y, 14);
          gr.addColorStop(0, "rgba(160,210,255,0.7)");
          gr.addColorStop(1, "rgba(160,210,255,0)");
          g.fillStyle = gr;
          g.fillRect(x - 14, y - 14, 28, 28);
          g.globalCompositeOperation = "source-over";
          g.fillStyle = "#e8f4ff";
          g.fillRect(x - 1, y - 6, 1, 6);
          g.fillRect(x - 3, y - 1, 3, 2);
          g.fillRect(x + 3, y - 7, 1, 6);
          g.fillRect(x + 1, y - 2, 3, 2);
          g.fillRect(x - 1, y - 7, 5, 1);
        },
      });
    }
    for (const pk of run.pickups)
      list.push({
        z: pk.x + pk.y,
        f: () => {
          const x = this.lx(isoU(pk.x, pk.y));
          const hop = pk.age < 0.4 ? Math.round(Math.sin((pk.age / 0.4) * Math.PI) * 10) : Math.round(Math.sin(this.time * 4 + pk.id) * 1.5) + 2;
          const y = this.ly(isoV(pk.x, pk.y)) - hop;
          g.fillStyle = "rgba(0,0,0,0.35)";
          g.fillRect(x - 2, this.ly(isoV(pk.x, pk.y)), 4, 1);
          this.sprite(PICK_SPR[pk.kind], x, y, false, false);
        },
      });
    if (room.boss && run.phase === "fight") {
      const cx = room.x0 + ROOM * 0.18;
      const cy = room.y0 + ROOM * 0.1;
      list.push({ z: cx + cy, f: () => drawCage(g, this.lx(isoU(cx, cy)), this.ly(isoV(cx, cy)), this.time) });
    }
    for (const s of run.shots)
      list.push({
        z: s.x + s.y,
        f: () => {
          const x = this.lx(isoU(s.x, s.y));
          const y = this.ly(isoV(s.x, s.y)) - 6;
          g.fillStyle = "#b070ff";
          g.fillRect(x - 2, y - 2, 4, 4);
          g.fillStyle = "#f0d8ff";
          g.fillRect(x - 1, y - 1, 2, 2);
        },
      });
    list.sort((a, b) => a.z - b.z);
    for (const d of list) d.f();
    // partículas de pixel
    for (const p of this.parts) {
      p.life -= dt;
      p.u += p.vu * dt;
      p.v += p.vv * dt;
      p.vv += p.grav * dt;
      p.vu *= 1 - 2 * dt;
      p.vv *= 1 - 2 * dt;
      g.globalAlpha = clamp(p.life / p.max, 0, 1);
      g.fillStyle = p.color;
      g.fillRect(this.lx(p.u), this.ly(p.v), p.size, p.size);
    }
    g.globalAlpha = 1;
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const r of this.rings) {
      r.life -= dt;
      const t = 1 - clamp(r.life / r.max, 0, 1);
      const rr = r.r0 + (r.r1 - r.r0) * (1 - (1 - t) * (1 - t));
      g.strokeStyle = rgba(r.color, 1 - t);
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(this.lx(r.u), this.ly(r.v), rr * 1.2, rr * 0.6, 0, 0, TAU);
      g.stroke();
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    // iluminação: penumbra colorida do lugar, holofote no Tito e luzes do cenário
    lights.push({ u: tu, v: tv + 6, r: 105 + (T.drum > 0 ? 8 : 0), a: 1, color: "#fff4dc" });
    if (cursorShown) lights.push({ u: run.cursor.u, v: run.cursor.v, r: 34, a: 0.6, color: "#c9a0ff" });
    for (const r of this.rings) lights.push({ u: r.u, v: r.v, r: 40, a: 0.5, color: r.color });
    const L = this.lc;
    const [dr, dg, db] = run.dungeon.dark;
    L.globalCompositeOperation = "source-over";
    L.clearRect(0, 0, this.LW, this.LH);
    L.fillStyle = `rgba(${dr},${dg},${db},0.86)`;
    L.fillRect(0, 0, this.LW, this.LH);
    L.globalCompositeOperation = "destination-out";
    for (const l of lights) {
      const x = this.lx(l.u);
      const y = this.ly(l.v);
      const gr = L.createRadialGradient(0, 0, 0, 0, 0, l.r);
      gr.addColorStop(0, `rgba(0,0,0,${l.a})`);
      gr.addColorStop(0.55, `rgba(0,0,0,${l.a * 0.55})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      L.save();
      L.translate(x, y);
      L.scale(1, 0.72);
      L.fillStyle = gr;
      L.fillRect(-l.r, -l.r, l.r * 2, l.r * 2);
      L.restore();
    }
    g.drawImage(this.light, 0, 0);
    g.globalCompositeOperation = "lighter";
    // feixe do holofote vindo de cima
    {
      const x = this.lx(tu);
      const y = this.ly(tv + 10);
      const beam = g.createLinearGradient(x, 0, x, y);
      beam.addColorStop(0, "rgba(255,240,210,0)");
      beam.addColorStop(1, "rgba(255,240,210,0.10)");
      g.fillStyle = beam;
      g.beginPath();
      g.moveTo(x - 14, 0);
      g.lineTo(x + 14, 0);
      g.lineTo(x + 30, y);
      g.lineTo(x - 30, y);
      g.closePath();
      g.fill();
      g.fillStyle = "rgba(255,240,210,0.07)";
      g.beginPath();
      g.ellipse(x, y, 30, 13, 0, 0, TAU);
      g.fill();
    }
    for (const l of lights) {
      if (l.a < 0.8 || l.color === "#fff4dc") continue;
      const x = this.lx(l.u);
      const y = this.ly(l.v);
      const gr = g.createRadialGradient(x, y, 0, x, y, l.r * 0.7);
      gr.addColorStop(0, rgba(l.color, 0.2));
      gr.addColorStop(1, rgba(l.color, 0));
      g.fillStyle = gr;
      g.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
    }
    g.globalCompositeOperation = "source-over";
    this.cam.u -= shU;
    this.cam.v -= shV;
    // amplia para a tela
    const m = this.g;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.imageSmoothingEnabled = false;
    m.drawImage(this.low, 0, 0, this.LW, this.LH, 0, 0, this.cv.width, (this.LH * this.scale * this.dpr));
    m.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.overlay(run, dt, cursorShown);
    if (this.flashRed > 0) {
      this.flashRed -= dt;
      m.fillStyle = `rgba(255,30,60,${clamp(this.flashRed, 0, 0.35) * 0.5})`;
      m.fillRect(0, 0, this.w, this.h);
    }
  }

  private sprite(s: Sprite, x: number, y: number, flip: boolean, white: boolean, alpha = 1): void {
    const g = this.lg;
    g.globalAlpha = alpha;
    const img = white ? s.white : s.img;
    if (flip) {
      g.save();
      g.translate(x, 0);
      g.scale(-1, 1);
      g.drawImage(img, -Math.floor(s.w / 2), y - s.h);
      g.restore();
    } else g.drawImage(img, x - Math.floor(s.w / 2), y - s.h);
    g.globalAlpha = 1;
  }

  private shadow(x: number, y: number, r: number): void {
    const g = this.lg;
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.beginPath();
    g.ellipse(x, y, r, r * 0.45, 0, 0, TAU);
    g.fill();
  }

  private drawTito(run: Run): void {
    const T = run.tito;
    const x = this.lx(isoU(T.x, T.y));
    const y = this.ly(isoV(T.x, T.y));
    this.shadow(x, y, 6);
    const near = run.monsters[0];
    const flip = T.moving ? false : near ? isoU(near.x, near.y) < isoU(T.x, T.y) : false;
    const frame = T.drum > 0 ? SPR.titoDrum : T.moving ? SPR.tito[[0, 1, 0, 2][Math.floor(this.time * 9) % 4]] : SPR.tito[0];
    this.sprite(frame, x, y + 1, flip, T.flash > 0 && Math.floor(this.time * 30) % 2 === 0);
    // vida do Tito (barra ciano como no original, acima da cabeça)
    const w = 16;
    const hp = clamp(T.hp / T.maxHp, 0, 1);
    const g = this.lg;
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.fillRect(x - w / 2, y - 27, w, 2);
    g.fillStyle = "#4adcd0";
    g.fillRect(x - w / 2, y - 27, Math.round(w * hp), 2);
  }

  private drawMonster(run: Run, m: Monster): void {
    const d = MONSTERS[m.type];
    const x = this.lx(isoU(m.x, m.y));
    const y = this.ly(isoV(m.x, m.y));
    const frames = monsterFrames(m.type, m.deg);
    const fr = frames[Math.floor((m.age * (m.type === "tamborim" ? 10 : 6)) % 2)];
    const ghost = run.ghost(m);
    const pop = clamp(m.age * 3, 0, 1);
    this.shadow(x, y, m.r * 0.9);
    if (pop < 1) {
      const g = this.lg;
      g.globalAlpha = pop;
    }
    const bob = m.type === "corista" ? Math.round(Math.sin(this.time * 4 + m.id) * 1.5) - 3 : 0;
    this.sprite(fr, x, y + 1 + bob, m.face < 0, m.flash > 0, ghost ? 0.35 : pop);
    if (m.stun > 0) {
      const g = this.lg;
      for (let i = 0; i < 3; i++) {
        const a = this.time * 6 + (i * TAU) / 3;
        g.fillStyle = "#ffe07a";
        g.fillRect(Math.round(x + Math.cos(a) * 6), Math.round(y - fr.h - 2 + Math.sin(a) * 2), 1, 1);
      }
    }
    // barras: armadura (branca-azulada) e vida (branca)
    const g = this.lg;
    const w = m.type === "maestro" ? 34 : 14;
    const by = y - fr.h - 4 + bob;
    if (m.maxArmor > 0 && m.armor > 0) {
      g.fillStyle = "rgba(0,0,0,0.6)";
      g.fillRect(x - w / 2, by - 3, w, 2);
      g.fillStyle = "#bfe8ff";
      g.fillRect(x - w / 2, by - 3, Math.round(w * (m.armor / m.maxArmor)), 2);
    }
    if (m.hp < m.maxHp || m.maxArmor > 0) {
      g.fillStyle = "rgba(0,0,0,0.6)";
      g.fillRect(x - w / 2, by, w, 2);
      g.fillStyle = "#f0f0f0";
      g.fillRect(x - w / 2, by, Math.round(w * clamp(m.hp / m.maxHp, 0, 1)), 2);
    } else {
      g.fillStyle = "rgba(240,240,240,0.85)";
      g.fillRect(x - w / 2, by, w, 1);
    }
    if (m.marked) {
      const my = by - (m.armor > 0 ? 9 : 6);
      g.fillStyle = "#b070ff";
      g.fillRect(x - 1, my - 2, 3, 1);
      g.fillRect(x - 2, my - 1, 5, 1);
      g.fillRect(x - 1, my, 3, 1);
      g.fillStyle = "#f0d8ff";
      g.fillRect(x, my - 1, 1, 1);
    }
    void d;
  }

  private drawMaestro(run: Run, m: Monster): void {
    const x = this.lx(isoU(m.x, m.y));
    const y = this.ly(isoV(m.x, m.y));
    const pop = clamp(m.age * 2, 0, 1);
    // desenha numa tela própria para o clarão de dano não vazar no cenário
    const bc = this.bossCanvas;
    const bg = bc.getContext("2d")!;
    bg.setTransform(1, 0, 0, 1, 0, 0);
    bg.globalCompositeOperation = "source-over";
    bg.clearRect(0, 0, bc.width, bc.height);
    drawBoss(bg, run.dIdx, 70, 110, this.time, m.flash > 0, m.hp < m.maxHp / 2);
    this.lg.globalAlpha = pop;
    this.lg.drawImage(bc, x - 70, y - 110);
    this.lg.globalAlpha = 1;
    if (m.stun > 0) {
      for (let i = 0; i < 4; i++) {
        const a = this.time * 5 + (i * TAU) / 4;
        this.lg.fillStyle = "#ffe07a";
        this.lg.fillRect(Math.round(x + Math.cos(a) * 12), Math.round(y - 52 + Math.sin(a) * 3), 2, 2);
      }
    }
  }

  // ------------------------------------------------------------ camada nítida
  private overlay(run: Run, dt: number, cursorShown: boolean): void {
    const g = this.g;
    // nomes das notas sobre os monstros
    g.font = `${Math.round(Math.max(13, this.scale * 7))}px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "bottom";
    for (const m of run.monsters) {
      if (m.deg < 0 || m.age < 0.3) continue;
      const fr = monsterFrames(m.type, m.deg)[0];
      const x = this.cx(isoU(m.x, m.y));
      const y = this.cy(isoV(m.x, m.y) - fr.h - 6 - (m.armor > 0 ? 3 : 0) - (m.marked ? 6 : 0));
      g.fillStyle = "rgba(0,0,0,0.7)";
      g.fillText(degreeNote(run.key, m.deg), x + 1, y + 1);
      g.fillStyle = degColor(m.deg);
      g.fillText(degreeNote(run.key, m.deg), x, y);
    }
    // círculo desenhado
    for (const c of this.circles) {
      c.life -= dt;
      g.strokeStyle = `rgba(255,214,120,${clamp(c.life / 0.6, 0, 1)})`;
      g.lineWidth = 4;
      g.beginPath();
      c.pts.forEach(([u, v], i) => (i ? g.lineTo(this.cx(u), this.cy(v)) : g.moveTo(this.cx(u), this.cy(v))));
      g.closePath();
      g.stroke();
    }
    this.circles = this.circles.filter((c) => c.life > 0);
    // rastro do corte (estilo escolhido na oficina; fica mais longo com as lições de Rastro)
    const now = this.time;
    const c = run.cursor;
    const px = this.cx(c.u);
    const py = this.cy(c.v);
    if (cursorShown && c.active) {
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(last.x - px, last.y - py) > 1) this.trail.push({ x: px, y: py, t: now });
    } else if (!c.active) this.trail.length = 0;
    const life = 0.24 + run.st.trailTime;
    while (this.trail.length && now - this.trail[0].t > life + 0.3) this.trail.shift();
    const tired = run.tired;
    const fast = c.speed > 120;
    const T = this.trail;
    const skin = this.trailSkin;
    const forte = run.skillT.forte > 0;
    const width = (fast ? 9 : 3) * run.st.width * (forte ? 1.6 : 1) * (run.prismT > 0 ? 1.3 : 1);
    const colorAt = (i: number, k: number): string => {
      if (tired) return `rgba(150,150,170,${0.6 * k})`;
      if (forte) return `rgba(255,${Math.round(120 + 100 * k)},90,${0.95 * k})`;
      switch (skin) {
        case "ouro":
          return `rgba(255,${Math.round(200 + 40 * k)},${Math.round(90 + 80 * k)},${0.95 * k})`;
        case "prisma":
          return rgba(DEGREE_COLORS[Math.floor(i / 3) % 7], 0.95 * k);
        case "brasa":
          return `rgba(255,${Math.round(80 + 150 * k * k)},${Math.round(30 * k)},${0.95 * k})`;
        case "estrelas":
          return `rgba(${Math.round(200 + 55 * k)},${Math.round(210 + 45 * k)},255,${0.95 * k})`;
        default:
          return `rgba(255,255,255,${0.95 * k})`;
      }
    };
    if (T.length > 1) {
      g.lineCap = "round";
      // brilho externo
      g.globalCompositeOperation = "lighter";
      for (let i = 1; i < T.length; i++) {
        const age = now - T[i].t;
        if (age > life) continue;
        const k = 1 - age / life;
        g.strokeStyle = colorAt(i, k * 0.35);
        g.lineWidth = width * k * 2.4 + 2;
        g.beginPath();
        g.moveTo(T[i - 1].x, T[i - 1].y);
        g.lineTo(T[i].x, T[i].y);
        g.stroke();
      }
      g.globalCompositeOperation = "source-over";
      for (let i = 1; i < T.length; i++) {
        const age = now - T[i].t;
        if (age > life) {
          if (i % 3 === 0) {
            g.fillStyle = colorAt(i, 0.5 * (1 - (age - life) / 0.3));
            g.fillRect(T[i].x - 1.5, T[i].y - 1.5, 3, 3);
          }
          continue;
        }
        const k = 1 - age / life;
        g.strokeStyle = colorAt(i, k);
        g.lineWidth = width * k + 1;
        g.beginPath();
        g.moveTo(T[i - 1].x, T[i - 1].y);
        g.lineTo(T[i].x, T[i].y);
        g.stroke();
      }
      g.lineCap = "butt";
      // faíscas saindo da ponta
      if (fast && !tired && this.trailParts.length < 160) {
        const n = skin === "prata" ? 1 : 2;
        for (let i = 0; i < n; i++)
          this.trailParts.push({ x: px, y: py, vx: (Math.random() - 0.5) * 60, vy: skin === "brasa" ? -40 - Math.random() * 50 : (Math.random() - 0.5) * 60, life: 0.5, c: colorAt(Math.floor(Math.random() * 21), 1), star: skin === "estrelas" });
      }
    }
    for (const tp of this.trailParts) {
      tp.life -= dt;
      tp.x += tp.vx * dt;
      tp.y += tp.vy * dt;
      g.globalAlpha = Math.max(0, tp.life * 2);
      g.fillStyle = tp.c;
      if (tp.star) {
        g.fillRect(tp.x - 3, tp.y - 0.5, 6, 1);
        g.fillRect(tp.x - 0.5, tp.y - 3, 1, 6);
      } else g.fillRect(tp.x - 1.5, tp.y - 1.5, 3, 3);
    }
    g.globalAlpha = 1;
    this.trailParts = this.trailParts.filter((tp) => tp.life > 0);
    // notas regidas voando até o contador
    for (const h of this.homing) {
      h.t += dt;
      const k = Math.min(1, h.t * 1.6);
      h.vx += ((this.home.x - h.x) * 10 - h.vx) * k * dt * 4;
      h.vy += ((this.home.y - h.y) * 10 - h.vy) * k * dt * 4;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      g.font = `${Math.round(18 * Math.max(1, this.scale / 2.4))}px Georgia, serif`;
      g.fillStyle = h.c;
      g.fillText("♪", h.x, h.y);
      if (Math.hypot(this.home.x - h.x, this.home.y - h.y) < 16 || h.t > 2.5) h.t = 99;
    }
    this.homing = this.homing.filter((h) => h.t < 99);
    // nomes das notas nos cadeados do baú
    const ch = run.room.chest;
    if (ch && !ch.open) {
      g.font = `${Math.round(Math.max(14, this.scale * 6.5))}px ${FONT}`;
      g.textAlign = "center";
      ch.lit.forEach((_, i) => {
        const lp = run.lockPos(ch, i);
        const d = ch.chord.degs[i];
        g.fillStyle = "rgba(0,0,0,0.7)";
        g.fillText(degreeNote(run.key, d), this.cx(lp.u) + 1, this.cy(lp.v - 6) + 1);
        g.fillStyle = degColor(d);
        g.fillText(degreeNote(run.key, d), this.cx(lp.u), this.cy(lp.v - 6));
      });
    }
    // seta para a porta quando ela abre
    const ex = run.exitDoor();
    if (ex && run.phase === "explore") {
      const ux = this.cx(isoU(ex.x, ex.y));
      const vy = this.cy(isoV(ex.x, ex.y) - 12);
      const m = 40;
      const inside = ux > m && ux < this.w - m && vy > m && vy < this.h - m;
      const ax = clamp(ux, m, this.w - m);
      const ay = clamp(vy, m, this.h - m);
      const bob = Math.sin(now * 5) * 4;
      g.save();
      g.translate(ax, ay + (inside ? -20 + bob : 0));
      const ang = inside ? Math.PI / 2 : Math.atan2(vy - this.h / 2, ux - this.w / 2);
      g.rotate(ang);
      g.fillStyle = "#ffd27a";
      g.beginPath();
      g.moveTo(12, 0);
      g.lineTo(-6, -8);
      g.lineTo(-2, 0);
      g.lineTo(-6, 8);
      g.closePath();
      g.fill();
      g.restore();
    }
    // cursor: faísca roxa (você)
    if (cursorShown) {
      const s = 7 + Math.sin(now * 8) * 1.5;
      g.fillStyle = tired ? "#8a86a0" : "#c9a0ff";
      g.beginPath();
      g.moveTo(px, py - s);
      g.lineTo(px + s * 0.3, py - s * 0.3);
      g.lineTo(px + s, py);
      g.lineTo(px + s * 0.3, py + s * 0.3);
      g.lineTo(px, py + s);
      g.lineTo(px - s * 0.3, py + s * 0.3);
      g.lineTo(px - s, py);
      g.lineTo(px - s * 0.3, py - s * 0.3);
      g.closePath();
      g.fill();
      g.fillStyle = "#fff";
      g.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
    // notinhas flutuando no ar
    if (this.motes.length < 26 && Math.random() < 0.1)
      this.motes.push({ x: Math.random() * this.w, y: this.h + 10, vy: 12 + Math.random() * 20, ph: Math.random() * 6, c: DEGREE_COLORS[Math.floor(Math.random() * 7)], g: Math.random() < 0.5 ? "♪" : "♫" });
    g.font = `${Math.round(14 * Math.max(1, this.scale / 2.2))}px Georgia, serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const mo of this.motes) {
      mo.y -= mo.vy * dt;
      mo.ph += dt;
      g.globalAlpha = 0.18 * Math.min(1, mo.y / (this.h * 0.4));
      g.fillStyle = mo.c;
      g.fillText(mo.g, mo.x + Math.sin(mo.ph * 1.3) * 10, mo.y);
    }
    g.globalAlpha = 1;
    this.motes = this.motes.filter((mo) => mo.y > -20);
    // balão de fala do Tito
    if (this.bark) {
      this.bark.life -= dt;
      const b = this.bark;
      const T = run.tito;
      const x = this.cx(isoU(T.x, T.y));
      const y = this.cy(isoV(T.x, T.y) - 34);
      g.font = `${Math.round(Math.max(18, this.scale * 8))}px ${FONT}`;
      const tw = g.measureText(b.text).width;
      const pad = 8;
      const bw = tw + pad * 2;
      const bh = Math.max(24, this.scale * 10);
      const bx = Math.max(6, Math.min(this.w - bw - 6, x - bw / 2));
      g.globalAlpha = Math.min(1, b.life * 3);
      g.fillStyle = "#f4eee4";
      g.fillRect(bx, y - bh, bw, bh);
      g.beginPath();
      g.moveTo(x - 5, y);
      g.lineTo(x + 5, y);
      g.lineTo(x, y + 7);
      g.fill();
      g.strokeStyle = "#1a1420";
      g.lineWidth = 2;
      g.strokeRect(bx, y - bh, bw, bh);
      g.fillStyle = "#1a1420";
      g.textAlign = "left";
      g.fillText(b.text, bx + pad, y - bh / 2 + 1);
      g.textAlign = "center";
      g.globalAlpha = 1;
      if (b.life <= 0) this.bark = null;
    }
    // textos
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const t of this.texts) {
      t.life -= dt;
      t.v -= t.rise * dt;
      const k = clamp(t.life / t.max, 0, 1);
      g.globalAlpha = Math.min(1, k * 2.5);
      g.font = `${Math.round(t.size * Math.max(0.85, this.scale / 2))}px ${FONT}`;
      const x = this.cx(t.u);
      const y = this.cy(t.v);
      g.fillStyle = "rgba(0,0,0,0.75)";
      g.fillText(t.s, x + 2, y + 2);
      g.fillStyle = t.color;
      g.fillText(t.s, x, y);
    }
    g.globalAlpha = 1;
    this.texts = this.texts.filter((t) => t.life > 0);
    // chefe
    const boss = run.monsters.find((m) => m.type === "maestro");
    if (boss) {
      const bw = Math.min(this.w * 0.42, 460);
      const bx = this.w / 2 - bw / 2;
      const by = this.h - 96;
      g.font = `22px ${FONT}`;
      g.fillStyle = "#ffd0dc";
      g.fillText(`${BOSS_FORMS[run.dIdx].name.toUpperCase()}, ${BOSS_FORMS[run.dIdx].title.toUpperCase()}`, this.w / 2, by - 12);
      g.fillStyle = "rgba(0,0,0,0.7)";
      g.fillRect(bx, by, bw, 10);
      g.fillStyle = "#ff3a5a";
      g.fillRect(bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), 6);
      g.fillStyle = "#bfe8ff";
      g.fillRect(bx, by + 6, bw * clamp(boss.armor / boss.maxArmor, 0, 1), 4);
    }
  }
}
