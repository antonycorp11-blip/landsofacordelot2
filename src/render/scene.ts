import { fmt } from "../core/format";
import { TAU, clamp } from "../core/math";
import { CHROMA_COLOR, DEGREE_COLORS, MONSTERS, chordName, degreeNote } from "../data/content";
import { ROOM, isoU, isoV, type Monster, type Room, type Run, type SimEvent } from "../game/sim";
import { SPR, monsterFrames, type Sprite } from "./pixels";
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

  // ------------------------------------------------------------ salas (pré-renderizadas por estilo)
  private roomArt(run: Run, r: Room): RoomArt {
    let a = this.roomCache.get(r);
    if (!a) this.roomCache.set(r, (a = paintRoom(run, r)));
    return a;
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
