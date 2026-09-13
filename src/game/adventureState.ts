import type { AgentClass } from '../world/types';
import type { Reward } from './experience';
import type { JournalEntry } from '../ui/journal';

export type JourneySave = {
  currentNodeId: string;
  fromNodeId: string;
  destinationId: string | null;
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
};
export type AdventureState = {
  tutorial: Tutorial;
  contract: Contract | null;
  history: Contract[];
  finishedOffers: Record<string, 'completed' | 'failed'>;
  event: { id: string; definitionId: string; roll: number; hours: number } | null;
  eventCount: number;
  nextEventHour: number;
  lastEventId: string | null;
  sequence: number;
  notice: { title: string; text: string; levelUp: boolean } | null;
  chronicle: JournalEntry[];
};
export function freshAdventure(): AdventureState {
  return {
    tutorial: { introSeen:false, hidden:false, accepted:false, departed:false, eventResolved:false, completed:false, sheetViewed:false, recruited:false },
    contract:null, history:[], finishedOffers:{}, event:null, eventCount:0,
    nextEventHour:0, lastEventId:null, sequence:0, notice:null, chronicle:[],
  };
}
