import type { TroopCount } from "../data/troops";
import type { GoodId } from "../data/goods";
import type { HouseId, RegionId } from "../world/types";
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
  ownerHouseId?: HouseId;
  food: number;
  cargo: Partial<Record<GoodId, number>>;
  objective: "roam" | "trade" | "hunt" | "raid" | "gather" | "siege" | "defend" | "return";
  objectiveLabel: string;
  targetForceId: string | null;
  targetPoiId: string | null;
  targetHouseId?: HouseId;
  siegeProgress: number;
  lastActionDay: number;
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
    ownerHouseId:wanderer?.houseId,
    food:wanderer?.routine==="exército"?18:wanderer?.routine==="patrulha"?8:5,
    cargo:{},
    objective:wanderer?.routine==="comércio"?"trade":wanderer?.routine==="patrulha"?"hunt":wanderer?.routine==="pilhagem"?"raid":wanderer?.routine==="exército"?"defend":"roam",
    objectiveLabel:wanderer?.routine==="comércio"?"Procurando uma rota lucrativa":wanderer?.routine==="patrulha"?"Vigiando as estradas":wanderer?.routine==="pilhagem"?"Caçando uma presa":wanderer?.routine==="exército"?"Reunida em seu território":"Seguindo viagem",
    targetForceId:null,
    targetPoiId:null,
    siegeProgress:0,
    lastActionDay:0,
  };
}

export function normalizeForceState(id:string,state:Partial<WorldForceState>&Pick<WorldForceState,"at">):WorldForceState {
  return {...freshForceState(id,state.at,state.resting??0),...state,cargo:{...(state.cargo??{})}};
}

export function aggressionCost(routine: WandererRoutine): number {
  if (routine === "pilhagem") return 0;
  if (routine === "patrulha" || routine === "cortejo" || routine === "exército") return 10;
  if (routine === "peregrinação") return 8;
  return 6;
}

export function forceKind(routine: WandererRoutine): string {
  return routine === "pilhagem" ? "hostile" : routine === "patrulha" || routine === "exército" ? "lawful" : "neutral";
}
