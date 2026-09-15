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
import { fiefById, fiefs } from "../world/fiefs";
import { estateDay, estateOf, garrisonCost, incomeOf, WORKS, type EstateWork } from "./estates";
import { vassalStipend } from "./allegiance";
import { marriageOf } from "./diplomacy";
import { passiveInfluencePerDay } from "./careers";
import { dailyCost } from "./progression";
import { derivedInput } from "./experience";
import type { GameState } from "./store";

/** Comida por dia: o viajante come, e cada punhado de homens come junto. */
export function foodPerDay(troops: TroopCount): number {
  return 1 + Math.ceil(troopTotal(troops) / 6);
}

/** Os senhorios que são seus hoje. */
export function playerFiefIds(s: GameState): string[] {
  return fiefs.filter((f) => (s.fiefOwners[f.id] ?? f.ownerHouseId) === "player").map((f) => f.id);
}

/**
 * Quanto a terra rende por dia — já com imposto, prosperidade e lealdade.
 *
 * Deixou de ser a renda de tabela: é o que a administração do jogador
 * produziu, e é por isso que governar mal custa dinheiro.
 */
export function fiefIncomePerDay(s: GameState): number {
  return playerFiefIds(s).reduce((sum, id) => sum + incomeOf(s, id), 0);
}

/** O que a guarnição de todas as suas terras custa por dia. */
export function garrisonCostPerDay(s: GameState): number {
  return playerFiefIds(s).reduce((sum, id) => sum + garrisonCost(estateOf(s, id)), 0);
}

export type DayReport = {
  day: number;
  wages: number;
  /** Soldo da guarnição, cobrado à parte do grupo que marcha com você. */
  garrison: number;
  /** Terras que se levantaram hoje e deixaram de ser suas. */
  revolts: string[];
  completedWorks: { fiefId: string; kind: EstateWork }[];
  /** Soldo pago pela Casa a que você jurou. */
  stipend: number;
  kinship: number;
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
  const garrison = garrisonCostPerDay(s);
  // Soldo de vassalo: a Casa sustenta quem lhe serve, e é a razão prática de
  // jurar em vez de continuar livre.
  const stipend = vassalStipend(s.allegiance);
  const kinship = marriageOf(s) ? 3 : 0;
  const influence = passiveInfluencePerDay(s.careerXp) + (kinship ? .2 : 0);

  /* ---------------------- o que a terra fez hoje ----------------------- */
  const estates = { ...(s.fiefEstates ?? {}) };
  const fiefOwners = { ...s.fiefOwners };
  const regionSecurity = { ...(s.regionSecurity ?? {}) };
  const revolts: string[] = [];
  const completedWorks: { fiefId: string; kind: EstateWork }[] = [];
  for (const id of playerFiefIds(s)) {
    const result = estateDay(s, id, day);
    if (result.revolt) {
      // A terra volta para a Casa que a tinha antes de você.
      delete estates[id];
      fiefOwners[id] = fiefById.get(id)?.ownerHouseId ?? "house_valdoria";
      revolts.push(id);
      continue;
    }
    const current = estateOf(s, id);
    estates[id] = result.completedWork
      ? { ...current, loyalty: result.loyalty, project: undefined,
          buildings: { ...current.buildings, [result.completedWork]: (current.buildings?.[result.completedWork] ?? 0) + 1 } }
      : { ...current, loyalty: result.loyalty };
    if (result.completedWork) completedWorks.push({ fiefId: id, kind: result.completedWork });
    const region = fiefById.get(id)?.regionId;
    if (region && result.security > 0) {
      regionSecurity[region] = Math.max(-30, Math.min(30, (regionSecurity[region] ?? 0) + result.security * 0.2));
    }
  }

  let gold = s.gold + income + stipend + kinship - garrison;
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
      fiefEstates: estates,
      fiefOwners,
      regionSecurity,
      gold,
      food,
      troops,
      wounded,
      influence: Math.round((s.influence + influence) * 10) / 10,
      dayProcessed: day,
      hardshipDays,
    },
    report: { day, wages, garrison, stipend, kinship, food: eaten, income, influence, deserted, unpaid, hungry, recovered, revolts, completedWorks },
  };
}

/** A linha que vai para a crônica, ou `null` quando o dia não teve nada a dizer. */
export function reportLine(report: DayReport, troops: TroopCount): string | null {
  const parts: string[] = [];
  if (report.income > 0) parts.push(`+${report.income} de renda`);
  if (report.garrison > 0) parts.push(`−${report.garrison} de guarnição`);
  if (report.stipend > 0) parts.push(`+${report.stipend} de soldo do senhor`);
  if (report.kinship > 0) parts.push(`+${report.kinship} do vínculo matrimonial`);
  if (report.wages > 0) parts.push(`−${report.wages} de soldo`);
  if (report.food > 0 && troopTotal(troops) > 0) parts.push(`−${report.food} de comida`);
  if (report.unpaid) parts.push("SEM SOLDO");
  if (report.hungry) parts.push("SEM COMIDA");
  if (report.deserted > 0) parts.push(`${report.deserted} desertaram`);
  if (report.recovered > 0) parts.push(`${report.recovered} ferido(s) voltaram à linha`);
  for (const work of report.completedWorks) parts.push(`${WORKS[work.kind].name} de ${fiefById.get(work.fiefId)?.name ?? work.fiefId} concluídas`);
  if (!parts.length) return null;
  return `Dia ${report.day}: ${parts.join(" · ")}`;
}

/** Nome legível de uma tropa, para avisos. */
export function troopName(id: TroopId, n: number): string {
  const t = troopById.get(id);
  if (!t) return id;
  return n === 1 ? t.singular : t.name;
}
