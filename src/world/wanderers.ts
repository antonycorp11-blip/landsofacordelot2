/**
 * GENTE NA ESTRADA.
 *
 * O reino não é só do jogador: patrulhas rondam os senhorios, mensageiros
 * cruzam o mapa inteiro, caravanas ligam os portos às feiras, peregrinos sobem
 * ao Vale Sagrado e bandos saqueadores rondam as Marchas de Karneth.
 *
 * Aqui está só a ESCALAÇÃO e a regra de para onde cada um vai a seguir. O
 * movimento é do `useWanderers`, e o desenho é do mesmo `MapAgentSprite` do
 * viajante — estes agentes usam exatamente a mesma malha de estradas e o mesmo
 * `findPath`, então nunca aparecem cortando mato nem atravessando rio.
 *
 * NADA disto entra na simulação: não há economia, combate nem encontro ainda.
 * É ambiente, e está deliberadamente isolado para que, quando cada um ganhar
 * mecânica própria, só esta lista precise mudar.
 */
import { makeRng } from "./geo";
import type { TroopCount } from "../data/troops";
import { adjacency } from "./navgraph";
import type { AgentSheetId } from "../render/agents/agentSheets";
import type { RegionId } from "./types";
import { borderCrossings } from "./borderCrossings";
import { allPois } from "./valdoria";

export type WandererRoutine =
  | "patrulha"
  | "comércio"
  | "correio"
  | "peregrinação"
  | "pilhagem"
  | "cortejo";

export type Wanderer = {
  id: string;
  name: string;
  sheet: AgentSheetId;
  routine: WandererRoutine;
  /** Onde a rotina começa e, para quem não perambula, onde ela fica. */
  home: RegionId;
  /** Perambula pelo reino inteiro; senão fica na região natal e nas vizinhas. */
  roams: boolean;
  /** Ritmo relativo ao do viajante. Carroça é lenta, mensageiro é rápido. */
  pace: number;
  /** Horas do mundo parado em cada destino: [mínimo, máximo]. */
  dwell: [number, number];
  /**
   * Quanta gente vai junto, como faixa [mínimo, máximo].
   *
   * O contingente é a leitura estratégica do mapa: olhar um sprite e saber se
   * ali vão dois mensageiros ou sessenta homens é o que permite decidir antes
   * de chegar perto. Cada agente sorteia o seu uma vez, com a semente do
   * próprio id, então o número é estável entre partidas.
   */
  band: [number, number];
  /** Mistura de tropa do bando. As frações somam 1. */
  mix: Partial<Record<keyof TroopCount, number>>;
};

export const wanderers: Wanderer[] = [
  // Patrulhas — ficam em casa, é essa a graça de uma patrulha.
  { id: "patrulha_coracao",   name: "Ronda do Castelo Real", sheet: "outriders",      routine: "patrulha",     home: "heart_of_valdoria", roams: false, pace: 1.0,  dwell: [3, 9],  band: [10, 22], mix: { cavaleiros: 0.35, infantaria: 0.45, arqueiros: 0.2 } },
  { id: "patrulha_elmwood",   name: "Guarda de Elmwood",     sheet: "patrol_footmen", routine: "patrulha",     home: "elmwood",           roams: false, pace: 0.55, dwell: [5, 14], band: [12, 26], mix: { milicianos: 0.5, arqueiros: 0.35, infantaria: 0.15 } },
  { id: "patrulha_greystone", name: "Ronda do Passo",        sheet: "patrol_footmen", routine: "patrulha",     home: "greystone",         roams: false, pace: 0.5,  dwell: [6, 16], band: [14, 28], mix: { infantaria: 0.55, milicianos: 0.3, arqueiros: 0.15 } },
  { id: "leva_karneth",       name: "Coluna de Karneth",     sheet: "levy_column",    routine: "patrulha",     home: "karneth",           roams: false, pace: 0.5,  dwell: [8, 20], band: [34, 72], mix: { infantaria: 0.5, milicianos: 0.28, arqueiros: 0.14, cavaleiros: 0.08 } },
  { id: "patrulha_campos",    name: "Milícia dos Campos",    sheet: "levy_column",    routine: "patrulha",     home: "greenfields",       roams: false, pace: 0.55, dwell: [6, 15], band: [20, 44], mix: { milicianos: 0.6, camponeses: 0.25, arqueiros: 0.15 } },

  // Comércio — é o que costura o reino, então anda longe.
  { id: "caravana_costa",     name: "Caravana da Costa",     sheet: "caravan_wagon",  routine: "comércio",     home: "golden_coast",      roams: true,  pace: 0.45, dwell: [10, 26], band: [6, 15], mix: { milicianos: 0.6, arqueiros: 0.4 } },
  { id: "caravana_campos",    name: "Comboio dos Campos",    sheet: "caravan_wagon",  routine: "comércio",     home: "greenfields",       roams: true,  pace: 0.45, dwell: [10, 26], band: [5, 13], mix: { milicianos: 0.7, arqueiros: 0.3 } },
  { id: "bufarinheiro_norte", name: "Bufarinheiro do Norte", sheet: "merchant_mule",  routine: "comércio",     home: "greystone",         roams: true,  pace: 0.4,  dwell: [8, 22], band: [2, 5], mix: { milicianos: 1 } },
  { id: "bufarinheiro_bosque",name: "Mascate de Elmwood",    sheet: "merchant_mule",  routine: "comércio",     home: "elmwood",           roams: true,  pace: 0.4,  dwell: [8, 22], band: [2, 5], mix: { milicianos: 1 } },

  // Correio — o mais rápido do mapa, e o que cruza tudo.
  { id: "correio_real",       name: "Correio Real",          sheet: "messenger",      routine: "correio",      home: "heart_of_valdoria", roams: true,  pace: 1.35, dwell: [2, 6],  band: [1, 2], mix: { cavaleiros: 1 } },
  { id: "correio_sul",        name: "Correio do Sul",        sheet: "messenger",      routine: "correio",      home: "golden_coast",      roams: true,  pace: 1.3,  dwell: [2, 7],  band: [1, 2], mix: { cavaleiros: 1 } },

  // Peregrinos — sobem ao Vale Sagrado e voltam, devagar.
  { id: "peregrinos_vale",    name: "Peregrinos do Vale",    sheet: "pilgrims",       routine: "peregrinação", home: "sacred_vale",       roams: true,  pace: 0.32, dwell: [14, 34], band: [5, 16], mix: { camponeses: 1 } },

  // Saqueadores — rondam as Marchas e as beiradas.
  { id: "bando_karneth",      name: "Bando das Marchas",     sheet: "raiders",        routine: "pilhagem",     home: "karneth",           roams: false, pace: 0.7,  dwell: [7, 18], band: [8, 25], mix: { camponeses: 0.45, milicianos: 0.4, arqueiros: 0.15 } },
  { id: "bando_pedra",        name: "Bando da Pedra Cinza",  sheet: "raiders",        routine: "pilhagem",     home: "greystone",         roams: false, pace: 0.7,  dwell: [7, 18], band: [6, 20], mix: { camponeses: 0.5, milicianos: 0.4, arqueiros: 0.1 } },

  // Nobreza — sai pouco, e quando sai é lento e visível.
  { id: "cortejo_real",       name: "Cortejo Real",          sheet: "royal_carriage", routine: "cortejo",      home: "heart_of_valdoria", roams: true,  pace: 0.5,  dwell: [16, 40], band: [18, 34], mix: { cavaleiros: 0.5, infantaria: 0.5 } },
  { id: "lorde_caelmont",     name: "Lorde de Caelmont",     sheet: "lord_rider",     routine: "cortejo",      home: "sacred_vale",       roams: true,  pace: 0.85, dwell: [12, 30], band: [12, 26], mix: { cavaleiros: 0.45, infantaria: 0.4, arqueiros: 0.15 } },
];

