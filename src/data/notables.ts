/**
 * A GENTE QUE DÁ TRABALHO.
 *
 * Cada localidade tem uma ou duas pessoas que recebem forasteiros: o mestre da
 * guilda, o capataz da lavra, a anciã da aldeia. Elas não existem numa tabela
 * escrita à mão — são geradas a partir do id do lugar, o que dá SEMPRE o mesmo
 * nome para o mesmo lugar, sem custar uma linha de conteúdo por povoado.
 *
 * Cada uma tem um TRAÇO, e o traço muda como ela fala. É o que separa "tenho
 * um serviço" de uma pessoa com quem se conversa.
 */
import type { AgentClass } from "../world/types";
import type { HoldingKind } from "./holdings";

export type NotableTrait = "seco" | "falante" | "desconfiado" | "cansado" | "orgulhoso";

export type Notable = {
  id: string;
  poiId: string;
  name: string;
  role: string;
  /** Que tipo de serviço esta pessoa tem para oferecer. */
  career: AgentClass;
  trait: NotableTrait;
  /** Para o rosto gerado concordar com o nome. */
  female: boolean;
  /** 0 jovem, 1 velho. Idade é feição, e senescal velho conta história. */
  age: number;
};

/**
 * Cargo nas duas formas. O nome é sorteado, então o cargo precisa concordar
 * com quem o carrega — "Gareth Westby, Capitã da guarda" é um erro que o
 * jogador vê em toda vila.
 */
type RolePair = [masculino: string, feminino: string];
const ROLE: Record<HoldingKind, [RolePair, RolePair]> = {
  castle: [["Senescal do castelo", "Senescal do castelo"], ["Capitão da guarda", "Capitã da guarda"]],
  city: [["Mestre da guilda", "Mestra da guilda"], ["Cobrador do porto seco", "Cobradora do porto seco"]],
  town: [["Mestre da guilda", "Mestra da guilda"], ["Taverneiro", "Taverneira"]],
  village: [["Ancião da aldeia", "Anciã da aldeia"], ["Moleiro", "Moleira"]],
  market: [["Mestre do mercado", "Mestra do mercado"], ["Corretor de rotas", "Corretora de rotas"]],
  mine: [["Capataz da lavra", "Capataz da lavra"], ["Pesador de minério", "Pesadora de minério"]],
  port: [["Mestre do porto", "Mestra do porto"], ["Contramestre", "Contramestre"]],
  temple: [["Guardião do templo", "Guardiã do templo"], ["Esmoleiro", "Esmoleira"]],
  military: [["Capitão da guarnição", "Capitã da guarnição"], ["Sargento de suprimento", "Sargento de suprimento"]],
  estate: [["Feitor da propriedade", "Feitora da propriedade"], ["Cavalariço-mor", "Cavalariça-mor"]],
  site: [["Morador do lugar", "Moradora do lugar"], ["Andarilho", "Andarilha"]],
};

/** Que ofício cada tipo de estrutura tende a pedir. */
const CAREER_BY_KIND: Record<HoldingKind, AgentClass[]> = {
  castle: ["MILITARY", "POLITICS"],
  city: ["TRADE", "POLITICS"],
  town: ["TRADE", "MILITARY"],
  village: ["RELIGION", "TRADE"],
  market: ["TRADE", "POLITICS"],
  mine: ["TRADE", "MILITARY"],
  port: ["TRADE", "MILITARY"],
  temple: ["RELIGION", "POLITICS"],
  military: ["MILITARY", "MILITARY"],
  estate: ["TRADE", "RELIGION"],
  site: ["MILITARY", "TRADE"],
};

const TRAITS: NotableTrait[] = ["seco", "falante", "desconfiado", "cansado", "orgulhoso"];

const FIRST_M = [
  "Aldo", "Bram", "Cedric", "Dorn", "Fenwick", "Gareth", "Joran", "Kellan", "Norvel",
  "Perrin", "Rowan", "Tybald", "Ulric", "Wynn", "Anselm", "Corvin", "Emrys", "Harrow",
];
const FIRST_F = [
  "Esmer", "Hedda", "Ilsa", "Lorwyn", "Maeve", "Orla", "Quenna", "Sable", "Vessa",
  "Ysolde", "Brida", "Delia", "Fadwyn", "Alwen", "Rhian", "Marla",
];
const LAST = [
  "Brackwater", "Crowe", "Dunmoor", "Ferrow", "Greaves", "Hollis", "Ironsel", "Lowmarch",
  "Mereth", "Oakhand", "Pell", "Rushmill", "Standen", "Thorne", "Vance", "Westby",
  "Ashdown", "Colby", "Netherby", "Quill",
];

export function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

type Gendered = { name: string; female: boolean };

function makeName(seed: number): Gendered {
  const female = ((seed >>> 3) & 1) === 1;
  const bank = female ? FIRST_F : FIRST_M;
  return { name: `${bank[seed % bank.length]} ${LAST[(seed >>> 9) % LAST.length]}`, female };
}

/** Um nome qualquer de gente que a conversa menciona mas nunca aparece. */
export function bystanderName(seed: string): string {
  return makeName(hashText(`bystander:${seed}`)).name;
}

const cache = new Map<string, Notable[]>();

export function notablesAt(poiId: string, kind: HoldingKind): Notable[] {
  const key = `${poiId}:${kind}`;
  const hit = cache.get(key);
  if (hit) return hit;

  // Lugar pequeno tem uma pessoa que responde por tudo; lugar grande tem duas.
  const count = kind === "site" || kind === "village" || kind === "estate" || kind === "mine" ? 1 : 2;
  const out: Notable[] = [];
  for (let i = 0; i < count; i++) {
    const seed = hashText(`${poiId}:${i}`);
    const person = makeName(seed);
    const pair = ROLE[kind][i] ?? ROLE[kind][0];
    out.push({
      id: `${poiId}:${i}`,
      poiId,
      name: person.name,
      role: person.female ? pair[1] : pair[0],
      female: person.female,
      age: 0.28 + ((seed >>> 21) % 100) / 145,
      career: CAREER_BY_KIND[kind][i] ?? CAREER_BY_KIND[kind][0],
      trait: TRAITS[(seed >>> 17) % TRAITS.length],
    });
  }
  cache.set(key, out);
  return out;
}

export function notableAt(poiId: string, kind: HoldingKind, index = 0): Notable {
  const list = notablesAt(poiId, kind);
  return list[Math.min(index, list.length - 1)];
}

/** Como esta pessoa recebe quem chega. O traço é a voz. */
const GREETING: Record<NotableTrait, string> = {
  seco: "Diga o que quer. Tenho pouco tempo e menos paciência.",
  falante: "Ora, cara nova! Sente-se, sente-se. Por aqui não passa ninguém sem história.",
  desconfiado: "Não me lembro do seu rosto. E eu lembro de todos os rostos.",
  cansado: "Mais um. Tudo bem, fale. Já ouvi de tudo hoje, ouço mais uma.",
  orgulhoso: "Você fala com quem responde por este lugar. Escolha bem as palavras.",
};

export function greetingOf(notable: Notable): string {
  return GREETING[notable.trait];
}

/** Que cara tem cada ofício: elmo, coroa, capuz ou nada. */
export function faceKindOf(career: AgentClass): "militar" | "corte" | "clero" | "povo" {
  return career === "MILITARY" ? "militar" : career === "POLITICS" ? "corte" : career === "RELIGION" ? "clero" : "povo";
}
