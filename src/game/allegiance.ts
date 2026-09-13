/**
 * JURAMENTO E INDEPENDÊNCIA.
 *
 * O jogo levava de viajante a proprietário e parava ali: você tinha terra,
 * renda e homens, e continuava sendo ninguém no tabuleiro político. Faltava a
 * pergunta que organiza a segunda metade de uma partida — **de quem você é?**
 *
 * Há duas respostas, e elas custam coisas opostas:
 *
 * JURAR a uma Casa troca liberdade por proteção e carreira. Você recebe soldo
 * de vassalo todo dia, acumula SERVIÇO ajudando nas guerras dela, e o serviço
 * paga em terra — é o caminho seguro e o único que dá senhorio de graça.
 * Em troca, as guerras dela são suas: os inimigos dela marcham contra os seus
 * senhorios, e a guarnição que você deixou lá passa a ser a única coisa entre
 * a sua terra e o exército de outro.
 *
 * DECLARAR-SE INDEPENDENTE não dá nada e tira a rede. Você entra no tabuleiro
 * como potência: pode ser alvo de guerra como qualquer Casa, ninguém lhe manda
 * soldo, e cada senhorio é seu problema. É o caminho de quem quer o reino, não
 * um lugar nele.
 *
 * A regra que mantém isso honesto: **enquanto você é livre, ninguém toma a sua
 * terra.** A ameaça começa no instante em que você escolhe um lado — e é a
 * escolha que a liga, não um dado.
 */
import { houseById } from "../data/houses";
import { troopTotal } from "../data/troops";
import { fiefs } from "../world/fiefs";
import type { HouseId } from "../world/types";
import type { GameState } from "./store";

/** Quem pode estar em guerra: as Casas e, quando independente, você. */
export type Belligerent = HouseId | "player";

export type Allegiance =
  | { kind: "livre" }
  | { kind: "jurado"; houseId: HouseId; since: number; service: number; grants: string[] }
  | { kind: "independente"; since: number; name: string };

export function freshAllegiance(): Allegiance {
  return { kind: "livre" };
}

/* --------------------------- o que se exige --------------------------- */

export const SWEAR_RELATION = 25;
export const INDEPENDENCE_FIEFS = 2;
export const INDEPENDENCE_INFLUENCE = 60;
export const INDEPENDENCE_TROOPS = 25;

export function playerFiefCount(s: GameState): number {
  return fiefs.filter((f) => (s.fiefOwners[f.id] ?? f.ownerHouseId) === "player").length;
}

export type SwearBlock = "none" | "ja_jurado" | "independente" | "relacao";

export function swearBlocker(s: GameState, houseId: HouseId): SwearBlock {
  if (s.allegiance.kind === "jurado") return "ja_jurado";
  if (s.allegiance.kind === "independente") return "independente";
  if ((s.houseRelations[houseId] ?? 0) < SWEAR_RELATION) return "relacao";
  return "none";
}

export type IndependenceBlock = "none" | "ja_independente" | "terra" | "influencia" | "tropas";

export function independenceBlocker(s: GameState): IndependenceBlock {
  if (s.allegiance.kind === "independente") return "ja_independente";
  if (playerFiefCount(s) < INDEPENDENCE_FIEFS) return "terra";
  if (s.influence < INDEPENDENCE_INFLUENCE) return "influencia";
  if (troopTotal(s.troops) < INDEPENDENCE_TROOPS) return "tropas";
  return "none";
}

export const BLOCK_TEXT: Record<string, string> = {
  ja_jurado: "Você já jurou a uma Casa. Não se serve a duas.",
  independente: "Quem se declarou soberano não volta a ajoelhar sem perder tudo.",
  relacao: `A Casa não aceitaria o juramento de quem ela mal conhece. Seria preciso relação ${SWEAR_RELATION}.`,
  ja_independente: "Você já é soberano.",
  terra: `Ninguém se declara senhor sem terra. São precisos ${INDEPENDENCE_FIEFS} senhorios.`,
  influencia: `Um nome sem peso é uma piada na boca dos outros. São precisos ${INDEPENDENCE_INFLUENCE} de influência.`,
  tropas: `Uma declaração sem exército é um convite. São precisos ${INDEPENDENCE_TROOPS} homens.`,
};

/* ------------------------- o que cada um rende ------------------------ */

/** Soldo de vassalo: a Casa sustenta quem lhe serve. Cresce com o serviço. */
export function vassalStipend(a: Allegiance): number {
  return a.kind === "jurado" ? Math.round(9 + a.service / 8) : 0;
}

/** Serviço necessário para a próxima concessão de terra. */
export const GRANT_STEPS = [40, 110, 220];

export function nextGrantAt(a: Allegiance): number | null {
  if (a.kind !== "jurado") return null;
  return GRANT_STEPS.find((step) => step > a.service && a.grants.length < GRANT_STEPS.length) ?? null;
}

/** A Casa concede um senhorio menor dela ao vassalo que serviu o bastante. */
export function grantableFief(s: GameState, houseId: HouseId): string | null {
  return (
    fiefs.find(
      (f) =>
        (s.fiefOwners[f.id] ?? f.ownerHouseId) === houseId &&
        f.tier !== "nobre" &&
        !(s.allegiance.kind === "jurado" && s.allegiance.grants.includes(f.id)),
    )?.id ?? null
  );
}

/* --------------------------- leitura para a tela ---------------------- */

