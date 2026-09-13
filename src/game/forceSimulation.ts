/** Estratégia diária das forças: comércio, caça, pilhagem, suprimento e cerco. */
import { troopStrength, troopTotal, troops as troopTypes, type TroopCount, type TroopId } from "../data/troops";
import { goodById } from "../data/goods";
import { houseById } from "../data/houses";
import { fiefs } from "../world/fiefs";
import { makeRng } from "../world/geo";
import { allPois, poiById, routeNodeById } from "../world/valdoria";
import { partyOf } from "../world/wanderers";
import { canTradeAt, marketStock, primaryExport, quoteAt } from "./economy";
import type { GameState } from "./store";
import { wandererById, type WorldForceState } from "./worldForces";

export type ForceNews={text:string;kind:"evento"|"fronteira"};

function removeShare(count:TroopCount,share:number):TroopCount {
  const next={...count};
  let left=Math.max(1,Math.round(troopTotal(count)*share));
  for(const troop of [...troopTypes].sort((a,b)=>a.tier-b.tier)){
    const have=next[troop.id]??0,take=Math.min(have,left);
    if(take){next[troop.id]=have-take;if(!next[troop.id])delete next[troop.id as TroopId];left-=take;}
    if(left<=0)break;
  }
  return next;
}

function nearest(id:string,candidates:string[],forces:Record<string,WorldForceState>):string|null {
  const from=routeNodeById.get(forces[id]?.at);
  if(!from)return candidates[0]??null;
  return candidates.map(candidate=>({id:candidate,node:routeNodeById.get(forces[candidate]?.at)}))
    .filter((entry)=>entry.node)
    .sort((a,b)=>Math.hypot(a.node!.x-from.x,a.node!.y-from.y)-Math.hypot(b.node!.x-from.x,b.node!.y-from.y))[0]?.id??null;
}

function homePoi(id:string):string|null {
  const wanderer=wandererById.get(id);
  const house=wanderer?.houseId?houseById.get(wanderer.houseId):undefined;
  if(house?.capitalPoiId&&routeNodeById.has(house.capitalPoiId))return house.capitalPoiId;
  return allPois.find((poi)=>poi.regionId===wanderer?.home&&poi.routeNode)?.id??null;
}

function destinationForTrade(force:WorldForceState,goodId:Parameters<typeof quoteAt>[1],s:GameState):string|null {
  return allPois.filter((poi)=>poi.id!==force.at&&poi.routeNode&&canTradeAt(poi))
    .map((poi)=>({id:poi.id,price:quoteAt(poi,goodId,s).sell}))
    .sort((a,b)=>b.price-a.price)[0]?.id??null;
}

function provisionArmy(force:WorldForceState,home:string|null,s:GameState,day:number,wanted:number):{force:WorldForceState;state:GameState} {
  const poi=home?poiById.get(home):undefined;
  if(!poi||force.at!==home)return {force,state:s};
  const available=marketStock(poi,"provisions",s),taken=Math.min(wanted,available);
  if(!taken)return {force,state:s};
  return {force:{...force,food:Math.min(30,force.food+taken)},state:{...s,
    marketStocks:{...s.marketStocks,[home]:{...s.marketStocks[home],provisions:available-taken}},
    marketRefreshDay:{...s.marketRefreshDay,[home]:day},
  }};
}

function loadCaravan(id:string,force:WorldForceState,s:GameState,day:number):{state:GameState;force:WorldForceState} {
  const origin=poiById.get(force.at);
  if(!origin||!canTradeAt(origin))return {state:s,force:{...force,targetPoiId:homePoi(id),objectiveLabel:"Procurando um mercado"}};
  const goodId=primaryExport(origin);
  const available=marketStock(origin,goodId,s);
  const amount=Math.min(available,8+(id.length+day)%9);
  const destination=destinationForTrade(force,goodId,s);
  if(!destination||amount<=0)return {state:s,force:{...force,targetPoiId:destination,objectiveLabel:"Esperando mercadoria"}};
  const marketStocks={...s.marketStocks,[origin.id]:{...s.marketStocks[origin.id],[goodId]:available-amount}};
  return {state:{...s,marketStocks,marketRefreshDay:{...s.marketRefreshDay,[origin.id]:day}},force:{...force,
    cargo:{[goodId]:amount},objective:"trade",targetPoiId:destination,targetForceId:null,
    objectiveLabel:`Levando ${amount} ${goodById.get(goodId)?.name.toLowerCase()} para ${poiById.get(destination)?.name}`,
  }};
}

