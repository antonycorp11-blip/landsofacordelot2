import { useState } from "react";
import { troopById, troops as troopTypes, troopTotal, type TroopId } from "../../data/troops";
import { estateOf, garrisonCost, incomeOf, investCost, INVEST_STEP, TAX, WORKS, wallDefence, workCost, type EstateWork, type TaxLevel } from "../../game/estates";
import { setTax, invest, moveGarrison, startWork } from "../../game/estateActions";
import { defenceOf } from "../../game/forceSimulation";
import { landIsAtRisk } from "../../game/allegiance";
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
  const [tab, setTab] = useState<"terra" | "guarnicao" | "obras">("terra");
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
          <button role="tab" aria-selected={tab === "obras"} onClick={() => setTab("obras")}>Obras</button>
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
      <div className="estate-defence">
        <div>
          <small>Defesa</small>
          <b>{Math.round(defenceOf(wallDefence(fief.defense, estate), estate.garrison))}</b>
        </div>
        <p className="estate-note">
          {landIsAtRisk(game)
            ? "Uma hoste de Casa chega com cerca de 180 de força; segura-se um cerco com mais ou menos 80 de defesa. A muralha já conta 32."
            : "Enquanto você não jurar nem se declarar soberano, ninguém marcha sobre esta terra — a guarnição vale pela segurança da região."}
        </p>
      </div>
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

      {tab === "obras" && <div className="estate-works">
        {estate.project && <p className="estate-note estate-project">{WORKS[estate.project.kind].name} em obra · pronta no dia {estate.project.readyDay}. O ouro e os materiais já foram gastos.</p>}
        {(["walls", "granary", "market"] as EstateWork[]).filter(kind => kind !== "walls" || ["castle", "fort", "fortress"].includes(fief.seatType)).map(kind => {
          const work = WORKS[kind];
          const level = estate.buildings?.[kind] ?? 0;
          const cost = workCost(estate, kind);
          const maxed = level >= work.max;
          const lacks = game.gold < cost.gold || (game.inventory.wood ?? 0) < cost.wood || (game.inventory.tools ?? 0) < cost.tools;
          return <button key={kind} className="estate-work" disabled={!!estate.project || maxed || lacks} onClick={() => startWork(fief.id, kind)}>
            <span><strong>{work.name} · {level}/{work.max}</strong><small>{work.effect}</small></span>
            <em>{maxed ? "Concluída" : `${cost.gold} ouro · ${cost.wood} madeira${cost.tools ? ` · ${cost.tools} ferramentas` : ""} · ${cost.days} dias`}</em>
          </button>;
        })}
        <p className="estate-note">Na bolsa: {Math.round(game.gold)} ouro · {game.inventory.wood ?? 0} madeira · {game.inventory.tools ?? 0} ferramentas. Compre materiais no mercado e traga-os até aqui.</p>
      </div>}
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
