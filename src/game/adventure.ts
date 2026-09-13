import { getState, update, type GameState } from './store';
import type { Contract, JourneySave, Tutorial } from './adventureState';
import { withReward, type Reward } from './experience';
import { contractsAt } from './contracts';
import { choiceChance, roadEventById, roadEvents } from './roadEvents';
import { makeRaid, resolveRaid, type Raid } from './raid';
import { beginQuest, closingFor, complicationFor, questOptionChance } from './quests';
import { addTroopCounts, playRound, prisonerRansom, resolveParley, startBattle, type Order, type ParleyKind } from './battle';
import { allSteps, chapterOfStep, currentStep, triggerMet } from './story';
import { makeOffer, type Offer } from './offers';
import type { RoadStop } from '../world/roadStops';
import { isPresent } from './presence';
import { applyDay, reportLine } from './daily';
import { advanceWorld, WORLD_TICK_DAYS } from './worldSim';
import { heroById } from '../data/heroes';
import { skillById } from '../data/skills';
import { CAREER_LABEL } from './careers';
import { poiById } from '../world/valdoria';
import { goodById, type GoodId } from '../data/goods';
import type { AgentClass, RouteEdge } from '../world/types';
import type { JournalKind } from '../ui/journal';
import { troopTotal } from '../data/troops';

