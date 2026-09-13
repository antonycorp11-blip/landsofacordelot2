/**
 * O MIOLO DE UMA MISSÃO.
 *
 * Um encargo era: aceite, ande, entregue. Isso não é missão, é recado — e
 * quem joga percebe na segunda vez.
 *
 * Aqui cada encargo ganha TRÊS ATOS:
 *
 *   1. o pedido (já existia, em `issues.ts`);
 *   2. uma COMPLICAÇÃO no meio do caminho, que é sempre uma decisão ou uma
 *      briga — nunca um trecho de estrada a mais;
 *   3. um FECHO na entrega, onde você escolhe como se comporta, e a escolha
 *      muda o que você leva e o que pensam de você.
 *
 * A complicação é escolhida pelo OFÍCIO do encargo: uma escolta é emboscada,
 * uma carga é disputada, uma carta é tentadora, uma esmola encontra quem
 * precisa dela antes do destino. O ofício deixa de ser um rótulo e vira o
 * tipo de problema que você vai ter.
 */
import { poiById } from "../world/valdoria";
import { bystanderName } from "../data/notables";
import { holdingFor } from "../data/holdings";
import type { TroopCount } from "../data/troops";
import type { Contract } from "./adventureState";
import type { Reward } from "./experience";
import type { AgentClass, HouseId, TerrainType } from "../world/types";
import type { Attributes } from "../data/heroes";
import type { SkillId } from "../data/skills";
import type { GameState } from "./store";

export type QuestPhase = "a_caminho" | "entrega" | "fim";

/** Uma escolha do jogador dentro da missão. */
export type QuestOption = {
  id: string;
  label: string;
  /** Linha de apoio: o que custa, o que dá. */
  hint?: string;
  /** Exige ouro; sem ele a opção aparece desabilitada. */
  goldCost?: number;
  /** O que acontece, dito ao jogador depois de escolher. */
  result: string;
  reward?: Reward;
  /** Algumas falas dependem do personagem, e a chance é mostrada antes da escolha. */
  check?: { attribute: keyof Attributes; skill: SkillId; difficulty: number };
  failureResult?: string;
  failureReward?: Reward;
  failureFails?: boolean;
  /** Perde o encargo — a entrega deixa de ser possível. */
  fails?: boolean;
};

export type QuestBeat =
  | { kind: "escolha"; title: string; text: string; options: QuestOption[] }
  | { kind: "batalha"; title: string; text: string; enemyName: string; band: TroopCount; terrain?:TerrainType; onWin: string; onLose: string; loseReward?: Reward };

export type QuestState = {
  contractId: string;
  phase: QuestPhase;
  /** Beat esperando decisão. Trava a viagem enquanto existir. */
  pending: QuestBeat | null;
  /** Complicação já aconteceu? Uma por encargo. */
  complicated: boolean;
  /** O que o jogador escolheu, para o fecho poder se lembrar. */
  choices: string[];
  /** Um único dado por cena: fechar e abrir a tela não permite rolar novamente. */
  decisionRoll: number | null;
};

export function beginQuest(contract: Contract): QuestState {
  return { contractId: contract.id, phase: "a_caminho", pending: null, complicated: false, choices: [], decisionRoll:null };
}

export function questOptionChance(option: QuestOption, s: GameState): number {
  if (!option.check) return 1;
  const {attribute,skill,difficulty}=option.check;
  const percent=40+s.attributes[attribute]*6+s.skills[skill]*0.45-difficulty;
  return Math.max(.1,Math.min(.95,percent/100));
}

function houseOf(contract: Contract): HouseId {
  const poi = poiById.get(contract.sourceId);
  return poi ? holdingFor(poi).controllerHouseId : "house_valdoria";
}

/* ======================== ATO 2 — A COMPLICAÇÃO ======================== */

