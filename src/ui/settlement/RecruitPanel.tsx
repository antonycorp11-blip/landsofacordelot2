import { useState } from "react";
import { troopById } from "../../data/troops";
import { troopTotal } from "../../data/troops";
import { offersAt, recruit, recruitBlocker, currentPool } from "../../game/recruitment";
import { troopLimit } from "../../game/experience";
import { useGame } from "../../game/store";
import type { PointOfInterest } from "../../world/types";

/**
 * RECRUTAMENTO NUM LUGAR.
 *
 * O poço é finito e o ouro também — as duas regras vivem em
 * `game/recruitment.ts`, não aqui. Esta tela só mostra o que há e pergunta
 * quantos; se a resposta for não, a razão vem de lá.
 */
const BLOCK_TEXT: Record<string, string> = {
  away: "Chegue ao local antes de recrutar.",
  hostile: "A Casa que manda aqui não permite que você levante homens.",
  empty: "Não há ninguém disponível no momento. Volte em alguns dias.",
  gold: "Ouro insuficiente.",
  limit: "Seu comando não sustenta mais homens.",
};

export function RecruitPanel({
  poi,
  worldHours,
  onClose,
}: {
  poi: PointOfInterest;
  worldHours: number;
  onClose: () => void;
}) {
  const game = useGame();
  const [note, setNote] = useState<string | null>(null);

  const pool = currentPool(poi, worldHours);
  const block = recruitBlocker(poi, pool);
  const offers = block === "none" ? offersAt(poi, worldHours) : [];
  const total = troopTotal(game.troops);
  const limit = troopLimit(game);

  const buy = (id: Parameters<typeof recruit>[1], amount: number) => {
    const result = recruit(poi, id, amount, worldHours);
    setNote(result.ok ? null : BLOCK_TEXT[result.reason ?? "empty"]);
  };

  return (
    <div className="recruit">
      <div className="recruit-head">
        <span className="panel-title">Recrutar em {poi.name}</span>
        <button className="sheet-close" onClick={onClose} aria-label="Fechar o recrutamento">
          ×
        </button>
      </div>

      <div className="recruit-bar">
        <span>
          Tropas <b>{total} / {limit}</b>
        </span>
        <span>
          Ouro <b>{game.gold}</b>
        </span>
      </div>

      {block !== "none" && <p className="empty">{BLOCK_TEXT[block]}</p>}

      {offers.map((offer) => {
        const troop = troopById.get(offer.id)!;
        return (
          <div className="recruit-row" key={offer.id}>
            <div className="recruit-body">
              <div className="recruit-name">{troop.name}</div>
              <div className="recruit-meta">
                {offer.available} disponíve{offer.available === 1 ? "l" : "is"} · {troop.recruitCost} moedas ·
                salário {troop.dailyWage}/dia
              </div>
              <div className="recruit-desc">{troop.description}</div>
            </div>
            <div className="recruit-buttons">
              <button className="btn" disabled={offer.affordable < 1} onClick={() => buy(offer.id, 1)}>
                +1
              </button>
              <button className="btn" disabled={offer.affordable < 5} onClick={() => buy(offer.id, 5)}>
                +5
              </button>
              <button
                className="btn"
                disabled={offer.affordable < 1}
                onClick={() => buy(offer.id, offer.affordable)}
                title="O máximo que o ouro e o seu comando permitem"
              >
                Máx
              </button>
            </div>
          </div>
        );
      })}

      {note && <p className="recruit-note">{note}</p>}
    </div>
  );
}