export const COMPANION_RELATION = 10;
const round = (n: number) => Math.round(n * 10) / 10;
export function rewardSummary(reward: Reward): string {
  const parts: string[] = [];
  if (reward.xp) parts.push(`+${reward.xp} XP`);
  if (reward.gold) parts.push(`${reward.gold>0?'+':''}${reward.gold} ouro`);
  if (reward.food) parts.push(`+${reward.food} comida`);
  if (reward.influence) parts.push(`${reward.influence>0?'+':''}${reward.influence} influência`);
  for (const [career, xp] of Object.entries(reward.careerXp ?? {})) parts.push(`+${xp} XP de ${CAREER_LABEL[career as AgentClass]}`);
  for (const [id, amount] of Object.entries(reward.skillXp ?? {})) parts.push(`+${amount} ${skillById.get(id as Parameters<typeof skillById.get>[0])?.name ?? id}`);
  if (reward.characterRelation) parts.push(`+${reward.characterRelation.amount} relação com ${heroById.get(reward.characterRelation.characterId)?.name ?? 'o solicitante'}`);
  if (reward.houseRelation) parts.push(`+${reward.houseRelation.amount} relação com a Casa local`);
  if (reward.localInfluence) parts.push(`+${reward.localInfluence.amount} influência local`);
  for (const [id, amount] of Object.entries(reward.goods ?? {}) as [GoodId, number][]) {
    parts.push(`${amount > 0 ? "+" : ""}${amount} ${goodById.get(id)?.name.toLowerCase() ?? id}`);
  }
  return parts.join(' · ') || 'Sem alteração de recursos.';
}
function logged(s: GameState, kind: JournalKind, text: string): GameState {
  const sequence = s.adventure.sequence + 1;
  return { ...s, adventure:{ ...s.adventure, sequence, chronicle:[
    {id:sequence,kind,text,hours:s.journey?.hours ?? 0}, ...s.adventure.chronicle,
  ].slice(0,80) } };
}
export function recordJourney(kind: JournalKind, text: string) {
  update(s=>logged(s,kind,text));
}
export function tutorialFlag(flag: keyof Tutorial, value = true) {
  if (getState().adventure.tutorial[flag] === value) return;
  update(s=>({...s,adventure:{...s.adventure,tutorial:{...s.adventure.tutorial,[flag]:value}}}));
}
export function dismissNotice() {
  update(s=>({...s,adventure:{...s.adventure,notice:null}}));
}
function endContract(s: GameState, contract: Contract, status:'completed'|'failed'): GameState {
  return {...s,adventure:{...s.adventure,contract:null,quest:null,
    history:[{...contract,status},...s.adventure.history].slice(0,30),
    finishedOffers:{...s.adventure.finishedOffers,[contract.id]:status},
  }};
}
/** Called on travel checkpoints, on arrival and before the tab goes into the background. */
export function saveJourney(journey: JourneySave) {
  update(s=>{
    let next: GameState = {...s,journey};
    const contract = next.adventure.contract;
    if (contract && journey.hours > contract.deadline) {
      next = endContract(next,contract,'failed');
      next = logged(next,'evento',`Prazo encerrado: ${contract.title}. Você pode procurar outro trabalho.`);
      next.adventure = {...next.adventure,notice:{title:'O prazo terminou',text:`${contract.title} não foi entregue a tempo. Procure outro contrato em uma localidade. Nenhuma recompensa foi concedida.`,levelUp:false}};
    }
    return next;
  });
}
export function acceptContract(id: string, sourceId: string): boolean {
  const s=getState();
  if (!isPresent(sourceId,s) || s.adventure.contract || s.adventure.event) return false;
  const contract=contractsAt(sourceId,s).find(c=>c.id===id);
  if (!contract) return false;
  update(g=>logged({...g,adventure:{...g.adventure,contract,quest:beginQuest(contract),tutorial:{...g.adventure.tutorial,accepted:true}}},'evento',`Contrato aceito: ${contract.title}.`));
  return true;
}
export function abandonContract() {
  const s=getState(), c=s.adventure.contract;
  if (!c) return;
  update(g=>logged(endContract(g,c,'failed'),'evento',`Você encerrou o contrato: ${c.title}. Sem recompensa.`));
}
export function completeContract(): boolean {
  const s=getState(), c=s.adventure.contract;
  if (!c || s.adventure.event || !isPresent(c.destinationId,s) || (s.journey?.hours??0)>c.deadline || s.adventure.finishedOffers[c.id]) return false;
  if (!hasContractCargo(s,c)) {
    const cargo = c.cargo!;
    update(g=>({...g,adventure:{...g.adventure,notice:{title:"A encomenda está incompleta",text:`Ainda faltam ${cargo.amount - cargoOwned(g,cargo.goodId)} ${goodById.get(cargo.goodId)?.name.toLowerCase()}. Compre a carga num mercado antes de entregar.`,levelUp:false}}}));
    return false;
  }
  update(g=>{
    let next=consumeContractCargo(g,c);
    next=withReward(next,c.reward);
    const levelUp=next.level>g.level;
    const growth=levelUp ? ` Nível ${next.level}! +${next.skillPoints-g.skillPoints} ponto(s) de habilidade${next.attributePoints>g.attributePoints ? ` e +${next.attributePoints-g.attributePoints} de atributo` : ''}.` : '';
    next=endContract(next,c,'completed');
    next={...next,adventure:{...next.adventure,tutorial:{...next.adventure.tutorial,completed:true},notice:{title:levelUp?'Sua história avança':'Contrato concluído',text:`${c.title}. ${rewardSummary(c.reward)}.${growth}`,levelUp}}};
    return logged(next,'evento',`Contrato concluído: ${c.title}. ${rewardSummary(c.reward)}.${growth}`);
  });
  return true;
}
/** The first encounter teaches decisions; later ones are spaced and rolled at road checkpoints. */
export function checkRoadEvent(edge: RouteEdge, roll: number) {
  const s=getState(), a=s.adventure, hours=s.journey?.hours??0;
  if (a.event || a.notice || a.raid || a.battle || a.quest?.pending) return;
  // O MIOLO DA MISSÃO vem antes de qualquer encontro genérico: todo encargo
  // tem um segundo ato, e ele acontece no primeiro posto depois de aceitar.
  if (a.contract && a.quest && !a.quest.complicated && a.quest.phase==='a_caminho') {
    const raw=complicationFor(a.contract);
    const beat=raw.kind==='batalha'?{...raw,terrain:edge.terrain}:raw;
    update(g=>logged({...g,adventure:{...g.adventure,quest:{...g.adventure.quest!,pending:beat,complicated:true,decisionRoll:Math.random()}}},'evento',beat.title));
    return;
  }
  if (hours<a.nextEventHour) return;
  // Estrada perigosa cospe bando. É a razão de existir tropa — e a razão de
  // uma rota curta e arriscada não ser automaticamente a melhor.
  if (edge.danger>0.12 && roll<edge.danger*0.55) {
    const day=Math.floor(hours/24)+1;
    const raid=makeRaid(edge.id,edge.danger,day,edge.terrain);
    update(g=>({...g,adventure:{...g.adventure,raid,nextEventHour:hours+10}}));
    return;
  }
  if (a.eventCount>0 && roll>Math.min(.7,.25+edge.eventChance+edge.danger*.2)) return;
  const candidates=roadEvents.filter(e=>e.id!==a.lastEventId);
  const def=a.eventCount===0 ? roadEvents[0] : candidates[Math.floor(Math.random()*candidates.length)];
  update(g=>({...g,adventure:{...g.adventure,
    event:{id:`encounter-${g.adventure.eventCount+1}`,definitionId:def.id,roll:Math.random(),hours},
    eventCount:g.adventure.eventCount+1,nextEventHour:hours+12,lastEventId:def.id,
  }}));
}
export function resolveRoadEvent(eventId: string, choiceId: string): boolean {
  const s=getState(), event=s.adventure.event;
  if (!event || event.id!==eventId) return false;
  const definition=roadEventById.get(event.definitionId);
  const choice=definition?.choices.find(c=>c.id===choiceId);
  if (!choice || s.gold<(choice.cost??0)) return false;
  const success=event.roll<choiceChance(choice,s);
  const reward=success ? choice.reward : choice.failure??{};
  update(g=>{
    const next=withReward(g,{...reward,gold:(reward.gold??0)-(choice.cost??0)});
    const levelUp=next.level>g.level;
    const text=`${success?choice.successText:choice.failureText} ${rewardSummary(reward)}${choice.cost?` · ${choice.cost} ouro gasto.`:''}${levelUp?` Nível ${next.level}: abra sua ficha para distribuir os pontos.`:''}`;
    return logged({...next,adventure:{...next.adventure,event:null,
      tutorial:{...next.adventure.tutorial,eventResolved:true},
      notice:{title:success?'Sua decisão fez diferença':'Nem tudo saiu como esperado',text,levelUp},
    }},'evento',`${definition!.title}: ${text}`);
  });
  return true;
}
export function canRecruitCompanion(id: string, s: GameState=getState()): boolean {
  const c=s.companions[id];
  return !!c && c.status==='AVAILABLE' && c.relation>=COMPANION_RELATION && isPresent(c.locationPoiId,s);
}
export function recruitCompanion(id: string): boolean {
  if (!canRecruitCompanion(id)) return false;
  update(s=>logged({...s,companions:{...s.companions,[id]:{...s.companions[id],status:'IN_PARTY'}},
    adventure:{...s.adventure,tutorial:{...s.adventure.tutorial,recruited:true}},
  },'evento',`${heroById.get(id)?.name} agora viaja com você.`));
  return true;
}
export function remainingContractHours(s: GameState): number {
  return round(Math.max(0,(s.adventure.contract?.deadline??0)-(s.journey?.hours??0)));
}