export function complicationFor(contract: Contract): QuestBeat {
  const who = bystanderName(`comp:${contract.id}`);
  const destination = poiById.get(contract.destinationId)?.name ?? "o destino";
  const house = houseOf(contract);

  const byCareer: Record<AgentClass, QuestBeat> = {
    /* Escolta vira emboscada. Alguém sabia do caminho. */
    MILITARY: {
      kind: "batalha",
      title: "Estavam esperando",
      text: `A curva é boa demais para uma emboscada, e eles sabiam disso antes de você. Não são bandidos de acaso: sabiam da patrulha, sabiam da hora. Alguém falou.`,
      enemyName: `Emboscada de ${who}`,
      band: { camponeses: 3, milicianos: 4, infantaria: 2 },
      onWin: "O último foge mancando. Entre os mortos há um distintivo que não devia estar aqui — e ele vai junto com o seu relatório.",
      onLose: "Vocês saem da curva com menos gente do que entraram, e o que você carregava ficou no chão.",
      loseReward: { gold: -25 },
    },

    /* Carga disputada: alguém paga mais para ela não chegar. */
    TRADE: {
      kind: "escolha",
      title: "Uma proposta na estrada",
      text: `Um homem bem vestido espera você sentado numa pedra, como quem marcou hora. Diz chamar-se ${who} e diz, sem rodeios, que o que você carrega vale mais não chegando a ${destination}. Põe as moedas na pedra antes de você responder.`,
      options: [
        {
          id: "vender",
          label: "Pegar o dinheiro.",
          hint: "Ouro agora · o encargo se perde e a Casa fica sabendo",
          result: "Você pega as moedas e ele leva o volume sem olhar para trás. O dinheiro é bom. A notícia corre mais rápido que ele.",
          reward: { gold: 90, influence: -3, houseRelation: { houseId: house, amount: -8 } },
          fails: true,
        },
        {
          id: "recusar",
          label: "A carga vai chegar.",
          hint: "Mantém o encargo · quem confiou fica sabendo disso também",
          result: "Ele guarda as moedas devagar, como quem não está acostumado. 'Então você é do tipo que entrega.' É a primeira coisa verdadeira que ele diz.",
          reward: { xp: 40, influence: 2, houseRelation: { houseId: house, amount: 3 } },
        },
        {
          id: "prender",
          label: "Descobrir quem o mandou.",
          hint: "Pressioná-lo sem sacar a espada",
          check: { attribute:"diplomacy", skill:"persuasao", difficulty:30 },
          result: `Você senta na pedra ao lado dele. Vinte minutos depois sabe quem paga, quanto paga e há quanto tempo. ${destination} vai querer ouvir isso mais do que quer a encomenda.`,
          reward: { xp: 70, influence: 5, skillXp: { diplomacia: 3 }, houseRelation: { houseId: house, amount: 5 } },
          failureResult: "Ele percebe a ameaça escondida na cortesia, levanta e vai embora sem dar nome algum. Você conserva a carga, mas deixa claro que tentou jogar um jogo maior.",
          failureReward: { xp:20, influence:-2, houseRelation:{houseId:house,amount:-2} },
        },
      ],
    },

    /* Carta lacrada: a tentação é o enredo. */
    POLITICS: {
      kind: "escolha",
      title: "O lacre cedeu",
      text: `A chuva da madrugada amoleceu a cera e o lacre soltou de um lado. Ninguém saberia. O papel está ali, aberto pela metade, e o que ele diz muda quem você é a partir de amanhã.`,
      options: [
        {
          id: "ler",
          label: "Ler.",
          hint: "Saber o que carrega · o lacre nunca mais é o mesmo",
          result: "São três nomes e uma data. Dois dos nomes você conhece. A data é a semana que vem. Você refaz a cera como dá, e segue com um peso a mais na bagagem.",
          reward: { xp: 60, influence: 4, skillXp: { intriga: 3 }, houseRelation: { houseId: house, amount: -4 } },
        },
        {
          id: "fechar",
          label: "Refazer o lacre sem olhar.",
          hint: "Quem entrega fechado é chamado de novo",
          result: "Você derrete a cera na chama e prensa com o polegar. Não ficou igual, mas ficou fechado — e é fechado que importa.",
          reward: { xp: 45, influence: 3, houseRelation: { houseId: house, amount: 6 } },
        },
        {
          id: "queimar",
          label: "Queimar a carta.",
          hint: "O encargo se perde · ninguém saberá o que havia nela",
          result: "O papel some em três segundos. O que estava escrito ali não vai acontecer por sua causa, e você nunca vai ter certeza se isso foi bom.",
          reward: { xp: 30, influence: -2 },
          fails: true,
        },
      ],
    },

    /* Provisões encontram quem precisa delas antes do destino. */
    RELIGION: {
      kind: "escolha",
      title: "Antes do destino",
      text: `Uma família à beira da estrada, três dias sem comer, com um menino que já não chora de tanto. O que você carrega daria para eles hoje — e faltaria em ${destination} amanhã.`,
      options: [
        {
          id: "dar",
          label: "Abrir a bagagem aqui.",
          hint: "Perde parte da paga · ganha o que não se compra",
          result: "A mãe não agradece; ela olha. É pior que agradecer. Você segue com a bagagem mais leve e o encargo menor do que era.",
          reward: { food: -4, gold: -20, influence: 8, xp: 55, skillXp: { caridade: 4 } },
        },
        {
          id: "seguir",
          label: "Seguir. O destino também espera.",
          hint: "Mantém a paga inteira",
          result: "Você segue. É a decisão certa por qualquer conta que se faça, e ela não fica mais leve por isso.",
          reward: { xp: 30, influence: -1 },
        },
        {
          id: "pagar",
          label: "Deixar moedas suas.",
          hint: "20 moedas do seu bolso · o encargo segue intacto",
          goldCost: 20,
          result: "Você tira do seu e deixa na mão do pai. Não resolve a semana deles, mas resolve o dia — e o que você carrega chega inteiro.",
          reward: { gold: -20, influence: 5, xp: 45, skillXp: { caridade: 2 } },
        },
      ],
    },
  };

  return byCareer[contract.career];
}