function deliverCaravan(force:WorldForceState,s:GameState,day:number):{state:GameState;force:WorldForceState;news?:ForceNews} {
  if(force.at!==force.targetPoiId||!Object.keys(force.cargo).length)return {state:s,force};
  const destination=poiById.get(force.at);
  if(!destination)return {state:s,force};
  const stocks={...s.marketStocks[force.at]};
  let amount=0;
  for(const [goodId,value] of Object.entries(force.cargo)){
    const id=goodId as keyof typeof force.cargo,n=value??0;
    stocks[id]=(marketStock(destination,id,s)??0)+n;amount+=n;
  }
  const state={...s,marketStocks:{...s.marketStocks,[force.at]:stocks},marketRefreshDay:{...s.marketRefreshDay,[force.at]:day},
    regionSecurity:{...s.regionSecurity,[destination.regionId]:Math.min(30,(s.regionSecurity[destination.regionId]??0)+1)}};
  return {state,force:{...force,cargo:{},targetPoiId:null,resting:10,objectiveLabel:"Negócio concluído; procurando nova carga"},
    news:{kind:"evento",text:`Uma caravana entregou ${amount} volumes em ${destination.name}; a oferta local aumentou.`}};
}

function resolveContact(aId:string,bId:string,forces:Record<string,WorldForceState>,day:number):{forces:Record<string,WorldForceState>;news:ForceNews;securityRegion?:string;securityDelta:number} {
  const a=forces[aId],b=forces[bId],rng=makeRng(`force-fight:${aId}:${bId}:${day}`);
  const aScore=troopStrength(a.troops)*(.85+rng()*.3),bScore=troopStrength(b.troops)*(.85+rng()*.3);
  const winnerId=aScore>=bScore?aId:bId,loserId=winnerId===aId?bId:aId;
  const winner=forces[winnerId],loser=forces[loserId];
  const nextWinner={...winner,troops:removeShare(winner.troops,.14+rng()*.18),targetForceId:null,targetPoiId:null,resting:8,objectiveLabel:"Reorganizando após o combate"};
  const nextLoser={...loser,troops:{},status:"defeated" as const,returnsAt:day*24+72,targetForceId:null,targetPoiId:null};
  const loserDef=wandererById.get(loserId),winnerDef=wandererById.get(winnerId);
  const region=routeNodeById.get(loser.at)?.regionId;
  const patrolWon=winnerDef?.routine==="patrulha"&&loserDef?.routine==="pilhagem";
  const raiderWon=winnerDef?.routine==="pilhagem";
  return {forces:{...forces,[winnerId]:nextWinner,[loserId]:nextLoser},securityRegion:region,securityDelta:patrolWon?6:raiderWon?-7:0,
    news:{kind:"evento",text:`${winnerDef?.name} venceu ${loserDef?.name} sem a intervenção do jogador.${loserDef?.routine==="comércio"?" A carga não chegará ao mercado.":""}`}};
}

