import { BALANCE } from "../config/balance";
import { pointInPolygon, polygonArea, polygonBounds, type Vec2 } from "../core/math";
import { cropByIndex } from "../data/crops";
import type { WorkOp } from "../data/machines";

/** Estados de solo de cada célula. */
export const ST = {
  Raw: 0,
  Cultivated: 1,
  Plowed: 2,
  Planted: 3,
  Stubble: 4,
  Withered: 5,
} as const;
export type Stage = (typeof ST)[keyof typeof ST];

export const STAGE_LABEL = ["Não preparado", "Cultivado", "Arado", "Plantado", "Restolho", "Perdido"];

export type OwnerId = string | null;

export interface FieldDef {
  id: number;
  name: string;
  poly: Vec2[];
  owner: OwnerId;
  price: number;
  gate: Vec2;
  gateNode?: number;
}

export interface DirtyRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Grade de simulação de um campo. Cada célula (1 m²) guarda preparo, cultura,
 * crescimento, umidade, fertilidade, ervas, direção da passada e saúde.
 */
export class FieldGrid {
  readonly id: number;
  readonly name: string;
  readonly poly: Vec2[];
  readonly bounds;
  readonly ox: number;
  readonly oy: number;
  readonly w: number;
  readonly h: number;
  readonly n: number;
  readonly mask: Uint8Array;
  readonly maskCount: number;
  readonly areaHa: number;
  readonly gate: Vec2;
  readonly gateNode: number;
  owner: OwnerId;
  price: number;
  leased = false;

  stage: Uint8Array;
  crop: Uint8Array;
  growth: Float32Array;
  moisture: Uint8Array;
  fertility: Uint8Array;
  weeds: Uint8Array;
  dir: Uint8Array;
  health: Uint8Array;
  sprayed: Uint8Array;
  visKey: Uint8Array;

  counts = new Int32Array(6);
  matureCount = 0;
  sprayedCount = 0;
  dirty: DirtyRect | null = null;

