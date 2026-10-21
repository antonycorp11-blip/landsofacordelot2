import { TAU } from "../core/math";
import { fmt } from "../core/format";
import { LENSES, beamStats, islandAt } from "../data/content";
import { towerRange } from "../game/economy";
import { islandShape } from "../game/island";
import { beamAngles } from "../game/sim";
import type { GameState, Runtime } from "../game/state";
import { drawEnemy, drawEyes, drawLighthouse, drawTower } from "./draw";
import { ISLAND_EXTENT, paintIsland, seaTile } from "./islandArt";

const PMAX = 900;

/** Retângulo da tela onde o mar aparece (o painel ocupa o resto). */
export interface Viewport {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  t: number;
  color: string;
}

/** Desenha o jogo inteiro por código: mar, ilha, farol, criaturas, luz e clima. */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private dark: HTMLCanvasElement;
  private dctx: CanvasRenderingContext2D;
  private islandCanvas: HTMLCanvasElement | null = null;
  private islandKey = -1;
  private sea: CanvasPattern | null = null;
  private seaCanvas: HTMLCanvasElement | null = null;
  dpr = 1;
  w = 0;
  h = 0;
  view: Viewport = { x: 0, y: 0, w: 0, h: 0 };
  scale = 1;
  cx = 0;
  cy = 0;
  time = 0;
  selectedSlot: number | null = null;
  private towerAim = new Array(8).fill(-Math.PI / 2);
  private towerRing = new Array(8).fill(0);
  private texts: FloatText[] = [];
  // partículas (estrutura de arrays)
  private px = new Float32Array(PMAX);
  private py = new Float32Array(PMAX);
  private pvx = new Float32Array(PMAX);
  private pvy = new Float32Array(PMAX);
  private pl = new Float32Array(PMAX);
  private pm = new Float32Array(PMAX);
  private ps = new Float32Array(PMAX);
  private pc: string[] = new Array(PMAX).fill("#fff");
  private pcur = 0;
  private rings: { x: number; y: number; r: number; t: number; color: string }[] = [];
  private flash = 0;
  private nextBolt = 8;
  private drops = new Float32Array(260 * 3);
  private dust = new Float32Array(90 * 2);
  shake = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.dark = document.createElement("canvas");
    this.dctx = this.dark.getContext("2d")!;
    for (let i = 0; i < 260; i++) {
      this.drops[i * 3] = Math.random();
      this.drops[i * 3 + 1] = Math.random();
      this.drops[i * 3 + 2] = 0.6 + Math.random() * 0.8;
    }
    for (let i = 0; i < 90; i++) {
      this.dust[i * 2] = Math.random();
      this.dust[i * 2 + 1] = Math.random();
    }
  }

  resize(view: Viewport): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.w = w;
    this.h = h;
    this.view = view;
    this.scale = Math.min(view.w, view.h) / 560;
    this.cx = view.x + view.w / 2;
    this.cy = view.y + view.h / 2;
    this.dark.width = Math.max(1, Math.round(w / 2));
    this.dark.height = Math.max(1, Math.round(h / 2));
  }

  /** Raio (em unidades do mundo) até o canto mais distante da tela. */
  spawnRadius(): number {
    const corners = [
      [0, 0],
      [this.w, 0],
      [0, this.h],
      [this.w, this.h],
    ];
    void corners;
    // um pouco além da borda mais distante do mar visível: nos cantos elas emergem já na tela
    return Math.max(this.cx, this.w - this.cx, this.cy, this.h - this.cy) / this.scale + 24;
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.cx) / this.scale, y: (y - this.cy) / this.scale };
  }

  private spawnP(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string): void {
    const i = this.pcur;
    this.pcur = (this.pcur + 1) % PMAX;
    this.px[i] = x;
    this.py[i] = y;
    this.pvx[i] = vx;
    this.pvy[i] = vy;
    this.pl[i] = life;
    this.pm[i] = life;
    this.ps[i] = size;
    this.pc[i] = color;
  }

  /** Transforma eventos da simulação em efeitos visuais. */
  consume(rt: Runtime, s: GameState): void {
    for (const ev of rt.events) {
      switch (ev.type) {
        case "death": {
          const col = ev.kind === "jelly" ? "#e3a8ff" : ev.kind === "crab" ? "#d8664a" : ev.kind === "siren" ? "#e8e0c8" : ev.kind === "kraken" ? "#c45a8a" : "#7fd8c4";
          for (let k = 0; k < (ev.kind === "kraken" ? 60 : 14); k++) {
            const a = Math.random() * TAU;
            const sp = 20 + Math.random() * 60;
            this.spawnP(ev.x, ev.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.5 + Math.random() * 0.6, 1 + Math.random() * 2, col);
          }
          this.texts.push({ x: ev.x, y: ev.y, text: `+${fmt(ev.reward)}`, t: 0, color: "#ffd66a" });
          this.rings.push({ x: ev.x, y: ev.y, r: 14, t: 0, color: "rgba(200,230,240," });
          if (ev.kind === "kraken") this.shake = 0.6;
          break;
        }
        case "spawn":
          this.rings.push({ x: ev.x, y: ev.y, r: 26, t: 0, color: "rgba(170,210,230," });
          for (let k = 0; k < 8; k++) this.spawnP(ev.x, ev.y, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, 0.6, 1.5, "#a8d0e0");
          break;
        case "hit":
          for (let k = 0; k < 5; k++) this.spawnP(ev.x, ev.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0.3, 1.2, ev.color);
          break;
        case "core":
          this.shake = Math.max(this.shake, 0.35);
          this.rings.push({ x: ev.x, y: ev.y, r: 30, t: 0, color: "rgba(255,90,70," });
          this.texts.push({ x: ev.x, y: ev.y, text: `-${Math.round(ev.dmg)}`, t: 0, color: "#ff7a6a" });
          break;
        case "bell":
          this.rings.push({ x: ev.x, y: ev.y, r: ev.r, t: 0, color: "rgba(255,230,160," });
          this.towerRing[ev.slot] = 1;
          break;
        case "net":
          this.rings.push({ x: ev.x, y: ev.y, r: ev.r, t: 0, color: "rgba(220,200,150," });
          break;
        case "fire": {
          const sl = islandShape(s.seed + s.island).slots[ev.slot];
          const target = rt.projectiles[rt.projectiles.length - 1];
          if (target) this.towerAim[ev.slot] = Math.atan2(target.ty - sl.y, target.tx - sl.x);
          break;
        }
        case "wave":
          if (ev.boss) this.flash = 0.7;
          break;
        case "retreat":
          this.flash = 1;
          break;
      }
    }
    rt.events.length = 0;
  }

  render(s: GameState, rt: Runtime, dt: number): void {
    this.time += dt;
    const g = this.ctx;
    const isl = islandAt(s.island);
    const shape = islandShape(s.seed + s.island);
    const key = s.seed + s.island * 7919;
    if (this.islandKey !== key) {
      this.islandCanvas = paintIsland(shape, isl);
      this.islandKey = key;
      this.seaCanvas = seaTile(s.seed);
      this.sea = g.createPattern(this.seaCanvas, "repeat");
    }
    const bs = beamStats(s.beam);
    const lens = LENSES[s.lens];
    const angles = beamAngles(s, rt);
    const t = this.time;
    this.shake = Math.max(0, this.shake - dt);
    const shx = (Math.random() - 0.5) * this.shake * 8;
    const shy = (Math.random() - 0.5) * this.shake * 8;
    const d = this.dpr;
    const sc = this.scale;

    // --- mar ---
    g.setTransform(d, 0, 0, d, 0, 0);
    const [sr, sg, sb] = isl.sea;
    const deep = g.createRadialGradient(this.cx, this.cy, 40 * sc, this.cx, this.cy, Math.max(this.w, this.h) * 0.8);
    deep.addColorStop(0, `rgb(${sr + 30},${sg + 50},${sb + 46})`);
    deep.addColorStop(0.35, `rgb(${sr + 8},${sg + 14},${sb + 16})`);
    deep.addColorStop(1, `rgb(${sr * 0.4},${sg * 0.4},${sb * 0.5})`);
    g.fillStyle = deep;
    g.fillRect(0, 0, this.w, this.h);
    g.setTransform(d * sc, 0, 0, d * sc, d * (this.cx + shx), d * (this.cy + shy));
    if (this.sea) {
      for (const [spd, alpha, zoom, off] of [
        [9, 0.35, 1.6, 0],
        [-6, 0.25, 2.4, 70],
      ] as const) {
        const m = new DOMMatrix().translateSelf((t * spd + off) % 512, (t * spd * 0.6 + off) % 512).scaleSelf(zoom, zoom);
        this.sea.setTransform(m);
        g.globalAlpha = alpha;
        g.fillStyle = this.sea;
        const R = this.spawnRadius();
        g.fillRect(-R, -R, R * 2, R * 2);
      }
      g.globalAlpha = 1;
    }
    // espuma batendo na costa
    for (let k = 0; k < 3; k++) {
      const off = 4 + k * 5 + Math.sin(t * 1.3 + k * 2) * 2.5;
      g.strokeStyle = `rgba(220,240,245,${0.22 - k * 0.06})`;
      g.lineWidth = 2.2 - k * 0.5;
      g.beginPath();
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * TAU;
        const r = shape.radius(a) + off + Math.sin(a * 9 + t * 2 + k) * 1.4;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }

    // --- ilha ---
    if (this.islandCanvas) g.drawImage(this.islandCanvas, -ISLAND_EXTENT, -ISLAND_EXTENT, ISLAND_EXTENT * 2, ISLAND_EXTENT * 2);

    // alcance da pedra selecionada
    if (this.selectedSlot !== null) {
      const sl = shape.slots[this.selectedSlot];
      const tw = s.towers[this.selectedSlot];
      g.strokeStyle = "rgba(255,214,70,0.9)";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(sl.x, sl.y, 14 + Math.sin(t * 5) * 1, 0, TAU);
      g.stroke();
      if (tw) {
        g.setLineDash([5, 5]);
        g.strokeStyle = "rgba(255,214,70,0.45)";
        g.beginPath();
        g.arc(sl.x, sl.y, towerRange(tw.kind, tw.level), 0, TAU);
        g.stroke();
        g.setLineDash([]);
      }
    }
    // pedras livres
    shape.slots.forEach((sl, i) => {
      if (s.towers[i]) return;
      g.strokeStyle = `rgba(255,236,180,${0.25 + Math.sin(t * 2 + i) * 0.1})`;
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(sl.x - 4, sl.y);
      g.lineTo(sl.x + 4, sl.y);
      g.moveTo(sl.x, sl.y - 4);
      g.lineTo(sl.x, sl.y + 4);
      g.stroke();
    });

    // --- criaturas ---
    for (const e of rt.enemies) drawEnemy(g, e, t);

    // --- torres e farol ---
    s.towers.forEach((tw, i) => {
      if (!tw) return;
      const sl = shape.slots[i];
      this.towerRing[i] = Math.max(0, this.towerRing[i] - dt * 1.5);
      drawTower(g, tw.kind, tw.level, sl.x, sl.y, this.towerAim[i], t, rt.litTowers[i], this.towerRing[i]);
    });
    drawLighthouse(g, t, rt.beamAngle, lens.color);

    // projéteis
    for (const p of rt.projectiles) {
      if (p.kind === "harpoon") {
        const a = Math.atan2(p.ty - p.y, p.tx - p.x);
        g.strokeStyle = "#e8e2d4";
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(p.x - Math.cos(a) * 10, p.y - Math.sin(a) * 10);
        g.lineTo(p.x, p.y);
        g.stroke();
        g.strokeStyle = "rgba(220,210,190,0.35)";
        g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(p.sx, p.sy);
        g.lineTo(p.x, p.y);
        g.stroke();
      } else {
        const k = Math.min(1, p.t / p.dur);
        const lift = Math.sin(k * Math.PI) * 18;
        g.fillStyle = "rgba(0,0,0,0.3)";
        g.beginPath();
        g.arc(p.x, p.y, 4, 0, TAU);
        g.fill();
        g.strokeStyle = "#d8c89a";
        g.lineWidth = 0.8;
        const r = 4 + k * 6;
        g.beginPath();
        g.arc(p.x, p.y - lift, r, 0, TAU);
        g.moveTo(p.x - r, p.y - lift);
        g.lineTo(p.x + r, p.y - lift);
        g.moveTo(p.x, p.y - lift - r);
        g.lineTo(p.x, p.y - lift + r);
        g.stroke();
      }
    }

    // partículas físicas
    for (let i = 0; i < PMAX; i++) {
      if (this.pl[i] <= 0) continue;
      this.pl[i] -= dt;
      this.px[i] += this.pvx[i] * dt;
      this.py[i] += this.pvy[i] * dt;
      this.pvx[i] *= 0.93;
      this.pvy[i] *= 0.93;
      g.globalAlpha = Math.max(0, this.pl[i] / this.pm[i]);
      g.fillStyle = this.pc[i];
      g.fillRect(this.px[i] - this.ps[i] / 2, this.py[i] - this.ps[i] / 2, this.ps[i], this.ps[i]);
    }
    g.globalAlpha = 1;
    // anéis (redes, sino, mortes)
    this.rings = this.rings.filter((r) => (r.t += dt) < 0.6);
    for (const r of this.rings) {
      const k = r.t / 0.6;
      g.strokeStyle = `${r.color}${(1 - k) * 0.8})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(r.x, r.y, r.r * (0.4 + k * 0.6), 0, TAU);
      g.stroke();
    }

    // --- escuridão recortada pela luz ---
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) {
      this.flash = 0.9;
      this.nextBolt = 14 + Math.random() * 26;
    }
    const D = this.dctx;
    const k2 = 0.5;
    D.setTransform(1, 0, 0, 1, 0, 0);
    D.globalCompositeOperation = "source-over";
    D.clearRect(0, 0, this.dark.width, this.dark.height);
    D.fillStyle = `rgba(3,6,16,${0.84 - this.flash * 0.6})`;
    D.fillRect(0, 0, this.dark.width, this.dark.height);
    D.setTransform(k2 * sc, 0, 0, k2 * sc, k2 * (this.cx + shx), k2 * (this.cy + shy));
    D.globalCompositeOperation = "destination-out";
    const light = (x: number, y: number, r: number, a: number) => {
      const gr = D.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${a})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      D.fillStyle = gr;
      D.fillRect(x - r, y - r, r * 2, r * 2);
    };
    // luar suave na ilha
    light(0, 0, 210, 0.55);
    light(0, 0, 70, 1);
    for (const a of angles) {
      const gr = D.createRadialGradient(0, 0, 10, 0, 0, bs.reach * 1.08);
      gr.addColorStop(0, "rgba(0,0,0,1)");
      gr.addColorStop(0.75, "rgba(0,0,0,0.9)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      D.fillStyle = gr;
      D.beginPath();
      D.moveTo(0, 0);
      D.arc(0, 0, bs.reach * 1.08, a - bs.halfAngle * 1.15, a + bs.halfAngle * 1.15);
      D.closePath();
      D.fill();
    }
    s.towers.forEach((tw, i) => {
      if (!tw) return;
      const sl = shape.slots[i];
      if (tw.kind === "lantern") light(sl.x, sl.y, towerRange(tw.kind, tw.level) * 1.25, 0.95);
      else light(sl.x, sl.y, 20, 0.6);
    });
    for (const e of rt.enemies) {
      if (e.kind === "jelly") light(e.x, e.y, 26, 0.7);
      if (e.burnT > 0) light(e.x, e.y, 22, 0.8);
    }
    for (const r of this.rings) light(r.x, r.y, r.r, 0.5 * (1 - r.t / 0.6));
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.dark, 0, 0, this.canvas.width, this.canvas.height);

    // --- feixe colorido (aditivo) com poeira ---
    g.setTransform(d * sc, 0, 0, d * sc, d * (this.cx + shx), d * (this.cy + shy));
    g.globalCompositeOperation = "lighter";
    const [lr, lg, lb] = lens.color;
    for (const a of angles) {
      const gr = g.createRadialGradient(0, 0, 12, 0, 0, bs.reach);
      gr.addColorStop(0, `rgba(${lr},${lg},${lb},0.42)`);
      gr.addColorStop(0.6, `rgba(${lr},${lg},${lb},0.16)`);
      gr.addColorStop(1, `rgba(${lr},${lg},${lb},0)`);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, bs.reach, a - bs.halfAngle, a + bs.halfAngle);
      g.closePath();
      g.fill();
      // núcleo mais intenso
      g.fillStyle = `rgba(255,255,240,0.1)`;
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, bs.reach * 0.9, a - bs.halfAngle * 0.35, a + bs.halfAngle * 0.35);
      g.closePath();
      g.fill();
      // partículas de poeira/chuva cruzando o feixe
      g.fillStyle = `rgba(255,255,230,0.5)`;
      for (let i = 0; i < 90; i++) {
        const u = (this.dust[i * 2] + t * 0.05) % 1;
        const v = this.dust[i * 2 + 1] * 2 - 1;
        const rr = 20 + u * bs.reach;
        const aa = a + v * bs.halfAngle;
        g.fillRect(Math.cos(aa) * rr, Math.sin(aa) * rr, 1.1, 1.1);
      }
    }
    g.globalCompositeOperation = "source-over";

    // olhos e barras de vida por cima da escuridão
    for (const e of rt.enemies) drawEyes(g, e);

    // textos flutuantes
    g.textAlign = "center";
    g.textBaseline = "middle";
    this.texts = this.texts.filter((x) => (x.t += dt) < 1.1);
    for (const x of this.texts) {
      g.globalAlpha = 1 - x.t / 1.1;
      g.font = `700 ${9 / Math.max(0.6, sc) + 2}px system-ui, sans-serif`;
      g.fillStyle = x.color;
      g.fillText(x.text, x.x, x.y - x.t * 26);
    }
    g.globalAlpha = 1;

    // --- chuva em tela ---
    g.setTransform(d, 0, 0, d, 0, 0);
    g.strokeStyle = "rgba(180,200,220,0.28)";
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 260; i++) {
      const sp = this.drops[i * 3 + 2];
      let y = this.drops[i * 3 + 1] + dt * sp * 1.3;
      let x = this.drops[i * 3] + dt * sp * 0.25;
      if (y > 1) {
        y -= 1;
        x = Math.random();
      }
      if (x > 1) x -= 1;
      this.drops[i * 3] = x;
      this.drops[i * 3 + 1] = y;
      g.moveTo(x * this.w, y * this.h);
      g.lineTo(x * this.w + 3 * sp, y * this.h + 12 * sp);
    }
    g.stroke();
    if (this.flash > 0.02) {
      g.fillStyle = `rgba(200,215,255,${this.flash * 0.18})`;
      g.fillRect(0, 0, this.w, this.h);
    }
  }
}
