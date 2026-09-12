/**
 * O ESTADO DA CAMPANHA.
 *
 * Uma única fonte de verdade para tudo que é do JOGADOR: quem ele é, o que
 * sabe, quanto tem, quem anda com ele e como o mundo o vê. O mundo em si —
 * geografia, estradas, Casas — continua sendo dado fixo noutro lugar; aqui só
 * mora o que muda durante uma partida.
 *
 * Persiste em `localStorage` a cada alteração. A gravação é adiada para o fim
 * do quadro: recrutar oito milicianos é uma sequência de mutações e não faz
 * sentido serializar oito vezes.
 *
 * Reatividade no mesmo padrão de `data/territories.ts`: uma versão que
 * incrementa e um `useSyncExternalStore`. Sem biblioteca de estado — o que o
 * jogo precisa cabe em cem linhas e não justifica uma dependência.
 */
import { useSyncExternalStore } from "react";
import { heroById, heroes, type Attributes } from "../data/heroes";
import { startingSkills, type SkillValues } from "./progression";
import { emptyCareerXp, type CareerXp } from "./careers";
import type { TroopCount, TroopId } from "../data/troops";
import type { AgentClass, HouseId } from "../world/types";

const SAVE_KEY = "acordelot.campanha.v1";

export type CompanionStatus = "IN_PARTY" | "AVAILABLE" | "TRAVELING" | "CAPTURED" | "WOUNDED";

/** Um dos quatro inícios que NÃO foi escolhido: continua sendo gente. */
export type CompanionState = {
  id: string;
  level: number;
  xp: number;
  attributes: Attributes;
  skills: SkillValues;
  careerXp: CareerXp;
  status: CompanionStatus;
  /** −100 a +100. Recrutar exige relação. */
  relation: number;
  locationPoiId: string;
};

export type GameState = {
  version: number;
  /** false = ainda na escolha de personagem. */
  started: boolean;
  heroId: string | null;

  level: number;
  xp: number;
  attributes: Attributes;
  skills: SkillValues;
  careerXp: CareerXp;

  /** Pontos ganhos por nível e ainda não gastos. */
  attributePoints: number;
  skillPoints: number;

  /** Peso social e político. Sobe e desce, e não é XP. */
  influence: number;
  gold: number;

  troops: TroopCount;
  companions: Record<string, CompanionState>;

  /** Recrutas ainda disponíveis por estrutura, e o dia da última reposição. */
  recruitPools: Record<string, TroopCount>;
  poolRefreshDay: Record<string, number>;

  localInfluence: Record<string, number>;
  houseRelations: Partial<Record<HouseId, number>>;
};

const DEFAULT_RELATIONS: Partial<Record<HouseId, number>> = {
  house_valdoria: 0, house_karneth: -18, house_aurenna: 12, house_silvarden: 5,
  house_dravenor: -4, house_elmwood: 8, house_caelmont: 3, house_morvath: -9,
  house_veyr: 15, house_rosethorne: 2,
};

/** Estado de antes de escolher personagem. */
function blank(): GameState {
  return {
    version: 1,
    started: false,
    heroId: null,
    level: 1,
    xp: 0,
    attributes: { command: 2, stewardship: 2, diplomacy: 2, conviction: 2 },
    skills: startingSkills({}),
    careerXp: emptyCareerXp(),
    attributePoints: 0,
    skillPoints: 0,
    influence: 5,
    gold: 0,
    troops: {},
    companions: {},
    recruitPools: {},
    poolRefreshDay: {},
    localInfluence: {},
    houseRelations: { ...DEFAULT_RELATIONS },
  };
}

/* ------------------------------ leitura ------------------------------ */

let state: GameState = load() ?? blank();
let version = 0;
const listeners = new Set<() => void>();

