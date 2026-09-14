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
import type { PortraitExpression } from "../data/storyPortraits";

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
  | { kind: "scene" }
  /** Uma marca deixada por uma cena. */
  | { kind: "flag"; flag: string }
  /** Ninguém no seu encalço: nenhuma força rastreando nem procurando. */
  | { kind: "unhunted" }
  /** Homens postados nas suas terras. */
  | { kind: "garrison"; count: number }
  /** Prosperidade da sua melhor terra. */
  | { kind: "prosperity"; value: number };

export type StoryOption = {
  id: string;
  label: string;
  hint?: string;
  /** O que a escolha responde, dito pela cena. */
  result: string;
  reward?: Reward;
  /** Marca deixada na campanha. Passos futuros podem ler. */
  flag?: string;
  /**
   * Entrega um senhorio ao jogador.
   *
   * É o item mais importante desta estrutura. Comprando, a primeira terra
   * custaria cinquenta e seis encargos — e ninguém joga cinquenta e seis
   * encargos para começar a jogar. A campanha DÁ a primeira, cedo e pequena,
   * e é a partir dela que o jogo deixa de ser um emprego.
   */
  grantFief?: string;
};

export type StoryScene = {
  /** Quem fala, quando é gente de nome. Usa o retrato do personagem. */
  speakerId?: string;
  /** O rosto acompanha o tom da cena; sequências servem a mudanças curtas. */
  expression?: PortraitExpression;
  expressionSequence?: PortraitExpression[];
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
  /**
   * Cena do sistema novo — busto grande, texto escrito, escolhas no fim.
   *
   * Quando existe, é ela que acontece no lugar de `scene`, e o passo avança
   * assim que ela abre. O drama mora na cena; o passo só guarda o objetivo
   * que o jogador lê no guia.
   */
  cinematic?: string;
  reward?: Reward;
};

export type Chapter = {
  number: number;
  title: string;
  blurb: string;
  steps: StoryStep[];
};





/**
 * A CAMPANHA ANTIGA SAIU.
 *
 * "Cumprir dois encargos → vencer uma emboscada → levar o distintivo" era um
 * roteiro de serviço genérico, e começar o jogo assim era exatamente o que
 * precisava acabar. A nova abertura é a carruagem, e ela não passa por aqui:
 * acontece no mundo, em `worldEvents` e `scenes/`.
 *
 * O MOTOR fica — gatilhos, cenas, marcas, concessão de terra. É ele que vai
 * carregar os Atos I a VII quando eles forem escritos. O que saiu foi só o
 * conteúdo velho, para não disputar a atenção com a abertura nova.
 */
/**
 * CAPÍTULO II — ALGUÉM SABE QUE VOCÊ TEM.
 *
 * O primeiro capítulo escrito para este motor, e ele existe porque o Arco I
 * termina com o jogador caçado e sem chão. Cada passo aqui é uma NECESSIDADE,
 * não uma tarefa: o objetivo que o guia mostra é o que ele faria de qualquer
 * jeito se entendesse o próprio problema.
 *
 * O drama mora nas cenas (`cinematic`), que são as do sistema novo — busto
 * grande, texto escrito, escolhas no fim. O passo só guarda a linha que o
 * jogador lê no guia e o gatilho que a cumpre.
 */
