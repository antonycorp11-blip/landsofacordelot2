import { TAU } from "../core/math";
import { Rng, fbm } from "../core/rng";

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return [c, c.getContext("2d")!];
}

const glowCache = new Map<string, HTMLCanvasElement>();
/** brilho radial pré-renderizado (desenhar com "lighter") */
export function glow(color: string): HTMLCanvasElement {
  let c = glowCache.get(color);
  if (c) return c;
  const [cv, g] = canvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, color);
  gr.addColorStop(0.25, hexA(color, 0.45));
  gr.addColorStop(1, hexA(color, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(color, cv);
  c = cv;
  return c;
}

export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** fundo: gradiente profundo + nebulosa procedural + estrelas */
export function renderBackground(w: number, h: number, dpr: number, seed: number): HTMLCanvasElement {
  const W = Math.ceil(w * dpr);
  const H = Math.ceil(h * dpr);
  const [cv, g] = canvas(W, H);
  const bgr = g.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.6);
  bgr.addColorStop(0, "#0b0d24");
  bgr.addColorStop(1, "#020309");
  g.fillStyle = bgr;
  g.fillRect(0, 0, W, H);
  // nebulosa em baixa resolução
  const q = 5;
  const nw = Math.ceil(w / q);
  const nh = Math.ceil(h / q);
  const [nc, ng] = canvas(nw, nh);
  const img = ng.createImageData(nw, nh);
  const sc = 1 / Math.max(w, h);
  for (let y = 0; y < nh; y++)
    for (let x = 0; x < nw; x++) {
      const u = x * q * sc * 3.2;
      const v = y * q * sc * 3.2;
      const wx = fbm(u + 7.1, v + 2.3, seed + 3, 3) * 2.2;
      const a = fbm(u + wx, v - wx * 0.6, seed, 5);
      const b = fbm(u * 1.4 - wx, v * 1.4 + 9, seed + 11, 4);
      const da = Math.max(0, a - 0.42) * 2.4;
      const db = Math.max(0, b - 0.48) * 2.6;
      const i = (y * nw + x) * 4;
      img.data[i] = Math.min(255, 90 * da * da + 20 * db);
      img.data[i + 1] = Math.min(255, 20 * da + 80 * db * db);
      img.data[i + 2] = Math.min(255, 150 * da * da + 120 * db * db);
      img.data[i + 3] = Math.min(255, 255 * Math.min(1, da * 0.9 + db * 0.8));
    }
  ng.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.globalAlpha = 0.85;
  g.drawImage(nc, 0, 0, W, H);
  g.globalAlpha = 1;
  // estrelas
  const rng = new Rng(seed * 7 + 1);
  const count = Math.round((w * h) / 1500);
  for (let i = 0; i < count; i++) {
    const x = rng.next() * W;
    const y = rng.next() * H;
    const m = Math.pow(rng.next(), 4);
    const r = (0.4 + m * 1.3) * dpr;
    const t = rng.next();
    g.fillStyle = t < 0.15 ? `rgba(255,200,170,${0.4 + m * 0.6})` : t < 0.35 ? `rgba(170,200,255,${0.4 + m * 0.6})` : `rgba(240,240,255,${0.3 + m * 0.7})`;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    if (m > 0.6) {
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.6;
      g.drawImage(glow("#9fc4ff"), x - r * 6, y - r * 6, r * 12, r * 12);
      g.globalAlpha = 1;
      g.strokeStyle = "rgba(200,220,255,0.35)";
      g.lineWidth = 0.6 * dpr;
      g.beginPath();
      g.moveTo(x - r * 7, y);
      g.lineTo(x + r * 7, y);
      g.moveTo(x, y - r * 7);
      g.lineTo(x, y + r * 7);
      g.stroke();
      g.globalCompositeOperation = "source-over";
    }
  }
  return cv;
}

/** planeta-núcleo: textura procedural projetada numa esfera que gira, com luz, nuvens e atmosfera */
export class Planet {
  readonly cv: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private img: ImageData;
  private tex: Uint8ClampedArray;
  private cloud: Uint8ClampedArray;
  private pix: Int32Array;
  private ty: Int32Array;
  private lon: Float32Array;
  private shade: Float32Array;
  private rim: Float32Array;
  private static TW = 256;
  private static TH = 128;

