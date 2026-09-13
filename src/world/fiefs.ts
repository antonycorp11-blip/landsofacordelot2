/**
 * SENHORIOS.
 *
 * A divisão que importa para a posse da terra. Cada uma das sete REGIÕES é
 * repartida em cinco senhorios, e é o senhorio — não a região — que tem dono,
 * lorde, renda e preço. Dá para comprar um, herdar, tomar à força ou receber
 * de presente sem que a região inteira mude de mãos.
 *
 * As Casas maiores ficam com os senhorios NOBRES do próprio domínio; os
 * MENORES vão para Morvath, Veyr, Rosethorne e para vizinhos — que é como uma
 * Casa acaba com terra dentro da região de outra. É o caso que o sistema
 * político já previa e que só agora tem geografia.
 *
 * COMO A DIVISA NASCE
 *
 * Cada senhorio tem uma sede, e a divisa é o Voronoi dessas sedes recortado no
 * polígono da região: por construção não há buraco nem sobreposição, e nenhum
 * senhorio escapa da sua região. Voronoi puro, porém, dá linha reta — e este
 * mapa não é um tabuleiro. Então cada divisa INTERNA é reamostrada e deslocada
 * por um campo de ruído que depende só da POSIÇÃO: os dois vizinhos calculam
 * exatamente o mesmo deslocamento para o mesmo ponto, e a divisa continua
 * fechada dos dois lados. Pontos encostados na borda da região não se mexem —
 * essa fronteira é da região, não do senhorio.
 */
import { distanceToPolyline, hashSeed, makeRng, pointInPolygon } from "./geo";
import { heartPoint, ringPoint, WORLD_SCALE as S } from "./layout";
import { regions } from "./valdoria";
import type { HouseId, MapObjectType, Point, RegionId } from "./types";

export type FiefTier = "nobre" | "menor";

export type Fief = {
  id: string;
  name: string;
  regionId: RegionId;
  tier: FiefTier;
  /** Sede: o castelo, forte ou solar que manda no senhorio. */
  seatName: string;
  seatType: MapObjectType;
  seatAssetKey: string;
  seat: Point;
  polygon: Point[];
  /** Dono inicial. O dono CORRENTE vive em `data/fiefOwners.ts`. */
  ownerHouseId: HouseId;
  lordId: string;
  population: number;
  /** Moedas por dia que a terra rende ao dono. */
  income: number;
  /** Quanto custa comprar, quando o dono aceita vender. */
  value: number;
  defense: number;
};

/* ------------------------------------------------------------------ */
/* Autoria                                                             */
/* ------------------------------------------------------------------ */

type Placement = "heart" | "ring";
/** [id, nome, sede, tipo, chave de arte, nobre?, ângulo, t, Casa dona] */
type Spec = [string, string, string, MapObjectType, string, FiefTier, number, number, HouseId];

