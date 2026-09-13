/**
 * A BATALHA.
 *
 * Não é uma arena desenhada e não é um dado só. É o meio-termo que Mount &
 * Blade usa quando você manda a tropa sem descer a campo: RODADAS CURTAS com
 * uma ordem por rodada, e o resultado saindo de força, moral e da ordem que
 * você escolheu contra a que eles escolheram.
 *
 * O que faz isso ser decisão e não sorteio:
 *
 * - cada ordem troca ataque por proteção, e a troca é visível antes;
 * - FLANQUEAR só funciona com cavalaria, e sai caro quando não funciona;
 * - MORAL quebra antes dos homens acabarem — quase nenhuma batalha termina em
 *   extermínio, termina com um lado correndo;
 * - RECUAR é sempre possível, e sempre custa alguma coisa.
 *
 * Perder homens é permanente. É isso que faz a decisão pesar.
 */
import { mountedRatio, troopStrength, troopTotal, troops as troopTypes, type TroopCount, type TroopId } from "../data/troops";
import { partySpeed, partyStrength } from "./progression";
import { derivedInput } from "./experience";
import type { GameState } from "./store";

export type Order = "avancar" | "segurar" | "flanquear" | "recuar";

export type Battle = {
  id: string;
  enemyName: string;
  round: number;
  mine: TroopCount;
  theirs: TroopCount;
  /** Baixas acumuladas, para o relatório do fim. */
  myLosses: number;
  theirLosses: number;
  myMorale: number;
  theirMorale: number;
  /** O que aconteceu na última rodada. */
  log: string[];
  result: "andamento" | "vitoria" | "derrota" | "retirada";
  loot: number;
};

export const ORDERS: { id: Order; name: string; blurb: string }[] = [
  { id: "avancar", name: "Avançar", blurb: "Pressiona a linha. Machuca mais, apanha mais." },
  { id: "segurar", name: "Segurar a linha", blurb: "Aguenta o baque. Machuca menos, perde menos." },
  { id: "flanquear", name: "Flanquear", blurb: "Cavalaria pelo lado. Decide o dia — ou expõe o flanco." },
  { id: "recuar", name: "Recuar", blurb: "Sair enquanto dá. Custa homens e o que estiver em jogo." },
];

export function startBattle(s: GameState, enemy: TroopCount, enemyName: string): Battle {
  return {
    id: `batalha-${Date.now()}`,
    enemyName,
    round: 1,
    mine: { ...s.troops },
    theirs: { ...enemy },
    myLosses: 0,
    theirLosses: 0,
    myMorale: 100,
    theirMorale: 100,
    log: [],
    result: "andamento",
    loot: 0,
  };
}

/** Flanquear precisa de cavalo. Sem ele a ordem existe, mas é uma má ideia. */
export function canFlank(troops: TroopCount): boolean {
  return mountedRatio(troops) >= 0.12;
}

const ATTACK: Record<Order, number> = { avancar: 1.3, segurar: 0.85, flanquear: 1.7, recuar: 0.35 };
const DEFEND: Record<Order, number> = { avancar: 0.78, segurar: 1.35, flanquear: 0.68, recuar: 0.55 };

function takeLosses(troops: TroopCount, count: number): { troops: TroopCount; lost: number } {
  const next: TroopCount = { ...troops };
  let left = Math.max(0, Math.round(count));
  let lost = 0;
  // Cai quem está na frente: grau menor primeiro.
  for (const t of [...troopTypes].sort((a, b) => a.tier - b.tier)) {
    if (left <= 0) break;
    const have = next[t.id] ?? 0;
    const take = Math.min(have, left);
    if (take > 0) {
      next[t.id] = have - take;
      if (next[t.id] === 0) delete next[t.id as TroopId];
      left -= take;
      lost += take;
    }
  }
  return { troops: next, lost };
}

