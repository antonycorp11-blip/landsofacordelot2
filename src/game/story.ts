/**
 * A CAMPANHA PRINCIPAL.
 *
 * Os encargos que se pegam num castelo são a vida do dia a dia: aparecem,
 * acabam, aparecem outros. A CAMPANHA é outra coisa — é a linha que atravessa
 * a partida inteira, sempre disponível no diário, avançando por capítulos, e
 * terminando com o mundo diferente de como começou.
 *
 * O que este arquivo é: o MOTOR e o primeiro capítulo. O motor não sabe nada
 * de enredo — ele sabe abrir um passo, esperar um gatilho, mostrar uma cena e
 * seguir. O enredo é dado, e trocar o dado troca a história sem tocar em
 * código.
 *
 * Como escrever um capítulo:
 *
 *   - cada PASSO tem um objetivo em uma linha (é o que o guia mostra no mapa);
 *   - um GATILHO diz o que o completa: chegar num lugar, falar com alguém,
 *     cumprir encargos, alcançar um nível, ter terra;
 *   - uma CENA opcional acontece quando ele se completa — com retrato e
 *     respostas, quando há alguém falando;
 *   - uma ESCOLHA de capítulo muda relações de Casa e fica marcada para
 *     sempre, e os passos seguintes podem ler essa marca.
 */
import type { Reward } from "./experience";
import type { GameState } from "./store";

export type StoryTrigger =
  /** Chegar a um lugar. */
  | { kind: "visit"; poiId: string }
  /** Cumprir N encargos, de qualquer tipo. */
  | { kind: "contracts"; count: number }
  /** Alcançar um nível. */
  | { kind: "level"; level: number }
  /** Juntar influência. */
  | { kind: "influence"; amount: number }
  /** Ter ao menos um senhorio. */
  | { kind: "fief" }
  /** Ganhar batalhas. */
  | { kind: "battles"; count: number }
  /** Só a cena; completa ao ser lida. */
  | { kind: "scene" };

export type StoryOption = {
  id: string;
  label: string;
  hint?: string;
  /** O que a escolha responde, dito pela cena. */
  result: string;
  reward?: Reward;
  /** Marca deixada na campanha. Passos futuros podem ler. */
  flag?: string;
};

export type StoryScene = {
  /** Quem fala, quando é gente de nome. Usa o retrato do personagem. */
  speakerId?: string;
  /** Onde a cena acontece, para o cabeçalho. */
  poiId?: string;
  text: string;
  options: StoryOption[];
};

export type StoryStep = {
  id: string;
  /** Uma linha, no imperativo. É o que o guia mostra. */
  objective: string;
  /** Uma frase de contexto no diário. */
  detail: string;
  trigger: StoryTrigger;
  scene?: StoryScene;
  reward?: Reward;
};

export type Chapter = {
  number: number;
  title: string;
  blurb: string;
  steps: StoryStep[];
};

/* ===================================================================== */
/* CAPÍTULO I                                                            */
/* ===================================================================== */

