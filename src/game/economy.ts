import { BALANCE, ENEMIES, PRODUCERS, PRODUCER_MILESTONE, TALENTS, TOWERS, TOWER_UPGRADE, type EnemyKind, type ProducerId, type TalentId, type TowerKind } from "../data/content";
import type { GameState } from "./state";

/** Custo total de comprar `n` unidades de algo com custo geométrico. */
export function bulkCost(base: number, growth: number, owned: number, n: number): number {
  if (n <= 0) return 0;
  return (base * Math.pow(growth, owned) * (Math.pow(growth, n) - 1)) / (growth - 1);
}

/** Quantas unidades cabem no orçamento. */
export function maxAffordable(base: number, growth: number, owned: number, money: number): number {
  const first = base * Math.pow(growth, owned);
  if (money < first) return 0;
  return Math.floor(Math.log((money * (growth - 1)) / first + 1) / Math.log(growth));
}

export function memoryMult(s: GameState): number {
  return 1 + BALANCE.memoryBonus * s.memoriesTotal;
}

export function damageMult(s: GameState): number {
  return (1 + 0.2 * s.talents.wisdom) * memoryMult(s);
}

export function oilMult(s: GameState): number {
  return (1 + 0.25 * s.talents.fortune) * memoryMult(s) * (1 + 0.4 * s.island);
}

export function producerRate(s: GameState, id: ProducerId): number {
  const def = PRODUCERS.find((p) => p.id === id)!;
  const n = s.producers[id];
  return def.rate * n * Math.pow(2, Math.floor(n / PRODUCER_MILESTONE)) * oilMult(s);
}

export function incomePerSec(s: GameState): number {
  return PRODUCERS.reduce((a, p) => a + producerRate(s, p.id), 0);
}

export function enemyHp(kind: EnemyKind, wave: number, island: number): number {
  return ENEMIES[kind].hp * Math.pow(BALANCE.hpGrowth, wave - 1) * (1 + 0.25 * island);
}

export function enemyReward(s: GameState, kind: EnemyKind, wave: number): number {
  return ENEMIES[kind].reward * Math.pow(BALANCE.rewardGrowth, wave - 1) * oilMult(s);
}

export function towerUpgradeCost(kind: TowerKind, level: number): number {
  return TOWERS[kind].cost * Math.pow(TOWER_UPGRADE.costGrowth, level);
}

export function towerDamage(s: GameState, kind: TowerKind, level: number): number {
  return TOWERS[kind].damage * Math.pow(TOWER_UPGRADE.damageGrowth, level) * damageMult(s);
}

export function towerRange(kind: TowerKind, level: number): number {
  return TOWERS[kind].range * (1 + TOWER_UPGRADE.rangeGrowth * Math.min(level, 20));
}

export function talentCost(id: TalentId, level: number): number {
  const t = TALENTS.find((x) => x.id === id)!;
  return Math.ceil(t.baseCost * Math.pow(t.growth, level));
}

/** Memórias que uma reconstrução renderia agora. */
export function prestigeGain(s: GameState): number {
  if (s.maxWave < BALANCE.prestigeMinWave) return 0;
  return Math.floor(Math.pow(s.maxWave / 10, 1.8) * (1 + 0.15 * s.island));
}

export function offlineEarnings(s: GameState, now: number): { seconds: number; oil: number } {
  const seconds = Math.max(0, Math.min(BALANCE.offlineCapSec, (now - s.savedAt) / 1000));
  return { seconds, oil: incomePerSec(s) * seconds * BALANCE.offlineRate };
}

export function spend(s: GameState, amount: number): boolean {
  if (amount > s.oil + 1e-9) return false;
  s.oil -= amount;
  return true;
}

export function earn(s: GameState, amount: number): void {
  s.oil += amount;
  s.oilRun += amount;
  s.oilLifetime += amount;
}
