import { useState } from "react";
import { troopById, troops as troopTypes, troopTotal, type TroopId } from "../../data/troops";
import { estateOf, garrisonCost, incomeOf, investCost, INVEST_STEP, TAX, type TaxLevel } from "../../game/estates";
import { setTax, invest, moveGarrison } from "../../game/estateActions";
import { useGame } from "../../game/store";
import type { Fief } from "../../world/fiefs";

/**
 * GERIR UMA TERRA.
 *
 * Três alavancas que se contradizem, e é essa contradição que faz administrar
 * ser uma decisão em vez de um botão de coletar:
 *
 *   o imposto paga hoje e cobra depois, na lealdade;
 *   investir cobra hoje e paga sempre, na prosperidade;
 *   a guarnição tira homens da estrada e devolve segurança na região.
 *
 * Os números aparecem ANTES da escolha — a renda de amanhã com cada imposto
 * está escrita no próprio botão —, porque escolher no escuro entre três
 * opções não é decisão, é sorteio.
 */
export function EstatePanel({ fief, onClose }: { fief: Fief; onClose: () => void }) {
  const game = useGame();
  // Duas abas em vez de uma coluna comprida: a regra da casa é que nada rola,
  // e terra + guarnição juntas não cabem nos 430 px de um telefone deitado.
  const [tab, setTab] = useState<"terra" | "guarnicao">("terra");
  const estate = estateOf(game, fief.id);
  const income = incomeOf(game, fief.id);
  const cost = investCost(estate);
  const garrison = troopTotal(estate.garrison);

  /** Quanto renderia com cada imposto, para a escolha ser informada. */
  const previewFor = (tax: TaxLevel) =>
    incomeOf({ ...game, fiefEstates: { ...game.fiefEstates, [fief.id]: { ...estate, tax } } }, fief.id);

  return (
    <div className="estate">
      <div className="estate-head">
        <div className="estate-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "terra"} onClick={() => setTab("terra")}>Terra</button>
          <button role="tab" aria-selected={tab === "guarnicao"} onClick={() => setTab("guarnicao")}>Guarnição</button>
        </div>
        <button className="sheet-close" onClick={onClose} aria-label="Voltar">×</button>
      </div>

      <div className="estate-figures">
        <div><small>Renda</small><b>{income}<i>/dia</i></b></div>
        <div><small>Guarnição</small><b>{garrison}<i>{garrison ? ` · −${garrisonCost(estate)}/dia` : ""}</i></b></div>
      </div>

      {tab === "terra" && <>
      <Meter label="Lealdade" value={estate.loyalty} hint={estate.loyalty < 25 ? "A terra rende menos e pode se levantar" : estate.loyalty < 45 ? "Descontente: parte da renda se perde" : "Em paz"} bad={estate.loyalty < 45} />
      <Meter label="Prosperidade" value={estate.prosperity} hint="Multiplica a renda de base" />

      {/* ------------------------------ imposto --------------------------- */}
      <div className="estate-block">
        <span className="panel-title">Imposto</span>
        <div className="estate-taxes">
          {(Object.keys(TAX) as TaxLevel[]).map((level) => (
            <button
              key={level}
              className={`estate-tax ${estate.tax === level ? "on" : ""}`}
              aria-pressed={estate.tax === level}
              onClick={() => setTax(fief.id, level)}
            >
              <strong>{TAX[level].label}</strong>
              <span>{previewFor(level)}/dia</span>
              <em>{TAX[level].loyalty > 0 ? `+${TAX[level].loyalty}` : TAX[level].loyalty} lealdade/dia</em>
            </button>
          ))}
        </div>
        <p className="estate-note">{TAX[estate.tax].blurb}</p>
      </div>

      {/* ---------------------------- investimento ------------------------ */}
      <div className="estate-block">
        <span className="panel-title">Investir</span>
        <button
          className="btn estate-invest"
          disabled={game.gold < cost || estate.prosperity >= 100}
          onClick={() => invest(fief.id)}
        >
          {estate.prosperity >= 100
            ? "A terra já dá tudo o que pode"
            : `Obras por ${cost.toLocaleString("pt-BR")} moedas · +${INVEST_STEP} prosperidade`}
        </button>
        {game.gold < cost && estate.prosperity < 100 && (
          <p className="estate-note">Você tem {game.gold.toLocaleString("pt-BR")}.</p>
        )}
      </div>

      </>}

      {tab === "guarnicao" && <>
      {/* ----------------------------- guarnição -------------------------- */}
      <div className="estate-block">
        <p className="estate-note">
          Homens deixados aqui custam meio soldo e melhoram a segurança da região — o que baixa preço e afasta bando.
        </p>
        {troopTypes.map((type) => {
          const here = estate.garrison[type.id] ?? 0;
          const withYou = game.troops[type.id] ?? 0;
          if (!here && !withYou) return null;
          return (
            <div className="estate-troop" key={type.id}>
              <span>{troopById.get(type.id)?.name}</span>
              <span className="estate-count">{here} aqui · {withYou} com você</span>
              <span className="estate-move">
                <button disabled={!withYou} onClick={() => moveGarrison(fief.id, type.id as TroopId, 1)} aria-label={`Destacar um ${type.singular}`}>↓</button>
                <button disabled={!here} onClick={() => moveGarrison(fief.id, type.id as TroopId, -1)} aria-label={`Recolher um ${type.singular}`}>↑</button>
              </span>
            </div>
          );
        })}
        {garrison === 0 && troopTotal(game.troops) === 0 && (
          <p className="estate-note">Você não tem homens para deixar aqui.</p>
        )}
      </div>
      </>}
    </div>
  );
}

function Meter({ label, value, hint, bad }: { label: string; value: number; hint: string; bad?: boolean }) {
  return (
    <div className="estate-meter">
      <div className="estate-meter-head">
        <span>{label}</span>
        <b className={bad ? "bad" : undefined}>{Math.round(value)}</b>
      </div>
      <span className="estate-bar"><i className={bad ? "bad" : undefined} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>
      <small>{hint}</small>
    </div>
  );
}
