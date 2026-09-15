/**
 * DE QUEM É CADA SENHORIO, AGORA.
 *
 * Mesmo padrão de `territories.ts`, um nível abaixo: a região tem um
 * controlador, o senhorio tem um DONO, e os dois mudam por caminhos
 * diferentes. Conquistar uma região é uma guerra; comprar um senhorio é uma
 * transação — e é por isso que cada um tem o seu registro.
 *
 * O estado começa no dono histórico de cada senhorio e é mutável de propósito:
 * compra, herança, dote, confisco e tomada à força vão escrever aqui.
 */
import { useSyncExternalStore } from "react";
import { fiefById, fiefs } from "../world/fiefs";
import { getState, update } from "../game/store";
import { relationWith } from "./player";
import type { FiefOwner } from "../world/types";

const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version++;
  for (const fn of listeners) fn();
}

/** Dono corrente: o que a campanha gravou, ou o dono histórico. */
export function ownerOf(fiefId: string): FiefOwner {
  const overrides = getState().fiefOwners;
  return overrides[fiefId] ?? fiefById.get(fiefId)?.ownerHouseId ?? "house_valdoria";
}

/** Compra, confisco, dote, conquista — tudo passa por aqui. */
export function setOwner(fiefId: string, houseId: FiefOwner) {
  if (ownerOf(fiefId) === houseId) return;
  update((s) => ({ ...s, fiefOwners: { ...s.fiefOwners, [fiefId]: houseId } }));
  emit();
}

export function fiefsOwnedBy(houseId: FiefOwner): string[] {
  return fiefs.filter((f) => ownerOf(f.id) === houseId).map((f) => f.id);
}

/** Senhorios do jogador. Vazio enquanto ele não tiver Casa nem terra. */
export function playerFiefs(): string[] {
  return Object.entries(getState().fiefOwners)
    .filter(([, owner]) => owner === "player")
    .map(([id]) => id);
}

export type BuyBlock = "none" | "gold" | "relation" | "not_for_sale";

/**
 * O QUE ESTA TERRA CUSTA A VOCÊ.
 *
 * Não é o valor de tabela: é o valor menos o que a Casa gosta de você. Uma
 * Casa que o estima vende por dois terços; uma que o tolera, pelo preço
 * cheio. Isso faz relação valer dinheiro — e dá uma segunda rota para a
 * primeira terra além da que a campanha entrega.
 */
export function priceFor(fiefId: string): number {
  const fief = fiefById.get(fiefId);
  if (!fief) return 0;
  const owner = ownerOf(fiefId);
  if (owner === "player") return 0;
  const relation = Math.max(0, Math.min(70, relationWith(owner)));
  return Math.round(fief.value * (1 - relation / 200));
}

/** Relação mínima com a Casa dona para ela sequer ouvir uma oferta. */
export const BUY_RELATION = 10;

/**
 * Por que não dá para comprar este senhorio, se for o caso.
 *
 * Um senhorio NOBRE é a base do poder de uma Casa: não se vende a um viajante
 * sem nome. Os menores, sim — por dinheiro e com a Casa de bom humor.
 */
export function buyBlocker(fiefId: string): BuyBlock {
  const fief = fiefById.get(fiefId);
  if (!fief) return "not_for_sale";
  if (fief.tier === "nobre") return "not_for_sale";
  const owner = ownerOf(fiefId);
  if (owner === "player") return "not_for_sale";
  if (relationWith(owner) < BUY_RELATION) return "relation";
  if (getState().gold < priceFor(fiefId)) return "gold";
  return "none";
}

/** Compra de verdade: tira o ouro, troca o dono. */
export function buyFief(fiefId: string): BuyBlock {
  const blocker = buyBlocker(fiefId);
  if (blocker !== "none") return blocker;
  const price = priceFor(fiefId);
  update((s) => ({
    ...s,
    gold: s.gold - price,
    fiefOwners: { ...s.fiefOwners, [fiefId]: "player" },
  }));
  emit();
  return "none";
}

/** Acordo negociado também troca ouro e posse na mesma alteração. */
export function purchaseAt(fiefId: string, price: number): boolean {
  const fief = fiefById.get(fiefId);
  if (!fief || fief.tier === "nobre" || ownerOf(fiefId) === "player" || getState().gold < price) return false;
  update(s => ({ ...s, gold: s.gold - price, fiefOwners: { ...s.fiefOwners, [fiefId]: "player" } }));
  emit();
  return true;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Assinatura para a renderização, igual à dos territórios. */
export function useFiefOwners(): number {
  return useSyncExternalStore(subscribe, () => version, () => version);
}
