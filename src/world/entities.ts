import type { CropId } from "../data/crops";
import { IMPLEMENTS, VEHICLES, type ImplementDef, type VehicleDef } from "../data/machines";
import type { Cargo } from "./types";

export interface Controls {
  throttle: number;
  steer: number;
  brake: number;
}

export interface WorkBar {
  lx: number;
  ly: number;
  rx: number;
  ry: number;
}

export type DriverKind = "player" | "worker" | null;

export interface Vehicle {
  id: number;
  defId: string;
  def: VehicleDef;
  owner: string;
  x: number;
  y: number;
  heading: number;
  speed: number;
  steer: number;
  engineOn: boolean;
  fuel: number;
  wear: number;
  opHours: number;
  implementId: number | null;
  driver: DriverKind;
  /** Funcionário atribuído (pode estar pausado enquanto o jogador dirige). */
  workerId: number | null;
  cargo: Cargo | null;
  /** Plataforma de corte baixada / debulha ligada (colheitadeiras). */
  lowered: boolean;
  pipeOut: boolean;
  pipeAnim: number;
  rented: boolean;
  ctrl: Controls;
  // estado de execução (não salvo)
  wheelDist: number;
  reel: number;
  lastBar: WorkBar | null;
  unloading: boolean;
  lodAcc: number;
  stuckTimer: number;
  beacon: boolean;
  tip: number;
  tipping: boolean;
  loading: boolean;
}

export interface Implement {
  id: number;
  defId: string;
  def: ImplementDef;
  owner: string;
  /** Ponto de engate no mundo. */
  x: number;
  y: number;
  heading: number;
  attachedTo: number | null;
  lowered: boolean;
  seedCrop: CropId;
  seedKg: number;
  liquidL: number;
  cargo: Cargo | null;
  tip: number;
  tipping: boolean;
  wear: number;
  lastBar: WorkBar | null;
  wheelDist: number;
  lowerAnim: number;
  loading: boolean;
}

export function createVehicle(id: number, defId: string, owner: string, x: number, y: number, heading: number): Vehicle {
  const def = VEHICLES[defId];
  if (!def) throw new Error(`Veículo desconhecido: ${defId}`);
  return {
    id,
    defId,
    def,
    owner,
    x,
    y,
    heading,
    speed: 0,
    steer: 0,
    engineOn: false,
    fuel: def.fuelCapacity * 0.8,
    wear: 0,
    opHours: 0,
    implementId: null,
    driver: null,
    workerId: null,
    cargo: def.cargoKg ? { cropId: null, kg: 0, capacity: def.cargoKg } : null,
    lowered: false,
    pipeOut: false,
    pipeAnim: 0,
    rented: false,
    ctrl: { throttle: 0, steer: 0, brake: 0 },
    wheelDist: 0,
    reel: 0,
    lastBar: null,
    unloading: false,
    lodAcc: 0,
    stuckTimer: 0,
    beacon: false,
    tip: 0,
    tipping: false,
    loading: false,
  };
}

export function createImplement(id: number, defId: string, owner: string, x: number, y: number, heading: number): Implement {
  const def = IMPLEMENTS[defId];
  if (!def) throw new Error(`Implemento desconhecido: ${defId}`);
  return {
    id,
    defId,
    def,
    owner,
    x,
    y,
    heading,
    attachedTo: null,
    lowered: false,
    seedCrop: "wheat",
    seedKg: 0,
    liquidL: 0,
    cargo: def.cargoKg ? { cropId: null, kg: 0, capacity: def.cargoKg } : null,
    tip: 0,
    tipping: false,
    wear: 0,
    lastBar: null,
    wheelDist: 0,
    lowerAnim: 0,
    loading: false,
  };
}

export interface PlayerState {
  x: number;
  y: number;
  heading: number;
  vehicleId: number | null;
  walkPhase: number;
  moving: boolean;
}
