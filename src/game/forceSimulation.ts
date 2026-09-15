/** Estratégia diária das forças: comércio, caça, pilhagem, suprimento e cerco. */
import { troopStrength, troopTotal, troops as troopTypes, type TroopCount, type TroopId } from "../data/troops";
import { estateOf, wallDefence } from "./estates";
import { goodById } from "../data/goods";
import { houseById } from "../data/houses";
import { fiefs } from "../world/fiefs";
import { makeRng } from "../world/geo";
import { insideLandcover } from "../world/landcover";
import { nearestWalkable, regionAtPoint } from "../world/navigation/navigationGrid";
import { allPois, poiById, regionById, routeNodeById } from "../world/valdoria";
import type { Point } from "../world/types";
import { partyOf } from "../world/wanderers";
import { canTradeAt, marketStock, primaryExport, quoteAt } from "./economy";
import type { GameState } from "./store";
import { wandererById, type WorldForceState } from "./worldForces";

export type ForceNews={text:string;kind:"evento"|"fronteira"};

const SEARCH_START=420;
const SEARCH_MAX=2800;
const SEARCH_GROWTH=135;
const ARRIVAL_EPSILON=190;

const VISION_BY_ROUTINE:Record<string,number>={
  patrulha:900,comércio:650,correio:820,peregrinação:520,
  pilhagem:840,cortejo:760,exército:1080,
};

function distance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.y-b.y);}
function lerp(a:Point,b:Point,t:number):Point{return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}

/**
 * Alcance de contato, calculado sem sorteio. A floresta onde o jogador está
 * pesa mais do que a do observador; massas entre os dois quebram a linha de
 * visão, e terreno alto esconde quem passa atrás dele. Estrada faz o oposto.
 */
export function playerVisionRange(forceId:string,observer:Point,player:Point,playerOnRoad:boolean):number {
  const routine=wandererById.get(forceId)?.routine??"comércio";
  let range=VISION_BY_ROUTINE[routine]??680;
  const region=regionAtPoint(player);
  const biome=region?regionById.get(region)?.biome:undefined;

  if(biome==="plains"||biome==="coastal")range*=1.18;
  if(biome==="dense_forest")range*=.58;
  if(biome==="alpine")range*=.72;
  if(insideLandcover(player,"forest"))range*=.52;
  if(insideLandcover(player,"highland"))range*=.7;
  if(insideLandcover(observer,"highland"))range*=1.1;

  for(const t of [.25,.5,.75]){
    const sample=lerp(observer,player,t);
    if(insideLandcover(sample,"forest"))range*=.78;
    if(insideLandcover(sample,"highland"))range*=.84;
  }
  if(playerOnRoad)range*=1.48;
  return Math.max(150,Math.min(1550,range));
}

function timeoutFor(id:string):number {
  const routine=wandererById.get(id)?.routine;
  return routine==="exército"?22:routine==="patrulha"?18:routine==="pilhagem"?14:16;
}

export function playerTrailConfidence(id:string,force:WorldForceState,worldHours:number):number {
  if(force.lastSeenAt<0||force.playerPursuit==="none"||force.playerPursuit==="lost")return 0;
  return Math.max(0,Math.min(1,1-(worldHours-force.lastSeenAt)/timeoutFor(id)));
}

function hash(value:string):number {
  let out=2166136261;
  for(let i=0;i<value.length;i++){out^=value.charCodeAt(i);out=Math.imul(out,16777619);}
  return out>>>0;
}

function searchPoint(id:string,force:WorldForceState,worldHours:number,previous?:Point|null):Point|null {
  const center=force.knownPlayerPosition;
  if(!center)return null;
  const cycle=Math.floor(Math.max(0,worldHours-force.lastSeenAt)*2);
  const salt=`${id}:${cycle}:${previous?`${Math.round(previous.x)}:${Math.round(previous.y)}`:"first"}`;
  const angle=(hash(salt)/0xffffffff)*Math.PI*2;
  const radius=Math.max(SEARCH_START,force.searchRadius);
  const reach=radius*(.42+(hash(`${salt}:reach`)%53)/100);
  const wanted={x:center.x+Math.cos(angle)*reach,y:center.y+Math.sin(angle)*reach};
  const candidate=nearestWalkable(wanted);
  // Ajustar um ponto bloqueado para terra firme nunca pode jogar a força para
  // fora do raio que ela deveria estar vasculhando.
  return candidate&&distance(center,candidate)<=radius?candidate:center;
}