/**
 * FECHA OS DIAS QUE PASSARAM.
 *
 * Chamada pelo relógio sempre que o dia vira. Cada dia é aplicado UM a um e
 * escrito na crônica: quem ficou três dias sem soldo precisa ver os três, e
 * não um total que não explica nada.
 *
 * Deserção levanta aviso — é a única coisa aqui que o jogador não pode deixar
 * passar despercebida, porque muda o que ele pode fazer a seguir.
 */
export function settleDays(upToDay: number) {
  // Sai ANTES de `update`: um `update` que devolve o mesmo estado ainda
  // notifica todo mundo, e chamado a cada quadro isso redesenhava o mapa
  // sessenta vezes por segundo — o relógio parava de andar de tanto React.
  const now = getState();
  if (!now.started || now.dayProcessed >= upToDay) return;
  update(s => {
    if (!s.started || s.dayProcessed >= upToDay) return s;
    let next = s;
    let deserted = 0;
    // Um teto evita que uma aba esquecida aberta cobre um ano de soldo.
    for (let guard = 0; next.dayProcessed < upToDay && guard < 30; guard++) {
      const result = applyDay(next, next.dayProcessed + 1);
      next = result.state;
      deserted += result.report.deserted;
      const line = reportLine(result.report, next.troops);
      if (line) next = logged(next, 'evento', line);
    }
    // O tabuleiro se mexe de poucos em poucos dias, e o que muda vira notícia.
    if (upToDay - (next.worldTickDay || 0) >= WORLD_TICK_DAYS) {
      const rolls = Array.from({ length: 12 }, () => Math.random());
      const world = advanceWorld(next, upToDay, rolls);
      next = world.state;
      for (const item of world.news) next = logged(next, item.kind === 'paz' ? 'evento' : 'fronteira', item.text);
    }
    next = { ...next, dayProcessed: upToDay };
    if (deserted > 0) {
      next = { ...next, adventure: { ...next.adventure, notice: {
        title: 'Homens foram embora',
        text: `${deserted} soldado(s) desertaram por falta de soldo ou de comida. Pague o que deve e reabasteça antes de perder o resto.`,
        levelUp: false,
      } } };
    }
    return next;
  });
}

