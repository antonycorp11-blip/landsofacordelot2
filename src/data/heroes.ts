/**
 * OS QUATRO INÍCIOS.
 *
 * Quatro pessoas jovens, sem Casa, sem título e sem exército. Uma delas vira o
 * jogador; as outras três continuam existindo no mundo, cada uma no seu canto,
 * e podem ser recrutadas depois.
 *
 * O arquétipo escolhido define o COMEÇO da história, nunca o destino: um
 * militar pode virar mercador, e nada no código impede isso. Por isso não
 * existe "classe" em lugar nenhum — existe o arquétipo de origem e as quatro
 * carreiras, que qualquer um pode subir.
 */
import type { AgentClass } from "../world/types";
import type { SkillId } from "./skills";

export type Attributes = {
  /** Quantos homens você comanda, e como eles se comportam. */
  command: number;
  /** Logística, carga, salários, administração de posses. */
  stewardship: number;
  /** Audiências, persuasão, acordos, favores. */
  diplomacy: number;
  /** Moral, apoio popular, religião, firmeza diante de um revés. */
  conviction: number;
};

export type HeroDefinition = {
  id: string;
  name: string;
  age: number;
  archetype: AgentClass;
  /** Onde a pessoa está quando NÃO é a escolhida. */
  homePoiId: string;
  /** Onde a campanha começa quando ELA é a escolhida. */
  startPoiId: string;
  tagline: string;
  description: string;
  personality: string[];
  strengths: string[];
  weaknesses: string[];
  attributes: Attributes;
  /** Habilidades que a origem já rendeu. O resto começa em zero. */
  startingSkills: Partial<Record<SkillId, number>>;
  /** Progresso de carreira que a vida anterior já rendeu. */
  startingCareerXp: Partial<Record<AgentClass, number>>;
  portraitAssetKey: string;
};

export const heroes: HeroDefinition[] = [
  {
    id: "kael_arven",
    name: "Kael Arven",
    age: 23,
    archetype: "MILITARY",
    homePoiId: "baradra",
    startPoiId: "baradra",
    tagline: "Criado na fronteira, respeitado antes de ser conhecido.",
    description:
      "Um jovem guerreiro sem título, criado perto das fronteiras do reino. Aprendeu cedo a cavalgar, a manejar armas e a sobreviver longe das grandes cidades. Tem disciplina natural e facilidade em conquistar respeito entre soldados.",
    personality: ["determinado", "direto", "leal", "competitivo", "pouca paciência para intriga"],
    strengths: ["Comanda mais homens", "Recruta com mais facilidade", "Moral inicial mais alta"],
    weaknesses: ["Diplomacia abaixo da média", "Negociação apenas básica"],
    attributes: { command: 5, stewardship: 2, diplomacy: 2, conviction: 3 },
    startingSkills: { lideranca: 15, tatica: 10, treinamento: 8, cavalaria: 8 },
    startingCareerXp: { MILITARY: 120 },
    portraitAssetKey: "hero_kael_arven",
  },
  {
    id: "lyra_venn",
    name: "Lyra Venn",
    age: 22,
    archetype: "TRADE",
    homePoiId: "grande_porto",
    startPoiId: "grande_porto",
    tagline: "Conhece preços, rotas e gente melhor do que conhece espadas.",
    description:
      "Filha de pequenos comerciantes, acostumada desde cedo às estradas, feiras e caravanas. Sabe quanto vale o que se carrega e quanto custa chegar com aquilo inteiro.",
    personality: ["observadora", "pragmática", "curiosa", "persuasiva", "calculista sem crueldade"],
    strengths: ["Melhores preços em tudo", "Carrega mais", "Enxerga oportunidade econômica"],
    weaknesses: ["Comando militar baixo", "Pouca experiência com tropas"],
    attributes: { command: 2, stewardship: 5, diplomacy: 3, conviction: 2 },
    startingSkills: { negociacao: 15, comercio: 12, logistica: 10, avaliacao: 8 },
    startingCareerXp: { TRADE: 120 },
    portraitAssetKey: "hero_lyra_venn",
  },
  {
    id: "edrian_vale",
    name: "Edrian Vale",
    age: 24,
    archetype: "POLITICS",
    homePoiId: "cidade_alta",
    startPoiId: "cidade_alta",
    tagline: "Uma palavra na hora certa vale mais que uma espada.",
    description:
      "Educado entre escribas, funcionários e pequenos nobres. Aprendeu a ler uma sala antes de falar nela, e a esperar o momento em que falar custa menos.",
    personality: ["educado", "estratégico", "paciente", "ambicioso", "atento a relações"],
    strengths: ["Relações evoluem mais rápido", "Melhor em audiências", "Consegue favores"],
    weaknesses: ["Capacidade militar menor", "Menos resistência ao perigo"],
    attributes: { command: 2, stewardship: 3, diplomacy: 5, conviction: 3 },
    startingSkills: { persuasao: 15, etiqueta: 12, diplomacia: 10, intriga: 6 },
    startingCareerXp: { POLITICS: 120 },
    portraitAssetKey: "hero_edrian_vale",
  },
  {
    id: "serah_elynn",
    name: "Serah Elynn",
    age: 21,
    archetype: "RELIGION",
    homePoiId: "luminaria",
    startPoiId: "luminaria",
    tagline: "Sua força não vem de posição, e sim de quem acredita nela.",
    description:
      "Uma jovem devota que passou parte da juventude ajudando comunidades, viajantes e instituições religiosas. Não tem riqueza nem posição — tem gente que a escuta.",
    personality: ["empática", "determinada", "idealista", "serena", "firme por uma causa"],
    strengths: ["Conquista apoio popular", "Influência em comunidades religiosas", "Moral alta"],
    weaknesses: ["Pouca experiência comercial", "Pouco conhecimento militar"],
    attributes: { command: 2, stewardship: 2, diplomacy: 3, conviction: 5 },
    startingSkills: { pregacao: 15, inspiracao: 12, caridade: 10, teologia: 6 },
    startingCareerXp: { RELIGION: 120 },
    portraitAssetKey: "hero_serah_elynn",
  },
];

export const heroById = new Map(heroes.map((h) => [h.id, h]));

export const ATTRIBUTE_LABEL: Record<keyof Attributes, string> = {
  command: "Comando",
  stewardship: "Administração",
  diplomacy: "Diplomacia",
  conviction: "Convicção",
};

/** O que cada atributo governa. Aparece na tela — atributo sem efeito é enfeite. */
export const ATTRIBUTE_EFFECT: Record<keyof Attributes, string> = {
  command: "Limite de tropas, moral, eficiência de recrutamento.",
  stewardship: "Carga, salários, manutenção, administração de posses.",
  diplomacy: "Audiências, persuasão, acordos e favores.",
  conviction: "Moral, apoio popular, influência religiosa.",
};

export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 10;
