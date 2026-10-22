import { CHORDS, DUNGEONS, TREE, type ChordDef, type Currency } from "../data/content";

export interface Profile {
  version: number;
  notas: number;
  cristais: number;
  partituras: number;
  exp: number;
  nodes: Record<string, number>;
  /** maior masmorra liberada */
  unlocked: number;
  cleared: Record<string, boolean>;
  /** "dia": número de ensaios (partidas) */
  day: number;
  kills: number;
  chords: number;
  seen: Record<string, boolean>;
  introDone: boolean;
  muted: boolean;
}

export const SAVE_KEY = "dissonancia-v2";

export function newProfile(): Profile {
  return { version: 2, notas: 0, cristais: 0, partituras: 0, exp: 0, nodes: { corte: 1 }, unlocked: 0, cleared: {}, day: 0, kills: 0, chords: 0, seen: {}, introDone: false, muted: false };
}

export function loadProfile(raw: string | null): Profile {
  const base = newProfile();
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as Partial<Profile>;
    const p: Profile = { ...base, ...d, nodes: { ...base.nodes, ...(d.nodes ?? {}) }, cleared: { ...(d.cleared ?? {}) }, seen: { ...(d.seen ?? {}) } };
    for (const k of Object.keys(p.nodes)) {
      const n = TREE.find((t) => t.id === k);
      if (!n) delete p.nodes[k];
      else p.nodes[k] = Math.max(0, Math.min(n.max, Math.floor(Number(p.nodes[k]) || 0)));
    }
    for (const f of ["notas", "cristais", "partituras", "exp"] as const) if (!isFinite(p[f]) || p[f] < 0) p[f] = 0;
    p.unlocked = Math.max(0, Math.min(DUNGEONS.length - 1, Math.floor(p.unlocked || 0)));
    return p;
  } catch {
    return base;
  }
}

export const lvl = (p: Profile, id: string): number => p.nodes[id] ?? 0;

/** nível da conta pela EXP: 50, 120, 210… */
export function level(exp: number): { lvl: number; cur: number; next: number } {
  let l = 1;
  let need = 50;
  let e = exp;
  while (e >= need) {
    e -= need;
    l++;
    need = Math.round(50 + (l - 1) * 70 * Math.pow(1.08, l));
  }
  return { lvl: l, cur: e, next: need };
}

export function nodeCost(id: string, l: number): number {
  const n = TREE.find((t) => t.id === id)!;
  return Math.ceil(n.cost * Math.pow(n.growth, l));
}

/** visível = comprado ou vizinho de um comprado (o resto aparece como "?") */
export function nodeVisible(p: Profile, id: string): boolean {
  const n = TREE.find((t) => t.id === id)!;
  return lvl(p, id) > 0 || !n.from || lvl(p, n.from) > 0;
}

export function canBuy(p: Profile, id: string): boolean {
  const n = TREE.find((t) => t.id === id);
  if (!n || !nodeVisible(p, id)) return false;
  const l = lvl(p, id);
  return l < n.max && p[n.cur] >= nodeCost(id, l);
}

export function buyNode(p: Profile, id: string): boolean {
  if (!canBuy(p, id)) return false;
  const n = TREE.find((t) => t.id === id)!;
  const l = lvl(p, id);
  p[n.cur] -= nodeCost(id, l);
  p.nodes[id] = l + 1;
  return true;
}

export const CUR_NAME: Record<Currency, string> = { notas: "notas", cristais: "cristais", partituras: "partituras" };

export interface Stats {
  dmg: number;
  multiHit: number;
  armorDmg: number;
  execute: number;
  markChance: number;
  flow: boolean;
  gliss: number;
  vigor: number;
  vigorRegen: number;
  hitCost: number;
  killVigor: number;
  circle: boolean;
  circleDmg: number;
  circleCd: number;
  beatMul: number;
  beatWindow: number;
  chordMul: number;
  scales: boolean;
  titoHp: number;
  batuque: boolean;
  titoRegen: number;
  notasMul: number;
  cristaisMul: number;
  expMul: number;
  spawnMul: number;
  chords: ChordDef[];
}

export function computeStats(p: Profile): Stats {
  const L = (id: string) => lvl(p, id);
  const acct = level(p.exp).lvl;
  return {
    dmg: (1 + 0.2 * L("corte")) * (1 + 0.15 * L("fio")) * (1 + 0.02 * (acct - 1)),
    multiHit: 0.08 * L("acertos"),
    armorDmg: 1 + 0.3 * L("quebra"),
    execute: L("execucao") ? 0.05 + 0.03 * L("execucao") : 0,
    markChance: 0.06 + 0.05 * L("marcados"),
    flow: L("fluxo") > 0,
    gliss: 0.4 * L("gliss"),
    vigor: 100 + 15 * L("vigor"),
    vigorRegen: 1 + 0.15 * L("folego"),
    hitCost: Math.pow(0.93, L("leveza")),
    killVigor: 2 * L("segundo"),
    circle: L("ciclo") > 0,
    circleDmg: 1 + 0.4 * L("ciclo2"),
    circleCd: 8 - L("ciclo2"),
    beatMul: 1.25 + 0.2 * L("tempo"),
    beatWindow: 1 + 0.2 * L("ouvido"),
    chordMul: 1 + 0.25 * L("acorde"),
    scales: L("escala") > 0,
    titoHp: 100 * (1 + 0.2 * L("tambor")),
    batuque: L("batuque") > 0,
    titoRegen: 0.6 * L("cura"),
    notasMul: 1 + 0.12 * L("gorjeta"),
    cristaisMul: 1 + 0.2 * L("afinacao"),
    expMul: 1 + 0.15 * L("estudo"),
    spawnMul: 1 + 0.15 * L("plateia"),
    chords: CHORDS.filter((c) => !c.node || L(c.node) > 0),
  };
}
