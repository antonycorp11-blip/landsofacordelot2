import type { AgentClass } from '../world/types';
import type { Reward } from './experience';
import type { JournalEntry } from '../ui/journal';
import type { RoadStopSave } from '../world/roadStops';
import type { Raid } from './raid';
import type { QuestState } from './quests';
import type { Battle } from './battle';
import { freshStory, type StoryState } from './story';
import type { Offer } from './offers';
import type { GoodId } from '../data/goods';

export type JourneySave = {
  /** Nó em que o viajante está, ou `null` quando ele parou no meio da estrada. */
  currentNodeId: string | null;
  /** Nó de destino, quando o destino é um lugar. */
  destinationId: string | null;
  at: RoadStopSave;
  from: RoadStopSave | null;
  to: RoadStopSave | null;
  distance: number;
  hours: number;
  speed: number;
  paused: boolean;
};
export type Contract = {
  id: string;
  title: string;
  description: string;
  career: AgentClass;
  sourceId: string;
  destinationId: string;
  patronId?: string;
  travelHours: number;
  acceptedAt: number;
  deadline: number;
  status: 'active' | 'completed' | 'failed';
  reward: Reward;
  /** Encomenda comercial que precisa estar na carga no momento da entrega. */
  cargo?: { goodId: GoodId; amount: number };
};
export type Tutorial = {
  introSeen: boolean;
  hidden: boolean;
  accepted: boolean;
  departed: boolean;
  eventResolved: boolean;
  completed: boolean;
  sheetViewed: boolean;
  recruited: boolean;
  /** Já abriu a leitura de uma força no mapa. */
  agentInspected: boolean;
  /** Já deu uma ordem de perseguição. */
  pursuitStarted: boolean;
  /** Já iniciou um combate a partir do mapa. */
  forceAttacked: boolean;
  /** Já retirou uma força hostil de circulação. */
  forceDefeated: boolean;
  /** Abriu a vista política ao menos uma vez. */
  politicsSeen: boolean;
};
export type AdventureState = {
  tutorial: Tutorial;
  contract: Contract | null;
  history: Contract[];
  finishedOffers: Record<string, 'completed' | 'failed'>;
  event: { id: string; definitionId: string; roll: number; hours: number } | null;
  /** Bando bloqueando a estrada. Trava a viagem até você decidir o que fazer. */
  raid: Raid | null;
  /** Os três atos do encargo em curso. */
  quest: QuestState | null;
  /** Batalha em andamento, rodada a rodada. */
  battle: Battle | null;
  eventCount: number;
  /** Batalhas vencidas, para a campanha principal poder pedir uma. */
  battlesWon: number;
  /** Chamado com prazo que apareceu sozinho. Um por vez. */
  offer: Offer | null;
  /** Hora do mundo em que o próximo chamado pode aparecer. */
  nextOfferHour: number;
  /** A linha que atravessa a partida inteira. */
  story: StoryState;
  nextEventHour: number;
  lastEventId: string | null;
  sequence: number;
  notice: { title: string; text: string; levelUp: boolean } | null;
  chronicle: JournalEntry[];
};
export function freshAdventure(): AdventureState {
  return {
    tutorial: { introSeen:false, hidden:false, accepted:false, departed:false, eventResolved:false, completed:false, sheetViewed:false, recruited:false, agentInspected:false, pursuitStarted:false, forceAttacked:false, forceDefeated:false, politicsSeen:false },
    contract:null, history:[], finishedOffers:{}, event:null, raid:null, quest:null, battle:null, eventCount:0, battlesWon:0, offer:null, nextOfferHour:20, story:freshStory(),
    nextEventHour:0, lastEventId:null, sequence:0, notice:null, chronicle:[],
  };
}
