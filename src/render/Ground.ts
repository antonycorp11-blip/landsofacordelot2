import { clamp, distToPolygonEdge, pointInPolygon, smoothstep } from "../core/math";
import { fbm, hash2, valueNoise } from "../core/rng";
import type { GameMap } from "../world/MapGen";
import type { RoadEdge } from "../world/types";

export const CHUNK = 48;

const SEASON_GRASS: [number, number, number][] = [
  [104, 150, 64],
  [90, 138, 56],
  [138, 140, 72],
  [124, 132, 96],
];

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

const noiseSources = new Map<string, HTMLCanvasElement>();

/** Textura de ruído para preencher estradas/pátios. */
function noisePattern(ctx: CanvasRenderingContext2D, base: [number, number, number], amp: number, seed: number, speck = 0): CanvasPattern {
  const key = `${base.join(",")}|${amp}|${seed}|${speck}`;
  const cached = noiseSources.get(key);
  if (cached) return ctx.createPattern(cached, "repeat")!;
  const S = 96;
  const c = makeCanvas(S, S);
  const g = c.getContext("2d")!;
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const n = (valueNoise(x / 6, y / 6, seed) - 0.5) * amp + (hash2(x, y, seed + 1) - 0.5) * amp * 0.8;
      let k = 1 + n;
      if (speck && hash2(x, y, seed + 2) > 1 - speck) k *= 1.25;
      const o = (y * S + x) * 4;
      img.data[o] = clamp(base[0] * k, 0, 255);
      img.data[o + 1] = clamp(base[1] * k, 0, 255);
      img.data[o + 2] = clamp(base[2] * k, 0, 255);
      img.data[o + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  noiseSources.set(key, c);
  return ctx.createPattern(c, "repeat")!;
}

/** Terreno base por chunks em canvas offscreen, com cache LRU e mapa de baixa resolução. */
export class Ground {
  private cache = new Map<number, { c: HTMLCanvasElement; used: number }>();
  private frame = 0;
  lowres: HTMLCanvasElement | null = null;
  season = 0;
  readonly res: number;
  maxChunks: number;

  constructor(
    private map: GameMap,
    mobile: boolean,
  ) {
    this.res = mobile ? 6 : 7;
    this.maxChunks = mobile ? 50 : 100;
  }

  setSeason(s: number): void {
    if (s === this.season && this.lowres) return;
    this.season = s;
    this.cache.clear();
    this.lowres = this.render(0, 0, this.map.width, this.map.height, 1, true);
  }

  private grassPixel(wx: number, wy: number, px: number, py: number, out: Uint8ClampedArray, o: number): void {
    const seed = this.map.seed;
    const base = SEASON_GRASS[this.season];
    const n1 = fbm(wx / 55, wy / 55, seed + 101, 3);
    const n2 = valueNoise(wx * 0.55, wy * 0.55, seed + 202);
    const h = hash2(px, py, seed + 303);
    const dry = smoothstep(0.56, 0.78, n1) * 0.55;
    const lush = smoothstep(0.38, 0.2, n1) * 0.5;
    let r = base[0] + (168 - base[0]) * dry + (66 - base[0]) * lush;
    let g = base[1] + (154 - base[1]) * dry + (118 - base[1]) * lush;
    let b = base[2] + (84 - base[2]) * dry + (46 - base[2]) * lush;
    // tufos de capim: ruído fino somado ao pontilhado por pixel
    const tuft = valueNoise(wx * 3.1, wy * 3.1, seed + 505) - 0.5;
    const shade = 0.86 + n2 * 0.22 + tuft * 0.16 + (h - 0.5) * 0.09;
    r *= shade;
    g *= shade;
    b *= shade;
    if (h > 0.9988) {
      const f = hash2(px, py, seed + 404);
      if (this.season < 2) {
        r = f > 0.5 ? 240 : 236;
        g = f > 0.5 ? 228 : 196;
        b = f > 0.5 ? 120 : 214;
      }
    }
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = 255;
  }

  /** Desenha uma região do mundo [x0,x0+w]x[y0,y0+h] em resolução `res` px/m. */
  private render(x0: number, y0: number, w: number, h: number, res: number, low = false): HTMLCanvasElement {
    const W = Math.ceil(w * res);
    const H = Math.ceil(h * res);
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(W, H);
    const d = img.data;
    const nearFields = this.map.fields
      .filter((f) => this.bboxHit(f.poly, x0 - 4, y0 - 4, x0 + w + 4, y0 + h + 4))
      .map((f) => {
        const xs = f.poly.map((p) => p.x);
        const ys = f.poly.map((p) => p.y);
        return { poly: f.poly, minX: Math.min(...xs) - 2.3, maxX: Math.max(...xs) + 2.3, minY: Math.min(...ys) - 2.3, maxY: Math.max(...ys) + 2.3 };
      });
    for (let py = 0; py < H; py++) {
      const wy = y0 + (py + 0.5) / res;
      for (let px = 0; px < W; px++) {
        const wx = x0 + (px + 0.5) / res;
        const o = (py * W + px) * 4;
        this.grassPixel(wx, wy, Math.floor(wx * res), Math.floor(wy * res), d, o);
        // bordadura de capim mais alto ao redor dos campos
        for (const f of nearFields) {
          if (wx < f.minX || wx > f.maxX || wy < f.minY || wy > f.maxY) continue;
          if (pointInPolygon(wx, wy, f.poly)) {
            d[o] *= 0.62;
            d[o + 1] *= 0.55;
            d[o + 2] *= 0.48;
            break;
          }
          const e = distToPolygonEdge(wx, wy, f.poly);
          if (e < 2.2) {
            const k = 0.82 + (e / 2.2) * 0.18;
            d[o] *= k * 0.95;
            d[o + 1] *= k;
            d[o + 2] *= k * 0.9;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
    this.drawVectors(ctx, x0, y0, x0 + w, y0 + h, res, low);
    return c;
  }

  private bboxHit(poly: { x: number; y: number }[], x0: number, y0: number, x1: number, y1: number): boolean {
    let a = Infinity,
      b = Infinity,
      cc = -Infinity,
      dd = -Infinity;
    for (const p of poly) {
      a = Math.min(a, p.x);
      b = Math.min(b, p.y);
      cc = Math.max(cc, p.x);
      dd = Math.max(dd, p.y);
    }
    return !(cc < x0 || a > x1 || dd < y0 || b > y1);
  }

  private pats(ctx: CanvasRenderingContext2D, res: number): Record<string, CanvasPattern> {
    const seed = this.map.seed;
    const p = {
      asphalt: noisePattern(ctx, [74, 76, 80], 0.16, seed + 1, 0.02),
      dirt: noisePattern(ctx, [156, 124, 86], 0.2, seed + 2, 0.03),
      dirtDark: noisePattern(ctx, [126, 98, 66], 0.2, seed + 3),
      gravel: noisePattern(ctx, [170, 160, 140], 0.28, seed + 4, 0.08),
      yard: noisePattern(ctx, [150, 132, 98], 0.24, seed + 5, 0.05),
      concrete: noisePattern(ctx, [182, 180, 172], 0.1, seed + 6, 0.01),
      shoulder: noisePattern(ctx, [140, 128, 98], 0.25, seed + 7, 0.05),
    };
    const m = new DOMMatrix().scale(1 / res);
    for (const k of Object.keys(p)) (p as Record<string, CanvasPattern>)[k].setTransform(m);
    return p;
  }

  private drawVectors(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, res: number, low: boolean): void {
    const map = this.map;
    const P = this.pats(ctx, res);
    const pad = 12;
    const inView = (ax: number, ay: number, bx: number, by: number) => !(Math.max(ax, bx) < x0 - pad || Math.min(ax, bx) > x1 + pad || Math.max(ay, by) < y0 - pad || Math.min(ay, by) > y1 + pad);
    // superfícies (pátios)
    for (const s of map.surfaces) {
      ctx.beginPath();
      s.poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = s.kind === "concrete" ? P.concrete : s.kind === "gravel" ? P.gravel : P.yard;
      ctx.fill();
      ctx.strokeStyle = "rgba(70,60,40,0.25)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    // lagoas
    for (const p of map.ponds) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx + 2.5, p.ry + 2.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#7d6f4e";
      ctx.fill();
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, p.rx);
      g.addColorStop(0, "#2f6a85");
      g.addColorStop(0.7, "#3f7f97");
      g.addColorStop(1, "#5d968f");
      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(220,240,240,0.25)";
      ctx.lineWidth = 0.3;
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.ellipse(-p.rx * 0.2 + k * 2, -p.ry * 0.3 + k * 1.5, p.rx * 0.3, 0.3, 0.1, 0, Math.PI);
        ctx.stroke();
      }
      // juncos na margem
      ctx.strokeStyle = "#3e6b2c";
      ctx.lineWidth = 0.18;
      for (let k = 0; k < 60; k++) {
        const a = hash2(k, 7, map.seed) * Math.PI * 2;
        const rr = 0.92 + hash2(k, 9, map.seed) * 0.12;
        const x = Math.cos(a) * p.rx * rr;
        const y = Math.sin(a) * p.ry * rr;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * 0.8, y + Math.sin(a) * 0.8 - 0.3);
        ctx.stroke();
      }
      ctx.restore();
    }
    // estradas em camadas: acostamento, base, marcações
    const nodes = map.roads.nodes;
    const edges = map.roads.edges.filter((e) => inView(nodes[e.a].x, nodes[e.a].y, nodes[e.b].x, nodes[e.b].y));
    const stroke = (e: RoadEdge, w: number, style: string | CanvasPattern, dash?: number[], alpha = 1) => {
      ctx.beginPath();
      ctx.moveTo(nodes[e.a].x, nodes[e.a].y);
      ctx.lineTo(nodes[e.b].x, nodes[e.b].y);
      ctx.lineWidth = w;
      ctx.strokeStyle = style;
      ctx.globalAlpha = alpha;
      if (dash) {
        ctx.setLineDash(dash);
        ctx.lineDashOffset = -e.s0;
      } else ctx.setLineDash([]);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const e of edges) if (e.kind === "track") stroke(e, e.width, P.dirt, undefined, 0.55);
    for (const e of edges) if (e.kind === "dirt") stroke(e, e.width + 2, P.shoulder, undefined, 0.6);
    for (const e of edges) if (e.kind === "asphalt") stroke(e, e.width + 3, P.shoulder);
    for (const e of edges) if (e.kind === "dirt") stroke(e, e.width, P.dirt);
    for (const e of edges) if (e.kind === "dirt" && !low) stroke(e, 2.9, P.dirtDark, undefined, 0.55);
    for (const e of edges) if (e.kind === "dirt" && !low) stroke(e, 1.3, P.dirt);
    for (const e of edges) if (e.kind === "dirt" && !low) stroke(e, 0.35, "rgba(96,130,60,0.6)");
    for (const e of edges) if (e.kind === "asphalt") stroke(e, e.width, "#e8e4d8");
    for (const e of edges) if (e.kind === "asphalt") stroke(e, e.width - 0.5, P.asphalt);
    if (!low) for (const e of edges) if (e.kind === "asphalt") stroke(e, 0.16, "#e2c35a", [3, 5]);
    ctx.setLineDash([]);
    // cercas
    if (!low) {
      for (const f of map.fences) {
        for (let i = 1; i < f.pts.length; i++) {
          const a = f.pts[i - 1];
          const b = f.pts[i];
          if (!inView(a.x, a.y, b.x, b.y)) continue;
          ctx.strokeStyle = "rgba(0,0,0,0.18)";
          ctx.lineWidth = 0.14;
          ctx.beginPath();
          ctx.moveTo(a.x + 0.2, a.y + 0.25);
          ctx.lineTo(b.x + 0.2, b.y + 0.25);
          ctx.stroke();
          ctx.strokeStyle = "#a07c52";
          ctx.lineWidth = 0.1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          for (let s = 0; s <= len; s += 2.6) {
            const x = a.x + ((b.x - a.x) * s) / len;
            const y = a.y + ((b.y - a.y) * s) / len;
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(x - 0.1, y - 0.05, 0.34, 0.34);
            ctx.fillStyle = "#5d4128";
            ctx.fillRect(x - 0.16, y - 0.16, 0.32, 0.32);
          }
        }
      }
      // pedras e touceiras
      const seed = map.seed;
      for (let gy = Math.floor(y0 / 9); gy <= Math.floor(y1 / 9); gy++)
        for (let gx = Math.floor(x0 / 9); gx <= Math.floor(x1 / 9); gx++) {
          const h = hash2(gx, gy, seed + 77);
          if (h > 0.16) continue;
          const x = gx * 9 + hash2(gx, gy, seed + 78) * 9;
          const y = gy * 9 + hash2(gx, gy, seed + 79) * 9;
          if (map.fields.some((f) => pointInPolygon(x, y, f.poly) || distToPolygonEdge(x, y, f.poly) < 3)) continue;
          if (map.surfaces.some((s) => pointInPolygon(x, y, s.poly))) continue;
          const r = map.roads.roadAt(x, y);
          if (r.d < r.width / 2 + 2) continue;
          if (h < 0.05) {
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.beginPath();
            ctx.ellipse(x + 0.2, y + 0.2, 0.6, 0.45, h * 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#9a978d";
            ctx.beginPath();
            ctx.ellipse(x, y, 0.55, 0.4, h * 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#b9b6aa";
            ctx.beginPath();
            ctx.ellipse(x - 0.12, y - 0.1, 0.25, 0.16, h * 20, 0, Math.PI * 2);
            ctx.fill();
          } else {
            for (let k = 0; k < 4; k++) {
              const ox = (hash2(gx, k, seed) - 0.5) * 1.4;
              const oy = (hash2(gy, k, seed) - 0.5) * 1.4;
              ctx.fillStyle = k % 2 ? "#4d7a33" : "#5f8d3d";
              ctx.beginPath();
              ctx.arc(x + ox, y + oy, 0.5 + hash2(gx + k, gy, seed) * 0.4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
    } else {
      // no mapa reduzido, árvores e construções como manchas
      for (const t of map.trees) {
        ctx.fillStyle = t.kind === 0 ? "#3f6b2e" : "#35602a";
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of map.buildings) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.def.roof;
        if (b.def.kind === "silo") {
          ctx.beginPath();
          ctx.arc(0, 0, b.def.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else ctx.fillRect(-b.def.w / 2, -b.def.h / 2, b.def.w, b.def.h);
        ctx.restore();
      }
    }
  }

  private ensureChunk(cx: number, cy: number, allowGen: boolean): HTMLCanvasElement | null {
    const key = cy * 1000 + cx;
    const hit = this.cache.get(key);
    if (hit) {
      hit.used = this.frame;
      return hit.c;
    }
    if (!allowGen) return null;
    const c = this.render(cx * CHUNK, cy * CHUNK, CHUNK, CHUNK, this.res);
    this.cache.set(key, { c, used: this.frame });
    if (this.cache.size > this.maxChunks) {
      let oldK = -1;
      let oldU = Infinity;
      for (const [k, v] of this.cache) if (v.used < oldU) {
        oldU = v.used;
        oldK = k;
      }
      this.cache.delete(oldK);
    }
    return c;
  }

  /** Desenha o terreno visível. Gera no máximo `budget` chunks novos por frame. */
  draw(ctx: CanvasRenderingContext2D, view: { minX: number; minY: number; maxX: number; maxY: number }, zoom: number, budget = 2): void {
    this.frame++;
    if (!this.lowres) return;
    ctx.imageSmoothingEnabled = true;
    const lowOnly = zoom < 1.9;
    if (lowOnly) {
      ctx.drawImage(this.lowres, 0, 0, this.map.width, this.map.height);
      return;
    }
    const cx0 = Math.max(0, Math.floor(view.minX / CHUNK));
    const cy0 = Math.max(0, Math.floor(view.minY / CHUNK));
    const cx1 = Math.min(Math.ceil(this.map.width / CHUNK) - 1, Math.floor(view.maxX / CHUNK));
    const cy1 = Math.min(Math.ceil(this.map.height / CHUNK) - 1, Math.floor(view.maxY / CHUNK));
    // fundo de baixa resolução (aparece enquanto chunks são gerados)
    const sx = Math.max(0, view.minX);
    const sy = Math.max(0, view.minY);
    const sw = Math.min(this.map.width, view.maxX) - sx;
    const sh = Math.min(this.map.height, view.maxY) - sy;
    if (sw > 0 && sh > 0) ctx.drawImage(this.lowres, sx, sy, sw, sh, sx, sy, sw, sh);
    // gera primeiro os chunks mais próximos do centro
    const midX = (view.minX + view.maxX) / 2;
    const midY = (view.minY + view.maxY) / 2;
    const list: [number, number, number][] = [];
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) list.push([cx, cy, Math.hypot((cx + 0.5) * CHUNK - midX, (cy + 0.5) * CHUNK - midY)]);
    list.sort((a, b) => a[2] - b[2]);
    for (const [cx, cy] of list) {
      const has = this.cache.has(cy * 1000 + cx);
      const c = this.ensureChunk(cx, cy, !has && budget > 0);
      if (!has && c) budget--;
      if (c) ctx.drawImage(c, cx * CHUNK, cy * CHUNK, CHUNK + 0.02, CHUNK + 0.02);
    }
  }
}
