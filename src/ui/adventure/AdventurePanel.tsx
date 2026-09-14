import { useEffect, useRef, useState } from 'react';
import { ATTRIBUTE_LABEL, heroById } from '../../data/heroes';
import { heroPortraitUrl } from '../../data/heroAssets';
import { skillById } from '../../data/skills';
import { poiById, regionById } from '../../world/valdoria';
import { loadStop } from '../../world/roadStops';
import { regionAtPoint } from '../../world/navigation/navigationGrid';
import { issuesAt } from '../../game/issues';
import { formatDuration } from '../../world/time';
import { resetCampaign, useGame } from '../../game/store';
import { storyPeople } from '../../data/storyPeople';
import { audienceOpen, favoursDone, openFavours, FAVOURS_FOR_AUDIENCE } from '../../data/favours';
import { CAREER_LABEL } from '../../game/careers';
import { isPresent, locationId } from '../../game/presence';
import { withReward, type Reward } from '../../game/experience';
import { abandonContract, canRecruitCompanion, completeContract, dismissNotice, recruitCompanion, remainingContractHours, resolveRoadEvent, rewardSummary } from '../../game/adventure';
import { choiceChance, roadEventById } from '../../game/roadEvents';
import { actOnRaid, attemptParley, chooseQuestOption, giveOrder, startQuestBattle, startRaidBattle } from '../../game/adventure';
import { BATTLE_TERRAINS, ORDERS, canDemandSurrender, canFlank, orderAvailable, orderEffects, parleyChance } from '../../game/battle';
import { chapterOfStep, currentStep } from '../../game/story';
import { abandonContract as giveUpContract } from '../../game/adventure';
import { fleeChance, winChance } from '../../game/raid';
import { readForce } from '../../game/estimate';
import { troopTotal } from '../../data/troops';
import { ResourceIcon } from '../ResourceIcon';
import { goodById } from '../../data/goods';
import { amountOwned } from '../../game/economy';
import { questOptionChance } from '../../game/quests';
import royalSealArt from '../../assets/story/seal/royal_seal.png?url';
import { BattleArena } from '../battle/BattleArena';
import './adventure.css';

export type AdventureView = {tab:'guide'|'story'|'contracts'|'companions'|'history';poiId?:string};
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
/**
 * A CAMPANHA NO DIÁRIO.
 *
 * O capítulo, o que ele é sobre, o objetivo de agora e o que já ficou para
 * trás. É a única aba que responde "por que eu estou jogando".
 */
/**
 * O QUE VOCÊ SABE.
 *
 * A aba de campanha deixou de ser lista de tarefas. Ela responde três coisas:
 * o que você descobriu, o que ainda não entendeu, e o que tem na mão para
 * provar. Não há ordem, não há passo 1 de 4 — porque a investigação não tem
 * ordem, e fingir que tem seria voltar ao aplicativo de tarefas.
 *
 * As perguntas vêm primeiro de propósito: é o que puxa o jogador para o mapa.
 */
function StoryTab() {
  const game=useGame();
  const k=game.knowledge;
  const step=currentStep(game.adventure.story);
  const chapter=step?chapterOfStep.get(step.id):null;
  const vazio=!k.facts.length&&!k.questions.length&&!k.evidence.length;
  const caminhos=leadsFor(k.evidence,game.storyFlags);

  if(vazio) return <>
    <p className="adv-story">Você chegou a Valdória sem nada que valha registrar. Ainda.</p>
    <p className="adv-caption">O que você descobrir pelo caminho fica anotado aqui.</p>
  </>;

  return <>
    {chapter && <span className="adv-eyebrow">Capítulo {chapter.number} · {chapter.title}</span>}
    {step && <p className="adv-caption">{step.objective}</p>}

    {k.questions.length>0 && <>
      <span className="adv-eyebrow">Perguntas em aberto{k.questions.length>3?` · ${k.questions.length}`:''}</span>
      <ul className="know-list ask">{ultimos(k.questions,3).map((q)=><li key={q}>{q}</li>)}</ul>
    </>}

    {k.facts.length>0 && <>
      <span className="adv-eyebrow">O que você sabe{k.facts.length>3?` · ${k.facts.length}`:''}</span>
      <ul className="know-list">{ultimos(k.facts,3).map((f)=><li key={f}>{f}</li>)}</ul>
    </>}

    {k.evidence.length>0 && <>
      <span className="adv-eyebrow">Em suas mãos</span>
      <ul className="know-list proof">{ultimos(k.evidence,3).map((id)=><li key={id}>
        {EVIDENCE_ART[id] && <img src={EVIDENCE_ART[id]} alt="" />}
        <span>{EVIDENCE_NAME[id]??id}</span>
      </li>)}</ul>
    </>}

    {caminhos.length>0 && <>
      <span className="adv-eyebrow">Quem saberia dizer{caminhos.length>3?` · ${caminhos.length}`:''}</span>
      <ul className="know-list where">{ultimos(caminhos,3).map((c)=><li key={c.text} className={c.done?'done':undefined}>{c.text}</li>)}</ul>
    </>}
  </>;
}

