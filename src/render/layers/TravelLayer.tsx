import { forwardRef, memo } from "react";
import { pathFromPoints } from "../../world/geo";
import { WORLD_SCALE as S } from "../../world/layout";
import { featureWidth, LOD_SCALE } from "../../world/scale";
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
 * Marcador provisório do personagem.
 * A posição é escrita imperativamente pelo `useTravel` — este componente nunca
 * re-renderiza durante a viagem.
 */
export const TravelerMarker = memo(
  forwardRef<SVGGElement, { zoom: number }>(function TravelerMarker({ zoom }, ref) {
    // Encolhe junto com os castelos quando o mundo cresce (daí o LOD_SCALE),
    // mas mantém tamanho quase constante na tela ao longo do zoom, para o
    // jogador ser sempre localizável.
    const k = ((S / LOD_SCALE) * 0.65) / Math.max(0.55, Math.min(2.2, zoom * 0.55));
    return (
      <g ref={ref} pointerEvents="none">
        <g transform={`scale(${k})`}>
          <ellipse cx={0} cy={6} rx={17} ry={6} fill="#2f2617" opacity={0.3} />
          <path d="M-16 -44 h32 a4 4 0 0 1 4 4 v34 a4 4 0 0 1 -4 4 h-11 l-5 8 -5 -8 h-11 a4 4 0 0 1 -4 -4 v-34 a4 4 0 0 1 4 -4 z" fill="#f6eed5" stroke="#3a3128" strokeWidth={2.4} />
          <circle cx={0} cy={-28} r={7} fill="#c2a06a" stroke="#3a3128" strokeWidth={2} />
          <path d="M-9 -6 q9 -14 18 0 z" fill="#8f3f34" stroke="#3a3128" strokeWidth={2} />
        </g>
      </g>
    );
  }),
);
