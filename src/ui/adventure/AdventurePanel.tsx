import { useEffect, useRef } from 'react';
import { ATTRIBUTE_LABEL, heroById } from '../../data/heroes';
import { heroPortraitUrl } from '../../data/heroAssets';
import { skillById } from '../../data/skills';
import { poiById } from '../../world/valdoria';
import { formatDuration } from '../../world/time';
import { useGame } from '../../game/store';
import { CAREER_LABEL } from '../../game/careers';
import { contractsAt } from '../../game/contracts';
import { isPresent, locationId } from '../../game/presence';
import { withReward, type Reward } from '../../game/experience';
import { acceptContract, abandonContract, canRecruitCompanion, completeContract, dismissNotice, recruitCompanion, remainingContractHours, resolveRoadEvent, rewardSummary, tutorialFlag } from '../../game/adventure';
import { choiceChance, roadEventById } from '../../game/roadEvents';
import type { Tutorial } from '../../game/adventureState';
import { ResourceIcon } from '../ResourceIcon';
import './adventure.css';

export type AdventureView = {tab:'guide'|'contracts'|'companions'|'history';poiId?:string};
const STEPS: {key:keyof Tutorial;title:string;description:string}[] = [
  {key:'accepted',title:'Aceite seu primeiro contrato',description:'Abra Contratos na localidade em que você está. Qualquer origem pode seguir as quatro carreiras.'},
  {key:'departed',title:'Pegue a estrada',description:'Use Viajar ao destino no contrato. Arraste para olhar o mapa e use pinça ou a roda do mouse para aproximar.'},
  {key:'eventResolved',title:'Faça sua primeira escolha',description:'A viagem pausa nos encontros. Veja os atributos, as chances, os custos e os ganhos antes de decidir.'},
  {key:'completed',title:'Entregue e receba',description:'Ao chegar, abra o contrato e toque em Entregar. Você recebe ouro, comida, influência e experiência.'},
  {key:'sheetViewed',title:'Conheça sua progressão',description:'Toque no seu retrato com o anel de XP. Cada nível concede um ponto de habilidade; os níveis 3, 5, 7… também concedem um ponto de atributo.'},
  {key:'recruited',title:'Conquiste um companheiro',description:'Visite um dos outros protagonistas, cumpra um contrato solicitado por ele e volte para convidá-lo. É preciso relação 10.'},
];
export function tutorialNext(tutorial: Tutorial) { return STEPS.find(step=>!tutorial[step.key]); }
function Gains({reward}:{reward:Reward}) {
  const game=useGame();
  const after=withReward(game,reward);
  return <div className="adv-gains">
    <div className="adv-reward-chips">
      {reward.gold!=null && <span><ResourceIcon name="gold" size={23}/>{reward.gold>0?'+':''}{reward.gold}</span>}
      {reward.influence!=null && <span><ResourceIcon name="influence" size={23}/>{reward.influence>0?'+':''}{reward.influence}</span>}
      {reward.food!=null && <span><ResourceIcon name="food" size={23}/>+{reward.food}</span>}
    </div>
    <p>{rewardSummary(reward)}</p>
    {after.level>game.level && <p className="adv-growth">Alcança o nível {after.level}: +{after.skillPoints-game.skillPoints} ponto(s) de habilidade{after.attributePoints>game.attributePoints ? ` e +${after.attributePoints-game.attributePoints} de atributo` : ''} para distribuir na ficha.</p>}
  </div>;
}

function DecisionGrowth({reward}:{reward:Reward}) {
  const game=useGame(), next=withReward(game,reward);
  if(next.level===game.level)return null;
  return <span className="adv-growth">Este resultado alcança o nível {next.level}: +{next.skillPoints-game.skillPoints} ponto(s) de habilidade{next.attributePoints>game.attributePoints ? ` e +${next.attributePoints-game.attributePoints} de atributo` : ''}.</span>;
}