  constructor(
    readonly D: number,
    seed: number,
  ) {
    [this.cv, this.g] = canvas(D, D);
    this.img = this.g.createImageData(D, D);
    const TW = Planet.TW;
    const TH = Planet.TH;
    this.tex = new Uint8ClampedArray(TW * TH * 3);
    this.cloud = new Uint8ClampedArray(TW * TH);
    for (let y = 0; y < TH; y++) {
      const lat = (y / TH - 0.5) * Math.PI;
      for (let x = 0; x < TW; x++) {
        const lon = (x / TW) * TAU;
        const cx = Math.cos(lat) * Math.cos(lon) * 1.7 + 5;
        const cz = Math.cos(lat) * Math.sin(lon) * 1.7 + 5;
        const cy = Math.sin(lat) * 1.7;
        const n = fbm(cx + cy * 0.6, cz - cy * 0.5, seed, 5);
        const i = (y * TW + x) * 3;
        const polar = Math.abs(lat) + (n - 0.5) * 0.5;
        let c: [number, number, number];
        if (polar > 1.22) c = [225, 238, 255];
        else if (n > 0.55) {
          const k = Math.min(1, (n - 0.55) * 5);
          c = [60 + 90 * k, 140 - 20 * k, 70 - 10 * k];
          if (Math.abs(lat) < 0.35 && n > 0.62) c = [180, 150, 90];
        } else {
          const k = n / 0.55;
          c = [8 + 18 * k, 40 + 80 * k, 100 + 100 * k];
        }
        this.tex[i] = c[0];
        this.tex[i + 1] = c[1];
        this.tex[i + 2] = c[2];
        const cl = fbm(cx * 2.2 + 11, cz * 2.2 + cy * 1.5, seed + 99, 4);
        this.cloud[y * TW + x] = Math.max(0, Math.min(255, (cl - 0.52) * 900));
      }
    }
    const R = D / 2 - 1;
    const c = D / 2;
    const pix: number[] = [];
    const ty: number[] = [];
    const lon: number[] = [];
    const shade: number[] = [];
    const rim: number[] = [];
    const tilt = 0.35;
    const L = [-0.55, -0.5, 0.67];
    for (let py = 0; py < D; py++)
      for (let px = 0; px < D; px++) {
        const nx = (px + 0.5 - c) / R;
        const ny = (py + 0.5 - c) / R;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const nz = Math.sqrt(1 - r2);
        // inclina o eixo
        const y2 = ny * Math.cos(tilt) - nz * Math.sin(tilt);
        const z2 = ny * Math.sin(tilt) + nz * Math.cos(tilt);
        const lat = Math.asin(Math.max(-1, Math.min(1, y2)));
        pix.push(py * D + px);
        ty.push(Math.min(TH - 1, Math.floor((lat / Math.PI + 0.5) * TH)));
        lon.push(Math.atan2(nx, z2) / TAU);
        const d = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        shade.push(0.08 + 0.92 * Math.pow(d, 0.8));
        rim.push(Math.pow(1 - nz, 2.5));
      }
    this.pix = Int32Array.from(pix);
    this.ty = Int32Array.from(ty);
    this.lon = Float32Array.from(lon);
    this.shade = Float32Array.from(shade);
    this.rim = Float32Array.from(rim);
  }

  render(rot: number, tint: [number, number, number]): HTMLCanvasElement {
    const TW = Planet.TW;
    const out = this.img.data;
    const r1 = rot / TAU;
    const r2 = (rot * 1.35) / TAU;
    for (let k = 0; k < this.pix.length; k++) {
      const row = this.ty[k] * TW;
      let u = this.lon[k] + r1;
      u -= Math.floor(u);
      const tx = Math.floor(u * TW) % TW;
      let u2 = this.lon[k] + r2;
      u2 -= Math.floor(u2);
      const cx = Math.floor(u2 * TW) % TW;
      const ti = (row + tx) * 3;
      const cl = this.cloud[row + cx] / 255;
      const sh = this.shade[k];
      const rm = this.rim[k];
      let r = this.tex[ti] * (1 - cl) + 245 * cl;
      let g = this.tex[ti + 1] * (1 - cl) + 248 * cl;
      let b = this.tex[ti + 2] * (1 - cl) + 255 * cl;
      r = r * sh + tint[0] * rm * 0.9;
      g = g * sh + tint[1] * rm * 0.9;
      b = b * sh + tint[2] * rm * 0.9;
      const o = this.pix[k] * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = 255;
    }
    this.g.putImageData(this.img, 0, 0);
    return this.cv;
  }
}

/** asteroide pré-renderizado: polígono irregular com crateras e luz */
export function asteroidSprite(r: number, seed: number): HTMLCanvasElement {
  const S = Math.ceil(r * 2.4);
  const [cv, g] = canvas(S, S);
  const rng = new Rng(seed);
  const c = S / 2;
  const pts: [number, number][] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = r * (0.78 + rng.next() * 0.3);
    pts.push([c + Math.cos(a) * rr, c + Math.sin(a) * rr]);
  }
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  const gr = g.createRadialGradient(c - r * 0.4, c - r * 0.4, r * 0.1, c, c, r * 1.1);
  gr.addColorStop(0, "#9a8e84");
  gr.addColorStop(0.6, "#4e4640");
  gr.addColorStop(1, "#1e1a18");
  g.fillStyle = gr;
  g.fill();
  g.save();
  g.clip();
  for (let i = 0; i < 6; i++) {
    const x = c + (rng.next() - 0.5) * r * 1.2;
    const y = c + (rng.next() - 0.5) * r * 1.2;
    const cr = r * (0.1 + rng.next() * 0.18);
    g.fillStyle = "rgba(20,16,14,0.45)";
    g.beginPath();
    g.arc(x, y, cr, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(200,190,180,0.18)";
    g.lineWidth = Math.max(1, r * 0.05);
    g.beginPath();
    g.arc(x + cr * 0.15, y + cr * 0.15, cr, Math.PI * 0.1, Math.PI * 0.9);
    g.stroke();
  }
  g.restore();
  g.strokeStyle = "rgba(255,190,140,0.25)";
  g.lineWidth = Math.max(1, r * 0.06);
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.stroke();
  return cv;
}
