import { isPresent } from "../../game/presence";
import { useGame } from "../../game/store";
import { completeContract, openClosing } from "../../game/adventure";
import { memo, useState } from "react";
import { charactersAt } from "../../data/characters";
import { holdingFor } from "../../data/holdings";
import { houseById } from "../../data/houses";
import type { PointOfInterest } from "../../world/types";
import { CharacterMiniCard } from "../characters/CharacterMiniCard";
import { SettlementMenu, menuFor } from "./SettlementActions";
import { SettlementHeader } from "./SettlementHeader";
import { SettlementStats } from "./SettlementStats";
import { RecruitPanel } from "./RecruitPanel";
import { TownTalk } from "../dialogue/TownTalk";
import { notablesAt } from "../../data/notables";
import { canTradeAt } from "../../game/economy";
import { MarketPanel } from "../market/MarketPanel";
import "./panel.css";

/**
 * O MENU DA LOCALIDADE.
 *
 * Abre quando o jogador CHEGA a um lugar, ou quando toca num para olhar de
 * longe. É a porta de tudo que se faz ali — falar, recrutar, entregar — e o
 * que se faz vem de uma lista curta, não de abas.
 *
 * Não é HUD: fora esses dois momentos a tela continua sendo o mapa. Desktop:
 * coluna à direita. Celular: gaveta pela base, com altura limitada e rolagem
 * por dentro — nunca vaza da tela.
 */
export const SettlementPanel = memo(function SettlementPanel({
  poi,
  worldHours,
  onClose,
  onTravel,
}: {
  poi: PointOfInterest | null;
  worldHours: number;
  onClose: () => void;
  onTravel: (poiId: string) => void;
}) {
  const game = useGame();
  const [view, setView] = useState<"menu" | "recruit" | "market" | "info">("menu");
  const [talking, setTalking] = useState(false);
  if (!poi) return null;

  const holding = holdingFor(poi);
  const present = charactersAt(poi.id);
  const controller = houseById.get(holding.controllerHouseId);
  const here = isPresent(poi.id, game);

  // Quem atende: quem quer que responda por este lugar. Com mais de uma
  // pessoa o menu não escolhe por você — a conversa é que pergunta.
  const people = notablesAt(poi.id, holding.kind);
  const speaker = people.length > 1 ? "quem atende" : people[0].name.split(" ")[0];

  const contract = game.adventure.contract;
  const canDeliver = !!contract && contract.destinationId === poi.id;

  const pick = (id: string) => {
    if (id === "travel") { onTravel(poi.id); onClose(); }
    else if (id === "talk") setTalking(true);
    else if (id === "recruit") setView("recruit");
    else if (id === "market") setView("market");
    else if (id === "info") setView(view === "info" ? "menu" : "info");
    else if (id === "deliver") { if (!openClosing()) completeContract(); onClose(); }
  };

  return (
    <>
      <aside className="settlement-panel" style={{ ["--house" as string]: controller?.color }}>
        <SettlementHeader poi={poi} holding={holding} onClose={onClose} />

        <div className="sp-body">
          {view === "recruit" ? (
            <RecruitPanel poi={poi} worldHours={worldHours} onClose={() => setView("menu")} />
          ) : view === "market" ? (
            <MarketPanel poi={poi} onClose={() => setView("menu")} />
          ) : view === "info" ? (
            <>
              <SettlementStats holding={holding} />
              {present.map((c) => <CharacterMiniCard key={c.id} character={c} here />)}
              <button className="sp-back" onClick={() => setView("menu")}>Voltar</button>
            </>
          ) : (
            <>
              {!here && <p className="sp-preview">Você observa {poi.name} de longe. Para agir é preciso chegar.</p>}
              <SettlementMenu items={menuFor(holding, { here, speaker, canDeliver, canMarket:canTradeAt(poi) })} onPick={pick} />
            </>
          )}
        </div>
      </aside>

      {talking && <TownTalk poi={poi} onClose={() => setTalking(false)} onTravel={onTravel} onRecruit={() => { setTalking(false); setView("recruit"); }} />}
    </>
  );
});
