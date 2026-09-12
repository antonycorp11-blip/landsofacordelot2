/**
 * TROPAS.
 *
 * Soldado é UNIDADE, não personagem. Um miliciano não tem nome, história nem
 * relação com você — tem custo, salário e um valor de força. Companheiro é
 * outra coisa e vive noutro lugar do estado, de propósito: misturar os dois
 * seria o começo de um sistema que não dá para desfazer.
 *
 * `strength` NÃO é dano. É estimativa estratégica: serve para comparar dois
 * grupos antes de um confronto, e é o número que a habilidade de Tática vai
 * revelar com mais ou menos precisão.
 */
export type TroopId = "camponeses" | "milicianos" | "infantaria" | "arqueiros" | "cavaleiros";
export type TroopType = "LEVY" | "MILITIA" | "INFANTRY" | "ARCHER" | "CAVALRY";
export type MovementType = "foot" | "mounted";

export type Troop = {
  id: TroopId;
  name: string;
  /** Nome no singular, para "1 Miliciano". */
  singular: string;
  type: TroopType;
  tier: 1 | 2 | 3;
  /** Moedas para recrutar um. */
  recruitCost: number;
  /** Moedas por dia. Ainda não é cobrado, mas o número já é o verdadeiro. */
  dailyWage: number;
  /** Peso do soldado numa comparação de forças. Não é dano. */
  strength: number;
  movement: MovementType;
  description: string;
};

export const troops: Troop[] = [
  { id: "camponeses",  name: "Camponeses Convocados", singular: "Camponês Convocado", type: "LEVY",     tier: 1, recruitCost: 6,  dailyWage: 1, strength: 1,   movement: "foot",    description: "Gente da lavoura com forcado. Serve para parecer muitos." },
  { id: "milicianos",  name: "Milicianos",            singular: "Miliciano",          type: "MILITIA",  tier: 1, recruitCost: 12, dailyWage: 2, strength: 1.5, movement: "foot",    description: "Defendem a própria vila. Sabem segurar uma linha, por um tempo." },
  { id: "infantaria",  name: "Infantaria",            singular: "Soldado de Infantaria", type: "INFANTRY", tier: 2, recruitCost: 25, dailyWage: 4, strength: 2.5, movement: "foot", description: "Soldados de verdade, pagos e treinados." },
  { id: "arqueiros",   name: "Arqueiros",             singular: "Arqueiro",           type: "ARCHER",   tier: 2, recruitCost: 28, dailyWage: 4, strength: 2.5, movement: "foot",    description: "Valem pelo que fazem antes de a linha se encontrar." },
  { id: "cavaleiros",  name: "Cavaleiros",            singular: "Cavaleiro",          type: "CAVALRY",  tier: 3, recruitCost: 65, dailyWage: 9, strength: 4,   movement: "mounted", description: "Caros, rápidos, e decidem o dia quando bem usados." },
];

export const troopById = new Map(troops.map((t) => [t.id, t]));

/** Contagem por tipo. É a forma de qualquer contingente, do jogador ou de um NPC. */
export type TroopCount = Partial<Record<TroopId, number>>;

export function troopTotal(count: TroopCount): number {
  return Object.values(count).reduce((a, b) => a + (b ?? 0), 0);
}

export function troopStrength(count: TroopCount): number {
  return troops.reduce((sum, t) => sum + (count[t.id] ?? 0) * t.strength, 0);
}

export function troopDailyWage(count: TroopCount): number {
  return troops.reduce((sum, t) => sum + (count[t.id] ?? 0) * t.dailyWage, 0);
}

/** Fração montada — entra no cálculo de velocidade do grupo. */
export function mountedRatio(count: TroopCount): number {
  const total = troopTotal(count);
  if (!total) return 0;
  const mounted = troops
    .filter((t) => t.movement === "mounted")
    .reduce((sum, t) => sum + (count[t.id] ?? 0), 0);
  return mounted / total;
}
