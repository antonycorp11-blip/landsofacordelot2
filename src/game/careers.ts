/**
 * AS QUATRO CARREIRAS.
 *
 * Além do nível geral, cada personagem sobe em quatro trilhas independentes.
 * Um mercador pode ter posto militar; um militar pode acumular posto religioso.
 * A carreira é o que o mundo reconhece em você — e é dela que sai a influência
 * que pinga sozinha, sem você fazer nada.
 *
 * A influência passiva é pequena de propósito: ela NUNCA pode substituir uma
 * ação. Um Marechal ganha 1,5 por dia; uma missão decente vale mais que uma
 * semana disso.
 */
import type { AgentClass } from "../world/types";

export const CAREERS: AgentClass[] = ["MILITARY", "TRADE", "POLITICS", "RELIGION"];

export const CAREER_LABEL: Record<AgentClass, string> = {
  MILITARY: "Militar",
  TRADE: "Comércio",
  POLITICS: "Política",
  RELIGION: "Religião",
};

/** Sete postos por carreira. O índice 0 é onde todo mundo começa. */
export const CAREER_RANKS: Record<AgentClass, string[]> = {
  MILITARY: ["Recruta", "Soldado", "Sargento", "Capitão", "Comandante", "General", "Marechal"],
  TRADE:    ["Mascate", "Negociante", "Mercador", "Mestre de Caravana", "Magnata", "Banqueiro", "Príncipe Mercador"],
  POLITICS: ["Assistente", "Escriba", "Emissário", "Conselheiro", "Diplomata", "Chanceler", "Estadista"],
  RELIGION: ["Devoto", "Acólito", "Pregador", "Sacerdote", "Bispo", "Arcebispo", "Primaz"],
};

/** XP acumulado necessário para cada posto. */
export const RANK_THRESHOLDS = [0, 100, 300, 700, 1500, 3000, 6000];

/** Influência por dia que cada posto rende sozinho. */
const PASSIVE_BY_RANK = [0, 0.1, 0.2, 0.4, 0.7, 1.0, 1.5];

export type CareerXp = Record<AgentClass, number>;

export function emptyCareerXp(): CareerXp {
  return { MILITARY: 0, TRADE: 0, POLITICS: 0, RELIGION: 0 };
}

export function rankIndex(xp: number): number {
  let i = 0;
  while (i + 1 < RANK_THRESHOLDS.length && xp >= RANK_THRESHOLDS[i + 1]) i++;
  return i;
}

export function rankName(career: AgentClass, xp: number): string {
  return CAREER_RANKS[career][rankIndex(xp)];
}

/** Progresso dentro do posto atual, de 0 a 1. No último posto, sempre cheio. */
export function rankProgress(xp: number): { current: number; needed: number; ratio: number } {
  const i = rankIndex(xp);
  if (i >= RANK_THRESHOLDS.length - 1) return { current: xp, needed: xp, ratio: 1 };
  const floor = RANK_THRESHOLDS[i];
  const ceil = RANK_THRESHOLDS[i + 1];
  return { current: xp - floor, needed: ceil - floor, ratio: (xp - floor) / (ceil - floor) };
}

/** Influência que os quatro postos rendem por dia do mundo, somados. */
export function passiveInfluencePerDay(careerXp: CareerXp): number {
  return CAREERS.reduce((sum, c) => sum + PASSIVE_BY_RANK[rankIndex(careerXp[c])], 0);
}

/** O posto militar também estica o limite de tropas. */
export function militaryRankTroopBonus(careerXp: CareerXp): number {
  const i = rankIndex(careerXp.MILITARY);
  return [0, 2, 5, 10, 20, 35, 60][i];
}
