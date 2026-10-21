import { BALANCE } from "../config/balance";
import { clamp, closestPointOnSegment, localToWorld, pointInPolygon, worldToLocal, type Vec2 } from "../core/math";
import { Rng } from "../core/rng";
import { CROPS, type CropId } from "../data/crops";
import { OP_LABEL, kmh, ms, type WorkOp } from "../data/machines";
import type { Vehicle } from "../world/entities";
import type { World } from "../world/World";
import type { Candidate, Leg, Worker, WorkerTask } from "../world/workers";
import type { Zone } from "../world/types";
import { FieldGrid, needsWork, opProgress } from "./FieldSystem";
import { planLanes, planTurn, type Lane } from "./LanePlanner";
import { cleanPolyline, routeBetween } from "./Pathfinding";
import { pipeOutlet, vehicleCircles } from "./geometry";
import { containerUnderPipe } from "./ImplementSystem";
import { cargoRemove } from "./Storage";
import { speedLimit } from "./VehicleSystem";

const FIRST = ["Ana", "João", "Marcos", "Luíza", "Paulo", "Rita", "Tiago", "Bruna", "Cláudio", "Sônia", "Diego", "Helena", "Vitor", "Marta", "Rafael", "Iara", "Otávio", "Célia", "Edson", "Lúcia"];
const LAST = ["Prado", "Moreira", "Lima", "Fagundes", "Rocha", "Teixeira", "Barros", "Campos", "Nunes", "Dutra", "Siqueira", "Ramos"];
const SPECIALTIES: WorkOp[] = ["cultivate", "plant", "harvest", "spray", "plow"];

export function generateCandidates(seed: number, day: number, count = BALANCE.candidatesPerDay): Candidate[] {
  const r = new Rng(seed ^ (day * 7919 + 13));
  const out: Candidate[] = [];
  for (let i = 0; i < count; i++) {
    const skill = Math.round(r.range(0.82, 1.18) * 100) / 100;
    out.push({
      name: `${r.pick(FIRST)} ${r.pick(LAST)}`,
      skill,
      specialty: r.pick(SPECIALTIES),
      salary: Math.round(28 + (skill - 0.8) * 70 + r.range(-3, 3)),
    });
  }
  return out;
}

export function hireWorker(world: World, c: Candidate, owner = "player"): Worker {
  const farm = world.farmOf(owner);
  const w: Worker = {
    id: world.id(),
    name: c.name,
    owner,
    salary: c.salary,
    skill: c.skill,
    specialty: c.specialty,
    tasks: [],
    state: "idle",
    vehicleId: null,
    x: farm.x - 30,
    y: farm.y - 30,
    heading: 0,
    walkPhase: 0,
    note: "Disponível na sede",
    legs: [],
    legIdx: 0,
    segIdx: 0,
    errand: "none",
    timer: 0,
    blockedTimer: 0,
    paidSeconds: 0,
    hiredDay: world.time.day,
    stuckT: 0,
    reverseT: 0,
  };
  world.workers.push(w);
  return w;
}

/** Operações possíveis com o conjunto atual do veículo. */
export function opsFor(world: World, v: Vehicle): WorkOp[] {
  if (v.def.combine) return ["harvest"];
  const im = world.implement(v.implementId);
  return im?.def.op ? [im.def.op] : [];
}

export function workGeometry(world: World, v: Vehicle): { width: number; offset: number } | null {
  if (v.def.combine) return { width: v.def.combine.headerWidth, offset: v.def.length / 2 + v.def.combine.headerDepth * 0.55 };
  const im = world.implement(v.implementId);
  if (!im || !im.def.op || !v.def.hitch) return null;
  return { width: im.def.workWidth, offset: v.def.hitch.x - im.def.workLineFromHitch };
}

function turnRadius(world: World, v: Vehicle): number {
  const im = world.implement(v.implementId);
  const steer = ((v.def.maxSteerDeg * 0.8) * Math.PI) / 180;
  return v.def.wheelbase / Math.tan(steer) + (im && im.def.hitch === "drawbar" ? 1.2 : 0.4);
}

