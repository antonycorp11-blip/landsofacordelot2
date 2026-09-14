/**
 * AS QUATRO PESSOAS QUE OLHAM O SELO.
 *
 * Depois da carruagem o jogador tem uma joia e nenhuma explicação. Estas são
 * as quatro pessoas do Bosque de Elmwood que teriam motivo para reconhecer o
 * que ele carrega — e **nenhuma delas sabe tudo**.
 *
 * O mercador vê preço. O escrivão vê marca. O sacerdote vê símbolo. O guarda
 * vê problema, e é o único que vai contar a alguém.
 *
 * Em que ordem procurar é escolha do jogador, e cada um cobra uma coisa
 * diferente por responder. Só depois dos quatro ele entende que ninguém em
 * Elmwood tem a resposta inteira — e que ela está com quem manda na região.
 */
export type StoryPerson = {
  id: string;
  name: string;
  role: string;
  /** Onde a pessoa está. */
  poiId: string;
  /** Atlas de expressões, quando existe arte. Sem isso, rosto gerado. */
  portraitKey?: string;
  /** Semente do rosto gerado, para ser sempre o mesmo. */
  seed: string;
  age: number;
  female?: boolean;
  sceneId: string;
  /** Marca deixada depois de falar. Some da lista. */
  doneFlag: string;
  /** Como a pessoa aparece no quadro de investigação, antes de ser procurada. */
  lead: string;
  /** O que o jogador pensa dela depois. */
  leadDone: string;
};

export const storyPeople: StoryPerson[] = [
  {
    id: "aled_vern",
    name: "Mestre Aled Vern",
    role: "Escrivão de Folhaterra",
    poiId: "folhaterra",
    portraitKey: "portrait_aled_vern",
    seed: "aled_vern",
    age: 0.5,
    sceneId: "lead_escrivao",
    doneFlag: "falou_com_escrivao",
    lead: "Um escrivão reconhece marca de chancelaria — Folhaterra.",
    leadDone: "O escrivão de Folhaterra leu a marca: chancelaria Real, fora de uso.",
  },
  {
    id: "ovid_marsh",
    name: "Ovid Marsh",
    role: "Comprador de metal velho",
    poiId: "serenvale",
    seed: "ovid_marsh",
    age: 0.62,
    sceneId: "lead_mercador",
    doneFlag: "falou_com_mercador",
    lead: "Um mercador sabe o que não é joia comum — Serenvale.",
    leadDone: "O mercador de Serenvale ofereceu demais, e isso disse tudo.",
  },
  {
    id: "irmao_bramm",
    name: "Irmão Bramm",
    role: "Guardião do Bosque Sagrado",
    poiId: "bosque_sagrado",
    seed: "irmao_bramm",
    age: 0.7,
    sceneId: "lead_sacerdote",
    doneFlag: "falou_com_sacerdote",
    lead: "Um sacerdote lembra símbolos antigos — Bosque Sagrado.",
    leadDone: "O sacerdote do Bosque Sagrado viu o símbolo e teve medo.",
  },
  {
    id: "sargento_teln",
    name: "Sargento Teln",
    role: "Guarda do Castelo Verde",
    poiId: "castelo_verde",
    seed: "sargento_teln",
    age: 0.45,
    sceneId: "lead_guarda",
    doneFlag: "falou_com_guarda",
    lead: "A guarda do Castelo Verde — se você confiar nela.",
    leadDone: "O sargento do Castelo Verde viu o selo. Ele não guardou para si.",
  },
];

export const storyPersonById = new Map(storyPeople.map((p) => [p.id, p]));

/** Quem está neste lugar e ainda não foi procurado. */
export function storyPeopleAt(poiId: string, flags: string[], evidence: string[]): StoryPerson[] {
  if (!evidence.includes("royal_seal")) return [];
  return storyPeople.filter((p) => p.poiId === poiId && !flags.includes(p.doneFlag));
}
