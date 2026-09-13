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
export const chapters: Chapter[] = [];

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
