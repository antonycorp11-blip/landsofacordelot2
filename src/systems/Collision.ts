import { clamp, type Vec2 } from "../core/math";
import type { GameMap } from "../world/MapGen";

interface CircleOb {
  kind: 0;
  x: number;
  y: number;
  r: number;
}
interface BoxOb {
  kind: 1;
  x: number;
  y: number;
  hw: number;
  hh: number;
  rot: number;
}
interface SegOb {
  kind: 2;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}
type Obstacle = CircleOb | BoxOb | SegOb;

const CELL = 20;

/** Colisões estáticas simplificadas com hash espacial. */
export class StaticCollision {
  private grid = new Map<number, Obstacle[]>();

  constructor(map: GameMap) {
    for (const t of map.trees) this.add({ kind: 0, x: t.x, y: t.y, r: 0.55 + t.r * 0.12 }, t.x - 2, t.y - 2, t.x + 2, t.y + 2);
    for (const b of map.buildings) {
      if (!b.def.collide) continue;
      if (b.def.kind === "silo") {
        const r = b.def.w / 2;
        this.add({ kind: 0, x: b.x, y: b.y, r }, b.x - r, b.y - r, b.x + r, b.y + r);
      } else {
        const ext = Math.hypot(b.def.w, b.def.h) / 2;
        this.add({ kind: 1, x: b.x, y: b.y, hw: b.def.w / 2, hh: b.def.h / 2, rot: b.rot }, b.x - ext, b.y - ext, b.x + ext, b.y + ext);
      }
    }
    for (const f of map.fences) {
      for (let i = 1; i < f.pts.length; i++) {
        const a = f.pts[i - 1];
        const b = f.pts[i];
        this.add({ kind: 2, ax: a.x, ay: a.y, bx: b.x, by: b.y }, Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y));
      }
    }
    for (const p of map.ponds) {
      // elipse aproximada por círculos
      const c = Math.cos(p.rot);
      const s = Math.sin(p.rot);
      const n = 7;
      for (let k = 0; k < n; k++) {
        const t = (k / (n - 1) - 0.5) * 2 * (p.rx - p.ry * 0.6);
        const x = p.x + t * c;
        const y = p.y + t * s;
        const r = p.ry * Math.sqrt(Math.max(0.2, 1 - (t / p.rx) ** 2));
        this.add({ kind: 0, x, y, r }, x - r, y - r, x + r, y + r);
      }
    }
  }

  private add(o: Obstacle, x0: number, y0: number, x1: number, y1: number): void {
    for (let gy = Math.floor(y0 / CELL); gy <= Math.floor(y1 / CELL); gy++) {
      for (let gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx++) {
        const k = gy * 1000 + gx;
        let arr = this.grid.get(k);
        if (!arr) this.grid.set(k, (arr = []));
        arr.push(o);
      }
    }
  }

  /** Empurra um círculo para fora dos obstáculos. Retorna o vetor de correção. */
  resolveCircle(x: number, y: number, r: number): Vec2 {
    let px = 0;
    let py = 0;
    const gx = Math.floor(x / CELL);
    const gy = Math.floor(y / CELL);
    const seen = new Set<Obstacle>();
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const arr = this.grid.get((gy + oy) * 1000 + gx + ox);
        if (!arr) continue;
        for (const o of arr) {
          if (seen.has(o)) continue;
          seen.add(o);
          const cx = x + px;
          const cy = y + py;
          let nx = 0;
          let ny = 0;
          let pen = 0;
          if (o.kind === 0) {
            const dx = cx - o.x;
            const dy = cy - o.y;
            const d = Math.hypot(dx, dy);
            if (d < o.r + r && d > 1e-6) {
              pen = o.r + r - d;
              nx = dx / d;
              ny = dy / d;
            }
          } else if (o.kind === 1) {
            const c = Math.cos(o.rot);
            const s = Math.sin(o.rot);
            const lx = (cx - o.x) * c + (cy - o.y) * s;
            const ly = -(cx - o.x) * s + (cy - o.y) * c;
            const qx = clamp(lx, -o.hw, o.hw);
            const qy = clamp(ly, -o.hh, o.hh);
            let dx = lx - qx;
            let dy = ly - qy;
            let d = Math.hypot(dx, dy);
            if (d < 1e-6) {
              // centro dentro da caixa: sai pelo lado mais próximo
              const ex = o.hw - Math.abs(lx);
              const ey = o.hh - Math.abs(ly);
              if (ex < ey) {
                dx = Math.sign(lx) || 1;
                dy = 0;
                pen = ex + r;
              } else {
                dx = 0;
                dy = Math.sign(ly) || 1;
                pen = ey + r;
              }
              d = 1;
            } else if (d < r) pen = r - d;
            if (pen > 0) {
              const lnx = dx / d;
              const lny = dy / d;
              nx = lnx * c - lny * s;
              ny = lnx * s + lny * c;
            }
          } else {
            const ex = o.bx - o.ax;
            const ey = o.by - o.ay;
            const len2 = ex * ex + ey * ey;
            const t = clamp(((cx - o.ax) * ex + (cy - o.ay) * ey) / (len2 || 1), 0, 1);
            const qx = o.ax + ex * t;
            const qy = o.ay + ey * t;
            const dx = cx - qx;
            const dy = cy - qy;
            const d = Math.hypot(dx, dy);
            const rr = r + 0.15;
            if (d < rr && d > 1e-6) {
              pen = rr - d;
              nx = dx / d;
              ny = dy / d;
            }
          }
          if (pen > 0) {
            px += nx * pen;
            py += ny * pen;
          }
        }
      }
    }
    return { x: px, y: py };
  }
}