/** Ponto que o movimento deve alcançar sem ler a posição real do jogador. */
export function playerPursuitDestination(force:WorldForceState):Point|null {
  if(force.playerPursuit==="tracking")return force.knownPlayerPosition;
  if(force.playerPursuit==="searching")return force.searchTargetPosition;
  return null;
}

function samePoint(a:Point|null,b:Point):boolean{return !!a&&distance(a,b)<90;}

/**
 * Um pulso de percepção. Recebe posições físicas do runtime e devolve somente
 * a memória das forças. Nenhuma força consulta o destino ou a posição real do
 * jogador fora desta função.
 */
export function updatePlayerPursuits(
  input:Record<string,WorldForceState>,
  positions:ReadonlyMap<string,Point>,
  player:Point,
  worldHours:number,
  playerOnRoad:boolean,
):Record<string,WorldForceState> {
  let forces=input;
  const write=(id:string,next:WorldForceState)=>{
    if(forces===input)forces={...input};
    forces[id]=next;
  };
  const direct=new Set<string>();

  // Contato visual direto. Saqueadores iniciam a caça; forças já ordenadas
  // pelo enredo apenas renovam a informação que de fato conseguiram ver.
  for(const [id,force] of Object.entries(input)){
    const at=positions.get(id);
    if(!at||force.status!=="active")continue;
    const seen=distance(at,player)<=playerVisionRange(id,at,player,playerOnRoad);
    if(!seen)continue;
    direct.add(id);
    const hostile=wandererById.get(id)?.routine==="pilhagem";
    const hunting=force.playerPursuit!=="none"||hostile;
    const needsWrite=!samePoint(force.knownPlayerPosition,player)||worldHours-force.lastSeenAt>=.2||
      (hunting&&force.playerPursuit!=="tracking");
    if(needsWrite)write(id,{...force,knownPlayerPosition:{...player},lastSeenAt:worldHours,
      searchRadius:0,playerPursuit:hunting?"tracking":force.playerPursuit,
      searchTargetPosition:{...player}});
  }

  // Relato de outra força: só passa adiante quando os grupos se encontram.
  // A testemunha carrega a hora real do avistamento, então boato velho não
  // recupera magicamente uma trilha nova.
  for(const [id,original] of Object.entries(forces)){
    if(direct.has(id)||original.status!=="active"||!["tracking","searching"].includes(original.playerPursuit))continue;
    const at=positions.get(id);if(!at)continue;
    let report:{point:Point;seenAt:number}|null=null;
    for(const [witnessId,witness] of Object.entries(forces)){
      if(witnessId===id||!witness.knownPlayerPosition||witness.lastSeenAt<=original.lastSeenAt+.05)continue;
      if(worldHours-witness.lastSeenAt>4)continue;
      const witnessAt=positions.get(witnessId);if(!witnessAt)continue;
      if(distance(at,witnessAt)<=520||witness.at===original.at){
        if(!report||witness.lastSeenAt>report.seenAt)report={point:witness.knownPlayerPosition,seenAt:witness.lastSeenAt};
      }
    }

    // Uma localidade denuncia quem passa por seus portões a perseguidores na
    // mesma região. O alcance curto representa o tempo da notícia viajar.
    if(!report){
      const place=allPois.find((poi)=>distance(player,poi)<=260);
      const forceRegion=regionAtPoint(at);
      if(place&&forceRegion===place.regionId&&distance(at,place)<=2400)
        report={point:{x:place.x,y:place.y},seenAt:worldHours};
    }
    if(report)write(id,{...original,knownPlayerPosition:{...report.point},lastSeenAt:report.seenAt,
      searchRadius:0,playerPursuit:"tracking",searchTargetPosition:{...report.point}});
  }

  // Sem contato, termina a ida até a última posição e começa uma espiral de
  // pontos ao redor dela. O raio cresce, a confiança cai e o limite é fixo.
  for(const [id,original] of Object.entries(forces)){
    if(direct.has(id)||original.status!=="active"||!["tracking","searching"].includes(original.playerPursuit))continue;
    const at=positions.get(id);if(!at||!original.knownPlayerPosition)continue;
    const since=Math.max(0,worldHours-original.lastSeenAt);
    if(since>=timeoutFor(id)){
      write(id,{...original,playerPursuit:"lost",searchTargetPosition:null,searchRadius:Math.min(SEARCH_MAX,original.searchRadius)});
      continue;
    }

    if(original.playerPursuit==="tracking"){
      const target=original.knownPlayerPosition;
      if(distance(at,target)<=ARRIVAL_EPSILON){
        const searching={...original,playerPursuit:"searching" as const,
          searchRadius:Math.min(SEARCH_MAX,SEARCH_START+since*SEARCH_GROWTH)};
        write(id,{...searching,searchTargetPosition:searchPoint(id,searching,worldHours,target)});
      }else if(!samePoint(original.searchTargetPosition,target))write(id,{...original,searchTargetPosition:{...target}});
      continue;
    }

    const radius=Math.min(SEARCH_MAX,SEARCH_START+since*SEARCH_GROWTH);
    const target=original.searchTargetPosition;
    const arrived=!target||distance(at,target)<=ARRIVAL_EPSILON;
    const nextTarget=arrived?searchPoint(id,{...original,searchRadius:radius},worldHours,target):target;
    if(radius!==original.searchRadius||!nextTarget||!samePoint(original.searchTargetPosition,nextTarget))
      write(id,{...original,searchRadius:radius,searchTargetPosition:nextTarget});
  }
  return forces;
}

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
/**
 * O que uma terra vale defendendo.
 *
 * Homem atrás de muralha rende mais do que homem em campo aberto, e a muralha
 * rende sozinha. Sem isso a conta ficava impossível: segurar uma hoste de
 * setenta exigiria trinta e três infantes parados num só senhorio, e nenhum
 * jogador pode pagar isso. Com a muralha contando, uma dúzia de soldados de
 * verdade segura — que é como cerco funcionava.
 */
