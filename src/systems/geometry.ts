import { localToWorld, type Vec2 } from "../core/math";
import type { Implement, Vehicle, WorkBar } from "../world/entities";

/** Ponto de engate traseiro do veículo, no mundo. */
export function hitchPoint(v: Vehicle): Vec2 {
  const hx = v.def.hitch?.x ?? -v.def.length / 2;
  return localToWorld(v.x, v.y, v.heading, hx, 0);
}

/** Barra de trabalho de um implemento (linha perpendicular à sua direção). */
export function implementBar(im: Implement): WorkBar {
  const d = im.def.workLineFromHitch;
  const hw = im.def.workWidth / 2;
  const c = Math.cos(im.heading);
  const s = Math.sin(im.heading);
  const cx = im.x - c * d;
  const cy = im.y - s * d;
  // direita = (-sin, cos)
  return { lx: cx + s * hw, ly: cy - c * hw, rx: cx - s * hw, ry: cy + c * hw };
}

/** Barra da plataforma de corte da colheitadeira. */
export function headerBar(v: Vehicle): WorkBar {
  const cb = v.def.combine!;
  const d = v.def.length / 2 + cb.headerDepth * 0.55;
  const hw = cb.headerWidth / 2;
  const c = Math.cos(v.heading);
  const s = Math.sin(v.heading);
  const cx = v.x + c * d;
  const cy = v.y + s * d;
  return { lx: cx + s * hw, ly: cy - c * hw, rx: cx - s * hw, ry: cy + c * hw };
}

/** Ângulo local do tubo de descarga (π = recolhido para trás, 3π/2 = estendido à esquerda). */
export function pipeLocalAngle(v: Vehicle): number {
  return Math.PI + v.pipeAnim * (Math.PI / 2);
}

export function pipeOutlet(v: Vehicle): Vec2 {
  const cb = v.def.combine!;
  const a = pipeLocalAngle(v);
  const px = cb.pipePivotX;
  const py = -v.def.width * 0.32;
  return localToWorld(v.x, v.y, v.heading, px + Math.cos(a) * cb.pipeLength, py + Math.sin(a) * cb.pipeLength);
}

export interface Bed {
  cx: number;
  cy: number;
  heading: number;
  halfL: number;
  halfW: number;
  /** Ponto de despejo (traseira da caçamba). */
  tip: Vec2;
}

export function trailerBed(im: Implement): Bed {
  const bedLen = im.def.length - 1.6;
  const mid = 1.6 + bedLen / 2;
  const c = Math.cos(im.heading);
  const s = Math.sin(im.heading);
  return {
    cx: im.x - c * mid,
    cy: im.y - s * mid,
    heading: im.heading,
    halfL: bedLen / 2,
    halfW: im.def.width / 2,
    tip: { x: im.x - c * (im.def.length + 0.4), y: im.y - s * (im.def.length + 0.4) },
  };
}

export function truckBed(v: Vehicle): Bed {
  const front = v.def.body.cabinBack - 0.3;
  const back = -v.def.length / 2;
  const mid = (front + back) / 2;
  const p = localToWorld(v.x, v.y, v.heading, mid, 0);
  return { cx: p.x, cy: p.y, heading: v.heading, halfL: (front - back) / 2, halfW: v.def.width / 2, tip: localToWorld(v.x, v.y, v.heading, back - 0.4, 0) };
}

export function pointInBed(b: Bed, x: number, y: number, pad = 0): boolean {
  const c = Math.cos(b.heading);
  const s = Math.sin(b.heading);
  const dx = x - b.cx;
  const dy = y - b.cy;
  const lx = dx * c + dy * s;
  const ly = -dx * s + dy * c;
  return Math.abs(lx) <= b.halfL + pad && Math.abs(ly) <= b.halfW + pad;
}

/** Círculos de colisão do veículo em coordenadas locais. */
export function vehicleCircles(v: Vehicle): { x: number; r: number }[] {
  const L = v.def.length;
  const W = v.def.width;
  const r = W * 0.46;
  const n = Math.max(2, Math.ceil(L / (r * 1.4)));
  const out: { x: number; r: number }[] = [];
  for (let i = 0; i < n; i++) out.push({ x: -L / 2 + r + ((L - 2 * r) * i) / (n - 1), r });
  return out;
}

export function barMid(b: WorkBar): Vec2 {
  return { x: (b.lx + b.rx) / 2, y: (b.ly + b.ry) / 2 };
}
