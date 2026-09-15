/** Motor persistente do combate entre grupos. A interface apenas representa o que este arquivo resolve. */
import { mountedRatio, troopStrength, troopTotal, troops as troopTypes, type TroopCount, type TroopId } from "../data/troops";
import type { TerrainType } from "../world/types";
import { morale, partySpeed, partyStrength } from "./progression";
import { derivedInput } from "./experience";
import type { GameState } from "./store";
import type { WorldForceBattleSource } from "./worldForces";

export type Order = "avancar" | "segurar" | "saraivada" | "flanquear" | "reserva" | "recuar";
export type ParleyKind = "exigir" | "retirada";

export type Battle = {
  id: string;
  enemyName: string;
  terrain: TerrainType;
  round: number;
  mine: TroopCount;
  theirs: TroopCount;
  myLosses: number;
  theirLosses: number;
  myDead: number;
  myWounded: number;
  theirDead: number;
  theirWounded: number;
  myWoundedTroops: TroopCount;
  prisoners: TroopCount;
  myMorale: number;
  theirMorale: number;
  lastMyLosses: number;
  lastTheirLosses: number;
  lastOrder: Order | null;
  enemyLastOrder: Order | null;
  parleyRoll: number;
  parleyAttempted: boolean;
  surrendered: boolean;
  tribute: number;
  log: string[];
  result: "andamento" | "vitoria" | "derrota" | "retirada";
  loot: number;
  /** Preenchido quando o confronto nasceu de uma força visível no mapa. */
  worldForce?: WorldForceBattleSource;
  /** A guarnição combate atrás da muralha até a linha se romper. */
  siege?: { fiefId:string; defender:string; wallProtection:number; ramBuilt:boolean };
};

export const ORDERS: { id: Order; name: string; blurb: string }[] = [
  { id:"avancar", name:"Infantaria: avançar", blurb:"Toda a linha pressiona. Causa mais baixas e se expõe." },
  { id:"segurar", name:"Infantaria: segurar", blurb:"Escudos firmes. Protege homens e recupera moral." },
  { id:"saraivada", name:"Arqueiros: saraivada", blurb:"Flechas antes do contato. Depende de arqueiros e campo de tiro." },
  { id:"flanquear", name:"Cavalaria: flanquear", blurb:"Cavaleiros atacam o lado. O terreno pode decidir a manobra." },
  { id:"reserva", name:"Manter reserva", blurb:"Poupa arqueiros e cavalaria, fecha brechas e recompõe a linha." },
  { id:"recuar", name:"Romper contato", blurb:"Tenta sair à força. Velocidade e logística decidem." },
];

export type TerrainRule = {
  name: string;
  blurb: string;
  defense: number;
  archers: number;
  cavalry: number;
  retreat: number;
  ground: string;
  dark: string;
};

export const BATTLE_TERRAINS: Record<TerrainType,TerrainRule> = {
  plain:{name:"Campo aberto",blurb:"Espaço para cavalaria e linha larga.",defense:1,archers:1,cavalry:1.18,retreat:.07,ground:"#7f8649",dark:"#4c5835"},
  hill:{name:"Colina",blurb:"A encosta favorece quem segura posição e dá alcance aos arqueiros.",defense:1.16,archers:1.16,cavalry:.88,retreat:-.03,ground:"#77734a",dark:"#4d4934"},
  forest:{name:"Mata fechada",blurb:"Troncos protegem a linha e quebram a carga montada.",defense:1.12,archers:.82,cavalry:.62,retreat:-.07,ground:"#435d3c",dark:"#263c2d"},
  mountain:{name:"Passo de montanha",blurb:"Pouco espaço, pedra solta e enorme vantagem defensiva.",defense:1.28,archers:.9,cavalry:.52,retreat:-.12,ground:"#686a62",dark:"#3d4140"},
  marsh:{name:"Terreno alagado",blurb:"Lama prende homens, cavalos e qualquer retirada.",defense:1.08,archers:.9,cavalry:.48,retreat:-.16,ground:"#526853",dark:"#304b45"},
  coast:{name:"Costa",blurb:"Areia e vento reduzem precisão; o terreno continua aberto.",defense:1.02,archers:.86,cavalry:.98,retreat:.02,ground:"#a58c58",dark:"#6e633f"},
  river_crossing:{name:"Travessia",blurb:"A passagem estreita protege a defesa e pune quem força avanço.",defense:1.35,archers:1.12,cavalry:.55,retreat:-.18,ground:"#667d5c",dark:"#31525a"},
};

