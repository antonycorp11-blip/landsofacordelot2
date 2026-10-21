import { BALANCE } from "../config/balance";
import { clamp, horizontalIntersections } from "../core/math";
import { hash2, valueNoise } from "../core/rng";
import { cropByIndex } from "../data/crops";
import { FieldGrid, ST, dirFromByte, visualKey, wetBand } from "../systems/FieldSystem";

interface FieldTex {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: ImageData;
  spanMin: Float32Array;
  spanMax: Float32Array;
  drawn: boolean;
}

/**
 * Textura de cada campo gerada por pixel a partir do estado das células.
 * Só as células cuja chave visual mudou são redesenhadas, em lotes por frame.
 */
export class FieldRenderer {
  private tex = new Map<number, FieldTex>();
  readonly px: number;

  constructor(
    private seed: number,
    mobile: boolean,
  ) {
    this.px = mobile ? 5 : 7;
  }

  private ensure(f: FieldGrid): FieldTex {
    let t = this.tex.get(f.id);
    if (t) return t;
    const PX = this.px;
    const W = f.w * PX;
    const H = f.h * PX;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(W, H);
    const spanMin = new Float32Array(H);
    const spanMax = new Float32Array(H);
    const cs = BALANCE.cellSize;
    for (let y = 0; y < H; y++) {
      const wy = f.oy + ((y + 0.5) / PX) * cs;
      const xs = horizontalIntersections(f.poly, wy);
      if (xs.length >= 2) {
        spanMin[y] = (xs[0] - f.ox) * (PX / cs);
        spanMax[y] = (xs[xs.length - 1] - f.ox) * (PX / cs);
      } else {
        spanMin[y] = 1;
        spanMax[y] = 0;
      }
    }
    t = { canvas, ctx, img, spanMin, spanMax, drawn: false };
    this.tex.set(f.id, t);
    f.markAllDirty();
    f.visKey.fill(255);
    return t;
  }

