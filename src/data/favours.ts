/**
 * OS FAVORES DE ELMWOOD.
 *
 * O Arco I não se ganha perguntando: se ganha **sendo útil até ser recebido.**
 * Ninguém leva um forasteiro à mesa de um lorde, e as quatro pessoas que
 * olharam o selo são justamente as quatro que têm o que pedir.
 *
 * Cada favor manda o jogador a outro lugar da região e devolve uma coisa que
 * não é ouro: o nome dele passa a circular. Três favores feitos e o Castelo
 * Verde abre a porta — que é o fim do Arco I e o começo de tudo.
 *
 * Nada aqui é encargo gerado. São quatro pedidos escritos, de quatro pessoas
 * com nome, e cada um deixa o jogador sabendo mais do que sabia.
 */
import type { Reward } from "../game/experience";

export type Favour = {
  id: string;
  /** Quem pediu, em `storyPeople`. */
  from: string;
  /** A marca que a conversa com essa pessoa deixa. Sem ela o favor não existe. */
  needsFlag: string;
  /** O pedido, na voz de quem pede. */
  ask: string;
  /** Uma linha curta para a lista de destinos. */
  short: string;
  /** Onde se cumpre. */
  poiId: string;
  /** A cena de entrega. */
  sceneId: string;
  /** Marca deixada ao cumprir. */
  doneFlag: string;
  reward: Reward;
};

export const favours: Favour[] = [
  {
    id: "carta_halka",
    from: "aled_vern",
    needsFlag: "tem_carta_do_escrivao",
    ask: "«Leve a carta a Dona Halka, em Serenvale. Ela fecha os contratos de madeira da Casa, e é ela que decide quem o intendente recebe.»",
    short: "Entregar a carta de Aled a Dona Halka",
    poiId: "serenvale",
    sceneId: "favor_halka",
    doneFlag: "favor_halka_feito",
    reward: { xp: 120, influence: 8 },
  },
  {
    id: "carga_serraria",
    from: "ovid_marsh",
    needsFlag: "falou_com_mercador",
    ask: "«Tem uma carga minha parada na Grande Serraria há onze dias. O feitor diz que não recebeu ordem. Vá lá e traga ordem ou traga o motivo.»",
    short: "Descobrir por que a carga de Ovid não saiu da serraria",
    poiId: "grande_serraria",
    sceneId: "favor_serraria",
    doneFlag: "favor_serraria_feito",
    reward: { xp: 110, gold: 45, influence: 5 },
  },
  {
    id: "nome_do_morto",
    from: "irmao_bramm",
    needsFlag: "falou_com_sacerdote",
    ask: "«Aquele homem tinha gente em algum lugar. O correio para no Posto dos Caçadores. Deixe o nome dele lá, para que alguém possa parar de esperar.»",
    short: "Deixar o nome do mensageiro no correio do Posto dos Caçadores",
    poiId: "posto_dos_cacadores",
    sceneId: "favor_correio",
    doneFlag: "favor_correio_feito",
    reward: { xp: 100, influence: 10 },
  },
  {
    id: "desertor",
    from: "sargento_teln",
    needsFlag: "falou_com_guarda",
    ask: "«Sumiu um dos meus. Dizem que está em Folhaterra bebendo o soldo de três meses. Traga ele, ou traga notícia. Não me traga mentira.»",
    short: "Achar o guarda desertado de Teln, em Folhaterra",
    poiId: "folhaterra",
    sceneId: "favor_desertor",
    doneFlag: "favor_desertor_feito",
    reward: { xp: 130, gold: 30, influence: 6 },
  },
];

/** Quantos favores abrem a porta do Castelo Verde. */
export const FAVOURS_FOR_AUDIENCE = 3;

export const favourById = new Map(favours.map((f) => [f.id, f]));

/** Pedidos que ele já ouviu e ainda não cumpriu. */
export function openFavours(flags: string[]): Favour[] {
  return favours.filter((f) => flags.includes(f.needsFlag) && !flags.includes(f.doneFlag));
}

export function favoursDone(flags: string[]): number {
  return favours.filter((f) => flags.includes(f.doneFlag)).length;
}

/** O que se pode entregar aqui, agora. */
export function favourAt(poiId: string, flags: string[]): Favour | undefined {
  return openFavours(flags).find((f) => f.poiId === poiId);
}

/** A porta do lorde. */
export function audienceOpen(flags: string[]): boolean {
  return favoursDone(flags) >= FAVOURS_FOR_AUDIENCE;
}
