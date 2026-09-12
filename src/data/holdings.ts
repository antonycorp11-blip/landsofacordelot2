/**
 * AS ESTRUTURAS COMO POSSES POLÍTICAS.
 *
 * Cada ponto do mapa tem um dono. Este módulo é a camada política por cima da
 * geografia: não repete posição nem arte, só diz quem possui, quem controla,
 * quem governa no lugar e como o lugar vai.
 *
 * DONO e CONTROLADOR são campos distintos de propósito. Hoje coincidem em
 * tudo; quando Karneth ocupar militarmente uma vila de Elmwood, o dono
 * continua Elmwood e o controlador passa a ser Karneth — e o mapa, o brasão e
 * as ações do painel acompanham sem que nada mais mude.
 *
 * Os números são plausíveis, não simulados: não existe economia ainda. O que
 * importa agora é que TODA estrutura tenha um registro, então o que não está
 * escrito à mão é derivado do tipo e do id, de forma estável.
 */
import { makeRng } from "../world/geo";
import { allPois, regionById } from "../world/valdoria";
import { controllerOf } from "./territories";
import { player } from "./player";
import type { HouseId, MapObjectType, PointOfInterest } from "../world/types";

/** Categoria do painel: decide QUAIS números aparecem. */
export type HoldingKind =
  | "castle" | "city" | "town" | "village" | "market" | "mine"
  | "port" | "temple" | "military" | "estate" | "site";

const KIND_BY_TYPE: Partial<Record<MapObjectType, HoldingKind>> = {
  castle: "castle", fortress: "castle",
  city: "city", town: "town", village: "village",
  market: "market",
  mine: "mine", quarry: "mine", foundry: "mine", sawmill: "mine",
  port: "port", shipyard: "port", lighthouse: "port",
  temple: "temple", cathedral: "temple", monastery: "temple", shrine: "temple", grove: "temple",
  watchtower: "military", gate: "military", fort: "military", warcamp: "military", outpost: "military",
  farm: "estate", mill: "estate", stud_farm: "estate", inn: "estate",
};

export function holdingKind(poi: PointOfInterest): HoldingKind {
  return KIND_BY_TYPE[poi.type] ?? "site";
}

export type Holding = {
  poiId: string;
  kind: HoldingKind;
  /** Quem é o dono de direito. */
  ownerHouseId: HouseId;
  /** Quem manda de fato. Diferente do dono numa ocupação. */
  controllerHouseId: HouseId;
  /** Governante do lugar; pode não ser o líder da Casa. */
  localLordId?: string;
  prosperity: number;
  security: number;
  loyalty: number;
  population: number;
  defense: number;
  /** 0–100, quanto o jogador pesa NESTE lugar. */
  playerLocalInfluence: number;
  /* Específicos, preenchidos conforme a categoria. */
  garrison?: number;
  fortification?: number;
  food?: number;
  trade?: number;
  wealth?: number;
  goods?: string[];
  ore?: string;
  output?: number;
  workers?: number;
  fishing?: number;
  seaTraffic?: number;
  faith?: string;
  followers?: number;
  religiousInfluence?: number;
  /** Quem mora aqui. Quem ESTÁ aqui sai de `charactersAt`, que muda com o tempo. */
  residentCharacterIds?: string[];
};

/**
 * Ajustes à mão.
 *
 * Só os lugares que já têm peso narrativo. O resto é derivado — escrever
 * noventa fichas agora seria inventar números que a economia vai reescrever.
 */
type Override = Partial<Omit<Holding, "poiId" | "kind">>;

