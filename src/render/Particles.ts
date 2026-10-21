import type { FxSink } from "../world/World";

const MAX = 1800;
const T_DUST = 0;
const T_SMOKE = 1;
const T_GRAIN = 2;
const T_CHAFF = 3;
const T_SPRAY = 4;

/** Pool de partículas em estrutura de arrays (sem alocação por frame). */
export class Particles implements FxSink {
  private x = new Float32Array(MAX);
  private y = new Float32Array(MAX);
  private vx = new Float32Array(MAX);
  private vy = new Float32Array(MAX);
  private life = new Float32Array(MAX);
  private max = new Float32Array(MAX);
  private size = new Float32Array(MAX);
  private type = new Uint8Array(MAX);
  private col: string[] = new Array(MAX).fill("#c9a86a");
  private cursor = 0;
  count = 0;
  /** Área de interesse: partículas fora dela não são emitidas. */
  view = { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 };
  quality = 1;

  // marcas de pneu (anel)
  private readonly TMAX = 5000;
  private tx = new Float32Array(this.TMAX);
  private ty = new Float32Array(this.TMAX);
  private tw = new Float32Array(this.TMAX);
  private tt = new Float32Array(this.TMAX);
  private twet = new Uint8Array(this.TMAX);
  private tcur = 0;
  private lastTrack = new Map<number, { x: number; y: number }>();
  time = 0;

  private visible(x: number, y: number): boolean {
    const v = this.view;
    return x > v.minX && x < v.maxX && y > v.minY && y < v.maxY;
  }

  private spawn(t: number, x: number, y: number, vx: number, vy: number, life: number, size: number, col?: string): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.life[i] = life;
    this.max[i] = life;
    this.size[i] = size;
    this.type[i] = t;
    if (col) this.col[i] = col;
  }

  dust(x: number, y: number, amount: number, color?: string): void {
    if (!this.visible(x, y)) return;
    if (color === "spray") {
      this.spray(x, y);
      return;
    }
    const n = amount * this.quality;
    let k = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
    while (k-- > 0) this.spawn(T_DUST, x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4, 1.6 + Math.random() * 1.4, 0.8 + Math.random() * 0.8, color ?? "#b89a6e");
  }

  smoke(x: number, y: number, amount: number): void {
    if (!this.visible(x, y) || Math.random() > amount * 0.35 * this.quality) return;
    this.spawn(T_SMOKE, x, y, 0.3 + Math.random() * 0.3, -0.2 - Math.random() * 0.3, 1.0 + Math.random() * 0.6, 0.2, "#6a6a6a");
  }

  grain(x: number, y: number, vx: number, vy: number, color: string): void {
    if (!this.visible(x, y)) return;
    this.spawn(T_GRAIN, x + (Math.random() - 0.5) * 0.3, y + (Math.random() - 0.5) * 0.3, vx, vy, 0.4 + Math.random() * 0.3, 0.14 + Math.random() * 0.12, color);
  }

  chaff(x: number, y: number, vx: number, vy: number): void {
    if (!this.visible(x, y) || Math.random() > 0.7 * this.quality) return;
    this.spawn(T_CHAFF, x + (Math.random() - 0.5) * 1.5, y + (Math.random() - 0.5) * 1.5, vx + (Math.random() - 0.5) * 2, vy + (Math.random() - 0.5) * 2, 1.4 + Math.random(), 0.5 + Math.random() * 0.5, "#d9c38a");
  }

  spray(x: number, y: number): void {
    if (!this.visible(x, y) || Math.random() > 0.8 * this.quality) return;
    this.spawn(T_SPRAY, x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 0.9 + Math.random() * 0.6, 0.6 + Math.random() * 0.6, "#dfeef7");
  }

  track(x: number, y: number, _heading: number, width: number, wet: boolean, key = 0): void {
    const k = key || Math.round(x * 7.3 + y * 3.1);
    const last = this.lastTrack.get(k);
    if (last && Math.hypot(last.x - x, last.y - y) < 0.45) return;
    this.lastTrack.set(k, { x, y });
    if (this.lastTrack.size > 200) this.lastTrack.clear();
    const i = this.tcur;
    this.tcur = (this.tcur + 1) % this.TMAX;
    this.tx[i] = x;
    this.ty[i] = y;
    this.tw[i] = width;
    this.tt[i] = this.time;
    this.twet[i] = wet ? 1 : 0;
  }

  update(dt: number): void {
    this.time += dt;
    let c = 0;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      const t = this.type[i];
      if (t === T_DUST || t === T_SPRAY) {
        this.vx[i] *= 0.97;
        this.vy[i] *= 0.97;
        this.size[i] += dt * 1.1;
      } else if (t === T_SMOKE) this.size[i] += dt * 0.45;
      else if (t === T_CHAFF) {
        this.vx[i] *= 0.95;
        this.vy[i] *= 0.95;
      }
      c++;
    }
    this.count = c;
  }

  drawTracks(ctx: CanvasRenderingContext2D, view: { minX: number; minY: number; maxX: number; maxY: number }): void {
    const now = this.time;
    const buckets = [0.32, 0.22, 0.13, 0.06];
    for (let b = 0; b < buckets.length; b++) {
      for (const wet of [0, 1]) {
        ctx.beginPath();
        let any = false;
        for (let i = 0; i < this.TMAX; i++) {
          if (this.tw[i] === 0 || this.twet[i] !== wet) continue;
          const age = now - this.tt[i];
          const bucket = age < 30 ? 0 : age < 80 ? 1 : age < 150 ? 2 : age < 240 ? 3 : 4;
          if (bucket !== b) continue;
          const x = this.tx[i];
          const y = this.ty[i];
          if (x < view.minX || x > view.maxX || y < view.minY || y > view.maxY) continue;
          const w = this.tw[i];
          ctx.rect(x - w / 2, y - w / 2, w, w);
          any = true;
        }
        if (any) {
          ctx.fillStyle = wet ? `rgba(48,34,22,${buckets[b] * 1.6})` : `rgba(70,52,34,${buckets[b]})`;
          ctx.fill();
        }
      }
    }
  }

  /** Partículas de solo (abaixo das máquinas). */
  drawLow(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      const t = this.type[i];
      if (t !== T_GRAIN && t !== T_CHAFF) continue;
      const a = Math.min(1, this.life[i] / this.max[i] * 1.5);
      ctx.globalAlpha = a;
      ctx.fillStyle = this.col[i];
      const s = this.size[i];
      ctx.fillRect(this.x[i] - s / 2, this.y[i] - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  /** Poeira/fumaça (acima das máquinas). */
  drawHigh(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      const t = this.type[i];
      if (t === T_GRAIN || t === T_CHAFF) continue;
      const k = this.life[i] / this.max[i];
      const s = this.size[i];
      ctx.globalAlpha = t === T_SMOKE ? k * 0.2 : t === T_SPRAY ? k * 0.25 : k * 0.18;
      ctx.fillStyle = this.col[i];
      ctx.beginPath();
      ctx.arc(this.x[i], this.y[i], s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
