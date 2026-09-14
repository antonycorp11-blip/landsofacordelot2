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
import { saveStop } from "../world/roadStops";
import { openingCarriage, openingStart } from "./scenes/spawn";
import { heroById, heroes, type Attributes } from "../data/heroes";
import { startingSkills, type SkillValues } from "./progression";
import { emptyCareerXp, type CareerXp } from "./careers";
import type { TroopCount, TroopId } from "../data/troops";
import type { GoodId } from "../data/goods";
import type { AgentClass, FiefOwner, HouseId } from "../world/types";

import { freshAdventure, type AdventureState, type JourneySave } from "./adventureState";
import type { War } from "./worldSim";
import type { Estate } from "./estates";
import { freshAllegiance, type Allegiance } from "./allegiance";
import { freshBalance, type BalanceState } from "./balance";
import type { WorldEventInstance } from "./worldEvents";
import { normalizeForceState, type WorldForceState } from "./worldForces";

/**
 * A versão faz parte da chave de propósito: quando uma mudança altera o
 * significado do que estava gravado — o relógio que agora anda parado, por
 * exemplo —, subir o número descarta o save antigo em vez de ressuscitar um
 * estado que o jogo novo não sabe ler.
 */
const SAVE_KEY = "acordelot.campanha.v6";
/** Chaves de versões anteriores, apagadas ao carregar. */
const OLD_KEYS = ["acordelot.campanha.v1", "acordelot.campanha.v2", "acordelot.campanha.v3", "acordelot.campanha.v4", "acordelot.campanha.v5"];

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
  journey: JourneySave | null;
  adventure: AdventureState;
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
  food: number;
  /** Mercadorias carregadas; provisões continuam em `food`. */
  inventory: Partial<Record<GoodId, number>>;
  /** Valor contábil da carga, usado para mostrar lucro real ao vender. */
  inventoryCost: Partial<Record<GoodId, number>>;
  marketStocks: Record<string, Partial<Record<GoodId, number>>>;
  marketRefreshDay: Record<string, number>;
  tradeProfit: number;
  tradesCompleted: number;

  troops: TroopCount;
  /** Fora da linha, mas ainda no grupo. Recuperam uma parte a cada dia alimentado. */
  wounded: TroopCount;
  /** Capturados que podem ser libertados, recrutados ou resgatados depois. */
  prisoners: TroopCount;
  /** Último dia em que cativos foram interrogados por informação de estrada. */
  lastPrisonerIntelDay: number;
  /** Grupos visíveis no mapa, incluindo posição, sobreviventes e tempo de retorno. */
  worldForces: Record<string, WorldForceState>;
  /** Grupo que o jogador está tentando interceptar. */
  pursuedForceId: string | null;
  /** Efeito acumulado de patrulhamento ou banditismo sobre estradas e mercados. */
  regionSecurity: Partial<Record<import("../world/types").RegionId, number>>;
  companions: Record<string, CompanionState>;

  /** Recrutas ainda disponíveis por estrutura, e o dia da última reposição. */
  recruitPools: Record<string, TroopCount>;
  poolRefreshDay: Record<string, number>;

  localInfluence: Record<string, number>;
  houseRelations: Partial<Record<HouseId, number>>;
  /** Senhorios que trocaram de dono nesta campanha. O resto usa o dono histórico. */
  fiefOwners: Record<string, FiefOwner>;
  /** Como você administra cada terra sua: imposto, prosperidade, lealdade, guarnição. */
  fiefEstates: Record<string, Estate>;
  /** De quem você é: livre, vassalo de uma Casa, ou soberano. */
  allegiance: Allegiance;

  /**
   * O QUE VOCÊ SABE.
   *
   * O centro da campanha nova. Não é um contador de progresso: é o que o
   * jogador descobriu, o que ele ainda não entendeu, e o que tem na mão para
   * provar. A ordem em que chega não importa.
   */
  knowledge: { facts: string[]; questions: string[]; evidence: string[] };
  /** Marcas deixadas pelas escolhas, lidas por cenas futuras. */
  storyFlags: string[];
  /**
   * Para que lado ele está andando: usar os selos ou quebrá-los. Fica no
   * estado e não numa tela de fim de jogo porque o jogador precisa vê-la
   * mexer na hora em que cobra um imposto.
   */
  balance: BalanceState;
  /** Coisas paradas no mapa: carroças, acampamentos, campos de batalha. */
  worldEvents: Record<string, WorldEventInstance>;

  /** Guerras entre Casas, movidas pelo mundo e não pelo jogador. */
  wars: War[];
  /** Último dia em que o tabuleiro se mexeu. */
  worldTickDay: number;

  /** Último dia do mundo já cobrado. Impede pagar salário duas vezes. */
  dayProcessed: number;
  /** Dias seguidos sem soldo ou sem comida. É o que faz homem desertar. */
  hardshipDays: number;
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
    journey: null,
    adventure: freshAdventure(),
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
    food: 12,
    inventory: {},
    inventoryCost: {},
    marketStocks: {},
    marketRefreshDay: {},
    tradeProfit: 0,
    tradesCompleted: 0,
    troops: {},
    wounded: {},
    prisoners: {},
    lastPrisonerIntelDay: 0,
    worldForces: {},
    pursuedForceId: null,
    regionSecurity: {},
    companions: {},
    recruitPools: {},
    poolRefreshDay: {},
    localInfluence: {},
    houseRelations: { ...DEFAULT_RELATIONS },
    fiefOwners: {},
    fiefEstates: {},
    allegiance: freshAllegiance(),
    knowledge: { facts: [], questions: [], evidence: [] },
    storyFlags: [],
    balance: freshBalance(),
    worldEvents: {},
    wars: [],
    worldTickDay: 0,
    dayProcessed: 0,
    hardshipDays: 0,
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
      flushGameSave();
    });
  }
}