export function assignTask(world: World, w: Worker, vehicleId: number, fieldId: number, op: WorkOp, cropId?: CropId): { ok: boolean; reason?: string } {
  const v = world.vehicle(vehicleId);
  const f = world.field(fieldId);
  if (!v || !f) return { ok: false, reason: "Seleção inválida" };
  if (f.owner !== w.owner) return { ok: false, reason: "Campo não pertence à fazenda" };
  if (!opsFor(world, v).includes(op)) return { ok: false, reason: `${v.def.name} não está equipado para ${OP_LABEL[op].toLowerCase()}` };
  const other = world.workers.find((o) => o.id !== w.id && o.tasks.some((t) => (t.status === "active" || t.status === "queued") && t.vehicleId === vehicleId));
  if (other) return { ok: false, reason: `Máquina já reservada para ${other.name}` };
  w.tasks.push({ id: world.id(), vehicleId, fieldId, op, cropId, status: "queued", progress: opProgress(f, op) });
  if (op === "plant" && cropId) {
    const im = world.implement(v.implementId);
    if (im && im.seedKg <= 0.01) im.seedCrop = cropId;
  }
  return { ok: true };
}

export function activeTask(w: Worker): WorkerTask | undefined {
  return w.tasks.find((t) => t.status === "active");
}

function failTask(world: World, w: Worker, t: WorkerTask, reason: string): void {
  t.status = "failed";
  t.reason = reason;
  w.note = reason;
  if (w.owner === "player") world.notify(`${w.name}: ${reason}`, "warn");
  w.legs = [];
  w.errand = "none";
}

// ---------------------------------------------------------------------------
// Planejamento de rotas e faixas
// ---------------------------------------------------------------------------

function laneNeedsWork(f: FieldGrid, lane: Lane, width: number, op: WorkOp): boolean {
  const dx = lane.edgeEnd.x - lane.edgeStart.x;
  const dy = lane.edgeEnd.y - lane.edgeStart.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return false;
  const nx = -dy / len;
  const ny = dx / len;
  let total = 0;
  let need = 0;
  for (let s = 0.5; s < len; s += 1.5) {
    for (const o of [-0.35, 0, 0.35]) {
      const x = lane.edgeStart.x + (dx / len) * s + nx * o * width;
      const y = lane.edgeStart.y + (dy / len) * s + ny * o * width;
      const i = f.cellIndexAt(x, y);
      if (i < 0) continue;
      total++;
      if (needsWork(f, i, op)) need++;
    }
  }
  return total > 0 && need / total > 0.03 && need >= 2;
}

function roadLeg(world: World, from: Vec2, to: Vec2, goalNode?: number, startNode?: number): Leg {
  const pts = routeBetween(world.map.roads, from, to, startNode, goalNode);
  return { kind: "road", pts, speedKmh: 30 };
}

function insideField(world: World, p: Vec2): FieldGrid | undefined {
  return world.fieldAt(p.x, p.y);
}

/** Rota até um ponto, saindo do campo pelo portão quando necessário. */
function travelLegs(world: World, v: Vehicle, to: Vec2, goalNode?: number, toField?: FieldGrid): Leg[] {
  const from = { x: v.x, y: v.y };
  const here = insideField(world, from);
  const nearGoalField = toField && (pointInPolygon(from.x, from.y, toField.poly) || Math.hypot(from.x - toField.gate.x, from.y - toField.gate.y) < 35);
  if (nearGoalField) return [{ kind: "approach", pts: [from, to], speedKmh: 12 }];
  const startNode = here && here.gateNode >= 0 ? here.gateNode : undefined;
  const legs: Leg[] = [];
  if (here) legs.push({ kind: "approach", pts: [from, here.gate], speedKmh: 12 });
  const start = here ? here.gate : from;
  legs.push(roadLeg(world, start, toField ? toField.gate : to, toField ? toField.gateNode : goalNode, startNode));
  if (toField) legs.push({ kind: "approach", pts: [toField.gate, to], speedKmh: 12 });
  return legs;
}

function zoneTarget(z: Zone): Vec2 {
  return { x: z.x, y: z.y };
}

function serviceLegs(world: World, v: Vehicle, z: Zone): Leg[] {
  const legs = travelLegs(world, v, zoneTarget(z));
  const last = legs[legs.length - 1];
  last.kind = "park";
  last.speedKmh = Math.min(last.speedKmh, 25);
  return legs;
}

/** Ponto do veículo que precisa entrar na zona (implemento para sementes, centro para diesel). */
function serviceProbe(world: World, v: Vehicle, errand: Worker["errand"]): Vec2 {
  if (errand === "seed") {
    const im = world.implement(v.implementId);
    if (im) return localToWorld(im.x, im.y, im.heading, -im.def.length / 2, 0);
  }
  if (errand === "unload" && v.def.combine) return pipeOutlet(v);
  return { x: v.x, y: v.y };
}