  constructor(def: FieldDef) {
    this.id = def.id;
    this.name = def.name;
    this.poly = def.poly;
    this.owner = def.owner;
    this.price = def.price;
    this.gate = def.gate;
    this.gateNode = def.gateNode ?? -1;
    this.bounds = polygonBounds(def.poly);
    const cs = BALANCE.cellSize;
    this.ox = Math.floor(this.bounds.minX / cs) * cs;
    this.oy = Math.floor(this.bounds.minY / cs) * cs;
    this.w = Math.ceil((this.bounds.maxX - this.ox) / cs);
    this.h = Math.ceil((this.bounds.maxY - this.oy) / cs);
    this.n = this.w * this.h;
    this.mask = new Uint8Array(this.n);
    let count = 0;
    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const wx = this.ox + (cx + 0.5) * cs;
        const wy = this.oy + (cy + 0.5) * cs;
        if (pointInPolygon(wx, wy, def.poly)) {
          this.mask[cy * this.w + cx] = 1;
          count++;
        }
      }
    }
    this.maskCount = count;
    this.areaHa = polygonArea(def.poly) / 10000;
    this.stage = new Uint8Array(this.n);
    this.crop = new Uint8Array(this.n);
    this.growth = new Float32Array(this.n);
    this.moisture = new Uint8Array(this.n).fill(140);
    this.fertility = new Uint8Array(this.n).fill(150);
    this.weeds = new Uint8Array(this.n);
    this.dir = new Uint8Array(this.n);
    this.health = new Uint8Array(this.n).fill(255);
    this.sprayed = new Uint8Array(this.n);
    this.visKey = new Uint8Array(this.n).fill(255);
    this.recount();
  }

  cellIndexAt(wx: number, wy: number): number {
    const cs = BALANCE.cellSize;
    const cx = Math.floor((wx - this.ox) / cs);
    const cy = Math.floor((wy - this.oy) / cs);
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return -1;
    const i = cy * this.w + cx;
    return this.mask[i] ? i : -1;
  }

  contains(wx: number, wy: number): boolean {
    return pointInPolygon(wx, wy, this.poly);
  }

  markDirty(cx: number, cy: number): void {
    const d = this.dirty;
    if (!d) this.dirty = { x0: cx, y0: cy, x1: cx, y1: cy };
    else {
      if (cx < d.x0) d.x0 = cx;
      if (cy < d.y0) d.y0 = cy;
      if (cx > d.x1) d.x1 = cx;
      if (cy > d.y1) d.y1 = cy;
    }
  }

  markAllDirty(): void {
    this.dirty = { x0: 0, y0: 0, x1: this.w - 1, y1: this.h - 1 };
  }

  recount(): void {
    this.counts.fill(0);
    this.matureCount = 0;
    this.sprayedCount = 0;
    for (let i = 0; i < this.n; i++) {
      if (!this.mask[i]) continue;
      this.counts[this.stage[i]]++;
      if (this.stage[i] === ST.Planted && this.growth[i] >= 1) this.matureCount++;
      if (this.sprayed[i]) this.sprayedCount++;
    }
  }

  setStage(i: number, s: Stage): void {
    const old = this.stage[i];
    if (old === s) return;
    if (this.mask[i]) {
      this.counts[old]--;
      this.counts[s]++;
    }
    this.stage[i] = s;
  }

  /** Preenche o campo inteiro com um estado (geração inicial / testes). */
  fill(stage: Stage, cropIndex = 0, growth = 0): void {
    for (let i = 0; i < this.n; i++) {
      this.stage[i] = stage;
      this.crop[i] = cropIndex;
      this.growth[i] = growth;
      this.sprayed[i] = 0;
      this.weeds[i] = stage === ST.Raw ? 120 : 0;
    }
    this.recount();
    this.markAllDirty();
  }

  /** Estado dominante para exibição em menus. */
  summary(): { stage: Stage; cropIndex: number; growth: number } {
    let best: Stage = ST.Raw;
    for (let s = 0; s < 6; s++) if (this.counts[s] > this.counts[best]) best = s as Stage;
    let cropIndex = 0;
    let g = 0;
    let k = 0;
    if (best === ST.Planted || best === ST.Stubble) {
      const tally = [0, 0, 0, 0];
      for (let i = 0; i < this.n; i += 7) {
        if (!this.mask[i] || this.stage[i] !== best) continue;
        tally[this.crop[i]]++;
        g += this.growth[i];
        k++;
      }
      cropIndex = tally.indexOf(Math.max(...tally));
    }
    return { stage: best, cropIndex, growth: k ? g / k : 0 };
  }
}

/** Indica se a célula ainda precisa da operação. */
export function needsWork(f: FieldGrid, i: number, op: WorkOp): boolean {
  const s = f.stage[i];
  switch (op) {
    case "cultivate":
      return s !== ST.Cultivated && s !== ST.Planted;
    case "plow":
      return s !== ST.Plowed && s !== ST.Planted;
    case "plant":
      return s === ST.Cultivated || s === ST.Plowed;
    case "spray":
      return !f.sprayed[i] && (s === ST.Planted || s === ST.Cultivated || s === ST.Plowed);
    case "harvest":
      return s === ST.Planted && f.growth[i] >= 1;
  }
}

/** Percentual concluído da operação no campo (0..1). */
export function opProgress(f: FieldGrid, op: WorkOp): number {
  const c = f.counts;
  const total = f.maskCount || 1;
  switch (op) {
    case "cultivate":
      return (c[ST.Cultivated] + c[ST.Planted]) / total;
    case "plow":
      return (c[ST.Plowed] + c[ST.Planted]) / total;
    case "plant":
      return c[ST.Planted] / Math.max(1, c[ST.Planted] + c[ST.Cultivated] + c[ST.Plowed]);
    case "spray":
      return f.sprayedCount / Math.max(1, c[ST.Planted] + c[ST.Cultivated] + c[ST.Plowed]);
    case "harvest": {
      const remaining = f.matureCount;
      const done = c[ST.Stubble];
      return done + remaining === 0 ? 0 : done / (done + remaining);
    }
  }
}

