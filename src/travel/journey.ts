import { getState } from '../game/store';
import { findPath, nodeBoundaries } from '../world/navgraph';
import { routeNodeById } from '../world/valdoria';
import { samplePath } from './samplePath';

/** Restore the route from its IDs; artwork and world coordinates stay unchanged. */
export function restoreJourney(fallbackId: string) {
  const saved=getState().journey;
  const current=routeNodeById.get(saved?.currentNodeId??'') ?? routeNodeById.get(fallbackId)!;
  const found=saved?.destinationId && routeNodeById.has(saved.fromNodeId)
    ? findPath(saved.fromNodeId,saved.destinationId) : null;
  const distance=found ? Math.max(0,Math.min(found.totalDistance,Number.isFinite(saved?.distance)?saved!.distance:0)) : 0;
  const path=found && distance<found.totalDistance ? found : null;
  const boundaries=path ? nodeBoundaries(path) : [];
  let cursor=0;
  while (path && cursor<path.nodeIds.length-1 && distance>=boundaries[cursor+1]) cursor++;
  const node=path ? routeNodeById.get(path.nodeIds[cursor])! : found ? routeNodeById.get(found.nodeIds[found.nodeIds.length-1])! : current;
  const position=path ? samplePath(path,distance) : {...node,heading:0};
  return {path,distance:path?distance:0,boundaries,cursor,node,position,
    hours:Number.isFinite(saved?.hours)?Math.max(0,saved!.hours):0,
    speed:[1,2,4].includes(saved?.speed??1)?saved?.speed??1:1,
    paused:!!path || !!saved?.paused,
  };
}
