import { newState, type GameState } from "./state";

export const SAVE_KEY = "farol.save";
export const SAVE_VERSION = 1;

export interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

/** Preenche campos ausentes (saves antigos) com os padrões atuais. */
export function migrate(raw: Partial<GameState>): GameState {
  const base = newState(raw.seed);
  const s = { ...base, ...raw } as GameState;
  s.beam = { ...base.beam, ...(raw.beam ?? {}) };
  s.producers = { ...base.producers, ...(raw.producers ?? {}) };
  s.talents = { ...base.talents, ...(raw.talents ?? {}) };
  s.flags = { ...(raw.flags ?? {}) };
  s.towers = Array.from({ length: 8 }, (_, i) => raw.towers?.[i] ?? null);
  s.lenses = raw.lenses?.length ? raw.lenses : ["white"];
  s.version = SAVE_VERSION;
  return s;
}

export function save(s: GameState, store: Store = localStorage): boolean {
  try {
    s.savedAt = Date.now();
    store.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function load(store: Store = localStorage): GameState | null {
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}
