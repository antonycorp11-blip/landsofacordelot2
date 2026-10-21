import { BALANCE } from "../config/balance";
import { clamp, localToWorld } from "../core/math";
import { ms } from "../data/machines";
import type { Vehicle } from "../world/entities";
import type { World } from "../world/World";
import { wetBand } from "./FieldSystem";
import { vehicleCircles } from "./geometry";
import { combineWork, containers, follow, implementWork, pipeUnload, updateLoading, updateTipping } from "./ImplementSystem";

export interface VehicleStatus {
  speedLimit: number;
  workCells: number;
  blocked?: string;
  onField: boolean;
  surface: "road" | "field" | "grass";
}

const status = new Map<number, VehicleStatus>();

export function vehicleStatus(v: Vehicle): VehicleStatus | undefined {
  return status.get(v.id);
}

/** Limite de velocidade atual (m/s) considerando implemento, colheita, desgaste e terreno. */
export function speedLimit(world: World, v: Vehicle): { limit: number; onField: boolean; surface: VehicleStatus["surface"]; wet: boolean } {
  const def = v.def;
  let vmax = ms(def.maxSpeedKmh) * (1 - v.wear * 0.25);
  const im = world.implement(v.implementId);
  if (im) {
    if (im.lowered && im.def.op) {
      const ratio = clamp(v.def.powerHp / Math.max(1, im.def.powerHp * 1.4), 0.55, 1);
      vmax = Math.min(vmax, ms(im.def.workSpeedKmh) * ratio);
    }
    if (im.cargo && im.cargo.kg > 0) vmax *= 1 - 0.25 * (im.cargo.kg / im.cargo.capacity) * clamp(im.def.powerHp / v.def.powerHp, 0.3, 1);
    if (im.def.hitch === "drawbar") vmax = Math.min(vmax, ms(40));
  }
  if (def.combine && v.lowered) vmax = Math.min(vmax, ms(def.combine.harvestKmh));
  const f = world.fieldAt(v.x, v.y);
  let surface: VehicleStatus["surface"] = "grass";
  let wet = false;
  if (f) {
    surface = "field";
    const i = f.cellIndexAt(v.x, v.y);
    if (i >= 0 && wetBand(f.moisture[i]) === 2) {
      vmax *= 0.72;
      wet = true;
    }
  } else {
    const r = world.map.roads.roadAt(v.x, v.y);
    if (r.d < r.width / 2 + 0.5) surface = "road";
    else vmax = Math.min(vmax, ms(34));
  }
  if (world.weather.rain > 0.3 && surface !== "road") vmax *= 0.9;
  return { limit: vmax, onField: !!f, surface, wet };
}

