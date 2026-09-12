/**
 * Esqueleto geométrico de Valdória.
 *
 * A massa territorial é construída uma única vez a partir de arcos e raios
 * COMPARTILHADOS. Cada fronteira existe como uma única polilinha, reutilizada
 * (invertida quando necessário) pelas duas regiões que a dividem — é isso que
 * garante, por construção, que não existam buracos nem sobreposições.
 *
 *        spoke[i+1]
 *   rim[i] ─────── rim[i+1]      ← fronteira externa do reino (rimArc[i])
 *     │   região externa i   │
 *   hub[i] ─────── hub[i+1]      ← fronteira com o Coração (innerArc[i])
 *                 \  Coração  /
 *
 * Todo o conteúdo (cidades, estradas, rios) é escrito em coordenadas polares
 * (ângulo, t) e convertido aqui — assim nada "vaza" para a região errada.
 */
import { deg, jaggedArc, jaggedLine, makeRng } from "./geo";
import { WORLD_SCALE } from "./scale";
import type { Point, RegionId } from "./types";

/** Reexportado por conveniência: quase todo módulo de mundo precisa da escala. */
export { WORLD_SCALE };

const S = WORLD_SCALE;

export const WORLD = { x: 0, y: 0, width: 2400 * S, height: 1600 * S };
export const CENTER: Point = { x: 1180 * S, y: 770 * S };

/** Elipse interna: fronteira do Coração de Valdória. */
export const INNER_RX = 335 * S;
export const INNER_RY = 255 * S;

/** Ângulos (graus, 0 = leste, 90 = norte) das 6 fronteiras radiais. */
export const SPOKE_ANGLES = [175, 110, 55, -5, -62, -118];

/** Ordem angular das regiões externas — define também o anel de adjacência. */
export const RING_ORDER: RegionId[] = [
  "elmwood", // 175 → 110   (noroeste/norte)
  "greystone", // 110 → 55    (norte)
  "karneth", // 55 → -5     (nordeste/leste)
  "sacred_vale", // -5 → -62   (sudeste)
  "golden_coast", // -62 → -118 (sul, litoral)
  "greenfields", // -118 → -185 (sudoeste)
];

export const SECTOR_INDEX: Record<string, number> = Object.fromEntries(
  RING_ORDER.map((id, i) => [id, i]),
);

/* ------------------------------------------------------------------ */
/* Raio externo — periódico, para a costa fechar sem emenda             */
/* ------------------------------------------------------------------ */

