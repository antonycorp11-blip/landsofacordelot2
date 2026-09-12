import { memo } from "react";
import { charactersAt, characterById } from "../../data/characters";
import { holdingFor } from "../../data/holdings";
import { houseById } from "../../data/houses";
import { poiById, regionById } from "../../world/valdoria";
import type { PointOfInterest } from "../../world/types";
import { CharacterMiniCard } from "../characters/CharacterMiniCard";
import { SettlementActions } from "./SettlementActions";
import { SettlementHeader } from "./SettlementHeader";
import { SettlementStats } from "./SettlementStats";
import "./panel.css";

/**
 * PAINEL DE ESTRUTURA.
 *
 * Aparece quando o jogador CHEGA a um lugar, ou quando toca num. Some ao
 * fechar. Não é HUD: fora esses dois momentos, a tela continua sendo o mapa —
 * e mesmo aberto o painel ocupa uma faixa, nunca a tela inteira.
 *
 * Desktop: coluna à direita. Celular: gaveta pela base.
 */
export const SettlementPanel = memo(function SettlementPanel({
  poi,
  onClose,
}: {
  poi: PointOfInterest | null;
  onClose: () => void;
}) {
  if (!poi) return null;

  const holding = holdingFor(poi);
  const residents = (holding.residentCharacterIds ?? [])
    .map((id) => characterById.get(id))
    .filter((c): c is NonNullable<typeof c> => !!c);
  const present = charactersAt(poi.id);
  const presentIds = new Set(present.map((c) => c.id));

  // Quem mora aqui mas não está: é o caso que vai importar quando os lordes
  // começarem a andar pelo mapa.
  const away = residents.filter((c) => !presentIds.has(c.id));
  const controller = houseById.get(holding.controllerHouseId);

  return (
    <aside className="settlement-panel" style={{ ["--house" as string]: controller?.color }}>
      <SettlementHeader poi={poi} holding={holding} onClose={onClose} />

      <div className="sp-body">
        {present.map((c) => (
          <CharacterMiniCard key={c.id} character={c} here />
        ))}
        {away.map((c) => {
          const at = c.locationPoiId ? poiById.get(c.locationPoiId) : undefined;
          return (
            <div key={c.id} className="sp-away">
              <b>{c.name}</b> não se encontra aqui.
              {at && (
                <div className="dim">
                  Última informação: {at.name}, {regionById.get(at.regionId)?.name}.
                </div>
              )}
            </div>
          );
        })}

        <SettlementStats holding={holding} />
      </div>

      <SettlementActions holding={holding} present={present} />
    </aside>
  );
});
