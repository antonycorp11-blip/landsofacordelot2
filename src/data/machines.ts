import type { CropId } from "./crops";

export type HitchType = "3pt" | "drawbar";
export type VehicleCategory = "tractor" | "combine" | "truck";
export type ImplementCategory = "cultivator" | "plow" | "seeder" | "sprayer" | "trailer";
export type WorkOp = "cultivate" | "plow" | "plant" | "spray" | "harvest";

export interface WheelSpec {
  r: number;
  w: number;
  track: number;
  x: number;
  dual?: boolean;
}

export interface VehicleDef {
  id: string;
  name: string;
  brand: string;
  category: VehicleCategory;
  sizeClass: "leve" | "médio" | "pesado" | "-";
  price: number;
  rentPerDay?: number;
  powerHp: number;
  maxSpeedKmh: number;
  reverseKmh: number;
  accel: number;
  brake: number;
  length: number;
  width: number;
  wheelbase: number;
  maxSteerDeg: number;
  steerRateDeg: number;
  fuelCapacity: number;
  fuelLph: number;
  wearPerHour: number;
  hitch?: { x: number; types: HitchType[] };
  front: WheelSpec;
  rear: WheelSpec;
  rearSteer?: boolean;
  paint: { body: string; accent: string; roof: string; rim: string };
  /** Parâmetros geométricos de carroceria (todos em metros, eixo x à frente). */
  body: { hoodFront: number; hoodBack: number; hoodWidth: number; cabinFront: number; cabinBack: number; cabinWidth: number; exhaustX: number };
  combine?: {
    headerWidth: number;
    headerDepth: number;
    harvestKmh: number;
    unloadKgS: number;
    pipeLength: number;
    pipePivotX: number;
    crops: CropId[];
  };
  cargoKg?: number;
}

export interface ImplementDef {
  id: string;
  name: string;
  category: ImplementCategory;
  hitch: HitchType;
  price: number;
  powerHp: number;
  workWidth: number;
  workSpeedKmh: number;
  /** Comprimento total (da ponta de engate à traseira). */
  length: number;
  width: number;
  /** Distância da ponta de engate até o eixo (implementos de arrasto). */
  drawbar: number;
  /** Distância da ponta de engate até a linha de trabalho. */
  workLineFromHitch: number;
  op?: WorkOp;
  seedCapacityKg?: number;
  liquidCapacityL?: number;
  cargoKg?: number;
  wearPerHa: number;
  paint: { frame: string; accent: string };
}