/** Um passo por dia, chamado junto de comida, soldo e política. */
export function advanceWorldForces(input:GameState,day:number):{state:GameState;news:ForceNews[]} {
  let state=input;
  let forces={...state.worldForces};
  const news:ForceNews[]=[];
  const active=()=>Object.keys(forces).filter((id)=>forces[id].status==="active");

  // Entregas e novos carregamentos.
  for(const id of active()){
    const definition=wandererById.get(id);let force=forces[id];
    if(definition?.routine!=="comércio")continue;
    const delivered=deliverCaravan(force,{...state,worldForces:forces},day);state=delivered.state;force=delivered.force;if(delivered.news)news.push(delivered.news);
    if(!Object.keys(force.cargo).length&&!force.targetPoiId){const loaded=loadCaravan(id,force,{...state,worldForces:forces},day);state=loaded.state;force=loaded.force;}
    forces[id]=force;
  }

  // Patrulhas caçam saqueadores; saqueadores preferem caravanas.
  const raiders=active().filter((id)=>wandererById.get(id)?.routine==="pilhagem");
  const caravans=active().filter((id)=>wandererById.get(id)?.routine==="comércio");
  // Uma presa por caçador. Sem isto as cinco patrulhas convergiam todas no
  // mesmo bando — que é o mais próximo de todas — e os outros ficavam livres
  // para saquear o reino inteiro sem ninguém atrás.
  const claimedRaiders=new Set<string>();
  const claimedCaravans=new Set<string>();
  for(const id of active()){
    const def=wandererById.get(id),force=forces[id];
    if(def?.routine==="patrulha"){
      const free=raiders.filter((r)=>!claimedRaiders.has(r));
      const target=nearest(id,free.length?free:raiders,forces);
      if(target)claimedRaiders.add(target);
      forces[id]={...force,objective:"hunt",targetForceId:target,targetPoiId:target?forces[target].at:null,objectiveLabel:target?`Caçando ${wandererById.get(target)?.name}`:"Patrulhando uma estrada tranquila"};
    }else if(def?.routine==="pilhagem"){
      const free=caravans.filter((c)=>!claimedCaravans.has(c));
      const target=nearest(id,free.length?free:caravans,forces);
      if(target)claimedCaravans.add(target);
      forces[id]={...force,objective:"raid",targetForceId:target,targetPoiId:target?forces[target].at:null,objectiveLabel:target?`Seguindo ${wandererById.get(target)?.name}`:"Procurando uma presa"};
    }
  }

  // Hostes se reúnem, marcham com suprimento e cercam a sede inimiga.
  for(const id of active()){
    const def=wandererById.get(id);let force=forces[id];
    if(def?.routine!=="exército"||!def.houseId)continue;
    const war=state.wars.find((entry)=>entry.a===def.houseId||entry.b===def.houseId);
    const home=homePoi(id);
    if(!war){
      const original=partyOf(def),missing=Math.max(0,troopTotal(original)-troopTotal(force.troops));
      force={...force,objective:"defend",targetPoiId:home,targetForceId:null,targetHouseId:undefined,siegeProgress:0,
        troops:missing?{...force.troops,milicianos:(force.troops.milicianos??0)+Math.min(4,missing)}:force.troops,
        objectiveLabel:`Defendendo ${houseById.get(def.houseId)?.shortName}`};
      const supplied=provisionArmy(force,home,{...state,worldForces:forces},day,5);state=supplied.state;force=supplied.force;
    }else{
      const enemy=war.a===def.houseId?war.b:war.a,target=houseById.get(enemy)?.capitalPoiId??null;
      const consumption=Math.max(1,Math.ceil(troopTotal(force.troops)/35));
      force={...force,food:Math.max(0,force.food-consumption),targetHouseId:enemy};
      if(force.food<=0){
        force={...force,troops:removeShare(force.troops,.08),objective:"return",targetPoiId:home,siegeProgress:0,objectiveLabel:"Sem suprimentos; retornando para casa"};
      }else if(force.objective!=="siege"&&force.objective!=="gather"){
        force={...force,objective:"gather",targetPoiId:home,lastActionDay:day,objectiveLabel:"Reunindo tropas e provisões"};
      }else if(force.objective==="gather"&&force.at===home&&day>force.lastActionDay){
        const supplied=provisionArmy(force,home,{...state,worldForces:forces},day,12);state=supplied.state;force=supplied.force;
        force={...force,objective:"siege",targetPoiId:target,lastActionDay:day,objectiveLabel:`Marchando para cercar ${target?poiById.get(target)?.name:"o inimigo"}`};
      }else if(force.objective==="siege"&&target&&force.at===target){
        force={...force,siegeProgress:force.siegeProgress+1,objectiveLabel:`Cercando ${poiById.get(target)?.name} · etapa ${Math.min(3,force.siegeProgress+1)}/3`};
        if(force.siegeProgress>=3){
          const victim=fiefs.find((f)=>(state.fiefOwners[f.id]??f.ownerHouseId)===enemy&&f.tier!=="nobre");
          if(victim){state={...state,fiefOwners:{...state.fiefOwners,[victim.id]:def.houseId}};news.push({kind:"fronteira",text:`${houseById.get(def.houseId)?.shortName} tomou ${victim.name} após um cerco conduzido por ${def.name}.`});}
          force={...force,objective:"return",targetPoiId:home,siegeProgress:0,objectiveLabel:"Retornando após a campanha"};
        }
      }
    }
    forces[id]=force;
  }

  // Duas hostes inimigas no mesmo ponto precisam disputar a estrada antes
  // que qualquer uma continue o cerco.
  const armies=active().filter((id)=>wandererById.get(id)?.routine==="exército");
  const armyResolved=new Set<string>();
  for(const aId of armies){for(const bId of armies){
    if(aId>=bId||forces[aId]?.at!==forces[bId]?.at)continue;
    const aHouse=wandererById.get(aId)?.houseId,bHouse=wandererById.get(bId)?.houseId;
    if(!aHouse||!bHouse||!state.wars.some((war)=>(war.a===aHouse&&war.b===bHouse)||(war.a===bHouse&&war.b===aHouse)))continue;
    const key=`${aId}:${bId}`;if(armyResolved.has(key))continue;armyResolved.add(key);
    const result=resolveContact(aId,bId,forces,day);forces=result.forces;
    news.push({kind:"fronteira",text:`Batalha de campanha: ${result.news.text}`});
  }}

  // Confrontos acontecem quando caçador e alvo alcançam o mesmo nó.
  const resolved=new Set<string>();
  for(const id of active()){
    const force=forces[id],targetId=force.targetForceId;
    if(!targetId||!forces[targetId]||forces[targetId].status!=="active"||force.at!==forces[targetId].at)continue;
    const key=[id,targetId].sort().join(":");if(resolved.has(key))continue;resolved.add(key);
    const result=resolveContact(id,targetId,forces,day);forces=result.forces;news.push(result.news);
    if(result.securityRegion){const region=result.securityRegion as keyof GameState["regionSecurity"];state={...state,regionSecurity:{...state.regionSecurity,[region]:Math.max(-30,Math.min(30,(state.regionSecurity[region]??0)+result.securityDelta))}};}
  }

  return {state:{...state,worldForces:forces},news};
}
