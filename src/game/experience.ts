/**
 * GANHO DE EXPERIÊNCIA, CARREIRA E INFLUÊNCIA.
 *
 * Três moedas que NÃO se convertem entre si, e uma porta de entrada para cada.
 * Quem concede uma recompensa chama daqui — e é por isso que amanhã dá para
 * mudar a curva inteira num lugar só.
 */
import { clampAttribute, clampSkill, maxTroops, xpToNextLevel, MAX_LEVEL, SKILL_POINT_VALUE } from "./progression";
import { getState, update, type GameState } from "./store";
import type { SkillId } from "../data/skills";
import type { Attributes } from "../data/heroes";
import type { AgentClass, HouseId } from "../world/types";

/** De onde veio o XP. Serve para o registro e, depois, para achados por fonte. */
export type XpSource =
  | "missao" | "evento" | "descoberta" | "comercio" | "negociacao"
  | "combate" | "politica" | "religiao" | "exploracao";

export type LevelUp = { from: number; to: number; attributePoints: number; skillPoints: number };

/**
 * Concede XP geral e resolve quantos níveis isso vale.
 *
 * Devolve o salto de nível quando houve um, para a interface poder avisar —
 * subir de nível sem o jogador perceber é pior do que não subir.
 */
export function grantXp(amount: number, _source: XpSource): LevelUp | null {
  if (amount <= 0) return null;
  const before = getState().level;
  let gainedAttr = 0;
  let gainedSkill = 0;

  update((s) => {
    const next = withReward(s, { xp: amount });
    gainedAttr = next.attributePoints - s.attributePoints;
    gainedSkill = next.skillPoints - s.skillPoints;
    return next;
  });

  const after = getState().level;
  return after > before ? { from: before, to: after, attributePoints: gainedAttr, skillPoints: gainedSkill } : null;
}

/** XP de carreira. Independente do nível: reconhecimento, não crescimento. */
export function grantCareerXp(career: AgentClass, amount: number) {
  if (amount <= 0) return;
  update((s) => ({ ...s, careerXp: { ...s.careerXp, [career]: s.careerXp[career] + Math.round(amount) } }));
}

/** Influência sobe e DESCE — é a única das três que pode ser perdida. */
export function grantInfluence(amount: number) {
  update((s) => ({ ...s, influence: Math.max(0, Math.round((s.influence + amount) * 10) / 10) }));
}

/** Ganho de habilidade pelo uso. Pequeno e frequente, sem moagem. */
export function gainSkill(id: SkillId, amount: number) {
  if (amount <= 0) return;
  update((s) => ({ ...s, skills: { ...s.skills, [id]: clampSkill((s.skills[id] ?? 0) + amount) } }));
}

/** Gasta um ponto de habilidade ganho por nível. */
export function spendSkillPoint(id: SkillId): boolean {
  const s = getState();
  if (s.skillPoints <= 0 || (s.skills[id] ?? 0) >= 100) return false;
  update((g) => ({
    ...g,
    skillPoints: g.skillPoints - 1,
    skills: { ...g.skills, [id]: clampSkill((g.skills[id] ?? 0) + SKILL_POINT_VALUE) },
  }));
  return true;
}

/** Gasta um ponto de atributo. Raro, e por isso confirmado pela interface. */
export function spendAttributePoint(key: keyof Attributes): boolean {
  const s = getState();
  if (s.attributePoints <= 0 || s.attributes[key] >= 10) return false;
  update((g) => ({
    ...g,
    attributePoints: g.attributePoints - 1,
    attributes: { ...g.attributes, [key]: clampAttribute(g.attributes[key] + 1) },
  }));
  return true;
}

/**
 * Recompensa de missão ou evento, no formato que os dois vão usar.
 *
 * Existe agora, vazio de conteúdo, para que quando missões chegarem elas não
 * precisem inventar um formato — e para que nenhuma delas mexa no estado por
 * fora.
 */
export type Reward = {
  xp?: number;
  gold?: number;
  food?: number;
  influence?: number;
  careerXp?: Partial<Record<AgentClass, number>>;
  skillXp?: Partial<Record<SkillId, number>>;
  houseRelation?: { houseId: string; amount: number };
  characterRelation?: { characterId: string; amount: number };
  localInfluence?: { poiId: string; amount: number };
  troops?: Partial<Record<string, number>>;
};

/** Estado do herói pronto para as fórmulas derivadas. */
export function derivedInput(s: GameState = getState()) {
  return {
    attributes: s.attributes,
    skills: s.skills,
    careerXp: s.careerXp,
    troops: s.troops,
    companions: Object.values(s.companions).filter((c) => c.status === "IN_PARTY").length,
  };
}

/** Atalho usado em vários lugares. */
export function troopLimit(s: GameState = getState()): number {
  return maxTroops(derivedInput(s));
}

/** Pure transaction shared by contracts and encounters. Claim IDs are committed by the caller. */
export function withReward(s: GameState, reward: Reward): GameState {
  let level = s.level;
  let xp = s.xp + Math.max(0, Math.round(reward.xp ?? 0));
  let attributePoints = s.attributePoints;
  let skillPoints = s.skillPoints;
  while (level < MAX_LEVEL && xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level++;
    skillPoints++;
    if (level % 2 === 1) attributePoints++;
  }
  const careerXp = { ...s.careerXp };
  for (const [career, amount] of Object.entries(reward.careerXp ?? {})) {
    careerXp[career as AgentClass] += Math.max(0, Math.round(amount ?? 0));
  }
  const skills = { ...s.skills };
  for (const [id, amount] of Object.entries(reward.skillXp ?? {})) {
    skills[id as SkillId] = clampSkill(skills[id as SkillId] + Math.max(0, amount ?? 0));
  }
  const houseRelations = { ...s.houseRelations };
  if (reward.houseRelation) {
    const id = reward.houseRelation.houseId as HouseId;
    houseRelations[id] = Math.max(-100, Math.min(100, (houseRelations[id] ?? 0) + reward.houseRelation.amount));
  }
  const companions = { ...s.companions };
  const relation = reward.characterRelation;
  if (relation && companions[relation.characterId]) {
    const c = companions[relation.characterId];
    companions[c.id] = { ...c, relation:Math.max(-100, Math.min(100, c.relation + relation.amount)) };
  }
  const localInfluence = { ...s.localInfluence };
  if (reward.localInfluence) {
    const { poiId, amount } = reward.localInfluence;
    localInfluence[poiId] = Math.max(0, Math.min(100, (localInfluence[poiId] ?? 0) + amount));
  }
  return { ...s, level, xp, attributePoints, skillPoints, skills, careerXp, companions, houseRelations, localInfluence,
    gold: Math.max(0, s.gold + Math.round(reward.gold ?? 0)),
    food: Math.max(0, s.food + Math.round(reward.food ?? 0)),
    influence: Math.max(0, Math.round((s.influence + (reward.influence ?? 0)) * 10) / 10),
  };
}
