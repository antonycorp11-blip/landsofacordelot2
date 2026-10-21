import { BASE_SLOTS, RUN, STARTER_UNITS, TREE, type StatKey, type UnitId } from "../data/content";

/** Progresso permanente entre missões. */
export interface Profile {
  version: number;
  scrap: number;
  scrapTotal: number;
  nodes: Record<string, number>;
  sectorUnlocked: number;
  bestWave: Record<number, number>;
  cleared: Record<number, boolean>;
  loadout: UnitId[];
  runs: number;
  kills: number;
  flags: Record<string, boolean>;
}

export function newProfile(): Profile {
  return {
    version: 1,
    scrap: 0,
    scrapTotal: 0,
    nodes: { core: 1 },
    sectorUnlocked: 1,
    bestWave: {},
    cleared: {},
    loadout: ["generator", "blaster", "wall"],
    runs: 0,
    kills: 0,
    flags: {},
  };
}

export interface Stats {
  bladeDmg: number;
  bladeHeat: number;
  bladeWidth: number;
  bladeCrit: number;
  bladeMagnet: boolean;
  bladeChain: number;
  bladeBurn: number;
  unitDmg: number;
  unitHp: number;
  startEnergy: number;
  genSpeed: number;
  recharge: number;
  costMul: number;
  scrapMul: number;
  baseHp: number;
  slots: number;
  killEnergy: number;
  droneRedeploy: boolean;
  unlocked: UnitId[];
}

/** Converte os níveis da árvore em modificadores de jogo. */
export function computeStats(p: Profile): Stats {
  const sum = (k: StatKey) => TREE.filter((n) => n.stat === k).reduce((a, n) => a + (p.nodes[n.id] ?? 0) * n.value, 0);
  const unlocked: UnitId[] = [...STARTER_UNITS];
  for (const n of TREE) if (n.stat === "unlock" && n.unit && p.nodes[n.id]) unlocked.push(n.unit);
  return {
    bladeDmg: 1 + sum("bladeDmg"),
    bladeHeat: Math.max(0.2, 1 - sum("bladeCool")),
    bladeWidth: 1 + sum("bladeWidth"),
    bladeCrit: sum("bladeCrit"),
    bladeMagnet: sum("bladeMagnet") > 0,
    bladeChain: Math.round(sum("bladeChain")),
    bladeBurn: sum("bladeBurn"),
    unitDmg: 1 + sum("unitDmg"),
    unitHp: 1 + sum("unitHp"),
    startEnergy: RUN.startEnergy + sum("startEnergy"),
    genSpeed: 1 + sum("genBoost"),
    recharge: Math.max(0.3, 1 - sum("recharge")),
    costMul: Math.max(0.5, 1 - sum("costCut")),
    scrapMul: 1 + sum("scrap"),
    baseHp: RUN.baseHp + sum("baseHp"),
    slots: BASE_SLOTS + sum("slots"),
    killEnergy: sum("killEnergy"),
    droneRedeploy: sum("drones") > 0,
    unlocked,
  };
}

export function nodeCost(id: string, level: number): number {
  const n = TREE.find((x) => x.id === id)!;
  return Math.ceil(n.baseCost * Math.pow(n.growth, level));
}

export function nodeAvailable(p: Profile, id: string): boolean {
  const n = TREE.find((x) => x.id === id)!;
  return n.requires.every((r) => (p.nodes[r] ?? 0) > 0);
}

export function buyNode(p: Profile, id: string): boolean {
  const n = TREE.find((x) => x.id === id);
  if (!n) return false;
  const lvl = p.nodes[id] ?? 0;
  if (lvl >= n.max || !nodeAvailable(p, id)) return false;
  const c = nodeCost(id, lvl);
  if (p.scrap < c) return false;
  p.scrap -= c;
  p.nodes[id] = lvl + 1;
  // carta recém-liberada entra no arsenal se houver espaço
  if (n.unit && !p.loadout.includes(n.unit) && p.loadout.length < computeStats(p).slots) p.loadout.push(n.unit);
  return true;
}

export function toggleLoadout(p: Profile, id: UnitId): boolean {
  const st = computeStats(p);
  if (!st.unlocked.includes(id)) return false;
  const i = p.loadout.indexOf(id);
  if (i >= 0) {
    if (p.loadout.length <= 1) return false;
    p.loadout.splice(i, 1);
    return true;
  }
  if (p.loadout.length >= st.slots) return false;
  p.loadout.push(id);
  return true;
}

export const SAVE_KEY = "ultimalinha.save";

export interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function saveProfile(p: Profile, store: Store = localStorage): void {
  try {
    store.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    /* armazenamento indisponível */
  }
}

export function loadProfile(store: Store = localStorage): Profile {
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return newProfile();
    const d = JSON.parse(raw) as Partial<Profile>;
    const base = newProfile();
    return { ...base, ...d, nodes: { ...base.nodes, ...(d.nodes ?? {}) }, bestWave: { ...(d.bestWave ?? {}) }, cleared: { ...(d.cleared ?? {}) }, flags: { ...(d.flags ?? {}) }, loadout: d.loadout?.length ? d.loadout : base.loadout };
  } catch {
    return newProfile();
  }
}
