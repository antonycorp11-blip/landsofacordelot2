/**
 * QUEM MANDA EM CADA SENHORIO.
 *
 * Esta é a única resposta para "de que cor é este território". A região não
 * tem cor política própria: ela tem um CONTROLADOR, e a cor vem da Casa que o
 * controla. Trocar o controlador repinta o mapa, muda a borda e troca o brasão
 * exibido nas estruturas — sem editar componente nenhum.
 *
 * O estado começa no dono histórico de cada região (`region.houseId`) e é
 * mutável de propósito: conquista, rebelião e ocupação vão escrever aqui.
 */
import { useSyncExternalStore } from "react";
import { houseById } from "./houses";
import type { HouseId, RegionId } from "../world/types";
import { regions } from "../world/valdoria";

const controllers = new Map<RegionId, HouseId>(regions.map((r) => [r.id, r.houseId]));

const listeners = new Set<() => void>();
/** Muda a cada alteração: é o que o React observa para repintar. */
let version = 0;

function emit() {
  version++;
  for (const fn of listeners) fn();
}

export function controllerOf(regionId: RegionId): HouseId {
  return controllers.get(regionId) ?? regions[0].houseId;
}

/** Conquista, cessão, rebelião — tudo passa por aqui. */
export function setController(regionId: RegionId, houseId: HouseId) {
  if (controllers.get(regionId) === houseId) return;
  controllers.set(regionId, houseId);
  emit();
}

/** Regiões sob esta Casa agora. Uma Casa pode ter nenhuma, uma ou várias. */
export function regionsControlledBy(houseId: HouseId): RegionId[] {
  return [...controllers].filter(([, h]) => h === houseId).map(([r]) => r);
}

/** Cor política de um território, sempre pela Casa que o controla. */
export function territoryColor(regionId: RegionId): string {
  return houseById.get(controllerOf(regionId))?.color ?? "#888888";
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Assinatura para a renderização.
 *
 * Devolve só o número da versão: quem usa lê o controlador na hora do render.
 * É o suficiente para que uma conquista repinte a camada política sozinha.
 */
export function useTerritories(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
}
