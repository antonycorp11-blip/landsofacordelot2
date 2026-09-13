/**
 * A GRADE DE NAVEGAÇÃO.
 *
 * O mundo tem 24.000 × 16.000 unidades. Ninguém faz busca de caminho pixel a
 * pixel nisso num celular — e não precisa: o jogo JÁ rasteriza o mundo para
 * desenhar o chão, em células de 100 unidades. É a mesma grade que serve para
 * andar, e reaproveitá-la custa zero memória nova de terreno.
 *
 * 240 × 160 = 38.400 células. Cada uma guarda:
 *
 *   custo    quanto se gasta para atravessá-la (Infinity = intransponível);
 *   estrada  se há via passando por ali, e o desconto dela;
 *   região   para o save saber onde o viajante está sem varrer polígono.
 *
 * Tudo é construído UMA vez, na primeira necessidade, e fica em memória. Rios
 * grandes entram como barreira, com furos abertos nas travessias: é o que
 * impede o jogador de atravessar o Rio Serpente a pé sem procurar uma ponte.
 */
import { dist } from "../geo";
import { WORLD } from "../layout";
import { WORLD_SCALE as S } from "../scale";
import { GRID_COLS, GRID_ROWS, TERRAIN_CELL, TERRAIN_ORDER, terrainAt } from "../terrainGrid";
import { roadGeometry } from "../navgraph";
import { rivers } from "../rivers";
import { borderCrossings } from "../borderCrossings";
import { regions } from "../valdoria";
import { pointInPolygon } from "../geo";
import type { Point, RegionId, RoadType } from "../types";
import { BLOCKED, ROAD_DISCOUNT, costOfTerrain } from "./movementCost";

export const CELL = TERRAIN_CELL;
export const COLS = GRID_COLS;
export const ROWS = GRID_ROWS;

export function colOf(x: number): number {
  return Math.max(0, Math.min(COLS - 1, Math.floor((x - WORLD.x) / CELL)));
}
export function rowOf(y: number): number {
  return Math.max(0, Math.min(ROWS - 1, Math.floor((y - WORLD.y) / CELL)));
}
export function cellCenter(col: number, row: number): Point {
  return { x: WORLD.x + (col + 0.5) * CELL, y: WORLD.y + (row + 0.5) * CELL };
}
export const indexOf = (col: number, row: number) => row * COLS + col;

type Grid = {
  /** Custo de atravessar a célula. `Infinity` = não se passa. */
  cost: Float32Array;
  /** Desconto de estrada já aplicado ao custo; 0 = sem estrada. */
  road: Float32Array;
};

let grid: Grid | null = null;

/** Marca as células que uma polilinha atravessa, com raio em unidades. */
function stamp(points: Point[], radius: number, mark: (index: number) => void) {
  const step = CELL * 0.8;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = dist(a, b);
    const steps = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const span = Math.ceil(radius / CELL);
      const c0 = colOf(x), r0 = rowOf(y);
      for (let dc = -span; dc <= span; dc++) {
        for (let dr = -span; dr <= span; dr++) {
          const c = c0 + dc, r = r0 + dr;
          if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
          const centre = cellCenter(c, r);
          if (Math.hypot(centre.x - x, centre.y - y) <= radius) mark(indexOf(c, r));
        }
      }
    }
  }
}

function build(): Grid {
  const size = COLS * ROWS;
  const cost = new Float32Array(size);
  const road = new Float32Array(size);

  /* ------------------------- chão e fronteira ------------------------- */
  // O terreno JÁ está rasterizado para desenhar o chão: "mar" é exatamente
  // "fora do reino", porque a rasterização só pinta bioma dentro dos
  // polígonos. Reaproveitar isso evita varrer sete polígonos por célula —
  // era o que fazia a grade levar dois segundos e meio para montar.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = TERRAIN_ORDER[terrainAt(c, r)] ?? "sea";
      cost[indexOf(c, r)] = costOfTerrain(id);
    }
  }

  /* ------------------------------ rios -------------------------------- */
  // Rio largo é parede. O leito fica intransponível e só as travessias
  // conhecidas abrem furo — é o que obriga a procurar ponte ou vau.
  for (const river of rivers) {
    const wide = Math.max(river.widthStart, river.widthEnd) >= 18;
    if (!wide) continue;
    stamp(river.points, 16 * S, (i) => { cost[i] = BLOCKED; });
  }
  for (const crossing of borderCrossings) {
    // A travessia abre um furo na parede do rio, nos dois eixos: não se sabe
    // de que lado o viajante chega.
    const open = (i: number) => { if (cost[i] === BLOCKED) cost[i] = 1.25; };
    stamp([{ x: crossing.x - 30 * S, y: crossing.y }, { x: crossing.x + 30 * S, y: crossing.y }], 34 * S, open);
    stamp([{ x: crossing.x, y: crossing.y - 30 * S }, { x: crossing.x, y: crossing.y + 30 * S }], 34 * S, open);
  }

  /* ----------------------------- estradas ----------------------------- */
  // A estrada é desconto sobre o chão que ela cruza, e não um chão próprio:
  // via real na montanha continua sendo montanha barata, não planície.
  for (const built of roadGeometry) {
    const discount = ROAD_DISCOUNT[built.road.type as RoadType] ?? 0.8;
    stamp(built.points, 13 * S, (i) => {
      // Estrada sobre rio é ponte: reabre o que o leito fechou.
      if (cost[i] === BLOCKED) cost[i] = 1;
      if (road[i] === 0 || discount < road[i]) {
        road[i] = discount;
      }
    });
  }
  for (let i = 0; i < size; i++) if (road[i] > 0 && cost[i] !== BLOCKED) cost[i] *= road[i];

  return { cost, road };
}

export function navGrid(): Grid {
  if (!grid) grid = build();
  return grid;
}

export function costAt(col: number, row: number): number {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return BLOCKED;
  return navGrid().cost[indexOf(col, row)];
}

export function walkable(col: number, row: number): boolean {
  return Number.isFinite(costAt(col, row));
}

export function onRoad(col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
  return navGrid().road[indexOf(col, row)] > 0;
}

/**
 * Em que região está um ponto.
 *
 * Calculado sob demanda, e não guardado por célula: só interessa quando o
 * viajante para, o que acontece algumas vezes por partida — pagar sete testes
 * de polígono nessas horas é muito mais barato que rasterizar trinta e oito
 * mil células no carregamento.
 */
export function regionAtPoint(p: Point): RegionId | null {
  for (const entry of regions) if (pointInPolygon(p, entry.polygon)) return entry.id;
  return null;
}

/** O ponto caminhável mais perto — usado quando o toque cai no mar ou no rio. */
export function nearestWalkable(p: Point, maxRings = 14): Point | null {
  const c0 = colOf(p.x), r0 = rowOf(p.y);
  if (walkable(c0, r0)) return p;
  for (let ring = 1; ring <= maxRings; ring++) {
    for (let dc = -ring; dc <= ring; dc++) {
      for (let dr = -ring; dr <= ring; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
        if (walkable(c0 + dc, r0 + dr)) return cellCenter(c0 + dc, r0 + dr);
      }
    }
  }
  return null;
}
