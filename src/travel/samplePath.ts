/**
 * Posição e rumo em qualquer ponto de uma rota.
 *
 * A mesma função serve ao viajante do jogador e a todos os agentes que
 * circulam o mapa — se cada um interpolasse do seu jeito, um andaria por
 * dentro das curvas e o outro por fora da mesma estrada.
 */
import type { Point, TravelPath } from "../world/types";

export type Sampled = Point & {
  /** Graus, 0 = leste, crescendo para baixo (como na tela). */
  heading: number;
};

export function samplePath(path: TravelPath, distance: number): Sampled {
  const cum = path.cumulative;
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= distance) lo = mid;
    else hi = mid;
  }
  const segment = cum[hi] - cum[lo] || 1;
  const t = Math.max(0, Math.min(1, (distance - cum[lo]) / segment));
  const a = path.points[lo];
  const b = path.points[hi];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    heading: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
}
