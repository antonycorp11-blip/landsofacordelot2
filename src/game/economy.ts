/**
 * Comércio local: estoque, preço, carga e transações persistentes.
 * O preço nasce da produção da região, escassez, prosperidade, guerra e habilidade.
 */
import { goodById, tradeGoods, type GoodId } from "../data/goods";
import { holdingFor, type HoldingKind } from "../data/holdings";
import { makeRng } from "../world/geo";
import type { PointOfInterest, RegionId } from "../world/types";
import { allPois, poiById } from "../world/valdoria";
import { cargoCapacity } from "./progression";
import { derivedInput, withReward } from "./experience";
import { isPresent } from "./presence";
import { getState, update, type GameState } from "./store";
import { troopTotal } from "../data/troops";

export type GoodsCount = Partial<Record<GoodId, number>>;
export type MarketQuote = {
  goodId: GoodId;
  stock: number;
  capacity: number;
  owned: number;
  buy: number;
  sell: number;
  marketPrice: number;
  tendency: "barato" | "normal" | "caro";
};

const PRODUCTION: Record<RegionId, GoodId[]> = {
  heart_of_valdoria: ["tools", "provisions"],
  elmwood: ["wood", "herbs"],
  greystone: ["iron", "tools"],
  karneth: ["wool", "iron"],
  sacred_vale: ["wine", "herbs"],
  golden_coast: ["salt", "provisions"],
  greenfields: ["grain", "wool", "provisions"],
};

const KIND_GOODS: Partial<Record<HoldingKind, GoodId[]>> = {
  mine:["iron", "wood", "tools"], estate:["grain", "wool", "wine"],
  port:["salt", "provisions", "wine"], market:["tools", "grain", "wool"],
  city:["tools", "wine", "provisions"], town:["tools", "provisions"],
  village:["grain", "wool", "provisions"], castle:["tools", "provisions"],
};

const MARKET_KINDS: HoldingKind[] = ["castle", "city", "town", "village", "market", "mine", "port", "estate"];
export function canTradeAt(poi: PointOfInterest): boolean {
  return MARKET_KINDS.includes(holdingFor(poi).kind);
}

export function amountOwned(s: GameState, id: GoodId): number {
  return id === "provisions" ? s.food : s.inventory[id] ?? 0;
}

export function cargoUsed(s: GameState): number {
  return tradeGoods.reduce((sum, good) => sum + amountOwned(s, good.id) * good.weight, 0)+troopTotal(s.prisoners)*2;
}

export function cargoLimit(s: GameState): number {
  return cargoCapacity(derivedInput(s));
}

function localFactor(poi: PointOfInterest, id: GoodId): number {
  const holding = holdingFor(poi);
  let factor = PRODUCTION[poi.regionId].includes(id) ? 1.85 : 0.72;
  if (KIND_GOODS[holding.kind]?.includes(id)) factor += 0.65;
  if (holding.kind === "mine" && holding.ore === "madeira" && id === "wood") factor += 1.3;
  if (holding.kind === "mine" && holding.ore === "ferro" && id === "iron") factor += 1.3;
  if ((holding.kind === "village" || holding.kind === "estate") && id === "grain") factor += 0.7;
  return factor;
}

function baseCapacity(poi: PointOfInterest, id: GoodId): number {
  const holding = holdingFor(poi);
  const scale = Math.max(8, Math.sqrt(Math.max(1, holding.population)) * 0.5);
  return Math.max(5, Math.round(scale * localFactor(poi, id)));
}

function initialStock(poi: PointOfInterest, id: GoodId): number {
  const cap = baseCapacity(poi, id);
  const rng = makeRng(`market:${poi.id}:${id}`);
  return Math.max(2, Math.round(cap * (0.55 + rng() * 0.35)));
}

/** Estoque efetivo com reposição parcial a cada três dias. Não muta durante leitura. */
export function marketStock(poi: PointOfInterest, id: GoodId, s: GameState): number {
  const stored = s.marketStocks[poi.id]?.[id];
  if (stored == null) return initialStock(poi, id);
  const day = Math.floor((s.journey?.hours ?? 0) / 24);
  const elapsed = day - (s.marketRefreshDay[poi.id] ?? day);
  if (elapsed < 3) return stored;
  const cycles = Math.floor(elapsed / 3);
  const cap = baseCapacity(poi, id);
  return Math.min(cap, stored + Math.ceil(cap * 0.28) * cycles);
}

function warPressure(poi: PointOfInterest, s: GameState): number {
  const house = holdingFor(poi).controllerHouseId;
  return s.wars.some((war) => war.a === house || war.b === house) ? 1.12 : 1;
}

