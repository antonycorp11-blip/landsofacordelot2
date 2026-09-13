import { useEffect, useRef, useState } from 'react';
import { ATTRIBUTE_LABEL, heroById } from '../../data/heroes';
import { heroPortraitUrl } from '../../data/heroAssets';
import { skillById } from '../../data/skills';
import { poiById } from '../../world/valdoria';
import { formatDuration } from '../../world/time';
import { resetCampaign, useGame } from '../../game/store';
import { CAREER_LABEL } from '../../game/careers';
import { isPresent, locationId } from '../../game/presence';
import { withReward, type Reward } from '../../game/experience';
import { abandonContract, canRecruitCompanion, completeContract, dismissNotice, recruitCompanion, remainingContractHours, resolveRoadEvent, rewardSummary } from '../../game/adventure';
import { choiceChance, roadEventById } from '../../game/roadEvents';
import { actOnRaid, chooseQuestOption, giveOrder, startQuestBattle, startRaidBattle } from '../../game/adventure';
import { ORDERS, canFlank } from '../../game/battle';
import { abandonContract as giveUpContract } from '../../game/adventure';
import { fleeChance, winChance } from '../../game/raid';
import { readForce } from '../../game/estimate';
import { troopTotal } from '../../data/troops';
import { ResourceIcon } from '../ResourceIcon';
import './adventure.css';

export type AdventureView = {tab:'guide'|'contracts'|'companions'|'history';poiId?:string};
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

/**
 * Recomeçar apaga tudo. Por isso o botão pergunta antes, na própria etiqueta,
 * em vez de abrir mais uma janela por cima da janela.
 */
function RestartButton() {
  const [armed,setArmed]=useState(false);
  if(!armed) return <button className="btn" onClick={()=>setArmed(true)}>Recomeçar campanha</button>;
  return <>
    <button className="btn" onClick={()=>setArmed(false)}>Não, continuar</button>
    <button className="btn danger" onClick={resetCampaign}>Apagar e recomeçar</button>
  </>;
}

/**
 * O ENCONTRO COM UM BANDO.
 *
 * A leitura da força é a de `estimate.ts`, ou seja: o que você vê depende da
 * sua Tática. Sem Tática, "um grupo considerável" e mais nada — e decidir no
 * escuro é exatamente o ponto. As chances aparecem porque escolher às cegas
 * entre três botões não é decisão, é sorteio.
 */
/**
 * O SEGUNDO E O TERCEIRO ATO.
 *
 * Uma decisão de missão tem a mesma forma de um encontro de estrada — texto e
 * opções com o custo dito antes —, porque é a mesma coisa: um momento em que
 * o jogo pergunta quem você é e guarda a resposta.
 */
function BeatScene({beat}:{beat:NonNullable<NonNullable<ReturnType<typeof useGame>['adventure']['quest']>['pending']>}) {
  const game=useGame();
  if (beat.kind==='batalha') {
    return <>
      <p className="adv-story">{beat.text}</p>
      <div className="adv-choices">
        <button className="adv-choice" onClick={startQuestBattle}>
          <strong>Formar e enfrentar</strong>
          <span>Você comanda a linha, rodada a rodada.</span>
          <span className="adv-outcome">Se vencer: despojos, experiência e o encargo segue.</span>
          <span className="adv-failure">Se perder: homens mortos e o encargo se perde.</span>
        </button>
        <button className="adv-choice" onClick={()=>giveUpContract()}>
          <strong>Largar tudo e correr</strong>
          <span>Salva-se a pele; perde-se o encargo e a palavra.</span>
          <span className="adv-failure">O contrato é encerrado sem recompensa.</span>
        </button>
      </div>
    </>;
  }
  return <>
    <p className="adv-story">{beat.text}</p>
    <div className="adv-choices">{beat.options.map(o=>{
      const semOuro=!!o.goldCost && game.gold<o.goldCost;
      return <button className="adv-choice" key={o.id} disabled={semOuro} onClick={()=>chooseQuestOption(o.id)}>
        <strong>{o.label}</strong>
        {o.hint && <span>{o.hint}</span>}
        {o.goldCost ? <span className="adv-cost">Custo: {o.goldCost} moedas{semOuro?` · você tem ${game.gold}`:''}</span> : null}
      </button>;
    })}</div>
  </>;
}

/**
 * A BATALHA, RODADA A RODADA.
 *
 * Duas colunas — os seus e os deles —, a última coisa que aconteceu, e quatro
 * ordens. A moral aparece porque é ela que decide a batalha antes dos homens
 * acabarem, e quem não a vê não entende por que o campo virou.
 */
