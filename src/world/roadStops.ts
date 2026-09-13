/**
 * PARADAS DE ESTRADA.
 *
 * A malha de navegação só tem nós onde existe um lugar: uma cidade, um
 * castelo, uma travessia. Mas quem joga não quer clicar só em cidade — quer
 * apontar um trecho de estrada e ir até lá, seja para cortar caminho, seja
 * para sair da frente de um exército.
 *
 * Uma PARADA é qualquer ponto caminhável: ou um nó de verdade, ou um ponto no
 * meio de uma aresta, medido em distância percorrida a partir de `edge.from`.
 * Com isso o viajante pode partir do meio do nada e parar no meio do nada, e o
 * Dijkstra de sempre continua resolvendo o miolo do trajeto entre nós.
 *
 * A estrada continua sendo o único lugar caminhável: um toque fora dela é
 * atraído para o ponto de estrada mais próximo, e recusado se estiver longe
 * demais.
 */
import { dist } from "./geo";
import { WORLD_SCALE as S } from "./layout";
import { UNITS_PER_HOUR, findPath, routeEdgeById, routeEdges } from "./navgraph";
import { routeNodeById } from "./valdoria";
import type { Point, RouteEdge, TravelPath } from "./types";

export type RoadStop =
  | { kind: "node"; id: string; x: number; y: number }
  | { kind: "road"; edgeId: string; along: number; x: number; y: number };

/** Forma curta e estável para gravar no save. */
export type RoadStopSave = { n: string } | { e: string; a: number };

export function saveStop(stop: RoadStop): RoadStopSave {
  return stop.kind === "node" ? { n: stop.id } : { e: stop.edgeId, a: stop.along };
}
export function loadStop(saved: RoadStopSave | null | undefined): RoadStop | null {
  if (!saved) return null;
  if ("n" in saved) return nodeStop(saved.n);
  const edge = routeEdgeById.get(saved.e);
  if (!edge || !Number.isFinite(saved.a)) return null;
  return roadStop(edge, Math.max(0, Math.min(edge.distance, saved.a)));
}

export function nodeStop(id: string): RoadStop | null {
  const node = routeNodeById.get(id);
  return node ? { kind: "node", id, x: node.x, y: node.y } : null;
}
function roadStop(edge: RouteEdge, along: number): RoadStop {
  const at = pointAlong(edge, along);
  return { kind: "road", edgeId: edge.id, along, x: at.x, y: at.y };
}

/** Nome curto do lugar, para o diário e para a barra. */
export function stopLabel(stop: RoadStop): string {
  if (stop.kind === "node") return routeNodeById.get(stop.id)?.id ?? stop.id;
  return routeEdgeById.get(stop.edgeId)?.regionId ?? "estrada";
}

/* ----------------------------- geometria ------------------------------- */

function projectOnSegment(p: Point, a: Point, b: Point) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
  return { t, point: { x: a.x + vx * t, y: a.y + vy * t } };
}

function pointAlong(edge: RouteEdge, along: number): Point {
  const via = edge.via!;
  let acc = 0;
  for (let i = 1; i < via.length; i++) {
    const seg = dist(via[i - 1], via[i]);
    if (acc + seg >= along) {
      const t = seg === 0 ? 0 : (along - acc) / seg;
      return { x: via[i - 1].x + (via[i].x - via[i - 1].x) * t, y: via[i - 1].y + (via[i].y - via[i - 1].y) * t };
    }
    acc += seg;
  }
  return via[via.length - 1];
}

/**
 * Recorta a polilinha da aresta entre duas distâncias. Se `from > to` o
 * resultado sai invertido — é assim que se anda para trás numa aresta.
 */
function sliceVia(edge: RouteEdge, from: number, to: number): Point[] {
  const via = edge.via!;
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const out: Point[] = [pointAlong(edge, lo)];
  let acc = 0;
  for (let i = 1; i < via.length; i++) {
    const seg = dist(via[i - 1], via[i]);
    const end = acc + seg;
    if (end > lo && end < hi) out.push(via[i]);
    acc = end;
  }
  out.push(pointAlong(edge, hi));
  return from > to ? out.reverse() : out;
}

