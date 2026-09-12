import { SECTOR_INDEX, outerRegionPolygon } from "../layout";
import type { Region } from "../types";
import { makePois, makeRoads, makeSettlements } from "./_authoring";

const ID = "greystone" as const;
const HOUSE = "house_dravenor" as const;

/** Passo de Pedra Cinza — cadeia alpina e mineral ao norte. Poucas rotas. */
export const greystone: Region = {
  id: ID,
  name: "Passo de Pedra Cinza",
  houseId: HOUSE,
  biome: "alpine",
  polygon: outerRegionPolygon(SECTOR_INDEX.greystone),
  adjacentRegions: ["heart_of_valdoria", "elmwood", "karneth"],
  palette: {
    land: "#c2bdb2",
    landDebug: "#9aa3ad",
    accent: "#6d6a66",
    forest: "#4d5d48",
    rock: "#78767a",
  },
  economy: {
    produces: { iron: 100, stone: 95, ore: 85, weapons: 30, tools: 40 },
    consumes: { food: 90, grain: 70, wood: 55, wine: 20 },
    tradeActivity: 0.45,
  },
  seatPoiId: "fortaleza_pedra_cinza",
  riverIds: ["rio_serpente", "ribeira_de_ferro"],
  borderCrossingIds: ["bc_portao_de_pedra", "bc_trilha_das_faias", "bc_passagem_do_norte"],
  pointsOfInterest: makePois(ID, HOUSE, "ring", [
    { id: "fortaleza_pedra_cinza", name: "Fortaleza de Pedra Cinza", type: "fortress", assetKey: "fortress", tier: 1, a: 91, t: 0.46, scale: 1.2 },
    { id: "pedra_alta", name: "Pedra Alta", type: "city", assetKey: "city_large", tier: 1, a: 79, t: 0.34 },
    { id: "mina_negra", name: "Mina Negra", type: "mine", assetKey: "mine", tier: 2, a: 99, t: 0.66 },
    { id: "cruz_de_ferro", name: "Cruz de Ferro", type: "town", assetKey: "city_small", tier: 2, a: 85, t: 0.18 },
    { id: "grande_pedreira", name: "Grande Pedreira", type: "quarry", assetKey: "quarry", tier: 2, a: 67, t: 0.52 },
    { id: "fundicao_dravenor", name: "Fundição Dravenor", type: "foundry", assetKey: "foundry", tier: 2, a: 73, t: 0.3 },
    { id: "passagem_do_norte", name: "Passagem do Norte", type: "pass", assetKey: "mountain_pass", tier: 3, a: 101, t: 0.84 },
  ]),
  settlements: makeSettlements(ID, [
    ["s_grey_martelo", "Vale do Martelo", "village", 430, "fundicao_dravenor"],
    ["s_grey_corvo", "Ninho do Corvo", "hamlet", 150, "passagem_do_norte"],
    ["s_grey_veio", "Veio Fundo", "small_mine", 230, "mina_negra"],
    ["s_grey_lasca", "Lasca", "hamlet", 110, "grande_pedreira"],
    ["s_grey_portela", "Portela Cinzenta", "village", 360, "pedra_alta"],
  ]),
  junctions: [],
  roads: makeRoads(ID, [
    { id: "road_grey_mina", name: "Estrada da Mina Negra", type: "secondary", nodes: ["fortaleza_pedra_cinza", "mina_negra"], terrain: "mountain", danger: 0.18, movementModifier: 1.5 },
    { id: "road_grey_passagem", name: "Trilha da Passagem", type: "trail", nodes: ["mina_negra", "passagem_do_norte"], terrain: "mountain", danger: 0.3, movementModifier: 1.9, windiness: 1.4 },
    { id: "road_grey_pedreira", name: "Estrada da Pedreira", type: "secondary", nodes: ["pedra_alta", "grande_pedreira"], terrain: "mountain", danger: 0.14, movementModifier: 1.45 },
  ]),
};
