import { heroById } from '../data/heroes';
import { getState, type GameState } from './store';

/**
 * Onde o jogador está, quando isso é um LUGAR. Parado no meio da estrada não
 * é lugar nenhum: devolve `null`, e é por isso que não se aceita trabalho nem
 * se recruta do meio do caminho.
 */
export function locationId(s: GameState = getState()): string | null {
  if (s.journey) return s.journey.currentNodeId;
  return heroById.get(s.heroId ?? '')?.startPoiId ?? null;
}
export function isPresent(poiId: string, s: GameState = getState()): boolean {
  return s.started && !s.journey?.to && locationId(s) === poiId;
}