function planWork(world: World, w: Worker, v: Vehicle, t: WorkerTask): boolean {
  const f = world.field(t.fieldId)!;
  const geo = workGeometry(world, v);
  if (!geo) {
    failTask(world, w, t, "Máquina sem implemento adequado");
    return false;
  }
  const best = (fromEnd: boolean) => {
    const plan = planLanes(f.poly, { width: geo.width, workOffset: geo.offset, fromEnd });
    const lanes = plan.lanes.filter((l) => laneNeedsWork(f, l, geo.width, t.op));
    return { lanes, d: lanes.length ? Math.hypot(lanes[0].start.x - v.x, lanes[0].start.y - v.y) : Infinity };
  };
  const a = best(false);
  const b = best(true);
  const { lanes } = a.d <= b.d ? a : b;
  if (!lanes.length) return false;
  const legs: Leg[] = [];
  const first = lanes[0];
  const back = { x: first.start.x - Math.cos(first.heading) * 9, y: first.start.y - Math.sin(first.heading) * 9 };
  legs.push(...travelLegs(world, v, back, undefined, f));
  legs.push({ kind: "approach", pts: [back, first.start], speedKmh: 8 });
  const im = world.implement(v.implementId);
  const workKmh = (v.def.combine ? v.def.combine.harvestKmh : im ? im.def.workSpeedKmh : 10) * w.skill * (w.specialty === t.op ? 1.06 : 1);
  const r = turnRadius(world, v);
  for (let i = 0; i < lanes.length; i++) {
    const L = lanes[i];
    legs.push({ kind: "lane", pts: [L.start, L.end], lane: L.index, speedKmh: workKmh });
    const next = lanes[i + 1];
    if (!next) break;
    const opposite = Math.abs(Math.cos(next.heading - L.heading) + 1) < 0.1;
    if (opposite) legs.push({ kind: "turn", pts: planTurn(L.end, L.heading, next.start, r), speedKmh: 7 });
    else {
      // faixas puladas no mesmo sentido: contorno pela cabeceira
      const out = { x: L.end.x + Math.cos(L.heading) * (r * 2 + 3), y: L.end.y + Math.sin(L.heading) * (r * 2 + 3) };
      const pre = { x: next.start.x - Math.cos(next.heading) * (r * 2 + 6), y: next.start.y - Math.sin(next.heading) * (r * 2 + 6) };
      legs.push({ kind: "turn", pts: [L.end, out, pre, next.start], speedKmh: 7 });
    }
  }
  w.legs = legs;
  w.legIdx = 0;
  w.segIdx = 0;
  w.state = "driving";
  w.note = `${OP_LABEL[t.op]} · ${f.name}`;
  return true;
}

function needsErrand(world: World, v: Vehicle, t: WorkerTask): Worker["errand"] {
  if (v.fuel < v.def.fuelCapacity * 0.1) return "fuel";
  const im = world.implement(v.implementId);
  if (t.op === "plant" && im && im.seedKg < 1) return "seed";
  if (t.op === "spray" && im && im.liquidL < 1) return "seed";
  if (t.op === "harvest" && v.cargo && v.cargo.kg > v.cargo.capacity * 0.97) return "unload";
  return "none";
}

function errandZone(world: World, w: Worker, v: Vehicle, errand: Worker["errand"]): Zone | undefined {
  if (errand === "fuel") {
    const own = world.nearestZone("fuel", w.owner, v);
    return own;
  }
  if (errand === "seed") return world.nearestZone("seed", w.owner, v);
  if (errand === "unload") return world.nearestZone("sell", null, v);
  return undefined;
}

/** (Re)planeja o trabalho do funcionário a partir da posição atual. */
export function replan(world: World, w: Worker): void {
  const v = world.vehicle(w.vehicleId);
  if (!v) return;
  const t = activeTask(w);
  if (!t) {
    planHome(world, w, v);
    return;
  }
  const f = world.field(t.fieldId);
  if (!f || f.owner !== w.owner) {
    failTask(world, w, t, "Campo indisponível");
    planHome(world, w, v);
    return;
  }
  if (!opsFor(world, v).includes(t.op)) {
    failTask(world, w, t, "Implemento foi trocado ou removido");
    planHome(world, w, v);
    return;
  }
  const errand = needsErrand(world, v, t);
  if (errand !== "none") {
    if (errand === "unload" && w.owner === "player") {
      w.state = "waiting";
      w.note = "Tanque cheio — aguardando carreta";
      v.pipeOut = true;
      w.legs = [];
      return;
    }
    const z = errandZone(world, w, v, errand);
    if (!z) {
      failTask(world, w, t, errand === "fuel" ? "Sem posto acessível" : "Sem depósito de insumos");
      planHome(world, w, v);
      return;
    }
    w.errand = errand;
    w.legs = serviceLegs(world, v, z);
    w.legIdx = 0;
    w.segIdx = 0;
    w.state = "driving";
    w.note = errand === "fuel" ? "Indo abastecer" : errand === "seed" ? "Buscando insumos" : "Levando grãos para venda";
    return;
  }
  w.errand = "none";
  if (!planWork(world, w, v, t)) completeTask(world, w, t, v);
}