/** A ordem que o inimigo dá, em função de como está a batalha para ele. */
function enemyOrder(b: Battle): Order {
  if (b.theirMorale < 40) return "segurar";
  if (troopStrength(b.theirs) > troopStrength(b.mine) * 1.3) return "avancar";
  return b.round % 2 === 0 ? "avancar" : "segurar";
}

export function playRound(s: GameState, battle: Battle, order: Order, roll: number): Battle {
  const b: Battle = { ...battle, log: [] };
  const input = derivedInput(s);
  const skill = 1 + (s.skills.tatica ?? 0) / 260 + s.attributes.command * 0.018;

  /* ------------------------------- recuo ------------------------------- */
  if (order === "recuar") {
    const chance = Math.max(0.25, Math.min(0.9, 0.4 + (partySpeed(input) - 1) * 0.9 + (s.skills.logistica_militar ?? 0) / 300));
    if (roll < chance) {
      const parting = takeLosses(b.mine, Math.max(1, Math.round(troopTotal(b.mine) * 0.08)));
      b.mine = parting.troops;
      b.myLosses += parting.lost;
      b.result = "retirada";
      b.log.push(`Vocês desprendem e saem da linha. ${parting.lost > 0 ? `${parting.lost} ficaram para trás.` : "Ninguém ficou para trás."}`);
      return b;
    }
    b.log.push("A retirada não se abre: eles vêm em cima antes de vocês virarem.");
  }

  /* ------------------------------ a troca ------------------------------ */
  const theirOrder = enemyOrder(b);
  const flankFailed = order === "flanquear" && !canFlank(b.mine);

  const myAtk = partyStrength({ ...input, troops: b.mine }) * ATTACK[order] * skill * (flankFailed ? 0.55 : 1) * (0.6 + b.myMorale / 250);
  const theirAtk = troopStrength(b.theirs) * ATTACK[theirOrder] * (0.6 + b.theirMorale / 250);

  const theirTaken = (myAtk / Math.max(0.4, DEFEND[theirOrder])) * 0.09 * (0.8 + roll * 0.4);
  const myTaken = (theirAtk / Math.max(0.4, DEFEND[order])) * 0.09 * (0.8 + (1 - roll) * 0.4);

  const them = takeLosses(b.theirs, theirTaken);
  const me = takeLosses(b.mine, myTaken);
  b.theirs = them.troops;
  b.mine = me.troops;
  b.theirLosses += them.lost;
  b.myLosses += me.lost;

  // Moral cai com a perda relativa, e cai mais para quem está perdendo feio.
  const theirBefore = troopTotal(them.troops) + them.lost;
  const myBefore = troopTotal(me.troops) + me.lost;
  b.theirMorale = Math.max(0, Math.round(b.theirMorale - (them.lost / Math.max(1, theirBefore)) * 150));
  b.myMorale = Math.max(0, Math.round(b.myMorale - (me.lost / Math.max(1, myBefore)) * 130));
  if (order === "segurar") b.myMorale = Math.min(100, b.myMorale + 4);

  const orderName = ORDERS.find((o) => o.id === order)!.name;
  b.log.push(
    flankFailed
      ? `Sem cavalo não há flanco: a manobra vira uma corrida a pé e o lado fica aberto. ${me.lost} caem, ${them.lost} do outro lado.`
      : `${orderName}. ${them.lost} deles caem, ${me.lost} dos seus.`,
  );

  /* ------------------------------ desfecho ----------------------------- */
  if (troopTotal(b.theirs) === 0 || b.theirMorale <= 0) {
    b.result = "vitoria";
    b.loot = Math.round(20 + b.theirLosses * 11);
    b.log.push(troopTotal(b.theirs) === 0 ? "O último deles cai. O campo é seu." : "A linha deles quebra e o que sobrou corre.");
  } else if (troopTotal(b.mine) === 0 || b.myMorale <= 0) {
    b.result = "derrota";
    b.log.push(troopTotal(b.mine) === 0 ? "Não sobrou linha para segurar." : "Seus homens quebram. Não há ordem que os traga de volta.");
  } else {
    b.round += 1;
  }
  return b;
}
