/**
 * A ROTA PELO TERRENO.
 *
 * A* sobre a grade de navegação, com quatro modos. O jogador anda em
 * `prefer_roads`: ele procura a melhor rota pelo terreno, e a estrada ganha
 * naturalmente quando compensa — sem nunca ser obrigatória.
 *
 * Três coisas mantêm isto viável num celular:
 *
 *   1. só roda quando há destino novo, nunca por quadro;
 *   2. um teto de nós visitados impede que um destino impossível varra o
 *      mundo inteiro;
 *   3. a rota sai SIMPLIFICADA — colinear colapsado e curvas suavizadas —,
 *      porque uma polilinha com trezentos micro-segmentos é cara de desenhar
 *      e feia de olhar.
 */
import { dist } from "../geo";
import { UNITS_PER_HOUR } from "../navgraph";
import type { Point } from "../types";
import { CELL, COLS, ROWS, cellCenter, colOf, costAt, indexOf, nearestWalkable, onRoad, rowOf, walkable } from "./navigationGrid";

export type NavigationMode = "roads" | "prefer_roads" | "free" | "avoid_roads";

export type TerrainRoute = {
  points: Point[];
  cumulative: number[];
  totalDistance: number;
  travelHours: number;
  /** Fração do caminho feita sobre estrada — a barra do HUD usa isto. */
  roadShare: number;
};

/**
 * O que cada modo pensa de uma célula com estrada.
 *
 * O número de `prefer_roads` foi de 0,92 para 0,72 por dois motivos que são o
 * mesmo: com uma preferência fraca a rota deixava de achar a estrada, e o
 * campo de custo ficava quase plano — o que fazia a busca se espalhar por
 * meio mapa. Uma preferência FORTE produz rota melhor e busca mais barata.
 */
function modeFactor(mode: NavigationMode, road: boolean): number {
  if (mode === "roads") return road ? 1 : 40;
  if (mode === "prefer_roads") return road ? 0.72 : 1;
  if (mode === "avoid_roads") return road ? 2.2 : 1;
  return 1;
}

const NEIGHBOURS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
] as const;

/** Teto de segurança: um destino impossível não pode varrer o mundo inteiro. */
const MAX_VISITED = 26000;