/**
 * CAMINHOS, NÃO OBJETIVOS.
 *
 * Não é uma lista de destinos com seta: é gente que teria motivo para
 * reconhecer o que você carrega. Quem procurar primeiro é escolha sua, e cada
 * um responde de um jeito — o mercador vê preço, o escrivão vê marca, o guarda
 * vê problema.
 */
/**
 * O QUADRO NÃO PODE CRESCER PARA SEMPRE.
 *
 * Ele acumula a campanha inteira, e a tela deitada tem duzentos e oitenta
 * pixels. Mostra o que chegou por último, que é o que ainda está vivo, e o
 * número ao lado do título diz quanto mais existe.
 */
function ultimos<T>(list: T[], n: number): T[] {
  return list.length <= n ? list : list.slice(-n);
}

function leadsFor(evidence: string[], flags: string[]): { text: string; done: boolean }[] {
  if (!evidence.includes('royal_seal')) return [];
  // O LUGAR VAI JUNTO, de propósito. Caminho sem endereço é decoração, e foi
  // exatamente isso que deixou o jogador sem rumo depois da carruagem.
  return storyPeople.map((p) => ({
    text: flags.includes(p.doneFlag) ? p.leadDone : p.lead,
    done: flags.includes(p.doneFlag),
  }));
}

/** Nome legível de cada prova. A função escondida delas não é dita aqui. */
const EVIDENCE_NAME: Record<string,string> = {
  royal_seal: "Selo Real de Valdória — encontrado junto à carruagem atacada",
  carta_do_escrivao: "Carta de Mestre Aled Vern — fechada com um laço embaixo da assinatura",
  ordem_da_cancela: "Ordem de abrir a cancela do bosque — a letra não é a do intendente",
  ordem_sem_registro: "Ordem da Coroa — levar o selo ao Castelo Real sem escolta e sem registro",
  selo_elmwood: "Selo Real da Casa Elmwood — penhorado há quatro gerações por trinta e quatro moedas",
  selo_karneth: "Selo Real da Casa Karneth — trocado por uma fronteira paga em dia",
  selo_dravenor: "Selo Real da Casa Dravenor — murado em Pedra Cinza por três anos",
  selo_caelmont: "Selo Real da Casa Caelmont — refundido dentro da Lâmpada do Vale",
  confissao_antonios: "Confissão do rei Antônios — de próprio punho, com um laço embaixo da assinatura",
  linhagem_vern: "A linha da chancelaria — duas trocas de nome, e o sobrenome de hoje",
  selo_valdoria: "Selo Real da Casa Valdória — herdado por um ramo que nunca teve direito",
  selo_aurenna: "Selo Real da Casa Aurenna — comprado de um herdeiro endividado por um sexto do valor",
};
// Os selos são peças irmãs: a mesma arte serve às duas até haver outra.
const EVIDENCE_ART: Record<string,string> = {
  royal_seal: royalSealArt, selo_elmwood: royalSealArt, selo_karneth: royalSealArt,
  selo_dravenor: royalSealArt, selo_caelmont: royalSealArt,
  selo_valdoria: royalSealArt, selo_aurenna: royalSealArt,
};