const OVERRIDES: Record<string, Override> = {
  castelo_real: {
    prosperity: 92, security: 90, loyalty: 88, defense: 95, population: 4200,
    garrison: 1800, fortification: 95, food: 88, playerLocalInfluence: 4,
    residentCharacterIds: ["aldren_valdoria"],
  },
  cidade_alta: { prosperity: 86, security: 78, loyalty: 80, population: 18400, trade: 88, playerLocalInfluence: 6 },
  mercado_da_coroa: { prosperity: 90, security: 72, trade: 95, wealth: 88, goods: ["tecidos", "especiarias", "ourivesaria"] },
  conselho_real: { prosperity: 74, security: 84, loyalty: 70, residentCharacterIds: ["vaelor_morvath"], ownerHouseId: "house_morvath" },
  pouso_dos_mercadores: { prosperity: 62, security: 58, residentCharacterIds: ["ilyra_veyr"], ownerHouseId: "house_veyr" },

  castelo_karneth: {
    prosperity: 48, security: 74, loyalty: 91, defense: 88, population: 2600,
    garrison: 2400, fortification: 86, food: 52, playerLocalInfluence: 0,
    residentCharacterIds: ["garrick_karneth"],
  },
  castelo_de_aurimar: {
    prosperity: 84, security: 70, loyalty: 76, defense: 64, population: 3100,
    garrison: 700, fortification: 66, food: 74, residentCharacterIds: ["seraphine_aurenna"],
  },
  castelo_verde: {
    prosperity: 71, security: 76, loyalty: 84, defense: 70, population: 2200,
    garrison: 800, fortification: 72, food: 80, residentCharacterIds: ["edran_silvarden"],
  },
  fortaleza_pedra_cinza: {
    prosperity: 55, security: 82, loyalty: 86, defense: 93, population: 1900,
    garrison: 2100, fortification: 94, food: 44, residentCharacterIds: ["boran_dravenor"],
  },
  castelo_de_campo_alto: {
    prosperity: 78, security: 68, loyalty: 79, defense: 58, population: 2400,
    garrison: 520, fortification: 60, food: 96, residentCharacterIds: ["tomas_elmwood"],
  },
  luminaria: {
    prosperity: 76, security: 72, loyalty: 88, defense: 54, population: 5200,
    residentCharacterIds: ["cassian_caelmont"],
  },
  catedral_de_luminaria: {
    prosperity: 70, security: 66, loyalty: 94,
    faith: "Culto da Luz", followers: 42000, religiousInfluence: 96,
    residentCharacterIds: ["yseld_caelmont"],
  },
  grande_porto: { prosperity: 88, security: 64, trade: 92, wealth: 84, fishing: 70, seaTraffic: 90, population: 9400 },
  mercado_de_graos: {
    prosperity: 80, security: 62, trade: 84, wealth: 72, goods: ["trigo", "cavalos", "cerveja"],
    ownerHouseId: "house_rosethorne", residentCharacterIds: ["edric_rosethorne"],
  },
  mina_negra: { prosperity: 58, security: 54, ore: "ferro", output: 78, workers: 1400 },

  /*
   * Casas sem senhorio próprio.
   *
   * São propositalmente estruturas DENTRO do domínio alheio: é o caso que
   * prova que Casa e região são coisas separadas. O controlador continua
   * sendo a Casa que manda na região — quem muda aqui é só o DONO.
   */
  grande_pedreira: { ownerHouseId: "house_morvath", prosperity: 52, security: 48, ore: "pedra", output: 66, workers: 620 },
  ruinas_antigas: { ownerHouseId: "house_rosethorne", prosperity: 28, security: 34, loyalty: 44 },
};

/* --------------------------- valores derivados -------------------------- */

/** Faixas plausíveis por categoria: [prosperidade, segurança, lealdade, defesa]. */
const BASE: Record<HoldingKind, [number, number, number, number]> = {
  castle:   [62, 78, 82, 84],
  city:     [74, 66, 70, 52],
  town:     [62, 60, 68, 38],
  village:  [48, 52, 70, 18],
  market:   [78, 58, 62, 14],
  mine:     [56, 50, 58, 20],
  port:     [76, 60, 64, 30],
  temple:   [60, 64, 84, 22],
  military: [34, 78, 80, 66],
  estate:   [52, 54, 72, 12],
  site:     [30, 40, 50, 8],
};

