import { SECTOR_INDEX, outerRegionPolygon } from "../layout";
import type { Region } from "../types";
import { makePois, makeRoads, makeSettlements } from "./_authoring";

const ID = "golden_coast" as const;
const HOUSE = "house_aurenna" as const;

/** Costa Dourada — litoral ao sul, foz do Rio Serpente e comércio marítimo. */
export const goldenCoast: Region = {
  id: ID,
  name: "Costa Dourada",
  houseId: HOUSE,
  biome: "coastal",
  polygon: outerRegionPolygon(SECTOR_INDEX.golden_coast),
  adjacentRegions: ["heart_of_valdoria", "sacred_vale", "greenfields"],
  palette: {
    land: "#d9cb96",
    landDebug: "#e0b964",
    accent: "#a8843f",
    forest: "#6f8552",
    rock: "#b9ab8c",
  },
  economy: {
    produces: { fish: 100, salt: 90, luxury: 35 },
    consumes: { grain: 70, wood: 60, iron: 40, food: 45 },
    tradeActivity: 1,
    importExportHub: true,
  },
  seatPoiId: "castelo_de_aurimar",
  riverIds: ["rio_serpente"],
  borderCrossingIds: ["bc_ponte_do_serpente", "bc_ponte_das_aguas", "bc_estrada_costeira"],
  pointsOfInterest: makePois(ID, HOUSE, "ring", [
    { id: "castelo_de_aurimar", name: "Castelo de Aurimar", type: "castle", assetKey: "castle_medium", tier: 1, a: -87, t: 0.55, scale: 1.15 },
    { id: "aurimar", name: "Aurimar", type: "city", assetKey: "city_large", tier: 1, a: -92, t: 0.65 },
    { id: "grande_porto", name: "Grande Porto", type: "port", assetKey: "port", tier: 1, a: -96, t: 0.8, scale: 1.2 },
    { id: "mare_alta", name: "Maré Alta", type: "town", assetKey: "city_small", tier: 2, a: -78, t: 0.4 },
    { id: "baia_serena", name: "Baía Serena", type: "bay", assetKey: "bay", tier: 2, a: -70, t: 0.79 },
    { id: "farol_dourado", name: "Farol Dourado", type: "lighthouse", assetKey: "lighthouse", tier: 2, a: -108, t: 0.84 },
    { id: "estaleiro_aurenna", name: "Estaleiro Aurenna", type: "shipyard", assetKey: "shipyard", tier: 2, a: -101, t: 0.79 },
    { id: "mercado_maritimo", name: "Mercado Marítimo", type: "market", assetKey: "market_large", tier: 2, a: -90, t: 0.72 },
  ]),
  settlements: makeSettlements(ID, [
    ["s_gc_redes", "Vila das Redes", "fishing_village", 390, "grande_porto"],
    ["s_gc_salinas", "Salinas", "village", 310, "farol_dourado"],
    ["s_gc_penedo", "Penedo", "hamlet", 150, "baia_serena"],
    ["s_gc_ancora", "Âncora Velha", "fishing_village", 240, "estaleiro_aurenna"],
    ["s_gc_duna", "Duna Clara", "hamlet", 130, "mare_alta"],
    ["s_gc_mareu", "Maréu", "fishing_village", 200, "aurimar"],
  ]),
  junctions: [],
  roads: makeRoads(ID, [
    { id: "road_gc_porto", name: "Via do Porto", type: "main", nodes: ["aurimar", "mercado_maritimo", "grande_porto"], terrain: "coast", danger: 0.06 },
    { id: "road_gc_estaleiro", name: "Estrada do Farol", type: "secondary", nodes: ["aurimar", "estaleiro_aurenna", "farol_dourado"], terrain: "coast", danger: 0.1, movementModifier: 1.15 },
    { id: "road_gc_baia", name: "Estrada da Baía", type: "secondary", nodes: ["mare_alta", "baia_serena"], terrain: "coast", danger: 0.1, movementModifier: 1.1 },
  ]),
};