/** Quanto de aresta perto da ponta conta como "é a própria cidade". */
const NODE_SNAP = 70 * S;

/**
 * Ponto de estrada mais próximo de um toque. `maxDistance` recusa toques no
 * meio do campo: fora da estrada não se anda.
 */
export function nearestRoadStop(p: Point, maxDistance = Infinity): RoadStop | null {
  let best: { d: number; edge: RouteEdge; along: number } | null = null;
  for (const edge of routeEdges) {
    const via = edge.via;
    if (!via) continue;
    let acc = 0;
    for (let i = 1; i < via.length; i++) {
      const seg = dist(via[i - 1], via[i]);
      const projected = projectOnSegment(p, via[i - 1], via[i]);
      const d = dist(p, projected.point);
      if (!best || d < best.d) best = { d, edge, along: acc + seg * projected.t };
      acc += seg;
    }
  }
  if (!best || best.d > maxDistance) return null;
  const snap = Math.min(NODE_SNAP, best.edge.distance * 0.2);
  if (best.along <= snap) return nodeStop(best.edge.from);
  if (best.edge.distance - best.along <= snap) return nodeStop(best.edge.to);
  return roadStop(best.edge, best.along);
}

/* ------------------------------ trajeto -------------------------------- */

type Leg = { edgeId: string; points: Point[]; distance: number; hours: number; endNode?: string };

function legOf(edge: RouteEdge, from: number, to: number, endNode?: string): Leg {
  const points = sliceVia(edge, from, to);
  const distance = Math.abs(to - from);
  return { edgeId: edge.id, points, distance, hours: (distance * edge.movementModifier) / UNITS_PER_HOUR, endNode };
}

/** As maneiras de sair de uma parada e chegar a um nó de verdade. */
function exits(stop: RoadStop): { node: string; legs: Leg[] }[] {
  if (stop.kind === "node") return [{ node: stop.id, legs: [] }];
  const edge = routeEdgeById.get(stop.edgeId);
  if (!edge) return [];
  return [
    { node: edge.from, legs: [legOf(edge, stop.along, 0, edge.from)] },
    { node: edge.to, legs: [legOf(edge, stop.along, edge.distance, edge.to)] },
  ];
}

/** As maneiras de entrar numa parada vindo de um nó de verdade. */
function entries(stop: RoadStop): { node: string; legs: Leg[] }[] {
  if (stop.kind === "node") return [{ node: stop.id, legs: [] }];
  const edge = routeEdgeById.get(stop.edgeId);
  if (!edge) return [];
  return [
    { node: edge.from, legs: [legOf(edge, 0, stop.along)] },
    { node: edge.to, legs: [legOf(edge, edge.distance, stop.along)] },
  ];
}

function legsOfPath(path: TravelPath): Leg[] {
  const out: Leg[] = [];
  for (let i = 0; i < path.edgeIds.length; i++) {
    const edge = routeEdgeById.get(path.edgeIds[i])!;
    const forward = edge.from === path.nodeIds[i];
    out.push({
      edgeId: edge.id,
      points: forward ? edge.via! : edge.via!.slice().reverse(),
      distance: edge.distance,
      hours: (edge.distance * edge.movementModifier) / UNITS_PER_HOUR,
      endNode: path.nodeIds[i + 1],
    });
  }
  return out;
}

