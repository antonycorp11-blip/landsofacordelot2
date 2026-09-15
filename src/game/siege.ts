/** A hoste do jogador cerca uma sede real do mapa; a decisão é feita antes da arena. */
import { ownerOf, setOwner } from '../data/fiefOwners';
import { houseById } from '../data/houses';
import { troopStrength, troopTotal, troops as troopTypes, type TroopCount } from '../data/troops';
import { fiefById, type Fief } from '../world/fiefs';
import { loadStop } from '../world/roadStops';
import type { HouseId } from '../world/types';
import { belligerentOf } from './allegiance';
import { startBattle } from './battle';
import { pactActive } from './diplomacy';
import { withReward } from './experience';
import { getState, update, type GameState } from './store';
import { atWar } from './worldSim';
import { orderedArmyAt } from './armyOrders';
import { wandererById } from './worldForces';

export type SiegeState = {
  fiefId: string;
  defender: HouseId;
  startedAt: number;
  ramBuilt: boolean;
  demandAttempted: boolean;
  demandRoll: number;
};

export const SIEGE_RANGE = 260;
const siegeNote = (s:GameState,title:string,text:string):GameState => ({...s,adventure:{...s.adventure,notice:{title,text,levelUp:false}}});
function siegeLog(s:GameState,text:string):GameState {const id=s.adventure.sequence+1;return {...s,adventure:{...s.adventure,sequence:id,chronicle:[{id,kind:'fronteira' as const,text,hours:s.journey?.hours??0},...s.adventure.chronicle].slice(0,80)}};}
export function siegeDistance(s:GameState,fief:Fief):number {
  const at=loadStop(s.journey?.at);
  if(!at)return Infinity;
  return Math.hypot(at.x-fief.seat.x,at.y-fief.seat.y);
}
export function garrisonOf(fief:Fief,owner=ownerOf(fief.id)):TroopCount {
  const noble=fief.tier==='nobre';
  const power=owner==='player'?50:houseById.get(owner)?.militaryPower??50;
  const veterans=Math.max(0,Math.floor((power-40)/16));
  return {
    milicianos:Math.round(fief.defense/8)+(noble?2:0),
    infantaria:Math.round(fief.defense/11)+veterans,
    arqueiros:Math.round(fief.defense/14),
    ...(noble&&power>=80?{cavaleiros:Math.floor((power-60)/11)}:{}),
  };
}
export function wallProtection(fief:Fief,ramBuilt:boolean):number {
  return Math.max(1.08,1+fief.defense/105-(ramBuilt?.38:0));
}
function thinTroops(count:TroopCount,fraction:number):TroopCount {
  const left:TroopCount={};
  for(const type of troopTypes){const have=count[type.id]??0,keep=have-Math.round(have*fraction);if(keep>0)left[type.id]=keep;}
  return left;
}
export function siegeBlocker(s:GameState,fief:Fief):string|null {
  const defender=ownerOf(fief.id),me=belligerentOf(s);
  if(defender==='player')return 'Este senhorio já é seu.';
  if(!me)return 'Jure a uma Casa ou declare independência antes de cercar terras.';
  if(!atWar(s,me,defender))return `Sua facção não está em guerra com a Casa dona.`;
  if(s.adventure.siege||s.adventure.battle||s.adventure.event||s.adventure.cinematic)return 'Resolva o encontro em curso primeiro.';
  if(s.adventure.story.pending||s.adventure.quest?.pending)return 'Resolva a cena em curso primeiro.';
  if(siegeDistance(s,fief)>SIEGE_RANGE)return `Sua hoste precisa chegar à sede (${fief.seatName}).`;
  if(s.journey?.destinationId||s.journey?.to)return 'Pare a viagem junto à sede antes de ordenar o cerco.';
  if(troopTotal(s.troops)<12)return 'Reúna ao menos 12 soldados.';
  if(s.food<6)return 'Leve ao menos 6 comida para cercar e atacar.';
  return null;
}
export function declareSiegeWar(fiefId:string):boolean {
  const s=getState(),fief=fiefById.get(fiefId),owner=ownerOf(fiefId);
  if(!fief||owner==='player'||s.allegiance.kind!=='independente'||s.influence<8||atWar(s,'player',owner)||pactActive(s,owner))return false;
  const day=Math.floor((s.journey?.hours??0)/24);
  update(g=>({ ...g,influence:g.influence-8,wars:[...(g.wars??[]),{a:'player',b:owner,since:day}],
    houseRelations:{...g.houseRelations,[owner]:Math.max(-100,(g.houseRelations[owner]??0)-25)},
    adventure:{...g.adventure,notice:{title:'Guerra declarada',text:`Você declarou guerra à Casa dona de ${fief.name}. −8 influência · −25 relação. As hostes inimigas podem atacar seus feudos.`,levelUp:false},
      sequence:g.adventure.sequence+1,chronicle:[{id:g.adventure.sequence+1,kind:'fronteira' as const,text:`Guerra declarada pela conquista de ${fief.name}.`,hours:g.journey?.hours??0},...g.adventure.chronicle].slice(0,80)}}));
  return true;
}
export function beginSiege(fiefId:string):boolean {
  const s=getState(),fief=fiefById.get(fiefId);
  if(!fief||siegeBlocker(s,fief))return false;
  const defender=ownerOf(fiefId) as HouseId;
  update(g=>siegeLog({...g,food:g.food-3,adventure:{...g.adventure,notice:null,siege:{fiefId,defender,startedAt:g.journey?.hours??0,ramBuilt:false,demandAttempted:false,demandRoll:Math.random()}}},`Cerco iniciado em ${fief.seatName}. −3 comida para montar o acampamento.`));
  return true;
}
export function buildRam():boolean {
  const s=getState(),siege=s.adventure.siege;
  const me=belligerentOf(s);
  if(!siege||siege.ramBuilt||(s.inventory.wood??0)<2||(s.inventory.tools??0)<1||s.food<1||ownerOf(siege.fiefId)!==siege.defender||!me||!atWar(s,me,siege.defender))return false;
  update(g=>{const inventory={...g.inventory},inventoryCost={...g.inventoryCost};
    for(const [id,used] of [['wood',2],['tools',1]] as const){const old=inventory[id]??0,left=old-used;
      if(left){inventory[id]=left;inventoryCost[id]=Math.round((inventoryCost[id]??0)*left/old);}else{delete inventory[id];delete inventoryCost[id];}}
    return {...g,food:g.food-1,inventory,inventoryCost,adventure:{...g.adventure,siege:{...g.adventure.siege!,ramBuilt:true}}};});
  return true;
}
export function surrenderChance(s:GameState,siege:SiegeState):number {
  const fief=fiefById.get(siege.fiefId);
  if(!fief)return 0;
  const force=troopStrength(s.troops)/Math.max(1,troopStrength(garrisonOf(fief,siege.defender)));
  return Math.max(.08,Math.min(.68,.1+(force-1)*.16+s.attributes.diplomacy*.025+(s.skills.persuasao??0)/260+(siege.ramBuilt?.1:0)));
}
export function demandSurrender():boolean {
  const s=getState(),siege=s.adventure.siege,fief=siege&&fiefById.get(siege.fiefId);
  const me=belligerentOf(s);
  if(!siege||!fief||siege.demandAttempted||ownerOf(fief.id)!==siege.defender||!me||!atWar(s,me,siege.defender))return false;
  const success=siege.demandRoll<surrenderChance(s,siege);
  update(g=>{
    let next:GameState=success?withReward(g,{xp:90,influence:5,careerXp:{MILITARY:60},skillXp:{persuasao:3}}):{...g,influence:g.influence-1};
    if(success&&next.allegiance.kind==='jurado')next={...next,allegiance:{...next.allegiance,service:next.allegiance.service+30}};
    return siegeLog(siegeNote({...next,adventure:{...next.adventure,siege:success?null:{...siege,demandAttempted:true}}},success?'Portões abertos':'Rendição recusada',success?`${fief.seatName} abriu os portões. ${fief.name} é seu sem uma batalha. +5 influência${next.allegiance.kind==='jurado'?' · +30 serviço':''}.`:`O senhor recusou. −1 influência. Agora resta o assalto ou levantar o cerco.`),success?`${fief.name} rendeu-se; os portões abriram sem assalto.`:`O senhor de ${fief.name} recusou render-se; seus enviados voltaram sem acordo.`);
  });
  if(success)setOwner(fief.id,'player');
  return true;
}
export function assaultSiege():boolean {
  const s=getState(),siege=s.adventure.siege,fief=siege&&fiefById.get(siege.fiefId);
  const me=belligerentOf(s);
  if(!siege||!fief||s.food<2||troopTotal(s.troops)<1||ownerOf(fief.id)!==siege.defender||!me||!atWar(s,me,siege.defender))return false;
  const ordered=orderedArmyAt(s,fief.id),ally=ordered?.ready?ordered:null;
  const original=garrisonOf(fief,siege.defender);
  const pressure=ally?Math.min(.38,.12+troopStrength(ally.force.troops)/Math.max(1,troopStrength(original))*.1):0;
  const defenders=pressure?thinTroops(original,pressure):original;
  const displaced=troopTotal(original)-troopTotal(defenders);
  update(g=>{const battle=startBattle(g,defenders,`Guarnição de ${fief.seatName}`,'hill');
    battle.siege={fiefId:fief.id,defender:siege.defender,wallProtection:wallProtection(fief,siege.ramBuilt),ramBuilt:siege.ramBuilt,
      ...(ally?{supportForceId:ally.id,supportName:wandererById.get(ally.id)?.name??'Hoste aliada',displaced}:{})};
    if(ally)battle.log=[`${battle.siege.supportName} cortou as saídas e chamou ${displaced} defensores para fora da muralha. A hoste sofreu perdas nessa manobra.`];
    const worldForces=ally?{...g.worldForces,[ally.id]:{...g.worldForces[ally.id],troops:thinTroops(ally.force.troops,.1),food:Math.max(0,ally.force.food-2)}}:g.worldForces;
    return {...g,food:g.food-2,worldForces,adventure:{...g.adventure,battle}};});
  return true;
}
export function liftSiege():boolean {
  if(!getState().adventure.siege)return false;
  update(g=>siegeLog({...g,adventure:{...g.adventure,siege:null}},'Sua hoste levantou o cerco. Os suprimentos gastos não voltaram.'));
  return true;
}
