import { memo, useState } from "react";
import { houses, houseById } from "../data/houses";
import { crestUrl } from "../data/houseAssets";
import { controllerOf, regionsControlledBy, useTerritories } from "../data/territories";
import { ownerOf, priceFor, useFiefOwners } from "../data/fiefOwners";
import { relationLabel, relationWith } from "../data/player";
import { fiefs, fiefsOfRegion, TIER_LABEL, type Fief } from "../world/fiefs";
import { regionById, regions } from "../world/valdoria";
import type { RegionId } from "../world/types";
import "./legend.css";

export type PoliticalView = "houses" | "fiefs";

/**
 * LEGENDA DA VISTA POLÍTICA — duas leituras, um alternador.
 *
 * CASAS responde "quem manda em que pedaço do reino": ordenada por território,
 * com o que cada Casa pensa de você. É a leitura da guerra.
 *
 * SENHORIOS responde "de quem é esta terra": a lista das micro-regiões, cada
 * uma com dono, renda e preço, e tocar numa acende ela no mapa. É a leitura da
 * posse — comprar, negociar, tomar.
 *
 * São perguntas diferentes e por isso são duas listas, e não uma só tentando
 * servir às duas.
 */
export const PoliticalLegend = memo(function PoliticalLegend({
  view,
  onView,
  selectedFiefId,
  onSelectFief,
  onClose,
}: {
  view: PoliticalView;
  onView: (view: PoliticalView) => void;
  selectedFiefId: string | null;
  onSelectFief: (fief: Fief) => void;
  onClose: () => void;
}) {
  useTerritories();
  useFiefOwners();

  return (
    <aside className="legend">
      <header className="legend-head">
        <span className="legend-title">{view === "houses" ? "Domínios de Valdória" : "Senhorios"}</span>
        <button className="legend-close" onClick={onClose} aria-label="Fechar a legenda">
          ×
        </button>
      </header>

      <div className="legend-switch" role="tablist" aria-label="Leitura do mapa">
        <button role="tab" aria-selected={view === "houses"} onClick={() => onView("houses")}>
          Casas
        </button>
        <button role="tab" aria-selected={view === "fiefs"} onClick={() => onView("fiefs")}>
          Senhorios
        </button>
      </div>

      {view === "houses" ? <HouseList /> : <FiefList selectedFiefId={selectedFiefId} onSelectFief={onSelectFief} />}
    </aside>
  );
});

function HouseList() {
  const rows = houses
    .map((house) => ({ house, held: regionsControlledBy(house.id) }))
    .sort((a, b) => b.held.length - a.held.length || a.house.name.localeCompare(b.house.name));

  return (
    <>
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
                  {held.length === 0 ? "sem território" : held.map((r) => regionById.get(r)?.name).join(" · ")}
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
        {regions.filter((r) => controllerOf(r.id) === "house_valdoria").length} de {regions.length} regiões sob a Coroa
      </footer>
    </>
  );
}

function FiefList({
  selectedFiefId,
  onSelectFief,
}: {
  selectedFiefId: string | null;
  onSelectFief: (fief: Fief) => void;
}) {
  // Agrupado por região, uma aberta por vez. Trinta e cinco senhorios numa
  // lista corrida seria uma lista para rolar; sete regiões cabem na tela, e
  // "senhorio dentro de região" é como a posse funciona de verdade.
  const [open, setOpen] = useState<RegionId | null>(() => regions[0]?.id ?? null);
  const mine = fiefs.filter((f) => ownerOf(f.id) === "player").length;

  return (
    <>
      <div className="legend-list">
        {regions.map((region) => {
          const inside = fiefsOfRegion(region.id);
          const controller = houseById.get(controllerOf(region.id));
          const expanded = open === region.id;
          const held = inside.filter((f) => ownerOf(f.id) === "player").length;
          return (
            <div className="legend-group" key={region.id}>
              <button
                className="legend-row region"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : region.id)}
              >
                <span className="legend-swatch" style={{ background: controller?.color }} />
                <span className="legend-body">
                  <span className="legend-name">{region.name}</span>
                  <span className="legend-sub">
                    {inside.length} senhorios{held ? ` · ${held} seu${held > 1 ? "s" : ""}` : ""}
                  </span>
                </span>
                <span className="legend-caret" aria-hidden="true">{expanded ? "−" : "+"}</span>
              </button>

              {expanded &&
                inside.map((fief) => {
                  const owner = ownerOf(fief.id);
                  const house = owner === "player" ? null : houseById.get(owner);
                  const color = owner === "player" ? "#e2c169" : house?.color ?? "#8a8a8a";
                  return (
                    <button
                      className="legend-row fief"
                      key={fief.id}
                      aria-pressed={selectedFiefId === fief.id}
                      onClick={() => onSelectFief(fief)}
                    >
                      <span className="legend-swatch small" style={{ background: color }} />
                      <span className="legend-body">
                        <span className="legend-name">{fief.name}</span>
                        <span className="legend-sub">
                          {TIER_LABEL[fief.tier]} · {owner === "player" ? "seu" : house?.shortName ?? "sem dono"}
                        </span>
                      </span>
                      <span className="legend-rel">
                        {owner === "player" ? `${fief.income}/dia` : priceFor(fief.id).toLocaleString("pt-BR")}
                      </span>
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>
      <footer className="legend-foot">
        {mine === 0 ? "Você ainda não tem terra." : `${mine} de ${fiefs.length} senhorios são seus`}
      </footer>
    </>
  );
}
