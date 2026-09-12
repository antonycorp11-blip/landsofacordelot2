/**
 * REGISTRY DE ASSETS DO MAPA.
 *
 * Este é o único ponto de troca entre arte provisória e arte final.
 * Para substituir um placeholder por arte real, basta preencher `url`:
 *
 *   castle_royal: { size: 120, url: "/assets/map/castle_royal.webp" }
 *
 * Posição, colisão, rotas e lógica de viagem não mudam — elas dependem apenas
 * de `MapObject.x/y` e do grafo de navegação.
 */

import { ASSET_SCALE } from "../world/scale";

export { ASSET_SCALE };

export type AssetDefinition = {
  /** Largura nominal em unidades do mundo (o placeholder é desenhado em 100×100). */
  size: number;
  /** PNG/WebP final. Enquanto for `undefined`, usa-se o desenho vetorial. */
  url?: string;
  /**
   * Ponto do sprite que fica sobre a coordenada do objeto, em fração 0..1.
   * O padrão (0.5, 0.92) coloca a "base" do edifício sobre o ponto do mapa.
   */
  anchor?: { x: number; y: number };
  /** Proporção altura/largura; 1 = quadrado. */
  aspect?: number;
};

const CENTERED = { x: 0.5, y: 0.5 };

export const mapAssets: Record<string, AssetDefinition> = {
  /* --- assentamentos e edifícios --- */
  castle_royal: { size: 104 },
  castle_medium: { size: 84 },
  fortress: { size: 84 },
  city_large: { size: 82 },
  city_small: { size: 70 },
  village: { size: 54 },
  council_hall: { size: 76 },
  market_large: { size: 70 },
  temple: { size: 64 },
  cathedral: { size: 80 },
  monastery: { size: 76 },
  shrine: { size: 54 },
  watchtower: { size: 56 },
  gate: { size: 68 },
  fort: { size: 72 },
  warcamp: { size: 68 },
  training_ground: { size: 68 },
  inn: { size: 62 },
  outpost: { size: 56 },
  ruins: { size: 70 },

  /* --- produção --- */
  mine: { size: 68 },
  quarry: { size: 72 },
  foundry: { size: 74 },
  sawmill: { size: 72 },
  farm: { size: 70 },
  mill: { size: 62 },
  stud_farm: { size: 70 },

  /* --- costa --- */
  port: { size: 84 },
  shipyard: { size: 74 },
  lighthouse: { size: 60 },
  bay: { size: 96, anchor: CENTERED },
  ship: { size: 54, anchor: CENTERED },

  /* --- natureza --- */
  lake: { size: 118, anchor: CENTERED },
  sacred_grove: { size: 78 },
  mountain_pass: { size: 96, anchor: { x: 0.5, y: 0.9 } },
  mountain_large: { size: 106, anchor: { x: 0.5, y: 0.9 } },
  mountain_small: { size: 76, anchor: { x: 0.5, y: 0.9 } },
  hill: { size: 64, anchor: { x: 0.5, y: 0.9 } },
  dry_hill: { size: 66, anchor: { x: 0.5, y: 0.9 } },
  cliff: { size: 70, anchor: { x: 0.5, y: 0.9 } },
  forest_cluster: { size: 70, anchor: { x: 0.5, y: 0.85 } },
  scrub_cluster: { size: 70, anchor: { x: 0.5, y: 0.88 } },
  oak_tree: { size: 34 },
  pine_tree: { size: 32 },
  dry_tree: { size: 30 },
  cypress_tree: { size: 30 },
  palm_tree: { size: 32 },
  field: { size: 68, anchor: CENTERED },
  wheat_field: { size: 72, anchor: CENTERED },
  vineyard: { size: 66, anchor: CENTERED },
  salt_pan: { size: 66, anchor: CENTERED },

  /* --- travessias --- */
  bridge_stone: { size: 72, anchor: CENTERED },
  bridge_wood: { size: 68, anchor: CENTERED },
  ford: { size: 72, anchor: CENTERED },
  forest_path: { size: 68, anchor: { x: 0.5, y: 0.9 } },
  road_marker: { size: 48 },
};

export const DEFAULT_ANCHOR = { x: 0.5, y: 0.92 };

/** Definição já convertida para unidades do mundo atual. */
export function getAsset(key: string): AssetDefinition {
  const def = mapAssets[key] ?? { size: 56 };
  return { ...def, size: def.size * ASSET_SCALE };
}

/** Registra/atualiza a arte final de um asset em tempo de execução. */
export function setAssetUrl(key: string, url: string) {
  // Escreve no registro cru: `getAsset` é quem aplica a escala.
  mapAssets[key] = { ...(mapAssets[key] ?? { size: 56 }), url };
}
