import type { Vec2 } from "../core/math";
import type { CropId } from "../data/crops";
import type { BuildingDef, ZoneType } from "../data/buildings";

export type RoadKind = "asphalt" | "dirt" | "track";

export interface RoadNode {
  id: number;
  x: number;
  y: number;
  edges: number[];
}

export interface RoadEdge {
  id: number;
  a: number;
  b: number;
  kind: RoadKind;
  width: number;
  /** Comprimento acumulado ao longo da via (para marcação tracejada contínua). */
  s0: number;
  len: number;
}

export interface Building {
  id: number;
  def: BuildingDef;
  x: number;
  y: number;
  rot: number;
  variant: number;
  owner: string | null;
  label?: string;
}

export interface Zone {
  id: number;
  type: ZoneType;
  /** Retângulo orientado. */
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  label: string;
  buyerId?: string;
  owner: string | null;
}

export interface Tree {
  x: number;
  y: number;
  r: number;
  kind: number;
  phase: number;
}

export interface Fence {
  pts: Vec2[];
}

export interface Pond {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
}

export interface Place {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: "farm" | "coop" | "dealer" | "fuel" | "mill" | "npc";
  nodeId: number;
}

export interface Buyer {
  id: string;
  name: string;
  priceMul: Record<CropId, number>;
  accepts: CropId[];
}

export interface Cargo {
  cropId: CropId | null;
  kg: number;
  capacity: number;
}

export interface ParkingSpot {
  x: number;
  y: number;
  heading: number;
}

export type { Vec2 };