const POP: Record<HoldingKind, number> = {
  castle: 2200, city: 12000, town: 3800, village: 900, market: 1500,
  mine: 700, port: 5200, temple: 600, military: 260, estate: 340, site: 0,
};

function derive(poi: PointOfInterest): Holding {
  const kind = holdingKind(poi);
  const rng = makeRng(`holding-${poi.id}`);
  const jitter = (base: number, spread = 14) =>
    Math.max(0, Math.min(100, Math.round(base + (rng() - 0.5) * spread * 2)));
  const [prosperity, security, loyalty, defense] = BASE[kind];
  // POIs de tier 1 são os grandes: pesam mais em tudo.
  const weight = poi.tier === 1 ? 1.35 : poi.tier === 2 ? 1 : 0.65;
  const owner = regionById.get(poi.regionId)?.houseId ?? "house_valdoria";

  const holding: Holding = {
    poiId: poi.id,
    kind,
    ownerHouseId: poi.ownerHouseId ?? owner,
    controllerHouseId: controllerOf(poi.regionId),
    prosperity: jitter(prosperity),
    security: jitter(security),
    loyalty: jitter(loyalty),
    defense: jitter(defense, 10),
    population: Math.round(POP[kind] * weight * (0.7 + rng() * 0.6)),
    playerLocalInfluence: Math.round(rng() * 9),
  };

  if (kind === "castle") {
    holding.garrison = Math.round(holding.population * (0.25 + rng() * 0.4));
    holding.fortification = jitter(defense, 8);
    holding.food = jitter(66);
  }
  if (kind === "city" || kind === "town" || kind === "market" || kind === "port") {
    holding.trade = jitter(prosperity, 12);
    holding.wealth = jitter(prosperity - 6, 12);
  }
  if (kind === "market") holding.goods = ["grãos", "ferramentas", "tecidos"];
  if (kind === "port") {
    holding.fishing = jitter(60);
    holding.seaTraffic = jitter(68);
  }
  if (kind === "mine") {
    holding.ore = poi.type === "quarry" ? "pedra" : poi.type === "sawmill" ? "madeira" : "ferro";
    holding.output = jitter(64);
    holding.workers = Math.round(300 + rng() * 900);
  }
  if (kind === "temple") {
    holding.faith = "Culto da Luz";
    holding.followers = Math.round(2000 + rng() * 16000);
    holding.religiousInfluence = jitter(62);
  }
  if (kind === "military") holding.garrison = Math.round(60 + rng() * 340);
  if (kind === "village" || kind === "estate") holding.output = jitter(58);

  return holding;
}

const cache = new Map<string, Holding>();

/**
 * Ficha política de uma estrutura.
 *
 * O controlador é lido do território a cada chamada — conquistar uma região
 * troca o controlador de tudo que está dentro dela sem reescrever nada aqui.
 */
export function holdingFor(poi: PointOfInterest): Holding {
  let base = cache.get(poi.id);
  if (!base) {
    base = { ...derive(poi), ...OVERRIDES[poi.id] };
    cache.set(poi.id, base);
  }
  return {
    ...base,
    controllerHouseId: controllerOf(poi.regionId),
    playerLocalInfluence: player.localInfluence[poi.id] ?? base.playerLocalInfluence,
  };
}

/** Estruturas que pertencem a esta Casa, onde quer que estejam. */
export function holdingsOwnedBy(houseId: HouseId): PointOfInterest[] {
  return allPois.filter((p) => holdingFor(p).ownerHouseId === houseId);
}

export const KIND_LABEL: Record<HoldingKind, string> = {
  castle: "Castelo", city: "Cidade", town: "Vila", village: "Aldeia",
  market: "Mercado", mine: "Mina", port: "Porto", temple: "Templo",
  military: "Posto militar", estate: "Propriedade", site: "Local",
};
