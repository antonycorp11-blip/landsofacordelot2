/**
 * O DIA COBRA.
 *
 * Até aqui o relógio andava e nada acontecia: salário, comida, renda de terra
 * e influência passiva eram números calculados, mostrados na ficha e nunca
 * aplicados. Ouro só entrava. Um jogo em que o dinheiro só sobe não tem
 * motivo para nada — nem para aceitar um encargo, nem para pensar duas vezes
 * antes de recrutar mais dez homens.
 *
 * Este arquivo fecha esse buraco. Uma vez por dia do mundo:
 *
 *   1. os soldados são pagos;
 *   2. o grupo come;
 *   3. a terra que é sua rende;
 *   4. sua carreira rende influência.
 *
 * E quando falta soldo ou comida, começa a DESERÇÃO — pelos de baixo, que são
 * quem menos deve a você. É a pressão que faz o dinheiro importar.
 */
import { troopById, troopTotal, troops as troopTypes, type TroopCount, type TroopId } from "../data/troops";
import { fiefs } from "../world/fiefs";
import { passiveInfluencePerDay } from "./careers";
import { dailyCost } from "./progression";
import { derivedInput } from "./experience";
import type { GameState } from "./store";

/** Comida por dia: o viajante come, e cada punhado de homens come junto. */
export function foodPerDay(troops: TroopCount): number {
  return 1 + Math.ceil(troopTotal(troops) / 6);
}

/** Quanto a terra que é sua rende por dia. */
export function fiefIncomePerDay(s: GameState): number {
  let sum = 0;
  for (const fief of fiefs) if ((s.fiefOwners[fief.id] ?? fief.ownerHouseId) === "player") sum += fief.income;
  return sum;
}

export type DayReport = {
  day: number;
  wages: number;
  food: number;
  income: number;
  influence: number;
  deserted: number;
  unpaid: boolean;
  hungry: boolean;
  recovered: number;
};

/** Quem vai embora primeiro: os de menor grau, que são os menos comprometidos. */
function desert(troops: TroopCount, count: number): { troops: TroopCount; gone: number } {
  const next: TroopCount = { ...troops };
  let left = count;
  let gone = 0;
  const order = [...troopTypes].sort((a, b) => a.tier - b.tier || a.strength - b.strength);
  for (const t of order) {
    if (left <= 0) break;
    const have = next[t.id] ?? 0;
    const take = Math.min(have, left);
    if (take > 0) {
      next[t.id] = have - take;
      if (next[t.id] === 0) delete next[t.id as TroopId];
      left -= take;
      gone += take;
    }
  }
  return { troops: next, gone };
}

/**
 * Aplica UM dia. Chamada uma vez por dia virado, nunca em lote silencioso:
 * quem some do jogo por três dias precisa ver os três dias cobrados.
 */
export function applyDay(s: GameState, day: number): { state: GameState; report: DayReport } {
  const maintained:TroopCount={...s.troops};
  for(const type of troopTypes)maintained[type.id]=(maintained[type.id]??0)+(s.wounded[type.id]??0);
  const input = {...derivedInput(s),troops:maintained};
  const wages = dailyCost(input);
  const eaten = foodPerDay(maintained)+Math.ceil(troopTotal(s.prisoners)/8);
  const income = fiefIncomePerDay(s);
  const influence = passiveInfluencePerDay(s.careerXp);

  let gold = s.gold + income;
  let food = s.food;
  let troops = s.troops;
  let wounded: TroopCount = {...s.wounded};

  const unpaid = gold < wages;
  gold = Math.max(0, gold - wages);

  const hungry = food < eaten;
  food = Math.max(0, food - eaten);

  let deserted = 0;
  let hardshipDays = s.hardshipDays;
  if ((unpaid || hungry) && troopTotal(troops) > 0) {
    hardshipDays += 1;
    // O primeiro dia ruim é aviso. A partir do segundo, some gente — e some
    // mais depressa quanto mais tempo a situação durar.
    if (hardshipDays >= 2) {
      const share = Math.min(0.4, 0.08 * (hardshipDays - 1));
      const leaving = Math.max(1, Math.round(troopTotal(troops) * share));
      const result = desert(troops, leaving);
      troops = result.troops;
      deserted = result.gone;
    }
  } else {
    hardshipDays = 0;
  }

  // Feridos voltam por tipo e só se recuperam quando o grupo conseguiu comer.
  let recovered=0;
  if(!hungry){
    troops={...troops};
    for(const type of troopTypes){
      const waiting=wounded[type.id]??0;
      const ready=waiting>0?Math.max(1,Math.ceil(waiting*.34)):0;
      if(!ready)continue;
      wounded[type.id]=waiting-ready;
      if(!wounded[type.id])delete wounded[type.id as TroopId];
      troops[type.id]=(troops[type.id]??0)+ready;
      recovered+=ready;
    }
  }

  return {
    state: {
      ...s,
      gold,
      food,
      troops,
      wounded,
      influence: Math.round((s.influence + influence) * 10) / 10,
      dayProcessed: day,
      hardshipDays,
    },
    report: { day, wages, food: eaten, income, influence, deserted, unpaid, hungry, recovered },
  };
}

/** A linha que vai para a crônica, ou `null` quando o dia não teve nada a dizer. */
export function reportLine(report: DayReport, troops: TroopCount): string | null {
  const parts: string[] = [];
  if (report.income > 0) parts.push(`+${report.income} de renda`);
  if (report.wages > 0) parts.push(`−${report.wages} de soldo`);
  if (report.food > 0 && troopTotal(troops) > 0) parts.push(`−${report.food} de comida`);
  if (report.unpaid) parts.push("SEM SOLDO");
  if (report.hungry) parts.push("SEM COMIDA");
  if (report.deserted > 0) parts.push(`${report.deserted} desertaram`);
  if (report.recovered > 0) parts.push(`${report.recovered} ferido(s) voltaram à linha`);
  if (!parts.length) return null;
  return `Dia ${report.day}: ${parts.join(" · ")}`;
}

/** Nome legível de uma tropa, para avisos. */
export function troopName(id: TroopId, n: number): string {
  const t = troopById.get(id);
  if (!t) return id;
  return n === 1 ? t.singular : t.name;
}
