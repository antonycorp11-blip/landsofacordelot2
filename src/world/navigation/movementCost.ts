/**
 * O QUE CUSTA ANDAR EM CADA CHÃO.
 *
 * Um serviço central de propósito: o custo do terreno é regra de jogo, não
 * detalhe de renderização, e não pode estar espalhado dentro de componente
 * nenhum. Trocar um número aqui muda a estratégia do mapa inteiro.
 *
 * A referência é 1.0 = vale temperado. Estrada divide; montanha multiplica.
 */
import type { Biome, RoadType } from "../types";
import type { TerrainId } from "../terrainGrid";

export const TERRAIN_COST: Record<Biome, number> = {
  plains: 0.95,
  temperate_valley: 1,
  sacred_valley: 1,
  steppe_march: 1.1,
  coastal: 1.2,
  dense_forest: 1.35,
  alpine: 1.8,
};

/**
 * Estrada não é um chão: é um desconto sobre o chão que ela cruza.
 *
 * Assim uma estrada real que atravessa a montanha continua sendo montanha com
 * desconto — mais lenta que a mesma estrada na planície, e ainda assim muito
 * melhor do que subir a encosta por fora dela.
 */
export const ROAD_DISCOUNT: Record<RoadType, number> = {
  main: 0.62,
  secondary: 0.75,
  trail: 0.85,
};

/** Intransponível: mar, fora do reino, leito de rio grande. */
export const BLOCKED = Infinity;

export function costOfTerrain(id: TerrainId | "sea"): number {
  return id === "sea" ? BLOCKED : TERRAIN_COST[id as Biome] ?? 1;
}
