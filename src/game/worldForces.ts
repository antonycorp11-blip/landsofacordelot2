import type { TroopCount } from "../data/troops";
import type { GoodId } from "../data/goods";
import type { HouseId, Point, RegionId } from "../world/types";
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
  /** Posição física mais recente; evita voltar ao último nó ao redirecionar. */
  position: Point | null;
  /** Só muda por visão direta ou por um relato que a força realmente recebeu. */
  knownPlayerPosition: Point | null;
  /** Hora do mundo do avistamento que sustenta a informação atual. */
  lastSeenAt: number;
  /** Área já aberta pela busca desde o último contato. */
  searchRadius: number;
  /** Estado legível da caça ao jogador. */
  playerPursuit: "none" | "tracking" | "searching" | "lost";
  /** Próximo nó vasculhado, escolhido de forma determinística. */
  searchTargetId: string | null;
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
    position:null,
    knownPlayerPosition:null,
    lastSeenAt:-1,
    searchRadius:0,
    playerPursuit:"none",
    searchTargetId:null,
  };
}

export function normalizeForceState(id:string,state:Partial<WorldForceState>&Pick<WorldForceState,"at">):WorldForceState {
  return {
    ...freshForceState(id,state.at,state.resting??0),
    ...state,
    cargo:{...(state.cargo??{})},
    position:state.position&&Number.isFinite(state.position.x)&&Number.isFinite(state.position.y)?{...state.position}:null,
    knownPlayerPosition:state.knownPlayerPosition&&Number.isFinite(state.knownPlayerPosition.x)&&Number.isFinite(state.knownPlayerPosition.y)?{...state.knownPlayerPosition}:null,
  };
}

/** Ordem usada pela história ou por outro sistema para iniciar uma caçada. */
export function beginPlayerPursuit(force:WorldForceState,playerPosition:Point,worldHours:number):WorldForceState {
  return {...force,knownPlayerPosition:{...playerPosition},lastSeenAt:worldHours,searchRadius:0,
    playerPursuit:"tracking",searchTargetId:null};
}

export function playerPursuitLabel(force:WorldForceState):string|null {
  if(force.playerPursuit==="tracking")return "No seu encalço";
  if(force.playerPursuit==="searching")return "Procurando você";
  if(force.playerPursuit==="lost")return "Perdeu o seu rastro";
  return null;
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
