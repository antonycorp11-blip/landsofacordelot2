import { angleDiff, clamp, dist, wrapAngle, type Vec2 } from "../core/math";
import { CROPS, cropByIndex, type CropId } from "../data/crops";
import type { Implement, Vehicle, WorkBar } from "../world/entities";
import type { World } from "../world/World";
import { applyWork, ST } from "./FieldSystem";
import { barMid, headerBar, hitchPoint, implementBar, pipeOutlet, pointInBed, trailerBed, truckBed, type Bed } from "./geometry";
import { canAccept, cargoAdd, cargoRemove } from "./Storage";
import type { Cargo } from "../world/types";

export interface AttachCheck {
  implement?: Implement;
  reason?: string;
}

/** Procura um implemento cujo ponto de engate esteja próximo do engate do veículo. */
export function findAttachable(world: World, v: Vehicle): AttachCheck {
  if (!v.def.hitch || v.implementId !== null) return {};
  const h = hitchPoint(v);
  let best: Implement | undefined;
  let bd = 2.2;
  for (const im of world.implements) {
    if (im.attachedTo !== null) continue;
    const d = dist(h, im);
    if (d < bd) {
      bd = d;
      best = im;
    }
  }
  if (!best) return {};
  if (Math.abs(angleDiff(v.heading, best.heading)) > 1.1) return { implement: best, reason: "Alinhe o trator com o implemento" };
  if (!v.def.hitch.types.includes(best.def.hitch)) return { implement: best, reason: "Engate incompatível" };
  if (best.def.powerHp > v.def.powerHp) return { implement: best, reason: `Potência insuficiente (${best.def.powerHp} cv)` };
  if (best.owner !== v.owner) return { implement: best, reason: "Implemento de outro proprietário" };
  return { implement: best };
}

export function attach(v: Vehicle, im: Implement): void {
  v.implementId = im.id;
  im.attachedTo = v.id;
  im.lowered = false;
  im.lastBar = null;
  follow(v, im, true);
}

export function detach(world: World, v: Vehicle): Implement | undefined {
  const im = world.implement(v.implementId);
  if (!im) return undefined;
  im.attachedTo = null;
  im.lowered = false;
  im.tipping = false;
  im.lastBar = null;
  v.implementId = null;
  return im;
}

/** Cinemática do engate: 3 pontos é rígido; barra de tração segue como reboque (tractrix). */
export function follow(v: Vehicle, im: Implement, snap = false): void {
  const h = hitchPoint(v);
  if (im.def.hitch === "3pt" || snap) {
    const prevX = im.x;
    const prevY = im.y;
    im.x = h.x;
    im.y = h.y;
    if (im.def.hitch === "3pt" || snap) im.heading = v.heading;
    im.wheelDist += Math.hypot(h.x - prevX, h.y - prevY) * Math.sign(v.speed || 1);
    return;
  }
  const L = im.def.drawbar;
  const ax = im.x - Math.cos(im.heading) * L;
  const ay = im.y - Math.sin(im.heading) * L;
  let dx = h.x - ax;
  let dy = h.y - ay;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  let heading = Math.atan2(dy, dx);
  // limita o canivete
  const rel = angleDiff(heading, v.heading);
  const maxRel = 1.35;
  if (Math.abs(rel) > maxRel) heading = wrapAngle(v.heading + Math.sign(rel) * maxRel);
  const moved = Math.hypot(h.x - im.x, h.y - im.y);
  im.wheelDist += moved * Math.sign(v.speed || 1);
  im.heading = heading;
  im.x = h.x;
  im.y = h.y;
}

function quadOf(a: WorkBar, b: WorkBar): Vec2[] {
  return [
    { x: a.lx, y: a.ly },
    { x: a.rx, y: a.ry },
    { x: b.rx, y: b.ry },
    { x: b.lx, y: b.ly },
  ];
}

export function canWorkField(owner: string, fieldOwner: string | null): boolean {
  return fieldOwner === owner;
}

export interface WorkTickResult {
  cells: number;
  blockedReason?: string;
}