export const VEHICLES: Record<string, VehicleDef> = {
  "tr-campeiro-75": {
    id: "tr-campeiro-75",
    name: "Campeiro 75",
    brand: "Ventura",
    category: "tractor",
    sizeClass: "leve",
    price: 98000,
    powerHp: 75,
    maxSpeedKmh: 32,
    reverseKmh: 12,
    accel: 2.4,
    brake: 6,
    length: 3.9,
    width: 2.0,
    wheelbase: 2.2,
    maxSteerDeg: 42,
    steerRateDeg: 70,
    fuelCapacity: 110,
    fuelLph: 9,
    wearPerHour: 0.006,
    hitch: { x: -1.75, types: ["3pt", "drawbar"] },
    front: { r: 0.46, w: 0.3, track: 1.5, x: 1.15 },
    rear: { r: 0.72, w: 0.42, track: 1.55, x: -0.95 },
    paint: { body: "#c8452f", accent: "#2b2b2b", roof: "#e9e4da", rim: "#e8c53a" },
    body: { hoodFront: 1.9, hoodBack: 0.15, hoodWidth: 0.82, cabinFront: 0.25, cabinBack: -1.45, cabinWidth: 1.34, exhaustX: 0.55 },
  },
  "tr-lavrador-140": {
    id: "tr-lavrador-140",
    name: "Lavrador 140",
    brand: "Ventura",
    category: "tractor",
    sizeClass: "médio",
    price: 215000,
    powerHp: 140,
    maxSpeedKmh: 40,
    reverseKmh: 14,
    accel: 2.6,
    brake: 6.5,
    length: 4.6,
    width: 2.4,
    wheelbase: 2.6,
    maxSteerDeg: 40,
    steerRateDeg: 70,
    fuelCapacity: 240,
    fuelLph: 16,
    wearPerHour: 0.005,
    hitch: { x: -2.05, types: ["3pt", "drawbar"] },
    front: { r: 0.58, w: 0.4, track: 1.8, x: 1.35 },
    rear: { r: 0.86, w: 0.55, track: 1.85, x: -1.15 },
    paint: { body: "#2f7d46", accent: "#262626", roof: "#efeee6", rim: "#f0d24a" },
    body: { hoodFront: 2.25, hoodBack: 0.2, hoodWidth: 0.98, cabinFront: 0.3, cabinBack: -1.7, cabinWidth: 1.6, exhaustX: 0.6 },
  },
  "tr-tita-280": {
    id: "tr-tita-280",
    name: "Titã 280",
    brand: "Serrano",
    category: "tractor",
    sizeClass: "pesado",
    price: 420000,
    powerHp: 280,
    maxSpeedKmh: 42,
    reverseKmh: 15,
    accel: 2.2,
    brake: 6,
    length: 5.6,
    width: 3.0,
    wheelbase: 3.05,
    maxSteerDeg: 38,
    steerRateDeg: 60,
    fuelCapacity: 520,
    fuelLph: 30,
    wearPerHour: 0.004,
    hitch: { x: -2.55, types: ["3pt", "drawbar"] },
    front: { r: 0.75, w: 0.52, track: 2.0, x: 1.6 },
    rear: { r: 0.98, w: 0.6, track: 2.0, x: -1.45, dual: true },
    paint: { body: "#2c5f9e", accent: "#202020", roof: "#f2f2f2", rim: "#c9ccd2" },
    body: { hoodFront: 2.75, hoodBack: 0.25, hoodWidth: 1.12, cabinFront: 0.35, cabinBack: -1.95, cabinWidth: 1.75, exhaustX: 0.75 },
  },
  "cb-ceifa-6": {
    id: "cb-ceifa-6",
    name: "Ceifa 6",
    brand: "Ventura",
    category: "combine",
    sizeClass: "-",
    price: 540000,
    rentPerDay: 2400,
    powerHp: 260,
    maxSpeedKmh: 22,
    reverseKmh: 8,
    accel: 1.6,
    brake: 5,
    length: 7.6,
    width: 3.3,
    wheelbase: 3.4,
    maxSteerDeg: 40,
    steerRateDeg: 55,
    fuelCapacity: 400,
    fuelLph: 26,
    wearPerHour: 0.007,
    front: { r: 0.85, w: 0.62, track: 2.7, x: 1.9 },
    rear: { r: 0.55, w: 0.4, track: 2.4, x: -2.2 },
    rearSteer: true,
    paint: { body: "#d9a420", accent: "#2a2a2a", roof: "#f1efe6", rim: "#3a3a3a" },
    body: { hoodFront: 2.4, hoodBack: -3.6, hoodWidth: 2.9, cabinFront: 3.2, cabinBack: 1.6, cabinWidth: 1.6, exhaustX: -1.4 },
    combine: { headerWidth: 6, headerDepth: 1.7, harvestKmh: 8, unloadKgS: 260, pipeLength: 5.2, pipePivotX: -0.4, crops: ["wheat", "soy", "corn"] },
    cargoKg: 5000,
  },
  "cb-ceifa-9": {
    id: "cb-ceifa-9",
    name: "Ceifa 9 Max",
    brand: "Serrano",
    category: "combine",
    sizeClass: "-",
    price: 890000,
    rentPerDay: 3900,
    powerHp: 420,
    maxSpeedKmh: 25,
    reverseKmh: 8,
    accel: 1.5,
    brake: 5,
    length: 8.6,
    width: 3.6,
    wheelbase: 3.8,
    maxSteerDeg: 38,
    steerRateDeg: 50,
    fuelCapacity: 650,
    fuelLph: 38,
    wearPerHour: 0.006,
    front: { r: 0.95, w: 0.7, track: 3.0, x: 2.1 },
    rear: { r: 0.6, w: 0.45, track: 2.6, x: -2.5 },
    rearSteer: true,
    paint: { body: "#2c5f9e", accent: "#202020", roof: "#f2f2f2", rim: "#3a3a3a" },
    body: { hoodFront: 2.8, hoodBack: -4.1, hoodWidth: 3.2, cabinFront: 3.6, cabinBack: 1.9, cabinWidth: 1.8, exhaustX: -1.6 },
    combine: { headerWidth: 9, headerDepth: 1.8, harvestKmh: 9, unloadKgS: 420, pipeLength: 6.8, pipePivotX: -0.5, crops: ["wheat", "soy", "corn"] },
    cargoKg: 9500,
  },
  "tk-graneleiro": {
    id: "tk-graneleiro",
    name: "Graneleiro 14t",
    brand: "Rota",
    category: "truck",
    sizeClass: "-",
    price: 265000,
    powerHp: 330,
    maxSpeedKmh: 75,
    reverseKmh: 14,
    accel: 2.0,
    brake: 6,
    length: 9.2,
    width: 2.55,
    wheelbase: 5.2,
    maxSteerDeg: 36,
    steerRateDeg: 60,
    fuelCapacity: 300,
    fuelLph: 22,
    wearPerHour: 0.004,
    front: { r: 0.52, w: 0.34, track: 2.05, x: 3.2 },
    rear: { r: 0.52, w: 0.34, track: 1.9, x: -2.0, dual: true },
    paint: { body: "#e7e3d8", accent: "#1f2a38", roof: "#c33b2c", rim: "#b8bcc4" },
    body: { hoodFront: 4.6, hoodBack: 2.6, hoodWidth: 2.4, cabinFront: 4.4, cabinBack: 2.7, cabinWidth: 2.4, exhaustX: 2.5 },
    cargoKg: 14000,
  },
};

