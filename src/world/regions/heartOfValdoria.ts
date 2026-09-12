import { heartPolygon } from "../layout";
import type { Region } from "../types";
import { makePois, makeRoads, makeSettlements } from "./_authoring";

const ID = "heart_of_valdoria" as const;
const HOUSE = "house_valdoria" as const;

/**
 * Coração de Valdória — vale temperado fértil, centro político e populacional.
 * É a única região que faz fronteira com todas as outras seis.
 */
export const heartOfValdoria: Region = {
  id: ID,
  name: "Coração de Valdória",
  houseId: HOUSE,
  biome: "temperate_valley",
  polygon: heartPolygon(),
  adjacentRegions: [
    "elmwood",
    "greystone",
    "karneth",
    "sacred_vale",
    "golden_coast",
    "greenfields",
  ],
  palette: {
    land: "#cfc79a",
    landDebug: "#d8c46a",
    accent: "#8d7b3f",
    forest: "#6f8b4e",
    rock: "#a49a80",
  },
  economy: {
    produces: { food: 30, luxury: 20, tools: 25 },
    consumes: { luxury: 90, food: 80, wood: 60, iron: 45, wine: 40, horses: 30 },
    tradeActivity: 0.85,
  },
  seatPoiId: "castelo_real",
  riverIds: ["rio_serpente", "rio_folharcana", "rio_claro"],
  borderCrossingIds: [
    "bc_ponte_do_bosque",
    "bc_portao_de_pedra",
    "bc_vau_de_karneth",
    "bc_ponte_dos_peregrinos",
    "bc_ponte_do_serpente",
    "bc_marco_dos_graos",
  ],
  pointsOfInterest: makePois(ID, HOUSE, "heart", [
    { id: "castelo_real", name: "Castelo Real de Valdória", type: "castle", assetKey: "castle_royal", tier: 1, a: 95, t: 0.1, scale: 1.35, description: "Sede da Coroa e centro político do reino." },
    { id: "cidade_alta", name: "Cidade Alta", type: "city", assetKey: "city_large", tier: 1, a: 150, t: 0.42, scale: 1.15, description: "Principal centro urbano de Valdória." },
    { id: "conselho_real", name: "Conselho Real", type: "landmark", assetKey: "council_hall", tier: 2, a: 45, t: 0.32, description: "Complexo político junto à capital." },
    { id: "mercado_da_coroa", name: "Mercado da Coroa", type: "market", assetKey: "market_large", tier: 2, a: -160, t: 0.4, description: "Maior centro comercial do reino." },
    { id: "capela_alaric", name: "Capela de São Alaric", type: "temple", assetKey: "temple", tier: 2, a: -40, t: 0.5 },
    { id: "posto_da_guarda", name: "Posto da Guarda", type: "watchtower", assetKey: "watchtower", tier: 3, a: 88, t: 0.66, description: "Controle da Estrada dos Reis ao norte." },
    { id: "granja_real", name: "Granja Real", type: "farm", assetKey: "farm", tier: 3, a: -103, t: 0.55 },
    { id: "pouso_dos_mercadores", name: "Pouso dos Mercadores", type: "inn", assetKey: "inn", tier: 3, a: -172, t: 0.66 },
    { id: "ruinas_antigas", name: "Ruínas Antigas", type: "ruins", assetKey: "ruins", tier: 3, a: 12, t: 0.7 },
  ]),
  settlements: makeSettlements(ID, [
    ["s_valdoria_ponte_velha", "Ponte Velha", "village", 820, "cidade_alta"],
    ["s_valdoria_vinhedos", "Vinhedos do Rei", "farm", 310, "granja_real"],
    ["s_valdoria_carvalhal", "Carvalhal", "village", 640, "capela_alaric"],
    ["s_valdoria_pedra_branca", "Pedra Branca", "hamlet", 180, "posto_da_guarda"],
    ["s_valdoria_moinho_novo", "Moinho Novo", "hamlet", 240, "mercado_da_coroa"],
    ["s_valdoria_forca_real", "Forca Real", "outpost", 90, "ruinas_antigas"],
    ["s_valdoria_ribeira", "Ribeira dos Salgueiros", "village", 470, "pouso_dos_mercadores"],
  ]),
  junctions: [],
  roads: makeRoads(ID, [
    { id: "road_heart_alta_mercado", name: "Via da Coroa", type: "secondary", nodes: ["cidade_alta", "mercado_da_coroa"], terrain: "plain", danger: 0.05 },
    { id: "road_heart_conselho_guarda", name: "Caminho do Conselho", type: "secondary", nodes: ["conselho_real", "posto_da_guarda"], terrain: "hill", danger: 0.05 },
    { id: "road_heart_alta_guarda", name: "Ronda do Norte", type: "secondary", nodes: ["cidade_alta", "posto_da_guarda"], terrain: "hill", danger: 0.06 },
    { id: "road_heart_granja_capela", name: "Estrada da Granja", type: "secondary", nodes: ["granja_real", "capela_alaric"], terrain: "plain", danger: 0.05 },
    { id: "road_heart_pouso_granja", name: "Trilha dos Carreiros", type: "trail", nodes: ["pouso_dos_mercadores", "granja_real"], terrain: "plain", danger: 0.12, movementModifier: 1.25 },
    { id: "road_heart_conselho_ruinas", name: "Caminho das Ruínas", type: "trail", nodes: ["conselho_real", "ruinas_antigas"], terrain: "hill", danger: 0.18, movementModifier: 1.3 },
  ]),
};