/** Aplica o trabalho do implemento no solo ao longo da faixa varrida desde o último passo. */
export function implementWork(world: World, v: Vehicle, im: Implement): WorkTickResult {
  const op = im.def.op;
  if (!op || !im.lowered || im.lowerAnim < 0.9 || !v.engineOn || v.speed < 0.2) {
    im.lastBar = null;
    return { cells: 0 };
  }
  if (op === "plant" && im.seedKg <= 0.001) return { cells: 0, blockedReason: "Sem sementes" };
  if (op === "spray" && im.liquidL <= 0.001) return { cells: 0, blockedReason: "Sem adubo" };
  const bar = implementBar(im);
  if (!im.lastBar) {
    im.lastBar = bar;
    return { cells: 0 };
  }
  const m0 = barMid(im.lastBar);
  const m1 = barMid(bar);
  if (Math.hypot(m1.x - m0.x, m1.y - m0.y) < 0.4) return { cells: 0 };
  const quad = quadOf(im.lastBar, bar);
  im.lastBar = bar;
  let cells = 0;
  let notOwned = false;
  for (const f of world.fields) {
    const b = f.bounds;
    if (Math.max(m0.x, m1.x) + im.def.workWidth < b.minX || Math.min(m0.x, m1.x) - im.def.workWidth > b.maxX) continue;
    if (Math.max(m0.y, m1.y) + im.def.workWidth < b.minY || Math.min(m0.y, m1.y) - im.def.workWidth > b.maxY) continue;
    if (!canWorkField(v.owner, f.owner)) {
      if (f.contains(m1.x, m1.y)) notOwned = true;
      continue;
    }
    const res = applyWork(f, op, quad, {
      heading: im.heading,
      cropIndex: op === "plant" ? CROPS[im.seedCrop].index : undefined,
      capacity: op === "plant" ? im.seedKg : op === "spray" ? im.liquidL : undefined,
    });
    im.seedKg = Math.max(0, im.seedKg - res.seedKg);
    im.liquidL = Math.max(0, im.liquidL - res.liquidL);
    cells += res.cells;
  }
  if (cells > 0) {
    im.wear = Math.min(1, im.wear + (im.def.wearPerHa * cells) / 10000);
  }
  return { cells, blockedReason: notOwned ? "Campo de outro proprietário" : undefined };
}

/** Corte da plataforma: colhe as células maduras e enche o tanque. */
export function combineWork(world: World, v: Vehicle): WorkTickResult & { kg: number; crop?: CropId } {
  if (!v.def.combine || !v.cargo || !v.lowered || !v.engineOn || v.speed < 0.2) {
    v.lastBar = null;
    return { cells: 0, kg: 0 };
  }
  const free = v.cargo.capacity - v.cargo.kg;
  if (free < 1) return { cells: 0, kg: 0, blockedReason: "Tanque cheio" };
  const bar = headerBar(v);
  if (!v.lastBar) {
    v.lastBar = bar;
    return { cells: 0, kg: 0 };
  }
  const m0 = barMid(v.lastBar);
  const m1 = barMid(bar);
  if (Math.hypot(m1.x - m0.x, m1.y - m0.y) < 0.4) return { cells: 0, kg: 0 };
  const quad = quadOf(v.lastBar, bar);
  v.lastBar = bar;
  let cells = 0;
  let kg = 0;
  let crop: CropId | undefined;
  let reason: string | undefined;
  for (const f of world.fields) {
    const b = f.bounds;
    const W = v.def.combine.headerWidth;
    if (Math.max(m0.x, m1.x) + W < b.minX || Math.min(m0.x, m1.x) - W > b.maxX) continue;
    if (Math.max(m0.y, m1.y) + W < b.minY || Math.min(m0.y, m1.y) - W > b.maxY) continue;
    if (!canWorkField(v.owner, f.owner)) {
      if (f.contains(m1.x, m1.y)) reason = "Campo de outro proprietário";
      continue;
    }
    const tankCrop = v.cargo.kg > 0.01 && v.cargo.cropId ? CROPS[v.cargo.cropId].index : undefined;
    const res = applyWork(f, "harvest", quad, { heading: v.heading, capacity: v.cargo.capacity - v.cargo.kg, cropIndex: tankCrop });
    if (res.kg > 0 && res.cropIndex) {
      const c = cropByIndex(res.cropIndex)!;
      cargoAdd(v.cargo, c.id, res.kg);
      crop = c.id;
      kg += res.kg;
    }
    if (res.blocked && res.kg === 0 && tankCrop && f.matureCount > 0) reason = "Grão diferente no tanque";
    cells += res.cells;
  }
  return { cells, kg, crop, blockedReason: reason };
}

export interface ContainerRef {
  cargo: Cargo;
  bed: Bed;
  owner: string;
  implement?: Implement;
  vehicle?: Vehicle;
}

/** Todos os recipientes de grão que podem receber descarga (carretas e caminhões). */
export function containers(world: World): ContainerRef[] {
  const out: ContainerRef[] = [];
  for (const im of world.implements) if (im.cargo) out.push({ cargo: im.cargo, bed: trailerBed(im), owner: im.owner, implement: im });
  for (const v of world.vehicles) if (v.cargo && v.def.category === "truck") out.push({ cargo: v.cargo, bed: truckBed(v), owner: v.owner, vehicle: v });
  return out;
}

export function containerUnderPipe(world: World, v: Vehicle): ContainerRef | undefined {
  if (!v.def.combine) return undefined;
  const o = pipeOutlet(v);
  for (const c of containers(world)) {
    if (c.implement?.attachedTo === v.id) continue;
    if (pointInBed(c.bed, o.x, o.y, 0.35)) return c;
  }
  return undefined;
}

