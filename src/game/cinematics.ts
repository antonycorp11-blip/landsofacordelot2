/**
 * CENAS.
 *
 * Uma cena é um momento curto: onde você está, o que você vê, e o que faz a
 * respeito. Três ou quatro linhas — nunca uma página — e até quatro escolhas,
 * cada uma com o teste e o risco ditos antes.
 *
 * REGRA DE ESCRITA desta camada: ninguém explica o mundo ao jogador.
 * Personagens escondem, mentem, evitam, ameaçam. Se uma fala parece
 * enciclopédia, ela está errada.
 *
 * REGRA DE DESENHO: nenhuma escolha pode ser falsa. Observar dá informação que
 * outro caminho não dá; conversar pode arrancar um nome; atacar rende prova e
 * cobra perseguição; ir embora é permitido e custa o que você não viu.
 */
import type { Reward } from "./experience";
import type { Attributes } from "../data/heroes";
import type { SkillId } from "../data/skills";
import type { PortraitExpression } from "../data/storyPortraits";
import type { StoryArtKey } from "../data/storyArt";

export type SceneCheck = {
  attribute: keyof Attributes;
  /** Qualquer uma destas serve — o herói usa a melhor que tem. */
  skills: SkillId[];
  /** Rótulo mostrado antes da escolha: "Tática / Intriga". */
  label: string;
};

export type SceneOutcome = {
  /** O que acontece, dito em uma ou duas linhas. */
  text: string;
  /** Objeto revelado junto do resultado. */
  art?: StoryArtKey;
  reward?: Reward;
  /** Coisas que o jogador passa a saber. */
  facts?: string[];
  /** Perguntas que passam a existir. */
  questions?: string[];
  /** Provas materiais. */
  evidence?: string[];
  /**
   * Provas que DEIXAM de estar com você.
   *
   * Sem isto, devolver o selo a Edran deixava o selo no quadro de investigação
   * e as quatro pistas de Elmwood abertas — com o objeto na mão de um morto.
   */
  removeEvidence?: string[];
  /** Marcas permanentes da escolha. */
  flags?: string[];
  /**
   * Quanto esta escolha inclina a Balança. Positivo puxa para a Coroa,
   * negativo para as Cinzas. A maioria das falas não mexe: se toda linha de
   * diálogo movesse o medidor, ele viraria ruído e pararia de significar.
   */
  balance?: number;
  /** Texto curto ao lado da barra explicando o empurrão. */
  balanceReason?: string;
  /**
   * Forças que passam a caçar o jogador a partir daqui. Elas não ganham a
   * posição dele de graça: recebem a ÚLTIMA conhecida, que é onde a cena
   * aconteceu, e daí em diante dependem de contato como qualquer outra.
   */
  hunt?: string[];
  /** Senhorio que passa a ser do jogador. Terra prometida numa cena é terra. */
  grantFief?: string;
  /**
   * Chama a guarnição das suas terras para a linha.
   *
   * A batalha usa a tropa que anda com você, e a guarnição fica parada no
   * feudo. Numa defesa isso é o contrário do que faz sentido: os homens que
   * você pagou o mês inteiro têm de estar na estrada quando eles chegam.
   */
  callGarrison?: boolean;
  /**
   * Funda a Casa do jogador, com o sobrenome dele.
   *
   * Passa por cima dos requisitos de `independenceBlocker` de propósito: ali
   * são o caminho do sandbox, aqui é o momento da história em que ninguém faz
   * aliança com um homem sem nome.
   */
  foundHouse?: boolean;
  /** Próximo momento desta cena. */
  next?: string;
  /** Encerra a cena e devolve o mapa. */
  end?: boolean;
  /** Deixa o evento do mundo neste estado. */
  eventState?: string;
  /** Abre combate com este bando. */
  battle?: {
    name: string;
    band: Record<string, number>;
    /** Momento em que a cena recomeça quando o campo estiver resolvido. */
    resume?: string;
  };
};

export type SceneChoice = {
  id: string;
  label: string;
  /** Linha de apoio curta: o que você pretende fazer. */
  hint?: string;
  check?: SceneCheck;
  /**
   * Exige uma marca para estar disponível.
   *
   * Aparece assim mesmo, trancada e com o motivo dito — saber que existe um
   * caminho que você não pode tomar é informação, e esconder a opção seria
   * esconder que faltou alguma coisa.
   */
  needsFlag?: { flag: string; blocked: string };
  /** Sem teste: acontece. Com teste: `outcome` é o sucesso. */
  outcome: SceneOutcome;
  failure?: SceneOutcome;
};

export type SceneBeat = {
  id: string;
  /** Onde e quando, no alto da cena. */
  place?: string;
  time?: string;
  /** Quem fala, quando há alguém. */
  speaker?: {
    name: string;
    role?: string;
    seed?: string;
    female?: boolean;
    age?: number;
    portraitKey?: string;
    expression?: PortraitExpression;
    /** Sequência curta para falas que mudam diante do jogador. */
    expressionSequence?: PortraitExpression[];
  };
  /** Ilustração do lugar ou objeto que sustenta este momento. */
  art?: StoryArtKey;
  /** Uma a três linhas curtas. */
  text: string[];
  choices: SceneChoice[];
};

export type Cinematic = {
  id: string;
  /**
   * Cena que não pode ser abandonada pelo canto da tela.
   *
   * A abertura é assim: sair dela deixaria o jogador no mapa sem o selo e sem
   * história nenhuma, e o evento da carruagem não reabre.
   */
  noEscape?: boolean;
  beats: Record<string, SceneBeat>;
  first: string;
};
