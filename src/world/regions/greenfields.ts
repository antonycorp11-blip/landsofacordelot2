import { SECTOR_INDEX, outerRegionPolygon } from "../layout";
import type { Region } from "../types";
import { makePois, makeRoads, makeSettlements } from "./_authoring";

const ID = "greenfields" as const;
const HOUSE = "house_elmwood" as const;

/** Campos Verdes — grandes planícies agrícolas a sudoeste. */
export const greenfields: Region = {
  id: ID,
  name: "Campos Verdes",
  houseId: HOUSE,
  biome: "plains",
  polygon: outerRegionPolygon(SECTOR_INDEX.greenfields),
  adjacentRegions: ["heart_of_valdoria", "golden_coast", "elmwood"],
  palette: {
    land: "#d6cf8f",
    landDebug: "#cbd968",
    accent: "#9a8f45",
    forest: "#6d8a4a",
    rock: "#b0a888",
  },
  economy: {
    produces: { grain: 100, food: 90, horses: 60 },
    consumes: { iron: 40, tools: 45, salt: 35, wood: 30 },
    tradeActivity: 0.55,
  },
  seatPoiId: "castelo_de_campo_alto",
  riverIds: [],
  borderCrossingIds: ["bc_marco_dos_graos", "bc_estrada_costeira", "bc_vau_do_oeste"],
  pointsOfInterest: makePois(ID, HOUSE, "ring", [
    { id: "castelo_de_campo_alto", name: "Castelo de Campo Alto", type: "castle", assetKey: "castle_medium", tier: 1, a: -150, t: 0.5, scale: 1.15 },
    { id: "castelo_dos_moinhos", name: "Castelo dos Moinhos", type: "castle", assetKey: "castle_medium", tier: 2, a: -162, t: 0.76, scale: 0.92, description: "Vigia os celeiros, a água dos moinhos e o caminho por onde passa o trigo." },
    { id: "trigal", name: "Trigal", type: "city", assetKey: "city_large", tier: 1, a: -140, t: 0.36 },
    { id: "estrela_do_sul", name: "Estrela do Sul", type: "town", assetKey: "city_small", tier: 2, a: -165, t: 0.56 },
    { id: "mercado_de_graos", name: "Mercado de Grãos", type: "market", assetKey: "market_large", tier: 2, a: -133, t: 0.28 },
    { id: "grandes_moinhos", name: "Grandes Moinhos", type: "mill", assetKey: "mill", tier: 2, a: -156, t: 0.68 },
    { id: "haras_real", name: "Haras Real", type: "stud_farm", assetKey: "stud_farm", tier: 2, a: -172, t: 0.4 },
    { id: "fazendas_centrais", name: "Fazendas Centrais", type: "farm", assetKey: "farm", tier: 3, a: -128, t: 0.58 },
  ]),
  settlements: makeSettlements(ID, [
    ["s_gf_espiga", "Espiga", "village", 560, "trigal"],
    ["s_gf_celeiro", "Celeiro Velho", "hamlet", 230, "mercado_de_graos"],
    ["s_gf_potreiro", "Potreiro", "farm", 300, "haras_real"],
    ["s_gf_seara", "Seara", "village", 480, "fazendas_centrais"],
    ["s_gf_vento", "Vento Alto", "hamlet", 170, "grandes_moinhos"],
    ["s_gf_azenha", "Azenha", "hamlet", 140, "estrela_do_sul"],
    ["s_gf_pastoria", "Pastoria", "farm", 260, "castelo_de_campo_alto"],
  ]),
  junctions: [],
  roads: makeRoads(ID, [
    { id: "road_gf_moinhos", name: "Estrada dos Moinhos", type: "secondary", nodes: ["trigal", "grandes_moinhos", "castelo_dos_moinhos", "estrela_do_sul"], terrain: "plain", danger: 0.07 },
    { id: "road_gf_haras", name: "Via do Haras", type: "secondary", nodes: ["estrela_do_sul", "haras_real"], terrain: "plain", danger: 0.08 },
    { id: "road_gf_fazendas", name: "Estrada das Fazendas", type: "secondary", nodes: ["trigal", "fazendas_centrais"], terrain: "plain", danger: 0.07 },
    { id: "road_gf_campoalto", name: "Trilha de Campo Alto", type: "trail", nodes: ["castelo_de_campo_alto", "grandes_moinhos"], terrain: "plain", danger: 0.12, movementModifier: 1.25 },
  ]),
};