const CHAPTER_I: Chapter = {
  number: 1,
  title: "O nome que você não tem",
  blurb:
    "Ninguém em Valdória sabe quem você é, e é esse o problema: não se compra terra, " +
    "não se levanta tropa e não se entra num salão sem um nome que já tenha significado " +
    "alguma coisa para alguém.",
  steps: [
    {
      id: "c1_trabalho",
      objective: "Cumprir dois encargos",
      detail:
        "Reputação não começa com um feito grande. Começa com duas pessoas diferentes dizendo que você faz o que promete.",
      trigger: { kind: "contracts", count: 2 },
      scene: {
        text:
          "Dois trabalhos entregues, e a diferença já se nota: quem atende não pergunta mais quem você é antes de dizer o que precisa. " +
          "É pouco. Mas é a primeira vez que este reino devolve alguma coisa a você.",
        options: [
          {
            id: "seguir",
            label: "Ainda é pouco.",
            result: "É pouco. E é por onde todo mundo começou, inclusive os que hoje têm salão.",
            reward: { influence: 3, xp: 60 },
          },
        ],
      },
    },
    {
      id: "c1_emboscada",
      objective: "Vencer uma emboscada na estrada",
      detail:
        "As estradas do reino andam perigosas demais para o tempo que faz. Alguém está pagando por isso, e quem paga costuma deixar rastro no bolso dos mortos.",
      trigger: { kind: "battles", count: 1 },
      scene: {
        text:
          "Entre os mortos havia um distintivo que não era de bandido: metal bom, lavrado, do tipo que se recebe e não se compra. " +
          "Bandido não usa insígnia. Soldado usa — e soldado tem quem o mande.",
        options: [
          {
            id: "guardar",
            label: "Guardar o distintivo.",
            hint: "É prova, e prova vale mais fechada",
            result: "Você embrulha o metal num pano e guarda fundo. Quem tem isso na bagagem tem uma conversa garantida com quem importa.",
            reward: { xp: 80, influence: 4 },
            flag: "tem_distintivo",
          },
        ],
      },
    },
    {
      id: "c1_corte",
      objective: "Levar o distintivo ao Castelo Real",
      detail:
        "Uma insígnia de soldado nas mãos de saqueadores é assunto da Coroa. E é a desculpa que faltava para atravessar aquele portão.",
      trigger: { kind: "visit", poiId: "castelo_real" },
      scene: {
        speakerId: "aldren_valdoria",
        poiId: "castelo_real",
        text:
          "O Rei gira o distintivo entre dois dedos e não pergunta onde você o achou — o que já diz que ele sabe. " +
          "«Há três meses que estradas minhas são cortadas por homens que marcham em ordem. " +
          "Meus lordes juram que não é nenhum deles, e juram olhando uns para os outros. " +
          "Eu preciso de alguém sem casa, sem primo e sem dívida. Você não tem nada disso. É a sua única qualificação, e é a que eu preciso.»",
        options: [
          {
            id: "aceitar",
            label: "O que o senhor quer que eu descubra?",
            hint: "Entra na corte pela porta de serviço, mas entra",
            result:
              "«Quero um nome. Não uma suspeita, não um boato — um nome que eu possa dizer em voz alta sem começar uma guerra por engano. Traga-me isso e eu lhe dou terra.»",
            reward: { xp: 140, influence: 10, gold: 120, houseRelation: { houseId: "house_valdoria", amount: 12 } },
            flag: "servico_da_coroa",
          },
          {
            id: "preco",
            label: "E o que ganho com isso?",
            hint: "Menos elegante · mais ouro na mão",
            result:
              "O Rei ri uma vez, sem simpatia. «Você é honesto do jeito barato. Terra, quando terminar. Ouro, agora, para não morrer antes.» A bolsa cai na mesa mais pesada do que devia.",
            reward: { xp: 120, influence: 5, gold: 220, houseRelation: { houseId: "house_valdoria", amount: 5 } },
            flag: "servico_da_coroa",
          },
        ],
      },
    },
    {
      id: "c1_peso",
      objective: "Ganhar peso suficiente para ser ouvido (influência 25)",
      detail:
        "Perguntar a um lorde de quem é uma insígnia exige que ele tenha algum motivo para responder. Esse motivo chama-se influência.",
      trigger: { kind: "influence", amount: 25 },
      scene: {
        text:
          "Já não é preciso explicar quem você é ao chegar. Em três regiões o seu nome anda sozinho, e anda antes de você. " +
          "Agora dá para bater numa porta grande e esperar que ela abra.",
        options: [
          {
            id: "pronto",
            label: "Então é hora de perguntar a quem sabe.",
            result: "É hora. E quem sabe raramente gosta de ser perguntado.",
            reward: { xp: 120, influence: 5 },
          },
        ],
      },
    },
  ],
};

/* ===================================================================== */
/* CAPÍTULO II — a estrutura está pronta; o enredo entra aqui            */
/* ===================================================================== */