/** Fator de produtividade de uma célula madura. */
export function cellYieldFactor(f: FieldGrid, i: number): number {
  const health = f.health[i] / 255;
  const fert = 0.6 + 0.4 * (f.fertility[i] / 255);
  const weeds = 1 - (f.weeds[i] / 255) * 0.5;
  const late = Math.max(0, f.growth[i] - 1.1);
  const overripe = Math.max(0, 1 - (late / 0.25) * BALANCE.overripeLossPerDay);
  return health * fert * weeds * overripe;
}

export function cellHarvestKg(f: FieldGrid, i: number): number {
  const crop = cropByIndex(f.crop[i]);
  if (!crop) return 0;
  const area = BALANCE.cellSize * BALANCE.cellSize;
  return (crop.yieldKgPerHa * area) / 10000 * cellYieldFactor(f, i);
}

export interface WorkParams {
  cropIndex?: number;
  /** Direção da passada (rad), usada para orientar sulcos e fileiras. */
  heading: number;
  /** Capacidade restante (kg) para colheita, sementes (kg) ou líquido (L). */
  capacity?: number;
}

export interface WorkResult {
  cells: number;
  kg: number;
  cropIndex: number;
  seedKg: number;
  liquidL: number;
  blocked: boolean;
}

function dirByte(heading: number): number {
  let a = heading % Math.PI;
  if (a < 0) a += Math.PI;
  return Math.floor((a / Math.PI) * 255) & 255;
}

export function dirFromByte(b: number): number {
  return (b / 255) * Math.PI;
}

/** Aplica a operação a uma única célula. Retorna true se a célula mudou. Função pura sobre os arrays. */
export function applyCell(f: FieldGrid, i: number, op: WorkOp, p: WorkParams, out: WorkResult): boolean {
  const s = f.stage[i];
  const area = BALANCE.cellSize * BALANCE.cellSize;
  switch (op) {
    case "cultivate":
      if (s === ST.Cultivated) return false;
      if (s === ST.Planted && f.growth[i] >= 1) f.matureCount--;
      f.setStage(i, ST.Cultivated);
      f.crop[i] = 0;
      f.growth[i] = 0;
      f.weeds[i] = 0;
      if (s === ST.Stubble || s === ST.Withered) f.fertility[i] = Math.min(255, f.fertility[i] + 4);
      if (f.sprayed[i] && s === ST.Planted) {
        f.sprayed[i] = 0;
        f.sprayedCount--;
      }
      f.dir[i] = dirByte(p.heading);
      return true;
    case "plow":
      if (s === ST.Plowed) return false;
      if (s === ST.Planted && f.growth[i] >= 1) f.matureCount--;
      if (f.sprayed[i] && s === ST.Planted) {
        f.sprayed[i] = 0;
        f.sprayedCount--;
      }
      f.setStage(i, ST.Plowed);
      f.crop[i] = 0;
      f.growth[i] = 0;
      f.weeds[i] = 0;
      f.fertility[i] = Math.min(255, f.fertility[i] + (s === ST.Stubble || s === ST.Withered ? 12 : 3));
      f.dir[i] = dirByte(p.heading);
      return true;
    case "plant": {
      if (s !== ST.Cultivated && s !== ST.Plowed) return false;
      const crop = cropByIndex(p.cropIndex ?? 0);
      if (!crop) return false;
      const seed = (crop.seedKgPerHa * area) / 10000;
      if (p.capacity !== undefined && out.seedKg + seed > p.capacity) {
        out.blocked = true;
        return false;
      }
      out.seedKg += seed;
      f.setStage(i, ST.Planted);
      f.crop[i] = crop.index;
      f.growth[i] = 0;
      f.health[i] = s === ST.Plowed ? 225 : 255;
      f.dir[i] = dirByte(p.heading);
      out.cropIndex = crop.index;
      return true;
    }
    case "spray": {
      if (f.sprayed[i] || (s !== ST.Planted && s !== ST.Cultivated && s !== ST.Plowed)) return false;
      const l = (BALANCE.fertilizerLPerHa * area) / 10000;
      if (p.capacity !== undefined && out.liquidL + l > p.capacity) {
        out.blocked = true;
        return false;
      }
      out.liquidL += l;
      f.sprayed[i] = 1;
      f.sprayedCount++;
      f.fertility[i] = Math.min(255, f.fertility[i] + 70);
      return true;
    }
    case "harvest": {
      if (s !== ST.Planted || f.growth[i] < 1) return false;
      const kg = cellHarvestKg(f, i);
      if (p.capacity !== undefined && out.kg + kg > p.capacity) {
        out.blocked = true;
        return false;
      }
      if (out.cropIndex && out.cropIndex !== f.crop[i]) {
        // Uma única passada só pode levar um tipo de grão no tanque.
        out.blocked = true;
        return false;
      }
      out.kg += kg;
      out.cropIndex = f.crop[i];
      f.matureCount--;
      f.setStage(i, ST.Stubble);
      f.growth[i] = 0;
      if (f.sprayed[i]) {
        f.sprayed[i] = 0;
        f.sprayedCount--;
      }
      f.fertility[i] = Math.max(60, f.fertility[i] - 40);
      f.dir[i] = dirByte(p.heading);
      return true;
    }
  }
}

