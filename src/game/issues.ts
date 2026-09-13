/**
 * AS MISSÕES.
 *
 * Um encargo não é uma linha de tabela: é alguém com nome pedindo alguma coisa
 * por um motivo. A mecânica — destino, prazo, recompensa — continua vindo de
 * `contracts.ts`, que sabe o que é justo. O que este arquivo faz é dar a esse
 * esqueleto uma boca: quem pede, por quê, o que está em jogo, e como a pessoa
 * agradece quando você volta.
 *
 * Tudo é determinístico a partir do id do contrato, então o mesmo serviço é
 * sempre a mesma história — e recarregar a página não troca o enredo.
 */
import { poiById } from "../world/valdoria";
import { holdingFor } from "../data/holdings";
import { bystanderName, hashText, notablesAt, type Notable } from "../data/notables";
import { contractsAt } from "./contracts";
import { getState, type GameState } from "./store";
import type { Contract } from "./adventureState";
import type { AgentClass } from "../world/types";

export type Issue = {
  contract: Contract;
  notable: Notable;
  title: string;
  /** O que a pessoa conta antes de pedir. Uma fala por vez. */
  beats: string[];
  /** O pedido em si — dito junto com prazo e paga. */
  ask: string;
  /** O que ela diz quando você entrega. */
  thanks: string;
};

type Template = {
  title: (v: Vars) => string;
  beats: (v: Vars) => string[];
  ask: (v: Vars) => string;
  thanks: (v: Vars) => string;
};
type Vars = { place: string; destination: string; who: string; other: string; hours: string };

const MILITARY: Template[] = [
  {
    title: (v) => `O silêncio de ${v.destination}`,
    beats: (v) => [
      `Mandei ${v.other} com a patrulha da semana passada e não voltou ninguém. Nem homem, nem cavalo, nem recado.`,
      `Pode ser nada. Neve, eixo quebrado, um sargento bêbado. Mas ${v.place} dorme melhor sabendo, e eu não posso tirar mais gente da muralha para ir ver.`,
    ],
    ask: (v) => `Vá até ${v.destination} e entregue esta ordem em mão à guarnição. Se ela ainda existir, você saberá. Se não existir, volte correndo.`,
    thanks: () => `Então a guarnição está de pé. Ótimo. Durmo esta noite. Tome — você ganhou.`,
  },
  {
    title: () => `Uma dívida de sangue`,
    beats: (v) => [
      `Três noites atrás uns homens levaram o gado de ${v.other} e cortaram a cerca por gosto. Não eram ladrões de fome: eram ladrões com bandeira.`,
      `Não posso acusar uma Casa sem prova, e prova é justamente o que este bilhete carrega.`,
    ],
    ask: (v) => `Leve isto ao posto em ${v.destination}. Se chegar lacrado, alguém vai ter de responder. ${v.hours} de estrada.`,
    thanks: () => `Lacrado. Você tem mão firme. A partir de hoje meu nome responde pelo seu por aqui.`,
  },
  {
    title: (v) => `O recruta de ${v.place}`,
    beats: (v) => [
      `O filho de ${v.other} assentou praça e marchou faz dois meses. A mãe pergunta por ele toda manhã, e toda manhã eu minto.`,
      `Não tenho um homem de sobra para mandar perguntar, e não tenho coragem de mandar a mãe.`,
    ],
    ask: (v) => `Leve esta carta ao comando em ${v.destination} e volte com o nome dele numa lista — qualquer lista. Até a lista dos mortos serve; incerteza é pior.`,
    thanks: () => `Você trouxe uma resposta. É mais do que eu consegui em dois meses. A mãe dele vai saber de onde veio.`,
  },
];

const TRADE: Template[] = [
  {
    title: (v) => `A encomenda de ${v.other}`,
    beats: (v) => [
      `${v.other} pagou adiantado por um lote que devia sair semana passada. O carroceiro que eu tinha quebrou a perna descendo do próprio banco.`,
      `Se a carga não chegar a ${v.destination} no prazo, devolvo o dinheiro e perco o freguês — e freguês perdido não volta.`,
    ],
    ask: (v) => `Leve o volume. Cabe na sua bagagem, não pesa, e não é da sua conta o que tem dentro. ${v.hours} de estrada.`,
    thanks: () => `Chegou inteiro e no prazo. Você não faz ideia do quanto isso vale para mim. Está pago — e bem pago.`,
  },
  {
    title: () => `Preço de mercado`,
    beats: (v) => [
      `Todo mundo em ${v.place} vende pelo que o vizinho vende, e o vizinho vende pelo que ouviu falar. É assim que se empobrece devagar.`,
      `Quero saber quanto custa o grão em ${v.destination} hoje — não mês passado, não segundo um primo. Hoje, assinado por quem vende.`,
    ],
    ask: () => `Leve esta carta ao corretor de lá e traga a resposta dele. Quem sabe o preço primeiro compra melhor, e eu divido o que ganhar.`,
    thanks: () => `Números frescos. Vou comprar antes da feira e ninguém vai entender por quê. Sua parte está aqui.`,
  },
  {
    title: () => `Uma sociedade que azedou`,
    beats: (v) => [
      `Fui sócio de ${v.other} por onze anos. No décimo segundo ele foi morar em ${v.destination} e parou de responder cartas.`,
      `Não quero briga. Quero o que é meu, escrito e assinado, antes que um advogado coma os dois lados.`,
    ],
    ask: (v) => `Entregue este acerto em mão e não saia de lá sem a assinatura. ${v.hours} de viagem, e uma boa conversa no fim.`,
    thanks: () => `Assinado. Onze anos terminam com uma folha de papel. Obrigado por não ter deixado virar briga.`,
  },
];

