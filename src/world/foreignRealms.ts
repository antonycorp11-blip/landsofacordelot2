/**
 * O QUE HÁ ALÉM DE VALDÓRIA.
 *
 * Valdória é UM reino, não o mundo. Existem outros, e o jogador não pode ir a
 * nenhum deles — a malha de estradas termina no litoral e nas serras, e não há
 * nó de rota fora do contorno do reino. Isso é limite de verdade, imposto pela
 * geografia, e não uma parede invisível.
 *
 * Mas limite não pode ser silêncio. Estes reinos existem como DADO desde já:
 * têm nome, direção, fama, relação com a Coroa e um rumor corrente. É daqui
 * que missões, notícias de fronteira, contrabando, exílio e guerra externa vão
 * puxar conteúdo sem precisar inventar o mundo na hora.
 *
 * `status` é o que separa o hoje do depois: tudo começa `fechado`. Abrir um
 * reino é mudar um campo — não é refazer o mapa.
 */
export type RealmStatus = "fechado" | "fronteira_aberta" | "em_guerra";

export type ForeignRealm = {
  id: string;
  name: string;
  /** Como o povo de Valdória chama o lugar. */
  epithet: string;
  /** Ângulo em graus a partir do centro do reino, no sentido da tela. */
  angle: number;
  /** Por onde se olha para lá. */
  throughRegion: string;
  knownFor: string;
  /** −100 a +100, do ponto de vista da Coroa de Valdória. */
  relation: number;
  status: RealmStatus;
  /** A conversa que corre nas estalagens. Semente de missão. */
  rumor: string;
};

export const foreignRealms: ForeignRealm[] = [
  {
    id: "tharn",
    name: "Tharn",
    epithet: "o Reino sob a Montanha",
    angle: -108,
    throughRegion: "Passo de Pedra Cinza",
    knownFor: "Ferro, forjas e companhias de mercenários que se vendem a quem pagar.",
    relation: -22,
    status: "fechado",
    rumor: "Dizem que Tharn comprou aço de Dravenor por três invernos seguidos, e ninguém sabe para armar quem.",
  },
  {
    id: "kelvhar",
    name: "Ermos de Kelvhar",
    epithet: "as Terras sem Senhor",
    angle: -25,
    throughRegion: "Marchas de Karneth",
    knownFor: "Clãs a cavalo, sem rei e sem trégua. As Marchas existem por causa deles.",
    relation: -58,
    status: "fechado",
    rumor: "Um cavaleiro de Karneth jura ter contado fogueiras demais para a estação do ano.",
  },
  {
    id: "solmonia",
    name: "Solmônia",
    epithet: "a Sé do Sul",
    angle: 42,
    throughRegion: "Vale Sagrado",
    knownFor: "Teocracia antiga. O Vale reza voltado para lá, e isso incomoda a Coroa.",
    relation: 14,
    status: "fechado",
    rumor: "Chegou um legado de Solmônia a Luminária, e a Arcebispa não disse a ninguém o que ele queria.",
  },
  {
    id: "mareth",
    name: "Cidades Livres de Mareth",
    epithet: "as Repúblicas do Mar",
    angle: 100,
    throughRegion: "Costa Dourada",
    knownFor: "Portos sem reis. Toda a prata que entra em Valdória passou por lá antes.",
    relation: 30,
    status: "fechado",
    rumor: "Um armador de Mareth anda oferecendo crédito barato demais no Grande Porto.",
  },
  {
    id: "avrenne",
    name: "Ávrenne",
    epithet: "o Reino Antigo",
    angle: 172,
    throughRegion: "Bosque de Elmwood",
    knownFor: "Rival de sempre. Houve três guerras, e a última terminou sem vencedor.",
    relation: -36,
    status: "fechado",
    rumor: "Ávrenne mandou embaixada ao Castelo Real e a Coroa ainda não respondeu.",
  },
];

export const realmById = new Map(foreignRealms.map((r) => [r.id, r]));

export function realmRelationLabel(value: number): string {
  if (value <= -50) return "Hostil";
  if (value <= -15) return "Tensa";
  if (value < 15) return "Fria";
  if (value < 45) return "Cordial";
  return "Aliada";
}

export const REALM_STATUS_LABEL: Record<RealmStatus, string> = {
  fechado: "Fronteira fechada",
  fronteira_aberta: "Fronteira aberta",
  em_guerra: "Em guerra",
};