function completeTask(world: World, w: Worker, t: WorkerTask, v: Vehicle): void {
  const f = world.field(t.fieldId);
  t.status = "done";
  t.progress = f ? opProgress(f, t.op) : 1;
  if (w.owner === "player") world.notify(`${w.name} concluiu: ${OP_LABEL[t.op]} em ${f?.name ?? "campo"}`, "good");
  setWorking(world, v, false);
  const next = w.tasks.find((x) => x.status === "queued");
  if (next && next.vehicleId === v.id) {
    next.status = "active";
    replan(world, w);
  } else planHome(world, w, v);
}

function planHome(world: World, w: Worker, v: Vehicle): void {
  setWorking(world, v, false);
  v.pipeOut = false;
  const spot = world.freeParking(w.owner);
  const legs = travelLegs(world, v, spot, world.farmOf(w.owner).nodeId);
  legs[legs.length - 1].kind = "park";
  w.legs = legs;
  w.legIdx = 0;
  w.segIdx = 0;
  w.state = "homeward";
  w.errand = "none";
  w.note = "Voltando para a sede";
}

function setWorking(world: World, v: Vehicle, on: boolean): void {
  if (v.def.combine) v.lowered = on;
  const im = world.implement(v.implementId);
  if (im && im.def.op) im.lowered = on;
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

function doorPoint(v: Vehicle): Vec2 {
  return localToWorld(v.x, v.y, v.heading, (v.def.body.cabinFront + v.def.body.cabinBack) / 2, -v.def.width / 2 - 0.9);
}

function walkTo(w: Worker, target: Vec2, dt: number, speed = 2.6, world?: World): boolean {
  const dx = target.x - w.x;
  const dy = target.y - w.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.8) return true;
  const s = Math.min(d, speed * dt);
  w.x += (dx / d) * s;
  w.y += (dy / d) * s;
  w.heading = Math.atan2(dy, dx);
  w.walkPhase += s * 3;
  if (world) {
    const r = world.collision.resolveCircle(w.x, w.y, 0.35);
    // contorna o obstáculo deslizando pela tangente
    if (r.x || r.y) {
      w.x += r.x - (r.y * s) / Math.max(0.01, Math.hypot(r.x, r.y));
      w.y += r.y + (r.x * s) / Math.max(0.01, Math.hypot(r.x, r.y));
    }
  }
  return false;
}

function blockedAhead(world: World, v: Vehicle): boolean {
  const reach = v.def.length / 2 + 3 + Math.abs(v.speed) * 1.4;
  const half = v.def.width / 2 + 1.2;
  const dir = v.speed >= -0.1 ? 1 : -1;
  const own = v.implementId;
  for (const o of world.vehicles) {
    if (o.id === v.id) continue;
    if (Math.abs(o.x - v.x) > 25 || Math.abs(o.y - v.y) > 25) continue;
    for (const c of vehicleCircles(o)) {
      const p = localToWorld(o.x, o.y, o.heading, c.x, 0);
      const l = worldToLocal(v.x, v.y, v.heading, p.x, p.y);
      if (l.x * dir > 0 && l.x * dir < reach + c.r && Math.abs(l.y) < half + c.r * 0.6) return true;
    }
  }
  for (const im of world.implements) {
    if (im.id === own || im.attachedTo === v.id) continue;
    if (Math.abs(im.x - v.x) > 25 || Math.abs(im.y - v.y) > 25) continue;
    const mid = localToWorld(im.x, im.y, im.heading, -im.def.length / 2, 0);
    const l = worldToLocal(v.x, v.y, v.heading, mid.x, mid.y);
    if (l.x * dir > 0 && l.x * dir < reach + im.def.length / 2 && Math.abs(l.y) < half + im.def.width / 2) return true;
  }
  if (world.player.vehicleId === null) {
    const l = worldToLocal(v.x, v.y, v.heading, world.player.x, world.player.y);
    if (l.x * dir > 0 && l.x * dir < reach && Math.abs(l.y) < half) return true;
  }
  return false;
}