/** Integra a dinâmica de um veículo por dt. */
export function stepVehicle(world: World, v: Vehicle, dt: number): void {
  const def = v.def;
  const c = v.ctrl;
  const sl = speedLimit(world, v);
  if (!v.engineOn || v.fuel <= 0) {
    c.throttle = 0;
  }
  // direção progressiva, mais suave em velocidade
  const steerMax = ((def.maxSteerDeg * Math.PI) / 180) * (1 - 0.55 * clamp(Math.abs(v.speed) / ms(32), 0, 1));
  const target = clamp(c.steer, -1, 1) * steerMax;
  const rate = ((def.steerRateDeg * Math.PI) / 180) * dt;
  v.steer += clamp(target - v.steer, -rate, rate);

  // longitudinal
  const vmax = sl.limit;
  const vrev = ms(def.reverseKmh);
  let a = 0;
  const thr = clamp(c.throttle, -1, 1);
  if (c.brake > 0) {
    a = -Math.sign(v.speed) * def.brake * c.brake;
  } else if (thr > 0.02) {
    if (v.speed < -0.05) a = def.brake;
    else a = v.speed < vmax * thr ? def.accel * (1 - (v.speed / Math.max(0.1, vmax)) * 0.5) : -1.2;
  } else if (thr < -0.02) {
    if (v.speed > 0.05) a = -def.brake;
    else a = v.speed > -vrev * -thr ? -def.accel * 0.7 : 1.2;
  } else {
    a = -Math.sign(v.speed) * 1.6;
  }
  const prev = v.speed;
  v.speed += a * dt;
  if (c.brake > 0 || Math.abs(thr) <= 0.02) {
    if (Math.sign(v.speed) !== Math.sign(prev) && prev !== 0) v.speed = 0;
  }
  if (Math.abs(v.speed) < 0.02 && Math.abs(thr) < 0.02) v.speed = 0;
  if (v.speed > vmax + 0.3) v.speed = Math.max(vmax, v.speed - def.brake * 0.6 * dt);

  // cinemática de bicicleta (colheitadeira: esterçamento traseiro, mesma relação de giro)
  const yaw = (v.speed * Math.tan(v.steer)) / def.wheelbase;
  v.heading += yaw * dt;
  v.x += Math.cos(v.heading) * v.speed * dt;
  v.y += Math.sin(v.heading) * v.speed * dt;
  v.wheelDist += v.speed * dt;

  // colisões estáticas
  const circles = vehicleCircles(v);
  let pushX = 0;
  let pushY = 0;
  for (const cc of circles) {
    const p = localToWorld(v.x, v.y, v.heading, cc.x, 0);
    const r = world.collision.resolveCircle(p.x, p.y, cc.r);
    pushX += r.x;
    pushY += r.y;
  }
  if (pushX || pushY) {
    v.x += pushX * 0.8;
    v.y += pushY * 0.8;
    const into = Math.cos(v.heading) * pushX + Math.sin(v.heading) * pushY;
    if (into * v.speed < 0) v.speed *= 0.35;
  }
  // limites do mundo
  v.x = clamp(v.x, 3, world.map.width - 3);
  v.y = clamp(v.y, 3, world.map.height - 3);

  // combustível e desgaste (hora de trabalho = BALANCE.workHourRealSeconds)
  if (v.engineOn) {
    const im = world.implement(v.implementId);
    const load = 0.18 + Math.abs(thr) * 0.5 + ((im?.lowered && im.def.op) || (def.combine && v.lowered) ? 0.4 : 0);
    const h = dt / BALANCE.workHourRealSeconds;
    v.fuel = Math.max(0, v.fuel - (def.fuelLph * load * dt) / BALANCE.fuelHourRealSeconds);
    v.opHours += h;
    v.wear = Math.min(1, v.wear + def.wearPerHour * h * (Math.abs(v.speed) > 0.3 ? 1 : 0.25));
    if (v.fuel <= 0) {
      v.engineOn = false;
      if (v.driver === "player") world.notify("Combustível acabou! Leve diesel ou reboque até um posto.", "bad");
    }
  }

  // implemento engatado
  const im = world.implement(v.implementId);
  let st: VehicleStatus = { speedLimit: vmax, workCells: 0, onField: sl.onField, surface: sl.surface };
  if (im) {
    follow(v, im);
    im.lowerAnim = clamp(im.lowerAnim + (im.lowered ? dt * 1.6 : -dt * 1.6), 0, 1);
    const wr = implementWork(world, v, im);
    st.workCells = wr.cells;
    st.blocked = wr.blockedReason;
    if (wr.cells > 0) {
      const back = im.def.workLineFromHitch;
      const p = { x: im.x - Math.cos(im.heading) * back, y: im.y - Math.sin(im.heading) * back };
      world.fx.dust(p.x, p.y, Math.min(3, wr.cells * 0.12) * (sl.wet ? 0.2 : 1), im.def.op === "spray" ? "spray" : undefined);
    }
  }
  if (def.combine) {
    v.reel += dt * (v.lowered ? 5 : 0);
    const cw = combineWork(world, v);
    st.workCells += cw.cells;
    st.blocked = cw.blockedReason ?? st.blocked;
    if (cw.cells > 0) {
      const back = localToWorld(v.x, v.y, v.heading, -def.length / 2 - 0.5, 0);
      world.fx.chaff(back.x, back.y, -Math.cos(v.heading) * 2, -Math.sin(v.heading) * 2);
      const front = localToWorld(v.x, v.y, v.heading, def.length / 2 + 1, 0);
      world.fx.dust(front.x, front.y, 1.2);
    }
    pipeUnload(world, v, dt);
  }
  status.set(v.id, st);

  // poeira e marcas de pneu
  if (Math.abs(v.speed) > 1 && sl.surface !== "road") {
    const rear = localToWorld(v.x, v.y, v.heading, def.rear.x - def.rear.r, 0);
    world.fx.dust(rear.x, rear.y, Math.abs(v.speed) * 0.05 * (sl.wet ? 0.15 : 1) * (world.weather.rain > 0.2 ? 0.3 : 1));
  }
  if (Math.abs(v.speed) > 0.2 && sl.surface !== "road") {
    const tw = def.rear.w;
    for (const side of [-1, 1]) {
      const p = localToWorld(v.x, v.y, v.heading, def.rear.x, (side * def.rear.track) / 2);
      world.fx.track(p.x, p.y, v.heading, tw, sl.wet, v.id * 2 + (side > 0 ? 1 : 0) + 1);
    }
  }
  if (v.engineOn) {
    const ex = localToWorld(v.x, v.y, v.heading, def.body.exhaustX, -def.width * 0.18);
    world.fx.smoke(ex.x, ex.y, 0.2 + Math.abs(thr) * 0.8);
  }
}

/** Atualiza basculamentos e carregamentos de todos os recipientes. */
export function stepContainers(world: World, dt: number): void {
  for (const c of containers(world)) {
    const h = c.implement ?? c.vehicle!;
    if (h.tipping || h.tip > 0) updateTipping(world, c, dt);
    if (h.loading) updateLoading(world, c, dt);
  }
}
