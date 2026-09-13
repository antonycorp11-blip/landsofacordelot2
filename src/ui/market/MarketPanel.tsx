import { useState } from "react";
import { goodById, type GoodId } from "../../data/goods";
import { amountOwned, cargoLimit, cargoUsed, quotesAt, trade, tradeHint } from "../../game/economy";
import { useGame } from "../../game/store";
import type { PointOfInterest } from "../../world/types";
import { ResourceIcon } from "../ResourceIcon";
import { prisonerRansom } from "../../game/battle";
import { troopTotal } from "../../data/troops";
import { freePrisoners, ransomAllPrisoners } from "../../game/adventure";

function quantityLabel(amount: number, id: GoodId) {
  const good = goodById.get(id)!;
  return `${amount} ${amount === 1 ? good.singular : good.name.toLowerCase()}`;
}

/** Mercado regional: a carga comprada aqui continua no grupo e pode ser vendida em qualquer outro mercado. */
export function MarketPanel({ poi, onClose }: { poi: PointOfInterest; onClose: () => void }) {
  const game = useGame();
  const [notice, setNotice] = useState("Preços mudam com produção, escassez, guerra e passagem dos dias.");
  const quotes = quotesAt(poi, game);
  const contractCargo = game.adventure.contract?.cargo;
  const used = cargoUsed(game);
  const limit = cargoLimit(game);
  const prisonerCount=troopTotal(game.prisoners);
  const security=game.regionSecurity[poi.regionId]??0;
  const securityLabel=security>=8?"rota segura":security<=-8?"rota perigosa":"rota estável";

  const act = (id: GoodId, amount: number, side: "buy" | "sell") => {
    const result = trade(poi.id, id, amount, side);
    setNotice(result.message + (result.ok && result.profit != null ? ` Lucro desta venda: ${result.profit} moedas.` : ""));
  };

  return <section className="market" aria-label={`Mercado de ${poi.name}`}>
    <div className="market-head">
      <div>
        <span className="panel-title">Mercado de {poi.name}</span>
        <p>Compre onde há produção. Venda onde há necessidade.</p>
      </div>
      <button className="sheet-close" onClick={onClose} aria-label="Voltar ao menu">×</button>
    </div>

    <div className="market-wallet">
      <span><ResourceIcon name="gold" size={22}/><b>{game.gold}</b> ouro</span>
      <span><b>{used}/{limit}</b> carga</span>
      <span><b>{game.tradeProfit >= 0 ? "+" : ""}{game.tradeProfit}</b> lucro acumulado</span>
      <span><b>{security>0?"+":""}{security}</b> {securityLabel}</span>
    </div>

    {contractCargo && <div className="market-order">
      <b>Encomenda em curso</b>
      <span>{quantityLabel(amountOwned(game, contractCargo.goodId), contractCargo.goodId)} na carga · precisa de {contractCargo.amount}</span>
    </div>}

    {prisonerCount>0&&<div className="market-ransom">
      <div><b>Mercador de resgates</b><span>{prisonerCount} cativo(s) · oferta de {prisonerRansom(game.prisoners)} moedas</span></div>
      <button onClick={()=>{ransomAllPrisoners();setNotice("Os resgates foram pagos. Os cativos deixam o grupo sob escolta.");}}>Resgatar todos</button>
      {/* Soltar custa exatamente o resgate que ele deixa de receber. É para custar. */}
      <button className="quiet" onClick={()=>{freePrisoners();setNotice("Você mandou soltar. Saem sem escolta e sem pagar nada, e vão contar a alguém.");}}>Soltar sem cobrar</button>
    </div>}

    <p className="market-notice" role="status">{notice}</p>

    <div className="market-list">
      {quotes.map((quote) => {
        const good = goodById.get(quote.goodId)!;
        const hint = tradeHint(poi, quote.goodId, game);
        const required = contractCargo?.goodId === quote.goodId;
        const room = limit - used;
        const canBuyOne = quote.stock > 0 && game.gold >= quote.buy && room >= good.weight;
        const canBuyFive = quote.stock >= 5 && game.gold >= quote.buy * 5 && room >= good.weight * 5;
        return <article className={`market-row ${required ? "required" : ""}`} key={quote.goodId}>
          <div className="market-mark" aria-hidden="true">{good.mark}</div>
          <div className="market-good">
            <div className="market-name"><b>{good.name}</b><span className={`market-tendency ${quote.tendency}`}>{quote.tendency}</span></div>
            <p>{good.description}</p>
            <small>Estoque {quote.stock} · você leva {quote.owned} · peso {good.weight}</small>
            {required && <small className="market-required">Necessário para o contrato atual</small>}
            {hint && <small className="market-route">Cotação: {hint.name} compra por {hint.price} · margem possível +{hint.gain} cada</small>}
          </div>
          <div className="market-trade">
            <div className="market-price"><span>Comprar</span><b>{quote.buy}</b></div>
            <div className="market-buttons">
              <button disabled={!canBuyOne} onClick={() => act(quote.goodId, 1, "buy")}>+1</button>
              <button disabled={!canBuyFive} onClick={() => act(quote.goodId, 5, "buy")}>+5</button>
            </div>
            <div className="market-price"><span>Vender</span><b>{quote.sell}</b></div>
            <div className="market-buttons">
              <button disabled={quote.owned < 1} onClick={() => act(quote.goodId, 1, "sell")}>−1</button>
              <button disabled={quote.owned < 5} onClick={() => act(quote.goodId, 5, "sell")}>−5</button>
            </div>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
