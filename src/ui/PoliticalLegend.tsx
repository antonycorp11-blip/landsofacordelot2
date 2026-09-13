import { memo } from "react";
import { houses } from "../data/houses";
import { crestUrl } from "../data/houseAssets";
import { controllerOf, regionsControlledBy, useTerritories } from "../data/territories";
import { relationLabel, relationWith } from "../data/player";
import { regionById, regions } from "../world/valdoria";
import "./legend.css";

/**
 * LEGENDA DA VISTA POLÍTICA.
 *
 * Quem manda em quanto, e o que cada uma pensa de você. Ordenada por
 * território — é a leitura que importa quando se planeja conquista: quem está
 * grande, quem está sem terra, e de quem você pode chegar perto.
 *
 * As Casas sem senhorio aparecem no fim, com "sem território". Elas continuam
 * existindo, e é isso que a lista precisa dizer.
 */
export const PoliticalLegend = memo(function PoliticalLegend({ onClose }: { onClose: () => void }) {
  useTerritories();

  const rows = houses
    .map((house) => ({ house, held: regionsControlledBy(house.id) }))
    .sort((a, b) => b.held.length - a.held.length || a.house.name.localeCompare(b.house.name));

  return (
    <aside className="legend">
      <header className="legend-head">
        <span className="legend-title">Domínios de Valdória</span>
        <button className="legend-close" onClick={onClose} aria-label="Fechar a legenda">
          ×
        </button>
      </header>

      <div className="legend-list">
        {rows.map(({ house, held }) => {
          const crest = crestUrl(house.crestAssetKey);
          const relation = relationWith(house.id);
          return (
            <div className="legend-row" key={house.id}>
              <span className="legend-swatch" style={{ background: house.color }} />
              {crest && <img className="legend-crest" src={crest} alt="" loading="lazy" />}
              <span className="legend-body">
                <span className="legend-name">{house.name}</span>
                <span className="legend-sub">
                  {held.length === 0
                    ? "sem território"
                    : held.map((r) => regionById.get(r)?.name).join(" · ")}
                </span>
              </span>
              <span className={`legend-rel ${relation < 0 ? "neg" : relation > 0 ? "pos" : ""}`}>
                {relationLabel(relation)}
              </span>
            </div>
          );
        })}
      </div>

      <footer className="legend-foot">
        {regions.filter((r) => controllerOf(r.id) === "house_valdoria").length} de {regions.length}{" "}
        senhorios sob a Coroa
      </footer>
    </aside>
  );
});
