/**
 * Cenário procedural (florestas, montanhas, colinas, campos).
 *
 * Gerado por semente fixa: o mundo é idêntico a cada carregamento, mas não
 * precisa ser escrito à mão ponto a ponto. Cada elemento é um MapObject comum,
 * com `assetKey` — trocar o desenho por um PNG não altera nada aqui.
 */
import { bounds, distanceToPolyline, dist, makeRng, pointInPolygon } from "./geo";
import { RIM_ARCS, SECTOR_INDEX, WORLD_SCALE as S } from "./layout";
import { CALIBRATED_WORLD_SCALE, lod } from "./scale";
import { insideLandcover } from "./landcover";
import type { LandcoverType } from "./landcover";
import type { Biome, MapObject, MapObjectType, Point, Region } from "./types";
import { rivers } from "./rivers";
import { roadGeometry } from "./navgraph";
import { regions, allPois } from "./valdoria";

/**
 * `density` é por milhão de unidades² na escala em que foi calibrada.
 *
 * O que se mantém constante é a densidade POR LÉGUA, não a contagem total: um
 * reino maior tem proporcionalmente mais floresta e mais montanha. A sensação
 * de vastidão vem de os elementos serem pequenos diante do território (a razão
 * `ASSET_SCALE` / `WORLD_SCALE`), não de o mapa ficar vazio.
 *
 * `clearance` e `maxDistanceToCoast` são distâncias e acompanham a escala.
 */
type ScatterLayer = {
  type: MapObjectType;
  assetKeys: string[];
  /** Elementos por milhão de unidades² de área. */
  density: number;
  minZoom: number;
  scale: [number, number];
  /** Distância mínima de estradas — evita cobrir a rota. */
  clearance: number;
  /** Distância máxima da linha de costa; usado pelas falésias. */
  maxDistanceToCoast?: number;
  /**
   * Restringe o elemento ao interior de uma massa de cobertura do solo.
   * É o que faz a árvore nascer DENTRO da floresta em vez de salpicada pelo
   * mapa inteiro — a mata vira massa, e os sprites, acabamento dela.
   */
  within?: LandcoverType;
};

const BIOME_LAYERS: Record<Biome, ScatterLayer[]> = {
  temperate_valley: [
    { type: "hill", assetKeys: ["hill"], density: 60, minZoom: lod(1), scale: [0.8, 1.3], clearance: 34, within: "highland" },
    { type: "forest", assetKeys: ["forest_cluster"], density: 90, minZoom: lod(1.3), scale: [0.7, 1.2], clearance: 42, within: "forest" },
    { type: "tree", assetKeys: ["oak_tree", "oak_tree", "pine_tree"], density: 130, minZoom: lod(3.1), scale: [0.7, 1.1], clearance: 20 },
    { type: "farm", assetKeys: ["field"], density: 120, minZoom: lod(2.5), scale: [0.8, 1.2], clearance: 26, within: "farmland" },
  ],
  dense_forest: [
    { type: "forest", assetKeys: ["forest_cluster"], density: 210, minZoom: lod(0.9), scale: [0.9, 1.6], clearance: 30, within: "forest" },
    { type: "hill", assetKeys: ["hill"], density: 12, minZoom: lod(1.4), scale: [0.7, 1.1], clearance: 32 },
    { type: "tree", assetKeys: ["pine_tree", "pine_tree", "oak_tree"], density: 620, minZoom: lod(2.8), scale: [0.7, 1.25], clearance: 16, within: "forest" },
  ],
  alpine: [
    { type: "mountain", assetKeys: ["mountain_large"], density: 95, minZoom: lod(0.8), scale: [1, 1.8], clearance: 26, within: "highland" },
    { type: "mountain", assetKeys: ["mountain_small"], density: 170, minZoom: lod(1.5), scale: [0.6, 1.1], clearance: 22, within: "highland" },
    { type: "tree", assetKeys: ["pine_tree"], density: 90, minZoom: lod(3), scale: [0.6, 0.95], clearance: 18 },
  ],
  steppe_march: [
    { type: "hill", assetKeys: ["dry_hill"], density: 120, minZoom: lod(0.9), scale: [0.8, 1.4], clearance: 30, within: "highland" },
    { type: "forest", assetKeys: ["scrub_cluster"], density: 95, minZoom: lod(1.8), scale: [0.6, 1], clearance: 26, within: "scrub" },
    { type: "tree", assetKeys: ["dry_tree"], density: 70, minZoom: lod(3), scale: [0.6, 1], clearance: 16 },
  ],
  sacred_valley: [
    { type: "hill", assetKeys: ["hill"], density: 95, minZoom: lod(0.95), scale: [0.8, 1.35], clearance: 32, within: "highland" },
    { type: "forest", assetKeys: ["forest_cluster"], density: 100, minZoom: lod(1.5), scale: [0.7, 1.15], clearance: 34, within: "forest" },
    { type: "farm", assetKeys: ["vineyard"], density: 110, minZoom: lod(2.5), scale: [0.8, 1.2], clearance: 24, within: "farmland" },
    { type: "tree", assetKeys: ["oak_tree", "cypress_tree"], density: 120, minZoom: lod(3.1), scale: [0.7, 1.05], clearance: 18 },
  ],
  plains: [
    { type: "farm", assetKeys: ["field", "field", "wheat_field"], density: 150, minZoom: lod(0.95), scale: [0.9, 1.5], clearance: 26, within: "farmland" },
    { type: "forest", assetKeys: ["forest_cluster"], density: 85, minZoom: lod(1.6), scale: [0.6, 1], clearance: 36, within: "forest" },
    { type: "tree", assetKeys: ["oak_tree"], density: 55, minZoom: lod(3.1), scale: [0.7, 1.1], clearance: 18 },
  ],
  coastal: [
    { type: "hill", assetKeys: ["cliff"], density: 34, minZoom: lod(0.95), scale: [0.7, 1.1], clearance: 30, maxDistanceToCoast: 210 },
    { type: "forest", assetKeys: ["forest_cluster"], density: 85, minZoom: lod(1.7), scale: [0.6, 1], clearance: 34, within: "forest" },
    { type: "farm", assetKeys: ["salt_pan"], density: 70, minZoom: lod(2.4), scale: [0.8, 1.2], clearance: 26, within: "farmland" },
    { type: "tree", assetKeys: ["pine_tree", "palm_tree"], density: 60, minZoom: lod(3.1), scale: [0.6, 1], clearance: 16 },
  ],
};

