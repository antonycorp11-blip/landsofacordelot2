import { SECTOR_INDEX, outerRegionPolygon } from "../layout";
import type { Region } from "../types";
import { makePois, makeRoads, makeSettlements } from "./_authoring";

const ID = "sacred_vale" as const;
const HOUSE = "house_caelmont" as const;

/** Vale Sagrado — vale fértil e pacífico a sudeste, cercado por colinas. */
export const sacredVale: Region = {
  id: ID,
  name: "Vale Sagrado",
  houseId: HOUSE,
  biome: "sacred_valley",
  polygon: outerRegionPolygon(SECTOR_INDEX.sacred_vale),
  adjacentRegions: ["heart_of_valdoria", "karneth", "golden_coast"],
  palette: {
    land: "#c9cd9e",
    landDebug: "#b8c86f",
    accent: "#7d8a4a",
    forest: "#5d7a45",
    rock: "#a8a48c",
  },
  economy: {
    produces: { herbs: 85, wine: 90, religious_goods: 95, food: 35 },
    consumes: { grain: 40, iron: 25, luxury: 30, salt: 20 },
    tradeActivity: 0.5,
  },
  seatPoiId: "luminaria",
  riverIds: ["rio_claro"],
  borderCrossingIds: ["bc_ponte_dos_peregrinos", "bc_passo_da_vigilia", "bc_ponte_das_aguas"],
  pointsOfInterest: makePois(ID, HOUSE, "ring", [
    { id: "luminaria", name: "Luminária", type: "city", assetKey: "city_large", tier: 1, a: -29, t: 0.42, scale: 1.1 },
    { id: "catedral_de_luminaria", name: "Catedral de Luminária", type: "cathedral", assetKey: "cathedral", tier: 1, a: -35, t: 0.51 },
    { id: "mosteiro_antigo", name: "Mosteiro Antigo", type: "monastery", assetKey: "monastery", tier: 2, a: -48, t: 0.62 },
    { id: "santuario_do_sol", name: "Santuário do Sol", type: "shrine", assetKey: "shrine", tier: 2, a: -18, t: 0.64 },
    { id: "aguas_claras", name: "Águas Claras", type: "town", assetKey: "city_small", tier: 2, a: -17, t: 0.26 },
    { id: "passo_da_fe", name: "Passo da Fé", type: "pass", assetKey: "mountain_pass", tier: 3, a: -11, t: 0.78 },
    { id: "monte_anciao", name: "Monte Ancião", type: "peak", assetKey: "mountain_large", tier: 3, a: -45, t: 0.8, scale: 1.4 },
  ]),
  settlements: makeSettlements(ID, [
    ["s_vale_oliveiras", "Oliveiras", "village", 410, "luminaria"],
    ["s_vale_romaria", "Romaria", "hamlet", 190, "mosteiro_antigo"],
    ["s_vale_fonte", "Fonte Clara", "village", 330, "aguas_claras"],
    ["s_vale_ermida", "Ermida do Vale", "monastery", 60, "santuario_do_sol"],
    ["s_vale_vinha", "Vinha Alta", "farm", 220, "catedral_de_luminaria"],
  ]),
  junctions: [],
  roads: makeRoads(ID, [
    { id: "road_vale_mosteiro", name: "Estrada dos Peregrinos", type: "secondary", nodes: ["luminaria", "mosteiro_antigo"], terrain: "hill", danger: 0.06, movementModifier: 1.15 },
    { id: "road_vale_santuario", name: "Caminho do Sol", type: "trail", nodes: ["luminaria", "santuario_do_sol", "passo_da_fe"], terrain: "hill", danger: 0.1, movementModifier: 1.4, windiness: 1.25 },
    { id: "road_vale_monte", name: "Subida do Ancião", type: "trail", nodes: ["mosteiro_antigo", "monte_anciao"], terrain: "mountain", danger: 0.16, movementModifier: 1.8, windiness: 1.3 },
  ]),
};