const ATTACK: Record<Order,number>={avancar:1.28,segurar:.82,saraivada:1,flanquear:1.42,reserva:.66,recuar:.32};
const DEFEND: Record<Order,number>={avancar:.8,segurar:1.42,saraivada:.94,flanquear:.7,reserva:1.22,recuar:.58};

export function startBattle(s:GameState,enemy:TroopCount,enemyName:string,terrain:TerrainType="plain",worldForce?:WorldForceBattleSource):Battle {
  return {
    id:`batalha-${Date.now()}`,enemyName,terrain,round:1,mine:{...s.troops},theirs:{...enemy},
    myLosses:0,theirLosses:0,myDead:0,myWounded:0,theirDead:0,theirWounded:0,
    myWoundedTroops:{},prisoners:{},myMorale:morale(derivedInput(s)),theirMorale:72,
    lastMyLosses:0,lastTheirLosses:0,lastOrder:null,enemyLastOrder:null,
    parleyRoll:Math.random(),parleyAttempted:false,surrendered:false,tribute:0,
    log:[],result:"andamento",loot:0,worldForce,
  };
}

export function canFlank(troops:TroopCount):boolean { return mountedRatio(troops)>=.12; }
export function orderAvailable(order:Order,troops:TroopCount):boolean {
  if(order==="saraivada") return (troops.arqueiros??0)>0;
  if(order==="flanquear") return (troops.cavaleiros??0)>0;
  return true;
}

function archerRatio(troops:TroopCount){return (troops.arqueiros??0)/Math.max(1,troopTotal(troops));}
function orderUnitFactor(troops:TroopCount,order:Order,terrain:TerrainRule):number {
  if(order==="saraivada") return (troops.arqueiros??0)>0 ? (.72+archerRatio(troops)*2.1)*terrain.archers : .32;
  if(order==="flanquear") return canFlank(troops) ? (1+mountedRatio(troops)*1.2)*terrain.cavalry : .48*terrain.cavalry;
  return 1;
}

export function retreatChance(s:GameState,battle?:Battle):number {
  const input=derivedInput(s);
  const terrain=battle ? BATTLE_TERRAINS[battle.terrain]?.retreat??0 : 0;
  return Math.max(.18,Math.min(.9,.4+(partySpeed(input)-1)*.9+(s.skills.logistica_militar??0)/300+terrain));
}

export function orderEffects(s:GameState,battle:Battle,order:Order) {
  const terrain=BATTLE_TERRAINS[battle.terrain]??BATTLE_TERRAINS.plain;
  const available=orderAvailable(order,battle.mine);
  const wall=battle.siege?.wallProtection??1;
  const attack=ATTACK[order]*orderUnitFactor(battle.mine,order,terrain)*(available?1:.45)/wall;
  const exposure=(1+(wall-1)*.32)/(DEFEND[order]*terrain.defense);
  return {
    attackPercent:Math.round((attack-1)*100),exposurePercent:Math.round((exposure-1)*100),
    retreatPercent:order==="recuar"?Math.round(retreatChance(s,battle)*100):null,
    failedFlank:order==="flanquear"&&!canFlank(battle.mine),available,
    terrainNote:order==="flanquear"?Math.round((terrain.cavalry-1)*100):order==="saraivada"?Math.round((terrain.archers-1)*100):Math.round((terrain.defense-1)*100),
  };
}

type CasualtyResult={troops:TroopCount;removed:number;dead:number;wounded:number;woundedTroops:TroopCount};
function takeCasualties(troops:TroopCount,count:number,woundRate:number,woundRoll=.5):CasualtyResult {
  const next:TroopCount={...troops};
  let left=Math.max(0,Math.round(count)),removed=0;
  const removedTroops:TroopCount={};
  for(const t of [...troopTypes].sort((a,b)=>a.tier-b.tier)){
    if(left<=0) break;
    const have=next[t.id]??0,take=Math.min(have,left);
    if(take>0){next[t.id]=have-take;if(next[t.id]===0)delete next[t.id as TroopId];removedTroops[t.id]=take;left-=take;removed+=take;}
  }
  const expected=removed*woundRate;
  let woundedLeft=Math.min(removed,Math.floor(expected)+(woundRoll<expected-Math.floor(expected)?1:0));
  const woundedTroops:TroopCount={};
  for(const t of troopTypes){const lost=removedTroops[t.id]??0;const n=Math.min(lost,woundedLeft);if(n)woundedTroops[t.id]=n;woundedLeft-=n;}
  const wounded=Object.values(woundedTroops).reduce((sum,n)=>sum+(n??0),0);
  return {troops:next,removed,dead:removed-wounded,wounded,woundedTroops};
}

