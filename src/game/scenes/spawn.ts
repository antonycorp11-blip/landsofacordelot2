/**
 * ONDE A PRIMEIRA COISA ACONTECE.
 *
 * A carruagem é posicionada a partir do mesmo ponto que abre a campanha, com
 * um deslocamento fixo e uma atração para chão caminhável — assim ela cai
 * sempre no mesmo lugar, sempre alcançável, e nunca dentro de um rio.
 */
import { nearestWalkable, regionAtPoint } from "../../world/navigation/navigationGrid";
import { openingStop } from "../../world/roadStops";
import type { WorldEventInstance } from "../worldEvents";

export function openingCarriage(): WorldEventInstance {
  const start = openingStop();
  // Longe o bastante para exigir uma cavalgada curta, perto o bastante para
  // ser vista do primeiro enquadramento.
  const wanted = { x: start.x + 980, y: start.y - 560 };
  const at = nearestWalkable(wanted) ?? wanted;
  return {
    id: "we_carruagem",
    type: "wrecked_carriage",
    x: at.x,
    y: at.y,
    regionId: regionAtPoint(at) ?? "elmwood",
    createdAt: 0,
    state: "fresh",
    visible: true,
    discovered: false,
    resolved: false,
    payload: { scene: "wrecked_carriage" },
  };
}