/* ========================== ATO 3 — O FECHO ============================ */

export function closingFor(contract: Contract, quest: QuestState): QuestBeat {
  const house = houseOf(contract);
  const destination = poiById.get(contract.destinationId)?.name ?? "o destino";
  const read = quest.choices.includes("ler");

  const byCareer: Record<AgentClass, QuestBeat> = {
    MILITARY: {
      kind: "escolha",
      title: "O relatório",
      text: `Em ${destination} perguntam como foi. O que você disser vira a versão oficial, e a versão oficial decide quem é culpado por quê.`,
      options: [
        { id: "verdade", label: "Contar exatamente como foi.", hint: "Menos glória · mais crédito com a Casa",
          result: "Você conta sem enfeite, inclusive as partes que não lhe favorecem. O oficial anota tudo, e olha para você uma vez a mais do que precisava.",
          reward: { influence: 4, houseRelation: { houseId: house, amount: 6 }, skillXp: { tatica: 2 } } },
        { id: "glória", label: "Deixar a história crescer um pouco.", hint: "Mais influência · a verdade tem donos",
          check: { attribute:"command", skill:"lideranca", difficulty:28 },
          result: "Você não mente; só não corrige. À noite a história já tem mais homens do que teve, e o seu nome no meio dela.",
          reward: { influence: 8, xp: 25, houseRelation: { houseId: house, amount: -2 } },
          failureResult: "O oficial pede números, nomes e posições. A história cresce até encontrar quem estava lá; então encolhe de uma vez e leva parte do seu crédito.",
          failureReward: { influence:-4, xp:10, houseRelation:{houseId:house,amount:-5} } },
      ],
    },
    TRADE: {
      kind: "escolha",
      title: "A conta",
      text: `A carga chegou inteira e no prazo. O representante abre a bolsa e espera você dizer quanto.`,
      options: [
        { id: "combinado", label: "O que foi combinado.", hint: "Palavra que vale é a que se repete",
          result: "Você diz o número do acordo e ele paga sem discutir. Depois anota o seu nome numa lista que não é a dos pagamentos.",
          reward: { gold: 10, influence: 3, houseRelation: { houseId: house, amount: 5 } } },
        { id: "mais", label: "Cobrar pela estrada difícil.", hint: "Mais ouro agora · menos vontade de chamar de novo",
          check: { attribute:"stewardship", skill:"negociacao", difficulty:27 },
          result: "Ele paga o que você pediu, porque precisa da carga. Paga olhando o volume, não você.",
          reward: { gold: 55, influence: -2, houseRelation: { houseId: house, amount: -4 } },
          failureResult: "Ele refaz a conta na sua frente, desconta atraso, risco e embalagem. Você recebe o combinado, mas sai da mesa tendo pedido mais e conseguido menos respeito.",
          failureReward: { influence:-3,houseRelation:{houseId:house,amount:-6} } },
      ],
    },
    POLITICS: {
      kind: "escolha",
      title: "A entrega",
      text: read
        ? `O destinatário quebra o que sobrou do lacre e lê. Você sabe o que está escrito. Ele ainda não sabe que você sabe.`
        : `O destinatário quebra o lacre e lê de pé, sem se sentar. Depois dobra o papel duas vezes e guarda no peito.`,
      options: read
        ? [
            { id: "calar", label: "Não dizer nada.", hint: "O que você sabe continua só seu",
              result: "Você recebe, agradece e sai. Três nomes e uma data continuam guardados onde ninguém procura.",
              reward: { influence: 5, xp: 30, skillXp: { intriga: 2 } } },
            { id: "avisar", label: "Dizer que leu.", hint: "Confiança agora · uma dívida depois",
              check: { attribute:"diplomacy", skill:"intriga", difficulty:25 },
              result: "'Eu li', você diz. Ele fica muito quieto por um tempo. Depois: 'Então você me deve um silêncio, e eu lhe devo um favor.'",
              reward: { influence: 3, houseRelation: { houseId: house, amount: 8 }, xp: 45 },
              failureResult: "Você confessa esperando cumplicidade. Ele ouve apenas violação. A bolsa chega, curta, e a porta abre antes que a conversa termine.",
              failureReward: { influence:-3,houseRelation:{houseId:house,amount:-8} } },
          ]
        : [
            { id: "sair", label: "Receber e sair.", hint: "Um trabalho limpo é um trabalho repetido",
              result: "Ele paga sem comentar o conteúdo, que é como se paga esse tipo de serviço.",
              reward: { gold: 15, influence: 4, houseRelation: { houseId: house, amount: 4 } } },
            { id: "perguntar", label: "Perguntar o que havia na carta.", hint: "Curiosidade tem preço",
              result: "'Papel', ele responde. É tudo que você vai levar dessa pergunta, e ele vai lembrar que você perguntou.",
              reward: { xp: 20, houseRelation: { houseId: house, amount: -3 } } },
          ],
    },
    RELIGION: {
      kind: "escolha",
      title: "A oferta",
      text: `O trabalho está feito. Empurram algumas moedas na sua direção, e é evidente que elas fazem falta a quem as empurra.`,
      options: [
        { id: "aceitar", label: "Aceitar a paga.", hint: "Quem trabalha recebe",
          result: "Você aceita porque recusar também é uma forma de humilhar. As moedas vão para a bolsa e o assunto morre ali.",
          reward: { gold: 25, xp: 20 } },
        { id: "recusar", label: "Recusar.", hint: "Perde o ouro · ganha o que corre de boca em boca",
          result: "Você empurra as moedas de volta e sai antes que insistam. Até o fim da semana três aldeias sabem do seu nome.",
          reward: { influence: 10, xp: 40, skillXp: { caridade: 3 }, houseRelation: { houseId: house, amount: 5 } } },
      ],
    },
  };

  return byCareer[contract.career];
}

/** Linha curta do objetivo atual, para o guia mostrar no mapa. */
export function objectiveOf(contract: Contract, quest: QuestState | null): string {
  if (quest?.pending) return quest.pending.kind === "batalha" ? "A estrada está bloqueada" : "Há uma decisão a tomar";
  const destination = poiById.get(contract.destinationId)?.name ?? "o destino";
  return `Levar a ${destination}`;
}
