/**
 * ENCONTRO COM UM BANDO.
 *
 * A estrada precisava ter risco. Sem risco, tropa é enfeite: você recruta,
 * paga salário e nunca descobre para quê. Com risco, cada moeda gasta em
 * homens é uma aposta que a estrada cobra ou devolve.
 *
 * O confronto NÃO é uma batalha desenhada — é a resolução automática, que é
 * exatamente o que Mount & Blade faz quando você manda os soldados sem entrar
 * no campo. O que importa aqui é que o resultado use os números que já
 * existem (força de tropa, Tática, Comando, velocidade do grupo) e que ele
 * DOA: homem que morre não volta, ouro que se perde faz falta no dia seguinte.
 */
import { troopStrength, troopTotal, troops as troopTypes, type TroopCount, type TroopId } from "../data/troops";
import { bystanderName, hashText } from "../data/notables";
import { partySpeed, partyStrength } from "./progression";
import { derivedInput } from "./experience";
import type { GameState } from "./store";

export type Raid = {
  id: string;
  name: string;
  band: TroopCount;
  /** Quanto eles exigem para deixar passar. */
  toll: number;
};

/** Um bando proporcional ao perigo da estrada, com semente estável. */
export function makeRaid(seed: string, danger: number, day: number): Raid {
  const h = hashText(`${seed}:${day}`);
  const rand = (n: number, salt: number) => ((h >>> salt) % n);
  const size = 3 + rand(7, 3) + Math.round(danger * 8);
  const band: TroopCount = {};
  const hardened = danger > 0.25 ? Math.round(size * 0.25) : 0;
  band.camponeses = Math.max(1, size - hardened - Math.round(size * 0.35));
  band.milicianos = Math.round(size * 0.35);
  if (hardened > 0) band.infantaria = hardened;
  return {
    id: `raid-${h}`,
    name: `Bando de ${bystanderName(`${seed}:${day}`)}`,
    band,
    toll: Math.round(20 + troopStrength(band) * 9),
  };
}

/* --------------------------- o que pode dar --------------------------- */

export type RaidOutcome = {
  kind: "vitoria" | "derrota" | "fuga" | "fuga_falhou" | "pedagio";
  text: string;
  goldDelta: number;
  foodDelta: number;
  troopsLost: number;
  xp: number;
  /** Horas perdidas na confusão. */
  hours: number;
};

/** Chance de vencer, já com Tática e Comando pesando. */
export function winChance(s: GameState, raid: Raid): number {
  const mine = partyStrength(derivedInput(s));
  const theirs = troopStrength(raid.band);
  if (theirs <= 0) return 1;
  const raw = mine / (mine + theirs);
  const edge = (s.skills.tatica ?? 0) / 400 + s.attributes.command * 0.012;
  return Math.max(0.03, Math.min(0.97, raw + edge));
}

/** Chance de escapar sem lutar: pernas, cavalo e logística. */
export function fleeChance(s: GameState): number {
  const speed = partySpeed(derivedInput(s));
  const base = 0.42 + (speed - 1) * 0.9 + (s.skills.logistica_militar ?? 0) / 320;
  return Math.max(0.15, Math.min(0.92, base));
}

function takeLosses(troops: TroopCount, count: number): { troops: TroopCount; lost: number } {
  const next: TroopCount = { ...troops };
  let left = count;
  let lost = 0;
  // Morre quem está na frente: os de menor grau primeiro.
  const order = [...troopTypes].sort((a, b) => a.tier - b.tier);
  for (const t of order) {
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

/** Aplica um desfecho ao estado. Uma vez só — quem chama guarda o resultado. */
export function resolveRaid(s: GameState, raid: Raid, action: "lutar" | "fugir" | "pagar", roll: number): { state: GameState; outcome: RaidOutcome } {
  const mineCount = troopTotal(s.troops);

  if (action === "pagar") {
    const paid = Math.min(s.gold, raid.toll);
    return {
      state: { ...s, gold: s.gold - paid },
      outcome: {
        kind: "pedagio", goldDelta: -paid, foodDelta: 0, troopsLost: 0, xp: 5, hours: 1,
        text: `Você paga ${paid} moedas e eles abrem caminho. Ninguém sangra, e todo mundo sabe que você paga.`,
      },
    };
  }

  if (action === "fugir") {
    if (roll < fleeChance(s)) {
      return {
        state: s,
        outcome: {
          kind: "fuga", goldDelta: 0, foodDelta: 0, troopsLost: 0, xp: 15, hours: 3,
          text: "Vocês saem da estrada e cortam mato até o barulho ficar para trás. Custou três horas e nenhum homem.",
        },
      };
    }
    // Fugir e falhar é a pior das opções: entra-se na briga já atrás.
    const forced = resolveRaid(s, raid, "lutar", Math.min(0.99, roll + 0.25));
    return {
      state: forced.state,
      outcome: { ...forced.outcome, kind: "fuga_falhou", hours: forced.outcome.hours + 2,
        text: `Eles são mais rápidos. ${forced.outcome.text}` },
    };
  }

  const won = roll < winChance(s, raid);
  const theirs = troopStrength(raid.band);

  if (won) {
    const lost = Math.min(mineCount, Math.round(theirs / 7));
    const after = takeLosses(s.troops, lost);
    const loot = Math.round(18 + theirs * 7);
    return {
      state: { ...s, troops: after.troops, gold: s.gold + loot },
      outcome: {
        kind: "vitoria", goldDelta: loot, foodDelta: 0, troopsLost: after.lost,
        xp: Math.round(40 + theirs * 4), hours: 2,
        text: after.lost > 0
          ? `O bando quebra e corre. Você recolhe ${loot} moedas do que deixaram para trás — e enterra ${after.lost}.`
          : `O bando quebra e corre sem lhe custar um homem. ${loot} moedas ficam no chão.`,
      },
    };
  }

  const lost = Math.min(mineCount, Math.max(1, Math.round(mineCount * 0.45)));
  const after = takeLosses(s.troops, lost);
  const robbed = Math.round(s.gold * 0.35);
  const food = Math.min(s.food, Math.round(s.food * 0.5));
  return {
    state: { ...s, troops: after.troops, gold: s.gold - robbed, food: s.food - food },
    outcome: {
      kind: "derrota", goldDelta: -robbed, foodDelta: -food, troopsLost: after.lost, xp: 20, hours: 5,
      text: mineCount > 0
        ? `A linha cede. Vocês recuam deixando ${after.lost} para trás, e eles levam ${robbed} moedas e metade das provisões.`
        : `Sozinho não há linha que ceda — há só você no chão. Levam ${robbed} moedas e metade das provisões, e deixam você respirando.`,
    },
  };
}
