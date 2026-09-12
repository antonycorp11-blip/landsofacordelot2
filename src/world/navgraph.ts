/**
 * Grafo de navegação.
 *
 * O personagem NUNCA anda em linha reta: ele percorre as polilinhas geradas
 * aqui, que são exatamente as mesmas usadas para desenhar as estradas. Trocar
 * o traçado muda o desenho e a viagem ao mesmo tempo, por construção.
 */
import { dist, fbm, polylineLength } from "./geo";
import { WORLD, WORLD_SCALE as S } from "./layout";
import type {
  Point,
  RegionId,
  RoadDefinition,
  RouteEdge,
  RouteNode,
  TerrainType,
  TravelPath,
} from "./types";
import { allRoads, regions, routeNodeById } from "./valdoria";
import { pointInPolygon } from "./geo";

/**
 * RITMO DO MUNDO.
 *
 * Quantos dias um viajante leva para cruzar Valdória de ponta a ponta por
 * estrada real, sem parar. É o único número que controla o custo de tempo de
 * TODAS as viagens — e é independente do tamanho do mapa, porque deriva da
 * largura do mundo. Aumentar o reino não encurta as jornadas.
 *
 * Terreno difícil multiplica esse custo via `RouteEdge.movementModifier`:
 * uma trilha de montanha pode custar o dobro de uma estrada real.
 */
export const DAYS_TO_CROSS_KINGDOM = 7;

/** Unidades de mundo percorridas por hora a pé/cavalo, em estrada boa. */
export const UNITS_PER_HOUR = WORLD.width / (DAYS_TO_CROSS_KINGDOM * 24);

const SAMPLES_PER_SEGMENT = 14;

/* ------------------------------------------------------------------ */
/* Geometria das estradas                                              */
/* ------------------------------------------------------------------ */

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/**
 * Insere pontos de sinuosidade entre dois nós. É o que impede que uma estrada
 * vire um segmento de reta entre duas cidades.
 */
function wanderBetween(a: Point, b: Point, seed: string, windiness: number): Point[] {
  const len = dist(a, b);
  if (len < 40 * S) return [];
  const dx = (b.x - a.x) / len;
  const dy = (b.y - a.y) / len;
  const nx = -dy;
  const ny = dx;
  const amp = Math.min(len * 0.16, 90 * S) * windiness;
  const out: Point[] = [];
  for (const t of [0.32, 0.68]) {
    const n = fbm(seed, t * 2.3, 2) * amp;
    out.push({ x: a.x + (b.x - a.x) * t + nx * n, y: a.y + (b.y - a.y) * t + ny * n });
  }
  return out;
}

function regionAt(p: Point, fallback: RegionId): RegionId {
  for (const r of regions) if (pointInPolygon(p, r.polygon)) return r.id;
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Construção do grafo                                                 */
/* ------------------------------------------------------------------ */

export type BuiltRoad = {
  road: RoadDefinition;
  /** Polilinha densa usada tanto para desenhar quanto para viajar. */
  points: Point[];
  edgeIds: string[];
};

const edges: RouteEdge[] = [];
const builtRoads: BuiltRoad[] = [];

function buildRoad(road: RoadDefinition) {
  const nodes = road.nodes
    .map((id) => routeNodeById.get(id))
    .filter((n): n is RouteNode => Boolean(n));
  if (nodes.length < 2) {
    console.warn(`[navgraph] estrada ${road.id} com nós ausentes`);
    return;
  }

  const windiness = road.windiness ?? (road.type === "trail" ? 1.3 : road.type === "secondary" ? 1.1 : 1);
  const control: Point[] = [];
  const nodeControlIndex: number[] = [];

  nodes.forEach((n, i) => {
    nodeControlIndex.push(control.length);
    control.push({ x: n.x, y: n.y });
    if (i < nodes.length - 1) {
      control.push(...wanderBetween(n, nodes[i + 1], `${road.id}-${i}`, windiness));
    }
  });

  // Amostragem Catmull-Rom: o índice do ponto de controle k cai exatamente em
  // k * SAMPLES_PER_SEGMENT, o que permite fatiar a curva por nó.
  const sampled: Point[] = [];
  const at = (i: number) => control[Math.max(0, Math.min(control.length - 1, i))];
  for (let k = 0; k < control.length - 1; k++) {
    for (let s = 0; s < SAMPLES_PER_SEGMENT; s++) {
      sampled.push(catmullRom(at(k - 1), at(k), at(k + 1), at(k + 2), s / SAMPLES_PER_SEGMENT));
    }
  }
  sampled.push({ ...control[control.length - 1] });

  const edgeIds: string[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i];
    const to = nodes[i + 1];
    const via = sampled.slice(
      nodeControlIndex[i] * SAMPLES_PER_SEGMENT,
      nodeControlIndex[i + 1] * SAMPLES_PER_SEGMENT + 1,
    );
    const distance = polylineLength(via);
    const mid = via[Math.floor(via.length / 2)];
    const terrain: TerrainType = road.terrain ?? "plain";
    edges.push({
      id: `${road.id}:${from.id}->${to.id}`,
      from: from.id,
      to: to.id,
      distance,
      roadType: road.type,
      regionId: regionAt(mid, road.regionId),
      danger: road.danger ?? 0.1,
      terrain,
      movementModifier: road.movementModifier ?? (road.type === "trail" ? 1.5 : road.type === "secondary" ? 1.2 : 1),
      eventChance: Math.min(0.9, (road.danger ?? 0.1) * 1.4 + distance / 4000),
      via,
    });
    edgeIds.push(`${road.id}:${from.id}->${to.id}`);
  }

  builtRoads.push({ road, points: sampled, edgeIds });
}