export const IMPLEMENTS: Record<string, ImplementDef> = {
  "cult-3": {
    id: "cult-3",
    name: "Cultivador Leve 3 m",
    category: "cultivator",
    hitch: "3pt",
    price: 18000,
    powerHp: 55,
    workWidth: 3,
    workSpeedKmh: 12,
    length: 1.6,
    width: 3.1,
    drawbar: 0,
    workLineFromHitch: 1.4,
    op: "cultivate",
    wearPerHa: 0.012,
    paint: { frame: "#3d6fb0", accent: "#d9d9d9" },
  },
  "cult-6": {
    id: "cult-6",
    name: "Cultivador 6 m",
    category: "cultivator",
    hitch: "3pt",
    price: 46000,
    powerHp: 125,
    workWidth: 6,
    workSpeedKmh: 13,
    length: 2.0,
    width: 6.1,
    drawbar: 0,
    workLineFromHitch: 1.8,
    op: "cultivate",
    wearPerHa: 0.008,
    paint: { frame: "#3d6fb0", accent: "#d9d9d9" },
  },
  "plow-4": {
    id: "plow-4",
    name: "Arado 4 Aivecas",
    category: "plow",
    hitch: "3pt",
    price: 26000,
    powerHp: 90,
    workWidth: 2.0,
    workSpeedKmh: 9,
    length: 3.4,
    width: 2.2,
    drawbar: 0,
    workLineFromHitch: 3.0,
    op: "plow",
    wearPerHa: 0.02,
    paint: { frame: "#b23a2d", accent: "#cfcfcf" },
  },
  "seed-3": {
    id: "seed-3",
    name: "Plantadeira 3 m",
    category: "seeder",
    hitch: "drawbar",
    price: 32000,
    powerHp: 50,
    workWidth: 3,
    workSpeedKmh: 11,
    length: 4.2,
    width: 3.2,
    drawbar: 3.0,
    workLineFromHitch: 3.7,
    op: "plant",
    seedCapacityKg: 600,
    wearPerHa: 0.01,
    paint: { frame: "#2e8b57", accent: "#e3c443" },
  },
  "seed-6": {
    id: "seed-6",
    name: "Plantadeira 6 m",
    category: "seeder",
    hitch: "drawbar",
    price: 88000,
    powerHp: 115,
    workWidth: 6,
    workSpeedKmh: 12,
    length: 4.8,
    width: 6.2,
    drawbar: 3.4,
    workLineFromHitch: 4.3,
    op: "plant",
    seedCapacityKg: 1600,
    wearPerHa: 0.007,
    paint: { frame: "#2e8b57", accent: "#e3c443" },
  },
  "spray-12": {
    id: "spray-12",
    name: "Pulverizador 12 m (adubo líquido)",
    category: "sprayer",
    hitch: "drawbar",
    price: 38000,
    powerHp: 60,
    workWidth: 12,
    workSpeedKmh: 14,
    length: 5.0,
    width: 2.4,
    drawbar: 3.2,
    workLineFromHitch: 4.6,
    op: "spray",
    liquidCapacityL: 2500,
    wearPerHa: 0.004,
    paint: { frame: "#e0e0e0", accent: "#d04a2b" },
  },
  "trailer-8": {
    id: "trailer-8",
    name: "Carreta Basculante 8 t",
    category: "trailer",
    hitch: "drawbar",
    price: 21000,
    powerHp: 40,
    workWidth: 0,
    workSpeedKmh: 0,
    length: 6.2,
    width: 2.4,
    drawbar: 4.2,
    workLineFromHitch: 0,
    cargoKg: 8000,
    wearPerHa: 0,
    paint: { frame: "#a8452f", accent: "#3b3b3b" },
  },
  "trailer-16": {
    id: "trailer-16",
    name: "Carreta Graneleira 16 t",
    category: "trailer",
    hitch: "drawbar",
    price: 46000,
    powerHp: 100,
    workWidth: 0,
    workSpeedKmh: 0,
    length: 8.4,
    width: 2.7,
    drawbar: 5.6,
    workLineFromHitch: 0,
    cargoKg: 16000,
    wearPerHa: 0,
    paint: { frame: "#2c5f9e", accent: "#3b3b3b" },
  },
};

export const OP_LABEL: Record<WorkOp, string> = {
  cultivate: "Cultivar",
  plow: "Arar",
  plant: "Plantar",
  spray: "Adubar",
  harvest: "Colher",
};

export function kmh(ms: number): number {
  return ms * 3.6;
}
export function ms(kmhValue: number): number {
  return kmhValue / 3.6;
}
