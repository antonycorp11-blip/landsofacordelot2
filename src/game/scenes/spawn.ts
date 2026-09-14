/**
 * ONDE A PRIMEIRA COISA ACONTECE.
 *
 * A carruagem é posicionada a partir do mesmo ponto que abre a campanha, com
 * um deslocamento fixo e uma atração para chão caminhável — assim ela cai
 * sempre no mesmo lugar, sempre alcançável, e nunca dentro de um rio.
 */
import { nearestWalkable, regionAtPoint } from "../../world/navigation/navigationGrid";
import { openingStop } from "../../world/roadStops";
import type { RoadStop } from "../../world/roadStops";
import type { WorldEventInstance } from "../worldEvents";

/** Onde a carruagem cai. Uma conta só, usada pelo evento e pelo ponto inicial. */
function carriagePoint() {
  const start = openingStop();
  const wanted = { x: start.x + 980, y: start.y - 560 };
  return nearestWalkable(wanted) ?? wanted;
}

/**
 * ONDE O JOGADOR ABRE OS OLHOS.
 *
 * Em cima da carruagem, e não a uma cavalgada dela. A abertura é uma cena, não
 * uma viagem: quando o texto termina ele já está lá, que é como um jogo conta
 * uma coisa que aconteceu com o personagem antes de o jogador assumir.
 */
export function openingStart(): RoadStop {
  const at = carriagePoint();
  return { kind: "free", x: at.x, y: at.y };
}

export function openingCarriage(): WorldEventInstance {
  const at = carriagePoint();
  return {
    id: "we_carruagem",
    type: "wrecked_carriage",
    x: at.x,
    y: at.y,
    regionId: regionAtPoint(at) ?? "elmwood",
    createdAt: 0,
    state: "fresh",
    visible: true,
    // Já vista e já usada: a cena abre junto com a campanha, e sem isto o
    // verificador de proximidade a reabriria no primeiro quadro depois dela.
    discovered: true,
    resolved: true,
    payload: { scene: "wrecked_carriage" },
  };
}
