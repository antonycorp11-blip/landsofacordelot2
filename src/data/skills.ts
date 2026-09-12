/**
 * HABILIDADES.
 *
 * Vinte habilidades em quatro famílias. Diferente dos atributos — que são
 * TALENTO, mudam pouco e valem muito — habilidade é CONHECIMENTO: sobe com o
 * uso, numa escala de 0 a 100, e é onde ficam os ganhos pequenos e frequentes.
 *
 * Cada habilidade declara o que ela faz. Isso não é documentação: é o texto
 * que a tela mostra, e existir aqui é o que impede uma habilidade de virar
 * número decorativo.
 */
import type { AgentClass } from "../world/types";

export type SkillId =
  // militar
  | "lideranca" | "tatica" | "treinamento" | "cavalaria" | "logistica_militar"
  // comércio
  | "negociacao" | "comercio" | "logistica" | "avaliacao" | "empreendimento"
  // política
  | "persuasao" | "etiqueta" | "intriga" | "administracao_publica" | "diplomacia"
  // religião
  | "pregacao" | "teologia" | "inspiracao" | "caridade" | "mediacao";

export type Skill = {
  id: SkillId;
  name: string;
  family: AgentClass;
  /** O que a habilidade faz, na voz do jogo. Aparece na tela. */
  effect: string;
};

export const skills: Skill[] = [
  { id: "lideranca",          name: "Liderança",            family: "MILITARY", effect: "Aumenta a moral e quantos homens você comanda com folga." },
  { id: "tatica",             name: "Tática",               family: "MILITARY", effect: "Melhora sua leitura da força alheia antes de um confronto." },
  { id: "treinamento",        name: "Treinamento",          family: "MILITARY", effect: "Faz seus soldados evoluírem mais depressa." },
  { id: "cavalaria",          name: "Cavalaria",            family: "MILITARY", effect: "Aumenta a velocidade de um grupo montado." },
  { id: "logistica_militar",  name: "Logística Militar",    family: "MILITARY", effect: "Reduz o custo diário e o consumo das tropas." },

  { id: "negociacao",         name: "Negociação",           family: "TRADE",    effect: "Melhora o preço em toda compra e venda." },
  { id: "comercio",           name: "Comércio",             family: "TRADE",    effect: "Revela o que cada região produz e do que precisa." },
  { id: "logistica",          name: "Logística",            family: "TRADE",    effect: "Aumenta quanto o seu grupo consegue carregar." },
  { id: "avaliacao",          name: "Avaliação",            family: "TRADE",    effect: "Identifica preços excepcionalmente bons ou ruins." },
  { id: "empreendimento",     name: "Empreendimento",       family: "TRADE",    effect: "Abre negócios e investimentos em estruturas." },

  { id: "persuasao",          name: "Persuasão",            family: "POLITICS", effect: "Melhora o que você consegue numa conversa." },
  { id: "etiqueta",           name: "Etiqueta",             family: "POLITICS", effect: "Reduz a penalidade de tratar com nobres acima da sua posição." },
  { id: "intriga",            name: "Intriga",              family: "POLITICS", effect: "Rende informação que não é dada de graça." },
  { id: "administracao_publica", name: "Administração Pública", family: "POLITICS", effect: "Melhora o governo de qualquer posse sua." },
  { id: "diplomacia",         name: "Diplomacia",           family: "POLITICS", effect: "Ajuda a fechar acordos entre Casas." },

  { id: "pregacao",           name: "Pregação",             family: "RELIGION", effect: "Amplia seu alcance junto ao povo e ao clero." },
  { id: "teologia",           name: "Teologia",             family: "RELIGION", effect: "Abre respostas e eventos que exigem doutrina." },
  { id: "inspiracao",         name: "Inspiração",           family: "RELIGION", effect: "Levanta a moral e segura o grupo depois de um revés." },
  { id: "caridade",           name: "Caridade",             family: "RELIGION", effect: "Constrói reputação onde riqueza e espada não chegam." },
  { id: "mediacao",           name: "Mediação",             family: "RELIGION", effect: "Resolve conflitos sem que ninguém perca a face." },
];

export const skillById = new Map(skills.map((s) => [s.id, s]));
export const skillsByFamily = (family: AgentClass) => skills.filter((s) => s.family === family);

export const FAMILY_LABEL: Record<AgentClass, string> = {
  MILITARY: "Militar",
  TRADE: "Comércio",
  POLITICS: "Política",
  RELIGION: "Religião",
};

/** Toda habilidade começa em zero; o herói inicial recebe os seus por cima. */
export function emptySkills(): Record<SkillId, number> {
  return Object.fromEntries(skills.map((s) => [s.id, 0])) as Record<SkillId, number>;
}

export const SKILL_MAX = 100;
/** Marcos onde uma habilidade libera perk. */
export const PERK_STEPS = [25, 50, 75, 100] as const;
