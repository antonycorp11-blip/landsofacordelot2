import { allPois, poiById, routeNodeById } from '../world/valdoria';
import { findPath } from '../world/navgraph';
import { holdingFor } from '../data/holdings';
import { CAREERS } from './careers';
import { getState, type GameState } from './store';
import type { Contract } from './adventureState';
import type { AgentClass } from '../world/types';
import type { SkillId } from '../data/skills';
import { goodById } from '../data/goods';
import { canTradeAt, primaryExport, quoteAt } from './economy';

const themes: Record<AgentClass,{title:string;description:string;skill:SkillId; kinds:string[]}> = {
  MILITARY:{title:'Relatório da patrulha',description:'Leve as observações da patrulha ao posto aliado. A guarnição precisa saber o que se passa na estrada.',skill:'tatica',kinds:['military','castle','town']},
  TRADE:{title:'Uma encomenda na estrada',description:'Entregue um pequeno volume selado ao representante do mercado. A carga cabe em sua bagagem.',skill:'comercio',kinds:['market','port','city','town']},
  POLITICS:{title:'Palavras sob sigilo',description:'Transporte uma carta de apresentação. O destinatário pagará ao reconhecer o selo intacto.',skill:'diplomacia',kinds:['castle','city','town']},
  RELIGION:{title:'Notícias para os peregrinos',description:'Leve os registros de hospedagem e a bênção da comunidade. Eles são esperados no próximo abrigo.',skill:'caridade',kinds:['temple','village','town']},
};
const targets = new Map<string, {id:string;hours:number} | null>();
function destination(sourceId: string, career: AgentClass) {
  const key = `${sourceId}:${career}`;
  if (targets.has(key)) return targets.get(key)!;
  const source = poiById.get(sourceId);
  if (!source || !routeNodeById.has(sourceId)) return null;
  const candidates = allPois.filter(p=>p.id!==sourceId && routeNodeById.has(p.id) && holdingFor(p).kind!=='site')
    .sort((a,b)=>Math.hypot(a.x-source.x,a.y-source.y)-Math.hypot(b.x-source.x,b.y-source.y)).slice(0,12);
  const connected = candidates.map(p=>({poi:p,route:findPath(sourceId,p.id)})).filter(p=>p.route && p.route.totalDistance>0);
  const preferred = connected.filter(p=>themes[career].kinds.includes(holdingFor(p.poi).kind));
  const nearest = (preferred.length ? preferred : connected).sort((a,b)=>a.route!.travelHours-b.route!.travelHours)[0];
  const result = nearest ? {id:nearest.poi.id,hours:nearest.route!.travelHours} : null;
  targets.set(key,result);
  return result;
}
/** Offers refresh every three world days; completed and failed IDs cannot be claimed again. */
export function contractsAt(sourceId: string, s: GameState = getState()): Contract[] {
  const source = poiById.get(sourceId);
  if (!source || holdingFor(source).kind==='site') return [];
  const hours = s.journey?.hours ?? 0;
  const cycle = Math.floor(hours/72);
  const patron = Object.values(s.companions).find(c=>c.status==='AVAILABLE' && c.locationPoiId===sourceId);
  return CAREERS.flatMap(career=>{
    const target = destination(sourceId,career);
    const id = `${sourceId}:${career}:${cycle}`;
    if (!target || s.adventure.finishedOffers[id]) return [];
    const theme = themes[career];
    const cargoGood = career === 'TRADE' && canTradeAt(source) ? primaryExport(source) : undefined;
    const cargoQuote = cargoGood ? quoteAt(source,cargoGood,s) : undefined;
    const available = cargoQuote?.stock ?? 0;
    // O primeiro trabalho nunca pode exigir uma compra que a própria bolsa atual torna impossível.
    const affordable = cargoQuote ? Math.floor((s.gold * .75) / cargoQuote.buy) : 0;
    const cargo = cargoGood && available >= 2 && affordable >= 2
      ? { goodId:cargoGood, amount:Math.min(4 + (sourceId.length + cycle) % 4, available, affordable) }
      : undefined;
    const cargoCost = cargo ? quoteAt(source,cargo.goodId,s).buy * cargo.amount : 0;
    const title = cargo ? `Encomenda de ${goodById.get(cargo.goodId)?.name.toLowerCase()}` : theme.title;
    const description = cargo
      ? `Compre ${cargo.amount} ${goodById.get(cargo.goodId)?.name.toLowerCase()} e entregue no destino. O custo da mercadoria sai do seu bolso; a paga cobre a compra e o risco da rota.`
      : theme.description;
    return [{ id,title,description,career,sourceId,destinationId:target.id,patronId:patron?.id,cargo,
      travelHours:target.hours,acceptedAt:hours,deadline:hours+Math.max(72,target.hours*3+24),status:'active' as const,
      reward:{xp:100,food:6,gold:Math.round(cargoCost+45+target.hours*2),influence:4,careerXp:{[career]:70},skillXp:{[theme.skill]:3},
        houseRelation:{houseId:holdingFor(source).controllerHouseId,amount:2},
        localInfluence:{poiId:sourceId,amount:3},
        ...(patron ? {characterRelation:{characterId:patron.id,amount:12}} : {}),
      },
    }];
  });
}
