import { getState, update, type GameState } from './store';
import type { Contract, JourneySave, Tutorial } from './adventureState';
import { withReward, type Reward } from './experience';
import { contractsAt } from './contracts';
import { choiceChance, roadEventById, roadEvents } from './roadEvents';
import { makeRaid, resolveRaid, type Raid } from './raid';
import { isPresent } from './presence';
import { applyDay, reportLine } from './daily';
import { heroById } from '../data/heroes';
import { skillById } from '../data/skills';
import { CAREER_LABEL } from './careers';
import type { AgentClass, RouteEdge } from '../world/types';
import type { JournalKind } from '../ui/journal';

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
  return {...s,adventure:{...s.adventure,contract:null,
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
  update(g=>logged({...g,adventure:{...g.adventure,contract,tutorial:{...g.adventure.tutorial,accepted:true}}},'evento',`Contrato aceito: ${contract.title}.`));
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
  update(g=>{
    let next=withReward(g,c.reward);
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
  if (a.event || a.notice || a.raid || hours<a.nextEventHour) return;
  // Estrada perigosa cospe bando. É a razão de existir tropa — e a razão de
  // uma rota curta e arriscada não ser automaticamente a melhor.
  if (edge.danger>0.12 && roll<edge.danger*0.55) {
    const day=Math.floor(hours/24)+1;
    const raid=makeRaid(edge.id,edge.danger,day);
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