/** Segue a perna atual com perseguição pura. Retorna true ao concluir a perna. */
function pursue(world: World, w: Worker, v: Vehicle, leg: Leg, dt: number, isLast: boolean): boolean {
  if (!leg.clean) {
    leg.pts = cleanPolyline(leg.pts, leg.kind === "turn" ? 0.2 : 0.6);
    leg.clean = true;
  }
  const pts = leg.pts;
  if (pts.length < 2) return true;
  // avança o segmento de referência
  let seg = Math.min(w.segIdx, pts.length - 2);
  let best = Infinity;
  let bestSeg = seg;
  let bestT = 0;
  for (let k = seg; k < Math.min(pts.length - 1, seg + 4); k++) {
    const c = closestPointOnSegment(v.x, v.y, pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y);
    const d = Math.hypot(c.x - v.x, c.y - v.y);
    if (d < best - 0.01) {
      best = d;
      bestSeg = k;
      bestT = c.t;
    }
  }
  seg = bestSeg;
  w.segIdx = seg;
  const end = pts[pts.length - 1];
  const distEnd = Math.hypot(end.x - v.x, end.y - v.y);
  // projeção além do fim do último segmento
  if (seg === pts.length - 2) {
    const a = pts[seg];
    const ex = end.x - a.x;
    const ey = end.y - a.y;
    const len2 = ex * ex + ey * ey || 1;
    const t = ((v.x - a.x) * ex + (v.y - a.y) * ey) / len2;
    const tol = leg.kind === "lane" ? 0 : 0.02;
    if (t >= 1 - tol || distEnd < (leg.kind === "park" ? 1.2 : leg.kind === "lane" ? 0.3 : 1.8)) return true;
  }
  // salvaguarda: se ficou orbitando perto do fim de uma perna de deslocamento, considera concluída
  if (leg.kind !== "lane" && leg.kind !== "turn" && distEnd < Math.max(3, Math.abs(v.speed) * 0.8)) return true;
  const speed = Math.abs(v.speed);
  const Ld = leg.kind === "turn" ? 2.4 + speed * 0.35 : leg.kind === "lane" ? 3.2 + speed * 0.5 : 4 + speed * 0.8;
  // ponto de mira ao longo da polilinha
  let remaining = Ld;
  let px = pts[seg].x + (pts[seg + 1].x - pts[seg].x) * bestT;
  let py = pts[seg].y + (pts[seg + 1].y - pts[seg].y) * bestT;
  let target = { x: end.x, y: end.y };
  for (let k = seg; k < pts.length - 1; k++) {
    const nx = pts[k + 1].x;
    const ny = pts[k + 1].y;
    const l = Math.hypot(nx - px, ny - py);
    if (l >= remaining) {
      target = { x: px + ((nx - px) / l) * remaining, y: py + ((ny - py) / l) * remaining };
      break;
    }
    remaining -= l;
    px = nx;
    py = ny;
    if (k === pts.length - 2) {
      // prolonga a mira além do fim para não oscilar
      const dx = pts[k + 1].x - pts[k].x;
      const dy = pts[k + 1].y - pts[k].y;
      const dl = Math.hypot(dx, dy) || 1;
      target = { x: nx + (dx / dl) * remaining, y: ny + (dy / dl) * remaining };
    }
  }
  const local = worldToLocal(v.x, v.y, v.heading, target.x, target.y);
  const alpha = Math.atan2(local.y, local.x);
  const steerAngle = Math.atan2(2 * v.def.wheelbase * Math.sin(alpha), Ld);
  const maxSteer = (v.def.maxSteerDeg * Math.PI) / 180;
  v.ctrl.steer = clamp(steerAngle / maxSteer, -1, 1);
  // velocidade alvo
  let vt = ms(leg.speedKmh);
  if (leg.kind === "road") {
    const r = world.map.roads.roadAt(v.x, v.y);
    vt = ms(r.kind === "asphalt" ? v.def.maxSpeedKmh * 0.85 : Math.min(30, v.def.maxSpeedKmh * 0.8));
    const im = world.implement(v.implementId);
    if (im) vt = Math.min(vt, ms(25));
  }
  vt = Math.min(vt, speedLimit(world, v).limit);
  vt *= clamp(1 - Math.abs(alpha) / 1.3, 0.3, 1);
  if ((isLast || leg.kind === "park") && distEnd < 12) vt = Math.min(vt, Math.max(0.8, distEnd * 0.35));
  if (leg.kind !== "lane" && leg.kind !== "turn" && distEnd < 8 && !isLast) vt = Math.min(vt, ms(10));
  if (blockedAhead(world, v) && w.blockedTimer >= 0) {
    w.blockedTimer += dt;
    if (w.blockedTimer > 6) w.blockedTimer = -4; // segue devagar mesmo assim
    v.ctrl.throttle = 0;
    v.ctrl.brake = 1;
    return false;
  }
  if (w.blockedTimer < 0) {
    w.blockedTimer += dt;
    if (w.blockedTimer >= 0) w.blockedTimer = 0;
    vt = Math.min(vt, 1.2);
  } else w.blockedTimer = 0;
  const err = vt - v.speed;
  v.ctrl.brake = err < -1.2 ? clamp(-err / 3, 0, 1) : 0;
  v.ctrl.throttle = clamp(err * 1.2 + (vt > 0.1 ? 0.25 : 0), 0, 1);
  // destravamento: preso contra um obstáculo, dá ré esterçando ao contrário
  if (w.reverseT > 0) {
    w.reverseT -= dt;
    v.ctrl.throttle = -0.7;
    v.ctrl.brake = 0;
    v.ctrl.steer = -v.ctrl.steer;
  } else if (v.ctrl.throttle > 0.3 && Math.abs(v.speed) < 0.3) {
    w.stuckT += dt;
    if (w.stuckT > 3) {
      w.stuckT = 0;
      w.reverseT = 2.2;
    }
  } else w.stuckT = Math.max(0, w.stuckT - dt);
  return false;
}

