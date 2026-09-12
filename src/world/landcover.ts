/**
 * COBERTURA DO SOLO — as grandes massas de floresta, lavoura e monte.
 *
 * O terreno de um mapa ilustrado não é feito de ícones soltos: é feito de
 * MASSAS. Uma floresta é uma mancha contínua com silhueta própria, e as
 * árvores desenhadas em cima são o acabamento, não a substância.
 *
 * Estas manchas são geradas por semente fixa a partir dos dados — bioma,
 * polígono da região e as estradas que já existem. Continuam sendo dados:
 * podem ser recolorizadas numa conquista, cortadas por uma nova fronteira ou
 * substituídas por formas autorais depois, sem que nada mais mude.
 */
import { deg, dist, distanceToPolyline, makeRng, pointInPolygon } from "./geo";
import { bounds } from "./geo";
import { WORLD_SCALE as S } from "./layout";
import { roadGeometry } from "./navgraph";
import type { Biome, Point, Region, RegionId } from "./types";
import { allPois, regions } from "./valdoria";

export type LandcoverType = "forest" | "farmland" | "highland" | "scrub";

export type LandcoverShape = {
  id: string;
  type: LandcoverType;
  regionId: RegionId;
  polygon: Point[];
};

type MassSpec = {
  type: LandcoverType;
  count: number;
  /** Raio em unidades da escala antiga. */
  radius: [number, number];
};

const BIOME_MASSES: Record<Biome, MassSpec[]> = {
  dense_forest: [
    { type: "forest", count: 26, radius: [30, 72] },
    { type: "highland", count: 4, radius: [22, 40] },
  ],
  temperate_valley: [
    { type: "forest", count: 9, radius: [18, 38] },
    { type: "farmland", count: 11, radius: [16, 34] },
    { type: "highland", count: 5, radius: [18, 34] },
  ],
  sacred_valley: [
    { type: "forest", count: 7, radius: [16, 34] },
    { type: "farmland", count: 9, radius: [16, 32] },
    { type: "highland", count: 7, radius: [20, 40] },
  ],
  plains: [
    { type: "farmland", count: 20, radius: [22, 50] },
    { type: "forest", count: 4, radius: [14, 26] },
  ],
  steppe_march: [
    { type: "scrub", count: 16, radius: [20, 44] },
    { type: "highland", count: 9, radius: [20, 40] },
  ],
  alpine: [
    { type: "highland", count: 18, radius: [24, 52] },
    { type: "forest", count: 5, radius: [14, 28] },
  ],
  coastal: [
    { type: "farmland", count: 8, radius: [16, 32] },
    { type: "forest", count: 5, radius: [14, 28] },
    { type: "highland", count: 4, radius: [16, 30] },
  ],
};

/** Ruído periódico: garante que a silhueta feche sem emenda. */
function periodic(seed: string, angleDeg: number, harmonics = 7): number {
  const rng = makeRng(seed);
  let sum = 0;
  let norm = 0;
  for (let k = 1; k <= harmonics; k++) {
    const phase = rng() * Math.PI * 2;
    const amp = 1 / k;
    sum += Math.sin(k * deg(angleDeg) + phase) * amp;
    norm += amp;
  }
  return sum / norm;
}

/**
 * Silhueta orgânica fechada. Pontos que caiam fora da região são puxados para
 * dentro em vez de descartados — assim a mancha ABRAÇA a fronteira em vez de
 * evitá-la, que é como floresta e lavoura se comportam de verdade.
 */
function blob(center: Point, radius: number, seed: string, region: Point[]): Point[] {
  const steps = 34;
  const out: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 360;
    // Amplitude larga: mancha de floresta tem lóbulos e reentrâncias, não é disco.
    const r = radius * (0.5 + 0.82 * ((periodic(seed, a) + 1) / 2));
    let p = { x: center.x + r * Math.cos(deg(a)), y: center.y - r * Math.sin(deg(a)) };
    if (!pointInPolygon(p, region)) {
      let lo = 0;
      let hi = 1;
      for (let k = 0; k < 6; k++) {
        const mid = (lo + hi) / 2;
        const q = { x: center.x + (p.x - center.x) * mid, y: center.y + (p.y - center.y) * mid };
        if (pointInPolygon(q, region)) lo = mid;
        else hi = mid;
      }
      p = { x: center.x + (p.x - center.x) * lo * 0.97, y: center.y + (p.y - center.y) * lo * 0.97 };
    }
    out.push(p);
  }
  return out;
}

function massesFor(region: Region): LandcoverShape[] {
  const b = bounds(region.polygon);
  const out: LandcoverShape[] = [];
  const poiPoints = allPois.filter((p) => p.regionId === region.id);
  const mainRoads = roadGeometry.filter((r) => r.road.type === "main").map((r) => r.points);

  BIOME_MASSES[region.biome].forEach((spec, specIndex) => {
    const rng = makeRng(`${region.id}-mass-${spec.type}-${specIndex}`);
    let placed = 0;
    let attempts = 0;
    while (placed < spec.count && attempts < spec.count * 60) {
      attempts++;
      const center = { x: b.minX + rng() * b.width, y: b.minY + rng() * b.height };
      if (!pointInPolygon(center, region.polygon)) continue;
      const radius = (spec.radius[0] + rng() * (spec.radius[1] - spec.radius[0])) * S;
      // Assentamento não fica dentro de mata fechada, e a estrada real não
      // atravessa o meio de um bosque.
      if (poiPoints.some((p) => dist(center, p) < radius * 0.8 + 40 * S)) continue;
      if (spec.type === "forest" && mainRoads.some((l) => distanceToPolyline(center, l) < radius * 0.55))
        continue;
      out.push({
        id: `${region.id}-${spec.type}-${placed}`,
        type: spec.type,
        regionId: region.id,
        polygon: blob(center, radius, `${region.id}-${spec.type}-${placed}`, region.polygon),
      });
      placed++;
    }
  });
  return out;
}

export const landcoverShapes: LandcoverShape[] = regions.flatMap(massesFor);

/** Índice por tipo, para o espalhamento de cenário consultar rápido. */
const byType = new Map<LandcoverType, LandcoverShape[]>();
for (const s of landcoverShapes) {
  const list = byType.get(s.type);
  if (list) list.push(s);
  else byType.set(s.type, [s]);
}

export function insideLandcover(p: Point, type: LandcoverType): boolean {
  for (const s of byType.get(type) ?? []) if (pointInPolygon(p, s.polygon)) return true;
  return false;
}
