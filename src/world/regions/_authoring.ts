/**
 * Açúcar sintático para escrever conteúdo de região.
 *
 * Todo POI é declarado em coordenadas polares (ângulo, t) do setor ao qual
 * pertence. Isso torna impossível colocar acidentalmente uma cidade dentro da
 * região vizinha e mantém o conteúdo estável mesmo se a geografia for ajustada.
 */
import { heartPoint, ringPoint } from "../layout";
import { lod } from "../scale";
import type {
  HouseId,
  Point,
  PointOfInterest,
  RegionId,
  RoadDefinition,
  RoadType,
  Settlement,
  SettlementKind,
  TerrainType,
} from "../types";

export type Placement = "heart" | "ring";

export function place(kind: Placement, angle: number, t: number): Point {
  return kind === "heart" ? heartPoint(angle, t) : ringPoint(angle, t);
}

export type PoiSpec = {
  id: string;
  name: string;
  type: PointOfInterest["type"];
  assetKey: string;
  tier: 1 | 2 | 3;
  /** Ângulo em graus dentro do setor da região. */
  a: number;
  /** Profundidade radial (0 = borda interna, 1 = borda externa). */
  t: number;
  scale?: number;
  /** Por padrão todo POI é navegável; marque `false` para cenário puro. */
  routeNode?: boolean;
  description?: string;
};

const TIER_MIN_ZOOM: Record<1 | 2 | 3, number> = { 1: 0, 2: lod(1.5), 3: lod(2.4) };

export function makePois(
  regionId: RegionId,
  houseId: HouseId,
  kind: Placement,
  specs: PoiSpec[],
): PointOfInterest[] {
  return specs.map((s) => {
    const p = place(kind, s.a, s.t);
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      assetKey: s.assetKey,
      tier: s.tier,
      x: p.x,
      y: p.y,
      regionId,
      ownerHouseId: houseId,
      scale: s.scale ?? 1,
      minZoom: TIER_MIN_ZOOM[s.tier],
      routeNode: s.routeNode !== false,
      description: s.description,
    };
  });
}

export function makeSettlements(
  regionId: RegionId,
  rows: [id: string, name: string, kind: SettlementKind, population: number, nearPoiId?: string][],
): Settlement[] {
  return rows.map(([id, name, kind, population, nearPoiId]) => ({
    id,
    name,
    kind,
    regionId,
    population,
    nearPoiId,
  }));
}

export type RoadSpec = {
  id: string;
  name: string;
  type: RoadType;
  nodes: string[];
  danger?: number;
  terrain?: TerrainType;
  movementModifier?: number;
  windiness?: number;
};

export function makeRoads(regionId: RegionId, specs: RoadSpec[]): RoadDefinition[] {
  return specs.map((s) => ({ ...s, regionId }));
}