export function planRoute(from: Point, to: Point, mode: NavigationMode = "prefer_roads"): TerrainRoute | null {
  const start = nearestWalkable(from);
  const goal = nearestWalkable(to);
  if (!start || !goal) return null;

  const sc = colOf(start.x), sr = rowOf(start.y);
  const gc = colOf(goal.x), gr = rowOf(goal.y);
  if (sc === gc && sr === gr) return null;

  const size = COLS * ROWS;
  const gScore = new Float32Array(size).fill(Infinity);
  const came = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const startIndex = indexOf(sc, sr);
  gScore[startIndex] = 0;

  // Heap binário: uma fila ordenada por array custaria caro nos 38 mil nós.
  const heap: { index: number; f: number }[] = [{ index: startIndex, f: 0 }];
  const push = (item: { index: number; f: number }) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].f <= heap[i].f) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let smallest = i;
        if (l < heap.length && heap[l].f < heap[smallest].f) smallest = l;
        if (r < heap.length && heap[r].f < heap[smallest].f) smallest = r;
        if (smallest === i) break;
        [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
        i = smallest;
      }
    }
    return top;
  };

  /**
   * A* PONDERADO.
   *
   * Com uma heurística estritamente admissível o custo do mapa é quase
   * uniforme — todo chão fica entre 0,6 e 1,4 — e a busca se espalha por
   * dezenas de milhares de células antes de decidir. Medido: 4,2 SEGUNDOS
   * para uma rota em `prefer_roads`, que é inaceitável no celular.
   *
   * Um peso modesto abre mão da rota matematicamente ótima por uma
   * quase-ótima e derruba a busca para dezenas de milissegundos. Num mapa de
   * estratégia ninguém percebe meia célula de diferença; todo mundo percebe
   * quatro segundos de espera.
   */
  const WEIGHT = 1.3;
  const heuristic = (c: number, r: number) => Math.hypot(c - gc, r - gr) * 0.62 * WEIGHT;
  let visited = 0;
  let found = false;

  while (heap.length && visited < MAX_VISITED) {
    const current = pop();
    if (closed[current.index]) continue;
    closed[current.index] = 1;
    visited++;

    const c = current.index % COLS;
    const r = (current.index - c) / COLS;
    if (c === gc && r === gr) { found = true; break; }

    for (const [dc, dr, diagonal] of NEIGHBOURS) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const index = indexOf(nc, nr);
      if (closed[index] || !walkable(nc, nr)) continue;
      // Diagonal só passa se os dois lados também passarem: sem cortar quina
      // de rio nem de montanha bloqueada.
      if (diagonal > 1 && (!walkable(c + dc, r) || !walkable(c, r + dr))) continue;

      const step = costAt(nc, nr) * diagonal * modeFactor(mode, onRoad(nc, nr));
      const tentative = gScore[current.index] + step;
      if (tentative >= gScore[index]) continue;
      gScore[index] = tentative;
      came[index] = current.index;
      push({ index, f: tentative + heuristic(nc, nr) });
    }
  }

  if (!found) return null;

  /* --------------------------- desfaz o caminho ------------------------ */
  const cells: number[] = [];
  let cursor = indexOf(gc, gr);
  while (cursor !== -1) {
    cells.unshift(cursor);
    if (cursor === startIndex) break;
    cursor = came[cursor];
  }

  const raw: Point[] = [from, ...cells.map((i) => cellCenter(i % COLS, (i - (i % COLS)) / COLS)), to];
  const points = smooth(simplify(raw));

  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + dist(points[i - 1], points[i]));
  const totalDistance = cumulative[cumulative.length - 1] ?? 0;

  // As horas saem do CUSTO acumulado, não da distância: é isso que faz o
  // bosque demorar mais que a planície na mesma extensão de mapa.
  const roadCells = cells.filter((i) => onRoad(i % COLS, (i - (i % COLS)) / COLS)).length;
  const effort = gScore[indexOf(gc, gr)] * CELL;
  return {
    points,
    cumulative,
    totalDistance,
    travelHours: effort / UNITS_PER_HOUR,
    roadShare: cells.length ? roadCells / cells.length : 0,
  };
}

/** Colapsa pontos quase colineares: a rota vira traço, não serrilha. */
function simplify(points: Point[], tolerance = CELL * 0.55): Point[] {
  if (points.length <= 2) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const base = dist(a, c) || 1;
    if (Math.abs(cross) / base > tolerance) out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Chanfra os cantos de 90° que a grade produz, sem inventar desvio. */
function smooth(points: Point[]): Point[] {
  if (points.length <= 3) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    out.push({ x: b.x + (a.x - b.x) * 0.22, y: b.y + (a.y - b.y) * 0.22 });
    out.push({ x: b.x + (c.x - b.x) * 0.22, y: b.y + (c.y - b.y) * 0.22 });
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * A rota de terreno no formato que o laço de viagem já sabe percorrer.
 *
 * Um `TravelPath` nasceu do grafo de estradas — tem arestas, nós e fronteiras.
 * Uma rota livre não tem nada disso: é UM trecho só, do ponto ao ponto. Em vez
 * de criar um segundo laço de viagem, ela se apresenta como um trajeto de um
 * trecho e carrega o custo do chão num número (`terrainModifier`), que é
 * exatamente o papel que o modificador da aresta cumpria.
 */
export function terrainPath(from: Point, to: Point, mode: NavigationMode = "prefer_roads") {
  const route = planRoute(from, to, mode);
  if (!route || route.totalDistance <= 0) return null;
  const modifier = route.travelHours / (route.totalDistance / UNITS_PER_HOUR);
  return {
    nodeIds: [] as string[],
    edgeIds: [] as string[],
    points: route.points,
    cumulative: route.cumulative,
    totalDistance: route.totalDistance,
    travelHours: route.travelHours,
    legAt: [0, route.totalDistance],
    legEnd: [undefined] as (string | undefined)[],
    terrainModifier: modifier,
    endPoint: route.points[route.points.length - 1],
    roadShare: route.roadShare,
  };
}
