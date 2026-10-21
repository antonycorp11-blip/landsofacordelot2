import { TAU } from "../core/math";
import { fbm } from "../core/rng";

export interface IslandShape {
  /** raio da costa em função do ângulo */
  radius: (a: number) => number;
  slots: { x: number; y: number; a: number }[];
  seed: number;
}

const cache = new Map<number, IslandShape>();

/** Contorno da ilha por ruído e oito pedras de construção em volta do farol. */
export function islandShape(seed: number): IslandShape {
  const hit = cache.get(seed);
  if (hit) return hit;
  const radius = (a: number) => {
    const x = Math.cos(a);
    const y = Math.sin(a);
    return 112 + (fbm(x * 1.3 + 7, y * 1.3 + 3, seed, 4) - 0.5) * 70 + Math.sin(a * 3 + seed) * 6;
  };
  const slots: IslandShape["slots"] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const r = Math.min(radius(a) - 18, 98) * (i % 2 ? 0.92 : 1);
    slots.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, a });
  }
  const s = { radius, slots, seed };
  cache.set(seed, s);
  return s;
}
