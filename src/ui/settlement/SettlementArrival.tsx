import { useEffect } from "react";
import { characterById, charactersAt } from "../../data/characters";
import type { Character } from "../../data/characters";
import type { Holding } from "../../data/holdings";
import { houseById } from "../../data/houses";
import { faceKindOf, notableAt } from "../../data/notables";
import { FacePortrait } from "../../render/portraits/FacePortrait";
import type { PointOfInterest } from "../../world/types";
import { regionById } from "../../world/valdoria";
import { ExpressionPortrait } from "../portrait/ExpressionPortrait";
import { useTyped, type TypedLine } from "../cinematic/useTyped";
import { arrivalLines } from "./settlementArrivalText";
import "../cinematic/cinematic.css";

function fade(indexFromEnd:number):number {
  return [1,.58,.34,.2][indexFromEnd]??.12;
}

function ArrivalThread({lines}:{lines:TypedLine[]}) {
  return <div className="cine-thread">
    {lines.map((line,index)=><p className="seen" key={index} style={{opacity:fade(lines.length-1-index)}}>
      <span>{line.text}{!line.done&&<i className="cine-caret"/>}</span>
    </p>)}
  </div>;
}

function characterFace(character:Character,accent:string|undefined) {
  const female=/\b(Lady|Senhora|Arcebispa|Mestra|Capitã)\b/i.test(`${character.name} ${character.title}`);
  return <FacePortrait seed={character.id} female={female} age={.48} accent={accent} kind={faceKindOf(character.primaryClass)} size={320} className="cine-bust-art"/>;
}

export function SettlementArrival({
  poi,holding,prosperity,canMarket,canRecruit,canDeliver,revealed,
  onTalk,onMarket,onRecruit,onInfo,onDeliver,onLeave,
}:{
  poi:PointOfInterest;holding:Holding;prosperity:number;
  canMarket:boolean;canRecruit:boolean;canDeliver:boolean;revealed:boolean;
  onTalk:()=>void;onMarket:()=>void;onRecruit:()=>void;onInfo:()=>void;onDeliver:()=>void;onLeave:()=>void;
}) {
  const residents=charactersAt(poi.id);
  const localLord=holding.localLordId?characterById.get(holding.localLordId):undefined;
  const present=localLord&&!residents.some((person)=>person.id===localLord.id)?[...residents,localLord]:residents;
  const notable=notableAt(poi.id,holding.kind);
  const speaker=present[0];
  const house=houseById.get(holding.ownerHouseId);
  const region=regionById.get(poi.regionId);
  const lines=arrivalLines(poi,holding,prosperity,present);
  const typed=useTyped(lines,`${poi.id}:${Math.round(prosperity/10)}`);
  // Ao voltar do mercado ou de uma conversa, a chegada já foi vista.
  useEffect(()=>{if(revealed&&!typed.done)typed.skip();},[revealed,typed.done]);
  const actions=[
    ...(canDeliver?[{id:"deliver",label:"Entregar o encargo",hint:"Você chegou ao destino combinado",act:onDeliver}]:[]),
    {id:"talk",label:"Procurar quem manda",act:onTalk},
    ...(canMarket?[{id:"market",label:"Ir ao mercado",act:onMarket}]:[]),
    ...(canRecruit?[{id:"recruit",label:"Ver quem quer alistar-se",act:onRecruit}]:[]),
    {id:"info",label:"Observar defesas e recursos",act:onInfo},
    {id:"leave",label:"Seguir viagem",act:onLeave},
  ];

  return <div className="cine cine-arrival" role="dialog" aria-modal="true" aria-label={`Chegada a ${poi.name}`}
    style={{["--house" as string]:house?.color}} onClick={()=>{if(!typed.done)typed.skip();}}>
    <div className="cine-frame">
      <div className="cine-stage">
        <div className="cine-bust">
          {speaker?.portraitAssetKey
            ?<ExpressionPortrait portraitKey={speaker.portraitAssetKey} expression="attentive" className="cine-bust-art"/>
            :speaker?characterFace(speaker,house?.color)
            :<FacePortrait seed={notable.id} female={notable.female} age={notable.age} accent={house?.color}
              kind={faceKindOf(notable.career)} size={320} className="cine-bust-art"/>}
        </div>
        <div className="cine-name">
          <b>{speaker?.name??notable.name}</b>
          <em>{speaker?.title??notable.role}</em>
        </div>
      </div>

      <div className="cine-side">
        <div className="cine-where">{poi.name}<span className="cine-dot">·</span>{region?.name}<span className="cine-dot">·</span>{house?.shortName}</div>
        <ArrivalThread lines={typed.shown}/>
        <div className={`cine-choices ${typed.done?"ready":"waiting"}`}>
          {actions.map((action,index)=><button className={`cine-choice ${action.id==="leave"?"continue":""}`} key={action.id}
            tabIndex={typed.done?0:-1} onClick={(event)=>{event.stopPropagation();action.act();}}>
            <span className="cine-number">{index+1}</span>
            <span className="cine-label">{action.label}{action.hint&&<em>{action.hint}</em>}</span>
          </button>)}
        </div>
      </div>
    </div>
    <button className="cine-escape" onClick={(event)=>{event.stopPropagation();onLeave();}} aria-label="Seguir viagem">×</button>
  </div>;
}
