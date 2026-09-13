import type { TroopCount } from "../data/troops";
import type { RegionId } from "../world/types";
import { partyOf, wanderers, type WandererRoutine } from "../world/wanderers";

/** Parte mutável de cada grupo que percorre o mapa. */
export type WorldForceState = {
  at: string;
  to: string | null;
  progress: number;
  resting: number;
  troops: TroopCount;
  status: "active" | "defeated";
  returnsAt: number;
};

export type WorldForceBattleSource = {
  forceId: string;
  regionId: RegionId;
  routine: WandererRoutine;
};

export const wandererById = new Map(wanderers.map((wanderer) => [wanderer.id, wanderer]));

export function freshForceState(id: string, at: string, resting = 0): WorldForceState {
  const wanderer = wandererById.get(id);
  return {
    at,
    to: null,
    progress: 0,
    resting,
    troops: wanderer ? { ...partyOf(wanderer) } : {},
    status: "active",
    returnsAt: 0,
  };
}

export function aggressionCost(routine: WandererRoutine): number {
  if (routine === "pilhagem") return 0;
  if (routine === "patrulha" || routine === "cortejo") return 10;
  if (routine === "peregrinação") return 8;
  return 6;
}

export function forceKind(routine: WandererRoutine): string {
  return routine === "pilhagem" ? "hostile" : routine === "patrulha" ? "lawful" : "neutral";
}