  /** Processa células sujas respeitando um orçamento de pixels. Retorna o orçamento restante. */
  update(f: FieldGrid, budget: number): number {
    const t = this.ensure(f);
    const d = f.dirty;
    if (!d) {
      t.drawn = true;
      return budget;
    }
    const PX = this.px;
    const rowCost = (d.x1 - d.x0 + 1) * PX * PX;
    const rows = Math.max(1, Math.floor(budget / Math.max(1, rowCost)));
    const y0 = d.y0;
    const y1 = Math.min(d.y1, d.y0 + rows - 1);
    let drew = false;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = d.x0; cx <= d.x1; cx++) {
        const i = cy * f.w + cx;
        const k = visualKey(f, i);
        if (k === f.visKey[i] && f.visKey[i] !== 255) continue;
        f.visKey[i] = k;
        this.shadeCell(f, t, i, cx, cy);
        drew = true;
      }
    }
    if (drew) t.ctx.putImageData(t.img, 0, 0, d.x0 * PX, y0 * PX, (d.x1 - d.x0 + 1) * PX, (y1 - y0 + 1) * PX);
    if (y1 >= d.y1) {
      f.dirty = null;
      t.drawn = true;
    } else d.y0 = y1 + 1;
    return budget - (y1 - y0 + 1) * rowCost;
  }

  draw(ctx: CanvasRenderingContext2D, f: FieldGrid): void {
    const t = this.tex.get(f.id);
    if (!t || !t.drawn) {
      ctx.fillStyle = "#7d6446";
      ctx.beginPath();
      f.poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      if (!t) return;
    }
    ctx.drawImage(t.canvas, f.ox, f.oy, f.w * BALANCE.cellSize, f.h * BALANCE.cellSize);
  }

  private shadeCell(f: FieldGrid, t: FieldTex, i: number, cx: number, cy: number): void {
    const PX = this.px;
    const data = t.img.data;
    const W = t.img.width;
    const seed = this.seed;
    const stage = f.stage[i];
    const crop = cropByIndex(f.crop[i]);
    const g = f.growth[i];
    const wet = wetBand(f.moisture[i]);
    const wetK = wet === 0 ? 1 : wet === 1 ? 0.87 : 0.72;
    const dir = dirFromByte(f.dir[i]);
    const ca = Math.cos(dir);
    const sa = Math.sin(dir);
    const fert = f.fertility[i] / 255;
    const soilR = 128 - fert * 26;
    const soilG = 96 - fert * 22;
    const soilB = 64 - fert * 16;
    const spacing = crop ? Math.max(0.45, crop.rowSpacing) : 0.5;
    const inMask = f.mask[i] === 1;
    for (let sy = 0; sy < PX; sy++) {
      const Y = cy * PX + sy;
      const smin = t.spanMin[Y];
      const smax = t.spanMax[Y];
      const wy = f.oy + (Y + 0.5) / PX;
      for (let sx = 0; sx < PX; sx++) {
        const X = cx * PX + sx;
        const o = (Y * W + X) * 4;
        if (X + 0.5 < smin || X + 0.5 > smax) {
          data[o + 3] = 0;
          continue;
        }
        const wx = f.ox + (X + 0.5) / PX;
        const h = hash2(Math.floor(wx * PX), Math.floor(wy * PX), seed + 9);
        // variação de solo em manchas grandes (relevo/drenagem)
        const macro = 0.9 + valueNoise(wx / 14, wy / 14, seed + 21) * 0.2;
        const along = wx * ca + wy * sa;
        const perp = -wx * sa + wy * ca;
        let r = soilR;
        let gg = soilG;
        let b = soilB;
        let wetApply = true;
        if (!inMask || stage === ST.Raw) {
          const n = valueNoise(wx * 0.8, wy * 0.8, seed + 3);
          const m = clamp(0.45 + n * 0.55 - (inMask ? 0 : -0.2), 0, 1);
          r = 150 + (98 - 150) * m;
          gg = 120 + (136 - 120) * m;
          b = 82 + (60 - 82) * m;
          const k = 0.86 + h * 0.22;
          r *= k;
          gg *= k;
          b *= k;
          wetApply = false;
        } else if (stage === ST.Cultivated) {
          const furrow = 0.5 + 0.5 * Math.sin((perp * Math.PI * 2) / 0.5);
          const clod = valueNoise(wx * 2.3, wy * 2.3, seed + 5);
          const k = 0.72 + furrow * 0.34 + (clod - 0.5) * 0.26 + (h - 0.5) * 0.12;
          r = soilR * 0.86 * k;
          gg = soilG * 0.84 * k;
          b = soilB * 0.82 * k;
        } else if (stage === ST.Plowed) {
          let ph = (perp / 1.1) % 1;
          if (ph < 0) ph += 1;
          const lit = ph < 0.55 ? 1.12 - ph * 0.3 : 0.7 + (ph - 0.55) * 0.5;
          const clod = valueNoise(wx * 1.5, wy * 1.5, seed + 6);
          const k = lit + (clod - 0.5) * 0.3 + (h - 0.5) * 0.12;
          r = soilR * 0.85 * k;
          gg = soilG * 0.83 * k;
          b = soilB * 0.8 * k;
        } else if (stage === ST.Stubble || stage === ST.Withered) {
          const streak = valueNoise(along * 0.7, perp * 5.5, seed + 7);
          const swath = 0.5 + 0.5 * Math.sin((perp * Math.PI * 2) / 0.36);
          const straw = crop ? crop.colors.stubble : [190, 170, 120];
          const dead = stage === ST.Withered;
          const m = clamp((streak - 0.25) * 1.7 * (0.55 + swath * 0.45), 0, 1) * (dead ? 0.9 : 0.92);
          r = 146 + (straw[0] - 146) * m;
          gg = 118 + (straw[1] - 118) * m;
          b = 84 + (straw[2] - 84) * m;
          if (dead) {
            r *= 0.78;
            gg *= 0.74;
            b *= 0.7;
          }
          const k = 0.88 + h * 0.18;
          r *= k;
          gg *= k;
          b *= k;
        } else if (stage === ST.Planted && crop) {
          let rp = (perp / spacing + 0.5) % 1;
          if (rp < 0) rp += 1;
          const dRow = Math.abs(rp - 0.5) * spacing;
          const row = Math.floor(perp / spacing + 0.5);
          const half = spacing * 0.5 * clamp(0.12 + g * 1.15, 0.12, 1.05);
          const gap = valueNoise(along * 3.2, row * 1.7, seed + 8) < 0.62 - g * 1.4;
          const furrowK = dRow < 0.06 ? 0.82 : 1;
          r = soilR * 0.9 * furrowK * (0.92 + h * 0.12);
          gg = soilG * 0.9 * furrowK * (0.92 + h * 0.12);
          b = soilB * 0.9 * furrowK * (0.92 + h * 0.12);
          if (g >= 0.08 && dRow < half && !gap) {
            const C = crop.colors;
            let c0: number[];
            if (g < 0.25) c0 = C.sprout;
            else if (g < 0.6) c0 = mix(C.young, C.tall, (g - 0.25) / 0.35);
            else if (g < 1) c0 = mix(C.tall, C.mature, clamp((g - 0.78) / 0.22, 0, 1));
            else {
              const tex = valueNoise(along * 1.6, perp * 2.4, seed + 10);
              const heads = valueNoise(wx * 4.5, wy * 4.5, seed + 12);
              c0 = mix(C.mature, C.matureDark, clamp(tex * 0.75 + (heads - 0.5) * 0.6 + (h - 0.5) * 0.4, 0, 1));
              if (g > 1.3) {
                const k = clamp((g - 1.3) / 0.9, 0, 1);
                c0 = mix(c0, [128, 112, 86], k * 0.8);
              }
            }
            const edge = 1 - (dRow / Math.max(0.01, half)) * 0.25;
            const k = (0.82 + h * 0.3) * edge;
            r = c0[0] * k;
            gg = c0[1] * k;
            b = c0[2] * k;
            wetApply = false;
          }
        }
        if (wetApply) {
          r *= wetK;
          gg *= wetK;
          b *= wetK * 1.02;
          if (wet === 2 && valueNoise(wx * 0.33, wy * 0.33, seed + 11) > 0.8) {
            r = 92 + h * 20;
            gg = 104 + h * 20;
            b = 112 + h * 24;
          }
        } else if (wet === 2) {
          r *= 0.92;
          gg *= 0.94;
          b *= 0.92;
        }
        data[o] = r * macro;
        data[o + 1] = gg * macro;
        data[o + 2] = b * macro;
        data[o + 3] = 255;
      }
    }
  }
}

function mix(a: readonly number[], b: readonly number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