function BeatScene({beat}:{beat:NonNullable<NonNullable<ReturnType<typeof useGame>['adventure']['quest']>['pending']>}) {
  const game=useGame();
  if (beat.kind==='batalha') {
    return <>
      <p className="adv-story">{beat.text}</p>
      {beat.terrain&&<p className="adv-caption"><b>{BATTLE_TERRAINS[beat.terrain].name}:</b> {BATTLE_TERRAINS[beat.terrain].blurb}</p>}
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
        {o.check ? <span className="adv-check"><b>{ATTRIBUTE_LABEL[o.check.attribute]} {game.attributes[o.check.attribute]} + {skillById.get(o.check.skill)?.name} {game.skills[o.check.skill]}</b><em>{Math.round(questOptionChance(o,game)*100)}% de sucesso</em></span> : <span className="adv-check">Resultado garantido · sem teste</span>}
        {o.goldCost ? <span className="adv-cost">Custo: {o.goldCost} moedas{semOuro?` · você tem ${game.gold}`:''}</span> : null}
        <span className="adv-outcome">Se conseguir: {rewardSummary(o.reward??{})}</span>
        <DecisionGrowth reward={o.reward??{}}/>
        {o.check && <span className="adv-failure">Se falhar: {rewardSummary(o.failureReward??{})}</span>}
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
  const game=useGame();
  const flank=canFlank(battle.mine);
  return <>
    <BattleArena battle={battle}/>
    {/* Coluna de comando: forças, relato, parlamento e ordens juntos.
        Precisa ser um contêiner de verdade — deitado, ela fica ao lado do
        campo, e sem um elemento próprio cada pedaço quebrava para uma
        linha abaixo da arena. */}
    <div className="btl-command">
      <div className="btl-sides">
        <div className="btl-side">
          <span className="btl-label">Os seus</span>
          <b>{troopTotal(battle.mine)}</b>
          <span className="btl-bar"><i style={{width:`${battle.myMorale}%`}}/></span>
          <small>moral {battle.myMorale} · {battle.myDead??0} mortos · {battle.myWounded??0} feridos</small>
        </div>
        <div className="btl-side them">
          <span className="btl-label">{battle.enemyName}</span>
          <b>{troopTotal(battle.theirs)}</b>
          <span className="btl-bar"><i style={{width:`${battle.theirMorale}%`}}/></span>
          <small>moral {battle.theirMorale} · {battle.theirLosses??0} fora de combate</small>
        </div>
      </div>
      <p className="adv-story btl-log">{battle.log[battle.log.length-1] ?? 'As linhas se encaram. A sua ordem decide como isto começa.'}</p>
      {!battle.parleyAttempted && <div className="btl-parley">
        {canDemandSurrender(battle)&&<button className="adv-choice" onClick={()=>attemptParley('exigir')}><strong>Exigir rendição</strong><span>Diplomacia {game.attributes.diplomacy} + Persuasão {game.skills.persuasao}</span><span className="adv-check"><em>{Math.round(parleyChance(game,battle,'exigir')*100)}% de sucesso</em></span><span className="adv-outcome">Captura parte dos sobreviventes e encerra o combate.</span></button>}
        <button className="adv-choice" onClick={()=>attemptParley('retirada')}><strong>Negociar passagem</strong><span>Oferecer dinheiro para sair com feridos e carga.</span><span className="adv-check"><em>{Math.round(parleyChance(game,battle,'retirada')*100)}% de sucesso</em></span></button>
      </div>}
      <div className="btl-orders">{ORDERS.map(o=>{
        const ruim=o.id==='flanquear' && !flank;
        const effect=orderEffects(game,battle,o.id);
        const available=orderAvailable(o.id,battle.mine);
        return <button className="adv-choice" key={o.id} disabled={!available} onClick={()=>giveOrder(o.id)}>
          <strong>{o.name}</strong>
          <span>{!available?(o.id==='saraivada'?'Você não tem arqueiros.':'Você não tem cavalaria.'):ruim?'Sem cavalaria, a manobra expõe o seu flanco.':o.blurb}</span>
          <span className="btl-effect">
            {effect.retreatPercent!=null
              ? <><b>{effect.retreatPercent}%</b> de sair da batalha</>
              : <><b>Ataque {effect.attackPercent>=0?'+':''}{effect.attackPercent}%</b><b>Exposição {effect.exposurePercent>=0?'+':''}{effect.exposurePercent}%</b><span>{BATTLE_TERRAINS[battle.terrain]?.name??'Campo'} {effect.terrainNote>=0?'+':''}{effect.terrainNote}%</span></>}
          </span>
        </button>;
      })}</div>
    </div>
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
    <p className="adv-caption"><b>{BATTLE_TERRAINS[raid.terrain??'plain'].name}:</b> {BATTLE_TERRAINS[raid.terrain??'plain'].blurb}</p>
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


/**
 * ONDE HÁ TRABALHO.
 *
 * NÃO é um mural de missões. O trabalho continua saindo da boca de alguém —
 * mas o jogador precisava de um lugar que dissesse PARA ONDE IR, e não tinha.
 * Ele fechava a carruagem e ficava olhando um mapa de vinte e quatro mil por
 * dezesseis mil sem uma única indicação.
 *
 * Então isto lista dois tipos de destino, e os dois partem com um toque:
 * quem tem a ver com o que ele carrega, e as localidades da região onde há
 * gente com serviço. O que a pessoa quer, ele descobre chegando lá.
 */
function WorkBoard({game,onNavigate}:{game:ReturnType<typeof useGame>;onNavigate:(id:string)=>void}) {
  const traveling=!!game.journey?.destinationId;
  const allLeads=game.knowledge.evidence.includes('royal_seal')
    ? storyPeople.filter(p=>!game.storyFlags.includes(p.doneFlag))
    : [];
  // Pedido aceito vem antes de pista, e pista antes de encargo. É a ordem em
  // que as coisas cobram o jogador.
  const errands=openFavours(game.storyFlags);
  const feitos=favoursDone(game.storyFlags);
  const audiencia=audienceOpen(game.storyFlags);

  // Só a região onde ele está: mandar um recém-chegado atravessar o reino
  // atrás de um encargo de aldeia é o contrário de dar direção.
  //
  // A região vem da POSIÇÃO, não de `locationId`: com movimento livre o
  // jogador passa a maior parte do tempo fora de qualquer localidade, e
  // perguntar "em que cidade você está" devolvia nada — a lista ficava vazia
  // exatamente quando ele mais precisava dela.
  const at=loadStop(game.journey?.at);
  const regionId=at?regionAtPoint(at):undefined;
  const far=(p:{x:number;y:number})=>at?Math.hypot(p.x-at.x,p.y-at.y):0;
  const allAround=(regionId?regionById.get(regionId)?.pointsOfInterest??[]:[])
    .map(poi=>({poi,count:issuesAt(poi.id,game).length}))
    .filter(entry=>entry.count>0&&!isPresent(entry.poi.id,game))
    .sort((a,b)=>far(a.poi)-far(b.poi));

  /*
   * CINCO LINHAS DE UMA LINHA CADA.
   *
   * Sem teto a lista rolava, e rolagem é a única coisa que este jogo não
   * pode ter. Pista vem antes de encargo, e encargo vem por distância: o que
   * está mais perto é o que ele consegue fazer hoje.
   */
  const SLOTS=5;
  const pedidos=errands.slice(0,3);
  const leads=allLeads.slice(0,Math.max(0,Math.min(3,SLOTS-pedidos.length-(audiencia?1:0))));
  const around=allAround.slice(0,Math.max(0,SLOTS-pedidos.length-leads.length-(audiencia?1:0)));
  const rest=errands.length-pedidos.length+allLeads.length-leads.length+allAround.length-around.length;

  if(!errands.length&&!audiencia&&!allLeads.length&&!allAround.length) return (
    <div className="adv-location"><h3>Nada chamando você</h3>
      <p>Nenhuma pista aberta e nenhuma localidade desta região com serviço agora. Ande até outra região e pergunte por lá.</p></div>
  );

  return <>
    {audiencia && <>
      <span className="adv-eyebrow">A porta abriu</span>
      <article className="adv-work open">
        <b>Castelo Verde</b><span>Lorde Edran Silvarden recebe você</span>
        <button className="btn primary" disabled={traveling} onClick={()=>onNavigate('castelo_verde')}>{traveling?'A caminho':'Partir'}</button>
      </article>
    </>}

    {pedidos.length>0 && <>
      <span className="adv-eyebrow">Pediram isto a você{audiencia?'':` · ${feitos} de ${FAVOURS_FOR_AUDIENCE} para ser recebido`}</span>
      {pedidos.map(f=><article className="adv-work" key={f.id}>
        <b>{f.short}</b><span>{poiById.get(f.poiId)?.name}</span>
        <button className="btn" disabled={traveling} onClick={()=>onNavigate(f.poiId)}>{traveling?'A caminho':'Partir'}</button>
      </article>)}
    </>}

    {leads.length>0 && <>
      <span className="adv-eyebrow">Por causa do que você carrega</span>
      {leads.map(p=><article className="adv-work" key={p.id}>
        <b>{p.name}</b><span>{poiById.get(p.poiId)?.name}</span>
        <button className="btn" disabled={traveling} onClick={()=>onNavigate(p.poiId)}>{traveling?'A caminho':'Partir'}</button>
      </article>)}
    </>}

    {around.length>0 && <>
      <span className="adv-eyebrow">Há gente com serviço</span>
      {around.map(({poi,count})=><article className="adv-work" key={poi.id}>
        <b>{poi.name}</b><span>{count===1?'um serviço':`${count} serviços`}</span>
        <button className="btn" disabled={traveling} onClick={()=>onNavigate(poi.id)}>{traveling?'A caminho':'Partir'}</button>
      </article>)}
    </>}

    {rest>0 && <p className="adv-caption">E mais {rest} {rest===1?'lugar':'lugares'} nesta região. Ande até lá e pergunte.</p>}
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
  const tab=view?.tab==='guide'?'story':view?.tab??'story';
  const title=battle?.enemyName??beat?.title??raid?.name??event?.title??notice?.title??(tab==='companions'?'Companheiros de estrada':tab==='history'?'Crônica da jornada':tab==='story'?'A campanha':contract?'Encargo em curso':'Para onde ir');
  return <div className="adv-backdrop"><div className="adv-dialog" role="dialog" aria-modal="true" aria-labelledby="adv-title" ref={dialog} tabIndex={-1}>
    <header className="adv-head"><div><span className="hs-kicker">{battle?`Rodada ${battle.round}`:beat?(a.quest?.phase==='entrega'?'Na chegada':'No meio do caminho'):raid?'A estrada está tomada':event?'Encontro na estrada':notice?'Crônica de Valdória':'Lands of Acordelot'}</span><h2 id="adv-title">{title}</h2></div>
      {!event && !raid && !battle && !beat && <button className="sheet-close" onClick={()=>closeRef.current()} aria-label="Fechar">×</button>}
    </header>
    {!event && !notice && !raid && !battle && !beat && <nav className="adv-tabs" aria-label="Jornada">
      {([['story','Campanha'],['contracts','Trabalho'],['companions','Companheiros'],['history','Crônica']] as const).map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>onView({...view,tab:key})}>{label}</button>)}
    </nav>}
    <div className={`adv-body${battle?" is-battle":""}`}>
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
      </> : tab==='story' ? <StoryTab/> : tab==='contracts' ? <>
        {contract ? <article className="adv-contract active"><span className="adv-eyebrow">Contrato em andamento · {CAREER_LABEL[contract.career]}</span><h3>{contract.title}</h3><p>{contract.description}</p><p className="adv-route">{poiById.get(contract.sourceId)?.name} → <b>{poiById.get(contract.destinationId)?.name}</b></p><p>Prazo restante: {formatDuration(remainingContractHours(game))}</p>
          {contract.cargo && <div className="adv-cargo"><b>Carga exigida</b><span>{amountOwned(game,contract.cargo.goodId)}/{contract.cargo.amount} {goodById.get(contract.cargo.goodId)?.name.toLowerCase()}</span><small>{amountOwned(game,contract.cargo.goodId)>=contract.cargo.amount?'Encomenda completa. Proteja a carga até a entrega.':'Compre o restante num mercado antes de viajar.'}</small></div>}
          <Gains reward={contract.reward}/><div className="adv-actions">
          {isPresent(contract.destinationId,game)?<button className="btn primary" onClick={completeContract}>Entregar e receber</button>:<button className="btn primary" disabled={!!game.journey?.destinationId} onClick={()=>onNavigate(contract.destinationId)}>{game.journey?.destinationId?'Viagem em andamento':'Viajar ao destino'}</button>}
          <button className="btn" onClick={abandonContract}>Encerrar sem recompensa</button>
        </div></article> : <>
          <p className="adv-caption">Trabalho continua saindo da boca de alguém: chegue ao lugar e pergunte. Isto aqui só diz para onde ir.{here&&place?` Você está em ${place.name}.`:''}</p>
          <WorkBoard game={game} onNavigate={onNavigate}/>
        </>}
      </> : tab==='companions' ? <>
        <p className="adv-caption">Um favor cumprido rende +12 de relação. O convite exige relação 10 e você no local.</p>
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