/**
 * Resolve o encontro com um bando e escreve o resultado na crônica.
 *
 * O desfecho é aplicado UMA vez: o sorteio acontece aqui, não na tela, para
 * que reabrir o painel não sorteie de novo.
 */
export function actOnRaid(action: 'lutar'|'fugir'|'pagar'): boolean {
  const s=getState(), raid=s.adventure.raid;
  if (!raid) return false;
  const result=resolveRaid(s,raid,action,Math.random());
  update(g=>{
    let next=withReward(result.state,{xp:result.outcome.xp,
      ...(result.outcome.kind==='vitoria'?{careerXp:{MILITARY:45},skillXp:{tatica:2}}:{})});
    const levelUp=next.level>g.level;
    next={...next,journey:next.journey?{...next.journey,hours:next.journey.hours+result.outcome.hours}:null};
    next={...next,adventure:{...next.adventure,raid:null,
      notice:{title:TITLE[result.outcome.kind],text:result.outcome.text+(levelUp?` Nível ${next.level}: abra sua ficha para distribuir os pontos.`:''),levelUp},
    }};
    return logged(next,'evento',`${raid.name}: ${result.outcome.text}`);
  });
  return true;
}
const TITLE: Record<string,string> = {
  vitoria:'O bando quebrou', derrota:'Vocês perderam a estrada', fuga:'Escaparam',
  fuga_falhou:'Não deu para fugir', pedagio:'Pedágio pago',
};
export type { Raid };

/* ======================= OS TRÊS ATOS DO ENCARGO ======================= */

/** Aplica a opção escolhida num beat de missão e segue para o ato seguinte. */
export function chooseQuestOption(optionId: string): boolean {
  const s=getState(), quest=s.adventure.quest, beat=quest?.pending;
  if (!quest || !beat || beat.kind!=='escolha') return false;
  const option=beat.options.find(o=>o.id===optionId);
  if (!option) return false;
  if (option.goldCost && s.gold<option.goldCost) return false;

  update(g=>{
    const success=!option.check || (quest.decisionRoll??Math.random())<questOptionChance(option,g);
    const result=success ? option.result : option.failureResult ?? "A tentativa não convence.";
    const reward=success ? option.reward??{} : option.failureReward??{};
    let next=withReward(g,reward);
    const closing=quest.phase==='entrega';
    const choices=[...quest.choices,success?option.id:`${option.id}:falhou`];
    const fails=success ? option.fails : option.failureFails;

    if (fails && g.adventure.contract) {
      next=endContract(next,g.adventure.contract,'failed');
    } else if (closing && g.adventure.contract) {
      // O fecho É a entrega: paga o contrato junto com a escolha.
      const c=g.adventure.contract;
      if (!hasContractCargo(next,c)) return {...g,adventure:{...g.adventure,notice:{title:"A encomenda está incompleta",text:"A pessoa confere a carga e encontra menos do que foi combinado. Compre o restante num mercado e volte.",levelUp:false}}};
      next=consumeContractCargo(next,c);
      next=withReward(next,c.reward);
      next=endContract(next,c,'completed');
      next={...next,adventure:{...next.adventure,tutorial:{...next.adventure.tutorial,completed:true}}};
    } else {
      next={...next,adventure:{...next.adventure,quest:{...quest,pending:null,choices,decisionRoll:null}}};
    }

    const levelUp=next.level>g.level;
    return logged({...next,adventure:{...next.adventure,notice:{
      title:beat.title,
      text:`${success||!option.check?'':'A tentativa falhou. '}${result} ${rewardSummary(reward)}.`+(levelUp?` Nível ${next.level}: abra sua ficha para distribuir os pontos.`:''),
      levelUp,
    }}},'evento',`${beat.title}: ${result} ${rewardSummary(reward)}.`);
  });
  return true;
}

/** A complicação armada entra em combate de verdade. */
export function startQuestBattle(): boolean {
  const s=getState(), beat=s.adventure.quest?.pending;
  if (!beat || beat.kind!=='batalha') return false;
  update(g=>({...g,adventure:{...g.adventure,battle:startBattle(g,beat.band,beat.enemyName,beat.terrain)}}));
  return true;
}

