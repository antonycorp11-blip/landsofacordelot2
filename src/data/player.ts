/**
 * O JOGADOR, do ponto de vista político.
 *
 * Ainda não há Casa própria — `houseId` é `null` e é por isso que nenhuma
 * estrutura mostra as ações de administração. O dia em que o jogador fundar ou
 * herdar uma Casa, basta este campo mudar.
 *
 * Duas coisas DIFERENTES vivem aqui, e não podem ser confundidas:
 *  - RELAÇÃO COM A CASA: o que a instituição pensa de você, em todo o reino.
 *  - INFLUÊNCIA LOCAL: o peso que você tem NAQUELE lugar, um por estrutura.
 * Dá para ser bem-visto pela Casa Aurenna e não valer nada num porto dela.
 */
import type { HouseId } from "../world/types";

export type PlayerState = {
  name: string;
  /** Casa do jogador, quando existir. Governa as permissões de gestão. */
  houseId: HouseId | null;
  /** −100 a +100 por Casa. */
  houseRelations: Partial<Record<HouseId, number>>;
  /** 0 a 100 por estrutura, sobrescrevendo o valor inicial do local. */
  localInfluence: Record<string, number>;
};

export const player: PlayerState = {
  name: "Viajante",
  houseId: null,
  houseRelations: {
    house_valdoria: 0,
    house_karneth: -18,
    house_aurenna: 12,
    house_silvarden: 5,
    house_dravenor: -4,
    house_elmwood: 8,
    house_caelmont: 3,
    house_morvath: -9,
    house_veyr: 15,
    house_rosethorne: 2,
  },
  localInfluence: {},
};

export function relationWith(houseId: HouseId): number {
  return player.houseRelations[houseId] ?? 0;
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
  return player.houseId !== null && player.houseId === ownerHouseId;
}