const CHAPTER_II: Chapter = {
  number: 2,
  title: "Alguém sabe que você tem",
  blurb:
    "Duas Casas querem a sua cabeça e você dorme na estrada. Um homem sozinho não sobrevive a isso: é preciso teto, renda e gente paga — nesta ordem, e antes que eles cheguem.",
  steps: [
    {
      // Porteiro: o capítulo não existe antes de o Arco I acabar. Sem isto,
      // "sumir de quem está atrás de você" estaria cumprido no primeiro
      // minuto de jogo, porque ninguém está atrás de ninguém ainda.
      id: "c2_espera",
      objective: "Descobrir o que você está carregando.",
      detail: "A joia da carruagem tem dono, história e gente atrás dela.",
      trigger: { kind: "flag", flag: "arco_ii_aberto" },
    },
    {
      id: "c2_fuga",
      objective: "Sumir de quem está atrás de você.",
      detail: "Mata fechada encurta a vista de quem procura. Estrada faz o contrário.",
      trigger: { kind: "unhunted" },
      cinematic: "arco2_folego",
    },
    {
      id: "c2_passo",
      objective: "Subir até a Passagem do Norte, no Passo de Pedra Cinza.",
      detail: "Em Elmwood o seu nome está numa lista. Dravenor não responde cartas da Coroa há três anos.",
      trigger: { kind: "visit", poiId: "passagem_do_norte" },
      cinematic: "arco2_viuva",
    },
    {
      id: "c2_renda",
      objective: "Fazer Ninho do Corvo render.",
      detail: "Imposto, obras e povo. Uma terra que não rende não paga homem nenhum.",
      trigger: { kind: "prosperity", value: 45 },
      cinematic: "arco2_renda",
    },
    {
      id: "c2_guarnicao",
      objective: "Pôr dez homens na cerca.",
      detail: "Guarnição não rende nada. Guarnição decide se você continua dono.",
      trigger: { kind: "garrison", count: 10 },
      cinematic: "arco2_guarnicao",
    },
    {
      id: "c2_cerco",
      objective: "Estar na cerca quando eles chegarem.",
      detail: "Um correio de Elmwood já subiu o passo.",
      trigger: { kind: "scene" },
      cinematic: "arco2_cerco",
    },
  ],
};

/**
 * CAPÍTULO III — O SELO QUE FOI VENDIDO.
 *
 * Um rastro de papel de quatro gerações, e no fim dele gente que não fez nada
 * a ninguém. É o arco que abre o segundo lado da Balança — e abre porque o
 * jogador VÊ o preço, não porque alguém explica.
 */
const CHAPTER_III: Chapter = {
  number: 3,
  title: "O selo que foi vendido",
  blurb:
    "O selo de Elmwood saiu da Casa há quatro gerações e ninguém sabe onde parou. O rastro é de papel, e na ponta dele há uma família que não faz ideia do que tem — e um forno aceso.",
  steps: [
    {
      id: "c3_espera",
      objective: "Descobrir onde estão os outros seis.",
      detail: "Uma ordem sem registro é um começo. A Casa Elmwood é outro.",
      trigger: { kind: "flag", flag: "arco_iii_aberto" },
    },
    {
      id: "c3_tomas",
      objective: "Perguntar a Lorde Tomas Elmwood pelo selo da Casa dele.",
      detail: "O celeiro de Valdória não tem voz nas mesas grandes, e há um motivo antigo para isso.",
      trigger: { kind: "visit", poiId: "castelo_de_campo_alto" },
      cinematic: "arco3_tomas",
    },
    {
      id: "c3_leilao",
      objective: "Achar o livro de leilões de Wexley, no Mercado de Grãos.",
      detail: "Espólio de credor morto vira lote. Lote tem número, e número fica escrito.",
      trigger: { kind: "visit", poiId: "mercado_de_graos" },
      cinematic: "arco3_leiloeiro",
    },
    {
      id: "c3_viuva",
      objective: "Procurar a viúva do ourives, no Pouso dos Mercadores.",
      detail: "Ela se lembra de tudo e mente sobre metade. Descobrir qual metade é o seu problema.",
      trigger: { kind: "visit", poiId: "pouso_dos_mercadores" },
      cinematic: "arco3_viuva_ourives",
    },
    {
      id: "c3_barrow",
      objective: "Chegar aos Grandes Moinhos antes de segunda-feira.",
      detail: "Segunda-feira a peça vira aliança, e ouro velho vale por peso.",
      trigger: { kind: "visit", poiId: "grandes_moinhos" },
      cinematic: "arco3_barrow",
    },
  ],
};

export const chapters: Chapter[] = [CHAPTER_II, CHAPTER_III];

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
    case "flag":
      return s.storyFlags.includes(step.trigger.flag);
    case "unhunted":
      return !Object.values(s.worldForces).some(
        (f) => f.playerPursuit === "tracking" || f.playerPursuit === "searching",
      );
    case "garrison": {
      let total = 0;
      for (const [id, owner] of Object.entries(s.fiefOwners)) {
        if (owner !== "player") continue;
        const estate = s.fiefEstates[id];
        if (estate) for (const n of Object.values(estate.garrison)) total += n ?? 0;
      }
      return total >= step.trigger.count;
    }
    case "prosperity": {
      const wanted = step.trigger.value;
      return Object.entries(s.fiefOwners).some(
        ([id, owner]) => owner === "player" && (s.fiefEstates[id]?.prosperity ?? 0) >= wanted,
      );
    }
  }
}