export function AdventurePanel({view,onClose,onView,onNavigate,onSheet}:{view:AdventureView|null;onClose:()=>void;onView:(view:AdventureView)=>void;onNavigate:(id:string)=>void;onSheet:()=>void}) {
  const game=useGame(), a=game.adventure;
  const welcome=!a.tutorial.introSeen;
  const pending=a.event;
  const event=pending ? roadEventById.get(pending.definitionId) : undefined;
  const notice=a.notice;
  const active=!!view || welcome || !!event || !!notice;
  const dialog=useRef<HTMLDivElement>(null);
  const closeRef=useRef(()=>{});
  closeRef.current=()=>{if(event)return;if(notice)dismissNotice();else if(welcome)tutorialFlag('introSeen');else onClose();};
  useEffect(()=>{
    if(!active) return;
    const previous=document.activeElement as HTMLElement|null;
    dialog.current?.focus();
    const keys=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();closeRef.current();}
      if(e.key!=='Tab')return;
      const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]')??[]);
      const first=controls[0],last=controls[controls.length-1];
      if(!first){e.preventDefault();return;}
      if(e.shiftKey && (document.activeElement===first || document.activeElement===dialog.current)){e.preventDefault();last.focus();}
      else if(!e.shiftKey && (document.activeElement===last || document.activeElement===dialog.current)){e.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',keys);
    return ()=>{document.removeEventListener('keydown',keys);if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[active]);
  if(!active)return null;
  const placeId=view?.poiId??locationId(game);
  const place=poiById.get(placeId);
  const here=isPresent(placeId,game);
  const contract=a.contract;
  const tab=view?.tab??'guide';
  const title=event?.title??notice?.title??(welcome?'Sua primeira jornada':tab==='guide'?'Guia do viajante':tab==='companions'?'Companheiros de estrada':tab==='history'?'Crônica da jornada':'Contratos e conversas');
  return <div className="adv-backdrop"><div className="adv-dialog" role="dialog" aria-modal="true" aria-labelledby="adv-title" ref={dialog} tabIndex={-1}>
    <header className="adv-head"><div><span className="hs-kicker">{event?'Encontro na estrada':notice?'Crônica de Valdória':'Lands of Acordelot'}</span><h2 id="adv-title">{title}</h2></div>
      {!event && <button className="sheet-close" onClick={()=>closeRef.current()} aria-label="Fechar">×</button>}
    </header>
    {!event && !notice && !welcome && <nav className="adv-tabs" aria-label="Jornada">
      {([['guide','Guia'],['contracts','Contratos'],['companions','Companheiros'],['history','Crônica']] as const).map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>onView({...view,tab:key})}>{label}</button>)}
    </nav>}
    <div className="adv-body">
      {event && pending ? <>
        <p className="adv-story">{event.text}</p>
        <p className="adv-caption">A viagem está pausada. Atributos e habilidades influenciam a chance; XP pode conceder pontos para você distribuir.</p>
        <div className="adv-choices">{event.choices.map(choice=><button className="adv-choice" key={choice.id} disabled={game.gold<(choice.cost??0)} onClick={()=>resolveRoadEvent(pending.id,choice.id)}>
          <strong>{choice.label}</strong><span>{choice.description}</span>
          {choice.check ? <span className="adv-check"><b>{ATTRIBUTE_LABEL[choice.check.attribute]} {game.attributes[choice.check.attribute]} + {skillById.get(choice.check.skill)?.name} {game.skills[choice.check.skill]}</b><em>{Math.round(choiceChance(choice,game)*100)}% de sucesso</em></span> : <span className="adv-check">Resultado garantido · sem teste de atributo</span>}
          {choice.cost && <span className="adv-cost">Custo: {choice.cost} ouro{game.gold<choice.cost?' · ouro insuficiente':''}</span>}
          <span className="adv-outcome">{choice.check?'Se conseguir':'Resultado'}: {rewardSummary(choice.reward)}</span>
          <DecisionGrowth reward={choice.reward}/>
          {choice.check && <span className="adv-failure">Se falhar: {rewardSummary(choice.failure??{})}</span>}
        </button>)}</div>
      </> : notice ? <>
        <div className={`adv-result ${notice.levelUp?'level-up':''}`}><span aria-hidden="true">✦</span><p>{notice.text}</p></div>
        <div className="adv-actions">{notice.levelUp && <button className="btn" onClick={()=>{dismissNotice();onSheet();}}>Distribuir pontos</button>}<button className="btn primary" onClick={dismissNotice}>Continuar</button></div>
      </> : welcome ? <>
        <p className="adv-story">Você chega a Valdória sem terras, sem título e com o próprio nome para construir. Um trabalho cumprido abre portas. Uma decisão na estrada pode mudar quem confia em você.</p>
        <div className="adv-intro-grid"><article><b>Explore</b><p>Arraste o mapa e aproxime com dois dedos. Toque numa localidade para viajar por estrada.</p></article><article><b>Escolha</b><p>Contratos e encontros mostram custos, chances e recompensas antes de você agir.</p></article><article><b>Evolua</b><p>Ouro, comida e influência sustentam sua jornada. O anel no retrato acompanha seu próximo nível.</p></article></div>
        <div className="adv-actions"><button className="btn" onClick={()=>{tutorialFlag('hidden');tutorialFlag('introSeen');onClose();}}>Explorar por conta própria</button><button className="btn primary" onClick={()=>{tutorialFlag('introSeen');onView({tab:'contracts',poiId:locationId(game)});}}>Encontrar meu primeiro trabalho</button></div>
      </> : tab==='guide' ? <>
        <p className="adv-caption">O guia acompanha suas ações e pode ser consultado novamente em Jornada.</p>
        <ol className="adv-steps">{STEPS.map((step,index)=><li key={step.key} className={a.tutorial[step.key]?'done':''}><span>{a.tutorial[step.key]?'✓':index+1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol>
        <div className="adv-actions"><button className="btn" onClick={()=>tutorialFlag('hidden',!a.tutorial.hidden)}>{a.tutorial.hidden?'Mostrar dicas no mapa':'Ocultar dicas no mapa'}</button><button className="btn primary" onClick={()=>onView({tab:'contracts'})}>Ver contratos</button></div>
      </> : tab==='contracts' ? <>
        {contract ? <article className="adv-contract active"><span className="adv-eyebrow">Contrato em andamento · {CAREER_LABEL[contract.career]}</span><h3>{contract.title}</h3><p>{contract.description}</p><p className="adv-route">{poiById.get(contract.sourceId)?.name} → <b>{poiById.get(contract.destinationId)?.name}</b></p><p>Prazo restante: {formatDuration(remainingContractHours(game))}</p><Gains reward={contract.reward}/><div className="adv-actions">
          {isPresent(contract.destinationId,game)?<button className="btn primary" onClick={completeContract}>Entregar e receber</button>:<button className="btn primary" disabled={!!game.journey?.destinationId} onClick={()=>onNavigate(contract.destinationId)}>{game.journey?.destinationId?'Viagem em andamento':'Viajar ao destino'}</button>}
          <button className="btn" onClick={abandonContract}>Encerrar sem recompensa</button>
        </div></article> : <>
          <div className="adv-location"><h3>{place?.name??'Na estrada'}</h3><p>{here?'Trabalhos disponíveis. Escolha uma carreira para este serviço.':'É preciso chegar a uma localidade para aceitar um trabalho.'}</p></div>
          {contractsAt(placeId,game).map(c=><article className="adv-contract" key={c.id}><span className="adv-eyebrow">{CAREER_LABEL[c.career]}{c.patronId?` · pedido de ${heroById.get(c.patronId)?.name}`:''}</span><h3>{c.title}</h3><p>{c.description}</p><p className="adv-route">Destino: <b>{poiById.get(c.destinationId)?.name}</b> · viagem de {formatDuration(c.travelHours)}</p><p>Prazo: {formatDuration(c.deadline-c.acceptedAt)} a partir da aceitação.</p><Gains reward={c.reward}/><button className="btn primary" disabled={!here} onClick={()=>acceptContract(c.id,placeId)}>Aceitar contrato</button></article>)}
          {contractsAt(placeId,game).length===0 && <p className="empty">Sem novos trabalhos por aqui. Visite outra localidade; o quadro se renova a cada três dias do mundo.</p>}
        </>}
      </> : tab==='companions' ? <>
        <p className="adv-caption">Visite estes viajantes e cumpra um contrato pedido por eles. Um favor concluído rende +12 de relação. O convite exige relação 10 e sua presença no local.</p>
        {Object.values(game.companions).map(c=>{const hero=heroById.get(c.id);return <article className="adv-companion" key={c.id}>
          <img src={heroPortraitUrl(hero?.portraitAssetKey)} alt={hero?.name}/><div><h3>{hero?.name}</h3><p>{c.status==='IN_PARTY'?'Viajando com você':poiById.get(c.locationPoiId)?.name} · relação {c.relation}</p><p>{hero?.tagline}</p>
          {c.status!=='IN_PARTY' && <div className="adv-actions">{isPresent(c.locationPoiId,game)?<><button className="btn" onClick={()=>onView({tab:'contracts',poiId:c.locationPoiId})}>Ouvir seus pedidos</button><button className="btn primary" disabled={!canRecruitCompanion(c.id,game)} onClick={()=>recruitCompanion(c.id)}>Convidar para o grupo</button></>:<button className="btn" disabled={!!game.journey?.destinationId} onClick={()=>onNavigate(c.locationPoiId)}>Visitar</button>}</div>}</div>
        </article>;})}
      </> : <>
        <p className="adv-caption">{a.history.filter(c=>c.status==='completed').length} contratos concluídos · {a.eventCount} encontros na estrada</p>
        {a.chronicle.length===0?<p className="empty">Sua crônica começa com o primeiro passo.</p>:a.chronicle.map(entry=><article className="adv-log" key={entry.id}><small>Dia {Math.floor(entry.hours/24)+1} · {Math.floor(entry.hours%24)}h</small><p>{entry.text}</p></article>)}
      </>}
    </div>
  </div></div>;
}

export function JourneyTracker({onOpen}:{onOpen:(view:AdventureView)=>void}) {
  const game=useGame(),a=game.adventure;
  const next=tutorialNext(a.tutorial);
  if(!a.tutorial.introSeen)return null;
  if(!a.contract && (a.tutorial.hidden || !next)) return null;
  return <button className="journey-tracker" onClick={()=>onOpen({tab:a.contract?'contracts':'guide'})}>
    <small>{a.contract?'Contrato ativo':'Primeiros passos'}</small>
    <strong>{a.contract?.title??next?.title}</strong>
    <span>{a.contract ? isPresent(a.contract.destinationId,game)?'Você chegou · toque para entregar':`Destino: ${poiById.get(a.contract.destinationId)?.name}` : 'Toque para ver o guia'}</span>
  </button>;
}