/**
 * Grade espacial das polilinhas de estrada/rio.
 *
 * Sem isto, cada candidato a árvore seria testado contra todos os segmentos de
 * todas as estradas do reino — dezenas de milhões de operações na carga.
 */
function buildPointGrid(lines: Point[][], cell: number) {
  const grid = new Map<string, Point[]>();
  for (const line of lines) {
    for (const p of line) {
      const key = `${Math.floor(p.x / cell)}:${Math.floor(p.y / cell)}`;
      const bucket = grid.get(key);
      if (bucket) bucket.push(p);
      else grid.set(key, [p]);
    }
  }
  return {
    /** Distância aproximada até a polilinha mais próxima (∞ se estiver longe). */
    nearest(p: Point): number {
      const cx = Math.floor(p.x / cell);
      const cy = Math.floor(p.y / cell);
      let best = Infinity;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const q of grid.get(`${cx + dx}:${cy + dy}`) ?? []) {
            const d = dist(p, q);
            if (d < best) best = d;
          }
        }
      }
      return best;
    },
  };
}

const GRID_CELL = 150 * S;

function scatterRegion(region: Region): MapObject[] {
  const b = bounds(region.polygon);
  const area = b.width * b.height;
  const out: MapObject[] = [];
  const riverGrid = buildPointGrid(
    rivers.filter((r) => r.regionIds.includes(region.id)).map((r) => r.points),
    GRID_CELL,
  );
  const roadGrid = buildPointGrid(roadGeometry.map((r) => r.points), GRID_CELL);
  const poiPoints: Point[] = allPois.filter((p) => p.regionId === region.id).map((p) => ({ x: p.x, y: p.y }));
  const coastLine = RIM_ARCS[SECTOR_INDEX.golden_coast];

  BIOME_LAYERS[region.biome].forEach((layer, layerIndex) => {
    const rng = makeRng(`${region.id}-${layer.type}-${layerIndex}`);
    // Divide pela escala CALIBRADA (não pela atual): é isso que preserva a
    // densidade por légua quando o mundo muda de tamanho.
    const calibrated = 1_000_000 * CALIBRATED_WORLD_SCALE * CALIBRATED_WORLD_SCALE;
    const target = Math.round((area / calibrated) * layer.density);
    const clearance = layer.clearance * S;
    let placed = 0;
    let attempts = 0;
    while (placed < target && attempts < target * 40) {
      attempts++;
      const p = { x: b.minX + rng() * b.width, y: b.minY + rng() * b.height };
      if (!pointInPolygon(p, region.polygon)) continue;
      if (poiPoints.some((q) => dist(p, q) < 46 * S)) continue;
      if (roadGrid.nearest(p) < clearance) continue;
      if (riverGrid.nearest(p) < clearance * 0.7) continue;
      if (layer.maxDistanceToCoast && distanceToPolyline(p, coastLine) > layer.maxDistanceToCoast * S)
        continue;
      if (layer.within && !insideLandcover(p, layer.within)) continue;
      const key = layer.assetKeys[Math.floor(rng() * layer.assetKeys.length)];
      out.push({
        // O índice da camada entra no id: um bioma pode ter duas camadas do mesmo tipo.
        id: `${region.id}-${layer.type}-${layerIndex}-${placed}`,
        type: layer.type,
        x: p.x,
        y: p.y,
        assetKey: key,
        regionId: region.id,
        scale: layer.scale[0] + rng() * (layer.scale[1] - layer.scale[0]),
        rotation: (rng() - 0.5) * 8,
        minZoom: layer.minZoom,
      });
      placed++;
    }
  });

  return out;
}

export const natureObjects: MapObject[] = regions.flatMap(scatterRegion);

export const natureByRegion = new Map(
  regions.map((r) => [r.id, natureObjects.filter((o) => o.regionId === r.id)]),
);

/** Navios decorativos no mar, ancorados perto dos portos. */
export const seaObjects: MapObject[] = (() => {
  const rng = makeRng("golden-coast-ships");
  const anchors = allPois.filter((p) => ["port", "shipyard", "bay", "lighthouse"].includes(p.type));
  return anchors.flatMap((a, i) =>
    Array.from({ length: 2 }, (_, k) => ({
      id: `ship-${i}-${k}`,
      type: "ship" as const,
      x: a.x + (rng() - 0.3) * 180 * S,
      y: a.y + (90 + rng() * 170) * S,
      assetKey: "ship",
      regionId: a.regionId,
      scale: 0.7 + rng() * 0.6,
      rotation: (rng() - 0.5) * 20,
      minZoom: lod(1.8),
    })),
  );
})();