export function defenceOf(wallDefense:number,garrison:TroopCount):number {
  return troopStrength(garrison)*2.2+wallDefense*1.2;
}

/** Um senhorio do jogador e o lugar de onde se marcha sobre ele. */
function playerTarget(s:GameState):{fiefId:string;poiId:string}|null {
  for(const fief of fiefs){
    if((s.fiefOwners[fief.id]??fief.ownerHouseId)!=="player")continue;
    const poi=allPois.find((p)=>p.regionId===fief.regionId&&p.routeNode);
    if(poi)return {fiefId:fief.id,poiId:poi.id};
  }
  return null;
}

/**
 * O cerco chegou à terra do jogador.
 *
 * A GUARNIÇÃO decide: homens deixados no senhorio contra a hoste que chegou.
 * Aguentando quase metade da força inimiga, o cerco é rompido e o sitiante
 * volta para casa menor. Abaixo disso a terra cai, e a guarnição cai com ela.
 */
function resolvePlayerSiege(s:GameState,force:WorldForceState,def:{name:string;houseId?:string}):{state:GameState;troops:TroopCount;news:ForceNews;repelled:boolean} {
  const target=playerTarget(s);
  if(!target)return {state:s,troops:force.troops,news:{kind:"fronteira",text:`${def.name} não encontrou terra sua para cercar.`},repelled:false};
  const fief=fiefs.find((f)=>f.id===target.fiefId)!;
  const estate=estateOf(s,fief.id);
  const defenders=defenceOf(wallDefence(fief.defense,estate),estate.garrison);
  const besiegers=troopStrength(force.troops);
  const repelled=defenders>=besiegers*.45;

  if(repelled){
    return {state:s,troops:removeShare(force.troops,.3),repelled:true,
      news:{kind:"fronteira",text:`A guarnição de ${fief.name} rompeu o cerco de ${def.name}. A terra continua sua.`}};
  }
  const estates={...(s.fiefEstates??{})};delete estates[fief.id];
  return {state:{...s,fiefEstates:estates,fiefOwners:{...s.fiefOwners,[fief.id]:def.houseId as never}},
    troops:removeShare(force.troops,.12),repelled:false,
    news:{kind:"fronteira",text:`${houseById.get(def.houseId as never)?.shortName} tomou ${fief.name}. ${defenders?"A guarnição não foi suficiente.":"Não havia guarnição nenhuma."}`}};
}

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
    const order=force.campaignOrder;
    const orderedFief=order?fiefs.find((f)=>f.id===order.fiefId):undefined;
    const enemyOwner=orderedFief?(state.fiefOwners[orderedFief.id]??orderedFief.ownerHouseId):null;
    const orderedWar=!!enemyOwner&&enemyOwner!=='player'&&state.wars.some((entry)=>(entry.a===def.houseId&&entry.b===enemyOwner)||(entry.b===def.houseId&&entry.a===enemyOwner));
    if(order&&orderedFief&&orderedWar&&day*24<=order.untilHour){
      const consumption=Math.max(1,Math.ceil(troopTotal(force.troops)/35));
      if(force.at===home){const supplied=provisionArmy(force,home,{...state,worldForces:forces},day,12);state=supplied.state;force=supplied.force;}
      force={...force,food:Math.max(0,force.food-consumption),objective:'siege',targetPoiId:order.targetPoiId,targetHouseId:enemyOwner,
        objectiveLabel:force.at===order.targetPoiId?`Pronta para apoiar seu cerco de ${orderedFief.name}`:`Marchando para apoiar seu cerco de ${orderedFief.name}`};
      if(force.food<=0){force={...force,campaignOrder:null,objective:'return',targetPoiId:home,targetHouseId:undefined,
        troops:removeShare(force.troops,.08),objectiveLabel:'Sem suprimentos; retornando sem apoiar o cerco'};}
      forces[id]=force;continue;
    }
    if(order)force={...force,campaignOrder:null};
    if(!war){
      const original=partyOf(def),missing=Math.max(0,troopTotal(original)-troopTotal(force.troops));
      force={...force,objective:"defend",targetPoiId:home,targetForceId:null,targetHouseId:undefined,siegeProgress:0,
        troops:missing?{...force.troops,milicianos:(force.troops.milicianos??0)+Math.min(4,missing)}:force.troops,
        objectiveLabel:`Defendendo ${houseById.get(def.houseId)?.shortName}`};
      const supplied=provisionArmy(force,home,{...state,worldForces:forces},day,5);state=supplied.state;force=supplied.force;
    }else{
      const enemy=war.a===def.houseId?war.b:war.a;
      // Guerra contra o JOGADOR: a hoste marcha sobre a terra dele. É isto
      // que transforma independência de título em ameaça — e que finalmente
      // dá função à guarnição deixada num senhorio.
      const playerFief=enemy==="player"?playerTarget(state):null;
      const target=enemy==="player"?playerFief?.poiId??null:houseById.get(enemy)?.capitalPoiId??null;
      const consumption=Math.max(1,Math.ceil(troopTotal(force.troops)/35));
      force={...force,food:Math.max(0,force.food-consumption),targetHouseId:enemy==="player"?undefined:enemy};
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
          if(enemy==="player"){
            const result=resolvePlayerSiege(state,force,def);
            state=result.state;news.push(result.news);
            force={...force,troops:result.troops,objective:"return",targetPoiId:home,siegeProgress:0,objectiveLabel:result.repelled?"Cerco rompido; retornando":"Retornando após a campanha"};
            forces[id]=force;continue;
          }
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
