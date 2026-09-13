/**
 * OS LÍDERES DAS CASAS.
 *
 * Personagens de verdade no modelo de dados, não texto dentro de um painel:
 * têm Casa, título, classe, onde estão e o que sentem pelo jogador. Quando os
 * lordes começarem a se mover pelo mapa, é este registro que muda de lugar —
 * nada no mapa precisa saber disso.
 *
 * BRASÃO e CLASSE são coisas diferentes: o brasão diz de que família a pessoa
 * é; a classe, qual é o seu ofício.
 */
import type { AgentClass, HouseId } from "../world/types";
import { fiefLords } from "./fiefLords";

export type CharacterStatus = "available" | "traveling" | "war" | "captured" | "dead";

export type Character = {
  id: string;
  name: string;
  houseId: HouseId;
  title: string;
  primaryClass: AgentClass;
  /** Afinidade secundária; o painel resumido mostra só a principal. */
  secondaryClass?: AgentClass;
  portraitAssetKey?: string;
  /** POI onde a pessoa está agora. */
  locationPoiId?: string;
  status: CharacterStatus;
  /** −100 a +100. Separado da relação com a Casa: pessoa não é instituição. */
  relationWithPlayer: number;
  description?: string;
};

export const characters: Character[] = [
  {
    id: "aldren_valdoria",
    name: "Protetor Aldren Valdória",
    houseId: "house_valdoria",
    title: "Protetor do Reino",
    primaryClass: "POLITICS",
    portraitAssetKey: "portrait_aldren_valdoria",
    locationPoiId: "castelo_real",
    status: "available",
    relationWithPlayer: 0,
    description: "Governa do Castelo Real. Não é rei, e sabe disso melhor que ninguém.",
  },
  {
    id: "garrick_karneth",
    name: "Lorde Garrick Karneth",
    houseId: "house_karneth",
    title: "Senhor das Marchas",
    primaryClass: "MILITARY",
    portraitAssetKey: "portrait_garrick_karneth",
    locationPoiId: "castelo_karneth",
    status: "available",
    relationWithPlayer: -18,
  },
  {
    id: "seraphine_aurenna",
    name: "Lady Seraphine Aurenna",
    houseId: "house_aurenna",
    title: "Senhora da Costa Dourada",
    primaryClass: "TRADE",
    secondaryClass: "POLITICS",
    portraitAssetKey: "portrait_seraphine_aurenna",
    locationPoiId: "castelo_de_aurimar",
    status: "available",
    relationWithPlayer: 12,
  },
  {
    id: "edran_silvarden",
    name: "Lorde Edran Silvarden",
    houseId: "house_silvarden",
    title: "Senhor de Elmwood",
    primaryClass: "POLITICS",
    portraitAssetKey: "portrait_edran_silvarden",
    locationPoiId: "castelo_verde",
    status: "available",
    relationWithPlayer: 5,
  },
  {
    id: "boran_dravenor",
    name: "Lorde Boran Dravenor",
    houseId: "house_dravenor",
    title: "Senhor do Passo",
    primaryClass: "MILITARY",
    portraitAssetKey: "portrait_boran_dravenor",
    locationPoiId: "fortaleza_pedra_cinza",
    status: "available",
    relationWithPlayer: -4,
  },
  {
    id: "tomas_elmwood",
    name: "Lorde Tomas Elmwood",
    houseId: "house_elmwood",
    title: "Senhor dos Campos Verdes",
    primaryClass: "TRADE",
    portraitAssetKey: "portrait_tomas_elmwood",
    locationPoiId: "castelo_de_campo_alto",
    status: "available",
    relationWithPlayer: 8,
  },
  {
    // Sem retrato: ver a lista de arte que falta em docs/casas.md.
    id: "cassian_caelmont",
    name: "Lorde-Príncipe Cassian Caelmont",
    houseId: "house_caelmont",
    title: "Lorde-Príncipe do Vale Sagrado",
    primaryClass: "POLITICS",
    secondaryClass: "RELIGION",
    locationPoiId: "luminaria",
    status: "available",
    relationWithPlayer: 0,
  },
  {
    id: "yseld_caelmont",
    name: "Arcebispa Yseld Caelmont",
    houseId: "house_caelmont",
    title: "Arcebispa de Luminária",
    primaryClass: "RELIGION",
    portraitAssetKey: "portrait_yseld_caelmont",
    locationPoiId: "catedral_de_luminaria",
    status: "available",
    relationWithPlayer: 3,
  },
  {
    id: "vaelor_morvath",
    name: "Lorde Vaelor Morvath",
    houseId: "house_morvath",
    title: "Senhor de Morvath",
    primaryClass: "POLITICS",
    portraitAssetKey: "portrait_vaelor_morvath",
    locationPoiId: "conselho_real",
    status: "available",
    relationWithPlayer: -9,
  },
  {
    id: "ilyra_veyr",
    name: "Lady Ilyra Veyr",
    houseId: "house_veyr",
    title: "Senhora de Veyr",
    primaryClass: "POLITICS",
    portraitAssetKey: "portrait_ilyra_veyr",
    locationPoiId: "pouso_dos_mercadores",
    status: "available",
    relationWithPlayer: 15,
  },
  {
    // O retrato entregue para esta Casa é de uma mulher; o nome do briefing é
    // de um homem. Mantive o nome do briefing e deixei o retrato de fora até
    // você decidir — ver docs/casas.md.
    id: "edric_rosethorne",
    name: "Lorde Edric Rosethorne",
    houseId: "house_rosethorne",
    title: "Senhor de Rosethorne",
    primaryClass: "TRADE",
    secondaryClass: "POLITICS",
    locationPoiId: "mercado_de_graos",
    status: "available",
    relationWithPlayer: 2,
  },
];

/**
 * Todo mundo com nome no reino: os líderes de Casa, escritos à mão, e os
 * trinta e cinco lordes de senhorio, gerados. Para o painel e para uma
 * audiência os dois são a mesma coisa.
 */
export const allCharacters: Character[] = [...characters, ...fiefLords];

export const characterById = new Map(allCharacters.map((c) => [c.id, c]));

export function leadersOf(houseId: HouseId): Character[] {
  return characters.filter((c) => c.houseId === houseId);
}

export function charactersOfHouse(houseId: HouseId): Character[] {
  return allCharacters.filter((c) => c.houseId === houseId);
}

/** Quem está neste local agora. Muda sozinho quando os lordes se moverem. */
export function charactersAt(poiId: string): Character[] {
  return allCharacters.filter((c) => c.locationPoiId === poiId && c.status !== "dead");
}

export const CLASS_LABEL: Record<AgentClass, string> = {
  MILITARY: "Militar",
  TRADE: "Comércio",
  POLITICS: "Política",
  RELIGION: "Religião",
};
