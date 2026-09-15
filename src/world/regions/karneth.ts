import { SECTOR_INDEX, outerRegionPolygon } from "../layout";
import type { Region } from "../types";
import { makePois, makeRoads, makeSettlements } from "./_authoring";

const ID = "karneth" as const;
const HOUSE = "house_karneth" as const;

/** Marchas de Karneth — fronteira militar semiárida a leste. */
export const karneth: Region = {
  id: ID,
  name: "Marchas de Karneth",
  houseId: HOUSE,
  biome: "steppe_march",
  polygon: outerRegionPolygon(SECTOR_INDEX.karneth),
  adjacentRegions: ["heart_of_valdoria", "greystone", "sacred_vale"],
  palette: {
    land: "#cbab84",
    landDebug: "#c07d55",
    accent: "#8a5a3a",
    forest: "#6a6d42",
    rock: "#9c7a5c",
  },
  economy: {
    produces: { horses: 80, weapons: 85, armor: 70 },
    consumes: { food: 95, iron: 90, grain: 70, wood: 40 },
    tradeActivity: 0.35,
  },
  seatPoiId: "castelo_karneth",
  riverIds: [],
  borderCrossingIds: ["bc_vau_de_karneth", "bc_passagem_do_norte", "bc_passo_da_vigilia"],
  pointsOfInterest: makePois(ID, HOUSE, "ring", [
    { id: "castelo_karneth", name: "Castelo Karneth", type: "castle", assetKey: "castle_medium", tier: 1, a: 30, t: 0.52, scale: 1.15 },
    { id: "castelo_da_marcha", name: "Castelo da Marcha", type: "castle", assetKey: "castle_medium", tier: 2, a: 48, t: 0.76, scale: 0.95, description: "Fortaleza avançada de Karneth; daqui se vê o Portão Rubro e a estrada da guerra." },
    { id: "baradra", name: "Baradra", type: "city", assetKey: "city_large", tier: 1, a: 20, t: 0.37 },
    { id: "portao_rubro", name: "Portão Rubro", type: "gate", assetKey: "gate", tier: 2, a: 43, t: 0.62 },
    { id: "vigilia", name: "Vigília", type: "watchtower", assetKey: "watchtower", tier: 3, a: 8, t: 0.68 },
    { id: "trincheira", name: "Trincheira", type: "warcamp", assetKey: "warcamp", tier: 3, a: 34, t: 0.78 },
    { id: "campo_de_treinamento", name: "Campo de Treinamento", type: "warcamp", assetKey: "training_ground", tier: 3, a: 23, t: 0.6 },
    { id: "forte_avancado", name: "Forte Avançado", type: "fort", assetKey: "fort", tier: 2, a: 7, t: 0.22 },
  ]),
  settlements: makeSettlements(ID, [
    ["s_kar_lanca", "Lança Quebrada", "village", 340, "baradra"],
    ["s_kar_poeira", "Poeira Vermelha", "hamlet", 160, "trincheira"],
    ["s_kar_estacada", "Estacada", "outpost", 90, "vigilia"],
    ["s_kar_cavalar", "Curral de Karneth", "farm", 280, "campo_de_treinamento"],
    ["s_kar_cinzas", "Aldeia das Cinzas", "hamlet", 120, "portao_rubro"],
    ["s_kar_marco", "Marco de Ferro", "outpost", 70, "forte_avancado"],
  ]),
  junctions: [],
  roads: makeRoads(ID, [
    { id: "road_kar_portao", name: "Estrada do Portão Rubro", type: "secondary", nodes: ["castelo_karneth", "portao_rubro", "castelo_da_marcha"], terrain: "hill", danger: 0.25, movementModifier: 1.2 },
    { id: "road_kar_trincheira", name: "Trilha da Trincheira", type: "trail", nodes: ["castelo_karneth", "trincheira", "castelo_da_marcha"], terrain: "hill", danger: 0.4, movementModifier: 1.5, windiness: 1.2 },
    { id: "road_kar_treino", name: "Via Militar de Baradra", type: "secondary", nodes: ["baradra", "campo_de_treinamento", "vigilia"], terrain: "plain", danger: 0.22, movementModifier: 1.1 },
  ]),
};