function BattleScene({battle}:{battle:NonNullable<ReturnType<typeof useGame>['adventure']['battle']>}) {
  const flank=canFlank(battle.mine);
  return <>
    <div className="btl-sides">
      <div className="btl-side">
        <span className="btl-label">Os seus</span>
        <b>{troopTotal(battle.mine)}</b>
        <span className="btl-bar"><i style={{width:`${battle.myMorale}%`}}/></span>
        <small>moral {battle.myMorale}</small>
      </div>
      <div className="btl-side them">
        <span className="btl-label">{battle.enemyName}</span>
        <b>{troopTotal(battle.theirs)}</b>
        <span className="btl-bar"><i style={{width:`${battle.theirMorale}%`}}/></span>
        <small>moral {battle.theirMorale}</small>
      </div>
    </div>
    <p className="adv-story btl-log">{battle.log[battle.log.length-1] ?? 'As linhas se encaram. A sua ordem decide como isto começa.'}</p>
    <div className="btl-orders">{ORDERS.map(o=>{
      const ruim=o.id==='flanquear' && !flank;
      return <button className="adv-choice" key={o.id} onClick={()=>giveOrder(o.id)}>
        <strong>{o.name}</strong>
        <span>{ruim?'Sem cavalaria, a manobra expõe o seu flanco.':o.blurb}</span>
      </button>;
    })}</div>
  </>;
}

function RaidScene({raid}:{raid:import('../../game/raid').Raid}) {
  const game=useGame();
  const reading=readForce(raid.band);
  const mine=troopTotal(game.troops);
  const win=Math.round(winChance(game,raid)*100);
  const flee=Math.round(fleeChance(game)*100);
  const canPay=game.gold>=raid.toll;
  const vago=reading.confidence==='vago';
  return <>
    <p className="adv-story">Homens atravessados na estrada, e não é para pedir carona. Você conta {reading.label.toLowerCase()}.</p>
    <p className="adv-caption">{reading.verdict} Risco: <b className={`risk ${reading.risk}`}>{reading.risk}</b>. {mine===0?'Você viaja sem ninguém.':`Você tem ${mine} homem(ns).`}</p>
    <div className="adv-choices">
      <button className="adv-choice" onClick={startRaidBattle}>
        <strong>Formar e enfrentar</strong>
        <span>Você comanda a linha, rodada a rodada.</span>
        <span className="adv-check"><em>{vago?'chance incerta':`${win}% de vencer`}</em></span>
        <span className="adv-outcome">Se vencer: despojos e experiência de comando.</span>
        <span className="adv-failure">Se perder: homens mortos e um terço do ouro.</span>
      </button>
      <button className="adv-choice" onClick={()=>actOnRaid('fugir')}>
        <strong>Fugir pelo mato</strong>
        <span>Sair da estrada e torcer para as pernas bastarem.</span>
        <span className="adv-check"><em>{flee}% de escapar</em></span>
        <span className="adv-outcome">Se conseguir: três horas perdidas e nada mais.</span>
        <span className="adv-failure">Se falhar: a briga acontece, e em desvantagem.</span>
      </button>
      <button className="adv-choice" disabled={!canPay} onClick={()=>actOnRaid('pagar')}>
        <strong>Pagar o pedágio</strong>
        <span>{canPay?'Eles abrem caminho e ninguém sangra.':'Ouro insuficiente.'}</span>
        <span className="adv-cost">Custo: {raid.toll} moedas{canPay?'':` · você tem ${game.gold}`}</span>
      </button>
    </div>
  </>;
}

