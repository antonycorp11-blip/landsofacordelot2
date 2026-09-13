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
  reward?: Reward;
  /** Coisas que o jogador passa a saber. */
  facts?: string[];
  /** Perguntas que passam a existir. */
  questions?: string[];
  /** Provas materiais. */
  evidence?: string[];
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
  /** Próximo momento desta cena. */
  next?: string;
  /** Encerra a cena e devolve o mapa. */
  end?: boolean;
  /** Deixa o evento do mundo neste estado. */
  eventState?: string;
  /** Abre combate com este bando. */
  battle?: { name: string; band: Record<string, number> };
};

export type SceneChoice = {
  id: string;
  label: string;
  /** Linha de apoio curta: o que você pretende fazer. */
  hint?: string;
  check?: SceneCheck;
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
  speaker?: { name: string; role?: string; seed?: string; female?: boolean; age?: number };
  /** Uma a três linhas curtas. */
  text: string[];
  choices: SceneChoice[];
};

export type Cinematic = {
  id: string;
  beats: Record<string, SceneBeat>;
  first: string;
};
