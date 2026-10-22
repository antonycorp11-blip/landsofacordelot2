import { fmt } from "../core/format";
import { TAU, clamp } from "../core/math";
import { Rng } from "../core/rng";
import { CHROMA_COLOR, DEGREE_COLORS, chordName, degreeNote } from "../data/content";
import { LYRA_R, type Enemy, type Run, type SimEvent } from "../game/sim";

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  glyph?: string;
  /** voa até o contador da HUD */
  home?: boolean;
}
interface W {
  x: number;
  y: number;
  r0: number;
  r1: number;
  life: number;
  max: number;
  color: string;
  width: number;
}
interface T {
  x: number;
  y: number;
  s: string;
  life: number;
  max: number;
  color: string;
  size: number;
  big?: boolean;
}

export interface Marker {
  x: number;
  y: number;
  r: number;
  label?: string;
}

export function degColor(deg: number): string {
  return deg < 0 ? CHROMA_COLOR : DEGREE_COLORS[deg % 7];
}

const glowCache = new Map<string, HTMLCanvasElement>();
function glow(color: string): HTMLCanvasElement {
  let c = glowCache.get(color);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(color, 0.9));
  gr.addColorStop(0.3, rgba(color, 0.35));
  gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(color, c);
  return c;
}

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const SERIF = 'Georgia, "Times New Roman", serif';

/** Desenha a sala de concerto, a Lyra, as notas-monstro e a batuta. */
export class Scene {
  w = 1;
  h = 1;
  dpr = 1;
  s = 1;
  cx = 0;
  cy = 0;
  private g: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private parts: P[] = [];
  private waves: W[] = [];
  private texts: T[] = [];
  private trail: { x: number; y: number; t: number }[] = [];
  private dust: { x: number; y: number; z: number; v: number }[] = [];
  private time = 0;
  private shake = 0;
  private beatGlow = 0;
  private lyraSing = 0;
  private hurtRed = 0;
  /** posição (tela) do contador de notas, para as notas voarem até ele */
  home = { x: 0, y: 0 };

  constructor(readonly cv: HTMLCanvasElement) {
    this.g = cv.getContext("2d")!;
    for (let i = 0; i < 60; i++) this.dust.push({ x: Math.random(), y: Math.random(), z: Math.random(), v: 0.2 + Math.random() * 0.5 });
  }

  resize(w: number, h: number): { hw: number; hh: number } {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.cv.width = Math.round(w * this.dpr);
    this.cv.height = Math.round(h * this.dpr);
    this.s = Math.min(w, h) / 620;
    this.cx = w / 2;
    this.cy = h / 2;
    this.home = { x: w / 2, y: 26 };
    this.bg = this.renderBg();
    return { hw: w / 2 / this.s, hh: h / 2 / this.s };
  }