const SPECS: { region: RegionId; kind: Placement; fiefs: Spec[] }[] = [
  {
    region: "heart_of_valdoria",
    kind: "heart",
    fiefs: [
      ["f_coroa",        "Terras da Coroa",   "Solar da Coroa",       "castle",     "castle_medium", "nobre", 100, 0.22, "house_valdoria"],
      ["f_ponte_velha",  "Ponte Velha",       "Torre da Ponte",       "watchtower", "watchtower",    "menor", 168, 0.5,  "house_valdoria"],
      ["f_carvalhal",    "Carvalhal",         "Casa de Carvalhal",    "village",    "village",       "menor", -50, 0.52, "house_rosethorne"],
      ["f_pedra_branca", "Pedra Branca",      "Forte de Pedra Branca","fort",       "fort",          "menor",  40, 0.62, "house_morvath"],
      ["f_ribeira",      "Ribeira dos Salgueiros", "Solar da Ribeira","village",    "village",       "menor", -140, 0.58, "house_veyr"],
    ],
  },
  {
    region: "elmwood",
    kind: "ring",
    fiefs: [
      ["f_verde",        "Bosque Alto",       "Castelo Verde",        "castle",     "castle_medium", "nobre", 148, 0.5,  "house_silvarden"],
      ["f_folhaterra",   "Folhaterra",        "Solar de Folhaterra",  "village",    "village",       "nobre", 131, 0.44, "house_silvarden"],
      ["f_pinheiral",    "Pinheiral",         "Torre do Pinheiral",   "watchtower", "watchtower",    "menor", 163, 0.72, "house_silvarden"],
      ["f_ervanaria",    "Ervanária",         "Casa das Ervas",       "village",    "village",       "menor", 124, 0.76, "house_caelmont"],
      ["f_texugo",       "Toca do Texugo",    "Forte do Texugo",      "fort",       "fort",          "menor", 157, 0.3,  "house_veyr"],
    ],
  },
  {
    region: "greystone",
    kind: "ring",
    fiefs: [
      ["f_pedra_cinza",  "Alto do Passo",     "Fortaleza de Pedra Cinza", "fortress", "fortress",    "nobre",  88, 0.44, "house_dravenor"],
      ["f_cruz_ferro",   "Cruz de Ferro",     "Solar de Cruz de Ferro",   "castle",   "castle_medium","nobre",  75, 0.32, "house_dravenor"],
      ["f_veio_fundo",   "Veio Fundo",        "Casa do Veio",             "village",  "village",     "menor",  97, 0.68, "house_dravenor"],
      ["f_portela",      "Portela Cinzenta",  "Forte da Portela",         "fort",     "fort",        "menor", 101, 0.3,  "house_morvath"],
      ["f_ninho_corvo",  "Ninho do Corvo",    "Torre do Corvo",           "watchtower","watchtower",  "menor",  68, 0.74, "house_karneth"],
    ],
  },
  {
    region: "karneth",
    kind: "ring",
    fiefs: [
      ["f_karneth",      "Marcha Alta",       "Castelo Karneth",      "castle",     "castle_medium", "nobre",  28, 0.5,  "house_karneth"],
      ["f_baradra",      "Baradra",           "Solar de Baradra",     "castle",     "castle_medium", "nobre",  18, 0.36, "house_karneth"],
      ["f_estacada",     "Estacada",          "Forte da Estacada",    "fort",       "fort",          "menor",  41, 0.7,  "house_karneth"],
      ["f_lanca",        "Lança Quebrada",    "Casa da Lança",        "village",    "village",       "menor",   9, 0.62, "house_dravenor"],
      ["f_marco_ferro",  "Marco de Ferro",    "Torre do Marco",       "watchtower", "watchtower",    "menor",  35, 0.24, "house_morvath"],
    ],
  },
  {
    region: "sacred_vale",
    kind: "ring",
    fiefs: [
      ["f_luminaria",    "Vale de Luminária", "Paço de Luminária",    "castle",     "castle_medium", "nobre", -30, 0.44, "house_caelmont"],
      ["f_oliveiras",    "Oliveiras",         "Solar das Oliveiras",  "village",    "village",       "nobre", -19, 0.58, "house_caelmont"],
      ["f_fonte_clara",  "Fonte Clara",       "Casa da Fonte",        "village",    "village",       "menor", -44, 0.7,  "house_caelmont"],
      ["f_vinha_alta",   "Vinha Alta",        "Solar da Vinha",       "village",    "village",       "menor", -13, 0.28, "house_rosethorne"],
      ["f_romaria",      "Romaria",           "Albergue de Romaria",  "inn",        "inn",           "menor", -47, 0.3,  "house_veyr"],
    ],
  },
  {
    region: "golden_coast",
    kind: "ring",
    fiefs: [
      ["f_aurimar",      "Aurimar",           "Castelo de Aurimar",   "castle",     "castle_medium", "nobre", -88, 0.5,  "house_aurenna"],
      ["f_mare_alta",    "Maré Alta",         "Solar de Maré Alta",   "castle",     "castle_medium", "nobre", -76, 0.42, "house_aurenna"],
      ["f_salinas",      "Salinas",           "Casa das Salinas",     "village",    "village",       "menor", -103, 0.66, "house_aurenna"],
      ["f_penedo",       "Penedo",            "Forte do Penedo",      "fort",       "fort",          "menor", -110, 0.34, "house_morvath"],
      ["f_ancora",       "Âncora Velha",      "Solar da Âncora",      "village",    "village",       "menor", -69, 0.74, "house_rosethorne"],
    ],
  },
  {
    region: "greenfields",
    kind: "ring",
    fiefs: [
      ["f_campo_alto",   "Campo Alto",        "Castelo de Campo Alto","castle",     "castle_medium", "nobre", -148, 0.48, "house_elmwood"],
      ["f_seara",        "Seara",             "Solar da Seara",       "village",    "village",       "nobre", -136, 0.34, "house_elmwood"],
      ["f_potreiro",     "Potreiro",          "Casa do Potreiro",     "village",    "village",       "menor", -166, 0.6,  "house_elmwood"],
      ["f_azenha",       "Azenha",            "Moinho da Azenha",     "mill",       "mill",          "menor", -129, 0.66, "house_rosethorne"],
      ["f_vento_alto",   "Vento Alto",        "Torre de Vento Alto",  "watchtower", "watchtower",    "menor", -170, 0.3,  "house_veyr"],
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Geometria                                                           */
/* ------------------------------------------------------------------ */

/** Recorta um polígono pelo semiplano mais perto de `a` que de `b`. */
function clipHalfPlane(poly: Point[], a: Point, b: Point): Point[] {
  // Mediatriz de a→b: mantém quem tem produto escalar menor que o limite.
  const nx = b.x - a.x;
  const ny = b.y - a.y;
  const limit = (nx * (a.x + b.x) + ny * (a.y + b.y)) / 2;
  const side = (p: Point) => nx * p.x + ny * p.y - limit;

  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp <= 0) out.push(p);
    if (sp * sq < 0) {
      const t = sp / (sp - sq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}

/** Ruído 2D estável: mesma posição, mesmo valor, em qualquer lado da divisa. */
function noise2(x: number, y: number, salt: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const at = (ix: number, iy: number) => (hashSeed(`${ix}:${iy}:${salt}`) % 10000) / 10000;
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(xf);
  const v = s(yf);
  const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * u;
  const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * u;
  return (a + (b - a) * v) * 2 - 1;
}

/** Amplitude do serrilhado das divisas internas. */
const WOBBLE = 26 * S;
const WOBBLE_SCALE = 260 * S;
/** Passo de reamostragem: quanto menor, mais sinuosa a divisa. */
const STEP = 85 * S;
/** Perto da borda da região a divisa não se mexe — ela é da região. */
const EDGE_GUARD = WOBBLE * 1.8;

/** Arredonda para que os dois vizinhos vejam exatamente o mesmo ponto. */
const snap = (v: number) => Math.round(v * 100) / 100;

function displace(p: Point, region: Point[]): Point {
  if (distanceToPolyline(p, region) < EDGE_GUARD) return p;
  const dx = noise2(p.x / WOBBLE_SCALE, p.y / WOBBLE_SCALE, 1) * WOBBLE;
  const dy = noise2(p.x / WOBBLE_SCALE, p.y / WOBBLE_SCALE, 2) * WOBBLE;
  const moved = { x: p.x + dx, y: p.y + dy };
  // Nunca para fora da região: o senhorio vive dentro dela.
  return pointInPolygon(moved, region) ? moved : p;
}

/**
 * Reamostra e ondula cada aresta.
 *
 * A ordem canônica é o truque: os dois senhorios que dividem uma aresta a
 * percorrem do mesmo extremo, com os mesmos passos, e portanto produzem a
 * mesma polilinha. Sem isso, cada lado ondularia para o seu lado e apareceria
 * uma fresta entre eles.
 */
function organic(poly: Point[], region: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.round(len / STEP));

    const forward = snap(a.x) < snap(b.x) || (snap(a.x) === snap(b.x) && snap(a.y) <= snap(b.y));
    const from = forward ? a : b;
    const to = forward ? b : a;

    const samples: Point[] = [];
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      samples.push(displace({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, region));
    }
    if (!forward) samples.reverse();
    out.push(...samples);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Construção                                                          */
/* ------------------------------------------------------------------ */

/** Nomes de batismo para os lordes menores. O sobrenome vem da Casa. */
const GIVEN = [
  "Aldric", "Bevan", "Corwin", "Dareth", "Elric", "Fendrel", "Gareth", "Halden",
  "Ivor", "Joran", "Kestrel", "Lorne", "Maerwyn", "Nevin", "Orlin", "Perrin",
  "Quen", "Rowan", "Sabine", "Thalia", "Ulric", "Verity", "Wystan", "Yorick",
  "Isolde", "Brienne", "Cordelia", "Eirwen", "Faye", "Gisela", "Hedda", "Linnea",
  "Mirelle", "Norwen", "Ysolde",
];

function buildFiefs(): Fief[] {
  const out: Fief[] = [];

  for (const block of SPECS) {
    const region = regions.find((r) => r.id === block.region);
    if (!region) continue;

    const seats = block.fiefs.map(([, , , , , , a, t]) =>
      block.kind === "heart" ? heartPoint(a, t) : ringPoint(a, t),
    );

    block.fiefs.forEach((spec, i) => {
      const [id, name, seatName, seatType, seatAssetKey, tier, , , ownerHouseId] = spec;

      // Voronoi: recorta a região por todas as mediatrizes com as outras sedes.
      let cell = region.polygon;
      seats.forEach((other, j) => {
        if (j !== i) cell = clipHalfPlane(cell, seats[i], other);
      });

      const rng = makeRng(`fief-${id}`);
      const noble = tier === "nobre";
      const population = Math.round((noble ? 900 : 320) * (0.7 + rng() * 0.8));
      const income = Math.round((noble ? 14 : 5) * (0.75 + rng() * 0.6));
      const defense = Math.round((noble ? 58 : 24) + rng() * 22);

      out.push({
        id,
        name,
        regionId: region.id,
        tier,
        seatName,
        seatType,
        seatAssetKey,
        seat: seats[i],
        polygon: organic(cell, region.polygon),
        ownerHouseId,
        lordId: `lord_${id}`,
        population,
        income,
        // Preço: a renda de uns dois anos, mais o que a muralha vale.
        value: Math.round(income * 620 + defense * 34 + population * 1.6),
        defense,
      });
    });
  }

  return out;
}

export const fiefs: Fief[] = buildFiefs();
export const fiefById = new Map(fiefs.map((f) => [f.id, f]));

export function fiefsOfRegion(regionId: RegionId): Fief[] {
  return fiefs.filter((f) => f.regionId === regionId);
}

/** Em qual senhorio cai um ponto do mundo. */
export function fiefAt(p: Point): Fief | undefined {
  return fiefs.find((f) => pointInPolygon(p, f.polygon));
}

/** Nome do lorde de um senhorio, montado a partir da Casa dona inicial. */
export function lordNameFor(fief: Fief, houseSurname: string): string {
  const rng = makeRng(`lordname-${fief.id}`);
  const given = GIVEN[Math.floor(rng() * GIVEN.length)];
  const style = fief.tier === "nobre" ? "Lorde" : "Ser";
  return `${style} ${given} ${houseSurname}`;
}

export const TIER_LABEL: Record<FiefTier, string> = {
  nobre: "Senhorio nobre",
  menor: "Senhorio menor",
};
