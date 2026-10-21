import { BALANCE, BEAM_UPGRADES, LENSES, PRODUCERS, TALENTS, TOWERS, TOWER_UPGRADE, beamStats, type BeamStat, type LensId, type ProducerId, type TalentId, type TowerKind } from "../data/content";
import { bulkCost, maxAffordable, prestigeGain, spend, talentCost, towerUpgradeCost } from "./economy";
import { newRuntime, newState, type GameState, type Runtime } from "./state";

export type BuyMode = 1 | 10 | "max";

export function buyCount(base: number, growth: number, owned: number, cap: number, money: number, mode: BuyMode): number {
  const room = Math.max(0, cap - owned);
  if (mode === "max") return Math.min(room, maxAffordable(base, growth, owned, money));
  return Math.min(room, mode);
}

export function beamQuote(s: GameState, id: BeamStat, mode: BuyMode): { n: number; cost: number } {
  const u = BEAM_UPGRADES.find((x) => x.id === id)!;
  const owned = s.beam[id];
  let n = buyCount(u.baseCost, u.growth, owned, u.max, s.oil, mode);
  if (n === 0 && owned < u.max) n = 1;
  return { n, cost: bulkCost(u.baseCost, u.growth, owned, n) };
}

export function buyBeam(s: GameState, id: BeamStat, mode: BuyMode): boolean {
  const q = beamQuote(s, id, mode);
  if (q.n <= 0 || !spend(s, q.cost)) return false;
  const before = beamStats(s.beam).hpMax;
  s.beam[id] += q.n;
  if (id === "wall") s.hp += beamStats(s.beam).hpMax - before;
  return true;
}

export function producerQuote(s: GameState, id: ProducerId, mode: BuyMode): { n: number; cost: number } {
  const p = PRODUCERS.find((x) => x.id === id)!;
  let n = buyCount(p.baseCost, p.growth, s.producers[id], Infinity, s.oil, mode);
  if (n === 0) n = 1;
  return { n, cost: bulkCost(p.baseCost, p.growth, s.producers[id], n) };
}

export function buyProducer(s: GameState, id: ProducerId, mode: BuyMode): boolean {
  const q = producerQuote(s, id, mode);
  if (!spend(s, q.cost)) return false;
  s.producers[id] += q.n;
  return true;
}

export function towerUnlocked(s: GameState, kind: TowerKind): boolean {
  return s.maxWave >= TOWERS[kind].unlockWave || s.prestiges > 0;
}

export function buildTower(s: GameState, slot: number, kind: TowerKind): boolean {
  if (s.towers[slot] || !towerUnlocked(s, kind)) return false;
  if (!spend(s, TOWERS[kind].cost)) return false;
  s.towers[slot] = { kind, level: s.talents.veteran, cd: 0, spent: TOWERS[kind].cost };
  s.flags.builtTower = true;
  return true;
}

export function towerQuote(s: GameState, slot: number, mode: BuyMode): { n: number; cost: number } {
  const t = s.towers[slot];
  if (!t) return { n: 0, cost: 0 };
  const base = towerUpgradeCost(t.kind, 0);
  let n = buyCount(base, TOWER_UPGRADE.costGrowth, t.level, TOWER_UPGRADE.maxLevel, s.oil, mode);
  if (n === 0 && t.level < TOWER_UPGRADE.maxLevel) n = 1;
  return { n, cost: bulkCost(base, TOWER_UPGRADE.costGrowth, t.level, n) };
}

export function upgradeTower(s: GameState, slot: number, mode: BuyMode): boolean {
  const t = s.towers[slot];
  const q = towerQuote(s, slot, mode);
  if (!t || q.n <= 0 || !spend(s, q.cost)) return false;
  t.level += q.n;
  t.spent += q.cost;
  return true;
}

export function sellTower(s: GameState, slot: number): number {
  const t = s.towers[slot];
  if (!t) return 0;
  const refund = t.spent * 0.6;
  s.oil += refund;
  s.towers[slot] = null;
  return refund;
}

export function buyLens(s: GameState, id: LensId): boolean {
  if (s.lenses.includes(id)) {
    s.lens = id;
    return true;
  }
  if (id === "prism") {
    if (!s.talents.prism) return false;
    s.lenses.push(id);
    s.lens = id;
    return true;
  }
  if (!spend(s, LENSES[id].cost)) return false;
  s.lenses.push(id);
  s.lens = id;
  return true;
}

export function buyTalent(s: GameState, id: TalentId): boolean {
  const t = TALENTS.find((x) => x.id === id)!;
  const lvl = s.talents[id];
  if (lvl >= t.max) return false;
  const c = talentCost(id, lvl);
  if (s.memories < c) return false;
  s.memories -= c;
  s.talents[id]++;
  if (id === "prism" && !s.lenses.includes("prism")) s.lenses.push("prism");
  return true;
}

/** Reconstruir o farol numa nova ilha: zera a corrida, mantém memórias e talentos. */
export function prestige(s: GameState): { state: GameState; runtime: Runtime; gained: number } | null {
  const gained = prestigeGain(s);
  if (gained <= 0) return null;
  const n = newState(s.seed);
  n.island = s.island + 1;
  n.prestiges = s.prestiges + 1;
  n.memories = s.memories + gained;
  n.memoriesTotal = s.memoriesTotal + gained;
  n.talents = { ...s.talents };
  n.bestWaveEver = Math.max(s.bestWaveEver, s.maxWave);
  n.oilLifetime = s.oilLifetime;
  n.kills = s.kills;
  n.flags = { ...s.flags };
  n.autoAdvance = true;
  n.wave = 1 + 5 * s.talents.head;
  n.maxWave = n.wave;
  n.oil = 80 + (s.talents.reserve ? 200 * Math.pow(4, s.talents.reserve) : 0);
  if (s.talents.prism) n.lenses.push("prism");
  n.hp = BALANCE.baseHp;
  return { state: n, runtime: newRuntime(), gained };
}