/**
 * Aplica a operação a todas as células cujo centro está dentro do quadrilátero varrido pela
 * barra de trabalho entre duas posições. Retorna o que foi consumido/colhido.
 */
export function applyWork(f: FieldGrid, op: WorkOp, quad: readonly Vec2[], p: WorkParams): WorkResult {
  const out: WorkResult = { cells: 0, kg: 0, cropIndex: p.cropIndex && op === "plant" ? p.cropIndex : 0, seedKg: 0, liquidL: 0, blocked: false };
  if (op === "harvest") out.cropIndex = p.cropIndex ?? 0;
  const cs = BALANCE.cellSize;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const q of quad) {
    if (q.x < minX) minX = q.x;
    if (q.y < minY) minY = q.y;
    if (q.x > maxX) maxX = q.x;
    if (q.y > maxY) maxY = q.y;
  }
  const cx0 = Math.max(0, Math.floor((minX - f.ox) / cs));
  const cy0 = Math.max(0, Math.floor((minY - f.oy) / cs));
  const cx1 = Math.min(f.w - 1, Math.floor((maxX - f.ox) / cs));
  const cy1 = Math.min(f.h - 1, Math.floor((maxY - f.oy) / cs));
  for (let cy = cy0; cy <= cy1; cy++) {
    const wy = f.oy + (cy + 0.5) * cs;
    for (let cx = cx0; cx <= cx1; cx++) {
      const i = cy * f.w + cx;
      if (!f.mask[i]) continue;
      const wx = f.ox + (cx + 0.5) * cs;
      if (!pointInPolygon(wx, wy, quad)) continue;
      if (applyCell(f, i, op, p, out)) {
        out.cells++;
        f.markDirty(cx, cy);
      }
    }
  }
  return out;
}

/** Faixa visual de crescimento (0..6) usada para decidir redesenho. */
export function growthBand(g: number): number {
  if (g < 0.08) return 0;
  if (g < 0.25) return 1;
  if (g < 0.5) return 2;
  if (g < 0.8) return 3;
  if (g < 1) return 4;
  if (g < 1.3) return 5;
  return 6;
}

export function wetBand(m: number): number {
  return m < 110 ? 0 : m < BALANCE.wetMoisture ? 1 : 2;
}

export function visualKey(f: FieldGrid, i: number): number {
  const s = f.stage[i];
  const g = s === ST.Planted ? growthBand(f.growth[i]) : 0;
  return (s << 5) | (g << 2) | wetBand(f.moisture[i]);
}