export function allegianceLabel(a: Allegiance): string {
  if (a.kind === "jurado") return `Vassalo de ${houseById.get(a.houseId)?.name ?? "uma Casa"}`;
  if (a.kind === "independente") return a.name;
  return "Sem senhor";
}

/** Você e quem o seu juramento arrasta para a briga. */
export function belligerentOf(s: GameState): Belligerent | null {
  if (s.allegiance.kind === "independente") return "player";
  if (s.allegiance.kind === "jurado") return s.allegiance.houseId;
  return null;
}

/** A terra do jogador pode ser tomada? Só depois que ele escolheu um lado. */
export function landIsAtRisk(s: GameState): boolean {
  return s.allegiance.kind !== "livre";
}

/** Casas em guerra com você agora, por juramento ou por soberania. */
export function enemiesOf(s: GameState): Belligerent[] {
  const me = belligerentOf(s);
  if (!me) return [];
  return (s.wars ?? [])
    .filter((w) => w.a === me || w.b === me)
    .map((w) => (w.a === me ? w.b : w.a));
}

/* =========================== OS DOIS ATOS ============================== */

import { getState, update } from "./store";
import { fiefById } from "../world/fiefs";

/**
 * Jurar a uma Casa.
 *
 * Um vassalo não é um empregado: ele herda as guerras do senhor no mesmo dia.
 * Por isso o juramento entra com a lista de inimigos já escrita, e a terra do
 * jogador deixa de ser intocável na mesma linha.
 */
export function swearTo(houseId: HouseId): boolean {
  const s = getState();
  if (swearBlocker(s, houseId) !== "none") return false;
  const day = Math.floor((s.journey?.hours ?? 0) / 24) + 1;
  update((g) => ({
    ...g,
    allegiance: { kind: "jurado", houseId, since: day, service: 0, grants: [] },
    influence: g.influence + 8,
    houseRelations: { ...g.houseRelations, [houseId]: Math.min(100, (g.houseRelations[houseId] ?? 0) + 15) },
  }));
  return true;
}

/** Romper o juramento. Custa caro, e é para custar. */
export function breakOath(): boolean {
  const s = getState();
  if (s.allegiance.kind !== "jurado") return false;
  const houseId = s.allegiance.houseId;
  update((g) => ({
    ...g,
    allegiance: { kind: "livre" },
    influence: Math.max(0, g.influence - 15),
    houseRelations: { ...g.houseRelations, [houseId]: Math.max(-100, (g.houseRelations[houseId] ?? 0) - 45) },
    // As guerras do antigo senhor deixam de ser suas no mesmo instante.
    wars: (g.wars ?? []).filter((w) => w.a !== "player" && w.b !== "player"),
  }));
  return true;
}

/**
 * Declarar-se soberano.
 *
 * Não dá nada: tira. A Coroa passa a considerá-lo usurpador, e a partir daqui
 * qualquer Casa pode declarar guerra a você como declara a outra qualquer.
 */
export function declareIndependence(name: string): boolean {
  const s = getState();
  if (independenceBlocker(s) !== "none") return false;
  const day = Math.floor((s.journey?.hours ?? 0) / 24) + 1;
  const oldLiege = s.allegiance.kind === "jurado" ? s.allegiance.houseId : null;
  update((g) => ({
    ...g,
    allegiance: { kind: "independente", since: day, name: name.trim() || "Casa sem nome" },
    influence: g.influence + 20,
    houseRelations: {
      ...g.houseRelations,
      house_valdoria: Math.max(-100, (g.houseRelations.house_valdoria ?? 0) - 40),
      ...(oldLiege ? { [oldLiege]: Math.max(-100, (g.houseRelations[oldLiege] ?? 0) - 60) } : {}),
    },
    // Quem era senhor vira inimigo na hora. Traição não espera o calendário.
    wars: oldLiege ? [...(g.wars ?? []), { a: "player" as const, b: oldLiege, since: day }] : (g.wars ?? []),
  }));
  return true;
}

/** Serviço prestado ao senhor — é o que vira terra. */
export function addService(amount: number) {
  const s = getState();
  if (s.allegiance.kind !== "jurado" || amount <= 0) return;
  update((g) => (g.allegiance.kind === "jurado"
    ? { ...g, allegiance: { ...g.allegiance, service: g.allegiance.service + amount } }
    : g));
}

/**
 * A concessão: quando o serviço passa de um degrau, a Casa entrega terra.
 *
 * Devolve o senhorio concedido, para quem chamou poder anunciar — uma terra
 * que aparece na lista sem ninguém dizer nada não é recompensa, é bug.
 */
export function claimGrant(s: GameState): { state: GameState; fiefId: string } | null {
  if (s.allegiance.kind !== "jurado") return null;
  const earned = GRANT_STEPS.filter((step) => s.allegiance.kind === "jurado" && s.allegiance.service >= step).length;
  if (earned <= s.allegiance.grants.length) return null;
  const fiefId = grantableFief(s, s.allegiance.houseId);
  if (!fiefId) return null;
  return {
    fiefId,
    state: {
      ...s,
      fiefOwners: { ...s.fiefOwners, [fiefId]: "player" },
      allegiance: { ...s.allegiance, grants: [...s.allegiance.grants, fiefId] },
    },
  };
}

export function fiefName(id: string): string {
  return fiefById.get(id)?.name ?? id;
}