export function getState(): GameState {
  return state;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useGame(): GameState {
  useSyncExternalStore(subscribe, () => version, () => version);
  return state;
}

/* ------------------------------ escrita ------------------------------ */

let saveScheduled = false;

/**
 * Toda mutação passa por aqui.
 *
 * Recebe uma função que devolve o estado novo — nunca muta o antigo, para que
 * o React consiga comparar e para que um bug de mutação não apareça só três
 * telas depois.
 */
export function update(fn: (s: GameState) => GameState) {
  state = fn(state);
  version++;
  for (const l of listeners) l();
  if (!saveScheduled) {
    saveScheduled = true;
    queueMicrotask(() => {
      saveScheduled = false;
      save();
    });
  }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Aba anônima ou armazenamento cheio: a partida continua, só não persiste.
  }
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed?.version !== 1) return null;
    // Preenche o que uma versão anterior possa não ter gravado.
    return { ...blank(), ...parsed, skills: { ...startingSkills({}), ...parsed.skills } };
  } catch {
    return null;
  }
}

/** Recomeça do zero, de volta à escolha de personagem. */
export function resetCampaign() {
  update(() => blank());
}

/* --------------------------- início de jogo --------------------------- */

/**
 * Escolhe o personagem e monta a campanha.
 *
 * Os outros três NÃO somem: viram companheiros em potencial, cada um com nível,
 * atributos e habilidades próprios, parados onde a história os deixou.
 */
export function startCampaign(heroId: string) {
  const hero = heroById.get(heroId);
  if (!hero) return;

  const companions: Record<string, CompanionState> = {};
  for (const other of heroes) {
    if (other.id === heroId) continue;
    companions[other.id] = {
      id: other.id,
      level: 2,
      xp: 0,
      attributes: { ...other.attributes },
      skills: startingSkills(other.startingSkills),
      careerXp: { ...emptyCareerXp(), ...other.startingCareerXp },
      status: "AVAILABLE",
      // Ninguém começa devendo nada a você.
      relation: 0,
      locationPoiId: other.homePoiId,
    };
  }

  update(() => ({
    ...blank(),
    started: true,
    heroId,
    attributes: { ...hero.attributes },
    skills: startingSkills(hero.startingSkills),
    careerXp: { ...emptyCareerXp(), ...hero.startingCareerXp },
    influence: 5,
    // Humilde de propósito: a primeira tropa tem de ser conquistada.
    gold: 120,
    companions,
  }));
}

/* ----------------------------- açucares ------------------------------ */

export function setGold(next: number) {
  update((s) => ({ ...s, gold: Math.max(0, Math.round(next)) }));
}

export function spendGold(amount: number): boolean {
  if (state.gold < amount) return false;
  update((s) => ({ ...s, gold: s.gold - amount }));
  return true;
}

export function setTroops(troops: TroopCount) {
  update((s) => ({ ...s, troops }));
}

export function addTroops(id: TroopId, amount: number) {
  update((s) => ({ ...s, troops: { ...s.troops, [id]: (s.troops[id] ?? 0) + amount } }));
}

export function setRecruitPool(poiId: string, pool: TroopCount, day: number) {
  update((s) => ({
    ...s,
    recruitPools: { ...s.recruitPools, [poiId]: pool },
    poolRefreshDay: { ...s.poolRefreshDay, [poiId]: day },
  }));
}

export function setCompanionStatus(id: string, status: CompanionStatus) {
  update((s) =>
    s.companions[id] ? { ...s, companions: { ...s.companions, [id]: { ...s.companions[id], status } } } : s,
  );
}

export function addCompanionRelation(id: string, amount: number) {
  update((s) => {
    const c = s.companions[id];
    if (!c) return s;
    const relation = Math.max(-100, Math.min(100, c.relation + amount));
    return { ...s, companions: { ...s.companions, [id]: { ...c, relation } } };
  });
}

export function addHouseRelation(houseId: HouseId, amount: number) {
  update((s) => ({
    ...s,
    houseRelations: {
      ...s.houseRelations,
      [houseId]: Math.max(-100, Math.min(100, (s.houseRelations[houseId] ?? 0) + amount)),
    },
  }));
}

export function addLocalInfluence(poiId: string, amount: number) {
  update((s) => ({
    ...s,
    localInfluence: {
      ...s.localInfluence,
      [poiId]: Math.max(0, Math.min(100, (s.localInfluence[poiId] ?? 0) + amount)),
    },
  }));
}

/** Companheiros que estão de fato no grupo. */
export function partyCompanions(s: GameState = state): CompanionState[] {
  return Object.values(s.companions).filter((c) => c.status === "IN_PARTY");
}

export type { AgentClass };