function assemble(legs: Leg[], endStop: RoadStop): TravelPath | null {
  const real = legs.filter((l) => l.distance > 0);
  if (!real.length) return null;

  const points: Point[] = [...real[0].points];
  for (let i = 1; i < real.length; i++) points.push(...real[i].points.slice(1));

  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + dist(points[i - 1], points[i]));

  // As fronteiras vêm das distâncias reais dos trechos, e não da polilinha:
  // são as duas a mesma coisa a menos de erro de ponto flutuante, e é a
  // fronteira que decide quando um nó foi alcançado.
  const legAt: number[] = [0];
  let acc = 0;
  for (const leg of real) {
    acc += leg.distance;
    legAt.push(acc);
  }
  const total = cumulative[cumulative.length - 1] ?? 0;
  // Reconcilia a última fronteira com o comprimento medido da polilinha.
  legAt[legAt.length - 1] = total;

  return {
    nodeIds: [...new Set(real.map((l) => l.endNode).filter((n): n is string => !!n))],
    edgeIds: real.map((l) => l.edgeId),
    points,
    cumulative,
    totalDistance: total,
    travelHours: real.reduce((sum, l) => sum + l.hours, 0),
    legAt,
    legEnd: real.map((l) => l.endNode),
    endStop,
  };
}

/**
 * Trajeto entre duas paradas quaisquer. Resolve as pontas parciais na mão e
 * deixa o miolo — de nó a nó — para o Dijkstra de sempre.
 */
export function pathBetween(from: RoadStop, to: RoadStop): TravelPath | null {
  // Mesma aresta: anda-se por dentro dela, sem passar por nó nenhum.
  if (from.kind === "road" && to.kind === "road" && from.edgeId === to.edgeId) {
    if (Math.abs(from.along - to.along) < 1) return null;
    const edge = routeEdgeById.get(from.edgeId)!;
    return assemble([legOf(edge, from.along, to.along)], to);
  }
  if (from.kind === "node" && to.kind === "node" && from.id === to.id) return null;

  let best: { hours: number; legs: Leg[] } | null = null;
  for (const exit of exits(from)) {
    for (const entry of entries(to)) {
      let middle: Leg[] = [];
      if (exit.node !== entry.node) {
        const found = findPath(exit.node, entry.node);
        if (!found) continue;
        middle = legsOfPath(found);
      }
      const legs = [...exit.legs, ...middle, ...entry.legs];
      const hours = legs.reduce((sum, l) => sum + l.hours, 0);
      if (hours > 0 && (!best || hours < best.hours)) best = { hours, legs };
    }
  }
  return best ? assemble(best.legs, to) : null;
}

/** Onde o viajante está, dado o progresso ao longo de um trajeto. */
export function stopAlong(path: TravelPath, distance: number): RoadStop | null {
  const legAt = path.legAt ?? [];
  let leg = 0;
  while (leg < legAt.length - 2 && distance >= legAt[leg + 1]) leg++;
  const edge = routeEdgeById.get(path.edgeIds[leg]);
  if (!edge) return null;
  const within = Math.max(0, distance - legAt[leg]);
  const end = path.legEnd?.[leg];
  // Sentido da travessia: se o trecho termina em `edge.to`, andamos de `from`
  // para `to`; senão é o contrário.
  const forward = end ? end === edge.to : path.endStop?.kind === "road" && path.endStop.edgeId === edge.id
    ? path.endStop.along >= within
    : true;
  const along = forward ? within : edge.distance - within;
  return roadStop(edge, Math.max(0, Math.min(edge.distance, along)));
}

/**
 * ONDE A HISTÓRIA COMEÇA.
 *
 * Não numa sala do trono: num trecho de estrada dentro do bosque, longe de
 * qualquer portão. O jogador acorda sem título, sem rumo e sem ninguém para
 * lhe dizer o que fazer — e a primeira coisa que aprende é andar.
 *
 * A escolha é determinística: a aresta mais longa da floresta, no meio. Assim
 * o começo é sempre o mesmo lugar e o mesmo enquadramento.
 */
export function openingStop(): RoadStop {
  const forest = routeEdges
    .filter((e) => e.regionId === "elmwood" && e.via)
    .sort((a, b) => b.distance - a.distance)[0];
  const edge = forest ?? routeEdges.slice().sort((a, b) => b.distance - a.distance)[0];
  return roadStop(edge, edge.distance * 0.5);
}
