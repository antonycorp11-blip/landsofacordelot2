import { ownerOf, priceFor, purchaseAt, BUY_RELATION } from "../data/fiefOwners";
import { fiefById } from "../world/fiefs";
import { makeRng } from "../world/geo";
import type { HouseId } from "../world/types";
import { currentDay } from "./diplomacy";
import { getState, update, type GameState } from "./store";

export function offeredPrice(fiefId: string): number { return Math.round(priceFor(fiefId) * .78); }
export function negotiateChance(s: GameState, fiefId: string): number {
  const owner = ownerOf(fiefId) as HouseId;
  return Math.max(10, Math.min(85, Math.round(20 + (s.houseRelations[owner] ?? 0) * .4 + s.attributes.diplomacy * 5 + s.attributes.stewardship * 3 + (s.skills.negociacao ?? 0) / 4)));
}
export function negotiateBlocker(s: GameState, fiefId: string): string | null {
  const fief = fiefById.get(fiefId);
  if (!fief || fief.tier === "nobre" || ownerOf(fiefId) === "player") return "A sede nobre não está à venda.";
  const owner=ownerOf(fiefId) as HouseId;
  if ((s.houseRelations[owner] ?? 0) < BUY_RELATION) return `A Casa exige relação ${BUY_RELATION} para ouvir a oferta.`;
  if (s.gold < offeredPrice(fiefId)) return `Precisa de ${offeredPrice(fiefId)} ouro para honrar a oferta.`;
  const attempts=s.storyFlags.filter(f=>f.startsWith(`fief:offer:${fiefId}:`)).map(f=>Number(f.split(":")[3])||0);
  const last=attempts.length?Math.max(...attempts):-Infinity;
  if (currentDay(s)-last<7) return "Depois de uma recusa, espere sete dias.";
  return null;
}
export function negotiateFief(fiefId: string): { success: boolean; chance: number; price: number } | null {
  const s=getState();
  if (negotiateBlocker(s,fiefId)) return null;
  const chance=negotiateChance(s,fiefId), price=offeredPrice(fiefId), day=currentDay(s), owner=ownerOf(fiefId) as HouseId;
  const success=makeRng(`fief:${s.heroId}:${fiefId}:${day}`)()*100<chance;
  if (success) purchaseAt(fiefId,price);
  update(g=>({ ...g, influence:Math.max(0,g.influence-(success?0:3)),
    houseRelations:{...g.houseRelations,[owner]:Math.max(-100,Math.min(100,(g.houseRelations[owner]??0)+(success?3:-6)))},
    storyFlags:[...g.storyFlags,`fief:offer:${fiefId}:${day}`] }));
  return {success,chance,price};
}