/** Descarga pelo tubo da colheitadeira. Retorna kg transferidos. */
export function pipeUnload(world: World, v: Vehicle, dt: number): number {
  v.pipeAnim = clamp(v.pipeAnim + (v.pipeOut ? dt * 0.7 : -dt * 0.9), 0, 1);
  v.unloading = false;
  if (!v.cargo || v.pipeAnim < 0.97 || v.cargo.kg <= 0 || !v.cargo.cropId) return 0;
  const target = containerUnderPipe(world, v);
  if (!target || !canAccept(target.cargo, v.cargo.cropId)) return 0;
  const crop = v.cargo.cropId;
  const amount = Math.min(v.def.combine!.unloadKgS * dt, v.cargo.kg);
  const took = cargoAdd(target.cargo, crop, amount);
  cargoRemove(v.cargo, took);
  if (took > 0) {
    v.unloading = true;
    const o = pipeOutlet(v);
    const col = CROPS[crop].colors.grain;
    for (let k = 0; k < 2; k++) world.fx.grain(o.x, o.y, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, col);
  }
  return took;
}

/** Destino de um despejo de caçamba a partir do ponto traseiro. */
export function tipTarget(world: World, bed: Bed, owner: string): { kind: "sell" | "silo"; buyerId?: string; label: string } | undefined {
  const z = world.zoneAt(bed.tip.x, bed.tip.y, "sell") ?? world.zoneAt(bed.cx, bed.cy, "sell");
  if (z) return { kind: "sell", buyerId: z.buyerId, label: z.label };
  const s = world.zoneAt(bed.tip.x, bed.tip.y, "silo") ?? world.zoneAt(bed.cx, bed.cy, "silo");
  if (s && s.owner === owner) return { kind: "silo", label: s.label };
  return undefined;
}

/** Animação de basculamento e transferência para moega (venda) ou silo. */
export function updateTipping(world: World, c: ContainerRef, dt: number): void {
  const holder = c.implement ?? c.vehicle!;
  const target = holder.tipping ? tipTarget(world, c.bed, c.owner) : undefined;
  if (holder.tipping && (!target || c.cargo.kg <= 0)) holder.tipping = false;
  holder.tip = clamp(holder.tip + (holder.tipping ? dt * 0.6 : -dt * 0.8), 0, 1);
  if (!holder.tipping || holder.tip < 0.7 || !target || !c.cargo.cropId) return;
  const crop = c.cargo.cropId;
  const rate = 650 * dt;
  let moved = 0;
  if (target.kind === "sell" && target.buyerId) {
    const buyer = world.map.buyers.find((b) => b.id === target.buyerId);
    if (!buyer?.accepts.includes(crop)) {
      holder.tipping = false;
      if (c.owner === "player") world.notify(`${buyer?.name ?? "Comprador"} não compra ${CROPS[crop].name}`, "warn");
      return;
    }
    moved = cargoRemove(c.cargo, rate);
    if (c.owner === "player") world.economy.sell(target.buyerId, crop, moved, world.time);
    else {
      const npc = world.npcs.find((n) => n.owner === c.owner);
      if (npc) npc.cash += moved * world.economy.price(target.buyerId, crop, world.time);
    }
  } else {
    const st = c.owner === "player" ? world.storage : world.npcStorage[c.owner];
    if (!st) return;
    const room = st.free();
    if (room <= 0) {
      holder.tipping = false;
      if (c.owner === "player") world.notify("Silo cheio", "warn");
      return;
    }
    moved = cargoRemove(c.cargo, Math.min(rate, room));
    st.add(crop, moved);
  }
  if (moved > 0) {
    const col = CROPS[crop].colors.grain;
    world.fx.grain(c.bed.tip.x, c.bed.tip.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, col);
  }
}

/** Carregamento a partir do silo da fazenda. */
export function updateLoading(world: World, c: ContainerRef, dt: number): void {
  const holder = c.implement ?? c.vehicle!;
  if (!holder.loading) return;
  const z = world.zoneAt(c.bed.cx, c.bed.cy, "silo");
  const st = c.owner === "player" ? world.storage : world.npcStorage[c.owner];
  if (!z || z.owner !== c.owner || !st) {
    holder.loading = false;
    return;
  }
  const crop: CropId | undefined = c.cargo.kg > 0.01 && c.cargo.cropId ? c.cargo.cropId : (Object.keys(st.stock) as CropId[]).sort((a, b) => st.stock[b] - st.stock[a])[0];
  if (!crop || st.stock[crop] <= 0 || c.cargo.kg >= c.cargo.capacity - 0.5) {
    holder.loading = false;
    return;
  }
  const amount = Math.min(500 * dt, st.stock[crop]);
  const took = cargoAdd(c.cargo, crop, amount);
  st.remove(crop, took);
  if (took > 0) world.fx.grain(c.bed.cx, c.bed.cy, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, CROPS[crop].colors.grain);
  if (took <= 0) holder.loading = false;
}

export function isOnPreparedSoil(world: World, x: number, y: number): boolean {
  const f = world.fieldAt(x, y);
  if (!f) return false;
  const i = f.cellIndexAt(x, y);
  return i >= 0 && f.stage[i] !== ST.Raw;
}
