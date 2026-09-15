import { marriageCandidates } from "../data/dynasty";
import { makeRng } from "../world/geo";
import type { HouseId } from "../world/types";
import { playerFiefCount } from "./allegiance";
import { getState, update, type GameState } from "./store";

const MARRIAGE_GOLD = 150;
const MARRIAGE_INFLUENCE = 15;
const PACT_GOLD = 100;
const PACT_INFLUENCE = 12;

export function currentDay(s: GameState): number { return Math.max(s.dayProcessed, Math.floor((s.journey?.hours ?? 0) / 24) + 1); }
export function marriageOf(s: GameState) {
  const flag = s.storyFlags.find(f => f.startsWith("dynasty:married:"));
  return marriageCandidates.find(c => flag === `dynasty:married:${c.id}`) ?? null;
}
export function pactUntil(s: GameState, houseId: HouseId): number {
  return Math.max(0, ...s.storyFlags.filter(f => f.startsWith(`dynasty:pact:${houseId}:`)).map(f => Number(f.split(":")[3]) || 0));
}
export function pactActive(s: GameState, houseId: HouseId, day = currentDay(s)) { return pactUntil(s, houseId) >= day; }
function lastAttempt(s: GameState, key: string) {
  const attempts=s.storyFlags.filter(f => f.startsWith(`dynasty:attempt:${key}:`)).map(f => Number(f.split(":")[4]) || 0);
  return attempts.length ? Math.max(...attempts) : -Infinity;
}
function clampChance(v: number) { return Math.max(8, Math.min(92, Math.round(v))); }
function warWith(s: GameState, houseId: HouseId) { return s.wars.some(w => (w.a === "player" && w.b === houseId) || (w.b === "player" && w.a === houseId)); }
export function marriageChance(s: GameState, candidateId: string): number {
  const c = marriageCandidates.find(p => p.id === candidateId);
  if (!c) return 0;
  return clampChance(20 + (s.houseRelations[c.houseId] ?? 0) * .35 + s.attributes.diplomacy * 5 + (s.skills.persuasao ?? 0) / 5 + (s.skills.diplomacia ?? 0) / 4);
}
export function marriageBlocker(s: GameState, candidateId: string): string | null {
  const c = marriageCandidates.find(p => p.id === candidateId);
  if (!c) return "Pessoa indisponível.";
  if (marriageOf(s)) return "Você já tem um compromisso matrimonial.";
  if (s.level < 2) return "Alcance o nível 2 para ser recebido pela família.";
  if ((s.houseRelations[c.houseId] ?? 0) < 25) return "A Casa exige relação 25.";
  if (warWith(s, c.houseId)) return "Não se propõe casamento em plena guerra.";
  if (s.gold < MARRIAGE_GOLD || s.influence < MARRIAGE_INFLUENCE) return `Precisa de ${MARRIAGE_GOLD} ouro e ${MARRIAGE_INFLUENCE} influência.`;
  if (currentDay(s) - lastAttempt(s, `marriage:${candidateId}`) < 7) return "Uma recusa precisa de sete dias antes de nova proposta.";
  return null;
}
export function proposeMarriage(candidateId: string): { success: boolean; chance: number } | null {
  const s = getState();
  const c = marriageCandidates.find(p => p.id === candidateId);
  if (!c || marriageBlocker(s, candidateId)) return null;
  const day = currentDay(s);
  const chance = marriageChance(s, candidateId);
  const success = makeRng(`marriage:${s.heroId}:${candidateId}:${day}`)() * 100 < chance;
  update(g => ({ ...g,
    gold: g.gold - (success ? MARRIAGE_GOLD : 0),
    influence: Math.max(0, g.influence - (success ? MARRIAGE_INFLUENCE : 4)),
    houseRelations: { ...g.houseRelations, [c.houseId]: Math.max(-100, Math.min(100, (g.houseRelations[c.houseId] ?? 0) + (success ? 20 : -5))) },
    storyFlags: [...g.storyFlags, `dynasty:attempt:marriage:${candidateId}:${day}`,
      ...(success ? [`dynasty:married:${candidateId}`, `dynasty:pact:${c.houseId}:${day + 30}`] : [])],
  }));
  return { success, chance };
}

export function allianceChance(s: GameState, houseId: HouseId): number {
  return clampChance(25 + (s.houseRelations[houseId] ?? 0) * .4 + s.attributes.diplomacy * 6 + (s.skills.diplomacia ?? 0) / 4 + (marriageOf(s)?.houseId === houseId ? 20 : 0));
}
export function allianceBlocker(s: GameState, houseId: HouseId): string | null {
  if (s.allegiance.kind !== "independente") return "Só uma Casa soberana assina tratados próprios.";
  if (playerFiefCount(s) < 1) return "Uma aliança exige terra para defender.";
  if (pactActive(s, houseId)) return `Tratado vigente até o dia ${pactUntil(s, houseId)}.`;
  if (warWith(s, houseId)) return "A guerra exige paz antes de um tratado.";
  if ((s.houseRelations[houseId] ?? 0) < 40) return "A Casa exige relação 40.";
  if (s.gold < PACT_GOLD || s.influence < PACT_INFLUENCE) return `Precisa de ${PACT_GOLD} ouro e ${PACT_INFLUENCE} influência.`;
  if (currentDay(s) - lastAttempt(s, `pact:${houseId}`) < 5) return "Espere cinco dias antes de outra proposta.";
  return null;
}
export function proposeAlliance(houseId: HouseId): { success: boolean; chance: number } | null {
  const s = getState();
  if (allianceBlocker(s, houseId)) return null;
  const day = currentDay(s);
  const chance = allianceChance(s, houseId);
  const success = makeRng(`pact:${s.heroId}:${houseId}:${day}`)() * 100 < chance;
  update(g => ({ ...g,
    gold: g.gold - (success ? PACT_GOLD : 0),
    influence: Math.max(0, g.influence - (success ? PACT_INFLUENCE : 4)),
    houseRelations: { ...g.houseRelations, [houseId]: Math.max(-100, Math.min(100, (g.houseRelations[houseId] ?? 0) + (success ? 10 : -4))) },
    storyFlags: [...g.storyFlags, `dynasty:attempt:pact:${houseId}:${day}`,
      ...(success ? [`dynasty:pact:${houseId}:${day + 24}`] : [])],
  }));
  return { success, chance };
}
