import { memo } from "react";
import { MapAgentSprite } from "../agents/MapAgentSprite";
import { agentSheets } from "../agents/agentSheets";
import type { WandererRuntime } from "../../travel/useWanderers";

/**
 * A gente que anda pelo reino sem o jogador mandar.
 *
 * São dezesseis figuras: a camada inteira custa dezesseis `<image>`. A posição
 * de cada uma é escrita pelo `useWanderers` direto no `<g>`, então arrastar o
 * mapa ou dar zoom não re-renderiza nada aqui.
 */
export const WanderersLayer = memo(function WanderersLayer({
  agents,
  pxPerUnit,
}: {
  agents: WandererRuntime[];
  pxPerUnit: number;
}) {
  return (
    <g pointerEvents="none">
      {agents.map((a) => (
        <MapAgentSprite
          key={a.wanderer.id}
          ref={a.markerRef}
          sheet={agentSheets[a.wanderer.sheet]}
          pxPerUnit={pxPerUnit}
          moving={a.moving}
          headingRef={a.headingRef}
          locator={false}
        />
      ))}
    </g>
  );
});
