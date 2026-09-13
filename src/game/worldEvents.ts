/**
 * COISAS QUE ESTÃO NO MUNDO.
 *
 * Um encontro não precisa ser uma janela que aparece do nada. Ele pode ser um
 * OBJETO no mapa: uma carruagem tombada entre as árvores, que você vê de longe
 * e decide se vai olhar. Aproximar-se é a interação; ignorar também é.
 *
 * É a diferença entre "bandidos apareceram" e "há uma carroça quebrada ali
 * adiante, e alguma coisa se mexe debaixo dela".
 *
 * O evento é PERSISTENTE: ele fica onde está, guarda o que aconteceu com ele,
 * e continua existindo depois de resolvido — carroça saqueada continua sendo
 * uma carroça saqueada no meio da estrada.
 */
import type { Point, RegionId } from "../world/types";

export type WorldEventType =
  | "wrecked_carriage"
  | "burned_village"
  | "abandoned_camp"
  | "battlefield";

export type WorldEventInstance = {
  id: string;
  type: WorldEventType;
  x: number;
  y: number;
  regionId: RegionId;
  /** Hora do mundo em que apareceu. */
  createdAt: number;
  /** Some depois disto, quando for temporário. */
  expiresAt?: number;
  /** Estado próprio do evento — cada tipo interpreta o seu. */
  state: string;
  /** Desenhado no mapa. */
  visible: boolean;
  /** O jogador já chegou perto o bastante para saber o que é. */
  discovered: boolean;
  resolved: boolean;
  payload?: Record<string, string | number | boolean>;
};

/** A que distância um evento é notado. Perto: o mapa é para ser olhado. */
export const NOTICE_RADIUS = 520;

export function distanceTo(event: WorldEventInstance, p: Point): number {
  return Math.hypot(event.x - p.x, event.y - p.y);
}

/** O nome só aparece depois de descoberto — antes é uma forma no chão. */
export const EVENT_LABEL: Record<WorldEventType, string> = {
  wrecked_carriage: "Carruagem tombada",
  burned_village: "Aldeia queimada",
  abandoned_camp: "Acampamento abandonado",
  battlefield: "Campo de batalha",
};
