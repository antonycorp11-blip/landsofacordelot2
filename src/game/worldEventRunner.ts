/**
 * APROXIMAR-SE É A INTERAÇÃO.
 *
 * Nada aqui abre janela porque um contador chegou a zero: o jogador chegou
 * perto de uma coisa que estava no mapa. A checagem roda no quadro da viagem,
 * mas com folga — meio segundo é bastante para um cavalo, e sessenta vezes por
 * segundo seria desperdício puro.
 */
import { getState, update } from "./store";
import { openScene } from "./sceneRunner";
import { distanceTo } from "./worldEvents";
import type { Point } from "../world/types";

let lastCheck = 0;
const INTERVAL_MS = 500;

export function discoverNearbyEvent(pos: Point, radius: number) {
  const now = performance.now();
  if (now - lastCheck < INTERVAL_MS) return;
  lastCheck = now;

  const s = getState();
  if (!s.started) return;
  const a = s.adventure;
  if (a.cinematic || a.battle || a.event || a.notice || a.raid || a.quest?.pending || a.story.pending) return;

  for (const event of Object.values(s.worldEvents)) {
    if (!event.visible || event.resolved) continue;
    if (distanceTo(event, pos) > radius) continue;

    if (!event.discovered) {
      update((g) => ({
        ...g,
        worldEvents: { ...g.worldEvents, [event.id]: { ...g.worldEvents[event.id], discovered: true } },
      }));
    }
    const scene = event.payload?.scene;
    if (typeof scene === "string") openScene(scene, event.id);
    return;
  }
}
