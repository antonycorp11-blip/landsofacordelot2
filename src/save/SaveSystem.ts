import type { CropId } from "../data/crops";
import { IMPLEMENTS, VEHICLES } from "../data/machines";
import type { LedgerEntry, MarketEvent } from "../systems/Economy";
import type { Implement, PlayerState, Vehicle } from "../world/entities";
import type { Candidate, Worker } from "../world/workers";
import { World, type NpcFarm } from "../world/World";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "terrafirme.save";

// ------------------------- codificação compacta -------------------------

export function rleEncode(a: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < a.length) {
    const v = a[i];
    let n = 1;
    while (i + n < a.length && a[i + n] === v && n < 255) n++;
    out.push(n, v);
    i += n;
  }
  return Uint8Array.from(out);
}

export function rleDecode(a: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let o = 0;
  for (let i = 0; i + 1 < a.length; i += 2) {
    out.fill(a[i + 1], o, Math.min(length, o + a[i]));
    o += a[i];
  }
  return out;
}

function toB64(a: Uint8Array): string {
  let s = "";
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const enc = (a: Uint8Array) => toB64(rleEncode(a));
const dec = (s: string, n: number) => rleDecode(fromB64(s), n);

// ------------------------- formato -------------------------

type VehicleSave = Pick<Vehicle, "id" | "defId" | "owner" | "x" | "y" | "heading" | "engineOn" | "fuel" | "wear" | "opHours" | "implementId" | "workerId" | "cargo" | "rented" | "driver">;
type ImplementSave = Pick<Implement, "id" | "defId" | "owner" | "x" | "y" | "heading" | "attachedTo" | "lowered" | "seedCrop" | "seedKg" | "liquidL" | "cargo" | "wear">;

interface FieldSave {
  id: number;
  owner: string | null;
  leased: boolean;
  price: number;
  stage: string;
  crop: string;
  gHi: string;
  gLo: string;
  moisture: string;
  fertility: string;
  weeds: string;
  dir: string;
  health: string;
  sprayed: string;
}

export interface SaveData {
  version: number;
  seed: number;
  savedAt: number;
  time: { day: number; minute: number };
  timeScaleIdx: number;
  nextId: number;
  economy: { money: number; loan: number; ledger: LedgerEntry[]; events: MarketEvent[]; soldKg: Record<CropId, number> };
  player: PlayerState;
  vehicles: VehicleSave[];
  implements: ImplementSave[];
  workers: Worker[];
  candidates: Candidate[];
  candidatesDay: number;
  npcs: NpcFarm[];
  storage: { capacity: number; stock: Record<CropId, number> };
  npcStorage: Record<string, { capacity: number; stock: Record<CropId, number> }>;
  fields: FieldSave[];
  flags?: Record<string, boolean>;
}

export function serialize(world: World): SaveData {
  return {
    version: SAVE_VERSION,
    seed: world.seed,
    savedAt: Date.now(),
    time: { ...world.time },
    timeScaleIdx: world.timeScaleIdx,
    nextId: world.nextId,
    economy: { money: world.economy.money, loan: world.economy.loan, ledger: world.economy.ledger.slice(-150), events: world.economy.events, soldKg: { ...world.economy.soldKg } },
    player: { ...world.player },
    vehicles: world.vehicles.map((v) => ({
      id: v.id,
      defId: v.defId,
      owner: v.owner,
      x: v.x,
      y: v.y,
      heading: v.heading,
      engineOn: v.engineOn,
      fuel: v.fuel,
      wear: v.wear,
      opHours: v.opHours,
      implementId: v.implementId,
      workerId: v.workerId,
      cargo: v.cargo ? { ...v.cargo } : null,
      rented: v.rented,
      driver: v.driver,
    })),
    implements: world.implements.map((i) => ({
      id: i.id,
      defId: i.defId,
      owner: i.owner,
      x: i.x,
      y: i.y,
      heading: i.heading,
      attachedTo: i.attachedTo,
      lowered: i.lowered,
      seedCrop: i.seedCrop,
      seedKg: i.seedKg,
      liquidL: i.liquidL,
      cargo: i.cargo ? { ...i.cargo } : null,
      wear: i.wear,
    })),
    workers: world.workers.map((w) => ({ ...w, legs: w.legs, tasks: w.tasks.map((t) => ({ ...t })) })),
    candidates: world.candidates,
    candidatesDay: world.candidatesDay,
    flags: { ...world.flags },
    npcs: world.npcs,
    storage: { capacity: world.storage.capacity, stock: { ...world.storage.stock } },
    npcStorage: Object.fromEntries(Object.entries(world.npcStorage).map(([k, s]) => [k, { capacity: s.capacity, stock: { ...s.stock } }])),
    fields: world.fields.map((f) => {
      const g = new Uint16Array(f.n);
      for (let i = 0; i < f.n; i++) g[i] = Math.min(65535, Math.round(f.growth[i] * 20000));
      const hi = new Uint8Array(f.n);
      const lo = new Uint8Array(f.n);
      for (let i = 0; i < f.n; i++) {
        hi[i] = g[i] >> 8;
        lo[i] = g[i] & 255;
      }
      return {
        id: f.id,
        owner: f.owner,
        leased: f.leased,
        price: f.price,
        stage: enc(f.stage),
        crop: enc(f.crop),
        gHi: enc(hi),
        gLo: enc(lo),
        moisture: enc(f.moisture.map((m) => m & 0xf8)),
        fertility: enc(f.fertility),
        weeds: enc(f.weeds.map((m) => m & 0xf0)),
        dir: enc(f.dir),
        health: enc(f.health),
        sprayed: enc(f.sprayed),
      };
    }),
  };
}

/** Migração entre versões de save. Cada versão futura acrescenta um passo aqui. */
export function migrate(data: SaveData): SaveData {
  if (!data.version || data.version > SAVE_VERSION) throw new Error("Versão de save incompatível");
  return data;
}

export function deserialize(raw: SaveData, setupWorld: (w: World) => void = () => {}): World {
  const data = migrate(raw);
  const world = new World(data.seed);
  setupWorld(world);
  world.vehicles = [];
  world.implements = [];
  world.workers = [];
  world.time = { ...data.time };
  world.timeScaleIdx = data.timeScaleIdx;
  world.nextId = data.nextId;
  Object.assign(world.economy, { money: data.economy.money, loan: data.economy.loan, ledger: data.economy.ledger, events: data.economy.events ?? [], soldKg: data.economy.soldKg });
  world.player = { ...data.player };
  for (const s of data.vehicles) {
    if (!VEHICLES[s.defId]) continue;
    const v = world.addVehicle(s.defId, s.owner, s.x, s.y, s.heading);
    Object.assign(v, s, { def: VEHICLES[s.defId], cargo: s.cargo ? { ...s.cargo } : v.cargo });
  }
  for (const s of data.implements) {
    if (!IMPLEMENTS[s.defId]) continue;
    const im = world.addImplement(s.defId, s.owner, s.x, s.y, s.heading);
    Object.assign(im, s, { def: IMPLEMENTS[s.defId], cargo: s.cargo ? { ...s.cargo } : im.cargo, lowerAnim: s.lowered ? 1 : 0 });
  }
  world.nextId = Math.max(world.nextId, data.nextId);
  world.workers = data.workers.map((w) => ({ ...w, stuckT: w.stuckT ?? 0, reverseT: w.reverseT ?? 0 }));
  world.candidates = data.candidates;
  world.candidatesDay = data.candidatesDay;
  world.flags = { ...(data.flags ?? {}) };
  world.npcs = data.npcs;
  world.storage.capacity = data.storage.capacity;
  world.storage.stock = { ...data.storage.stock };
  for (const [k, s] of Object.entries(data.npcStorage)) {
    const st = world.npcStorage[k];
    if (st) {
      st.capacity = s.capacity;
      st.stock = { ...s.stock };
    }
  }
  for (const fs of data.fields) {
    const f = world.field(fs.id);
    if (!f) continue;
    f.owner = fs.owner;
    f.leased = fs.leased;
    f.price = fs.price;
    f.stage.set(dec(fs.stage, f.n));
    f.crop.set(dec(fs.crop, f.n));
    const hi = dec(fs.gHi, f.n);
    const lo = dec(fs.gLo, f.n);
    for (let i = 0; i < f.n; i++) f.growth[i] = ((hi[i] << 8) | lo[i]) / 20000;
    f.moisture.set(dec(fs.moisture, f.n));
    f.fertility.set(dec(fs.fertility, f.n));
    f.weeds.set(dec(fs.weeds, f.n));
    f.dir.set(dec(fs.dir, f.n));
    f.health.set(dec(fs.health, f.n));
    f.sprayed.set(dec(fs.sprayed, f.n));
    f.recount();
    f.markAllDirty();
  }
  // estados transitórios: o jogador volta a pé se estava num veículo inexistente
  if (world.player.vehicleId !== null && !world.vehicle(world.player.vehicleId)) world.player.vehicleId = null;
  for (const v of world.vehicles) {
    if (v.driver === "player" && world.player.vehicleId !== v.id) v.driver = null;
  }
  return world;
}

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function saveToStorage(world: World, store: StorageLike = localStorage): boolean {
  try {
    store.setItem(SAVE_KEY, JSON.stringify(serialize(world)));
    return true;
  } catch (e) {
    console.warn("Falha ao salvar", e);
    return false;
  }
}

export function loadFromStorage(store: StorageLike = localStorage): SaveData | null {
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}
