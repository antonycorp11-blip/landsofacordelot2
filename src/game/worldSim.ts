/**
 * O REINO ANDA SEM VOCÊ.
 *
 * Até aqui o jogador era o único agente de um diorama: dez Casas paradas onde
 * nasceram, nenhuma fronteira mudando, nada acontecendo se ele fechasse o
 * jogo. Isso mata o motivo de voltar — não há nada esperando lá dentro.
 *
 * Aqui uma engrenagem lenta move o tabuleiro a cada poucos dias: Casas entram
 * em guerra, senhorios trocam de mãos entre quem guerreia, e as guerras
 * acabam. Nada disso pede permissão ao jogador, e TUDO vira notícia na
 * crônica — porque um mundo que muda em silêncio é igual a um mundo parado.
 *
 * A regra que protege o jogador: o que é dele ninguém toma por sorteio. Perder
 * terra tem de ser consequência de uma guerra que ele viu chegar, não de um
 * dado rolado enquanto ele viajava.
 */
import { houses, houseById } from "../data/houses";
import { allegianceLabel, type Belligerent } from "./allegiance";
import type { GameState } from "./store";

/** O nome de quem briga, seja Casa ou o próprio jogador. */
export function belligerentName(s: GameState, who: Belligerent): string {
  return who === "player" ? allegianceLabel(s.allegiance) : houseById.get(who)?.name ?? who;
}

/** De quantos em quantos dias o tabuleiro se mexe. */
export const WORLD_TICK_DAYS = 4;

/**
 * Uma guerra tem dois beligerantes, e um deles pode ser VOCÊ — a partir do dia
 * em que se declara soberano. É o que transforma independência de um título
 * numa posição no tabuleiro.
 */
export type War = { a: Belligerent; b: Belligerent; since: number };

export type WorldNews = { text: string; kind: "guerra" | "paz" | "conquista" };

function pickIndex(n: number, roll: number): number {
  return Math.min(n - 1, Math.floor(roll * n));
}

/**
 * Um passo do mundo. Devolve o estado novo e o que se soube por aí.
 *
 * `rolls` entra de fora para o passo ser testável: a mesma sequência de
 * números dá sempre o mesmo mundo.
 */
export function advanceWorld(s: GameState, day: number, rolls: number[]): { state: GameState; news: WorldNews[] } {
  const news: WorldNews[] = [];
  let wars: War[] = [...(s.wars ?? [])];
  let fiefOwners = { ...s.fiefOwners };
  let r = 0;
  const roll = () => rolls[r++ % rolls.length];

  /* ------------------------- guerras que acabam ------------------------ */
  wars = wars.filter((war) => {
    const long = day - war.since;
    if (long >= 12 && roll() < 0.45) {
      news.push({
        kind: "paz",
        text: `${belligerentName(s, war.a)} e ${belligerentName(s, war.b)} depuseram as armas depois de ${long} dias.`,
      });
      return false;
    }
    return true;
  });

  /* ------------------------- guerras que começam ----------------------- */
  if (wars.length < 2 && roll() < 0.34) {
    const a = houses[pickIndex(houses.length, roll())];
    const rest: Belligerent[] = houses
      .filter((h) => h.id !== a.id && !wars.some((w) => w.a === h.id || w.b === h.id))
      .map((h) => h.id);
    // Um soberano é alvo como qualquer outro — e quem menos gosta dele é
    // quem primeiro marcha. É a conta que a independência cobra.
    const sovereign = s.allegiance.kind === "independente";
    const hatesYou = sovereign && (s.houseRelations[a.id] ?? 0) <= -20;
    if (sovereign && !wars.some((w) => w.a === "player" || w.b === "player")) rest.push("player");
    const b = hatesYou && !wars.some((w) => w.a === "player" || w.b === "player")
      ? "player"
      : rest[pickIndex(rest.length, roll())];
    if (b && !wars.some((w) => (w.a === a.id && w.b === b) || (w.a === b && w.b === a.id))) {
      wars.push({ a: a.id, b, since: day });
      news.push({ kind: "guerra", text: `${a.name} declarou guerra a ${belligerentName(s, b)}.` });
    }
  }

  // Conquistas agora são resolvidas pelas hostes visíveis: elas precisam se
  // reunir, levar suprimento, marchar e sustentar um cerco. Este passo lento
  // continua responsável por iniciar e encerrar guerras.

  return { state: { ...s, wars, fiefOwners, worldTickDay: day }, news };
}

/** Guerras em que um beligerante está metido agora. */
export function warsOf(s: GameState, who: Belligerent): War[] {
  return (s.wars ?? []).filter((w) => w.a === who || w.b === who);
}

export function atWar(s: GameState, a: Belligerent, b: Belligerent): boolean {
  return (s.wars ?? []).some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a));
}