/** Um bando de estrada também vira batalha, em vez de um dado só. */
export function startRaidBattle(): boolean {
  const s=getState(), raid=s.adventure.raid;
  if (!raid) return false;
  update(g=>({...g,adventure:{...g.adventure,battle:startBattle(g,raid.band,raid.name,raid.terrain)}}));
  return true;
}

/** Uma rodada de batalha. Quando ela termina, o resultado cai na campanha. */
export function giveOrder(order: Order): boolean {
  const s=getState(), battle=s.adventure.battle;
  if (!battle || battle.result!=='andamento') return false;
  const next=playRound(s,battle,order,Math.random());
  if (next.result==='andamento') {
    update(g=>({...g,adventure:{...g.adventure,battle:next}}));
    return true;
  }
  finishBattle(next);
  return true;
}

/** Uma única conversa durante o combate. Se resolver a batalha, fecha o resultado imediatamente. */
export function attemptParley(kind: ParleyKind): boolean {
  const s=getState(),battle=s.adventure.battle;
  if(!battle||battle.parleyAttempted||battle.result!=='andamento')return false;
  const next=resolveParley(s,battle,kind);
  if(next.result==='andamento')update(g=>({...g,adventure:{...g.adventure,battle:next}}));
  else finishBattle(next);
  return true;
}

function finishBattle(battle: ReturnType<typeof playRound>) {
  update(g=>{
    const beat=g.adventure.quest?.pending;
    const fromQuest=beat?.kind==='batalha';
    const won=battle.result==='vitoria';

    const wounded=addTroopCounts(g.wounded,battle.myWoundedTroops??{});
    const captured=battle.result==='vitoria'?battle.prisoners??{}:{};
    const prisoners=addTroopCounts(g.prisoners,captured);
    let next: GameState={...g,troops:battle.mine,wounded,prisoners,gold:Math.max(0,g.gold-(battle.tribute??0)),
      adventure:{...g.adventure,battlesWon:g.adventure.battlesWon+(battle.result==='vitoria'?1:0)}};
    next=withReward(next,{
      xp:won?Math.round(50+battle.theirLosses*6):20,
      gold:won?battle.loot:0,
      careerXp:{MILITARY:won?60:20},
      skillXp:{tatica:won?3:1},
    });
    const levelUp=next.level>g.level;

    let text=battle.log[battle.log.length-1]??'';
    if (won) text+=` Dos seus, ${battle.myDead??battle.myLosses} morreram e ${battle.myWounded??0} ficaram feridos. Você fez ${troopTotal(captured)} prisioneiro(s). Despojos: ${battle.loot} moedas.`;
    else text+=` Dos seus, ${battle.myDead??battle.myLosses} morreram e ${battle.myWounded??0} ficaram feridos.${battle.tribute?` A passagem custou ${battle.tribute} moedas.`:''}`;

    if (fromQuest && beat?.kind==='batalha') {
      text+=` ${won?beat.onWin:beat.onLose}`;
      if (!won && beat.loseReward) next=withReward(next,beat.loseReward);
      const quest=next.adventure.quest!;
      next={...next,adventure:{...next.adventure,quest:{...quest,pending:null,choices:[...quest.choices,won?'venceu':'perdeu']}}};
      if (!won && next.adventure.contract) next=endContract(next,next.adventure.contract,'failed');
    } else if (g.adventure.offer?.kind === 'cerco' && g.adventure.offer.accepted) {
      // Cerco quebrado: a recompensa do chamado sai aqui, e não na chegada.
      const offer = g.adventure.offer;
      if (won) {
        next = withReward(next, offer.reward);
        text += ` O cerco de ${poiName(offer.poiId)} está quebrado, e a aldeia sabe quem o quebrou.`;
      } else {
        text += ` O bando continua onde estava, e ${poiName(offer.poiId)} vai pagar por isso.`;
      }
      next = { ...next, adventure: { ...next.adventure, offer: null } };
    } else if (battle.result==='derrota') {
      // Derrota contra bando avulso: eles levam o que dá.
      const robbed=Math.round(next.gold*0.3);
      next={...next,gold:next.gold-robbed};
      text+=` Levaram ${robbed} moedas.`;
    }

    next={...next,adventure:{...next.adventure,battle:null,raid:null,
      notice:{title:won?'O campo é seu':battle.result==='retirada'?'Vocês saíram da linha':'A linha quebrou',
        text:text+(levelUp?` Nível ${next.level}: abra sua ficha para distribuir os pontos.`:''),levelUp},
    }};
    return logged(next,'evento',`${battle.enemyName}: ${text}`);
  });
}

