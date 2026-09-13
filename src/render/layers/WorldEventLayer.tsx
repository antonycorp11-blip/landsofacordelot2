import { memo } from "react";
import { WORLD_SCALE as S } from "../../world/layout";
import { EVENT_LABEL, type WorldEventInstance } from "../../game/worldEvents";

/**
 * O QUE ESTÁ CAÍDO NO CHÃO.
 *
 * Desenhado em código, sem pedir arte nova: a carroça é um corpo, duas rodas
 * tortas e um varal partido. Pequena de propósito — um ícone gigante com
 * exclamação transformaria descoberta em lista de tarefas.
 *
 * O nome só aparece depois de descoberto. Antes disso é uma forma estranha no
 * meio das árvores, e o jogador decide sozinho se vale o desvio.
 */
export const WorldEventLayer = memo(function WorldEventLayer({
  events,
  zoom,
}: {
  events: WorldEventInstance[];
  zoom: number;
}) {
  return (
    <g pointerEvents="none">
      {events.filter((e) => e.visible).map((event) => (
        <g key={event.id} transform={`translate(${event.x} ${event.y})`}>
          {event.type === "wrecked_carriage" && <WreckedCarriage looted={event.state === "looted"} />}
          {event.discovered && zoom >= 0.9 && (
            <text
              y={26 * S}
              textAnchor="middle"
              fontSize={(11 * S) / zoom}
              fill="#e7d9b4"
              stroke="#22302c"
              strokeWidth={(2.6 * S) / zoom}
              paintOrder="stroke"
            >
              {EVENT_LABEL[event.type]}
            </text>
          )}
        </g>
      ))}
    </g>
  );
});

/**
 * Uma carroça que caiu de lado.
 *
 * Inclinada, com uma roda solta ao lado e o varal quebrado apontando para o
 * alto — a silhueta que diz "isto não parou, isto tombou".
 */
function WreckedCarriage({ looted }: { looted: boolean }) {
  const k = S * 0.9;
  return (
    <g transform={`scale(${k})`}>
      {/* Sombra no chão */}
      <ellipse cx="1" cy="9" rx="17" ry="5" fill="#1a2118" opacity="0.35" />

      {/* Caixa da carroça, tombada para a esquerda */}
      <g transform="rotate(-24)">
        <rect x="-13" y="-9" width="25" height="12" rx="1.5" fill="#4a3524" stroke="#2c1f14" strokeWidth="1.1" />
        <path d="M-13 -5 H12" stroke="#2c1f14" strokeWidth="0.9" />
        {/* Toldo rasgado */}
        <path d="M-12 -9 q12 -8 23 0" fill="none" stroke={looted ? "#6b6353" : "#8a8068"} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M-4 -12.5 l2 4" stroke="#8a8068" strokeWidth="1.1" strokeLinecap="round" />
      </g>

      {/* Roda ainda no eixo, e a que se soltou */}
      <g stroke="#2c1f14" strokeWidth="1.2" fill="none">
        <circle cx="-8" cy="4" r="5.4" transform="rotate(-24 -8 4)" />
        <path d="M-13 4 H-3 M-8 -1 V9" transform="rotate(-24 -8 4)" />
        <ellipse cx="12" cy="7" rx="5.6" ry="2.1" />
        <path d="M6.5 7 H17.5" />
      </g>

      {/* Varal partido, apontando para cima */}
      <path d="M10 -6 L22 -14" stroke="#3b2b1c" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 -14 l3 -1.5" stroke="#3b2b1c" strokeWidth="1.2" strokeLinecap="round" />

      {/* Carga espalhada: dois volumes caídos */}
      <rect x="-22" y="2" width="6" height="4.5" rx="0.8" fill="#5a4630" stroke="#2c1f14" strokeWidth="0.8" transform="rotate(14 -19 4)" />
      <rect x="-27" y="5" width="5" height="3.6" rx="0.8" fill="#51402c" stroke="#2c1f14" strokeWidth="0.8" transform="rotate(-9 -24 7)" />
    </g>
  );
}
