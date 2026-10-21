import { BALANCE } from "../config/balance";
import { pointInPolygon, type Vec2 } from "../core/math";
import type { ZoneType } from "../data/buildings";
import { CROPS } from "../data/crops";
import { Economy } from "../systems/Economy";
import { FieldGrid, ST, type Stage } from "../systems/FieldSystem";
import { StaticCollision } from "../systems/Collision";
import { FarmStorage } from "../systems/Storage";
import type { GameTime } from "../systems/TimeSystem";
import { weatherAt, type WeatherState } from "../systems/Weather";
import { createImplement, createVehicle, type Implement, type PlayerState, type Vehicle } from "./entities";
import { generateMap, type GameMap } from "./MapGen";
import type { Zone } from "./types";
import type { Candidate, Worker } from "./workers";

export type NoticeKind = "info" | "good" | "warn" | "bad";

export interface NoticeAction {
  label: string;
  run: () => void;
}

export interface Notice {
  id: number;
  text: string;
  kind: NoticeKind;
  time: number;
  action?: NoticeAction;
}

export interface NpcFarm {
  id: string;
  name: string;
  owner: string;
  cash: number;
  goal: "expandir" | "frota" | "rendimento";
  crops: ("wheat" | "soy" | "corn")[];
  color: string;
  lastDecisionDay: number;
  history: string[];
}

/** Saída de efeitos visuais; a lógica emite, o renderizador decide se desenha. */
export interface FxSink {
  dust(x: number, y: number, amount: number, color?: string): void;
  smoke(x: number, y: number, amount: number): void;
  grain(x: number, y: number, vx: number, vy: number, color: string): void;
  chaff(x: number, y: number, vx: number, vy: number): void;
  spray(x: number, y: number): void;
  track(x: number, y: number, heading: number, width: number, wet: boolean, key?: number): void;
}

const NO_FX: FxSink = { dust() {}, smoke() {}, grain() {}, chaff() {}, spray() {}, track() {} };

export class World {
  readonly map: GameMap;
  readonly seed: number;
  readonly collision: StaticCollision;
  fields: FieldGrid[] = [];
  vehicles: Vehicle[] = [];
  implements: Implement[] = [];
  workers: Worker[] = [];
  candidates: Candidate[] = [];
  npcs: NpcFarm[] = [];
  player: PlayerState;
  time: GameTime = { day: 0, minute: BALANCE.startHour * 60 };
  timeScaleIdx = 1;
  economy: Economy;
  storage: FarmStorage;
  npcStorage: Record<string, FarmStorage> = {};
  weather: WeatherState;
  notices: Notice[] = [];
  nextId = 1;
  realTime = 0;
  candidatesDay = -1;
  /** Marcos de progresso do jogador (tutorial, conquistas). */
  flags: Record<string, boolean> = {};
  /** Ganchos para a camada de apresentação (sons/partículas futuros). */
  onNotice: ((n: Notice) => void) | null = null;
  fx: FxSink = NO_FX;
  /** Região visível (para nível de detalhe da simulação). */
  view = { x: 0, y: 0, r: 200 };

  constructor(seed: number) {
    this.seed = seed;
    this.map = generateMap(seed);
    this.collision = new StaticCollision(this.map);
    this.economy = new Economy(seed, this.map.buyers);
    const siloCap = this.map.buildings.filter((b) => b.owner === "player" && b.def.storageKg).reduce((a, b) => a + (b.def.storageKg ?? 0), 0);
    this.storage = new FarmStorage(siloCap || BALANCE.siloCapacityKg);
    for (const f of this.map.farms) if (f.owner !== "player") this.npcStorage[f.owner] = new FarmStorage(60000);
    for (const def of this.map.fields) {
      const f = new FieldGrid(def);
      const init = def.initial;
      f.fill(init.stage as Stage, init.crop ? CROPS[init.crop].index : 0, init.growth ?? 0);
      if (init.stage === ST.Planted && init.growth && init.growth >= 1) f.recount();
      this.fields.push(f);
    }
    const home = this.map.farms[0];
    this.player = { x: home.x - 30, y: home.y - 30, heading: Math.PI / 2, vehicleId: null, walkPhase: 0, moving: false };
    this.weather = weatherAt(seed, this.time);
  }

