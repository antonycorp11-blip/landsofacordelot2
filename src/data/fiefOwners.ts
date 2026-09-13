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
  if (getState().gold < fief.value) return "gold";
  return "none";
}

/** Compra de verdade: tira o ouro, troca o dono. */
export function buyFief(fiefId: string): BuyBlock {
  const blocker = buyBlocker(fiefId);
  if (blocker !== "none") return blocker;
  const fief = fiefById.get(fiefId)!;
  update((s) => ({
    ...s,
    gold: s.gold - fief.value,
    fiefOwners: { ...s.fiefOwners, [fiefId]: "player" },
  }));
  emit();
  return "none";
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Assinatura para a renderização, igual à dos territórios. */
export function useFiefOwners(): number {
  return useSyncExternalStore(subscribe, () => version, () => version);
}
