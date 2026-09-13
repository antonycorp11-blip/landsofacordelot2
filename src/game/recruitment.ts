/**
 * RECRUTAMENTO.
 *
 * Tropa custa ouro e é finita. Cada estrutura tem o seu poço de recrutas,
 * derivado do que ela é — uma fortaleza oferece infantaria e cavalaria, uma
 * aldeia oferece camponeses — e o poço diminui quando você recruta.
 *
 * O poço é DERIVADO, não autorado: cinquenta e duas tabelas escritas à mão
 * seriam cinquenta e duas oportunidades de esquecer uma. Vem do tipo da
 * estrutura, da população e da segurança, com uma semente estável por lugar,
 * então o mesmo castelo oferece sempre a mesma coisa.
 */
import { makeRng } from "../world/geo";
import { holdingFor, type Holding } from "../data/holdings";
import { troopById, troopTotal, type TroopCount, type TroopId } from "../data/troops";
import type { PointOfInterest } from "../world/types";
import { getState, setRecruitPool, spendGold, addTroops } from "./store";
import { derivedInput, troopLimit } from "./experience";
import { isPresent } from "./presence";
import { recruitBonus } from "./progression";
import { relationWith } from "../data/player";

/** Dias do mundo até um lugar repor o que foi levado. */
const REFRESH_DAYS = 6;

/** Que tropas cada tipo de lugar oferece, e quanto da população vira recruta. */
const OFFER: Record<string, { id: TroopId; share: number }[]> = {
  castle:   [{ id: "milicianos", share: 0.006 }, { id: "infantaria", share: 0.004 }, { id: "arqueiros", share: 0.002 }, { id: "cavaleiros", share: 0.0012 }],
  city:     [{ id: "camponeses", share: 0.0012 }, { id: "milicianos", share: 0.0011 }, { id: "infantaria", share: 0.0005 }, { id: "arqueiros", share: 0.0004 }],
  town:     [{ id: "camponeses", share: 0.003 }, { id: "milicianos", share: 0.0025 }, { id: "arqueiros", share: 0.0008 }],
  village:  [{ id: "camponeses", share: 0.008 }, { id: "milicianos", share: 0.003 }],
  military: [{ id: "milicianos", share: 0.02 }, { id: "infantaria", share: 0.015 }, { id: "arqueiros", share: 0.01 }],
  market:   [{ id: "camponeses", share: 0.004 }, { id: "milicianos", share: 0.002 }],
  port:     [{ id: "camponeses", share: 0.0015 }, { id: "milicianos", share: 0.0012 }, { id: "arqueiros", share: 0.0004 }],
  mine:     [{ id: "camponeses", share: 0.006 }, { id: "milicianos", share: 0.002 }],
  estate:   [{ id: "camponeses", share: 0.01 }],
  temple:   [],
  site:     [],
};

/** Recrutas que este lugar oferece quando está cheio. */
export function basePool(poi: PointOfInterest, holding: Holding): TroopCount {
  const rng = makeRng(`recruit-${poi.id}`);
  const pool: TroopCount = {};
  // Lugar inseguro tem menos gente disposta; lugar leal, mais.
  const bonus = Math.min(1.25,recruitBonus(derivedInput()));
  const mood = 0.7 + (holding.security / 100) * 0.3 + (holding.loyalty / 100) * 0.3;
  for (const { id, share } of OFFER[holding.kind] ?? []) {
    const n = Math.floor(holding.population * share * mood * bonus * (0.75 + rng() * 0.5));
    if (n > 0) pool[id] = n;
  }
  return pool;
}

/**
 * Poço atual de um lugar, repondo sozinho com o passar dos dias.
 *
 * Chamado na hora de abrir o recrutamento — não há laço rodando por trás para
 * cinquenta e dois lugares que o jogador talvez nunca visite.
 */
export function currentPool(poi: PointOfInterest, worldHours: number): TroopCount {
  const day = Math.floor(worldHours / 24);
  const s = getState();
  const stored = s.recruitPools[poi.id];
  const lastDay = s.poolRefreshDay[poi.id] ?? day;
  const base = basePool(poi, holdingFor(poi));

  if (!stored) return base;
  if (day - lastDay < REFRESH_DAYS) return stored;

  // Repõe uma fração do que falta para cada tipo, por ciclo decorrido.
  const cycles = Math.floor((day - lastDay) / REFRESH_DAYS);
  const next: TroopCount = { ...stored };
  for (const [id, full] of Object.entries(base) as [TroopId, number][]) {
    const have = next[id] ?? 0;
    next[id] = Math.min(full, have + Math.ceil(full * 0.4) * cycles);
  }
  return next;
}

export type RecruitBlock = "none" | "away" | "hostile" | "gold" | "limit" | "empty";

/** Por que não dá para recrutar aqui, se for o caso. */
export function recruitBlocker(poi: PointOfInterest, pool: TroopCount): RecruitBlock {
  if (!isPresent(poi.id)) return "away";
  const holding = holdingFor(poi);
  if (relationWith(holding.controllerHouseId) <= -50) return "hostile";
  if (troopTotal(pool) === 0) return "empty";
  return "none";
}

export type RecruitOffer = {
  id: TroopId;
  available: number;
  cost: number;
  /** Quantos cabem, considerando ouro e limite de comando. */
  affordable: number;
};

/** O que este lugar oferece a VOCÊ, agora. */
export function offersAt(poi: PointOfInterest, worldHours: number): RecruitOffer[] {
  const pool = currentPool(poi, worldHours);
  const s = getState();
  const room = Math.max(0, troopLimit(s) - troopTotal(s.troops));

  return (Object.entries(pool) as [TroopId, number][])
    .filter(([, n]) => n > 0)
    .map(([id, n]) => {
      const troop = troopById.get(id)!;
      // O bônus já participa da formação do estoque; a oferta nunca anuncia vagas inexistentes.
      const available = n;
      return {
        id,
        available,
        cost: troop.recruitCost,
        affordable: Math.max(0, Math.min(available, room, Math.floor(s.gold / troop.recruitCost))),
      };
    })
    .sort((a, b) => troopById.get(a.id)!.tier - troopById.get(b.id)!.tier);
}

export type RecruitResult = { ok: boolean; reason?: RecruitBlock };

/**
 * Recruta de verdade: tira do poço, tira o ouro, põe no grupo.
 *
 * Nunca deixa passar do limite de comando nem do ouro disponível — as duas
 * checagens ficam aqui, e não na interface, para que missão e evento que
 * recrutarem no futuro passem pelas mesmas regras.
 */
export function recruit(poi: PointOfInterest, id: TroopId, amount: number, worldHours: number): RecruitResult {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: "empty" };
  const troop = troopById.get(id);
  if (!troop) return { ok: false, reason: "empty" };

  const s = getState();
  const pool = currentPool(poi, worldHours);
  const block = recruitBlocker(poi, pool);
  if (block !== "none") return { ok:false, reason:block };
  const have = pool[id] ?? 0;
  if (have < amount) return { ok: false, reason: "empty" };

  const room = troopLimit(s) - troopTotal(s.troops);
  if (amount > room) return { ok: false, reason: "limit" };

  const price = troop.recruitCost * amount;
  if (s.gold < price) return { ok: false, reason: "gold" };

  if (!spendGold(price)) return { ok: false, reason: "gold" };
  addTroops(id, amount);
  setRecruitPool(poi.id, { ...pool, [id]: have - amount }, Math.floor(worldHours / 24));
  return { ok: true };
}
