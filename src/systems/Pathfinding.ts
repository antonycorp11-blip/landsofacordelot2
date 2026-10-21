import type { Vec2 } from "../core/math";
import type { RoadNetwork } from "../world/Roads";

/** A* no grafo de estradas. Retorna a sequência de ids de nós (inclusive). */
export function findNodePath(roads: RoadNetwork, start: number, goal: number): number[] | null {
  if (start === goal) return [start];
  const n = roads.nodes.length;
  const g = new Float64Array(n).fill(Infinity);
  const f = new Float64Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open: number[] = [start];
  const goalNode = roads.nodes[goal];
  const h = (i: number) => Math.hypot(roads.nodes[i].x - goalNode.x, roads.nodes[i].y - goalNode.y) * 0.8;
  g[start] = 0;
  f[start] = h(start);
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
    const cur = open[bi];
    open.splice(bi, 1);
    if (cur === goal) {
      const path = [cur];
      let c = cur;
      while (came[c] >= 0) {
        c = came[c];
        path.push(c);
      }
      return path.reverse();
    }
    closed[cur] = 1;
    for (const eid of roads.nodes[cur].edges) {
      const e = roads.edges[eid];
      const nb = e.a === cur ? e.b : e.a;
      if (closed[nb]) continue;
      const cost = e.len * (e.kind === "asphalt" ? 0.8 : e.kind === "track" ? 1.25 : 1);
      const ng = g[cur] + cost;
      if (ng < g[nb]) {
        g[nb] = ng;
        f[nb] = ng + h(nb);
        came[nb] = cur;
        if (!open.includes(nb)) open.push(nb);
      }
    }
  }
  return null;
}

/** Nó de partida mais adequado: o mais próximo que esteja conectado. */
export function nearestConnected(roads: RoadNetwork, p: Vec2, exclude?: Set<number>): number {
  let best = 0;
  let bd = Infinity;
  for (const nd of roads.nodes) {
    if (!nd.edges.length || exclude?.has(nd.id)) continue;
    const d = (nd.x - p.x) ** 2 + (nd.y - p.y) ** 2;
    if (d < bd) {
      bd = d;
      best = nd.id;
    }
  }
  return best;
}

/** Rota em polilinha do ponto `from` ao ponto `to`, passando pela malha viária. */
export function routeBetween(roads: RoadNetwork, from: Vec2, to: Vec2, startNode?: number, goalNode?: number): Vec2[] {
  const direct = Math.hypot(to.x - from.x, to.y - from.y);
  const s = startNode ?? nearestConnected(roads, from);
  const t = goalNode ?? nearestConnected(roads, to);
  const sn = roads.nodes[s];
  const tn = roads.nodes[t];
  const viaRoad = Math.hypot(sn.x - from.x, sn.y - from.y) + Math.hypot(tn.x - to.x, tn.y - to.y);
  if (direct < 45 && direct < viaRoad + 10) return [from, to];
  const path = findNodePath(roads, s, t);
  if (!path) return [from, to];
  const pts: Vec2[] = [from];
  for (const id of path) pts.push({ x: roads.nodes[id].x, y: roads.nodes[id].y });
  pts.push(to);
  // remove pontos redundantes muito próximos
  return cleanPolyline(pts);
}

/** Remove pontos consecutivos quase coincidentes (mantém sempre o destino final). */
export function cleanPolyline(pts: Vec2[], minGap = 1.5): Vec2[] {
  const out: Vec2[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const last = out[out.length - 1];
    const d = Math.hypot(pts[i].x - last.x, pts[i].y - last.y);
    if (d > minGap) out.push(pts[i]);
    else if (i === pts.length - 1) {
      if (out.length > 1) out[out.length - 1] = pts[i];
      else if (d > 0.05) out.push(pts[i]);
    }
  }
  if (out.length === 1) out.push({ ...pts[pts.length - 1] });
  return out;
}
