import { BALANCE } from "../config/balance";
import { hash2 } from "../core/rng";
import { CROPS, type CropId } from "../data/crops";
import type { Buyer } from "../world/types";
import type { GameTime } from "./TimeSystem";

export type LedgerCat = "venda" | "combustível" | "insumos" | "salários" | "máquinas" | "manutenção" | "terras" | "juros" | "aluguel" | "empréstimo" | "outros";

export interface LedgerEntry {
  day: number;
  minute: number;
  text: string;
  amount: number;
  cat: LedgerCat;
}

export interface MarketEvent {
  crop: CropId;
  buyerId: string | null;
  mul: number;
  untilDay: number;
  text: string;
}

/** Caixa, empréstimo, livro-caixa e preços de mercado. */
export class Economy {
  money: number;
  loan = 0;
  ledger: LedgerEntry[] = [];
  events: MarketEvent[] = [];
  soldKg: Record<CropId, number> = { wheat: 0, soy: 0, corn: 0 };

  constructor(
    public seed: number,
    public buyers: Buyer[],
    money = BALANCE.startMoney,
  ) {
    this.money = money;
  }

  private dayFactor(crop: CropId, buyerId: string, day: number): number {
    const ci = CROPS[crop].index;
    const year = BALANCE.daysPerSeason * 4;
    const seasonal = 0.13 * Math.sin(((day + ci * 5) / year) * Math.PI * 2);
    const noise = (hash2(day, ci * 31 + buyerId.length, this.seed) - 0.5) * 0.16;
    let ev = 1;
    for (const e of this.events) if (e.crop === crop && (e.buyerId === null || e.buyerId === buyerId) && day <= e.untilDay) ev *= e.mul;
    return (1 + seasonal + noise) * ev;
  }

  /** Preço R$/kg num comprador, interpolado ao longo do dia. */
  price(buyerId: string, crop: CropId, t: GameTime): number {
    const b = this.buyers.find((x) => x.id === buyerId);
    if (!b || !b.accepts.includes(crop)) return 0;
    const f0 = this.dayFactor(crop, buyerId, t.day);
    const f1 = this.dayFactor(crop, buyerId, t.day + 1);
    const k = t.minute / 1440;
    return CROPS[crop].basePricePerKg * b.priceMul[crop] * (f0 + (f1 - f0) * k);
  }

  priceOnDay(buyerId: string, crop: CropId, day: number): number {
    return this.price(buyerId, crop, { day, minute: 720 });
  }

  bestBuyer(crop: CropId, t: GameTime): { id: string; price: number } {
    let best = { id: "coop", price: 0 };
    for (const b of this.buyers) {
      const p = this.price(b.id, crop, t);
      if (p > best.price) best = { id: b.id, price: p };
    }
    return best;
  }

  canAfford(amount: number): boolean {
    return this.money >= amount;
  }

  private log(amount: number, text: string, cat: LedgerCat, t: GameTime): void {
    const last = this.ledger[this.ledger.length - 1];
    // agrupa lançamentos contínuos (ex.: venda em fluxo pela moega)
    if (last && last.text === text && last.cat === cat && last.day === t.day && t.minute - last.minute < 30) {
      last.amount += amount;
      last.minute = t.minute;
    } else {
      this.ledger.push({ day: t.day, minute: t.minute, text, amount, cat });
      if (this.ledger.length > 300) this.ledger.splice(0, this.ledger.length - 300);
    }
  }

  /** Débito que exige saldo. Retorna false se não houver dinheiro. */
  spend(amount: number, text: string, cat: LedgerCat, t: GameTime): boolean {
    if (amount <= 0) return true;
    if (this.money < amount) return false;
    this.money -= amount;
    this.log(-amount, text, cat, t);
    return true;
  }

  /** Débito obrigatório (salários, juros, aluguéis): pode usar o limite de empréstimo. */
  charge(amount: number, text: string, cat: LedgerCat, t: GameTime): void {
    if (amount <= 0) return;
    this.money -= amount;
    this.log(-amount, text, cat, t);
    if (this.money < 0 && this.loan < BALANCE.loanMax) {
      const need = Math.min(BALANCE.loanMax - this.loan, Math.ceil(-this.money / 1000) * 1000);
      this.loan += need;
      this.money += need;
      this.log(need, "Cheque especial automático", "empréstimo", t);
    }
  }

  earn(amount: number, text: string, cat: LedgerCat, t: GameTime): void {
    if (amount <= 0) return;
    this.money += amount;
    this.log(amount, text, cat, t);
  }

  borrow(amount: number, t: GameTime): boolean {
    const a = Math.min(amount, BALANCE.loanMax - this.loan);
    if (a <= 0) return false;
    this.loan += a;
    this.money += a;
    this.log(a, "Empréstimo bancário", "empréstimo", t);
    return true;
  }

  repay(amount: number, t: GameTime): boolean {
    const a = Math.min(amount, this.loan, this.money);
    if (a <= 0) return false;
    this.loan -= a;
    this.money -= a;
    this.log(-a, "Amortização de empréstimo", "empréstimo", t);
    return true;
  }

  dailyInterest(t: GameTime): void {
    if (this.loan > 0) this.charge(this.loan * BALANCE.loanDailyRate, "Juros do empréstimo", "juros", t);
    this.events = this.events.filter((e) => e.untilDay >= t.day);
  }

  sell(buyerId: string, crop: CropId, kg: number, t: GameTime): number {
    const p = this.price(buyerId, crop, t);
    const value = p * kg;
    const b = this.buyers.find((x) => x.id === buyerId);
    this.earn(value, `Venda de ${CROPS[crop].name} · ${b?.name ?? buyerId}`, "venda", t);
    this.soldKg[crop] += kg;
    return value;
  }
}

export function money(v: number): string {
  const sign = v < 0 ? "-" : "";
  return `${sign}R$ ${Math.abs(Math.round(v)).toLocaleString("pt-BR")}`;
}

export function kgLabel(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t`;
  return `${Math.round(kg)} kg`;
}
