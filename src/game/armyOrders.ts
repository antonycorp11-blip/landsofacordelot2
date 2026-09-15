/** Convoca a hoste do senhor a marchar até uma sede em guerra. */
import { houseById } from '../data/houses';
import { ownerOf } from '../data/fiefOwners';
import { troopTotal } from '../data/troops';
import { fiefById, type Fief } from '../world/fiefs';
import { routeNodeById } from '../world/valdoria';
import { wandererById, type WorldForceState } from './worldForces';
import { atWar } from './worldSim';
import { getState, update, type GameState } from './store';

const RALLY_LIMIT=700;
const ORDER_INFLUENCE=6;
const ORDER_SERVICE=25;
export function rallyNode(fief:Fief):{id:string;distance:number}|null {
  let best:{id:string;distance:number}|null=null;
  for(const node of routeNodeById.values()){
    const distance=Math.hypot(node.x-fief.seat.x,node.y-fief.seat.y);
    if(!best||distance<best.distance)best={id:node.id,distance};
  }
  return best;
}
export function armyForLord(s:GameState):{id:string;force:WorldForceState}|null {
  if(s.allegiance.kind!=='jurado')return null;
  for(const [id,force] of Object.entries(s.worldForces)){
    if(wandererById.get(id)?.routine==='exército'&&force.ownerHouseId===s.allegiance.houseId&&force.status==='active')return {id,force};
  }
  return null;
}
export function armyOrderBlocker(s:GameState,fief:Fief):string|null {
  if(s.allegiance.kind!=='jurado')return 'Só um vassalo pode convocar a hoste do seu senhor.';
  const defender=ownerOf(fief.id);
  if(defender==='player'||defender===s.allegiance.houseId)return 'A sede não é inimiga do seu senhor.';
  if(!atWar(s,s.allegiance.houseId,defender))return 'Seu senhor não está em guerra com esta Casa.';
  const rally=rallyNode(fief);
  if(!rally||rally.distance>RALLY_LIMIT)return 'Esta sede está longe demais de uma estrada para reunir a hoste.';
  const army=armyForLord(s);
  if(!army)return 'A hoste do seu senhor não está ativa no mapa.';
  if(troopTotal(army.force.troops)<15)return 'A hoste precisa se recompor antes de marchar.';
  if(army.force.campaignOrder&&army.force.campaignOrder.untilHour>(s.journey?.hours??0))return army.force.campaignOrder.fiefId===fief.id?'A hoste já marcha para esta sede.':'A hoste já atende outra convocação.';
  if(s.allegiance.service<ORDER_SERVICE)return `Precisa de ${ORDER_SERVICE} serviço prestado ao senhor.`;
  if(s.influence<ORDER_INFLUENCE)return `Precisa de ${ORDER_INFLUENCE} influência.`;
  return null;
}
export function orderArmyToFief(fiefId:string):boolean {
  const s=getState(),fief=fiefById.get(fiefId);
  if(!fief||armyOrderBlocker(s,fief))return false;
  const army=armyForLord(s),rally=rallyNode(fief);
  if(!army||!rally||s.allegiance.kind!=='jurado')return false;
  const hour=s.journey?.hours??0;
  update(g=>({ ...g,influence:g.influence-ORDER_INFLUENCE,
    allegiance:g.allegiance.kind==='jurado'?{...g.allegiance,service:g.allegiance.service-ORDER_SERVICE}:g.allegiance,
    worldForces:{...g.worldForces,[army.id]:{...g.worldForces[army.id],campaignOrder:{fiefId,targetPoiId:rally.id,issuedAt:hour,untilHour:hour+240},
      objective:'siege',targetPoiId:rally.id,resting:0,objectiveLabel:`Convocada por você para ${fief.seatName}`}},
    adventure:{...g.adventure,sequence:g.adventure.sequence+1,chronicle:[{id:g.adventure.sequence+1,kind:'fronteira' as const,text:`Você convocou ${wandererById.get(army.id)?.name} para ${fief.seatName}. −6 influência · −25 serviço. A hoste terá de marchar.`,hours:hour},...g.adventure.chronicle].slice(0,80),
      notice:{title:'Hoste convocada',text:`${wandererById.get(army.id)?.name} recebeu ordem de marchar para ${fief.seatName}. −6 influência · −25 serviço. Procure a força no mapa: ela precisa chegar antes de apoiar o assalto.`,levelUp:false}} }));
  return true;
}
export function orderedArmyAt(s:GameState,fiefId:string):{id:string;force:WorldForceState;ready:boolean}|null {
  for(const [id,force] of Object.entries(s.worldForces)){
    const order=force.campaignOrder;
    if(!order||order.fiefId!==fiefId||force.status!=='active'||troopTotal(force.troops)<10||force.food<2)continue;
    const fief=fiefById.get(fiefId),node=routeNodeById.get(order.targetPoiId);
    const ready=!!fief&&!!node&&force.at===order.targetPoiId&&!force.to&&Math.hypot(node.x-fief.seat.x,node.y-fief.seat.y)<=RALLY_LIMIT;
    return {id,force,ready};
  }
  return null;
}
export function orderArmyHome(force:WorldForceState):WorldForceState {
  const home=force.ownerHouseId?houseById.get(force.ownerHouseId)?.capitalPoiId:null;
  return {...force,campaignOrder:null,objective:'return',targetPoiId:home??null,targetHouseId:undefined,
    objectiveLabel:'Reagrupando após apoiar o cerco'};
}