export function flushGameSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Aba anônima ou armazenamento cheio: a partida continua, só não persiste.
  }
}

function load(): GameState | null {
  try {
    // Não deixa save velho ocupando espaço depois de uma virada de versão.
    for (const key of OLD_KEYS) localStorage.removeItem(key);
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed?.version !== 1) return null;
    // Preenche o que uma versão anterior possa não ter gravado.
    const adventure = freshAdventure();
    const merged = {
      ...blank(), ...parsed,
      skills: { ...startingSkills({}), ...parsed.skills },
      balance: { ...freshBalance(), ...parsed.balance },
      adventure: { ...adventure, ...parsed.adventure, tutorial: { ...adventure.tutorial, ...parsed.adventure?.tutorial } },
      worldForces:Object.fromEntries(Object.entries(parsed.worldForces??{}).map(([id,force])=>[id,normalizeForceState(id,force)])),
    };
    // Save anterior à economia diária: começa a cobrar de hoje, e não seis
    // dias de soldo de uma vez por uma regra que não existia quando ele jogou.
    if (!merged.dayProcessed) merged.dayProcessed = Math.floor((merged.journey?.hours ?? 0) / 24) + 1;
    return merged;
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
    // A campanha não começa num salão nem com o jogador olhando o mapa sem
    // saber o que fazer: começa na cena da carruagem, e ele já está lá quando
    // o texto acaba.
    journey: {
      currentNodeId: null,
      destinationId: null,
      at: saveStop(openingStart()),
      from: null,
      to: null,
      distance: 0,
      hours: 6,
      speed: 1,
      paused: false,
    },
    dayProcessed: 1,
    /**
     * A CARRUAGEM.
     *
     * Nasce a poucos minutos de cavalgada do ponto inicial e FORA da estrada,
     * de propósito: o jogador a encontra porque estava olhando o mapa, não
     * porque uma seta o mandou. Ignorá-la é permitido — e é uma escolha.
     */
    worldEvents: (() => { const c = openingCarriage(); return { [c.id]: c }; })(),
    adventure: {
      ...freshAdventure(),
      // Abre no escuro, com o texto sendo escrito. Nada de tutorial e nada de
      // seta: três linhas e a curva da trilha.
      cinematic: { sceneId: "wrecked_carriage", beatId: "abertura", eventId: "we_carruagem" },
    },
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
    s.companions[id] ? { ...s, companions: { ...s.companions, [id]: { ...s.companions[id], status, ...(status === "AVAILABLE" && s.companions[id].status === "IN_PARTY" ? {locationPoiId:s.journey?.currentNodeId ?? heroById.get(s.heroId ?? "")?.startPoiId ?? s.companions[id].locationPoiId} : {}) } } } : s,
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
