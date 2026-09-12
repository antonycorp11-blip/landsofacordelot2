/**
 * O reino de Valdória, montado a partir das sete regiões.
 *
 * Este módulo é a ÚNICA fonte de verdade consumida pela renderização e pela
 * navegação. Nada aqui sabe desenhar; tudo aqui sabe onde as coisas estão.
 */
import { borderCrossings } from "./borderCrossings";
import { kingdomOutline, seaPolygon, WORLD } from "./layout";
import { elmwood } from "./regions/elmwood";
import { goldenCoast } from "./regions/goldenCoast";
import { greenfields } from "./regions/greenfields";
import { greystone } from "./regions/greystone";
import { heartOfValdoria } from "./regions/heartOfValdoria";
import { karneth } from "./regions/karneth";
import { sacredVale } from "./regions/sacredVale";
import { rivers } from "./rivers";
import { ringRoads, royalRoads } from "./roads";
import type {
  Kingdom,
  PointOfInterest,
  Region,
  RegionId,
  RoadDefinition,
  RouteNode,
  Settlement,
} from "./types";

/**
 * As Casas vivem em `data/houses.ts` — o registry político. Aqui só ficam
 * reexportadas, para que quem já consumia `valdoria.houses` continue
 * funcionando sem duplicar a fonte da verdade.
 */
export { houses, houseById } from "../data/houses";
import { houses } from "../data/houses";

/** O Coração vem primeiro: é desenhado por baixo e serve de referência. */
export const regions: Region[] = [
  heartOfValdoria,
  elmwood,
  greystone,
  karneth,
  sacredVale,
  goldenCoast,
  greenfields,
];

export const valdoria: Kingdom = {
  id: "valdoria",
  name: "Reino de Valdória",
  bounds: WORLD,
  houses,
  regions,
  rivers,
  borderCrossings,
  royalRoads,
  outline: kingdomOutline(),
  sea: seaPolygon(),
};

/* ------------------------------------------------------------------ */
/* Índices                                                             */
/* ------------------------------------------------------------------ */

export const regionById = new Map<RegionId, Region>(regions.map((r) => [r.id, r]));

export const allPois: PointOfInterest[] = regions.flatMap((r) => r.pointsOfInterest);
export const poiById = new Map(allPois.map((p) => [p.id, p]));

export const allSettlements: Settlement[] = regions.flatMap((r) => r.settlements);

/** Todas as estradas do mundo: regionais + reais + anel externo. */
export const allRoads: RoadDefinition[] = [
  ...regions.flatMap((r) => r.roads),
  ...royalRoads,
  ...ringRoads,
];

/* ------------------------------------------------------------------ */
/* Nós da malha de navegação                                           */
/* ------------------------------------------------------------------ */

export const routeNodes: RouteNode[] = [
  ...allPois
    .filter((p) => p.routeNode)
    .map<RouteNode>((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      regionId: p.regionId,
      poiId: p.id,
      kind: "poi",
    })),
  ...borderCrossings.map<RouteNode>((c) => ({
    id: c.id,
    x: c.x,
    y: c.y,
    // A travessia é contabilizada na região de destino ao ser cruzada; aqui
    // guardamos a primeira só para agrupamento/debug.
    regionId: c.connects[0],
    borderCrossingId: c.id,
    kind: "crossing",
  })),
  ...regions.flatMap((r) => r.junctions),
];

export const routeNodeById = new Map(routeNodes.map((n) => [n.id, n]));

/** Regiões vizinhas de um par de travessia, para o hook `onBorderCrossed`. */
export const crossingByNodeId = new Map(borderCrossings.map((c) => [c.id, c]));
