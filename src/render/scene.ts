import { fmt } from "../core/format";
import { TAU, clamp } from "../core/math";
import { BAL, ENEMIES, SATS } from "../data/content";
import { satStats, type Enemy, type Run, type Sat, type SimEvent } from "../game/sim";
import { Planet, asteroidSprite, glow, hexA, renderBackground } from "./sprites";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}
interface Wave {
  x: number;
  y: number;
  r0: number;
  r1: number;
  life: number;
  max: number;
  color: string;
  width: number;
}
interface Text {
  x: number;
  y: number;
  s: string;
  life: number;
  max: number;
  color: string;
  size: number;
}
interface DiskP {
  a: number;
  r: number;
  sp: number;
  hue: number;
}

export interface Marker {
  x: number;
  y: number;
  r: number;
  label?: string;
}

export interface ViewState {
  build: boolean;
  sel: { ring: number; slot: number } | null;
  marker: Marker | null;
}

/** Desenha a partida: espaço curvo, núcleo, anéis, inimigos e o buraco negro. */
export class Scene {
  w = 1;
  h = 1;
  dpr = 1;
  s = 1;
  cx = 0;
  cy = 0;
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private planet: Planet | null = null;
  private astCache = new Map<number, HTMLCanvasElement>();
  private parts: Particle[] = [];
  private waves: Wave[] = [];
  private texts: Text[] = [];
  private disk: DiskP[] = [];
  private shake = 0;
  private time = 0;
  private coreRed = 0;
  private seed = 1 + Math.floor(Math.random() * 9999);

  constructor(readonly cv: HTMLCanvasElement) {
    this.ctx = cv.getContext("2d")!;
    for (let i = 0; i < 110; i++) this.disk.push({ a: Math.random() * TAU, r: 1.35 + Math.pow(Math.random(), 1.6) * 2.2, sp: 0.8 + Math.random() * 0.5, hue: Math.random() });
  }

