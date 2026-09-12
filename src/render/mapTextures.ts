/**
 * REGISTRY DE TEXTURAS DO MAPA.
 *
 * Terreno, mar e rios não são objetos contáveis: são geometria contínua
 * calculada em tempo de execução. Por isso não recebem sprite, e sim
 * MATERIAL — um ladrilho seamless aplicado como `<pattern>` sobre a forma.
 *
 * REGRA ARQUITETURAL: a textura carrega apenas o DETALHE (grão, pincelada,
 * relevo de superfície) em tons quase neutros. A COR vem do polígono por
 * baixo, de `region.palette.land`. É isso que mantém possível uma Casa
 * conquistar território e a região mudar de cor — se a cor estivesse
 * assada no ladrilho, não haveria o que recolorir.
 *
 * Para aplicar a arte, basta soltar o arquivo em `src/assets/textures/` com o
 * nome igual à chave. Nenhum código precisa mudar.
 */
import { WORLD_SCALE } from "../world/scale";
import type { Biome } from "../world/types";

export type TextureDefinition = {
  /** Lado do ladrilho em unidades do mundo. Menor = grão mais fino. */
  tile: number;
  /** Ladrilho seamless. Enquanto for `undefined`, usa-se só a cor chapada. */
  url?: string;
  /** Com quanta força a textura entra por cima da cor. */
  opacity: number;
  /**
   * Zoom a partir do qual a textura aparece.
   *
   * O `<pattern>` vive em coordenadas do mundo, então na vista do reino
   * inteiro o ladrilho viraria ruído e moiré. De longe a cor chapada lê
   * melhor mesmo — é a mesma lógica de LOD do resto do mapa.
   */
  minZoom: number;
};

const TERRAIN_TILE = 34 * WORLD_SCALE;

function terrain(tile = TERRAIN_TILE, opacity = 0.5): TextureDefinition {
  return { tile, opacity, minZoom: 0 };
}

/** Chave de textura de um bioma. */
export const terrainTextureKey = (biome: Biome) => `terrain_${biome}`;

export const mapTextures: Record<string, TextureDefinition> = {
  terrain_temperate_valley: terrain(),
  terrain_dense_forest: terrain(30 * WORLD_SCALE, 0.55),
  terrain_alpine: terrain(38 * WORLD_SCALE, 0.6),
  terrain_steppe_march: terrain(36 * WORLD_SCALE, 0.55),
  terrain_sacred_valley: terrain(),
  terrain_plains: terrain(42 * WORLD_SCALE, 0.45),
  terrain_coastal: terrain(32 * WORLD_SCALE, 0.5),
  water: { tile: 26 * WORLD_SCALE, opacity: 0.45, minZoom: 0 },
};

export function getTexture(key: string): TextureDefinition | undefined {
  return mapTextures[key];
}

/** Registra/atualiza o ladrilho de uma textura em tempo de execução. */
export function setTextureUrl(key: string, url: string) {
  const def = mapTextures[key];
  if (def) mapTextures[key] = { ...def, url };
}

/** Texturas que já têm arte e podem aparecer no zoom atual. */
export function activeTextures(zoom: number) {
  return Object.entries(mapTextures).filter(([, def]) => def.url && zoom >= def.minZoom);
}