  toWorld(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.cx) / this.s, y: (y - this.cy) / this.s };
  }

  private sx(x: number): number {
    return this.cx + x * this.s;
  }
  private sy(y: number): number {
    return this.cy + y * this.s;
  }

  /** fundo: sala escura de concerto, cortinas de veludo e a pauta circular */
  private renderBg(): HTMLCanvasElement {
    const W = Math.ceil(this.w * this.dpr);
    const H = Math.ceil(this.h * this.dpr);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.scale(this.dpr, this.dpr);
    const w = this.w;
    const h = this.h;
    const bg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    bg.addColorStop(0, "#241640");
    bg.addColorStop(0.45, "#120b24");
    bg.addColorStop(1, "#05030b");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    // assoalho do palco: tábuas em perspectiva bem sutis
    g.strokeStyle = "rgba(255,200,140,0.035)";
    g.lineWidth = 1;
    for (let i = -20; i <= 20; i++) {
      g.beginPath();
      g.moveTo(w / 2 + i * 40 * this.s, 0);
      g.lineTo(w / 2 + i * 70 * this.s, h);
      g.stroke();
    }
    // cortinas de veludo nas laterais
    const cw = Math.min(w * 0.12, 140);
    for (const side of [0, 1]) {
      const x0 = side ? w - cw : 0;
      for (let i = 0; i < 7; i++) {
        const fx = x0 + (i / 7) * cw;
        const gr = g.createLinearGradient(fx, 0, fx + cw / 7, 0);
        gr.addColorStop(0, "rgba(60,6,20,0.9)");
        gr.addColorStop(0.5, "rgba(130,18,40,0.85)");
        gr.addColorStop(1, "rgba(50,4,16,0.9)");
        g.fillStyle = gr;
        g.fillRect(fx, 0, cw / 7 + 1, h);
      }
      const fade = g.createLinearGradient(side ? x0 : cw, 0, side ? x0 - 60 : cw + 60, 0);
      fade.addColorStop(0, "rgba(0,0,0,0.5)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = fade;
      g.fillRect(side ? x0 - 60 : cw, 0, 60, h);
    }
    // sanefa (cortina de cima)
    const vh = Math.min(h * 0.07, 50);
    for (let i = 0; i < Math.ceil(w / 60); i++) {
      g.fillStyle = i % 2 ? "rgba(110,14,34,0.95)" : "rgba(80,8,24,0.95)";
      g.beginPath();
      g.moveTo(i * 60, 0);
      g.lineTo(i * 60 + 60, 0);
      g.lineTo(i * 60 + 60, vh * 0.7);
      g.quadraticCurveTo(i * 60 + 30, vh * 1.25, i * 60, vh * 0.7);
      g.fill();
    }
    g.fillStyle = "rgba(220,170,80,0.5)";
    g.fillRect(0, vh * 0.55, w, 1.5);
    // holofote
    const sp = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 300 * this.s);
    sp.addColorStop(0, "rgba(255,220,160,0.16)");
    sp.addColorStop(1, "rgba(255,220,160,0)");
    g.fillStyle = sp;
    g.fillRect(0, 0, w, h);
    // pauta circular: 5 linhas
    g.strokeStyle = "rgba(230,190,120,0.16)";
    g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(w / 2, h / 2, (226 + i * 9) * this.s, 0, TAU);
      g.stroke();
    }
    // barras de compasso
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.beginPath();
      g.moveTo(w / 2 + Math.cos(a) * 226 * this.s, h / 2 + Math.sin(a) * 226 * this.s);
      g.lineTo(w / 2 + Math.cos(a) * 262 * this.s, h / 2 + Math.sin(a) * 262 * this.s);
      g.stroke();
    }
    // notas decorativas na pauta
    const rng = new Rng(7);
    g.fillStyle = "rgba(230,190,120,0.13)";
    g.font = `${Math.round(18 * this.s)}px ${SERIF}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU + 0.13;
      const rr = (226 + Math.floor(rng.next() * 5) * 9) * this.s;
      g.fillText(rng.pick(["♩", "♪", "♫", "♬"]), w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr);
    }
    // vinheta
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.6)");
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
    return c;
  }

  // ------------------------------------------------------------ eventos
  consume(run: Run, events: SimEvent[]): void {
    for (const e of events) {
      switch (e.k) {
        case "beat":
          this.beatGlow = e.bar ? 1 : 0.6;
          this.waves.push({ x: 0, y: 0, r0: LYRA_R + 6, r1: e.bar ? 220 : 140, life: 0.6, max: 0.6, color: "#ffd9a0", width: e.bar ? 3 : 1.5 });
          if (e.n % 2 === 0) this.lyraSing = 0.4;
          if (e.n % 2 === 0 && Math.random() < 0.7) this.parts.push({ x: (Math.random() - 0.5) * 10, y: -LYRA_R - 4, vx: (Math.random() - 0.5) * 30, vy: -40, life: 1.6, max: 1.6, color: "#ffe6b0", size: 12, glyph: Math.random() < 0.5 ? "♪" : "♫" });
          break;
        case "hit": {
          const col = degColor(e.deg);
          for (let i = 0; i < (e.crit ? 12 : 6); i++) this.spark(e.x, e.y, 180, i % 2 ? col : "#ffffff", 0.35);
          if (this.texts.length < 40) this.text(e.x + (Math.random() - 0.5) * 10, e.y - 12, fmt(e.dmg), e.crit ? "#ffe27a" : "#ffffff", e.crit ? 15 : 11);
          if (e.onBeat) this.text(e.x, e.y - 28, "no tempo!", "#ffd84a", 11);
          if (e.boss) this.shake = Math.max(this.shake, 2);
          break;
        }
        case "kill": {
          const col = degColor(e.deg);
          const big = e.type === "tritono";
          for (let i = 0; i < (big ? 70 : 16); i++) this.spark(e.x, e.y, big ? 320 : 200, i % 3 ? col : "#fff", 0.6);
          this.waves.push({ x: e.x, y: e.y, r0: 6, r1: big ? 200 : 40, life: 0.45, max: 0.45, color: col, width: 3 });
          const n = clamp(Math.round(e.notes), 1, big ? 30 : 6);
          for (let i = 0; i < n; i++) {
            const a = Math.random() * TAU;
            this.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 40, life: 1.1 + Math.random() * 0.4, max: 1.4, color: "#ffe9a8", size: 13, glyph: "♪", home: true });
          }
          if (big) this.shake = 16;
          break;
        }
        case "chord": {
          const cols = e.chord.degs.map((d) => DEGREE_COLORS[d]);
          cols.forEach((c, i) => this.waves.push({ x: e.x, y: e.y, r0: 8 + i * 6, r1: e.r * (1 + i * 0.12), life: 0.6 + i * 0.08, max: 0.6 + i * 0.08, color: c, width: 5 }));
          for (let i = 0; i < 30; i++) this.spark(e.x, e.y, 260, cols[i % cols.length], 0.7);
          this.texts.push({ x: e.x, y: e.y - 30, s: `${e.chord.roman} · ${chordName(run.key, e.chord)}`, life: 1.4, max: 1.4, color: "#ffffff", size: 18, big: true });
          this.shake = Math.max(this.shake, 6);
          break;
        }
        case "scale":
          this.text(e.x, e.y - 40, "escala! +fôlego", "#6ef29a", 12);
          break;
        case "parry":
          for (let i = 0; i < 8; i++) this.spark(e.x, e.y, 150, "#c08aff", 0.3);
          break;
        case "lyra":
          this.hurtRed = 0.45;
          this.shake = Math.max(this.shake, 6);
          for (let i = 0; i < 10; i++) this.spark(0, 0, 160, "#ff6a7a", 0.4);
          break;
        case "cry":
          this.waves.push({ x: 0, y: 0, r0: 10, r1: 150, life: 0.5, max: 0.5, color: "#ffffff", width: 6 });
          break;
        case "shock":
          this.shake = Math.max(this.shake, 5);
          break;
        default:
          break;
      }
    }
  }

  private spark(x: number, y: number, sp: number, color: string, life: number): void {
    if (this.parts.length > 700) return;
    const a = Math.random() * TAU;
    const v = sp * (0.3 + Math.random() * 0.7);
    this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, color, size: 1.5 + Math.random() * 2 });
  }

  private text(x: number, y: number, s: string, color: string, size: number): void {
    this.texts.push({ x, y, s, life: 0.8, max: 0.8, color, size });
  }

  // ------------------------------------------------------------ quadro
  draw(run: Run, dt: number, marker: Marker | null, cursorVisible: boolean): void {
    this.time += dt;
    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    if (this.bg) g.drawImage(this.bg, 0, 0, this.w, this.h);
    this.beatGlow = Math.max(0, this.beatGlow - dt * 2.5);
    this.shake = Math.max(0, this.shake - dt * 30);
    g.save();
    g.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    this.drawStaffPulse(g, run);
    this.drawDust(g, dt);
    this.drawRings(g, run);
    this.drawTrailSegs(g, run);
    this.drawLyra(g, run, dt);
    this.drawOstinato(g, run);
    this.drawShots(g, run);
    for (const e of run.enemies) this.drawEnemy(g, run, e);
    this.drawBoss(g, run);
    this.drawFx(g, dt);
    if (marker) this.drawMarker(g, marker);
    g.restore();
    this.drawBaton(g, run, dt, cursorVisible);
    if (this.hurtRed > 0) {
      this.hurtRed -= dt;
      const vg = g.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.3, this.w / 2, this.h / 2, Math.hypot(this.w, this.h) * 0.6);
      vg.addColorStop(0, "rgba(255,40,70,0)");
      vg.addColorStop(1, `rgba(255,40,70,${clamp(this.hurtRed, 0, 0.45) * 0.7})`);
      g.fillStyle = vg;
      g.fillRect(0, 0, this.w, this.h);
    }
  }

  private drawStaffPulse(g: CanvasRenderingContext2D, run: Run): void {
    const b = this.beatGlow;
    const onBeat = run.onBeat();
    g.strokeStyle = `rgba(255,214,140,${0.06 + b * 0.25 + (onBeat ? 0.05 : 0)})`;
    g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(this.cx, this.cy, (226 + i * 9) * this.s, 0, TAU);
      g.stroke();
    }
  }

  private drawDust(g: CanvasRenderingContext2D, dt: number): void {
    g.globalCompositeOperation = "lighter";
    for (const d of this.dust) {
      d.y -= d.v * dt * 0.03;
      d.x += Math.sin(this.time * 0.3 + d.z * 9) * dt * 0.004;
      if (d.y < 0) d.y += 1;
      const x = d.x * this.w;
      const y = d.y * this.h;
      const near = 1 - Math.min(1, Math.hypot(x - this.cx, y - this.cy) / (Math.min(this.w, this.h) * 0.55));
      if (near <= 0) continue;
      g.fillStyle = `rgba(255,225,170,${near * 0.35 * (0.4 + d.z)})`;
      g.fillRect(x, y, 1.5 + d.z, 1.5 + d.z);
    }
    g.globalCompositeOperation = "source-over";
  }

  private drawLyra(g: CanvasRenderingContext2D, run: Run, dt: number): void {
    const S = this.s;
    const x = this.cx;
    const y = this.cy;
    const L = run.lyra;
    this.lyraSing = Math.max(0, this.lyraSing - dt);
    // palco
    g.globalCompositeOperation = "lighter";
    const gs = (70 + this.beatGlow * 30) * S;
    g.globalAlpha = 0.55;
    g.drawImage(glow("#ffc98a"), x - gs, y - gs, gs * 2, gs * 2);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    const R = (LYRA_R + 12) * S;
    const st = g.createRadialGradient(x, y - R * 0.3, R * 0.1, x, y, R);
    st.addColorStop(0, "#3a2a50");
    st.addColorStop(1, "#16102a");
    g.fillStyle = st;
    g.beginPath();
    g.arc(x, y, R, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(230,190,120,0.7)";
    g.lineWidth = 1.5;
    g.stroke();
    // vida em arco
    const hpf = clamp(L.hp / L.maxHp, 0, 1);
    g.lineWidth = 4;
    g.strokeStyle = "rgba(0,0,0,0.45)";
    g.beginPath();
    g.arc(x, y, R + 5, 0, TAU);
    g.stroke();
    g.strokeStyle = hpf > 0.5 ? "#ff8aa0" : hpf > 0.25 ? "#ffb04a" : "#ff3a50";
    g.beginPath();
    g.arc(x, y, R + 5, -Math.PI / 2, -Math.PI / 2 + TAU * hpf);
    g.stroke();
    if (L.shield > 0) {
      g.strokeStyle = "rgba(160,220,255,0.8)";
      g.lineWidth = 2;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.arc(x, y, R + 11, this.time, this.time + TAU);
      g.stroke();
      g.setLineDash([]);
    }
    // a cantora
    const sway = Math.sin(this.time * 2) * 0.06;
    g.save();
    g.translate(x, y + 3 * S);
    g.rotate(sway);
    const k = S * 1.15;
    // vestido em sino
    const dress = g.createLinearGradient(0, -6 * k, 0, 16 * k);
    dress.addColorStop(0, "#f4e8ff");
    dress.addColorStop(1, L.flash > 0 ? "#ff8a9a" : "#a98ae8");
    g.fillStyle = dress;
    g.beginPath();
    g.moveTo(-3 * k, -5 * k);
    g.quadraticCurveTo(-5 * k, 6 * k, -12 * k, 14 * k);
    g.quadraticCurveTo(0, 17 * k, 12 * k, 14 * k);
    g.quadraticCurveTo(5 * k, 6 * k, 3 * k, -5 * k);
    g.closePath();
    g.fill();
    // braços abertos quando canta
    const open = this.lyraSing > 0 ? 1 : 0.3;
    g.strokeStyle = "#f6dcc8";
    g.lineWidth = 2 * k;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(-3 * k, -3 * k);
    g.lineTo(-9 * k, (1 - 6 * open) * k);
    g.moveTo(3 * k, -3 * k);
    g.lineTo(9 * k, (1 - 6 * open) * k);
    g.stroke();
    g.lineCap = "butt";
    // cabeça e cabelo
    g.fillStyle = "#3a2030";
    g.beginPath();
    g.arc(0, -10 * k, 6.4 * k, 0, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(5 * k, -6 * k, 2.4 * k, 6 * k, -0.5, 0, TAU);
    g.fill();
    g.fillStyle = "#f6dcc8";
    g.beginPath();
    g.arc(0, -9.4 * k, 4.8 * k, 0, TAU);
    g.fill();
    g.fillStyle = "#3a2030";
    g.beginPath();
    g.arc(0, -11.5 * k, 5 * k, Math.PI, TAU);
    g.fill();
    // olhos fechados e boca
    g.strokeStyle = "#3a2030";
    g.lineWidth = 0.9 * k;
    g.beginPath();
    g.arc(-1.8 * k, -9.4 * k, 0.9 * k, 0.2, Math.PI - 0.2);
    g.moveTo(2.7 * k, -9.4 * k);
    g.arc(1.8 * k, -9.4 * k, 0.9 * k, 0.2, Math.PI - 0.2);
    g.stroke();
    g.fillStyle = "#b0405a";
    g.beginPath();
    g.ellipse(0, -7 * k, 1 * k, (this.lyraSing > 0 ? 1.4 : 0.5) * k, 0, 0, TAU);
    g.fill();
    g.restore();
  }

  private drawEnemy(g: CanvasRenderingContext2D, run: Run, e: Enemy): void {
    const S = this.s;
    const x = this.sx(e.x);
    const y = this.sy(e.y);
    const pop = clamp(e.age * 5, 0, 1);
    const r = e.r * S * pop * (1 + 0.08 * run.pulse());
    const col = degColor(e.deg);
    const ghost = run.intangible(e);
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = ghost ? 0.25 : 0.55;
    const gs = r * 3;
    g.drawImage(glow(col), x - gs, y - gs, gs * 2, gs * 2);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = ghost ? 0.35 : 1;
    const fill = e.flash > 0 ? "#ffffff" : col;
    g.lineJoin = "round";
    if (e.type === "tritono") {
      g.globalAlpha = 1;
      return;
    }
    if (e.type === "pausa") {
      // pausa de semínima: zigue-zague
      g.strokeStyle = fill;
      g.lineWidth = Math.max(2, r * 0.35);
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(x - r * 0.3, y - r * 1.1);
      g.lineTo(x + r * 0.35, y - r * 0.35);
      g.lineTo(x - r * 0.3, y + r * 0.2);
      g.lineTo(x + r * 0.35, y + r * 0.75);
      g.quadraticCurveTo(x - r * 0.6, y + r * 0.6, x - r * 0.1, y + r * 1.2);
      g.stroke();
      g.lineCap = "butt";
    } else if (e.type === "bemol") {
      g.strokeStyle = fill;
      g.lineWidth = Math.max(2, r * 0.22);
      g.beginPath();
      g.moveTo(x - r * 0.4, y - r * 1.4);
      g.lineTo(x - r * 0.4, y + r * 0.8);
      g.bezierCurveTo(x + r * 1.1, y + r * 0.2, x + r * 0.9, y - r * 0.6, x - r * 0.4, y - r * 0.1);
      g.stroke();
      g.fillStyle = rgba(col, 0.25);
      g.fill();
    } else {
      const hollow = e.type === "minima" || e.type === "semibreve";
      // haste
      if (e.type !== "semibreve") {
        g.strokeStyle = fill;
        g.lineWidth = Math.max(1.5, r * 0.16);
        g.beginPath();
        g.moveTo(x + r * 0.85, y - r * 0.15);
        g.lineTo(x + r * 0.85, y - r * 2.4);
        g.stroke();
        if (e.type === "colcheia") {
          g.beginPath();
          g.moveTo(x + r * 0.85, y - r * 2.4);
          g.quadraticCurveTo(x + r * 1.9, y - r * 1.7, x + r * 1.5, y - r * 0.9);
          g.stroke();
        }
      }
      // cabeça da nota
      g.save();
      g.translate(x, y);
      g.rotate(-0.35);
      g.beginPath();
      g.ellipse(0, 0, r, r * 0.74, 0, 0, TAU);
      if (hollow) {
        g.fillStyle = "#120a1e";
        g.fill();
        g.strokeStyle = fill;
        g.lineWidth = Math.max(2, r * 0.3);
        g.stroke();
      } else {
        g.fillStyle = fill;
        g.fill();
      }
      g.restore();
      if (e.type === "sustenido") {
        g.strokeStyle = "#1a1028";
        g.lineWidth = Math.max(1.5, r * 0.13);
        g.beginPath();
        g.moveTo(x - r * 0.25, y - r * 0.6);
        g.lineTo(x - r * 0.35, y + r * 0.6);
        g.moveTo(x + r * 0.25, y - r * 0.6);
        g.lineTo(x + r * 0.15, y + r * 0.6);
        g.moveTo(x - r * 0.6, y - r * 0.1);
        g.lineTo(x + r * 0.5, y - r * 0.25);
        g.moveTo(x - r * 0.6, y + r * 0.25);
        g.lineTo(x + r * 0.5, y + r * 0.1);
        g.stroke();
      }
    }
    // olhos zangados olhando para a Lyra
    if (e.type !== "pausa" && e.type !== "sustenido") {
      const d = Math.hypot(e.x, e.y) || 1;
      const lx = (-e.x / d) * r * 0.12;
      const ly = (-e.y / d) * r * 0.12;
      const ey = e.type === "bemol" ? y + r * 0.25 : y;
      const ex = e.type === "bemol" ? x + r * 0.2 : x;
      for (const s of [-1, 1]) {
        g.fillStyle = "#fff";
        g.beginPath();
        g.ellipse(ex + s * r * 0.33, ey, r * 0.2, r * 0.24, 0, 0, TAU);
        g.fill();
        g.fillStyle = "#14081e";
        g.beginPath();
        g.arc(ex + s * r * 0.33 + lx, ey + ly + r * 0.04, r * 0.11, 0, TAU);
        g.fill();
      }
      g.strokeStyle = "#14081e";
      g.lineWidth = Math.max(1, r * 0.1);
      g.beginPath();
      g.moveTo(ex - r * 0.55, ey - r * 0.38);
      g.lineTo(ex - r * 0.15, ey - r * 0.22);
      g.moveTo(ex + r * 0.55, ey - r * 0.38);
      g.lineTo(ex + r * 0.15, ey - r * 0.22);
      g.stroke();
    }
    // nome da nota
    if (e.deg >= 0 && run.enemies.length < 50) {
      g.font = `700 ${Math.max(10, Math.round(11 * S))}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "top";
      g.lineWidth = 3;
      g.strokeStyle = "rgba(10,5,20,0.85)";
      const name = degreeNote(run.key, e.deg);
      g.strokeText(name, x, y + r + 3);
      g.fillStyle = col;
      g.fillText(name, x, y + r + 3);
    }
    if (e.hp < e.maxHp) {
      const w = Math.max(16, r * 2.2);
      g.fillStyle = "rgba(0,0,0,0.6)";
      g.fillRect(x - w / 2, y - r * (e.type === "semibreve" ? 1.2 : 2.6) - 6, w, 3);
      g.fillStyle = col;
      g.fillRect(x - w / 2, y - r * (e.type === "semibreve" ? 1.2 : 2.6) - 6, w * clamp(e.hp / e.maxHp, 0, 1), 3);
    }
    g.globalAlpha = 1;
  }

  private drawBoss(g: CanvasRenderingContext2D, run: Run): void {
    const e = run.enemies.find((x) => x.type === "tritono");
    if (!e) return;
    const S = this.s;
    const x = this.sx(e.x);
    const y = this.sy(e.y);
    const r = e.r * S * clamp(e.age * 2, 0, 1) * (1 + 0.06 * run.pulse());
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.6;
    g.drawImage(glow("#ff3a6a"), x - r * 3, y - r * 3, r * 6, r * 6);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    const fill = e.flash > 0 ? "#fff" : "#2a0a1e";
    // duas cabeças de nota fundidas (o intervalo de trítono)
    for (const [ox, oy, rot] of [
      [-0.45, 0.2, -0.4],
      [0.45, -0.25, -0.3],
    ]) {
      g.save();
      g.translate(x + ox * r, y + oy * r);
      g.rotate(rot);
      g.beginPath();
      g.ellipse(0, 0, r * 0.75, r * 0.55, 0, 0, TAU);
      g.fillStyle = fill;
      g.fill();
      g.strokeStyle = "#ff3a6a";
      g.lineWidth = 3;
      g.stroke();
      g.restore();
    }
    // chifres
    g.fillStyle = "#ff3a6a";
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(x + s * r * 0.3, y - r * 0.5);
      g.quadraticCurveTo(x + s * r * 0.9, y - r * 1.1, x + s * r * 0.75, y - r * 1.4);
      g.quadraticCurveTo(x + s * r * 0.6, y - r * 0.9, x + s * r * 0.05, y - r * 0.55);
      g.fill();
    }
    // olhos
    for (const s of [-1, 1]) {
      g.fillStyle = "#ffd84a";
      g.beginPath();
      g.ellipse(x + s * r * 0.3, y - r * 0.05, r * 0.14, r * 0.09, s * 0.4, 0, TAU);
      g.fill();
    }
    g.font = `700 ${Math.round(r * 0.5)}px ${SERIF}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#ff8aa8";
    g.fillText("♯ ♭", x, y + r * 0.45);
    // barra de vida do chefe
    const bw = Math.min(this.w * 0.5, 420);
    const bx = this.w / 2 - bw / 2;
    const by = this.h - 34;
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.fillRect(bx, by, bw, 8);
    g.fillStyle = "#ff3a6a";
    g.fillRect(bx, by, bw * clamp(e.hp / e.maxHp, 0, 1), 8);
    g.font = "800 12px system-ui, sans-serif";
    g.fillStyle = "#ffd0dc";
    g.textBaseline = "bottom";
    g.fillText("TRÍTONO — o diabo na música", this.w / 2, by - 3);
  }

  private drawRings(g: CanvasRenderingContext2D, run: Run): void {
    for (const r of run.rings) {
      g.strokeStyle = r.hit ? "rgba(255,80,120,0.25)" : "rgba(255,60,110,0.75)";
      g.lineWidth = 4;
      g.setLineDash([10, 8]);
      g.beginPath();
      g.arc(this.sx(r.x), this.sy(r.y), r.r * this.s, 0, TAU);
      g.stroke();
      g.setLineDash([]);
    }
  }

  private drawTrailSegs(g: CanvasRenderingContext2D, run: Run): void {
    if (!run.trail.length) return;
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    for (const s of run.trail) {
      g.strokeStyle = `rgba(255,210,120,${0.5 * (s.life / s.max)})`;
      g.lineWidth = 6 * this.s;
      g.beginPath();
      g.moveTo(this.sx(s.x1), this.sy(s.y1));
      g.lineTo(this.sx(s.x2), this.sy(s.y2));
      g.stroke();
    }
    g.lineCap = "butt";
    g.globalCompositeOperation = "source-over";
  }

  private drawOstinato(g: CanvasRenderingContext2D, run: Run): void {
    if (!run.m("ostinato")) return;
    g.font = `${Math.round(18 * this.s)}px ${SERIF}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const o of run.ostinatoOrbs()) {
      const x = this.sx(o.x);
      const y = this.sy(o.y);
      g.globalCompositeOperation = "lighter";
      g.drawImage(glow("#ffd84a"), x - 14 * this.s, y - 14 * this.s, 28 * this.s, 28 * this.s);
      g.globalCompositeOperation = "source-over";
      g.fillStyle = "#fff2c0";
      g.fillText("♪", x, y);
    }
  }

  private drawShots(g: CanvasRenderingContext2D, run: Run): void {
    g.font = `700 ${Math.round(16 * this.s)}px ${SERIF}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const s of run.shots) {
      const x = this.sx(s.x) + Math.sin(this.time * 20 + s.x) * 1.5;
      const y = this.sy(s.y);
      g.globalCompositeOperation = "lighter";
      g.drawImage(glow("#9a4aff"), x - 12 * this.s, y - 12 * this.s, 24 * this.s, 24 * this.s);
      g.globalCompositeOperation = "source-over";
      g.fillStyle = "#e0c0ff";
      g.fillText("♭", x, y);
    }
    g.globalCompositeOperation = "lighter";
    for (const b of run.bullets) {
      const x = this.sx(b.x);
      const y = this.sy(b.y);
      g.drawImage(glow("#ffffff"), x - 8 * this.s, y - 8 * this.s, 16 * this.s, 16 * this.s);
    }
    g.globalCompositeOperation = "source-over";
  }

  /** rastro da batuta: fita dourada que afina na ponta */
  private drawBaton(g: CanvasRenderingContext2D, run: Run, dt: number, visible: boolean): void {
    const c = run.cursor;
    const now = this.time;
    if (c.active && visible) this.trail.push({ x: this.sx(c.x), y: this.sy(c.y), t: now });
    else this.trail.length = 0;
    while (this.trail.length && now - this.trail[0].t > 0.16) this.trail.shift();
    void dt;
    const onBeat = run.onBeat();
    const col = run.tired ? "150,150,170" : onBeat ? "255,240,200" : "255,200,110";
    const T = this.trail;
    if (T.length > 1) {
      g.globalCompositeOperation = "lighter";
      g.lineCap = "round";
      for (let i = 1; i < T.length; i++) {
        const k = i / T.length;
        g.strokeStyle = `rgba(${col},${0.15 + 0.6 * k})`;
        g.lineWidth = (2 + 9 * k) * Math.max(0.8, this.s);
        g.beginPath();
        g.moveTo(T[i - 1].x, T[i - 1].y);
        g.lineTo(T[i].x, T[i].y);
        g.stroke();
      }
      g.lineCap = "butt";
      g.globalCompositeOperation = "source-over";
    }
    if (!visible) return;
    const x = this.sx(c.x);
    const y = this.sy(c.y);
    g.globalCompositeOperation = "lighter";
    const gs = onBeat ? 22 : 14;
    g.drawImage(glow(run.tired ? "#8080a0" : "#ffd88a"), x - gs, y - gs, gs * 2, gs * 2);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = run.tired ? "#9a9ab0" : "#fff";
    g.beginPath();
    g.arc(x, y, 3, 0, TAU);
    g.fill();
    // fôlego em arco em volta da batuta
    const f = run.stamina / run.staminaMax;
    if (f < 0.999) {
      g.lineWidth = 3;
      g.strokeStyle = "rgba(0,0,0,0.5)";
      g.beginPath();
      g.arc(x, y, 15, 0, TAU);
      g.stroke();
      g.strokeStyle = run.tired ? "#ff5d73" : f < 0.35 ? "#ffb04a" : "#6ef29a";
      g.beginPath();
      g.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + TAU * f);
      g.stroke();
    }
  }

  private drawFx(g: CanvasRenderingContext2D, dt: number): void {
    const S = this.s;
    g.globalCompositeOperation = "lighter";
    for (const p of this.parts) {
      p.life -= dt;
      if (p.home) {
        // voa até o contador
        const tx = (this.home.x - this.cx) / S;
        const ty = (this.home.y - this.cy) / S;
        const age = p.max - p.life;
        if (age > 0.35) {
          const k = Math.min(1, (age - 0.35) * 3.5);
          p.vx += ((tx - p.x) * 9 - p.vx) * k * dt * 6;
          p.vy += ((ty - p.y) * 9 - p.vy) * k * dt * 6;
        }
        if (Math.hypot(tx - p.x, ty - p.y) < 14) p.life = 0;
      } else {
        p.vx *= 1 - 3 * dt;
        p.vy *= 1 - 3 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = clamp(p.life / p.max, 0, 1);
      const x = this.sx(p.x);
      const y = this.sy(p.y);
      if (p.glyph) {
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = p.home ? 1 : k;
        g.font = `${Math.round(p.size * Math.max(0.9, S))}px ${SERIF}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = p.color;
        g.fillText(p.glyph, x, y);
        g.globalAlpha = 1;
        g.globalCompositeOperation = "lighter";
      } else {
        g.fillStyle = rgba(p.color, k);
        const r = p.size * S * (0.5 + k * 0.5);
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const w of this.waves) {
      w.life -= dt;
      const k = 1 - clamp(w.life / w.max, 0, 1);
      g.strokeStyle = rgba(w.color, (1 - k) * 0.8);
      g.lineWidth = w.width * (1 - k) + 0.5;
      g.beginPath();
      g.arc(this.sx(w.x), this.sy(w.y), Math.max(0.5, (w.r0 + (w.r1 - w.r0) * (1 - (1 - k) * (1 - k))) * S), 0, TAU);
      g.stroke();
    }
    this.waves = this.waves.filter((w) => w.life > 0);
    g.globalCompositeOperation = "source-over";
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= (t.big ? 14 : 30) * dt;
      const k = clamp(t.life / t.max, 0, 1);
      g.globalAlpha = Math.min(1, k * 2.5);
      const sz = Math.round(t.size * Math.max(0.9, S) * (t.big ? 1 + (1 - k) * 0.1 : 1));
      g.font = t.big ? `italic 700 ${sz}px ${SERIF}` : `800 ${sz}px system-ui, sans-serif`;
      g.lineWidth = 4;
      g.strokeStyle = "rgba(10,4,20,0.8)";
      g.strokeText(t.s, this.sx(t.x), this.sy(t.y));
      g.fillStyle = t.color;
      g.fillText(t.s, this.sx(t.x), this.sy(t.y));
    }
    g.globalAlpha = 1;
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  private drawMarker(g: CanvasRenderingContext2D, m: Marker): void {
    const x = this.sx(m.x);
    const y = this.sy(m.y);
    const r = m.r * this.s;
    const k = (Math.sin(this.time * 6) + 1) / 2;
    g.strokeStyle = `rgba(255,216,74,${0.5 + k * 0.5})`;
    g.lineWidth = 2.5;
    g.setLineDash([6, 5]);
    g.lineDashOffset = -this.time * 24;
    g.beginPath();
    g.arc(x, y, r + k * 6, 0, TAU);
    g.stroke();
    g.setLineDash([]);
    if (m.label) {
      g.font = "800 14px system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "bottom";
      g.lineWidth = 4;
      g.strokeStyle = "rgba(0,0,0,0.8)";
      g.strokeText(m.label, x, y - r - 12);
      g.fillStyle = "#ffd84a";
      g.fillText(m.label, x, y - r - 12);
    }
  }
}