/** Mercadores de resgate pagam por todos os cativos de uma vez. */
export function ransomAllPrisoners(): boolean {
  const s=getState(),count=troopTotal(s.prisoners);
  if(!count)return false;
  const value=prisonerRansom(s.prisoners);
  update(g=>{
    const next=withReward({...g,prisoners:{}},{gold:value,xp:Math.min(45,count*4),careerXp:{TRADE:Math.min(30,count*3)},skillXp:{negociacao:1}});
    return logged(next,'evento',`${count} prisioneiro(s) resgatados por ${value} moedas.`);
  });
  return true;
}

/** Na chegada, a entrega vira o TERCEIRO ato em vez de um botão. */
export function openClosing(): boolean {
  const s=getState(), c=s.adventure.contract, quest=s.adventure.quest;
  if (!c || !quest || !isPresent(c.destinationId,s)) return false;
  if (!hasContractCargo(s,c)) {
    const cargo=c.cargo!;
    update(g=>({...g,adventure:{...g.adventure,notice:{title:"Falta mercadoria",text:`O contrato exige ${cargo.amount} ${goodById.get(cargo.goodId)?.name.toLowerCase()}. Você carrega ${cargoOwned(g,cargo.goodId)}. Procure um mercado e complete a encomenda.`,levelUp:false}}}));
    return true;
  }
  update(g=>({...g,adventure:{...g.adventure,quest:{...quest,phase:'entrega',pending:closingFor(c,quest),decisionRoll:Math.random()}}}));
  return true;
}

function cargoOwned(s: GameState, id: GoodId): number {
  return id === "provisions" ? s.food : s.inventory[id] ?? 0;
}
export function hasContractCargo(s: GameState, contract: Contract): boolean {
  return !contract.cargo || cargoOwned(s,contract.cargo.goodId) >= contract.cargo.amount;
}
function consumeContractCargo(s: GameState, contract: Contract): GameState {
  if (!contract.cargo) return s;
  const {goodId,amount}=contract.cargo;
  if (goodId === "provisions") return {...s,food:Math.max(0,s.food-amount)};
  const inventory={...s.inventory,[goodId]:Math.max(0,(s.inventory[goodId]??0)-amount)};
  const owned=s.inventory[goodId]??0;
  const inventoryCost={...s.inventoryCost,[goodId]:Math.max(0,(s.inventoryCost[goodId]??0)*(owned > 0 ? (owned-amount)/owned : 0))};
  return {...s,inventory,inventoryCost};
}

/* ====================== A CAMPANHA PRINCIPAL ========================== */

/**
 * Verifica se o passo atual da campanha foi cumprido.
 *
 * Chamada a cada mudança de estado. Sai barata quando não há nada a fazer,
 * que é a maior parte do tempo — e é por isso que pode ser chamada assim.
 */
export function checkStory() {
  const s = getState();
  if (!s.started) return;
  const story = s.adventure.story;
  if (story.done || story.pending) return;
  const step = currentStep(story);
  if (!step || !triggerMet(s, step)) return;

  update(g => {
    const current = currentStep(g.adventure.story);
    if (!current || g.adventure.story.pending) return g;
    // Passo sem cena avança sozinho; com cena, espera ser lido.
    if (!current.scene) {
      const next = withReward(g, current.reward ?? {});
      return logged(advance(next), 'evento', `Campanha: ${current.objective} — cumprido.`);
    }
    return { ...g, adventure: { ...g.adventure, story: { ...g.adventure.story, pending: current.id } } };
  });
}

function advance(s: GameState): GameState {
  const step = s.adventure.story.step + 1;
  const done = step >= allSteps.length;
  return { ...s, adventure: { ...s.adventure, story: { ...s.adventure.story, step, pending: null, done } } };
}

