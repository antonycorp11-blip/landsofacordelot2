import type { Vec2 } from "../core/math";
import type { CropId } from "../data/crops";
import type { WorkOp } from "../data/machines";

export type TaskStatus = "queued" | "active" | "done" | "failed" | "cancelled";

export interface WorkerTask {
  id: number;
  vehicleId: number;
  fieldId: number;
  op: WorkOp;
  cropId?: CropId;
  status: TaskStatus;
  progress: number;
  reason?: string;
}

export type LegKind = "road" | "approach" | "lane" | "turn" | "park";

export interface Leg {
  kind: LegKind;
  pts: Vec2[];
  lane?: number;
  speedKmh: number;
  clean?: boolean;
}

export type WorkerState =
  | "idle"
  | "walking"
  | "walkHome"
  | "driving"
  | "waiting"
  | "servicing"
  | "paused"
  | "homeward";

export type Errand = "none" | "seed" | "fuel" | "unload";

export interface Worker {
  id: number;
  name: string;
  owner: string;
  salary: number;
  skill: number;
  specialty: WorkOp;
  tasks: WorkerTask[];
  state: WorkerState;
  vehicleId: number | null;
  x: number;
  y: number;
  heading: number;
  walkPhase: number;
  note: string;
  legs: Leg[];
  legIdx: number;
  segIdx: number;
  errand: Errand;
  timer: number;
  blockedTimer: number;
  /** Trabalho acumulado (s) para cálculo de salário. */
  paidSeconds: number;
  hiredDay: number;
}

export interface Candidate {
  name: string;
  salary: number;
  skill: number;
  specialty: WorkOp;
}
