import { SECTOR_INDEX, outerRegionPolygon } from "../layout";
import type { Region } from "../types";
import { makePois, makeRoads, makeSettlements } from "./_authoring";

const ID = "elmwood" as const;
const HOUSE = "house_silvarden" as const;

/** Bosque de Elmwood — floresta temperada densa a noroeste. */
export const elmwood: Region = {
  id: ID,
  name: "Bosque de Elmwood",
  houseId: HOUSE,
  biome: "dense_forest",
  polygon: outerRegionPolygon(SECTOR_INDEX.elmwood),
  adjacentRegions: ["heart_of_valdoria", "greystone", "greenfields"],
  palette: {
    land: "#b9c39a",
    landDebug: "#7fae62",
    accent: "#4f6b3a",
    forest: "#3f5c33",
    rock: "#8f9480",
  },
  economy: {
    produces: { wood: 95, herbs: 70, game: 65, food: 20 },
    consumes: { grain: 45, iron: 30, salt: 25, tools: 25 },
    tradeActivity: 0.4,
  },
  seatPoiId: "castelo_verde",
  riverIds: ["rio_folharcana"],
  borderCrossingIds: ["bc_ponte_do_bosque", "bc_trilha_das_faias", "bc_vau_do_oeste"],
  pointsOfInterest: makePois(ID, HOUSE, "ring", [
    { id: "castelo_verde", name: "Castelo Verde", type: "castle", assetKey: "castle_medium", tier: 1, a: 152, t: 0.55, scale: 1.15 },
    { id: "serenvale", name: "Serenvale", type: "city", assetKey: "city_large", tier: 1, a: 136, t: 0.42 },
    { id: "folhaterra", name: "Folhaterra", type: "town", assetKey: "city_small", tier: 2, a: 123, t: 0.58 },
    { id: "grande_serraria", name: "Grande Serraria", type: "sawmill", assetKey: "sawmill", tier: 2, a: 161, t: 0.35 },
    { id: "lago_verde", name: "Lago Verde", type: "lake", assetKey: "lake", tier: 2, a: 144, t: 0.72, scale: 1.4 },
    { id: "posto_dos_cacadores", name: "Posto dos Caçadores", type: "outpost", assetKey: "outpost", tier: 3, a: 166, t: 0.7 },
    { id: "bosque_sagrado", name: "Bosque Sagrado", type: "grove", assetKey: "sacred_grove", tier: 3, a: 128, t: 0.8 },
  ]),
  settlements: makeSettlements(ID, [
    ["s_elm_ramos", "Ramos Altos", "village", 520, "serenvale"],
    ["s_elm_cinzaverde", "Cinzaverde", "hamlet", 210, "castelo_verde"],
    ["s_elm_toca", "Toca do Texugo", "hamlet", 140, "posto_dos_cacadores"],
    ["s_elm_pinheiral", "Pinheiral", "village", 380, "grande_serraria"],
    ["s_elm_margem", "Margem do Lago", "fishing_village", 260, "lago_verde"],
    ["s_elm_ervanaria", "Ervanária", "hamlet", 120, "bosque_sagrado"],
  ]),
  junctions: [],
  roads: makeRoads(ID, [
    { id: "road_elm_folhaterra", name: "Estrada de Folhaterra", type: "secondary", nodes: ["serenvale", "folhaterra"], terrain: "forest", danger: 0.12, movementModifier: 1.2 },
    { id: "road_elm_serraria", name: "Estrada da Madeira", type: "secondary", nodes: ["castelo_verde", "grande_serraria"], terrain: "forest", danger: 0.1, movementModifier: 1.15 },
    { id: "road_elm_lago", name: "Trilha do Lago Verde", type: "trail", nodes: ["serenvale", "lago_verde", "posto_dos_cacadores", "castelo_verde"], terrain: "forest", danger: 0.22, movementModifier: 1.45, windiness: 1.3 },
    { id: "road_elm_bosque", name: "Trilha do Bosque Sagrado", type: "trail", nodes: ["folhaterra", "bosque_sagrado"], terrain: "forest", danger: 0.2, movementModifier: 1.4, windiness: 1.25 },
  ]),
};