allRoads.forEach(buildRoad);

export const routeEdges: RouteEdge[] = edges;
export const roadGeometry: BuiltRoad[] = builtRoads;
export const routeEdgeById = new Map(routeEdges.map((e) => [e.id, e]));

/** Lista de adjacência não-direcionada. */
export const adjacency = new Map<string, { edge: RouteEdge; other: string }[]>();
for (const e of routeEdges) {
  if (!adjacency.has(e.from)) adjacency.set(e.from, []);
  if (!adjacency.has(e.to)) adjacency.set(e.to, []);
  adjacency.get(e.from)!.push({ edge: e, other: e.to });
  adjacency.get(e.to)!.push({ edge: e, other: e.from });
}

export const edgeCost = (e: RouteEdge) => e.distance * e.movementModifier;

/* ------------------------------------------------------------------ */
/* Pathfinding                                                         */
/* ------------------------------------------------------------------ */

/** Dijkstra sobre o custo de movimento (distância × modificador de terreno). */
export function findPath(fromId: string, toId: string): TravelPath | null {
  if (fromId === toId) return null;
  if (!routeNodeById.has(fromId) || !routeNodeById.has(toId)) return null;

  const best = new Map<string, number>([[fromId, 0]]);
  const prev = new Map<string, { node: string; edge: RouteEdge }>();
  const visited = new Set<string>();
  const queue: [string, number][] = [[fromId, 0]];

  while (queue.length) {
    queue.sort((a, b) => a[1] - b[1]);
    const [current] = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (current === toId) break;
    for (const { edge, other } of adjacency.get(current) ?? []) {
      if (edge.blocked || visited.has(other)) continue;
      const cost = (best.get(current) ?? Infinity) + edgeCost(edge);
      if (cost < (best.get(other) ?? Infinity)) {
        best.set(other, cost);
        prev.set(other, { node: current, edge });
        queue.push([other, cost]);
      }
    }
  }

  if (!prev.has(toId)) return null;

  const nodeIds: string[] = [toId];
  const edgeIds: string[] = [];
  const orderedEdges: RouteEdge[] = [];
  let cursor = toId;
  while (cursor !== fromId) {
    const step = prev.get(cursor)!;
    edgeIds.unshift(step.edge.id);
    orderedEdges.unshift(step.edge);
    cursor = step.node;
    nodeIds.unshift(cursor);
  }

  const points: Point[] = [];
  let travelHours = 0;
  for (let i = 0; i < orderedEdges.length; i++) {
    const edge = orderedEdges[i];
    const forward = edge.from === nodeIds[i];
    const via = forward ? edge.via! : edge.via!.slice().reverse();
    points.push(...(i === 0 ? via : via.slice(1)));
    travelHours += (edge.distance * edge.movementModifier) / UNITS_PER_HOUR;
  }

  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + dist(points[i - 1], points[i]));

  return {
    nodeIds,
    edgeIds,
    points,
    cumulative,
    totalDistance: cumulative[cumulative.length - 1] ?? 0,
    travelHours,
  };
}

/** Índice do próximo nó de rota alcançado, dado o progresso em distância. */
export function nodeBoundaries(path: TravelPath): number[] {
  const out: number[] = [0];
  let acc = 0;
  for (const edgeId of path.edgeIds) {
    acc += routeEdgeById.get(edgeId)?.distance ?? 0;
    out.push(acc);
  }
  return out;
}