/** A resposta do jogador numa cena da campanha. */
export function chooseStoryOption(optionId: string): boolean {
  const s = getState();
  const story = s.adventure.story;
  const step = currentStep(story);
  if (!step || story.pending !== step.id || !step.scene) return false;
  const option = step.scene.options.find(o => o.id === optionId);
  if (!option) return false;

  update(g => {
    let next = withReward(g, { ...(step.reward ?? {}), ...(option.reward ?? {}) });
    const levelUp = next.level > g.level;
    // A campanha pode ENTREGAR terra. É o caminho para a primeira, que por
    // compra levaria cinquenta e seis encargos.
    if (option.grantFief) {
      next = { ...next, fiefOwners: { ...next.fiefOwners, [option.grantFief]: 'player' } };
    }
    if (option.flag) {
      next = { ...next, adventure: { ...next.adventure, story: {
        ...next.adventure.story,
        flags: next.adventure.story.flags.includes(option.flag) ? next.adventure.story.flags : [...next.adventure.story.flags, option.flag],
      } } };
    }
    next = advance(next);
    const chapter = chapterOfStep.get(step.id);
    return logged({ ...next, adventure: { ...next.adventure, notice: {
      title: chapter ? `${chapter.title}` : 'A campanha avança',
      text: option.result + (levelUp ? ` Nível ${next.level}: abra sua ficha para distribuir os pontos.` : ''),
      levelUp,
    } } }, 'evento', `Campanha — ${step.objective}: ${option.result}`);
  });
  return true;
}

/* ========================== CHAMADOS ================================== */

/**
 * Faz aparecer um chamado quando o jogador está sem nada nas mãos.
 *
 * A condição é deliberada: só procura quem está livre. Um chamado por cima de
 * um encargo em curso seria ruído; um chamado num jogador ocioso é o que
 * apaga o silêncio depois de uma entrega.
 */
export function checkOffer(stop: RoadStop) {
  const s = getState();
  if (!s.started) return;
  const a = s.adventure;
  const hours = s.journey?.hours ?? 0;
  if (a.offer || a.contract || a.event || a.notice || a.raid || a.battle || a.story.pending) return;
  if (hours < a.nextOfferHour) return;
  const offer = makeOffer(stop, hours);
  if (!offer) return;
  update(g => logged({ ...g, adventure: { ...g.adventure, offer, nextOfferHour: hours + 46 } }, 'evento', `${offer.title}.`));
}

/** Aceitar põe o chamado no relógio; recusar o manda embora. */
export function answerOffer(accept: boolean): boolean {
  const s = getState();
  const offer = s.adventure.offer;
  if (!offer) return false;
  update(g => accept
    ? { ...g, adventure: { ...g.adventure, offer: { ...offer, accepted: true } } }
    : logged({ ...g, adventure: { ...g.adventure, offer: null } }, 'evento', `Você deixou passar: ${offer.title}.`));
  return true;
}

/** Chegou ao lugar do chamado, ou o prazo acabou. */
export function checkOfferArrival() {
  const s = getState();
  const offer = s.adventure.offer;
  if (!offer) return;
  const hours = s.journey?.hours ?? 0;

  if (hours > offer.expiresAt) {
    update(g => logged({ ...g, adventure: { ...g.adventure, offer: null } }, 'evento',
      `O prazo de "${offer.title}" acabou sem você.`));
    return;
  }
  if (!offer.accepted || !isPresent(offer.poiId, s)) return;

  // Cerco: chegar não basta, é preciso quebrar o bando.
  if (offer.kind === 'cerco' && offer.band) {
    update(g => ({ ...g, adventure: { ...g.adventure, battle: startBattle(g, offer.band!, `Bando em ${poiName(offer.poiId)}`), offer: { ...offer, accepted: true } } }));
    return;
  }

  update(g => {
    const next = withReward(g, offer.reward);
    const levelUp = next.level > g.level;
    return logged({ ...next, adventure: { ...next.adventure, offer: null, notice: {
      title: offer.title,
      text: (offer.kind === 'convocacao'
        ? 'Você chega, é recebido e ouve o que tinham a dizer. Foi útil ter vindo.'
        : 'A caravana chega inteira, e o carroceiro conta as moedas na sua mão sem discutir.')
        + (levelUp ? ` Nível ${next.level}: abra sua ficha para distribuir os pontos.` : ''),
      levelUp,
    } } }, 'evento', `${offer.title}: cumprido.`);
  });
}

function poiName(id: string): string {
  return poiById.get(id)?.name ?? id;
}

export type { Offer };
