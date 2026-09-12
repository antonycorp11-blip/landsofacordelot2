/**
 * O JOGADOR, do ponto de vista político.
 *
 * Fachada fina sobre `game/store.ts`. Existia antes como um objeto solto; com
 * a campanha tendo estado de verdade, manter dois lugares guardando relação e
 * influência seria o começo de um bug que só aparece depois de salvar.
 *
 * Duas coisas DIFERENTES, e elas não se misturam:
 *  - RELAÇÃO COM A CASA: o que a instituição pensa de você, em todo o reino.
 *  - INFLUÊNCIA LOCAL: o seu peso NAQUELE lugar, um número por estrutura.
 * Dá para ser bem-visto pela Casa Aurenna e não valer nada num porto dela.
 */
import { getState } from "../game/store";
import type { HouseId } from "../world/types";

/** Casa do jogador. `null` até ele fundar ou herdar uma — governa as permissões. */
export function playerHouseId(): HouseId | null {
  return null;
}

export function relationWith(houseId: HouseId): number {
  return getState().houseRelations[houseId] ?? 0;
}

export function localInfluenceAt(poiId: string): number | undefined {
  return getState().localInfluence[poiId];
}

/** Rótulo humano para uma relação de −100 a +100. */
export function relationLabel(value: number): string {
  if (value <= -60) return "Inimiga";
  if (value <= -25) return "Hostil";
  if (value < -5) return "Desconfiada";
  if (value <= 5) return "Neutra";
  if (value < 25) return "Cordial";
  if (value < 60) return "Amistosa";
  return "Aliada";
}

/** `true` quando a estrutura pertence à Casa do jogador. */
export function ownsHolding(ownerHouseId: HouseId): boolean {
  const mine = playerHouseId();
  return mine !== null && mine === ownerHouseId;
}

/** Compatibilidade com quem lia `player.localInfluence` direto. */
export const player = {
  get houseId() { return playerHouseId(); },
  get gold() { return getState().gold; },
  get influence() { return getState().influence; },
  get localInfluence() { return getState().localInfluence; },
  get houseRelations() { return getState().houseRelations; },
};
