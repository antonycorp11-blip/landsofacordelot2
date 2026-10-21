import { clamp, lerp } from "../core/math";

export class Camera {
  x = 0;
  y = 0;
  zoom = 13;
  targetZoom = 13;
  /** Tamanho da viewport em pixels CSS. */
  w = 800;
  h = 600;
  minZoom = 0.55;
  maxZoom = 34;
  private shakeT = 0;

  follow(tx: number, ty: number, vx: number, vy: number, dt: number): void {
    const lead = 1.1;
    const gx = tx + vx * lead;
    const gy = ty + vy * lead;
    const k = 1 - Math.exp(-dt * 4.5);
    this.x = lerp(this.x, gx, k);
    this.y = lerp(this.y, gy, k);
    this.zoom = lerp(this.zoom, this.targetZoom, 1 - Math.exp(-dt * 6));
    this.shakeT = Math.max(0, this.shakeT - dt);
  }

  snap(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  zoomBy(f: number): void {
    this.targetZoom = clamp(this.targetZoom * f, this.minZoom, this.maxZoom);
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - this.x) * this.zoom + this.w / 2, y: (wy - this.y) * this.zoom + this.h / 2 };
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.w / 2) / this.zoom + this.x, y: (sy - this.h / 2) / this.zoom + this.y };
  }

  /** Retângulo visível no mundo. */
  view(pad = 0): { minX: number; minY: number; maxX: number; maxY: number } {
    const hw = this.w / 2 / this.zoom + pad;
    const hh = this.h / 2 / this.zoom + pad;
    return { minX: this.x - hw, minY: this.y - hh, maxX: this.x + hw, maxY: this.y + hh };
  }
}
