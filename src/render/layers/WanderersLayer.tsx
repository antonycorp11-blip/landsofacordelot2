import { memo } from "react";
import { MapAgentSprite } from "../agents/MapAgentSprite";
import { agentSheets } from "../agents/agentSheets";
import type { WandererRuntime } from "../../travel/useWanderers";
import { troopTotal } from "../../data/troops";
import { houseById } from "../../data/houses";

/**
 * A gente que anda pelo reino sem o jogador mandar.
 *
 * Cada força ativa custa um único `<image>`. A posição
 * é escrita pelo `useWanderers` direto no `<g>`, então arrastar o
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
      {agents.map((a) => {
        const house=a.wanderer.houseId?houseById.get(a.wanderer.houseId):undefined;
        const tracking=a.playerPursuit==="tracking";
        const searching=a.playerPursuit==="searching";
        const lost=a.playerPursuit==="lost";
        const pursuitColors=tracking?{primary:"#ef7c55",secondary:"#5f2724"}
          :searching?{primary:"#dfb94f",secondary:"#62502d"}
          :lost?{primary:"#71847c",secondary:"#33403c"}:undefined;
        return (
        <MapAgentSprite
          key={a.wanderer.id}
          ref={a.markerRef}
          sheet={agentSheets[a.wanderer.sheet]}
          pxPerUnit={pxPerUnit}
          moving={a.moving}
          headingRef={a.headingRef}
          locator={tracking||searching||lost||a.wanderer.id === pursuedForceId || a.wanderer.routine === "pilhagem" || a.wanderer.routine === "exército"}
          colors={pursuitColors??(a.wanderer.id === pursuedForceId ? { primary: "#e6b84f", secondary: "#78402e" } : a.wanderer.routine === "pilhagem" ? { primary: "#d45c4e", secondary: "#562a26" } : house ? {primary:house.color,secondary:house.secondaryColor}:undefined)}
          partySize={troopTotal(a.troops)}
          onSelect={() => onSelect(a)}
        />
      );})}
    </g>
  );
});
