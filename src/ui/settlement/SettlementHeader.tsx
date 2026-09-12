import { memo } from "react";
import { HouseCrest } from "../../render/houses/HouseCrest";
import { houseById } from "../../data/houses";
import { KIND_LABEL, type Holding } from "../../data/holdings";
import { characterById } from "../../data/characters";
import { regionById } from "../../world/valdoria";
import type { PointOfInterest } from "../../world/types";

/**
 * Cabeçalho do painel: o que é, onde fica, de quem é e quem governa.
 *
 * Quando o dono de direito e quem manda de fato são pessoas diferentes — uma
 * ocupação —, o painel diz as duas coisas, porque essa diferença é o que
 * separa uma conquista de uma anexação.
 */
export const SettlementHeader = memo(function SettlementHeader({
  poi,
  holding,
  onClose,
}: {
  poi: PointOfInterest;
  holding: Holding;
  onClose: () => void;
}) {
  const controller = houseById.get(holding.controllerHouseId);
  const owner = houseById.get(holding.ownerHouseId);
  const occupied = holding.ownerHouseId !== holding.controllerHouseId;
  const lord = holding.localLordId ? characterById.get(holding.localLordId) : undefined;
  const region = regionById.get(poi.regionId);

  return (
    <header className="sp-head" style={{ borderColor: controller?.color }}>
      <div className="sp-crest">
        <HouseCrest houseId={holding.controllerHouseId} size={42} />
      </div>
      <div className="sp-title">
        <h2>{poi.name}</h2>
        <div className="sp-sub">
          {KIND_LABEL[holding.kind]} · {region?.name}
        </div>
        <div className="sp-owner">
          <span className="dim">Controlado por</span> <b>{controller?.name}</b>
          {occupied && (
            <div className="sp-occupied">
              Ocupado — posse de <b>{owner?.name}</b>
            </div>
          )}
        </div>
        {lord && (
          <div className="sp-owner">
            <span className="dim">Governante</span> <b>{lord.name}</b>
          </div>
        )}
      </div>
      <button className="sp-close" onClick={onClose} aria-label="Fechar o painel">
        ×
      </button>
    </header>
  );
});