const CHAPTER_II: Chapter = {
  number: 2,
  title: "Um nome que se possa dizer em voz alta",
  blurb:
    "O Rei quer um culpado que ele possa acusar sem começar uma guerra por engano. " +
    "Três Casas têm motivo, duas têm meios, e uma tem as duas coisas.",
  steps: [
    {
      id: "c2_marchas",
      objective: "Procurar a Casa Karneth nas Marchas",
      detail:
        "Karneth arma mais homens do que precisa para a fronteira que tem. É a primeira porta, e é a que menos gosta de você.",
      trigger: { kind: "visit", poiId: "castelo_karneth" },
      scene: {
        speakerId: "garrick_karneth",
        poiId: "castelo_karneth",
        text:
          "«Insígnia minha.» Garrick diz isso antes de você perguntar, e põe a mão aberta sobre a mesa. " +
          "«Roubada de um depósito meu, há cinco meses, com trinta lanças e duzentos alqueires. " +
          "Fiz o que qualquer um faria: calei a boca. Um senhor das Marchas que confessa que lhe roubaram o arsenal não é mais senhor de nada. " +
          "Agora você entra aqui com ela na mão e eu tenho duas opções: matá-lo ou usá-lo.»",
        options: [
          {
            id: "usar",
            label: "Use-me. Prefiro assim.",
            hint: "Karneth passa a lhe dever alguma coisa",
            result:
              "«Descubra quem esvaziou meu depósito. Traga-me isso antes de levar ao Rei, e eu esqueço que você me viu sangrar.» Pela primeira vez ele o trata por alguma coisa que não é 'forasteiro'.",
            reward: { xp: 180, influence: 8, houseRelation: { houseId: "house_karneth", amount: 20 } },
            flag: "pacto_karneth",
          },
          {
            id: "coroa",
            label: "Isto vai para o Rei hoje.",
            hint: "Cumpre a palavra dada à Coroa · Karneth não perdoa",
            result:
              "«Então vá.» Ele não se levanta. «E quando o Rei vier tomar as Marchas porque eu fui descuidado, lembre-se de que foi você quem lhe deu o mapa.»",
            reward: { xp: 180, influence: 12, houseRelation: { houseId: "house_valdoria", amount: 15 } },
            flag: "leal_a_coroa",
          },
        ],
      },
    },
  ],
};

export const chapters: Chapter[] = [CHAPTER_I, CHAPTER_II];
export const allSteps: StoryStep[] = chapters.flatMap((c) => c.steps);
export const chapterOfStep = new Map<string, Chapter>(
  chapters.flatMap((c) => c.steps.map((s) => [s.id, c] as const)),
);

/* ------------------------------ o motor ------------------------------- */

export type StoryState = {
  /** Índice do passo atual em `allSteps`. */
  step: number;
  /** Marcas deixadas pelas escolhas. */
  flags: string[];
  /** Cena esperando leitura. Trava o mapa como qualquer decisão. */
  pending: string | null;
  done: boolean;
};

export function freshStory(): StoryState {
  return { step: 0, flags: [], pending: null, done: false };
}

export function currentStep(story: StoryState): StoryStep | null {
  return story.done ? null : allSteps[story.step] ?? null;
}

/** O gatilho do passo atual já foi cumprido? */
export function triggerMet(s: GameState, step: StoryStep): boolean {
  const a = s.adventure;
  switch (step.trigger.kind) {
    case "visit":
      return s.journey?.currentNodeId === step.trigger.poiId && !s.journey?.to;
    case "contracts":
      return a.history.filter((c) => c.status === "completed").length >= step.trigger.count;
    case "level":
      return s.level >= step.trigger.level;
    case "influence":
      return s.influence >= step.trigger.amount;
    case "fief":
      return Object.values(s.fiefOwners).includes("player");
    case "battles":
      return (a.battlesWon ?? 0) >= step.trigger.count;
    case "scene":
      return true;
  }
}
