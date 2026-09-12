import type { Point } from "./types";

/* ------------------------------------------------------------------ */
/* Aleatoriedade determinística                                        */
/* ------------------------------------------------------------------ */

export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** PRNG determinístico — o mundo é sempre idêntico entre execuções. */
export function makeRng(seed: number | string) {
  let a = (typeof seed === "string" ? hashSeed(seed) : seed) >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Vetores                                                             */
/* ------------------------------------------------------------------ */

export const deg = (d: number) => (d * Math.PI) / 180;

export function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function polylineLength(pts: Point[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
  return total;
}

/** Reamostra a polilinha em `count` pontos igualmente espaçados. */
export function resample(pts: Point[], count: number): Point[] {
  if (pts.length < 2) return pts.slice();
  const total = polylineLength(pts);
  const step = total / (count - 1);
  const out: Point[] = [pts[0]];
  let segIndex = 1;
  let carried = 0;
  let cursor = pts[0];
  for (let i = 1; i < count - 1; i++) {
    let remaining = step;
    while (segIndex < pts.length) {
      const segEnd = pts[segIndex];
      const segLen = dist(cursor, segEnd) - carried;
      if (segLen >= remaining) {
        const t = (dist(cursor, segEnd) - segLen + remaining) / Math.max(dist(cursor, segEnd), 1e-6);
        cursor = lerpPoint(cursor, segEnd, t);
        carried = 0;
        break;
      }
      remaining -= segLen;
      cursor = segEnd;
      carried = 0;
      segIndex++;
    }
    out.push({ ...cursor });
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Ponto na polilinha à distância `d` do início. */
export function pointAtDistance(pts: Point[], d: number): Point {
  if (pts.length === 0) return { x: 0, y: 0 };
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (acc + seg >= d) return lerpPoint(pts[i - 1], pts[i], seg === 0 ? 0 : (d - acc) / seg);
    acc += seg;
  }
  return { ...pts[pts.length - 1] };
}

/** Ponto na polilinha na fração `t` (0..1) do comprimento total. */
export function pointAtFraction(pts: Point[], t: number): Point {
  return pointAtDistance(pts, polylineLength(pts) * Math.max(0, Math.min(1, t)));
}

/* ------------------------------------------------------------------ */
/* Ruído de contorno                                                   */
/* ------------------------------------------------------------------ */

/** Ruído 1D suave e determinístico em [-1, 1]. */
export function fbm(seed: string, t: number, octaves = 3): number {
  const rng = makeRng(seed);
  const phases = Array.from({ length: octaves }, () => rng() * Math.PI * 2);
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += Math.sin(t * freq * Math.PI * 2 + phases[o]) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.17;
  }
  return sum / norm;
}

/**
 * Gera uma polilinha irregular entre dois pontos.
 * Determinística: a mesma `seed` devolve exatamente os mesmos pontos, o que
 * permite que duas regiões compartilhem a fronteira sem buracos.
 */
export function jaggedLine(
  a: Point,
  b: Point,
  seed: string,
  segments = 18,
  amplitude = 28,
): Point[] {
  const out: Point[] = [];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Extremidades presas: os vértices compartilhados precisam coincidir.
    const taper = Math.sin(t * Math.PI);
    const n = fbm(seed, t * 1.6, 3) * taper * amplitude;
    out.push({ x: a.x + dx * t + nx * n, y: a.y + dy * t + ny * n });
  }
  return out;
}

/**
 * Arco elíptico irregular entre dois ângulos (fronteiras externas/internas).
 */
export function jaggedArc(
  center: Point,
  radiusAt: (angleDeg: number) => { rx: number; ry: number },
  fromAngle: number,
  toAngle: number,
  seed: string,
  segments = 26,
  amplitude = 34,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const ang = fromAngle + (toAngle - fromAngle) * t;
    const { rx, ry } = radiusAt(ang);
    const taper = Math.sin(t * Math.PI);
    const n = fbm(seed, t * 1.9, 3) * taper * amplitude;
    out.push({
      x: center.x + (rx + n) * Math.cos(deg(ang)),
      y: center.y - (ry + n) * Math.sin(deg(ang)),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Polígonos                                                           */
/* ------------------------------------------------------------------ */

/** Remove pontos duplicados consecutivos (junções de arcos compartilhados). */
export function dedupe(pts: Point[], eps = 0.01): Point[] {
  const out: Point[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > eps || Math.abs(last.y - p.y) > eps) out.push(p);
  }
  return out;
}

export function pathFromPoints(pts: Point[], closed = false): string {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
  return closed ? d + " Z" : d;
}

/** Curva suave (Catmull-Rom → Bézier cúbica) para rios e estradas. */
export function smoothPath(pts: Point[], tension = 0.5, closed = false): string {
  if (pts.length < 3) return pathFromPoints(pts, closed);
  const p = pts;
  const n = p.length;
  const get = (i: number) =>
    closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
  let d = `M ${p[0].x.toFixed(2)} ${p[0].y.toFixed(2)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const c1 = { x: p1.x + ((p2.x - p0.x) / 6) * tension * 2, y: p1.y + ((p2.y - p0.y) / 6) * tension * 2 };
    const c2 = { x: p2.x - ((p3.x - p1.x) / 6) * tension * 2, y: p2.y - ((p3.y - p1.y) / 6) * tension * 2 };
    d += ` C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return closed ? d + " Z" : d;
}

export function pointInPolygon(pt: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersects = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function bounds(poly: Point[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function centroid(poly: Point[]): Point {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j].x * poly[i].y - poly[i].x * poly[j].y;
    a += f;
    cx += (poly[j].x + poly[i].x) * f;
    cy += (poly[j].y + poly[i].y) * f;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) return poly[0] ?? { x: 0, y: 0 };
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/** Distância mínima de um ponto a uma polilinha (para afastar cenário de estradas). */
export function distanceToPolyline(pt: Point, pts: Point[]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const len2 = vx * vx + vy * vy || 1e-9;
    let t = ((pt.x - a.x) * vx + (pt.y - a.y) * vy) / len2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(pt.x - (a.x + vx * t), pt.y - (a.y + vy * t));
    if (d < best) best = d;
  }
  return best;
}
