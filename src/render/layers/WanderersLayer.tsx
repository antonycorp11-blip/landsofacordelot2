import { memo } from "react";
import { MapAgentSprite } from "../agents/MapAgentSprite";
import { agentSheets } from "../agents/agentSheets";
import type { WandererRuntime } from "../../travel/useWanderers";
import { partyOf } from "../../world/wanderers";
import { troopTotal } from "../../data/troops";
import type { Wanderer } from "../../world/wanderers";

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
  onSelect,
}: {
  agents: WandererRuntime[];
  pxPerUnit: number;
  onSelect: (w: Wanderer) => void;
}) {
  return (
    <g>
      {agents.map((a) => (
        <MapAgentSprite
          key={a.wanderer.id}
          ref={a.markerRef}
          sheet={agentSheets[a.wanderer.sheet]}
          pxPerUnit={pxPerUnit}
          moving={a.moving}
          headingRef={a.headingRef}
          locator={false}
          partySize={troopTotal(partyOf(a.wanderer))}
          onSelect={() => onSelect(a.wanderer)}
        />
      ))}
    </g>
  );
});
