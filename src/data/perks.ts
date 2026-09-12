/**
 * PERKS.
 *
 * Uma habilidade não dá só um número: em 25, 50, 75 e 100 ela libera algo com
 * nome. Começa pequeno de propósito — é melhor ter seis perks que importam do
 * que quarenta que ninguém lê. A estrutura é a mesma para todos, então
 * acrescentar um perk novo é acrescentar uma linha.
 *
 * O EFEITO de cada perk é aplicado em `game/progression.ts`, junto das demais
 * fórmulas. Aqui ficam só a identidade e o requisito — nunca uma fórmula solta.
 */
import type { SkillId } from "./skills";

export type PerkId =
  | "voz_de_comando" | "homens_de_confianca"
  | "olho_para_barganhas" | "carga_bem_atada"
  | "primeira_impressao" | "porta_aberta"
  | "palavras_de_esperanca" | "mao_estendida"
  | "leitura_de_campo";

export type Perk = {
  id: PerkId;
  name: string;
  skill: SkillId;
  /** Valor da habilidade que libera o perk. */
  at: number;
  effect: string;
};

export const perks: Perk[] = [
  { id: "voz_de_comando",      name: "Voz de Comando",      skill: "lideranca",  at: 25, effect: "+5% de moral inicial." },
  { id: "homens_de_confianca", name: "Homens de Confiança", skill: "lideranca",  at: 50, effect: "+5 no limite confortável de tropas." },
  { id: "leitura_de_campo",    name: "Leitura de Campo",    skill: "tatica",     at: 50, effect: "Estimativa de força alheia muito mais precisa." },
  { id: "olho_para_barganhas", name: "Olho para Barganhas", skill: "negociacao", at: 25, effect: "Indica quando um preço está bom." },
  { id: "carga_bem_atada",     name: "Carga Bem Atada",     skill: "logistica",  at: 25, effect: "+15% de capacidade de carga." },
  { id: "primeira_impressao",  name: "Primeira Impressão",  skill: "persuasao",  at: 25, effect: "Bônus na primeira audiência com cada pessoa." },
  { id: "porta_aberta",        name: "Porta Aberta",        skill: "etiqueta",   at: 50, effect: "Nobres recebem você sem exigir intermediário." },
  { id: "palavras_de_esperanca", name: "Palavras de Esperança", skill: "inspiracao", at: 25, effect: "Reduz a perda de moral depois de um revés." },
  { id: "mao_estendida",       name: "Mão Estendida",       skill: "caridade",   at: 25, effect: "Ganhos de influência local um pouco maiores." },
];

export const perkById = new Map(perks.map((p) => [p.id, p]));
export const perksOfSkill = (skill: SkillId) => perks.filter((p) => p.skill === skill).sort((a, b) => a.at - b.at);

/** Perks liberados por um conjunto de habilidades. Derivado, nunca guardado. */
export function unlockedPerks(values: Record<SkillId, number>): PerkId[] {
  return perks.filter((p) => (values[p.skill] ?? 0) >= p.at).map((p) => p.id);
}

export function hasPerk(values: Record<SkillId, number>, id: PerkId): boolean {
  const p = perkById.get(id);
  return !!p && (values[p.skill] ?? 0) >= p.at;
}