export function AdventurePanel({view,onClose,onView,onNavigate,onSheet}:{view:AdventureView|null;onClose:()=>void;onView:(view:AdventureView)=>void;onNavigate:(id:string)=>void;onSheet:()=>void}) {
  const game=useGame(), a=game.adventure;
  const pending=a.event;
  const raid=a.raid;
  const battle=a.battle;
  const beat=a.quest?.pending ?? null;
  const event=pending ? roadEventById.get(pending.definitionId) : undefined;
  const notice=a.notice;
  const active=!!view || !!event || !!notice || !!raid || !!battle || !!beat;
  const dialog=useRef<HTMLDivElement>(null);
  const closeRef=useRef(()=>{});
  closeRef.current=()=>{if(event||raid||battle||beat)return;if(notice)dismissNotice();else onClose();};
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
  const place=placeId?poiById.get(placeId):undefined;
  const here=!!placeId&&isPresent(placeId,game);
  const contract=a.contract;
  const tab=view?.tab==='guide'?'contracts':view?.tab??'contracts';
  const title=battle?.enemyName??beat?.title??raid?.name??event?.title??notice?.title??(tab==='companions'?'Companheiros de estrada':tab==='history'?'Crônica da jornada':'Encargo em curso');
  return <div className="adv-backdrop"><div className="adv-dialog" role="dialog" aria-modal="true" aria-labelledby="adv-title" ref={dialog} tabIndex={-1}>
    <header className="adv-head"><div><span className="hs-kicker">{battle?`Rodada ${battle.round}`:beat?(a.quest?.phase==='entrega'?'Na chegada':'No meio do caminho'):raid?'A estrada está tomada':event?'Encontro na estrada':notice?'Crônica de Valdória':'Lands of Acordelot'}</span><h2 id="adv-title">{title}</h2></div>
      {!event && !raid && !battle && !beat && <button className="sheet-close" onClick={()=>closeRef.current()} aria-label="Fechar">×</button>}
    </header>
    {!event && !notice && !raid && !battle && !beat && <nav className="adv-tabs" aria-label="Jornada">
      {([['contracts','Encargo'],['companions','Companheiros'],['history','Crônica']] as const).map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>onView({...view,tab:key})}>{label}</button>)}
    </nav>}
    <div className="adv-body">
      {battle ? <BattleScene battle={battle}/> : beat ? <BeatScene beat={beat}/> : raid ? <RaidScene raid={raid}/> : event && pending ? <>
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
      </> : tab==='contracts' ? <>
        {contract ? <article className="adv-contract active"><span className="adv-eyebrow">Contrato em andamento · {CAREER_LABEL[contract.career]}</span><h3>{contract.title}</h3><p>{contract.description}</p><p className="adv-route">{poiById.get(contract.sourceId)?.name} → <b>{poiById.get(contract.destinationId)?.name}</b></p><p>Prazo restante: {formatDuration(remainingContractHours(game))}</p><Gains reward={contract.reward}/><div className="adv-actions">
          {isPresent(contract.destinationId,game)?<button className="btn primary" onClick={completeContract}>Entregar e receber</button>:<button className="btn primary" disabled={!!game.journey?.destinationId} onClick={()=>onNavigate(contract.destinationId)}>{game.journey?.destinationId?'Viagem em andamento':'Viajar ao destino'}</button>}
          <button className="btn" onClick={abandonContract}>Encerrar sem recompensa</button>
        </div></article> : <>
          <div className="adv-location"><h3>Nenhum encargo em curso</h3><p>Trabalho não se acha numa lista: procure a pessoa que manda numa localidade. Toque no lugar, escolha <b>Falar</b> e pergunte por serviço.{here&&place?` Você está em ${place.name}.`:''}</p></div>
          <div className="adv-actions"><button className="btn primary" onClick={onClose}>Voltar ao mapa</button></div>
        </>}
      </> : tab==='companions' ? <>
        <p className="adv-caption">Visite estes viajantes e cumpra um contrato pedido por eles. Um favor concluído rende +12 de relação. O convite exige relação 10 e sua presença no local.</p>
        {Object.values(game.companions).map(c=>{const hero=heroById.get(c.id);return <article className="adv-companion" key={c.id}>
          <img src={heroPortraitUrl(hero?.portraitAssetKey)} alt={hero?.name}/><div><h3>{hero?.name}</h3><p>{c.status==='IN_PARTY'?'Viajando com você':poiById.get(c.locationPoiId)?.name} · relação {c.relation}</p><p>{hero?.tagline}</p>
          {c.status!=='IN_PARTY' && <div className="adv-actions">{isPresent(c.locationPoiId,game)?<><button className="btn" onClick={()=>onView({tab:'contracts',poiId:c.locationPoiId})}>Ouvir seus pedidos</button><button className="btn primary" disabled={!canRecruitCompanion(c.id,game)} onClick={()=>recruitCompanion(c.id)}>Convidar para o grupo</button></>:<button className="btn" disabled={!!game.journey?.destinationId} onClick={()=>onNavigate(c.locationPoiId)}>Visitar</button>}</div>}</div>
        </article>;})}
      </> : <>
        <p className="adv-caption">{a.history.filter(c=>c.status==='completed').length} contratos concluídos · {a.eventCount} encontros na estrada</p>
        <div className="adv-actions"><RestartButton/></div>
        {a.chronicle.length===0?<p className="empty">Sua crônica começa com o primeiro passo.</p>:a.chronicle.slice(0,5).map(entry=><article className="adv-log" key={entry.id}><small>Dia {Math.floor(entry.hours/24)+1} · {Math.floor(entry.hours%24)}h</small><p>{entry.text}</p></article>)}
      </>}
    </div>
  </div></div>;
}
