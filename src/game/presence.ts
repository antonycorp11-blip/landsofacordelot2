import { heroById } from '../data/heroes';
import { getState, type GameState } from './store';

export function locationId(s: GameState = getState()): string {
  return s.journey?.currentNodeId ?? heroById.get(s.heroId ?? '')?.startPoiId ?? 'castelo_real';
}
export function isPresent(poiId: string, s: GameState = getState()): boolean {
  return s.started && !s.journey?.destinationId && locationId(s) === poiId;
}
