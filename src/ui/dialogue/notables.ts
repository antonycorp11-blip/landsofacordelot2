/**
 * QUEM ATENDE NUMA LOCALIDADE.
 *
 * Trabalho não vem de um quadro de avisos: vem de uma pessoa com nome, cargo
 * e um lugar onde ela fica. Quando o governante do sítio está presente, é com
 * ele que se fala. Quando não, cada tipo de estrutura tem quem receba um
 * forasteiro — o mestre da guilda no mercado, o capitão na torre, o ancião na
 * aldeia — e esse nome é SEMPRE o mesmo para aquele lugar, porque é gerado a
 * partir do id e não de um sorteio a cada abertura.
 */
import type { HoldingKind } from "../../data/holdings";
import type { AgentClass } from "../../world/types";

const ROLE: Record<HoldingKind, string> = {
  castle: "Senescal do castelo",
  city: "Mestre da guilda",
  town: "Mestre da guilda",
  village: "Ancião da aldeia",
  market: "Mestre do mercado",
  mine: "Capataz da lavra",
  port: "Mestre do porto",
  temple: "Guardião do templo",
  military: "Capitão da guarnição",
  estate: "Feitor da propriedade",
  site: "Morador do lugar",
};

/** Saudação de quem recebe: muda com o ofício, não com o humor. */
const GREETING: Record<HoldingKind, string> = {
  castle: "O senhor destas paredes não recebe qualquer um, mas eu recebo. Diga o que procura.",
  city: "Forasteiro. Na guilda tudo se resolve com trabalho ou com moeda. Qual dos dois você traz?",
  town: "Bem-vindo. Temos mais serviço do que braços, se é isso que você procura.",
  village: "Não temos muito, mas temos o que precisa ser feito. Sente-se, se quiser.",
  market: "Quem chega ao mercado quer vender, comprar ou carregar. Você tem cara de carregar.",
  mine: "Aqui é pedra e poeira. Se veio trabalhar, há trabalho. Se veio olhar, olhe rápido.",
  port: "A maré não espera e nem eu. Fale enquanto carrego.",
  temple: "A paz esteja no seu caminho. Precisa de abrigo, ou de um encargo?",
  military: "Identifique-se. Se não é inimigo, talvez seja útil.",
  estate: "As terras são do senhor, mas o serviço é meu. Diga.",
  site: "Não é lugar de parar muito tempo, este. O que procura?",
};

const FIRST = ["Aldo", "Bram", "Cedric", "Dorn", "Esmer", "Fenwick", "Gareth", "Hedda", "Ilsa", "Joran", "Kellan", "Lorwyn", "Maeve", "Norvel", "Orla", "Perrin", "Quenna", "Rowan", "Sable", "Tybald"];
const LAST = ["Brackwater", "Crowe", "Dunmoor", "Ferrow", "Greaves", "Hollis", "Ironsel", "Lowmarch", "Mereth", "Oakhand", "Pell", "Rushmill", "Standen", "Thorne", "Vance", "Westby"];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export type Notable = { name: string; role: string; greeting: string };

export function notableFor(poiId: string, kind: HoldingKind): Notable {
  const h = hash(poiId);
  return {
    name: `${FIRST[h % FIRST.length]} ${LAST[(h >>> 8) % LAST.length]}`,
    role: ROLE[kind],
    greeting: GREETING[kind],
  };
}

/**
 * Como um nome recebe um forasteiro.
 *
 * Muda com o ofício — um capitão não fala como um sacerdote — e com o que a
 * pessoa sente pelo jogador. É o mesmo dado de relação que o painel mostra,
 * dito em voz alta.
 */
const BY_CLASS: Record<AgentClass, string> = {
  MILITARY: "Fale rápido e fale direito. Tenho homens esperando ordem.",
  TRADE: "Tempo é dinheiro, e o seu já está me custando. Diga.",
  POLITICS: "Sente-se. Toda conversa nesta sala acaba custando alguma coisa a alguém.",
  RELIGION: "Que a Luz o acompanhe. Diga o que o traz até aqui.",
};

export function lordGreeting(primaryClass: AgentClass, relation: number): string {
  if (relation <= -15) return "Não me lembro de tê-lo mandado chamar. Seja breve.";
  if (relation >= 25) return "Você outra vez. Isso, por aqui, já é quase amizade. Sente-se.";
  return BY_CLASS[primaryClass];
}
