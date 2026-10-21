import { catmullRom, closestPointOnSegment, dist, type Vec2 } from "../core/math";
import type { RoadEdge, RoadKind, RoadNode } from "./types";

/** Rede viária: nós + arestas. Usada tanto para desenhar quanto para navegação. */
export class RoadNetwork {
  nodes: RoadNode[] = [];
  edges: RoadEdge[] = [];

  addNode(x: number, y: number): number {
    const id = this.nodes.length;
    this.nodes.push({ id, x, y, edges: [] });
    return id;
  }

  addEdge(a: number, b: number, kind: RoadKind, width: number, s0 = 0): number {
    const id = this.edges.length;
    const len = dist(this.nodes[a], this.nodes[b]);
    this.edges.push({ id, a, b, kind, width, s0, len });
    this.nodes[a].edges.push(id);
    this.nodes[b].edges.push(id);
    return id;
  }

  /**
   * Cria uma via suavizada a partir de pontos de controle. Se `startNode`/`endNode`
   * forem informados, a via se conecta a nós existentes.
   */
  addRoad(control: Vec2[], kind: RoadKind, width: number, step = 10, startNode?: number, endNode?: number): number[] {
    const pts = catmullRom(control, step);
    const ids: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      if (i === 0 && startNode !== undefined) ids.push(startNode);
      else if (i === pts.length - 1 && endNode !== undefined) ids.push(endNode);
      else ids.push(this.addNode(pts[i].x, pts[i].y));
    }
    let s = 0;
    for (let i = 1; i < ids.length; i++) {
      const e = this.addEdge(ids[i - 1], ids[i], kind, width, s);
      s += this.edges[e].len;
    }
    return ids;
  }

  nearestNode(x: number, y: number, filter?: (n: RoadNode) => boolean): RoadNode {
    let best = this.nodes[0];
    let bd = Infinity;
    for (const n of this.nodes) {
      if (filter && !filter(n)) continue;
      const d = (n.x - x) ** 2 + (n.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  /** Distância do ponto à via mais próxima, e o tipo dessa via. */
  roadAt(x: number, y: number): { d: number; kind: RoadKind | null; width: number } {
    let bd = Infinity;
    let kind: RoadKind | null = null;
    let width = 0;
    for (const e of this.edges) {
      const a = this.nodes[e.a];
      const b = this.nodes[e.b];
      if (Math.min(a.x, b.x) - 20 > x || Math.max(a.x, b.x) + 20 < x || Math.min(a.y, b.y) - 20 > y || Math.max(a.y, b.y) + 20 < y) continue;
      const c = closestPointOnSegment(x, y, a.x, a.y, b.x, b.y);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bd) {
        bd = d;
        kind = e.kind;
        width = e.width;
      }
    }
    return { d: bd, kind, width };
  }

  /** Divide uma aresta, inserindo um nó no ponto mais próximo. Retorna o id do nó. */
  splitNearest(x: number, y: number, kinds: RoadKind[]): number {
    let best: RoadEdge | null = null;
    let bd = Infinity;
    let bp: Vec2 & { t: number } = { x, y, t: 0 };
    for (const e of this.edges) {
      if (!kinds.includes(e.kind)) continue;
      const a = this.nodes[e.a];
      const b = this.nodes[e.b];
      const c = closestPointOnSegment(x, y, a.x, a.y, b.x, b.y);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bd) {
        bd = d;
        best = e;
        bp = c;
      }
    }
    if (!best) return this.nearestNode(x, y).id;
    if (bp.t < 0.15) return best.a;
    if (bp.t > 0.85) return best.b;
    const id = this.addNode(bp.x, bp.y);
    const oldB = best.b;
    // encurta a aresta original e cria a segunda metade
    this.nodes[oldB].edges = this.nodes[oldB].edges.filter((k) => k !== best!.id);
    best.b = id;
    best.len = dist(this.nodes[best.a], this.nodes[id]);
    this.nodes[id].edges.push(best.id);
    this.addEdge(id, oldB, best.kind, best.width, best.s0 + best.len);
    return id;
  }
}
