import { fmt } from "../core/format";
import { TAU, clamp } from "../core/math";
import { hash2 } from "../core/rng";
import { CHROMA_COLOR, DEGREE_COLORS, MONSTERS, chordName, degreeNote } from "../data/content";
import { DOOR, ROOM, isoU, isoV, type Monster, type Room, type Run, type SimEvent } from "../game/sim";
import { SPR, type Sprite } from "./pixels";

const WALL = 46;
const TILE = 20;
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
  private roomCache = new Map<Room, HTMLCanvasElement>();
  private parts: Px[] = [];
  private texts: Txt[] = [];
  private rings: Ring[] = [];
  private trail: { x: number; y: number; t: number }[] = [];
  private circles: { pts: [number, number][]; life: number }[] = [];
  private time = 0;
  private shake = 0;
  private flashRed = 0;
  private camInit = false;

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
        case "batuque": {
          const t = run.tito;
          this.rings.push({ u: isoU(t.x, t.y), v: isoV(t.x, t.y) - 6, r0: 6, r1: 60, life: 0.4, max: 0.4, color: "#ffd27a" });
          break;
        }
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

  // ------------------------------------------------------------ salas (pré-renderizadas)
  private roomCanvas(run: Run, r: Room): HTMLCanvasElement {
    let c = this.roomCache.get(r);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = ROOM * 2 + 4;
    c.height = ROOM + WALL + 4;
    const g = c.getContext("2d")!;
    const d = run.dungeon;
    const P = (lx: number, ly: number): [number, number] => [ROOM + 2 + (lx - ly), WALL + 2 + (lx + ly) / 2];
    const idx = run.rooms.indexOf(r);
    const prev = idx > 0 ? run.rooms[idx - 1] : null;
    const doors: [number, number][] = [];
    if (r.next) doors.push(r.next);
    if (prev) doors.push([prev.gx - r.gx, prev.gy - r.gy]);
    const hasDoor = (dx: number, dy: number) => doors.some(([a, b]) => a === dx && b === dy);
    // piso
    const n = ROOM / TILE;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const h = hash2(i + r.gx * 31, j + r.gy * 17, 5);
        const [x1, y1] = P(i * TILE, j * TILE);
        const [x2, y2] = P((i + 1) * TILE, j * TILE);
        const [x3, y3] = P((i + 1) * TILE, (j + 1) * TILE);
        const [x4, y4] = P(i * TILE, (j + 1) * TILE);
        g.fillStyle = (i + j) % 2 ? d.floor[0] : d.floor[1];
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.lineTo(x3, y3);
        g.lineTo(x4, y4);
        g.closePath();
        g.fill();
        g.strokeStyle = "rgba(0,0,0,0.25)";
        g.lineWidth = 1;
        g.stroke();
        if (h < 0.12) {
          g.strokeStyle = "rgba(0,0,0,0.35)";
          g.beginPath();
          g.moveTo((x1 + x3) / 2 - 6, (y1 + y3) / 2);
          g.lineTo((x1 + x3) / 2 + 2, (y1 + y3) / 2 + 2);
          g.lineTo((x1 + x3) / 2 + 7, (y1 + y3) / 2 - 1);
          g.stroke();
        } else if (h > 0.965) {
          // folha de partitura caída no chão
          const cx = Math.round((x1 + x3) / 2);
          const cy = Math.round((y1 + y3) / 2);
          g.fillStyle = "rgba(200,190,165,0.35)";
          g.fillRect(cx - 3, cy - 1, 6, 3);
          g.fillStyle = "rgba(60,50,40,0.5)";
          g.fillRect(cx - 2, cy, 4, 1);
        }
      }
    // paredes do fundo (com tijolos) e vãos de porta
    const wallFace = (ax: number, ay: number, bx: number, by: number, dark: number) => {
      g.fillStyle = d.wall;
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.lineTo(bx, by - WALL);
      g.lineTo(ax, ay - WALL);
      g.closePath();
      g.fill();
      g.fillStyle = `rgba(0,0,0,${dark})`;
      g.fill();
      g.strokeStyle = "rgba(0,0,0,0.35)";
      for (let k = 6; k < WALL; k += 7) {
        g.beginPath();
        g.moveTo(ax, ay - k);
        g.lineTo(bx, by - k);
        g.stroke();
      }
      const len = Math.hypot(bx - ax, by - ay);
      for (let s = 0; s < len; s += 12) {
        const t = s / len;
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        for (let k = 0; k < WALL - 6; k += 14) {
          g.beginPath();
          g.moveTo(x + ((s / 12) % 2) * 4, y - k - 6);
          g.lineTo(x + ((s / 12) % 2) * 4, y - k - 13);
          g.stroke();
        }
      }
      g.fillStyle = "rgba(255,230,190,0.08)";
      g.beginPath();
      g.moveTo(ax, ay - WALL);
      g.lineTo(bx, by - WALL);
      g.lineTo(bx, by - WALL + 3);
      g.lineTo(ax, ay - WALL + 3);
      g.fill();
    };
    const half = (ROOM - DOOR) / 2;
    // paredes de trás; lados colados em outra sala ficam abertos (só pilares)
    const neighbor = (dx: number, dy: number) => run.rooms.some((o) => o.gx === r.gx + dx && o.gy === r.gy + dy);
    const pillar = (lx: number, ly: number) => {
      const [x, y] = P(lx, ly);
      g.fillStyle = d.wall;
      g.fillRect(x - 3, y - WALL, 6, WALL);
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fillRect(x, y - WALL, 3, WALL);
    };
    if (!neighbor(-1, 0)) {
      if (hasDoor(-1, 0)) {
        wallFace(...P(0, 0), ...P(0, half), 0.15);
        wallFace(...P(0, half + DOOR), ...P(0, ROOM), 0.15);
      } else wallFace(...P(0, 0), ...P(0, ROOM), 0.15);
    } else {
      pillar(0, half);
      pillar(0, half + DOOR);
    }
    if (!neighbor(0, -1)) {
      if (hasDoor(0, -1)) {
        wallFace(...P(0, 0), ...P(half, 0), 0.35);
        wallFace(...P(half + DOOR, 0), ...P(ROOM, 0), 0.35);
      } else wallFace(...P(0, 0), ...P(ROOM, 0), 0.35);
    } else {
      pillar(half, 0);
      pillar(half + DOOR, 0);
    }
    // soleiras das portas da frente
    g.fillStyle = "rgba(255,210,150,0.07)";
    if (hasDoor(1, 0)) {
      const [ax, ay] = P(ROOM - 10, half);
      const [bx, by] = P(ROOM, half + DOOR);
      g.fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax) + 8, Math.abs(by - ay) + 4);
    }
    if (hasDoor(0, 1)) {
      const [ax, ay] = P(half, ROOM - 10);
      const [bx, by] = P(half + DOOR, ROOM);
      g.fillRect(Math.min(ax, bx) - 4, Math.min(ay, by), Math.abs(bx - ax) + 8, Math.abs(by - ay) + 4);
    }
    // bordas da frente escuras
    g.strokeStyle = "rgba(0,0,0,0.6)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(...P(ROOM, 0));
    g.lineTo(...P(ROOM, ROOM));
    g.lineTo(...P(0, ROOM));
    g.stroke();
    // barris e caixotes nos cantos
    for (let k = 0; k < 5; k++) {
      const h = hash2(k, r.gx * 7 + r.gy, 9);
      const lx = h < 0.5 ? 10 + h * 60 : 10;
      const ly = h < 0.5 ? 10 : 10 + (h - 0.5) * 120;
      const [x, y] = P(lx, ly);
      if (k % 2) {
        g.fillStyle = "#5a3e26";
        g.fillRect(x - 5, y - 12, 10, 12);
        g.fillStyle = "#7a5634";
        g.fillRect(x - 5, y - 14, 10, 3);
        g.fillStyle = "#3a2616";
        g.fillRect(x - 5, y - 8, 10, 1);
      } else {
        g.fillStyle = "#6a4a2a";
        g.fillRect(x - 6, y - 9, 12, 9);
        g.strokeStyle = "#3a2616";
        g.lineWidth = 1;
        g.strokeRect(x - 5.5, y - 8.5, 11, 8);
        g.beginPath();
        g.moveTo(x - 5, y - 8);
        g.lineTo(x + 5, y);
        g.stroke();
      }
    }
    this.roomCache.set(r, c);
    return c;
  }

  /** tochas nas paredes do fundo (posição no plano isométrico) */
  private torches(run: Run, r: Room): { u: number; v: number }[] {
    const out: { u: number; v: number }[] = [];
    const left = !run.rooms.some((o) => o.gx === r.gx - 1 && o.gy === r.gy);
    const right = !run.rooms.some((o) => o.gx === r.gx && o.gy === r.gy - 1);
    for (const t of [0.22, 0.78]) {
      if (left) out.push({ u: isoU(r.x0, r.y0 + ROOM * t), v: isoV(r.x0, r.y0 + ROOM * t) - 28 });
      if (right) out.push({ u: isoU(r.x0 + ROOM * t, r.y0), v: isoV(r.x0 + ROOM * t, r.y0) - 28 });
    }
    // sala sem paredes de trás ainda recebe luz em volta
    if (!left && !right) out.push({ u: isoU(r.x0 + ROOM / 2, r.y0 + ROOM / 2), v: isoV(r.x0 + ROOM / 2, r.y0 + ROOM / 2) - 60 });
    return out;
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
    for (const r of show) {
      const c = this.roomCanvas(run, r);
      g.drawImage(c, this.lx(isoU(r.x0, r.y0)) - ROOM - 2, this.ly(isoV(r.x0, r.y0)) - WALL - 2);
    }
    // tochas (chama)
    const lights: { u: number; v: number; r: number; a: number }[] = [];
    for (const r of show) {
      if (!r.visited) continue;
      for (const t of this.torches(run, r)) {
        const f = 0.85 + 0.15 * Math.sin(this.time * 13 + t.u) * Math.sin(this.time * 7.3 + t.v);
        const x = this.lx(t.u);
        const y = this.ly(t.v);
        g.fillStyle = "#3a2a1a";
        g.fillRect(x - 1, y, 2, 5);
        g.fillStyle = "#ff8a2a";
        g.fillRect(x - 2, y - 3, 4, 3);
        g.fillStyle = "#ffe07a";
        g.fillRect(x - 1, y - 4 - Math.round(f), 2, 2);
        lights.push({ u: t.u, v: t.v + 10, r: 70 * f, a: 0.85 });
      }
    }
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
    // entidades ordenadas por profundidade
    type D = { z: number; f: () => void };
    const list: D[] = [];
    list.push({ z: T.x + T.y, f: () => this.drawTito(run) });
    for (const m of run.monsters) list.push({ z: m.x + m.y, f: () => this.drawMonster(run, m) });
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
    // iluminação: escuridão com buracos de luz
    lights.push({ u: tu, v: tv + 4, r: 115 + (T.drum > 0 ? 8 : 0), a: 1 });
    if (cursorShown) lights.push({ u: run.cursor.u, v: run.cursor.v, r: 34, a: 0.6 });
    for (const r of this.rings) lights.push({ u: r.u, v: r.v, r: 40, a: 0.5 });
    const L = this.lc;
    L.globalCompositeOperation = "source-over";
    L.clearRect(0, 0, this.LW, this.LH);
    L.fillStyle = "rgba(3,2,7,0.9)";
    L.fillRect(0, 0, this.LW, this.LH);
    L.globalCompositeOperation = "destination-out";
    for (const l of lights) {
      const x = this.lx(l.u);
      const y = this.ly(l.v);
      const gr = L.createRadialGradient(x, y, 0, x, y, l.r);
      gr.addColorStop(0, `rgba(0,0,0,${l.a})`);
      gr.addColorStop(0.55, `rgba(0,0,0,${l.a * 0.55})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      L.fillStyle = gr;
      L.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
    }
    g.drawImage(this.light, 0, 0);
    // brilho quente das tochas
    g.globalCompositeOperation = "lighter";
    for (const l of lights.slice(0, -1)) {
      if (l.a < 0.8) continue;
      const x = this.lx(l.u);
      const y = this.ly(l.v);
      const gr = g.createRadialGradient(x, y, 0, x, y, l.r * 0.6);
      gr.addColorStop(0, rgba(run.dungeon.light, 0.18));
      gr.addColorStop(1, rgba(run.dungeon.light, 0));
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
    const frame = T.drum > 0 ? SPR.titoDrum : T.moving ? SPR.tito[Math.floor(this.time * 8) % 2] : SPR.tito[0];
    this.sprite(frame, x, y + 1, flip, T.flash > 0 && Math.floor(this.time * 30) % 2 === 0);
    // vida do Tito (barra ciano como no original, acima da cabeça)
    const w = 16;
    const hp = clamp(T.hp / T.maxHp, 0, 1);
    const g = this.lg;
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.fillRect(x - w / 2, y - 23, w, 2);
    g.fillStyle = "#4adcd0";
    g.fillRect(x - w / 2, y - 23, Math.round(w * hp), 2);
  }

  private drawMonster(run: Run, m: Monster): void {
    const d = MONSTERS[m.type];
    const x = this.lx(isoU(m.x, m.y));
    const y = this.ly(isoV(m.x, m.y));
    const frames = SPR[m.type];
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

  // ------------------------------------------------------------ camada nítida
  private overlay(run: Run, dt: number, cursorShown: boolean): void {
    const g = this.g;
    // nomes das notas sobre os monstros
    g.font = `${Math.round(Math.max(13, this.scale * 7))}px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "bottom";
    for (const m of run.monsters) {
      if (m.deg < 0 || m.age < 0.3) continue;
      const fr = SPR[m.type][0];
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
    // rastro do corte
    const now = this.time;
    const c = run.cursor;
    const px = this.cx(c.u);
    const py = this.cy(c.v);
    if (cursorShown && c.active) {
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(last.x - px, last.y - py) > 1) this.trail.push({ x: px, y: py, t: now });
    } else if (!c.active) this.trail.length = 0;
    while (this.trail.length && now - this.trail[0].t > 0.5) this.trail.shift();
    const tired = run.tired;
    const fast = c.speed > 120;
    const T = this.trail;
    if (T.length > 1) {
      g.lineCap = "round";
      for (let i = 1; i < T.length; i++) {
        const age = now - T[i].t;
        if (age > 0.2) {
          // cauda pontilhada
          if (i % 3 === 0) {
            g.fillStyle = `rgba(255,255,255,${0.5 * (1 - age / 0.5)})`;
            g.fillRect(T[i].x - 1.5, T[i].y - 1.5, 3, 3);
          }
          continue;
        }
        const k = 1 - age / 0.2;
        g.strokeStyle = tired ? `rgba(150,150,170,${0.6 * k})` : `rgba(255,255,255,${0.95 * k})`;
        g.lineWidth = (fast ? 7 : 3) * k + 1;
        g.beginPath();
        g.moveTo(T[i - 1].x, T[i - 1].y);
        g.lineTo(T[i].x, T[i].y);
        g.stroke();
      }
      g.lineCap = "butt";
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
      const by = 34;
      g.font = `22px ${FONT}`;
      g.fillStyle = "#ffd0dc";
      g.fillText("MAESTRO TRÍTONO", this.w / 2, by - 12);
      g.fillStyle = "rgba(0,0,0,0.7)";
      g.fillRect(bx, by, bw, 10);
      g.fillStyle = "#ff3a5a";
      g.fillRect(bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), 6);
      g.fillStyle = "#bfe8ff";
      g.fillRect(bx, by + 6, bw * clamp(boss.armor / boss.maxArmor, 0, 1), 4);
    }
  }
}
