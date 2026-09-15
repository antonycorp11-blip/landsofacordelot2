/**
 * As três alavancas de administrar terra, do lado do estado.
 *
 * Ficam fora de `estates.ts` de propósito: lá mora a REGRA (quanto rende,
 * quanto custa, quando a terra se levanta), aqui mora a MUDANÇA. Uma tela que
 * importa a regra não consegue alterar nada sem passar por aqui.
 */
import type { TroopId } from "../data/troops";
import { getState, update } from "../game/store";
import { estateOf, investCost, INVEST_STEP, WORKS, workCost, type EstateWork, type TaxLevel } from "./estates";
import { fiefById } from "../world/fiefs";
import { tilt, TILT } from "./balance";

function owns(fiefId: string): boolean {
  return getState().fiefOwners[fiefId] === "player";
}

export function setTax(fiefId: string, tax: TaxLevel): boolean {
  if (!owns(fiefId)) return false;
  update((s) => ({ ...s, fiefEstates: { ...s.fiefEstates, [fiefId]: { ...estateOf(s, fiefId), tax } } }));
  // Como ele cobra é a coisa que mais diz quem ele está virando, porque é a
  // única que ele decide toda semana e que outra gente paga.
  if (tax === "pesado") tilt(TILT.taxPesado, "Imposto pesado");
  if (tax === "baixo") tilt(TILT.taxBaixo, "Imposto baixo");
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
  tilt(TILT.investir, "Obra paga do seu bolso");
  return true;
}

/** Materiais comprados e transportados viram uma obra que demora dias reais. */
export function startWork(fiefId: string, kind: EstateWork): boolean {
  const s = getState();
  const fief = fiefById.get(fiefId);
  if (!fief || !owns(fiefId)) return false;
  if (kind === "walls" && !["castle", "fort", "fortress"].includes(fief.seatType)) return false;
  const estate = estateOf(s, fiefId);
  if (estate.project || (estate.buildings?.[kind] ?? 0) >= WORKS[kind].max) return false;
  const cost = workCost(estate, kind);
  if (s.gold < cost.gold || (s.inventory.wood ?? 0) < cost.wood || (s.inventory.tools ?? 0) < cost.tools) return false;
  const today = Math.max(s.dayProcessed, Math.floor((s.journey?.hours ?? 0) / 24) + 1);
  update(g => {
    const inventory = { ...g.inventory };
    const inventoryCost = { ...g.inventoryCost };
    for (const [good, amount] of [["wood", cost.wood], ["tools", cost.tools]] as const) {
      if (!amount) continue;
      const old = inventory[good] ?? 0;
      const left = old - amount;
      inventory[good] = left;
      inventoryCost[good] = left ? Math.round((inventoryCost[good] ?? 0) * left / old) : 0;
      if (!left) { delete inventory[good]; delete inventoryCost[good]; }
    }
    return { ...g, gold: g.gold - cost.gold, inventory, inventoryCost,
      fiefEstates: { ...g.fiefEstates, [fiefId]: { ...estate, project: { kind, readyDay: today + cost.days } } } };
  });
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