export function quoteAt(poi: PointOfInterest, id: GoodId, s: GameState = getState()): MarketQuote {
  const good = goodById.get(id)!;
  const holding = holdingFor(poi);
  const capacity = baseCapacity(poi, id);
  const stock = marketStock(poi, id, s);
  const scarcity = 0.72 + (1 - Math.min(1.2, stock / capacity)) * 0.82;
  const production = localFactor(poi, id);
  const day = Math.floor((s.journey?.hours ?? 0) / 24);
  const pulse = 0.94 + makeRng(`price:${poi.id}:${id}:${Math.floor(day / 3)}`)() * 0.12;
  const prosperity = 0.96 + holding.prosperity / 1000;
  const marketPrice = Math.max(2, Math.round(good.basePrice * scarcity * (1.12 - Math.min(0.28, (production - 0.7) * 0.15)) * pulse * prosperity * warPressure(poi, s)));
  const bargaining = Math.min(0.12, s.skills.negociacao / 650 + s.attributes.diplomacy * 0.007);
  const buy = Math.max(1, Math.round(marketPrice * (1.08 - bargaining)));
  const sell = Math.max(1, Math.round(marketPrice * (0.83 + bargaining * 0.65)));
  const ratio = marketPrice / good.basePrice;
  return { goodId:id, stock, capacity, owned:amountOwned(s,id), buy, sell, marketPrice,
    tendency:ratio < 0.9 ? "barato" : ratio > 1.14 ? "caro" : "normal" };
}

export function quotesAt(poi: PointOfInterest, s: GameState = getState()): MarketQuote[] {
  return tradeGoods.map((good) => quoteAt(poi, good.id, s));
}

export type TradeResult = { ok: boolean; message: string; total?: number; profit?: number };
export function trade(poiId: string, goodId: GoodId, amount: number, side: "buy" | "sell"): TradeResult {
  const s = getState();
  const poi = poiById.get(poiId);
  if (!poi || !canTradeAt(poi) || !isPresent(poiId, s)) return {ok:false,message:"É preciso estar num mercado para negociar."};
  if (!Number.isInteger(amount) || amount <= 0) return {ok:false,message:"Quantidade inválida."};
  const good = goodById.get(goodId)!;
  const quote = quoteAt(poi, goodId, s);
  const price = side === "buy" ? quote.buy : quote.sell;
  const total = price * amount;
  if (side === "buy" && quote.stock < amount) return {ok:false,message:"O mercado não tem essa quantidade."};
  if (side === "buy" && s.gold < total) return {ok:false,message:"Ouro insuficiente."};
  if (side === "buy" && cargoUsed(s) + good.weight * amount > cargoLimit(s)) return {ok:false,message:"Sua carga não comporta essa compra."};
  if (side === "sell" && quote.owned < amount) return {ok:false,message:"Você não carrega essa quantidade."};

  let realizedProfit = 0;
  update((current) => {
    const inventory = {...current.inventory};
    const inventoryCost = {...current.inventoryCost};
    const owned = amountOwned(current, goodId);
    const oldBook = inventoryCost[goodId] ?? 0;
    if (goodId === "provisions") {
      // Provisões continuam no campo dedicado porque o consumo diário já usa esse valor.
    } else inventory[goodId] = Math.max(0, owned + (side === "buy" ? amount : -amount));
    const avgCost = owned > 0 ? oldBook / owned : 0;
    if (side === "buy") inventoryCost[goodId] = oldBook + total;
    else {
      const removedBook = avgCost * amount;
      inventoryCost[goodId] = Math.max(0, oldBook - removedBook);
      realizedProfit = Math.round(total - removedBook);
    }
    const stock = marketStock(poi, goodId, current);
    const marketStocks = {...current.marketStocks, [poiId]:{...current.marketStocks[poiId], [goodId]:Math.max(0, stock + (side === "buy" ? -amount : amount))}};
    const day = Math.floor((current.journey?.hours ?? 0) / 24);
    let next: GameState = {...current, inventory, inventoryCost, marketStocks,
      marketRefreshDay:{...current.marketRefreshDay,[poiId]:day},
      gold:current.gold + (side === "buy" ? -total : total),
      food:goodId === "provisions" ? Math.max(0,current.food + (side === "buy" ? amount : -amount)) : current.food,
      tradeProfit:current.tradeProfit + (side === "sell" ? realizedProfit : 0),
      tradesCompleted:current.tradesCompleted + 1,
    };
    if (side === "sell" && realizedProfit > 0) next = withReward(next,{xp:Math.min(20,Math.ceil(realizedProfit/5)),careerXp:{TRADE:Math.min(12,Math.ceil(realizedProfit/8))},skillXp:{comercio:1}});
    return next;
  });
  const verb = side === "buy" ? "Comprou" : "Vendeu";
  return {ok:true,total,profit:side === "sell" ? realizedProfit : undefined,message:`${verb} ${amount} ${amount===1?good.singular:good.name.toLowerCase()} por ${total} moedas.`};
}

export function tradeHint(poi: PointOfInterest, id: GoodId, s: GameState = getState()): {name:string;price:number;gain:number} | null {
  const here = quoteAt(poi,id,s);
  let best: {name:string;price:number;gain:number} | null = null;
  for (const other of allPois) {
    if (other.id === poi.id || !canTradeAt(other)) continue;
    const sell = quoteAt(other,id,s).sell;
    const gain = sell - here.buy;
    if (!best || gain > best.gain) best = {name:other.name,price:sell,gain};
  }
  return best && best.gain > 0 ? best : null;
}

export function primaryExport(poi: PointOfInterest): GoodId {
  return tradeGoods
    .filter((good) => good.id !== "provisions")
    .sort((a,b) => localFactor(poi,b.id)-localFactor(poi,a.id))[0].id;
}