function servicePerform(world: World, w: Worker, v: Vehicle): string | null {
  const t = activeTask(w);
  const im = world.implement(v.implementId);
  const pay = (amount: number, text: string, cat: "combustível" | "insumos"): boolean => {
    if (w.owner === "player") return world.economy.spend(amount, text, cat, world.time);
    const npc = world.npcs.find((n) => n.owner === w.owner);
    if (!npc || npc.cash < amount) return false;
    npc.cash -= amount;
    return true;
  };
  if (w.errand === "fuel") {
    const z = world.zoneAt(v.x, v.y, "fuel");
    if (!z) return "Não chegou ao posto";
    const liters = v.def.fuelCapacity - v.fuel;
    const price = BALANCE.dieselPrice * (z.owner ? BALANCE.farmDieselMarkup : 1);
    if (!pay(liters * price, "Diesel (operador)", "combustível")) return "Sem dinheiro para diesel";
    v.fuel = v.def.fuelCapacity;
  } else if (w.errand === "seed" && im) {
    if (im.def.seedCapacityKg) {
      const crop: CropId = t?.cropId ?? im.seedCrop;
      if (im.seedCrop !== crop && im.seedKg > 0) im.seedKg = 0;
      im.seedCrop = crop;
      const kg = im.def.seedCapacityKg - im.seedKg;
      if (!pay(kg * CROPS[crop].seedPricePerKg, `Sementes de ${CROPS[crop].name}`, "insumos")) return "Sem dinheiro para sementes";
      im.seedKg = im.def.seedCapacityKg;
    } else if (im.def.liquidCapacityL) {
      const l = im.def.liquidCapacityL - im.liquidL;
      if (!pay(l * BALANCE.fertilizerPricePerL, "Adubo líquido", "insumos")) return "Sem dinheiro para adubo";
      im.liquidL = im.def.liquidCapacityL;
    }
  } else if (w.errand === "unload" && v.cargo && v.cargo.cropId) {
    const z = world.zoneAt(pipeOutlet(v).x, pipeOutlet(v).y, "sell") ?? world.zoneAt(v.x, v.y, "sell");
    if (!z || !z.buyerId) return "Não chegou à moega";
    const crop = v.cargo.cropId;
    const kg = cargoRemove(v.cargo, v.cargo.kg);
    const value = kg * world.economy.price(z.buyerId, crop, world.time);
    const npc = world.npcs.find((n) => n.owner === w.owner);
    if (npc) {
      npc.cash += value;
      npc.history.unshift(`Vendeu ${Math.round(kg)} kg de ${CROPS[crop].name}`);
      npc.history.length = Math.min(npc.history.length, 8);
    } else world.economy.sell(z.buyerId, crop, kg, world.time);
  }
  return null;
}

