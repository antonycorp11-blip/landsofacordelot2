import { useGame } from "../../game/store";
import { locationId } from "../../game/presence";
import { poiById, allPois } from "../../world/valdoria";
import { holdingFor } from "../../data/holdings";
import { tutorialFlag } from "../../game/adventure";
import type { RoadStop } from "../../world/roadStops";
import "./coach.css";

/**
 * O JOGO SE ENSINA FAZENDO.
 *
 * Nada de manual, nada de aula: uma linha por vez, dizendo a PRÓXIMA ação, e
 * ela some sozinha quando a ação acontece. O jogador começa perdido numa
 * estrada de floresta e a primeira coisa que aprende é andar — porque é a
 * primeira coisa que ele precisa fazer.
 *
 * Cada passo é lido do estado do jogo, não de um contador próprio: se o
 * jogador descobrir sozinho e pular etapas, o guia pula junto.
 */
type Step = { id: string; title: string; body: string };

export function Coach({ stop, traveling }: { stop: RoadStop; traveling: boolean }) {
  const game = useGame();
  const tutorial = game.adventure.tutorial;
  if (tutorial.hidden) return null;

  const here = locationId(game);
  const atPlace = here ? poiById.get(here) : undefined;

  const step = nextStep();
  if (!step) return null;

  function nextStep(): Step | null {
    if (!tutorial.departed) {
      return {
        id: "move",
        title: "Você não sabe onde está",
        body: traveling
          ? "Boa. A estrada leva a algum lugar — sempre leva."
          : "Toque em qualquer ponto da estrada para caminhar até lá.",
      };
    }
    if (!atPlace) {
      const target = nearestPlace(stop);
      return {
        id: "reach",
        title: target ? `Há fumaça adiante: ${target.name}` : "Siga a estrada",
        body: target
          ? `Toque em ${target.name} para seguir até lá. Um toque num lugar é partir para ele.`
          : "Siga a estrada até encontrar gente.",
      };
    }
    if (!tutorial.accepted) {
      return {
        id: "talk",
        title: `Você chegou a ${atPlace.name}`,
        body: "No menu do lugar, toque em Falar. Quem manda aqui tem trabalho — e diz o preço antes.",
      };
    }
    if (!tutorial.completed) {
      return {
        id: "deliver",
        title: "Você tem um encargo",
        body: "Toque no destino no mapa e vá até lá. Na chegada, o menu abre com Entregar.",
      };
    }
    if (!tutorial.sheetViewed) {
      return {
        id: "sheet",
        title: "Você aprendeu alguma coisa",
        body: "Toque no seu retrato, no canto. O anel em volta dele é o quanto falta para o próximo nível.",
      };
    }
    return null;
  }

  return (
    <div className="coach" role="status">
      <div className="coach-text">
        <b>{step.title}</b>
        <span>{step.body}</span>
      </div>
      <button className="coach-close" onClick={() => tutorialFlag("hidden")} aria-label="Não mostrar mais dicas">
        ×
      </button>
    </div>
  );
}

/** O lugar habitado mais próximo de onde o viajante está. */
function nearestPlace(stop: RoadStop) {
  let best: { poi: (typeof allPois)[number]; d: number } | null = null;
  for (const poi of allPois) {
    if (!poi.routeNode || holdingFor(poi).kind === "site") continue;
    const d = Math.hypot(poi.x - stop.x, poi.y - stop.y);
    if (!best || d < best.d) best = { poi, d };
  }
  return best?.poi;
}