function periodicNoise(seed: string, angleDeg: number, harmonics = 4): number {
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

/** Raios da borda externa do reino em um dado ângulo. */
export function rimRadius(angleDeg: number): { rx: number; ry: number } {
  const rx = (985 + 105 * periodicNoise("valdoria-rim-x", angleDeg, 4)) * S;
  const ry = (655 + 80 * periodicNoise("valdoria-rim-y", angleDeg, 5)) * S;
  return { rx, ry };
}

function innerRadius(): { rx: number; ry: number } {
  return { rx: INNER_RX, ry: INNER_RY };
}

function onEllipse(angleDeg: number, rx: number, ry: number): Point {
  return {
    x: CENTER.x + rx * Math.cos(deg(angleDeg)),
    y: CENTER.y - ry * Math.sin(deg(angleDeg)),
  };
}

/* ------------------------------------------------------------------ */
/* Vértices compartilhados                                             */
/* ------------------------------------------------------------------ */

export const HUBS: Point[] = SPOKE_ANGLES.map((a) => onEllipse(a, INNER_RX, INNER_RY));
export const RIMS: Point[] = SPOKE_ANGLES.map((a) => {
  const r = rimRadius(a);
  return onEllipse(a, r.rx, r.ry);
});

const hub = (i: number) => HUBS[((i % 6) + 6) % 6];
const rim = (i: number) => RIMS[((i % 6) + 6) % 6];

function pinEnds(pts: Point[], a: Point, b: Point): Point[] {
  const out = pts.slice();
  out[0] = { ...a };
  out[out.length - 1] = { ...b };
  return out;
}

/** Fronteira interna do setor i (Coração ↔ região externa i). */
export const INNER_ARCS: Point[][] = RING_ORDER.map((id, i) => {
  const from = SPOKE_ANGLES[i];
  const to = i === 5 ? SPOKE_ANGLES[0] - 360 : SPOKE_ANGLES[i + 1];
  const arc = jaggedArc(CENTER, innerRadius, from, to, `inner-${id}`, 26, 26 * S);
  return pinEnds(arc, hub(i), hub(i + 1));
});

/** Fronteira radial i (entre a região externa i-1 e a região externa i). */
export const SPOKES: Point[][] = SPOKE_ANGLES.map((_, i) =>
  pinEnds(jaggedLine(hub(i), rim(i), `spoke-${i}`, 26, 46 * S), hub(i), rim(i)),
);

/** Fronteira externa do reino no setor i. A Costa Dourada recebe mais recortes. */
export const RIM_ARCS: Point[][] = RING_ORDER.map((id, i) => {
  const from = SPOKE_ANGLES[i];
  const to = i === 5 ? SPOKE_ANGLES[0] - 360 : SPOKE_ANGLES[i + 1];
  const coastal = id === "golden_coast";
  const arc = jaggedArc(
    CENTER,
    rimRadius,
    from,
    to,
    `rim-${id}`,
    coastal ? 52 : 36,
    coastal ? 62 * S : 40 * S,
  );
  return pinEnds(arc, rim(i), rim(i + 1));
});

const rev = (pts: Point[]) => pts.slice().reverse();

/** Polígono fechado de uma região externa, montado só com bordas compartilhadas. */
export function outerRegionPolygon(sector: number): Point[] {
  return [
    ...INNER_ARCS[sector],
    ...SPOKES[(sector + 1) % 6].slice(1),
    ...rev(RIM_ARCS[sector]).slice(1),
    ...rev(SPOKES[sector]).slice(1, -1),
  ];
}

/** Polígono do Coração: a união das seis fronteiras internas. */
export function heartPolygon(): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < 6; i++) out.push(...(i === 0 ? INNER_ARCS[i] : INNER_ARCS[i].slice(1)));
  return out.slice(0, -1);
}

/** Contorno externo do reino (fronteira forte). */
export function kingdomOutline(): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < 6; i++) out.push(...(i === 0 ? RIM_ARCS[i] : RIM_ARCS[i].slice(1)));
  return out.slice(0, -1);
}

/* ------------------------------------------------------------------ */
/* Helpers de autoria de conteúdo                                      */
/* ------------------------------------------------------------------ */

/** Ponto dentro do Coração: t = 0 no castelo central, t = 1 na fronteira. */
export function heartPoint(angleDeg: number, t: number): Point {
  return onEllipse(angleDeg, INNER_RX * t, INNER_RY * t);
}

/** Ponto dentro de uma região externa: t = 0 na fronteira interna, t = 1 na externa. */
export function ringPoint(angleDeg: number, t: number): Point {
  const r = rimRadius(angleDeg);
  return onEllipse(angleDeg, INNER_RX + (r.rx - INNER_RX) * t, INNER_RY + (r.ry - INNER_RY) * t);
}

/** Ponto sobre a fronteira interna do setor (usado por travessias). */
export function onInnerArc(sector: number, s: number): Point {
  const arc = INNER_ARCS[sector];
  const i = Math.round(Math.max(0, Math.min(1, s)) * (arc.length - 1));
  return { ...arc[i] };
}

/** Ponto sobre uma fronteira radial (usado por travessias entre regiões vizinhas). */
export function onSpoke(spokeIndex: number, s: number): Point {
  const line = SPOKES[((spokeIndex % 6) + 6) % 6];
  const i = Math.round(Math.max(0, Math.min(1, s)) * (line.length - 1));
  return { ...line[i] };
}

/** Polígono do mar: costa da Costa Dourada + o resto do sul do mundo. */
export function seaPolygon(): Point[] {
  const coast = RIM_ARCS[SECTOR_INDEX.golden_coast];
  const right = coast[0];
  const left = coast[coast.length - 1];
  return [
    ...coast,
    { x: -300 * S, y: left.y },
    { x: -300 * S, y: WORLD.height + 400 * S },
    { x: WORLD.width + 300 * S, y: WORLD.height + 400 * S },
    { x: WORLD.width + 300 * S, y: right.y },
  ];
}