/** Avança um funcionário. */
export function updateWorker(world: World, w: Worker, dt: number): void {
  let t = activeTask(w);
  if (!t) {
    const q = w.tasks.find((x) => x.status === "queued");
    if (q) {
      q.status = "active";
      t = q;
      if (w.vehicleId && w.vehicleId !== q.vehicleId) {
        const cur = world.vehicle(w.vehicleId);
        if (cur) planHome(world, w, cur);
      } else if (w.state === "idle" || w.state === "walkHome") {
        w.state = "walking";
        w.note = "Indo até a máquina";
      } else if (w.vehicleId === q.vehicleId) replan(world, w);
    }
  }
  if (t) {
    const f = world.field(t.fieldId);
    if (f) t.progress = opProgress(f, t.op);
  }
  const onDuty = w.state !== "idle" && w.state !== "paused" && w.state !== "walkHome";
  if (onDuty) {
    w.paidSeconds += dt;
    if (w.paidSeconds >= 10) {
      const cost = (w.salary * w.paidSeconds) / BALANCE.workHourRealSeconds;
      w.paidSeconds = 0;
      if (w.owner === "player") world.economy.charge(cost, `Salário · ${w.name}`, "salários", world.time);
      else {
        const npc = world.npcs.find((n) => n.owner === w.owner);
        if (npc) npc.cash -= cost;
      }
    }
  }
  const v = world.vehicle(w.vehicleId);
  switch (w.state) {
    case "idle":
      return;
    case "walking": {
      if (!t) {
        w.state = "idle";
        return;
      }
      const tv = world.vehicle(t.vehicleId);
      if (!tv) {
        failTask(world, w, t, "Máquina não encontrada");
        w.state = "idle";
        return;
      }
      if (tv.driver === "player") {
        w.note = "Aguardando: você está nesta máquina";
        return;
      }
      if (walkTo(w, doorPoint(tv), dt, 2.6, world)) {
        tv.driver = "worker";
        tv.workerId = w.id;
        tv.engineOn = tv.fuel > 0;
        w.vehicleId = tv.id;
        replan(world, w);
      }
      return;
    }
    case "walkHome": {
      const farm = world.farmOf(w.owner);
      if (walkTo(w, { x: farm.x - 30, y: farm.y - 30 }, dt, 2.6, world)) {
        w.state = "idle";
        w.note = "Disponível na sede";
      }
      return;
    }
    case "paused":
      return;
    case "waiting": {
      if (!v) return;
      v.ctrl.throttle = 0;
      v.ctrl.brake = 1;
      v.ctrl.steer = 0;
      setWorking(world, v, false);
      v.pipeOut = true;
      const under = containerUnderPipe(world, v);
      if (v.unloading || under) w.timer = 0;
      else w.timer += dt;
      if (!v.cargo || v.cargo.kg < 1 || (v.cargo.kg < v.cargo.capacity * 0.6 && w.timer > 3)) {
        v.pipeOut = false;
        w.timer = 0;
        if (w.legs.length && w.legIdx < w.legs.length) {
          w.state = "driving";
          w.note = t ? `${OP_LABEL[t.op]} · retomando` : "Retomando";
        } else replan(world, w);
      }
      return;
    }
    case "servicing": {
      if (!v) return;
      v.ctrl.throttle = 0;
      v.ctrl.brake = 1;
      if (w.errand === "unload") v.pipeOut = true;
      w.timer -= dt;
      if (w.timer > 0) {
        if (w.errand === "unload" && v.cargo?.cropId && v.pipeAnim > 0.9) {
          const o = pipeOutlet(v);
          world.fx.grain(o.x, o.y, (Math.random() - 0.5), (Math.random() - 0.5), CROPS[v.cargo.cropId].colors.grain);
        }
        return;
      }
      const err = servicePerform(world, w, v);
      v.pipeOut = false;
      w.errand = "none";
      if (err && t) {
        failTask(world, w, t, err);
        planHome(world, w, v);
        return;
      }
      replan(world, w);
      return;
    }
    case "driving":
    case "homeward": {
      if (!v) {
        w.state = "idle";
        return;
      }
      if (v.driver !== "worker") return;
      if (!v.engineOn && v.fuel > 0) v.engineOn = true;
      if (v.fuel <= 0) {
        v.ctrl.throttle = 0;
        w.note = "Sem combustível! Leve diesel até a máquina";
        return;
      }
      // tanque cheio durante colheita
      if (t && w.state === "driving" && t.op === "harvest" && v.cargo && v.cargo.kg >= v.cargo.capacity - 2 && w.errand === "none") {
        if (w.owner === "player") {
          w.state = "waiting";
          w.timer = 0;
          w.note = "Tanque cheio — aguardando carreta";
          world.notify(`${w.name}: tanque da ${v.def.name} cheio. Posicione uma carreta sob o tubo.`, "warn");
        } else replan(world, w);
        return;
      }
      // sementes/adubo acabaram durante o trabalho
      if (t && w.state === "driving" && w.errand === "none") {
        const im = world.implement(v.implementId);
        const out = (t.op === "plant" && im && im.seedKg < 0.05) || (t.op === "spray" && im && im.liquidL < 0.05) || v.fuel < v.def.fuelCapacity * 0.05;
        if (out) {
          replan(world, w);
          return;
        }
      }
      const leg = w.legs[w.legIdx];
      if (!leg) {
        onLegsDone(world, w, v);
        return;
      }
      const working = leg.kind === "lane";
      setWorking(world, v, working);
      // reduz a velocidade ao baixar o implemento no início da faixa
      const done = pursue(world, w, v, leg, dt, w.legIdx === w.legs.length - 1);
      if (done) {
        w.legIdx++;
        w.segIdx = 0;
        if (w.legIdx >= w.legs.length) onLegsDone(world, w, v);
      }
      if (t && w.state === "driving" && w.errand === "none") {
        const f = world.field(t.fieldId);
        w.note = `${OP_LABEL[t.op]} · ${f?.name ?? ""} · ${Math.round((t.progress ?? 0) * 100)}%`;
      }
      return;
    }
  }
}