const POLITICS: Template[] = [
  {
    title: () => `Palavras que não se gritam`,
    beats: (v) => [
      `Existe uma conversa acontecendo sobre ${v.place} da qual ${v.place} não foi convidado a participar.`,
      `Tenho uma carta que muda essa conversa. O que não tenho é alguém em quem eu confie para carregá-la.`,
    ],
    ask: (v) => `Leve-a a ${v.destination}. Selo intacto. Se o selo estiver quebrado quando chegar, não se dê o trabalho de voltar.`,
    thanks: () => `Selo intacto. Você entende o valor de uma coisa fechada. Vou lembrar disso.`,
  },
  {
    title: (v) => `O casamento de ${v.other}`,
    beats: (v) => [
      `${v.other} vai casar com uma família de ${v.destination}, e o dote foi escrito por alguém mais esperto que os pais dela.`,
      `Se a cláusula do meio passar como está, a terra sai da região em uma geração. Ninguém aqui percebeu ainda. Eu percebi.`,
    ],
    ask: () => `Ponha esta emenda nas mãos do notário de lá antes que o contrato seja lido em voz alta.`,
    thanks: () => `Chegou a tempo. Uma linha de texto acaba de salvar mais terra do que um cerco. Poucos vão saber. Você sabe.`,
  },
  {
    title: () => `Um favor que se cobra depois`,
    beats: (v) => [
      `Quem manda em ${v.destination} me deve uma gentileza de dez anos atrás. Gentilezas guardadas demais azedam.`,
      `Vou cobrá-la agora, por escrito, com educação — e é a educação que precisa chegar junto.`,
    ],
    ask: (v) => `Leve a carta e observe a cara dele quando ler. Quero saber se ele hesitou. ${v.hours} de estrada.`,
    thanks: () => `Ele hesitou, então. Bom. Um homem que hesita ainda se lembra do que deve. Você ganhou mais que ouro hoje.`,
  },
];

const RELIGION: Template[] = [
  {
    title: () => `Os que passam a pé`,
    beats: (v) => [
      `Os peregrinos chegam a ${v.place} sem nada e saem com menos. Damos pão, damos telhado, e anotamos cada um num livro.`,
      `O abrigo de ${v.destination} precisa desse livro antes do inverno, ou vai receber gente sem saber quem já passou fome onde.`,
    ],
    ask: (v) => `Leve os registros e a bênção da casa. ${v.hours} de caminho. Ninguém o incomoda carregando isso.`,
    thanks: () => `O livro chegou. Nomes não se perdem quando alguém os carrega. Fique com isto, e volte quando precisar de abrigo.`,
  },
  {
    title: (v) => `A promessa de ${v.other}`,
    beats: (v) => [
      `${v.other} prometeu uma oferenda ao santuário de ${v.destination} se o filho sobrevivesse à febre. O filho sobreviveu.`,
      `Ela não pode mais caminhar até lá, e uma promessa que não chega é uma promessa que apodrece dentro de casa.`,
    ],
    ask: () => `Leve a oferenda por ela. Não é pesada. O que pesa é ela achar que ficou devendo.`,
    thanks: (v) => `Está entregue. Vou dizer a ${v.other} hoje mesmo. Ela vai chorar, e vai ser do bom tipo.`,
  },
  {
    title: () => `Uma morte sem testemunha`,
    beats: (v) => [
      `Um homem morreu na estrada perto daqui. Sem nome, sem bolsa, com uma medalha da casa de ${v.destination} no pescoço.`,
      `Alguém lá o conhecia. Alguém lá está esperando.`,
    ],
    ask: (v) => `Leve a medalha e conte como foi. É a coisa mais difícil que vou lhe pedir, e a mais barata de fazer. ${v.hours} de estrada.`,
    thanks: () => `Você contou direito. Deu à família uma sepultura para visitar. Isso não se paga, mas se agradece.`,
  },
];

const BY_CAREER: Record<AgentClass, Template[]> = {
  MILITARY: MILITARY,
  TRADE: TRADE,
  POLITICS: POLITICS,
  RELIGION: RELIGION,
};

function build(contract: Contract, notable: Notable): Issue {
  const bank = BY_CAREER[contract.career];
  const template = bank[hashText(contract.id) % bank.length];
  const vars: Vars = {
    place: poiById.get(contract.sourceId)?.name ?? "este lugar",
    destination: poiById.get(contract.destinationId)?.name ?? "outro lugar",
    who: notable.name,
    other: bystanderName(contract.id),
    hours: `${Math.round(contract.travelHours)} horas`,
  };
  return {
    contract,
    notable,
    title: template.title(vars),
    beats: template.beats(vars),
    ask: template.ask(vars),
    thanks: template.thanks(vars),
  };
}

/**
 * O que cada pessoa de um lugar tem para oferecer. Uma pessoa, um serviço —
 * como quando se pergunta a alguém em vez de ler um mural.
 */
export function issuesAt(poiId: string, s: GameState = getState()): Issue[] {
  const poi = poiById.get(poiId);
  if (!poi) return [];
  const people = notablesAt(poiId, holdingFor(poi).kind);
  const offers = contractsAt(poiId, s);
  const out: Issue[] = [];
  for (const notable of people) {
    const match = offers.find((c) => c.career === notable.career && !out.some((i) => i.contract.id === c.id));
    if (match) out.push(build(match, notable));
  }
  return out;
}

/** A história por trás do contrato em curso, para quem entrega poder ouvir. */
export function issueOf(contract: Contract): Issue | null {
  const poi = poiById.get(contract.sourceId);
  if (!poi) return null;
  const people = notablesAt(contract.sourceId, holdingFor(poi).kind);
  const notable = people.find((n) => n.career === contract.career) ?? people[0];
  return notable ? build(contract, notable) : null;
}
