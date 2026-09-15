import { useState } from "react";
import { houses, houseById } from "../../data/houses";
import { marriageCandidates } from "../../data/dynasty";
import { crestUrl } from "../../data/houseAssets";
import { troopTotal } from "../../data/troops";
import { FacePortrait } from "../../render/portraits/FacePortrait";
import { faceOf } from "../../render/portraits/characterFace";
import { BLOCK_TEXT, INDEPENDENCE_FIEFS, INDEPENDENCE_INFLUENCE, INDEPENDENCE_TROOPS, allegianceLabel, breakOath, declareIndependence, enemiesOf, independenceBlocker, nextGrantAt, playerFiefCount, swearBlocker, swearTo, vassalStipend } from "../../game/allegiance";
import { allianceBlocker, allianceChance, currentDay, marriageBlocker, marriageChance, marriageOf, pactUntil, proposeAlliance, proposeMarriage } from "../../game/diplomacy";
import { belligerentName } from "../../game/worldSim";
import { useGame } from "../../game/store";
import type { HouseId } from "../../world/types";

export function CourtPanel() {
  const game=useGame(), a=game.allegiance;
  const [view,setView]=useState<"juramento"|"diplomacia">("juramento");
  const [name,setName]=useState("Casa Arven"), [naming,setNaming]=useState(false);
  const [candidateId,setCandidateId]=useState(marriageCandidates[0].id);
  const [houseId,setHouseId]=useState<HouseId>("house_silvarden");
  const [note,setNote]=useState("");
  const fiefCount=playerFiefCount(game), soldiers=troopTotal(game.troops), indep=independenceBlocker(game);
  const candidate=marriageCandidates.find(c=>c.id===candidateId)!;
  const spouse=marriageOf(game), marriageStop=marriageBlocker(game,candidateId), pactStop=allianceBlocker(game,houseId);
  const enemies=enemiesOf(game);

  return <div className="court court-reworked">
    <div className="court-top">
      <div className="court-status"><span className="panel-title">Sua posição</span><b>{allegianceLabel(a)}</b>
        <span className="court-line">{a.kind==="jurado" ? `Soldo +${vassalStipend(a)}/dia · serviço ${a.service} · próxima terra ${nextGrantAt(a)??"—"}` : a.kind==="independente" ? `Soberano · ${fiefCount} senhorios` : "Livre · sem soldo ou protetor"}</span>
        {!!enemies.length&&<span className="court-line war">Guerra: {enemies.map(e=>belligerentName(game,e)).join(" · ")}</span>}
      </div>
      <div className="court-switch" role="tablist" aria-label="Mesa da Corte"><button role="tab" aria-selected={view==="juramento"} onClick={()=>setView("juramento")}>Juramento</button><button role="tab" aria-selected={view==="diplomacia"} onClick={()=>setView("diplomacia")}>Diplomacia</button></div>
    </div>

    {view==="juramento"&&<div className="court-paths">
      <div className="court-block"><span className="panel-title">{a.kind==="jurado"?"Seu senhor":"Jurar a uma Casa"}</span>
        {a.kind==="jurado"?<><p className="court-note">Serviço rende terra. As guerras da Casa ameaçam sua guarnição.</p><button className="btn danger court-wide" onClick={breakOath}>Romper · −45 relação · −15 influência</button></>
        :a.kind==="independente"?<p className="court-note">Sua Casa negocia tratados próprios.</p>
        :<><p className="court-note">Soldo e concessões por serviço. Requer relação 25.</p><div className="court-houses">{houses.map(h=>{const block=swearBlocker(game,h.id), crest=crestUrl(h.crestAssetKey);return <button className="court-house" key={h.id} disabled={block!=="none"} title={block==="none"?undefined:BLOCK_TEXT[block]} onClick={()=>swearTo(h.id)}>{crest&&<img src={crest} alt=""/>}<span className="court-house-body"><b>{h.shortName}</b><em>Relação {game.houseRelations[h.id]??0}</em></span></button>})}</div></>}
      </div>
      <div className="court-block"><span className="panel-title">Declarar-se soberano</span>
        {a.kind==="independente"?<p className="court-note">Você defende seus senhorios sem protetor e pode firmar alianças.</p>:<><p className="court-note">Sem soldo nem protetor. Sua bandeira pode ser atacada.</p>
          <div className="court-reqs"><Req ok={fiefCount>=INDEPENDENCE_FIEFS} label={`${fiefCount}/${INDEPENDENCE_FIEFS} senhorios`}/><Req ok={game.influence>=INDEPENDENCE_INFLUENCE} label={`${Math.round(game.influence)}/${INDEPENDENCE_INFLUENCE} influência`}/><Req ok={soldiers>=INDEPENDENCE_TROOPS} label={`${soldiers}/${INDEPENDENCE_TROOPS} homens`}/></div>
          {naming?<div className="court-name"><input value={name} maxLength={28} onChange={e=>setName(e.target.value)} aria-label="Nome da sua Casa"/><button className="btn primary" onClick={()=>declareIndependence(name)}>Declarar</button></div>
            :<button className="btn court-wide" disabled={indep!=="none"} title={indep==="none"?undefined:BLOCK_TEXT[indep]} onClick={()=>setNaming(true)}>{indep==="none"?"Nomear sua Casa":BLOCK_TEXT[indep]}</button>}
          {a.kind==="jurado"&&indep==="none"&&<p className="court-note war">Trair {houseById.get(a.houseId)?.shortName} declara guerra imediata.</p>}</>}
      </div>
    </div>}

    {view==="diplomacia"&&<div className="court-paths court-political">
      <div className="court-block"><span className="panel-title">Casamento de Casa</span>
        {spouse?<p className="court-note">União com {spouse.name}: +3 ouro e +0,2 influência/dia. Tratado com {houseById.get(spouse.houseId)?.shortName} até o dia {pactUntil(game,spouse.houseId)}.</p>
        :<><div className="court-candidates">{marriageCandidates.map(c=><button key={c.id} aria-pressed={candidateId===c.id} onClick={()=>{setCandidateId(c.id);setNote("")}}><FacePortrait {...faceOf(c)} size={26}/><span>{c.name.replace(/^Lady /,"")}</span></button>)}</div>
          <p className="court-note court-person">{candidate.description} · chance {marriageChance(game,candidate.id)}%</p>
          <button className="btn court-wide" disabled={!!marriageStop} title={marriageStop??undefined} onClick={()=>{const r=proposeMarriage(candidate.id);if(r)setNote(r.success?`${candidate.name} aceitou. Tratado firmado por 30 dias.`:"Família recusou. −4 influência, −5 relação. Nova proposta em sete dias.")}}>Propor · 150 ouro · 15 influência</button>
          {marriageStop&&<p className="court-note">{marriageStop}</p>}</>}
      </div>
      <div className="court-block"><span className="panel-title">Tratado entre Casas</span>
        <div className="court-houses court-treaties">{houses.map(h=>{const crest=crestUrl(h.crestAssetKey), until=pactUntil(game,h.id);return <button key={h.id} className="court-house" aria-pressed={houseId===h.id} onClick={()=>{setHouseId(h.id);setNote("")}}>{crest&&<img src={crest} alt=""/>}<span className="court-house-body"><b>{h.shortName}</b><em>{until>=currentDay(game)?`Pacto até ${until}`:`Relação ${game.houseRelations[h.id]??0}`}</em></span></button>})}</div>
        <p className="court-note">{houseById.get(houseId)?.shortName}: chance {allianceChance(game,houseId)}%. Por 24 dias, esta Casa não declara guerra a você.</p>
        <button className="btn court-wide" disabled={!!pactStop} title={pactStop??undefined} onClick={()=>{const r=proposeAlliance(houseId);if(r)setNote(r.success?`Tratado firmado até o dia ${pactUntil(game,houseId)}.`:"Recusaram. −4 influência, −4 relação. Novo emissário em cinco dias.")}}>Enviar emissário · 100 ouro · 12 influência</button>
        {pactStop&&<p className="court-note">{pactStop}</p>}
      </div>
      {note&&<p className="court-outcome" role="status">{note}</p>}
    </div>}
  </div>;
}
function Req({ok,label}:{ok:boolean;label:string}){return <span className={`court-req ${ok?"ok":""}`}>{ok?"✓":"·"} {label}</span>}
