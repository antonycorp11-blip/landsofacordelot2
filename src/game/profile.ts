import { CHORDS, KEYS, MOTIFS, TREE, type ChordDef, type MotifId } from "../data/content";

export interface Profile {
  version: number;
  notes: number;
  notesTotal: number;
  scores: number;
  nodes: Record<string, number>;
  /** maior índice de tonalidade liberado */
  keyUnlocked: number;
  /** melhor movimento alcançado por tonalidade */
  best: Record<string, number>;
  wins: number;
  runs: number;
  kills: number;
  chords: number;
  tutorialDone: boolean;
  muted: boolean;
}

export const SAVE_KEY = "dissonancia-v1";

export function newProfile(): Profile {
  return { version: 1, notes: 0, notesTotal: 0, scores: 0, nodes: {}, keyUnlocked: 0, best: {}, wins: 0, runs: 0, kills: 0, chords: 0, tutorialDone: false, muted: false };
}

export function loadProfile(raw: string | null): Profile {
  const base = newProfile();
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as Partial<Profile>;
    const p: Profile = { ...base, ...d, nodes: { ...(d.nodes ?? {}) }, best: { ...(d.best ?? {}) } };
    for (const k of Object.keys(p.nodes)) {
      const n = TREE.find((t) => t.id === k);
      if (!n) delete p.nodes[k];
      else p.nodes[k] = Math.max(0, Math.min(n.max, Math.floor(Number(p.nodes[k]) || 0)));
    }
    for (const f of ["notes", "notesTotal", "scores"] as const) if (!isFinite(p[f]) || p[f] < 0) p[f] = 0;
    p.keyUnlocked = Math.max(0, Math.min(KEYS.length - 1, Math.floor(p.keyUnlocked || 0)));
    return p;
  } catch {
    return base;
  }
}

export const lvl = (p: Profile, id: string): number => p.nodes[id] ?? 0;

export function nodeCost(id: string, level: number): number {
  const n = TREE.find((t) => t.id === id)!;
  return Math.ceil(n.cost * Math.pow(n.growth, level));
}

export function nodeLockedByKey(p: Profile, id: string): boolean {
  const n = TREE.find((t) => t.id === id)!;
  return (n.key ?? 0) > p.keyUnlocked;
}

export function nodeAvailable(p: Profile, id: string): boolean {
  const n = TREE.find((t) => t.id === id)!;
  if (nodeLockedByKey(p, id)) return false;
  return n.requires.length === 0 || n.requires.some((r) => lvl(p, r) > 0);
}

export function canBuy(p: Profile, id: string): boolean {
  const n = TREE.find((t) => t.id === id);
  if (!n) return false;
  const l = lvl(p, id);
  if (l >= n.max || !nodeAvailable(p, id)) return false;
  const c = nodeCost(id, l);
  return n.score ? p.scores >= c : p.notes >= c;
}

export function buyNode(p: Profile, id: string): boolean {
  if (!canBuy(p, id)) return false;
  const n = TREE.find((t) => t.id === id)!;
  const l = lvl(p, id);
  const c = nodeCost(id, l);
  if (n.score) p.scores -= c;
  else p.notes -= c;
  p.nodes[id] = l + 1;
  return true;
}

export interface Stats {
  dmg: number;
  width: number;
  crit: number;
  critMul: number;
  speedBonus: number;
  stamina: number;
  staminaRegen: number;
  hitCost: number;
  killStamina: number;
  beatMul: number;
  beatWindow: number;
  enemySpeed: number;
  bpmDelta: number;
  chordDmg: number;
  chordRadius: number;
  arpeggio: boolean;
  lyraHp: number;
  lyraRegen: number;
  lyraShield: number;
  lyraCry: boolean;
  notesMul: number;
  xpMul: number;
  spawnMul: number;
  rerolls: number;
  startMotifs: number;
  choices: number;
  chords: ChordDef[];
  motifPool: MotifId[];
}

export function computeStats(p: Profile): Stats {
  const L = (id: string) => lvl(p, id);
  const chords = CHORDS.filter((c) => !c.node || L(c.node) > 0);
  const motifPool = (Object.keys(MOTIFS) as MotifId[]).filter((m) => !MOTIFS[m].node || L(MOTIFS[m].node!) > 0);
  return {
    dmg: (1 + 0.2 * L("root")) * (1 + 0.15 * L("m_dmg")) * (1 + 0.4 * L("m_dmg2")),
    width: 1 + 0.12 * L("m_width"),
    crit: 0.04 * L("m_crit"),
    critMul: 2 + 0.3 * L("m_critd"),
    speedBonus: 0.3 + 0.1 * L("m_speed"),
    stamina: 100 + 15 * L("f_max") + 40 * L("f_max2"),
    staminaRegen: 1 + 0.12 * L("f_regen"),
    hitCost: Math.pow(0.94, L("f_cost")),
    killStamina: 2 * L("f_second"),
    beatMul: 1.5 + 0.25 * L("r_mul") + 0.6 * L("r_mul2"),
    beatWindow: 1 + 0.15 * L("r_window"),
    enemySpeed: Math.pow(0.96, L("r_march")),
    bpmDelta: -4 * L("r_metro"),
    chordDmg: 1 + 0.2 * L("h_dmg"),
    chordRadius: 1 + 0.12 * L("h_radius"),
    arpeggio: L("h_arp") > 0,
    lyraHp: 100 * (1 + 0.2 * L("l_hp")) * (1 + 0.5 * L("l_hp2")),
    lyraRegen: 0.5 * L("l_regen"),
    lyraShield: 15 * L("l_shield"),
    lyraCry: L("l_cry") > 0,
    notesMul: 1 + 0.12 * L("p_notes"),
    xpMul: 1 + 0.12 * L("p_xp"),
    spawnMul: 1 + 0.12 * L("p_spawn"),
    rerolls: L("p_reroll"),
    startMotifs: L("p_start"),
    choices: L("p_choice") ? 4 : 3,
    chords,
    motifPool,
  };
}
