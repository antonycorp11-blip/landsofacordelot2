/**
 * PROGRESSÃO E ESTATÍSTICAS DERIVADAS.
 *
 * TODA fórmula do personagem mora aqui. Foi de propósito: espalhar
 * `comando * 3` por seis componentes é como se perde o controle de um sistema
 * de RPG — meses depois ninguém sabe mais por que um número é o que é. Quem
 * precisa de um valor derivado chama uma função deste arquivo.
 *
 * Três moedas separadas, e elas não se convertem:
 *   XP        — crescimento pessoal, vira nível.
 *   XP de carreira — reconhecimento numa das quatro trilhas, vira posto.
 *   Influência    — peso social e político, sobe e DESCE.
 */
import { hasPerk } from "../data/perks";
import { emptySkills, SKILL_MAX, type SkillId } from "../data/skills";
import { ATTRIBUTE_MAX, ATTRIBUTE_MIN, type Attributes } from "../data/heroes";
import { mountedRatio, troopDailyWage, troopStrength, troopTotal, type TroopCount } from "../data/troops";
import { militaryRankTroopBonus, type CareerXp } from "./careers";

export const MAX_LEVEL = 30;

/**
 * Curva de nível.
 *
 * `100 + 60·(n−1)^1.25` — 100, 160, 243, 337… Cresce sempre, sem tabela
 * gigante e sem explodir: chegar ao 30 custa cerca de 55 mil no total, o que
 * dá para uma campanha longa sem virar moagem.
 */
export function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(100 + 60 * Math.pow(level - 1, 1.25));
}

/** Um ponto de atributo a cada dois níveis, a partir do terceiro. */
export function attributePointsFor(level: number): number {
  return Math.max(0, Math.floor((level - 1) / 2));
}

/** Um ponto de habilidade por nível ganho. */
export function skillPointsFor(level: number): number {
  return Math.max(0, level - 1);
}

/** Cada ponto de habilidade gasto vale isto. */
export const SKILL_POINT_VALUE = 5;

export function clampAttribute(value: number): number {
  return Math.max(ATTRIBUTE_MIN, Math.min(ATTRIBUTE_MAX, Math.round(value)));
}

export function clampSkill(value: number): number {
  return Math.max(0, Math.min(SKILL_MAX, Math.round(value)));
}

export type SkillValues = Record<SkillId, number>;

export function startingSkills(overrides: Partial<Record<SkillId, number>>): SkillValues {
  const base = emptySkills();
  for (const [id, value] of Object.entries(overrides)) base[id as SkillId] = clampSkill(value ?? 0);
  return base;
}

/* ------------------------------------------------------------------ */
/* Estatísticas derivadas                                              */
/* ------------------------------------------------------------------ */

export type DerivedInput = {
  attributes: Attributes;
  skills: SkillValues;
  careerXp: CareerXp;
  troops: TroopCount;
  companions: number;
};

/**
 * Limite confortável de tropas.
 *
 * `5 + Comando×3` é a base, e é pouco de propósito: com Comando 2 são onze
 * homens, e cada ponto de Comando vale três. O posto militar é o que leva o
 * número às dezenas — comandar oitenta homens tem de ser um cargo, não um
 * atributo alto.
 */
export function maxTroops(input: DerivedInput): number {
  let n = 5 + input.attributes.command * 3;
  n += Math.floor(input.skills.lideranca / 20);
  n += militaryRankTroopBonus(input.careerXp);
  if (hasPerk(input.skills, "homens_de_confianca")) n += 5;
  return n;
}

/** Moral do grupo, 0–100. */
export function morale(input: DerivedInput): number {
  let m = 50 + input.attributes.conviction * 3 + Math.floor(input.skills.inspiracao / 10);
  m += Math.floor(input.skills.lideranca / 12);
  if (hasPerk(input.skills, "voz_de_comando")) m *= 1.05;
  // Grupo acima do limite confortável desanda depressa.
  const over = troopTotal(input.troops) - maxTroops(input);
  if (over > 0) m -= over * 2.5;
  m += input.companions * 2;
  return Math.max(0, Math.min(100, Math.round(m)));
}

/** Capacidade de carga, em unidades de mercadoria. */
export function cargoCapacity(input: DerivedInput): number {
  let c = 20 + input.attributes.stewardship * 8 + Math.floor(input.skills.logistica / 4);
  if (hasPerk(input.skills, "carga_bem_atada")) c *= 1.15;
  return Math.round(c);
}

/** Salário diário do contingente, já com o desconto de Logística Militar. */
export function dailyCost(input: DerivedInput): number {
  const base = troopDailyWage(input.troops);
  const discount = Math.min(0.35, input.skills.logistica_militar / 300 + input.attributes.stewardship * 0.015);
  return Math.round(base * (1 - discount));
}

/**
 * Velocidade do grupo, em fração da velocidade de um viajante sozinho.
 *
 * Homem a pé atrasa; cavalo compensa em parte. Cem homens andam devagar, e é
 * isso que faz uma tropa grande ter preço além do salário.
 */
export function partySpeed(input: DerivedInput): number {
  const n = troopTotal(input.troops);
  if (n === 0) return 1;
  const drag = Math.min(0.45, Math.pow(n, 0.7) / 90);
  const mounted = mountedRatio(input.troops) * (0.12 + input.skills.cavalaria / 500);
  const logistics = input.skills.logistica_militar / 800;
  return Math.max(0.5, Math.min(1.15, 1 - drag + mounted + logistics));
}

export function partyStrength(input: DerivedInput): number {
  // Companheiro vale por um punhado de soldados, não por um exército.
  return troopStrength(input.troops) + input.companions * 3 + input.attributes.command * 0.5;
}

/** Multiplicador de preço em compra e venda. Abaixo de 1 é bom para o jogador. */
export function tradeMargin(input: DerivedInput): number {
  const skill = input.skills.negociacao / 100;
  const attr = input.attributes.stewardship / 10;
  return Math.max(0.72, 1 - skill * 0.2 - attr * 0.08);
}

/** Bônus em audiências e persuasão, de 0 a 1. */
export function audienceBonus(input: DerivedInput): number {
  let b = input.attributes.diplomacy / 20 + input.skills.persuasao / 300 + input.skills.etiqueta / 400;
  if (hasPerk(input.skills, "primeira_impressao")) b += 0.05;
  return Math.min(1, b);
}

/** Quantos recrutas a mais um lugar oferece a você. */
export function recruitBonus(input: DerivedInput): number {
  return 1 + input.attributes.command * 0.06 + input.skills.lideranca / 400;
}
