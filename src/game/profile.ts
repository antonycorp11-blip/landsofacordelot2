import { BAL, STARTING_SATS, TREE, type SatId } from "../data/content";

export interface Profile {
  version: number;
  matter: number;
  matterTotal: number;
  nodes: Record<string, number>;
  bestWave: number;
  runs: number;
  kills: number;
  tutorialDone: boolean;
}

export const SAVE_KEY = "poco-gravitacional-v1";

export function newProfile(): Profile {
  return { version: 1, matter: 0, matterTotal: 0, nodes: {}, bestWave: 0, runs: 0, kills: 0, tutorialDone: false };
}

export function loadProfile(raw: string | null): Profile {
  const base = newProfile();
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as Partial<Profile>;
    const p: Profile = { ...base, ...d, nodes: { ...(d.nodes ?? {}) } };
    for (const k of Object.keys(p.nodes)) {
      const n = TREE.find((t) => t.id === k);
      if (!n) delete p.nodes[k];
      else p.nodes[k] = Math.max(0, Math.min(n.max, Math.floor(p.nodes[k])));
    }
    if (!isFinite(p.matter) || p.matter < 0) p.matter = 0;
    return p;
  } catch {
    return base;
  }
}

export function lvl(p: Profile, id: string): number {
  return p.nodes[id] ?? 0;
}

export function nodeCost(id: string, level: number): number {
  const n = TREE.find((t) => t.id === id)!;
  return Math.ceil(n.baseCost * Math.pow(n.growth, level));
}

export function nodeAvailable(p: Profile, id: string): boolean {
  const n = TREE.find((t) => t.id === id)!;
  return n.requires.every((r) => lvl(p, r) > 0);
}

export function canBuy(p: Profile, id: string): boolean {
  const n = TREE.find((t) => t.id === id);
  if (!n) return false;
  const l = lvl(p, id);
  return l < n.max && nodeAvailable(p, id) && p.matter >= nodeCost(id, l);
}

export function buyNode(p: Profile, id: string): boolean {
  if (!canBuy(p, id)) return false;
  const l = lvl(p, id);
  p.matter -= nodeCost(id, l);
  p.nodes[id] = l + 1;
  return true;
}

export interface Stats {
  grav: number;
  horizon: number;
  horizonDps: number;
  energyMax: number;
  energyRegen: number;
  pulseForce: number;
  pulseCd: number;
  impact: number;
  comboWindow: number;
  reach: number;
  satDmg: number;
  satRate: number;
  satCost: number;
  startFrags: number;
  rings: number;
  extraSlots: number;
  coreHp: number;
  coreRegen: number;
  shield: boolean;
  fragVal: number;
  matterMul: number;
  asteroids: number;
  startWave: number;
  unlocked: SatId[];
}

export function computeStats(p: Profile): Stats {
  const L = (id: string) => lvl(p, id);
  const unlocked: SatId[] = [...STARTING_SATS];
  for (const n of TREE) if (n.sat && L(n.id) > 0) unlocked.push(n.sat);
  return {
    grav: (1 + 0.1 * L("root")) * (1 + 0.12 * L("mass")),
    horizon: 1 + 0.08 * L("horizon"),
    horizonDps: 1 + 0.25 * L("hdmg"),
    energyMax: BAL.energyMax + 20 * L("energy"),
    energyRegen: 1 + 0.15 * L("regen"),
    pulseForce: 1 + 0.2 * L("pulse"),
    pulseCd: BAL.pulseCd * Math.pow(0.92, L("pulse")),
    impact: 1 + 0.15 * L("impact"),
    comboWindow: BAL.comboWindow + 0.5 * L("combo"),
    reach: 1 + 0.2 * L("reach"),
    satDmg: 1 + 0.12 * L("satDmg"),
    satRate: 1 + 0.08 * L("satRate"),
    satCost: Math.pow(0.94, L("discount")),
    startFrags: BAL.startFrags + 25 * L("startFrag") + 40 * L("headstart"),
    rings: L("ring3") ? 3 : 2,
    extraSlots: L("slots"),
    coreHp: BAL.coreHp * (1 + 0.2 * L("hp")),
    coreRegen: 0.4 * L("coreRegen"),
    shield: L("shield") > 0,
    fragVal: 1 + 0.1 * L("fragVal"),
    matterMul: 1 + 0.1 * L("matter"),
    asteroids: BAL.asteroids + L("belt"),
    startWave: 1 + 2 * L("headstart"),
    unlocked,
  };
}
