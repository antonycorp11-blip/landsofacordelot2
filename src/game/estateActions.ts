/**
 * As três alavancas de administrar terra, do lado do estado.
 *
 * Ficam fora de `estates.ts` de propósito: lá mora a REGRA (quanto rende,
 * quanto custa, quando a terra se levanta), aqui mora a MUDANÇA. Uma tela que
 * importa a regra não consegue alterar nada sem passar por aqui.
 */
import type { TroopId } from "../data/troops";
import { getState, update } from "../game/store";
import { estateOf, investCost, INVEST_STEP, type TaxLevel } from "./estates";

function owns(fiefId: string): boolean {
  return getState().fiefOwners[fiefId] === "player";
}

export function setTax(fiefId: string, tax: TaxLevel): boolean {
  if (!owns(fiefId)) return false;
  update((s) => ({ ...s, fiefEstates: { ...s.fiefEstates, [fiefId]: { ...estateOf(s, fiefId), tax } } }));
  return true;
}

/** Obras: ouro agora, renda para sempre. */
export function invest(fiefId: string): boolean {
  const s = getState();
  if (!owns(fiefId)) return false;
  const estate = estateOf(s, fiefId);
  const cost = investCost(estate);
  if (s.gold < cost || estate.prosperity >= 100) return false;
  update((g) => ({
    ...g,
    gold: g.gold - cost,
    fiefEstates: { ...g.fiefEstates, [fiefId]: {
      ...estate,
      prosperity: Math.min(100, estate.prosperity + INVEST_STEP),
      // Obra feita também acalma: quem vê estrada nova reclama menos.
      loyalty: Math.min(100, estate.loyalty + 4),
    } },
  }));
  return true;
}

/**
 * Um homem entre o grupo e a guarnição. `delta` positivo destaca; negativo
 * recolhe. Nunca cria nem some com ninguém: é sempre transferência.
 */
export function moveGarrison(fiefId: string, troop: TroopId, delta: number): boolean {
  const s = getState();
  if (!owns(fiefId) || delta === 0) return false;
  const estate = estateOf(s, fiefId);
  const here = estate.garrison[troop] ?? 0;
  const withYou = s.troops[troop] ?? 0;
  if (delta > 0 && withYou < delta) return false;
  if (delta < 0 && here < -delta) return false;

  update((g) => {
    const garrison = { ...estate.garrison, [troop]: here + delta };
    if (!garrison[troop]) delete garrison[troop];
    const troops = { ...g.troops, [troop]: withYou - delta };
    if (!troops[troop]) delete troops[troop];
    return { ...g, troops, fiefEstates: { ...g.fiefEstates, [fiefId]: { ...estate, garrison } } };
  });
  return true;
}
