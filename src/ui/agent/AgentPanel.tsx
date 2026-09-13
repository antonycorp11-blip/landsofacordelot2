import { useEffect, useState, type RefObject } from "react";
import { troops as troopTypes, troopTotal } from "../../data/troops";
import { readForce, strengthWord } from "../../game/estimate";
import { aggressionCost } from "../../game/worldForces";
import { tutorialFlag } from "../../game/adventure";
import { useGame } from "../../game/store";
import type { WandererRuntime } from "../../travel/useWanderers";
import type { Point } from "../../world/types";
import "./agent.css";

export const FORCE_INTERCEPT_DISTANCE = 250;

const RISK_LABEL: Record<string, string> = { baixo:"Baixo", moderado:"Moderado", alto:"Alto", temerário:"Temerário" };
const ROUTINE_KIND: Record<string, string> = {
  patrulha:"Patrulha", comércio:"Caravana", correio:"Mensageiro",
  peregrinação:"Peregrinos", pilhagem:"Bando armado", cortejo:"Cortejo",
};
const APPROACH: Record<string,string> = {
  pilhagem:"Os batedores respondem com ameaças. Eles só vão ceder pela força ou numa negociação durante a batalha.",
  patrulha:"A patrulha confirma a situação da estrada. Atacá-la fará o poder local tratar você como agressor.",
  comércio:"O mestre da caravana fala de preços, escoltas e dos perigos adiante. Manter esta rota aberta ajuda os mercados.",
  correio:"O mensageiro não pode parar por muito tempo. Ferir um correio custa palavra e influência.",
  peregrinação:"Os peregrinos pedem passagem e contam rumores do caminho. Atacá-los mancha a sua reputação.",
  cortejo:"A guarda exige que você declare intenção. Um ataque terá peso político imediato.",
};

type Props = {
  agent: WandererRuntime;
  playerPositionRef: RefObject<Point>;
  pursuing: boolean;
  onPursue: () => void;
  onAttack: () => void;
  onClose: () => void;
};

export function AgentPanel({agent,playerPositionRef,pursuing,onPursue,onAttack,onClose}:Props) {
  const game=useGame();
  const {wanderer,troops}=agent;
  const measure=()=>{
    const agentAt=agent.positionRef.current,playerAt=playerPositionRef.current;
    return agentAt&&playerAt?Math.hypot(agentAt.x-playerAt.x,agentAt.y-playerAt.y):Infinity;
  };
  const [distance,setDistance]=useState(measure);
  const [conversation,setConversation]=useState(false);
  const reading=readForce(troops);
  const hostile=wanderer.routine==="pilhagem";
  const near=distance<=FORCE_INTERCEPT_DISTANCE;
  const own=troopTotal(game.troops);
  const influenceCost=aggressionCost(wanderer.routine);

  useEffect(()=>{ tutorialFlag("agentInspected"); },[]);
  useEffect(()=>{
    const timer=window.setInterval(()=>setDistance(measure()),300);
    return()=>window.clearInterval(timer);
  },[agent,playerPositionRef]);

  return <aside className={`agent-panel ${hostile?"hostile":""}`}>
    <header className="agent-head">
      <div><h2>{wanderer.name}</h2><div className="agent-sub">{ROUTINE_KIND[wanderer.routine]??wanderer.routine} · {near?"ao alcance":"na estrada"}</div></div>
      <button className="sheet-close" onClick={onClose} aria-label="Fechar">×</button>
    </header>
    <div className="agent-body">
      <div className="pair"><span>Homens</span><b>{reading.label}</b></div>
      <div className="pair"><span>Força estimada</span><b>{reading.confidence==="vago"?"Incerta":strengthWord(troops)}</b></div>
      <div className="pair"><span>Comparação</span><b>{reading.verdict}</b></div>
      <div className="pair"><span>Risco</span><b className={`risk ${reading.risk}`}>{RISK_LABEL[reading.risk]}</b></div>
      <div className="pair"><span>Situação</span><b>{pursuing?"Sendo perseguido":near?"Interceptado":"Fora de alcance"}</b></div>

      {reading.confidence==="preciso"&&<div className="agent-breakdown">{troopTypes.map((troop)=>{
        const amount=troops[troop.id]??0;
        return amount?<div className="troop-row" key={troop.id}><span className="troop-n">{amount}</span><span>{amount===1?troop.singular:troop.name}</span></div>:null;
      })}</div>}
      {reading.confidence!=="preciso"&&<p className="agent-hint">Tática mais alta revela o número exato e a composição.</p>}
      {influenceCost>0&&<p className="agent-consequence"><b>Consequência do ataque:</b> −{influenceCost} influência e menos segurança regional.</p>}
      {hostile&&<p className="agent-opportunity"><b>Se vencer:</b> despojos, prisioneiros, +3 influência, +2 comida e estradas mais seguras.</p>}
      {conversation&&<p className="agent-dialogue">{APPROACH[wanderer.routine]}</p>}
    </div>
    <div className="agent-actions">
      <button className="btn" disabled={!near} onClick={()=>setConversation(true)} title={near?"Conversar com o grupo":"Primeiro intercepte o grupo"}>Abordar</button>
      <button className="btn" onClick={onPursue}>{pursuing?"Recalcular rota":"Perseguir"}</button>
      <button className="btn danger" disabled={!near||own===0} onClick={onAttack} title={own===0?"Recrute tropas antes de atacar":near?"Entrar em combate":"Primeiro intercepte o grupo"}>Atacar</button>
    </div>
  </aside>;
}
