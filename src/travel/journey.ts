import { getState } from '../game/store';
import { loadStop, nodeStop, pathBetween, stopAlong, type RoadStop } from '../world/roadStops';
import { routeEdgeById } from '../world/navgraph';
import { routeNodeById } from '../world/valdoria';
import { regionAtPoint } from '../world/navigation/navigationGrid';
import { samplePath } from './samplePath';
import type { RegionId } from '../world/types';

/**
 * Recompõe a viagem a partir do que foi gravado: as paradas e a distância já
 * percorrida. O traçado e as coordenadas do mundo não são gravados — são
 * sempre recalculados, para que mexer numa estrada não corrompa um save.
 */
export function restoreJourney(fallbackId: string) {
  const saved = getState().journey;
  const here = loadStop(saved?.at) ?? nodeStop(saved?.currentNodeId ?? '') ?? nodeStop(fallbackId)!;

  const from = loadStop(saved?.from);
  const to = loadStop(saved?.to);
  const found = from && to ? pathBetween(from, to) : null;
  const distance = found
    ? Math.max(0, Math.min(found.totalDistance, Number.isFinite(saved?.distance) ? saved!.distance : 0))
    : 0;
  const path = found && distance < found.totalDistance ? found : null;

  const boundaries = path?.legAt ?? [];
  let cursor = 0;
  while (path && cursor < boundaries.length - 2 && distance >= boundaries[cursor + 1]) cursor++;

  const stop: RoadStop = path ? stopAlong(path, distance) ?? here : found?.endStop ?? here;
  const position = path ? samplePath(path, distance) : { x: stop.x, y: stop.y, heading: 0 };
  const regionId: RegionId =
    (path ? routeEdgeById.get(path.edgeIds[cursor])?.regionId : undefined) ??
    regionOfStop(stop) ??
    'heart_of_valdoria';

  return {
    path, distance: path ? distance : 0, boundaries, cursor, stop, position, regionId,
    hours: Number.isFinite(saved?.hours) ? Math.max(0, saved!.hours) : 0,
    speed: [1, 2, 4].includes(saved?.speed ?? 1) ? saved?.speed ?? 1 : 1,
    paused: !!path || !!saved?.paused,
  };
}

function regionOfStop(stop: RoadStop): RegionId | undefined {
  if (stop.kind === 'road') return routeEdgeById.get(stop.edgeId)?.regionId;
  // Parada fora da malha: a região vem do polígono. Sem isto, quem começa ou
  // para no meio do mato aparecia no HUD como estando no Coração de Valdória,
  // que é só o padrão da função — e a campanha começa no Bosque de Elmwood.
  if (stop.kind === 'free') return regionAtPoint(stop) ?? undefined;
  const node = routeNodeById.get(stop.id);
  return node ? regionAtPoint(node) ?? undefined : undefined;
}
