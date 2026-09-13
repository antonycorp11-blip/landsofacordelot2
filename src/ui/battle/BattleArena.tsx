import { useEffect, useRef } from "react";
import { troops as troopTypes, type TroopCount, type TroopId } from "../../data/troops";
import { BATTLE_TERRAINS, type Battle } from "../../game/battle";

const W=320,H=144;
type Team="mine"|"theirs";

function visibleUnits(count:TroopCount,max=15):TroopId[]{
  const all:TroopId[]=[];
  for(const type of troopTypes)for(let i=0;i<(count[type.id]??0);i++)all.push(type.id);
  if(all.length<=max)return all;
  return Array.from({length:max},(_,i)=>all[Math.floor(i*all.length/max)]);
}

function pixel(ctx:CanvasRenderingContext2D,color:string,x:number,y:number,w:number,h:number){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}

function drawUnit(ctx:CanvasRenderingContext2D,id:TroopId,x:number,y:number,team:Team,flip=false){
  const body=team==="mine"?"#315f63":"#743f3a",metal=team==="mine"?"#d8c581":"#d0aa78",dark="#171c1b";
  if(id==="cavaleiros"){
    pixel(ctx,team==="mine"?"#54473a":"#3c302a",x-5,y+3,11,5);pixel(ctx,dark,x-5,y+8,2,3);pixel(ctx,dark,x+4,y+8,2,3);
    pixel(ctx,body,x-1,y-4,4,7);pixel(ctx,metal,x-1,y-7,4,3);pixel(ctx,metal,x+(flip?-5:4),y-3,5,1);return;
  }
  pixel(ctx,dark,x-2,y+5,1,4);pixel(ctx,dark,x+2,y+5,1,4);pixel(ctx,body,x-3,y-1,6,7);
  pixel(ctx,metal,x-2,y-5,4,4);pixel(ctx,dark,x-1,y-4,3,1);
  if(id==="arqueiros"){
    ctx.strokeStyle="#c59b55";ctx.lineWidth=1;ctx.beginPath();ctx.arc(x+(flip?-4:4),y,4,-Math.PI/2,Math.PI/2);ctx.stroke();
  }else if(id==="camponeses")pixel(ctx,"#aa8b55",x+(flip?-7:4),y-5,1,12);
  else {pixel(ctx,metal,x+(flip?-6:3),y,4,5);pixel(ctx,"#d8d0b4",x+(flip?3:-6),y-2,4,1);}
}

function drawTerrain(ctx:CanvasRenderingContext2D,battle:Battle){
  const rule=BATTLE_TERRAINS[battle.terrain]??BATTLE_TERRAINS.plain;
  pixel(ctx,"#1d3031",0,0,W,26);pixel(ctx,"#32494a",0,26,W,18);pixel(ctx,rule.ground,0,44,W,H-44);
  for(let i=0;i<64;i++){const x=(i*47+battle.id.length*13)%W,y=48+(i*29)%92;pixel(ctx,i%3?rule.dark:"#a28e54",x,y,1+(i%2),1);}
  if(battle.terrain==="hill")for(let i=0;i<4;i++)pixel(ctx,rule.dark,25+i*58,56+i%2*13,62,4);
  if(battle.terrain==="forest")for(let i=0;i<13;i++){const x=8+(i*71)%305,y=50+(i*37)%70;pixel(ctx,"#1e3628",x,y,7,14);pixel(ctx,"#27482e",x-4,y-7,15,11);}
  if(battle.terrain==="mountain")for(let i=0;i<7;i++){const x=8+i*50;ctx.fillStyle="#4c504e";ctx.beginPath();ctx.moveTo(x,50);ctx.lineTo(x+18,23+(i%2)*8);ctx.lineTo(x+38,50);ctx.fill();pixel(ctx,"#88877b",x+15,31+(i%2)*8,7,4);}
  if(battle.terrain==="marsh")for(let i=0;i<8;i++)pixel(ctx,"#33555a",15+i*41,70+(i%3)*22,25,4);
  if(battle.terrain==="coast"){pixel(ctx,"#3c6e72",0,114,W,30);for(let i=0;i<8;i++)pixel(ctx,"#79a69a",i*44,118+(i%2)*8,27,2);}
  if(battle.terrain==="river_crossing"){pixel(ctx,"#315b67",142,44,38,100);for(let y=48;y<144;y+=12)pixel(ctx,"#78a19a",145+(y%3),y,29,2);pixel(ctx,"#6c5940",154,44,13,100);}
  // A estrada une as duas formações e continua visível sob os soldados.
  pixel(ctx,"#897452",0,91,W,20);pixel(ctx,"#aa9365",0,96,W,2);
}

function drawFormation(ctx:CanvasRenderingContext2D,count:TroopCount,team:Team,lastOrder:Battle["lastOrder"]){
  const units=visibleUnits(count),mine=team==="mine";
  units.forEach((id,i)=>{
    const row=i%3,col=Math.floor(i/3);
    let x=(mine?72:248)+(mine?1:-1)*col*10,y=79+row*15;
    if(id==="arqueiros")x+=mine?-18:18;
    if(id==="cavaleiros"){x+=mine?-3:3;y=row===0?59:119;}
    if(team==="mine"&&lastOrder==="avancar")x+=13;
    if(team==="mine"&&lastOrder==="recuar")x-=11;
    if(team==="mine"&&lastOrder==="saraivada"&&id==="arqueiros")x+=13;
    if(team==="mine"&&lastOrder==="flanquear"&&id==="cavaleiros"){x+=22;y=i%2?55:122;}
    if(team==="mine"&&lastOrder==="reserva"&&(id==="arqueiros"||id==="cavaleiros"))x-=15;
    drawUnit(ctx,id,x,y,team,!mine);
  });
}

function drawFallen(ctx:CanvasRenderingContext2D,n:number,team:Team){
  for(let i=0;i<Math.min(4,n);i++){const x=(team==="mine"?132:188)+(team==="mine"?-i*6:i*6),y=93+(i%2)*9;pixel(ctx,team==="mine"?"#315f63":"#743f3a",x,y,7,2);pixel(ctx,"#211b19",x+(team==="mine"?6:-2),y,2,2);}
}

/** Canvas pequeno escalado com nearest-neighbour: pixels firmes e custo baixo no celular. */
export function BattleArena({battle}:{battle:Battle}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const ctx=ref.current?.getContext("2d");if(!ctx)return;ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);
    drawTerrain(ctx,battle);drawFormation(ctx,battle.mine,"mine",battle.lastOrder);drawFormation(ctx,battle.theirs,"theirs",battle.enemyLastOrder);
    drawFallen(ctx,battle.lastMyLosses??0,"mine");drawFallen(ctx,battle.lastTheirLosses??0,"theirs");
  },[battle]);
  const terrain=BATTLE_TERRAINS[battle.terrain]??BATTLE_TERRAINS.plain;
  return <figure className="battle-arena">
    <canvas ref={ref} width={W} height={H} role="img" aria-label={`Formações em ${terrain.name.toLowerCase()}`}/>
    <figcaption><b>{terrain.name}</b><span>{terrain.blurb}</span></figcaption>
  </figure>;
}
