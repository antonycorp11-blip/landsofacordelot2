/**
 * GRADE DE TERRENO.
 *
 * Um tileset com autotile precisa saber, para cada célula, qual o terreno dela
 * e o dos vizinhos. O mapa é feito de polígonos vetoriais, não de grade — então
 * a grade é DERIVADA deles, do mesmo jeito que o relevo é derivado do cenário.
 *
 * Os polígonos continuam sendo a fonte de verdade: seleção, rotas, conquista e
 * fronteiras seguem vetoriais. A grade é só o que a camada de chão consome.
 */
import { bounds, pointInPolygon } from "./geo";
import { WORLD } from "./layout";
import { WORLD_SCALE } from "./scale";
import type { Biome } from "./types";
import { regions, valdoria } from "./valdoria";

/**
 * Lado da célula em unidades do mundo.
 *
 * Calibrado contra o tamanho dos edifícios: um castelo ocupa cerca de duas
 * células, que é a proporção dos mapas de estratégia clássicos — chão em
 * escala de caminhada, construções em escala de símbolo.
 */
export const TERRAIN_CELL = 10 * WORLD_SCALE;

export type TerrainId = Biome | "sea";

/**
 * Ordem de pintura: o terreno mais abaixo é o fundo, e cada seguinte é
 * desenhado por cima com as peças de borda do autotile. É isso que produz a
 * transição — areia invadindo o mar, rocha invadindo o campo.
 */
export const TERRAIN_ORDER: TerrainId[] = [
  "sea",
  "plains",
  "temperate_valley",
  "sacred_valley",
  "coastal",
  "steppe_march",
  "dense_forest",
  "alpine",
];

const INDEX_OF = new Map<TerrainId, number>(TERRAIN_ORDER.map((t, i) => [t, i]));

export const GRID_COLS = Math.ceil(WORLD.width / TERRAIN_CELL);
export const GRID_ROWS = Math.ceil(WORLD.height / TERRAIN_CELL);

/** Índice em `TERRAIN_ORDER` por célula; -1 = fora do mundo conhecido. */
function rasterize(): Int8Array {
  const grid = new Int8Array(GRID_COLS * GRID_ROWS).fill(-1);

  // Pré-filtro por bounding box: sem isto seriam milhões de testes de polígono.
  const shapes = regions.map((r) => ({
    index: INDEX_OF.get(r.biome)!,
    polygon: r.polygon,
    box: bounds(r.polygon),
  }));
  const seaBox = bounds(valdoria.sea);
  const seaIndex = INDEX_OF.get("sea")!;

  for (let y = 0; y < GRID_ROWS; y++) {
    const wy = (y + 0.5) * TERRAIN_CELL;
    for (let x = 0; x < GRID_COLS; x++) {
      const wx = (x + 0.5) * TERRAIN_CELL;
      const p = { x: wx, y: wy };
      let value = -1;

      for (const s of shapes) {
        if (wx < s.box.minX || wx > s.box.maxX || wy < s.box.minY || wy > s.box.maxY) continue;
        if (pointInPolygon(p, s.polygon)) {
          value = s.index;
          break;
        }
      }

      if (
        value === -1 &&
        wx >= seaBox.minX &&
        wx <= seaBox.maxX &&
        wy >= seaBox.minY &&
        wy <= seaBox.maxY &&
        pointInPolygon(p, valdoria.sea)
      ) {
        value = seaIndex;
      }

      grid[y * GRID_COLS + x] = value;
    }
  }
  return grid;
}

export const terrainGrid: Int8Array = rasterize();

/** Terreno de uma célula; -1 fora dos limites. */
export function terrainAt(col: number, row: number): number {
  if (col < 0 || row < 0 || col >= GRID_COLS || row >= GRID_ROWS) return -1;
  return terrainGrid[row * GRID_COLS + col];
}