/* ------------------------------ destinos ------------------------------- */

/** POIs que são nós da malha — são os únicos lugares aonde se pode ir. */
const destinations = allPois.filter((p) => p.routeNode && adjacency.has(p.id));

const byRegion = new Map<RegionId, string[]>();
for (const poi of destinations) {
  const list = byRegion.get(poi.regionId) ?? [];
  list.push(poi.id);
  byRegion.set(poi.regionId, list);
}

/**
 * Regiões vizinhas, tiradas das travessias de fronteira que já existem.
 *
 * Assim a vizinhança acompanha sozinha qualquer mudança no mapa: abrir uma
 * passagem nova entre dois senhorios passa a valer aqui no mesmo instante,
 * sem lista paralela para esquecer de atualizar.
 */
const neighbours = new Map<RegionId, RegionId[]>();
for (const crossing of borderCrossings) {
  const [a, b] = crossing.connects;
  for (const [from, to] of [[a, b], [b, a]] as const) {
    const list = neighbours.get(from) ?? [];
    if (!list.includes(to)) list.push(to);
    neighbours.set(from, list);
  }
}

export function regionNeighbours(region: RegionId): RegionId[] {
  return neighbours.get(region) ?? [];
}

/** Lugares aonde este agente aceita ir. */
export function destinationsFor(w: Wanderer): string[] {
  if (w.roams) return destinations.map((p) => p.id);
  const regions = [w.home, ...regionNeighbours(w.home)];
  return regions.flatMap((r) => byRegion.get(r) ?? []);
}

/** Próximo destino, sempre diferente de onde o agente está. */
export function nextDestination(w: Wanderer, from: string, rng: () => number): string | null {
  const pool = destinationsFor(w).filter((id) => id !== from);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/** Onde cada agente começa a vida. */
export function startNode(w: Wanderer, rng: () => number): string | null {
  const pool = byRegion.get(w.home) ?? destinationsFor(w);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/** Sorteio determinístico por agente — o reino nasce sempre igual. */
export function rngFor(w: Wanderer) {
  return makeRng(`wanderer-${w.id}`);
}

/**
 * O contingente de um agente, montado uma vez e guardado.
 *
 * Usa a MESMA forma de contagem por tipo do grupo do jogador — é o que vai
 * permitir, quando existir combate, comparar os dois lados sem tradução.
 */
const partyCache = new Map<string, TroopCount>();

export function partyOf(w: Wanderer): TroopCount {
  const cached = partyCache.get(w.id);
  if (cached) return cached;

  const rng = makeRng(`party-${w.id}`);
  const [lo, hi] = w.band;
  const total = Math.round(lo + rng() * (hi - lo));
  const out: TroopCount = {};
  let left = total;
  const entries = Object.entries(w.mix) as [keyof TroopCount, number][];
  entries.forEach(([id, share], i) => {
    const n = i === entries.length - 1 ? left : Math.round(total * share);
    if (n > 0) out[id] = n;
    left -= n;
  });
  partyCache.set(w.id, out);
  return out;
}
