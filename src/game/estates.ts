/**
 * ADMINISTRAR A TERRA.
 *
 * O jogador ganha terra cedo — e até agora possuí-la era receber uma renda
 * fixa e mais nada: "Gerir" era um botão desabilitado. Terra sem decisão não é
 * posse, é assinatura mensal.
 *
 * Aqui ela vira um sistema com três alavancas que se contradizem de propósito:
 *
 *   IMPOSTO   mais ouro agora, menos lealdade — e lealdade baixa custa a renda
 *             inteira, depois a terra.
 *   INVESTIR  gasta ouro hoje para a renda subir para sempre.
 *   GUARNIÇÃO tira homens do seu grupo, custa meio soldo, e devolve segurança
 *             na região — que é o que baixa o preço do mercado e afasta bando.
 *
 * Nenhuma delas é a resposta certa o tempo todo. Quem está quebrado aperta o
 * imposto e paga depois; quem está pensando no ano que vem investe e aguenta.
 */
import { troopDailyWage, troopTotal, type TroopCount } from "../data/troops";
import { fiefById } from "../world/fiefs";
import type { GameState } from "./store";

export type TaxLevel = "baixo" | "justo" | "pesado";
export type EstateWork = "walls" | "granary" | "market";
export type EstateProject = { kind: EstateWork; readyDay: number };

export type Estate = {
  tax: TaxLevel;
  /** 0–100. Investimento sobe; revolta derruba. Multiplica a renda. */
  prosperity: number;
  /** 0–100. O imposto decide para que lado ela anda. */
  loyalty: number;
  /** Homens destacados para ficar na terra. */
  garrison: TroopCount;
  /** Obras levam dias; no máximo uma construção por senhorio. */
  buildings?: Partial<Record<EstateWork, number>>;
  project?: EstateProject;
};

export const WORKS: Record<EstateWork, { name: string; gold: number; wood: number; tools: number; days: number; max: number; effect: string }> = {
  walls: { name: "Muralhas", gold: 140, wood: 3, tools: 1, days: 5, max: 3, effect: "+12 defesa por nível; protege a guarnição em cercos" },
  granary: { name: "Celeiro", gold: 95, wood: 2, tools: 0, days: 3, max: 2, effect: "+0,6 lealdade por dia e por nível" },
  market: { name: "Feira", gold: 120, wood: 2, tools: 1, days: 4, max: 2, effect: "+15% renda por nível" },
};

export function workCost(estate: Estate, kind: EstateWork) {
  const work = WORKS[kind];
  const level = estate.buildings?.[kind] ?? 0;
  return { gold: Math.round(work.gold * (1 + level * .55)), wood: work.wood + level, tools: work.tools + (level > 1 ? 1 : 0), days: work.days + level };
}

export const TAX: Record<TaxLevel, { income: number; loyalty: number; label: string; blurb: string }> = {
  baixo:  { income: 0.65, loyalty:  1.6, label: "Brando",  blurb: "Rende menos e compra paz. A lealdade sobe." },
  justo:  { income: 1,    loyalty:  0.2, label: "Justo",   blurb: "O que o costume manda. Nada muda depressa." },
  pesado: { income: 1.5,  loyalty: -2.2, label: "Pesado",  blurb: "Rende metade a mais e a terra se lembra disso." },
};

export function freshEstate(): Estate {
  return { tax: "justo", prosperity: 50, loyalty: 60, garrison: {} };
}

export function estateOf(s: GameState, fiefId: string): Estate {
  return s.fiefEstates?.[fiefId] ?? freshEstate();
}

/** Lealdade baixa não é aviso: é dinheiro que some. */
export function loyaltyFactor(loyalty: number): number {
  if (loyalty >= 45) return 1;
  if (loyalty >= 25) return 0.75;
  return 0.4;
}

/** A renda de hoje, já com imposto, prosperidade e humor da terra. */
export function incomeOf(s: GameState, fiefId: string): number {
  const fief = fiefById.get(fiefId);
  if (!fief) return 0;
  const estate = estateOf(s, fiefId);
  // A prosperidade precisa PESAR: com a curva antiga, obras de duas mil
  // moedas se pagavam em quinhentos dias e ninguém investiria nunca. Assim,
  // de cinquenta a cem a terra quase dobra o que rende.
  const base = fief.income * TAX[estate.tax].income * (0.4 + estate.prosperity / 60) * (1 + (estate.buildings?.market ?? 0) * .15);
  return Math.max(0, Math.round(base * loyaltyFactor(estate.loyalty)));
}

/** Guarnição custa meio soldo: ela come menos porque não marcha. */
export function garrisonCost(estate: Estate): number {
  return Math.round(troopDailyWage(estate.garrison) * 0.5);
}

/** O que uma guarnição vale para a região onde está. */
export function garrisonSecurity(estate: Estate): number {
  return Math.min(6, Math.floor(troopTotal(estate.garrison) / 4));
}

export function wallDefence(base: number, estate: Estate): number {
  return base + (estate.buildings?.walls ?? 0) * 12;
}

export const INVEST_STEP = 15;

/**
 * Investir fica mais caro quanto mais próspera a terra já é — mas dentro de
 * um horizonte que um jogador aceita: uma obra se paga em cerca de oitenta
 * dias de renda, e não em uma vida.
 */
export function investCost(estate: Estate): number {
  return Math.round(70 + estate.prosperity * 3.2);
}

export type EstateDay = {
  fiefId: string;
  income: number;
  wages: number;
  loyalty: number;
  security: number;
  /** A terra se levantou e deixou de ser sua. */
  revolt: boolean;
  completedWork: EstateWork | null;
};

/**
 * Um dia de cada terra sua. Devolve o que mudar, e quem chama decide o que
 * fazer com a revolta — perder um senhorio é notícia, não um número.
 */
export function estateDay(s: GameState, fiefId: string, day: number): EstateDay {
  const estate = estateOf(s, fiefId);
  const drift = TAX[estate.tax].loyalty + (estate.buildings?.granary ?? 0) * .6;
  const loyalty = Math.max(0, Math.min(100, estate.loyalty + drift));
  return {
    fiefId,
    income: incomeOf(s, fiefId),
    wages: garrisonCost(estate),
    loyalty,
    security: garrisonSecurity(estate),
    // Abaixo de cinco a terra deixa de obedecer. O aviso vem muito antes.
    revolt: loyalty <= 4,
    completedWork: estate.project && estate.project.readyDay <= day ? estate.project.kind : null,
  };
}
