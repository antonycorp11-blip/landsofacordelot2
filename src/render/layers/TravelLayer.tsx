import { forwardRef, memo, type RefObject } from "react";
import { MapAgentSprite } from "../agents/MapAgentSprite";
import { agentSheets, type AgentColors } from "../agents/agentSheets";
import { pathFromPoints } from "../../world/geo";
import { WORLD_SCALE as S } from "../../world/layout";
import { featureWidth } from "../../world/scale";
import type { TravelPath } from "../../world/types";

/** Rota destacada — mesma polilinha que o personagem vai percorrer. */
export const RouteHighlight = memo(function RouteHighlight({ path, zoom }: { path: TravelPath | null; zoom: number }) {
  if (!path) return null;
  const d = pathFromPoints(path.points);
  return (
    <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke="#2f2617" strokeWidth={featureWidth(11, zoom)} opacity={0.25} />
      <path d={d} stroke="#f2d98a" strokeWidth={featureWidth(6, zoom)} opacity={0.95} />
      <path d={d} stroke="#fff8e2" strokeWidth={featureWidth(2.4, zoom)} strokeDasharray={`${featureWidth(16, zoom)} ${featureWidth(14, zoom)}`} opacity={0.9}>
        <animate attributeName="stroke-dashoffset" from={String(30 * S)} to="0" dur="0.9s" repeatCount="indefinite" />
      </path>
      <circle
        cx={path.points[path.points.length - 1].x}
        cy={path.points[path.points.length - 1].y}
        r={(16 * S) / Math.max(0.6, zoom * 0.5)}
        fill="none"
        stroke="#f2d98a"
        strokeWidth={(3 * S) / Math.max(0.6, zoom * 0.5)}
      />
    </g>
  );
});

/**
 * O viajante do jogador.
 *
 * É só uma instância do agente genérico do mapa, com a folha do cavaleiro
 * montado: os lordes, mensageiros e caravanas que vierem depois usam o mesmo
 * componente com outra folha e outras cores. A posição continua sendo escrita
 * imperativamente pelo `useTravel` — este componente não re-renderiza durante
 * a viagem.
 */
export const TravelerMarker = memo(
  forwardRef<SVGGElement, { pxPerUnit: number; moving: boolean; headingRef: RefObject<number>; colors?: AgentColors; partySize?: number }>(
    function TravelerMarker({ pxPerUnit, moving, headingRef, colors, partySize }, ref) {
      return (
        <MapAgentSprite
          ref={ref}
          sheet={agentSheets.knight_rider}
          pxPerUnit={pxPerUnit}
          moving={moving}
          headingRef={headingRef}
          colors={colors}
          partySize={partySize}
        />
      );
    },
  ),
);
