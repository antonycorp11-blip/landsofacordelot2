import { memo } from "react";
import { WORLD_SCALE as S } from "../../world/layout";
import { EVENT_LABEL, type WorldEventInstance } from "../../game/worldEvents";
import wreckedCarriage from "../../assets/story/carriage/wrecked.png?url";
import lootedCarriage from "../../assets/story/carriage/looted.png?url";

/**
 * O QUE ESTÁ CAÍDO NO CHÃO.
 *
 * A carruagem usa o conjunto narrativo e troca para a versão saqueada quando
 * a cena termina. Pequena de propósito — um ícone gigante com
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
  const size = 58 * S;
  return (
    <image
      href={looted ? lootedCarriage : wreckedCarriage}
      x={-size / 2}
      y={-size / 2}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