function onLegsDone(world: World, w: Worker, v: Vehicle): void {
  v.ctrl.throttle = 0;
  v.ctrl.brake = 1;
  if (w.state === "homeward") {
    v.engineOn = false;
    v.driver = null;
    v.workerId = null;
    v.speed = 0;
    w.vehicleId = null;
    const door = doorPoint(v);
    w.x = door.x;
    w.y = door.y;
    const next = w.tasks.find((x) => x.status === "queued");
    w.state = next ? "walking" : "walkHome";
    w.note = next ? "Indo até a próxima máquina" : "Voltando para casa";
    return;
  }
  if (w.errand !== "none") {
    const probe = serviceProbe(world, v, w.errand);
    const type = w.errand === "fuel" ? "fuel" : w.errand === "seed" ? "seed" : "sell";
    const z = world.zoneAt(probe.x, probe.y, type) ?? world.zoneAt(v.x, v.y, type);
    if (!z) {
      // ajusta posição: avança devagar até entrar na zona
      const zz = errandZone(world, w, v, w.errand);
      if (zz) {
        w.legs = [{ kind: "park", pts: [{ x: v.x, y: v.y }, { x: zz.x, y: zz.y }], speedKmh: 5 }];
        w.legIdx = 0;
        w.segIdx = 0;
        w.timer = (w.timer || 0) + 1;
        if (w.timer < 4) return;
      }
    }
    w.state = "servicing";
    w.timer = w.errand === "unload" && v.cargo ? 2 + v.cargo.kg / v.def.combine!.unloadKgS : 4;
    w.note = w.errand === "fuel" ? "Abastecendo" : w.errand === "seed" ? "Reabastecendo insumos" : "Descarregando na moega";
    return;
  }
  const t = activeTask(w);
  if (!t) {
    planHome(world, w, v);
    return;
  }
  const f = world.field(t.fieldId)!;
  t.progress = opProgress(f, t.op);
  if (t.progress >= 0.985 || !planWork(world, w, v, t)) completeTask(world, w, t, v);
}

// ---------------------------------------------------------------------------
// Troca de controle manual/automático
// ---------------------------------------------------------------------------

/** Jogador assume uma máquina em uso: o funcionário fica pausado na cabine. */
export function takeOver(world: World, v: Vehicle): Worker | undefined {
  const w = world.worker(v.workerId);
  v.driver = "player";
  v.ctrl = { throttle: 0, steer: 0, brake: 1 };
  if (w && w.vehicleId === v.id) {
    w.state = "paused";
    w.note = "Você assumiu o controle";
    setWorking(world, v, false);
    return w;
  }
  return undefined;
}

/** Devolve a máquina ao funcionário, que replaneja a partir da posição atual. */
export function handBack(world: World, v: Vehicle): Worker | undefined {
  const w = world.worker(v.workerId);
  if (!w || w.vehicleId !== v.id || w.state !== "paused") return undefined;
  v.driver = "worker";
  v.ctrl.throttle = 0;
  v.ctrl.brake = 0;
  replan(world, w);
  return w;
}

export function cancelTask(world: World, w: Worker, taskId: number): void {
  const t = w.tasks.find((x) => x.id === taskId);
  if (!t) return;
  const wasActive = t.status === "active";
  t.status = "cancelled";
  if (wasActive) {
    const v = world.vehicle(w.vehicleId);
    if (v && w.state !== "paused") planHome(world, w, v);
    else if (!v) w.state = "walkHome";
  }
}

export function fireWorker(world: World, w: Worker): void {
  for (const t of w.tasks) if (t.status === "queued" || t.status === "active") t.status = "cancelled";
  const v = world.vehicle(w.vehicleId);
  if (v) {
    if (v.driver === "worker") {
      v.driver = null;
      v.engineOn = false;
      v.ctrl.throttle = 0;
      v.ctrl.brake = 1;
    }
    v.workerId = null;
    setWorking(world, v, false);
  }
  world.workers = world.workers.filter((x) => x.id !== w.id);
}

export function workerStatusLabel(w: Worker): string {
  return w.note;
}

export function speedKmhOf(v: Vehicle): number {
  return Math.abs(kmh(v.speed));
}