function casualtyCount(pressure:number,roll:number,round:number):number {
  const tired=pressure*(1+Math.max(0,round-3)*.16);
  const whole=Math.floor(tired),fraction=tired-whole;
  return whole+(roll<fraction?1:0);
}

export function addTroopCounts(a:TroopCount,b:TroopCount):TroopCount {
  const next:TroopCount={...a};for(const t of troopTypes){const n=(next[t.id]??0)+(b[t.id]??0);if(n)next[t.id]=n;}return next;
}

function portionOf(troops:TroopCount,share:number):TroopCount {
  const result:TroopCount={};
  for(const t of troopTypes){const n=Math.floor((troops[t.id]??0)*share);if(n)result[t.id]=n;}
  if(troopTotal(result)===0&&troopTotal(troops)>0){const first=troopTypes.find(t=>(troops[t.id]??0)>0);if(first)result[first.id]=1;}
  return result;
}

function enemyOrder(b:Battle):Order {
  const terrain=BATTLE_TERRAINS[b.terrain]??BATTLE_TERRAINS.plain;
  if(b.theirMorale<38)return "segurar";
  if(archerRatio(b.theirs)>.22&&b.round%3===1)return "saraivada";
  if(canFlank(b.theirs)&&terrain.cavalry>.7&&b.round%3===0)return "flanquear";
  if(troopStrength(b.theirs)>troopStrength(b.mine)*1.25)return "avancar";
  return b.round%2===0?"avancar":"segurar";
}

export function playRound(s:GameState,battle:Battle,order:Order,roll:number):Battle {
  // Completa batalhas que tenham sido gravadas pela versão anterior no meio de uma rodada.
  const b:Battle={...battle,terrain:battle.terrain??"plain",log:[],
    myDead:battle.myDead??0,myWounded:battle.myWounded??0,theirDead:battle.theirDead??0,theirWounded:battle.theirWounded??0,
    myWoundedTroops:{...(battle.myWoundedTroops??{})},prisoners:{...(battle.prisoners??{})},
    parleyRoll:battle.parleyRoll??Math.random(),parleyAttempted:battle.parleyAttempted??false,surrendered:battle.surrendered??false,tribute:battle.tribute??0,
    lastOrder:order,lastMyLosses:0,lastTheirLosses:0};
  const input=derivedInput(s),terrain=BATTLE_TERRAINS[b.terrain]??BATTLE_TERRAINS.plain;
  const skill=1+(s.skills.tatica??0)/260+s.attributes.command*.018;
  if(order==="recuar"){
    const chance=retreatChance(s,b);
    if(roll<chance){
      const parting=takeCasualties(b.mine,Math.max(1,Math.round(troopTotal(b.mine)*.08)),.38,roll);
      b.mine=parting.troops;b.myLosses+=parting.removed;b.myDead+=parting.dead;b.myWounded+=parting.wounded;
      b.myWoundedTroops=addTroopCounts(b.myWoundedTroops,parting.woundedTroops);b.lastMyLosses=parting.removed;b.result="retirada";
      b.log.push(`A linha se desprende. ${parting.dead} morreram e ${parting.wounded} saíram feridos.`);return b;
    }
    b.log.push("A retirada não se abre: eles vêm em cima antes da virada.");
  }

  const theirOrder=enemyOrder(b);b.enemyLastOrder=theirOrder;
  const myFactor=orderUnitFactor(b.mine,order,terrain)*(orderAvailable(order,b.mine)?1:.42);
  const theirFactor=orderUnitFactor(b.theirs,theirOrder,terrain);
  const myAtk=partyStrength({...input,troops:b.mine})*ATTACK[order]*myFactor*skill*(.6+b.myMorale/250);
  const theirAtk=troopStrength(b.theirs)*ATTACK[theirOrder]*theirFactor*(.6+b.theirMorale/250);
  const wall=b.siege?.wallProtection??1;
  const theirTaken=(myAtk/Math.max(.4,DEFEND[theirOrder]))*.09*(.8+roll*.4)/wall;
  const myTaken=(theirAtk/Math.max(.4,DEFEND[order]*terrain.defense))*.09*(.8+(1-roll)*.4)*(1+(wall-1)*.32);
  const woundRate=Math.min(.72,.34+s.attributes.stewardship*.025+(s.skills.logistica_militar??0)/500);
  const them=takeCasualties(b.theirs,casualtyCount(theirTaken,roll,b.round),.28,(1-roll+b.round*.19)%1);
  const me=takeCasualties(b.mine,casualtyCount(myTaken,1-roll,b.round),woundRate,(roll+b.round*.27)%1);
  b.theirs=them.troops;b.mine=me.troops;b.theirLosses+=them.removed;b.myLosses+=me.removed;
  b.theirDead+=them.dead;b.theirWounded+=them.wounded;b.myDead+=me.dead;b.myWounded+=me.wounded;
  b.myWoundedTroops=addTroopCounts(b.myWoundedTroops,me.woundedTroops);b.lastMyLosses=me.removed;b.lastTheirLosses=them.removed;
  const theirBefore=troopTotal(them.troops)+them.removed,myBefore=troopTotal(me.troops)+me.removed;
  b.theirMorale=Math.max(0,Math.round(b.theirMorale-(them.removed/Math.max(1,theirBefore))*150));
  b.myMorale=Math.max(0,Math.round(b.myMorale-(me.removed/Math.max(1,myBefore))*130));
  if(order==="segurar")b.myMorale=Math.min(100,b.myMorale+5);
  if(order==="reserva")b.myMorale=Math.min(100,b.myMorale+8);
  if(b.round>7){b.myMorale=Math.max(0,b.myMorale-2);b.theirMorale=Math.max(0,b.theirMorale-2);}
  const orderName=ORDERS.find(o=>o.id===order)!.name;
  b.log.push(`${orderName}. ${them.removed} deles e ${me.removed} dos seus ficam fora de combate.`);

  if(troopTotal(b.theirs)===0||b.theirMorale<=0){
    b.result="vitoria";b.loot=Math.round(20+b.theirLosses*11);
    if(troopTotal(b.theirs)>0)b.prisoners=portionOf(b.theirs,.55);
    b.log.push(troopTotal(b.theirs)===0?"A formação inimiga deixa de existir.":"A linha inimiga quebra; parte corre e parte joga as armas no chão.");
  }else if(troopTotal(b.mine)===0||b.myMorale<=0){b.result="derrota";b.log.push("Sua linha quebra e nenhuma ordem consegue reuni-la.");}
  else b.round+=1;
  return b;
}

