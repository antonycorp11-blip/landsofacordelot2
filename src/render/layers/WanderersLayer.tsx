import { memo } from "react";
import { MapAgentSprite } from "../agents/MapAgentSprite";
import { agentSheets } from "../agents/agentSheets";
import type { WandererRuntime } from "../../travel/useWanderers";
import { troopTotal } from "../../data/troops";

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
  pursuedForceId,
  onSelect,
}: {
  agents: WandererRuntime[];
  pxPerUnit: number;
  pursuedForceId: string | null;
  onSelect: (agent: WandererRuntime) => void;
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
          locator={a.wanderer.id === pursuedForceId || a.wanderer.routine === "pilhagem"}
          colors={a.wanderer.id === pursuedForceId ? { primary: "#e6b84f", secondary: "#78402e" } : a.wanderer.routine === "pilhagem" ? { primary: "#d45c4e", secondary: "#562a26" } : undefined}
          partySize={troopTotal(a.troops)}
          onSelect={() => onSelect(a)}
        />
      ))}
    </g>
  );
});
