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
import { fiefs, fiefById } from "../world/fiefs";
import { regionById } from "../world/valdoria";
import type { HouseId } from "../world/types";
import type { GameState } from "./store";

/** De quantos em quantos dias o tabuleiro se mexe. */
export const WORLD_TICK_DAYS = 4;

export type War = { a: HouseId; b: HouseId; since: number };

export type WorldNews = { text: string; kind: "guerra" | "paz" | "conquista" };

function pickIndex(n: number, roll: number): number {
  return Math.min(n - 1, Math.floor(roll * n));
}

/** Senhorios de uma Casa que NÃO são do jogador e não são a sede nobre dela. */
function takeableFrom(s: GameState, houseId: HouseId): string[] {
  return fiefs
    .filter((f) => {
      const owner = s.fiefOwners[f.id] ?? f.ownerHouseId;
      return owner === houseId && f.tier !== "nobre";
    })
    .map((f) => f.id);
}

function ownerOfIn(s: GameState, fiefId: string) {
  return s.fiefOwners[fiefId] ?? fiefById.get(fiefId)?.ownerHouseId ?? "house_valdoria";
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
        text: `${houseById.get(war.a)?.shortName} e ${houseById.get(war.b)?.shortName} depuseram as armas depois de ${long} dias.`,
      });
      return false;
    }
    return true;
  });

  /* ------------------------- guerras que começam ----------------------- */
  if (wars.length < 2 && roll() < 0.34) {
    const a = houses[pickIndex(houses.length, roll())];
    const rest = houses.filter((h) => h.id !== a.id && !wars.some((w) => w.a === h.id || w.b === h.id));
    const b = rest[pickIndex(rest.length, roll())];
    if (b && !wars.some((w) => (w.a === a.id && w.b === b.id) || (w.a === b.id && w.b === a.id))) {
      wars.push({ a: a.id, b: b.id, since: day });
      news.push({ kind: "guerra", text: `${a.name} declarou guerra a ${b.name}.` });
    }
  }

  /* -------------------- terra que muda de mãos ------------------------ */
  for (const war of wars) {
    if (roll() > 0.4) continue;
    // Quem ataca é sorteado; o alvo é um senhorio menor do outro lado.
    const attacker = roll() < 0.5 ? war.a : war.b;
    const defender = attacker === war.a ? war.b : war.a;
    const targets = takeableFrom({ ...s, fiefOwners }, defender);
    if (!targets.length) continue;
    const fiefId = targets[pickIndex(targets.length, roll())];
    // O que é do jogador não se perde por sorteio.
    if (ownerOfIn({ ...s, fiefOwners }, fiefId) === "player") continue;
    fiefOwners = { ...fiefOwners, [fiefId]: attacker };
    const fief = fiefById.get(fiefId);
    news.push({
      kind: "conquista",
      text: `${houseById.get(attacker)?.shortName} tomou ${fief?.name} de ${houseById.get(defender)?.shortName}, em ${regionById.get(fief?.regionId ?? "heart_of_valdoria")?.name}.`,
    });
  }

  return { state: { ...s, wars, fiefOwners, worldTickDay: day }, news };
}

/** Guerras em que uma Casa está metida agora. */
export function warsOf(s: GameState, houseId: HouseId): War[] {
  return (s.wars ?? []).filter((w) => w.a === houseId || w.b === houseId);
}

export function atWar(s: GameState, a: HouseId, b: HouseId): boolean {
  return (s.wars ?? []).some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a));
}