export function canDemandSurrender(b:Battle):boolean {
  return b.theirMorale<=58||troopStrength(b.mine)>=troopStrength(b.theirs)*1.3;
}

export function parleyChance(s:GameState,b:Battle,kind:ParleyKind):number {
  const persuasion=(s.skills.persuasao??0)/300+s.attributes.diplomacy*.025;
  if(kind==="exigir"){
    const force=troopStrength(b.mine)/Math.max(1,troopStrength(b.theirs));
    return Math.max(.08,Math.min(.92,.08+persuasion+(1-b.theirMorale/100)*.48+(force-1)*.15));
  }
  const disadvantage=Math.max(0,troopStrength(b.theirs)/Math.max(1,troopStrength(b.mine))-1);
  return Math.max(.12,Math.min(.88,.24+persuasion+b.myMorale/500-disadvantage*.12));
}

export function resolveParley(s:GameState,battle:Battle,kind:ParleyKind):Battle {
  if(battle.parleyAttempted||battle.result!=="andamento")return battle;
  const b:Battle={...battle,log:[],parleyAttempted:true};
  if((battle.parleyRoll??Math.random())<parleyChance(s,battle,kind)){
    if(kind==="exigir"){
      b.result="vitoria";b.surrendered=true;b.prisoners=portionOf(b.theirs,.75);b.loot=Math.round(10+b.theirLosses*7);
      b.log.push(`Eles olham a própria linha e aceitam. ${troopTotal(b.prisoners)} entregam as armas; o restante se dispersa.`);
    }else{
      b.result="retirada";b.surrendered=true;b.tribute=Math.min(s.gold,Math.round(8+troopStrength(b.theirs)*2));
      b.log.push(`Eles aceitam abrir passagem por ${b.tribute} moedas. Os feridos e a carga seguem com você.`);
    }
    return b;
  }
  b.myMorale=Math.max(0,b.myMorale-6);b.theirMorale=Math.min(100,b.theirMorale+5);
  b.log.push(kind==="exigir"?"Eles riem da exigência e voltam à linha mais firmes.":"Eles recusam a passagem. Seus homens voltam da conversa menos certos do que foram.");
  return b;
}

export function prisonerRansom(prisoners:TroopCount):number {
  return Math.round(troopTypes.reduce((sum,t)=>sum+(prisoners[t.id]??0)*(8+t.strength*9),0));
}