  id(): number {
    return this.nextId++;
  }

  addVehicle(defId: string, owner: string, x: number, y: number, heading: number): Vehicle {
    const v = createVehicle(this.id(), defId, owner, x, y, heading);
    this.vehicles.push(v);
    return v;
  }

  addImplement(defId: string, owner: string, x: number, y: number, heading: number): Implement {
    const im = createImplement(this.id(), defId, owner, x, y, heading);
    this.implements.push(im);
    return im;
  }

  vehicle(id: number | null | undefined): Vehicle | undefined {
    if (id == null) return undefined;
    return this.vehicles.find((v) => v.id === id);
  }

  implement(id: number | null | undefined): Implement | undefined {
    if (id == null) return undefined;
    return this.implements.find((i) => i.id === id);
  }

  field(id: number): FieldGrid | undefined {
    return this.fields.find((f) => f.id === id);
  }

  worker(id: number | null | undefined): Worker | undefined {
    if (id == null) return undefined;
    return this.workers.find((w) => w.id === id);
  }

  fieldAt(x: number, y: number): FieldGrid | undefined {
    for (const f of this.fields) {
      const b = f.bounds;
      if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) continue;
      if (pointInPolygon(x, y, f.poly)) return f;
    }
    return undefined;
  }

  zoneAt(x: number, y: number, type?: ZoneType): Zone | undefined {
    for (const z of this.map.zones) {
      if (type && z.type !== type) continue;
      const c = Math.cos(-z.rot);
      const s = Math.sin(-z.rot);
      const lx = (x - z.x) * c - (y - z.y) * s;
      const ly = (x - z.x) * s + (y - z.y) * c;
      if (Math.abs(lx) <= z.w / 2 && Math.abs(ly) <= z.h / 2) return z;
    }
    return undefined;
  }

  zonesOf(type: ZoneType, owner: string | null): Zone[] {
    return this.map.zones.filter((z) => z.type === type && (owner === undefined || z.owner === owner || (z.owner === null && type !== "silo")));
  }

  farmOf(owner: string) {
    return this.map.farms.find((f) => f.owner === owner) ?? this.map.farms[0];
  }

  notify(text: string, kind: NoticeKind = "info", action?: NoticeAction): void {
    const n: Notice = { id: this.id(), text, kind, time: this.realTime, action };
    this.notices.push(n);
    if (this.notices.length > 40) this.notices.shift();
    this.onNotice?.(n);
  }

  /** Encontra uma vaga livre na sede para entregar máquinas. */
  freeParking(owner: string, radius = 4): { x: number; y: number; heading: number } {
    const farm = this.farmOf(owner);
    const occupied = (x: number, y: number) =>
      this.vehicles.some((v) => Math.hypot(v.x - x, v.y - y) < radius + v.def.length / 2) ||
      this.implements.some((i) => Math.hypot(i.x - x, i.y - y) < radius + i.def.length / 2);
    for (const p of farm.parking) if (!occupied(p.x, p.y)) return p;
    for (let k = 0; k < 40; k++) {
      const p = { x: farm.x - 20 + (k % 8) * 8, y: farm.y + 60 + Math.floor(k / 8) * 12, heading: -Math.PI / 2 };
      if (!occupied(p.x, p.y)) return p;
    }
    return { ...farm.parking[0] };
  }

  nearestZone(type: ZoneType, owner: string | null, from: Vec2): Zone | undefined {
    let best: Zone | undefined;
    let bd = Infinity;
    for (const z of this.map.zones) {
      if (z.type !== type) continue;
      if (type === "silo" || type === "seed" || type === "workshop") {
        if (z.owner !== owner) continue;
      } else if (type === "fuel" && z.owner !== null && z.owner !== owner) continue;
      const d = Math.hypot(z.x - from.x, z.y - from.y);
      if (d < bd) {
        bd = d;
        best = z;
      }
    }
    return best;
  }
}