  /** escala: a menor dimensão da tela mostra ~540 unidades do mundo */
  resize(w: number, h: number): { hw: number; hh: number } {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.cv.width = Math.round(w * this.dpr);
    this.cv.height = Math.round(h * this.dpr);
    this.s = Math.min(w, h) / 540;
    this.cx = w / 2;
    this.cy = h / 2;
    this.bg = renderBackground(w, h, this.dpr, this.seed);
    this.planet = new Planet(Math.ceil(BAL.coreR * this.s * this.dpr * 2), this.seed);
    this.astCache.clear();
    return { hw: w / 2 / this.s, hh: h / 2 / this.s };
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.cx) / this.s, y: (sy - this.cy) / this.s };
  }

  toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.cx + x * this.s, y: this.cy + y * this.s };
  }

  // ------------------------------------------------------------ efeitos
  consume(events: SimEvent[]): void {
    for (const e of events) {
      switch (e.k) {
        case "impact": {
          const n = clamp(Math.round(e.power / 40), 3, 16);
          for (let i = 0; i < n; i++) this.spark(e.x, e.y, e.power * 0.5, i % 3 ? "#ffd8a0" : "#ffffff", 0.35);
          this.waves.push({ x: e.x, y: e.y, r0: 2, r1: 10 + e.power * 0.06, life: 0.3, max: 0.3, color: "#ffe0b0", width: 2 });
          this.shake = Math.max(this.shake, clamp((e.power - 150) / 60, 0, 6));
          break;
        }
        case "kill": {
          const d = ENEMIES[e.type];
          const n = e.type === "leviathan" ? 60 : 14;
          for (let i = 0; i < n; i++) this.spark(e.x, e.y, e.type === "leviathan" ? 260 : 150, i % 2 ? d.color : "#ffffff", 0.6);
          this.waves.push({ x: e.x, y: e.y, r0: d.r * 0.5, r1: d.r * 3, life: 0.4, max: 0.4, color: d.color, width: 3 });
          if (e.combo >= 3) this.text(e.x + 14, e.y - 26, `×${e.combo}`, "#ffd84a", 13 + Math.min(10, e.combo));
          if (e.cause === "impact" && Math.random() < 0.5) this.text(e.x - 10, e.y + 10, "ESMAGADO", "#ffb070", 10);
          if (e.type === "leviathan") this.shake = 14;
          break;
        }
        case "dmg":
          if (this.texts.length < 50) this.text(e.x + (Math.random() - 0.5) * 8, e.y, fmt(e.n), e.big ? "#ffe27a" : "#ffffff", e.big ? 14 : 11);
          break;
        case "core":
          this.coreRed = 0.5;
          this.shake = Math.max(this.shake, 8);
          this.waves.push({ x: e.x, y: e.y, r0: 4, r1: 40, life: 0.5, max: 0.5, color: "#ff4a5a", width: 4 });
          for (let i = 0; i < 18; i++) this.spark(e.x, e.y, 180, "#ff7a6a", 0.5);
          break;
        case "pulse":
          this.waves.push({ x: e.x, y: e.y, r0: 10, r1: e.r, life: 0.45, max: 0.45, color: "#9ad8ff", width: 6 });
          this.waves.push({ x: e.x, y: e.y, r0: 4, r1: e.r * 0.7, life: 0.35, max: 0.35, color: "#ffffff", width: 2 });
          this.shake = Math.max(this.shake, 5);
          break;
        case "boom":
          this.waves.push({ x: e.x, y: e.y, r0: 4, r1: e.r, life: 0.35, max: 0.35, color: "#ffd84a", width: 5 });
          for (let i = 0; i < 22; i++) this.spark(e.x, e.y, 220, i % 2 ? "#ffd84a" : "#ff8a3a", 0.5);
          this.shake = Math.max(this.shake, 5);
          break;
        case "pickup":
          if (this.parts.length < 500) this.parts.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.25, max: 0.25, color: "#ffe9a0", size: 6 });
          break;
        case "shot":
          for (let i = 0; i < 3; i++) this.spark(e.x, e.y, 80, "#ffb04a", 0.2);
          break;
        case "swallow":
          this.waves.push({ x: e.x, y: e.y, r0: 8, r1: 1, life: 0.25, max: 0.25, color: "#c8a0ff", width: 2 });
          break;
        default:
          break;
      }
    }
  }

  private spark(x: number, y: number, sp: number, color: string, life: number): void {
    if (this.parts.length > 600) return;
    const a = Math.random() * TAU;
    const v = sp * (0.3 + Math.random() * 0.7);
    this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, color, size: 1.5 + Math.random() * 1.8 });
  }

  private text(x: number, y: number, s: string, color: string, size: number): void {
    this.texts.push({ x, y, s, life: 0.9, max: 0.9, color, size });
  }

  // ------------------------------------------------------------ quadro
  draw(run: Run, dt: number, view: ViewState): void {
    this.time += dt;
    const g = this.ctx;
    const dpr = this.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    const h = run.hole;
    const hs = this.toScreen(h.x, h.y);
    // fundo + lente gravitacional
    if (this.bg) {
      g.drawImage(this.bg, 0, 0, this.w, this.h);
      this.lens(g, hs.x, hs.y, h.H * this.s, h.strong);
    }
    this.shake = Math.max(0, this.shake - dt * 30);
    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    g.save();
    g.translate(sx, sy);
    this.grid(g, run);
    this.drawCore(g, run);
    this.drawRings(g, run, view);
    this.drawAsteroids(g, run);
    this.drawFrags(g, run);
    this.drawEnemies(g, run);
    this.drawSlugs(g, run);
    this.drawHole(g, run, dt);
    this.drawFx(g, dt);
    if (view.marker) this.drawMarker(g, view.marker);
    g.restore();
    if (this.coreRed > 0) {
      this.coreRed -= dt;
      const a = clamp(this.coreRed, 0, 0.5) * 0.6;
      const vg = g.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.3, this.w / 2, this.h / 2, Math.hypot(this.w, this.h) * 0.6);
      vg.addColorStop(0, "rgba(255,40,60,0)");
      vg.addColorStop(1, `rgba(255,40,60,${a})`);
      g.fillStyle = vg;
      g.fillRect(0, 0, this.w, this.h);
    }
    if (view.build) {
      g.fillStyle = "rgba(10,20,50,0.18)";
      g.fillRect(0, 0, this.w, this.h);
    }
  }

  /** anéis concêntricos do fundo ampliados e girados em volta do buraco: simula a lente */
  private lens(g: CanvasRenderingContext2D, x: number, y: number, H: number, strong: boolean): void {
    if (!this.bg) return;
    const layers: [number, number, number][] = [
      [4.6, 1.05, 0.03],
      [3.4, 1.12, 0.07],
      [2.5, 1.26, 0.14],
      [1.8, 1.55, 0.3],
      [1.35, 2.1, 0.6],
    ];
    const boost = strong ? 1.15 : 1;
    for (const [rr, sc, rot] of layers) {
      g.save();
      g.beginPath();
      g.arc(x, y, rr * H * boost, 0, TAU);
      g.clip();
      g.translate(x, y);
      g.rotate(rot * (strong ? 1.4 : 1) + Math.sin(this.time * 0.3) * 0.02);
      g.scale(sc, sc);
      g.translate(-x, -y);
      g.drawImage(this.bg, 0, 0, this.w, this.h);
      g.restore();
    }
    // escurece em volta do horizonte
    const R = H * 5;
    const gr = g.createRadialGradient(x, y, H * 0.9, x, y, R);
    gr.addColorStop(0, "rgba(0,0,0,0.9)");
    gr.addColorStop(0.18, "rgba(0,0,0,0.45)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, R, 0, TAU);
    g.fill();
  }

  /** grade do espaço-tempo afundando em direção ao buraco e ao núcleo */
  private grid(g: CanvasRenderingContext2D, run: Run): void {
    const h = run.hole;
    const step = 44;
    const hw = this.w / 2 / this.s + step;
    const hh = this.h / 2 / this.s + step;
    const G = (h.strong ? 2800 : 1200) * Math.sqrt(run.st.grav);
    const warp = (x: number, y: number): [number, number] => {
      let dx = h.x - x;
      let dy = h.y - y;
      let d = Math.hypot(dx, dy) || 1;
      let w = Math.min(d * 0.6, G / (d + 28));
      let px = x + (dx / d) * w;
      let py = y + (dy / d) * w;
      dx = -x;
      dy = -y;
      d = Math.hypot(dx, dy) || 1;
      w = Math.min(d * 0.25, 600 / (d + 50));
      px += (dx / d) * w;
      py += (dy / d) * w;
      return [this.cx + px * this.s, this.cy + py * this.s];
    };
    const hs = this.toScreen(h.x, h.y);
    const gr = g.createRadialGradient(hs.x, hs.y, 0, hs.x, hs.y, 320 * this.s);
    gr.addColorStop(0, h.strong ? "rgba(190,140,255,0.55)" : "rgba(150,130,255,0.32)");
    gr.addColorStop(1, "rgba(70,120,220,0.07)");
    g.strokeStyle = gr;
    g.lineWidth = 1;
    g.beginPath();
    const x0 = Math.floor(-hw / step) * step;
    const y0 = Math.floor(-hh / step) * step;
    for (let x = x0; x <= hw; x += step) {
      for (let y = y0, i = 0; y <= hh + 0.1; y += step / 2, i++) {
        const [px, py] = warp(x, y);
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
    }
    for (let y = y0; y <= hh; y += step) {
      for (let x = x0, i = 0; x <= hw + 0.1; x += step / 2, i++) {
        const [px, py] = warp(x, y);
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
    }
    g.stroke();
  }

  private drawCore(g: CanvasRenderingContext2D, run: Run): void {
    const R = BAL.coreR * this.s;
    const { x, y } = this.toScreen(0, 0);
    const hpf = run.core.hp / run.core.maxHp;
    const atm = hpf > 0.5 ? "#4ae0ff" : hpf > 0.25 ? "#ffb04a" : "#ff4a5a";
    g.globalCompositeOperation = "lighter";
    const gl = glow(atm);
    const S = R * (3.4 + (run.core.flash > 0 ? 1 : 0));
    g.globalAlpha = 0.55;
    g.drawImage(gl, x - S, y - S, S * 2, S * 2);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    if (this.planet) {
      const tint: [number, number, number] = hpf > 0.5 ? [90, 200, 255] : hpf > 0.25 ? [255, 170, 80] : [255, 70, 80];
      const img = this.planet.render(this.time * 0.12, tint);
      g.drawImage(img, x - R, y - R, R * 2, R * 2);
      if (run.core.flash > 0) {
        g.fillStyle = `rgba(255,60,60,${run.core.flash})`;
        g.beginPath();
        g.arc(x, y, R, 0, TAU);
        g.fill();
      }
    }
    g.strokeStyle = hexA(atm, 0.35);
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x, y, R + 1.5, 0, TAU);
    g.stroke();
    if (run.core.shield > 0) {
      g.strokeStyle = "rgba(140,220,255,0.8)";
      g.lineWidth = 3;
      g.setLineDash([6, 4]);
      g.beginPath();
      g.arc(x, y, R + 9, this.time, this.time + TAU);
      g.stroke();
      g.setLineDash([]);
    }
    // barra de vida em arco
    g.strokeStyle = "rgba(0,0,0,0.5)";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(x, y, R + 6, Math.PI * 0.75, Math.PI * 2.25);
    g.stroke();
    g.strokeStyle = atm;
    g.beginPath();
    g.arc(x, y, R + 6, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * hpf);
    g.stroke();
  }

  private drawRings(g: CanvasRenderingContext2D, run: Run, view: ViewState): void {
    const c = this.toScreen(0, 0);
    for (let ri = 0; ri < 3; ri++) {
      const ring = run.rings[ri];
      const open = ri < run.st.rings;
      const R = ring.r * this.s;
      const sel = ri === run.selRing && open;
      g.strokeStyle = open ? (sel ? "rgba(140,220,255,0.38)" : "rgba(120,170,255,0.18)") : "rgba(120,140,170,0.06)";
      g.lineWidth = sel ? 1.6 : 1;
      g.setLineDash(open ? [3, 6] : [2, 10]);
      g.lineDashOffset = -ring.angle * R;
      g.beginPath();
      g.arc(c.x, c.y, R, 0, TAU);
      g.stroke();
      g.setLineDash([]);
      if (!open) continue;
      ring.slots.forEach((s, i) => {
        const sp = run.slotPos(ri, i);
        const p = this.toScreen(sp.x, sp.y);
        const isSel = view.sel && view.sel.ring === ri && view.sel.slot === i;
        if (!s) {
          const rr = (view.build ? 9 : 3) * this.s;
          g.strokeStyle = isSel ? "#ffffff" : view.build ? "rgba(160,220,255,0.75)" : "rgba(160,200,255,0.3)";
          g.lineWidth = isSel ? 2.5 : 1.5;
          g.beginPath();
          g.arc(p.x, p.y, rr, 0, TAU);
          g.stroke();
          if (view.build) {
            g.beginPath();
            g.moveTo(p.x - rr * 0.5, p.y);
            g.lineTo(p.x + rr * 0.5, p.y);
            g.moveTo(p.x, p.y - rr * 0.5);
            g.lineTo(p.x, p.y + rr * 0.5);
            g.stroke();
          }
        } else this.drawSat(g, run, s, p.x, p.y, !!isSel, view.build);
      });
    }
  }

  private drawSat(g: CanvasRenderingContext2D, run: Run, s: Sat, x: number, y: number, sel: boolean, build: boolean): void {
    const d = SATS[s.type];
    const S = this.s;
    const r = 8 * S;
    const col = d.color;
    // campos
    if (s.type === "deflector") {
      const st = satStats("deflector", s.lvl, run.st) as { radius: number };
      const R = st.radius * S;
      g.fillStyle = hexA(col, 0.07 + s.pulse * 0.8);
      g.strokeStyle = hexA(col, 0.55 + s.pulse);
      g.lineWidth = 1.5;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + this.time * 0.4;
        const px = x + Math.cos(a) * R;
        const py = y + Math.sin(a) * R;
        if (k) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.closePath();
      g.fill();
      g.stroke();
    } else if (s.type === "stasis") {
      const st = satStats("stasis", s.lvl, run.st) as { radius: number };
      const R = st.radius * S;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, "rgba(154,140,255,0.16)");
      gr.addColorStop(1, "rgba(154,140,255,0.02)");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, R, 0, TAU);
      g.fill();
      g.strokeStyle = "rgba(154,140,255,0.35)";
      g.setLineDash([2, 5]);
      g.beginPath();
      g.arc(x, y, R, -this.time * 0.3, TAU - this.time * 0.3);
      g.stroke();
      g.setLineDash([]);
    }
    if (sel || build) {
      const st = satStats(s.type, s.lvl, run.st) as { range?: number; radius?: number; pull?: number };
      const R = (st.range ?? st.pull ?? st.radius ?? 0) * S;
      if (R && sel) {
        g.strokeStyle = hexA(col, 0.5);
        g.setLineDash([4, 4]);
        g.beginPath();
        g.arc(x, y, R, 0, TAU);
        g.stroke();
        g.setLineDash([]);
      }
    }
    // feixe do laser
    if (s.type === "laser" && s.firing) {
      const t = this.toScreen(s.tx, s.ty);
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = hexA(col, 0.3);
      g.lineWidth = (5 + Math.random() * 2) * S;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(t.x, t.y);
      g.stroke();
      g.strokeStyle = "#ffd0d4";
      g.lineWidth = 1.6 * S;
      g.stroke();
      g.drawImage(glow(col), t.x - 10 * S, t.y - 10 * S, 20 * S, 20 * S);
      g.globalCompositeOperation = "source-over";
    }
    g.globalCompositeOperation = "lighter";
    const gs = r * (2.6 + s.pulse * 4);
    g.drawImage(glow(col), x - gs, y - gs, gs * 2, gs * 2);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "#0b1020";
    g.strokeStyle = sel ? "#ffffff" : col;
    g.lineWidth = sel ? 2.5 : 1.8;
    const rest = s.type === "mine" && s.cd > 0;
    g.globalAlpha = rest ? 0.45 : 1;
    g.beginPath();
    if (s.type === "mine") {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU + this.time;
        const rr = k % 2 ? r * 0.55 : r;
        if (k) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath();
    } else if (s.type === "collector") {
      const a = this.time * 1.5;
      for (let k = 0; k < 4; k++) {
        const aa = a + (k / 4) * TAU;
        if (k) g.lineTo(x + Math.cos(aa) * r, y + Math.sin(aa) * r);
        else g.moveTo(x + Math.cos(aa) * r, y + Math.sin(aa) * r);
      }
      g.closePath();
    } else g.arc(x, y, r * 0.85, 0, TAU);
    g.fill();
    g.stroke();
    g.globalAlpha = 1;
    // detalhe por tipo
    g.strokeStyle = col;
    g.fillStyle = col;
    if (s.type === "laser" || s.type === "cannon") {
      const t = this.toScreen(s.tx, s.ty);
      const a = s.firing || s.type === "cannon" ? Math.atan2(t.y - y, t.x - x) : this.time;
      g.lineWidth = (s.type === "cannon" ? 3.2 : 2) * S;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
      g.stroke();
      g.beginPath();
      g.arc(x, y, r * 0.3, 0, TAU);
      g.fill();
    } else if (s.type === "stasis") {
      g.lineWidth = 1.4;
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI + this.time * 0.5;
        g.moveTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6);
        g.lineTo(x - Math.cos(a) * r * 0.6, y - Math.sin(a) * r * 0.6);
      }
      g.stroke();
    } else if (s.type === "deflector") {
      g.beginPath();
      g.arc(x, y, r * 0.35, 0, TAU);
      g.fill();
    } else if (s.type === "collector") {
      g.beginPath();
      g.arc(x, y, r * 0.25, 0, TAU);
      g.fill();
    }
    // nível
    for (let k = 0; k < s.lvl; k++) {
      const a = -Math.PI / 2 + (k - (s.lvl - 1) / 2) * 0.45;
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45, 1.6 * Math.max(1, S), 0, TAU);
      g.fill();
    }
  }

  private drawAsteroids(g: CanvasRenderingContext2D, run: Run): void {
    for (const a of run.asteroids) {
      let sp = this.astCache.get(a.seed);
      if (!sp) this.astCache.set(a.seed, (sp = asteroidSprite(a.r * this.s * this.dpr, a.seed)));
      const p = this.toScreen(a.x, a.y);
      const S = (sp.width / this.dpr);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(a.rot);
      g.drawImage(sp, -S / 2, -S / 2, S, S);
      g.restore();
    }
  }

  private drawFrags(g: CanvasRenderingContext2D, run: Run): void {
    g.globalCompositeOperation = "lighter";
    const gl = glow("#ffd86a");
    for (const f of run.frags) {
      if (f.life < 2.5 && Math.floor(f.life * 8) % 2 === 0) continue;
      const p = this.toScreen(f.x, f.y);
      const r = (2.6 + Math.min(2.5, f.v * 0.4)) * this.s;
      g.drawImage(gl, p.x - r * 3, p.y - r * 3, r * 6, r * 6);
      const a = this.time * 4 + f.x * 0.1;
      g.fillStyle = "#fff4c0";
      g.beginPath();
      g.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      g.lineTo(p.x + Math.cos(a + 1.57) * r * 0.55, p.y + Math.sin(a + 1.57) * r * 0.55);
      g.lineTo(p.x + Math.cos(a + 3.14) * r, p.y + Math.sin(a + 3.14) * r);
      g.lineTo(p.x + Math.cos(a + 4.71) * r * 0.55, p.y + Math.sin(a + 4.71) * r * 0.55);
      g.closePath();
      g.fill();
    }
    g.globalCompositeOperation = "source-over";
  }

  private drawEnemies(g: CanvasRenderingContext2D, run: Run): void {
    const S = this.s;
    // rastros
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    for (const e of run.enemies) {
      const t = e.trail;
      const n = t.length / 2;
      if (n < 2) continue;
      const col = ENEMIES[e.type].color;
      const wide = e.type === "comet" ? 2.2 : 1;
      for (let i = 1; i < n; i++) {
        const k = i / n;
        g.strokeStyle = hexA(col, 0.32 * k);
        g.lineWidth = Math.max(1, e.r * S * 0.7 * k * wide);
        g.beginPath();
        g.moveTo(this.cx + t[i * 2 - 2] * S, this.cy + t[i * 2 - 1] * S);
        g.lineTo(this.cx + t[i * 2] * S, this.cy + t[i * 2 + 1] * S);
        g.stroke();
      }
      g.strokeStyle = hexA(col, 0.32);
      g.beginPath();
      g.moveTo(this.cx + t[t.length - 2] * S, this.cy + t[t.length - 1] * S);
      g.lineTo(this.cx + e.x * S, this.cy + e.y * S);
      g.stroke();
    }
    for (const e of run.enemies) {
      const p = this.toScreen(e.x, e.y);
      const col = ENEMIES[e.type].color;
      const gs = e.r * S * (e.type === "comet" ? 4.5 : 3);
      g.globalAlpha = e.type === "antimatter" ? 0.5 + 0.3 * Math.sin(this.time * 6 + e.id) : 0.75;
      g.drawImage(glow(col), p.x - gs, p.y - gs, gs * 2, gs * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    const h = run.hole;
    for (const e of run.enemies) this.drawEnemy(g, e, h.x, h.y, h.H);
    g.lineCap = "butt";
  }

  private drawEnemy(g: CanvasRenderingContext2D, e: Enemy, hx: number, hy: number, H: number): void {
    const S = this.s;
    const p = this.toScreen(e.x, e.y);
    const r = e.r * S;
    const col = e.flash > 0 ? "#ffffff" : ENEMIES[e.type].color;
    g.save();
    g.translate(p.x, p.y);
    // espaguetificação perto do horizonte
    const dh = Math.hypot(hx - e.x, hy - e.y);
    if (e.gres > 0 && dh < H * 3.5) {
      const k = clamp(1 - dh / (H * 3.5), 0, 1) * 0.8;
      g.rotate(Math.atan2(hy - e.y, hx - e.x));
      g.scale(1 + k, 1 - k * 0.55);
      g.rotate(-Math.atan2(hy - e.y, hx - e.x));
    }
    const heading = Math.atan2(e.vy, e.vx);
    g.fillStyle = "#0a0d1c";
    g.strokeStyle = col;
    g.lineWidth = Math.max(1.4, 1.8 * S);
    g.lineJoin = "round";
    switch (e.type) {
      case "wanderer":
      case "shard": {
        g.rotate(heading);
        g.beginPath();
        g.moveTo(r * 1.2, 0);
        g.lineTo(-r * 0.8, r * 0.8);
        g.lineTo(-r * 0.4, 0);
        g.lineTo(-r * 0.8, -r * 0.8);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = col;
        g.beginPath();
        g.arc(r * 0.1, 0, r * 0.22, 0, TAU);
        g.fill();
        break;
      }
      case "drone": {
        g.rotate(this.time * 3 + e.id);
        g.beginPath();
        g.moveTo(r, 0);
        g.lineTo(0, r);
        g.lineTo(-r, 0);
        g.lineTo(0, -r);
        g.closePath();
        g.fill();
        g.stroke();
        break;
      }
      case "armored": {
        g.rotate(heading);
        g.lineWidth = Math.max(2, 2.6 * S);
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU;
          if (k) g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          else g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.closePath();
        g.fill();
        g.stroke();
        g.lineWidth = Math.max(1, 1.2 * S);
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU + 0.52;
          if (k) g.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
          else g.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
        }
        g.closePath();
        g.stroke();
        break;
      }
      case "comet": {
        g.fillStyle = col;
        g.beginPath();
        g.arc(0, 0, r, 0, TAU);
        g.fill();
        g.fillStyle = "#bfe8ff";
        g.beginPath();
        g.arc(-r * 0.2, -r * 0.2, r * 0.5, 0, TAU);
        g.fill();
        break;
      }
      case "splitter": {
        g.rotate(this.time * 1.4 + e.id);
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * TAU;
          g.beginPath();
          g.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.55, 0, TAU);
          g.fill();
          g.stroke();
        }
        break;
      }
      case "antimatter": {
        g.lineWidth = Math.max(2, 2.4 * S);
        g.beginPath();
        g.arc(0, 0, r, 0, TAU);
        g.fill();
        g.stroke();
        g.setLineDash([2, 3]);
        g.beginPath();
        g.arc(0, 0, r * 0.6, this.time * -2, this.time * -2 + TAU);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = "#000";
        g.beginPath();
        g.arc(0, 0, r * 0.3, 0, TAU);
        g.fill();
        break;
      }
      case "leviathan": {
        g.rotate(heading);
        g.lineWidth = Math.max(2.5, 3 * S);
        g.beginPath();
        for (let k = 0; k < 20; k++) {
          const a = (k / 20) * TAU;
          const rr = k % 2 ? r * 0.82 : r * (1 + 0.06 * Math.sin(this.time * 4 + k));
          if (k) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = col;
        g.beginPath();
        g.arc(r * 0.35, 0, r * 0.22, 0, TAU);
        g.fill();
        g.fillStyle = "#fff";
        g.beginPath();
        g.arc(r * 0.42, 0, r * 0.08, 0, TAU);
        g.fill();
        break;
      }
    }
    g.restore();
    if (e.hp < e.maxHp) {
      const w = Math.max(14, e.r * S * 2.2);
      const y = p.y - e.r * S - 7;
      g.fillStyle = "rgba(0,0,0,0.6)";
      g.fillRect(p.x - w / 2, y, w, 3);
      g.fillStyle = e.type === "leviathan" ? "#ff4a5a" : "#7affb0";
      g.fillRect(p.x - w / 2, y, w * clamp(e.hp / e.maxHp, 0, 1), 3);
    }
  }

  private drawSlugs(g: CanvasRenderingContext2D, run: Run): void {
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    for (const s of run.slugs) {
      const p = this.toScreen(s.x, s.y);
      g.strokeStyle = "rgba(255,170,80,0.7)";
      g.lineWidth = 3 * this.s;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - s.vx * 0.03 * this.s, p.y - s.vy * 0.03 * this.s);
      g.stroke();
      g.drawImage(glow("#ffb04a"), p.x - 8 * this.s, p.y - 8 * this.s, 16 * this.s, 16 * this.s);
    }
    g.lineCap = "butt";
    g.globalCompositeOperation = "source-over";
  }

  private drawHole(g: CanvasRenderingContext2D, run: Run, dt: number): void {
    const h = run.hole;
    const { x, y } = this.toScreen(h.x, h.y);
    const H = h.H * this.s;
    const strong = h.strong;
    const tilt = -0.35;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const spd = strong ? 2.2 : 1;
    for (const p of this.disk) p.a += (p.sp * spd * dt * 3) / Math.pow(p.r, 1.5);
    const diskHalf = (front: boolean) => {
      g.globalCompositeOperation = "lighter";
      g.lineCap = "round";
      for (const p of this.disk) {
        const sa = Math.sin(p.a);
        if (front !== sa > 0) continue;
        const rr = p.r * H * (strong ? 1.12 : 1);
        const seg = 0.32;
        const pts: [number, number][] = [];
        for (const a of [p.a - seg, p.a]) {
          const lx = Math.cos(a) * rr;
          const ly = Math.sin(a) * rr * 0.28;
          pts.push([x + lx * ct - ly * st, y + lx * st + ly * ct]);
        }
        const inner = 1 - (p.r - 1.35) / 2.2;
        const dop = 0.55 + 0.45 * Math.cos(p.a);
        const col = inner > 0.7 ? `rgba(255,240,210,${0.5 * dop})` : inner > 0.35 ? `rgba(255,170,90,${0.45 * dop})` : `rgba(190,110,255,${0.35 * dop})`;
        g.strokeStyle = col;
        g.lineWidth = Math.max(1, H * (0.1 + inner * 0.12));
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        g.lineTo(pts[1][0], pts[1][1]);
        g.stroke();
      }
      g.lineCap = "butt";
      g.globalCompositeOperation = "source-over";
    };
    // alcance da gravidade
    if (strong) {
      const R = BAL.gravRange * run.st.reach * this.s;
      for (let k = 0; k < 3; k++) {
        const ph = ((this.time * 0.9 + k / 3) % 1 + 1) % 1;
        const rr = R * (1 - ph) + H * ph;
        g.strokeStyle = `rgba(190,150,255,${0.25 * ph})`;
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(x, y, rr, 0, TAU);
        g.stroke();
      }
    }
    g.globalCompositeOperation = "lighter";
    const gs = H * (strong ? 7 : 5.5);
    g.globalAlpha = strong ? 0.5 : 0.32;
    g.drawImage(glow("#b07aff"), x - gs, y - gs, gs * 2, gs * 2);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    diskHalf(false);
    g.fillStyle = "#000";
    g.beginPath();
    g.arc(x, y, H, 0, TAU);
    g.fill();
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = strong ? "rgba(255,230,200,0.95)" : "rgba(255,220,190,0.7)";
    g.lineWidth = Math.max(1.2, H * 0.12);
    g.beginPath();
    g.arc(x, y, H * 1.08, 0, TAU);
    g.stroke();
    g.strokeStyle = "rgba(255,160,90,0.25)";
    g.lineWidth = Math.max(2, H * 0.4);
    g.beginPath();
    g.arc(x, y, H * 1.25, 0, TAU);
    g.stroke();
    g.globalCompositeOperation = "source-over";
    diskHalf(true);
    // energia em arco
    const ef = h.energy / run.st.energyMax;
    if (ef < 0.999) {
      g.strokeStyle = h.exhausted ? "rgba(255,90,100,0.8)" : "rgba(200,170,255,0.75)";
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(x, y, H * 3.4, -Math.PI / 2, -Math.PI / 2 + TAU * ef);
      g.stroke();
    }
  }

  private drawFx(g: CanvasRenderingContext2D, dt: number): void {
    const S = this.s;
    g.globalCompositeOperation = "lighter";
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 3 * dt;
      p.vy *= 1 - 3 * dt;
      const k = clamp(p.life / p.max, 0, 1);
      const sp = this.toScreen(p.x, p.y);
      g.fillStyle = hexA(p.color.length === 7 ? p.color : "#ffffff", k);
      const r = p.size * S * (0.5 + k * 0.5);
      g.fillRect(sp.x - r, sp.y - r, r * 2, r * 2);
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const w of this.waves) {
      w.life -= dt;
      const k = 1 - clamp(w.life / w.max, 0, 1);
      const sp = this.toScreen(w.x, w.y);
      g.strokeStyle = hexA(w.color, 1 - k);
      g.lineWidth = w.width * (1 - k) + 0.5;
      g.beginPath();
      g.arc(sp.x, sp.y, Math.max(0.5, (w.r0 + (w.r1 - w.r0) * (1 - (1 - k) * (1 - k))) * S), 0, TAU);
      g.stroke();
    }
    this.waves = this.waves.filter((w) => w.life > 0);
    g.globalCompositeOperation = "source-over";
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 26 * dt;
      const k = clamp(t.life / t.max, 0, 1);
      const sp = this.toScreen(t.x, t.y);
      g.globalAlpha = Math.min(1, k * 2);
      g.font = `800 ${Math.round(t.size * Math.max(0.85, S))}px system-ui, sans-serif`;
      g.lineWidth = 3;
      g.strokeStyle = "rgba(0,0,0,0.7)";
      g.strokeText(t.s, sp.x, sp.y);
      g.fillStyle = t.color;
      g.fillText(t.s, sp.x, sp.y);
    }
    g.globalAlpha = 1;
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  private drawMarker(g: CanvasRenderingContext2D, m: Marker): void {
    const p = this.toScreen(m.x, m.y);
    const r = m.r * this.s;
    const k = (Math.sin(this.time * 5) + 1) / 2;
    g.strokeStyle = `rgba(255,216,74,${0.55 + k * 0.45})`;
    g.lineWidth = 2.5;
    g.setLineDash([6, 5]);
    g.lineDashOffset = -this.time * 20;
    g.beginPath();
    g.arc(p.x, p.y, r + k * 6, 0, TAU);
    g.stroke();
    g.setLineDash([]);
    if (m.label) {
      g.font = "800 14px system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "bottom";
      g.lineWidth = 4;
      g.strokeStyle = "rgba(0,0,0,0.8)";
      const ty = p.y - r - 12;
      g.strokeText(m.label, p.x, ty);
      g.fillStyle = "#ffd84a";
      g.fillText(m.label, p.x, ty);
    }
  }
}
