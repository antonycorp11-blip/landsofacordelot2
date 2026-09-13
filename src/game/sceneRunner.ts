/**
 * QUEM FAZ A CENA ACONTECER.
 *
 * A cena é dado; isto é o motor. Ele abre um momento, resolve o teste quando
 * há um, aplica o que a escolha produziu — conhecimento, provas, marcas,
 * recompensa — e leva ao momento seguinte ou devolve o mapa.
 *
 * Uma regra importante: a cena NÃO se anuncia como missão. Não há "missão
 * aceita", não há recompensa em destaque. O que aparece depois é uma linha
 * dizendo que a crônica mudou — o resto o jogador descobre no diário, se
 * quiser.
 */
import { carriageScene } from "./scenes/carriage";
import type { Cinematic, SceneChoice, SceneOutcome } from "./cinematics";
import { startBattle } from "./battle";
import { withReward } from "./experience";
import { getState, update, type GameState } from "./store";
import { REVEAL_FLAG } from "./balance";
import type { TroopCount } from "../data/troops";

const SCENES: Record<string, Cinematic> = {
  [carriageScene.id]: carriageScene,
};

export function sceneById(id: string): Cinematic | undefined {
  return SCENES[id];
}

/** Chance de passar num teste da cena: atributo pesa, a melhor perícia soma. */
export function sceneChance(choice: SceneChoice, s: GameState = getState()): number {
  if (!choice.check) return 1;
  const best = Math.max(...choice.check.skills.map((id) => s.skills[id] ?? 0));
  return Math.min(0.95, 0.4 + s.attributes[choice.check.attribute] * 0.055 + best * 0.003);
}

export function openScene(sceneId: string, eventId?: string): boolean {
  const scene = SCENES[sceneId];
  const s = getState();
  if (!scene || s.adventure.cinematic) return false;
  update((g) => ({
    ...g,
    adventure: { ...g.adventure, cinematic: { sceneId, beatId: scene.first, eventId: eventId ?? null } },
  }));
  return true;
}

function applyKnowledge(g: GameState, outcome: SceneOutcome): GameState {
  const add = (list: string[], extra?: string[]) =>
    extra ? [...list, ...extra.filter((x) => !list.includes(x))] : list;
  return {
    ...g,
    knowledge: {
      facts: add(g.knowledge.facts, outcome.facts),
      questions: add(g.knowledge.questions, outcome.questions),
      evidence: add(g.knowledge.evidence, outcome.evidence),
    },
    storyFlags: add(g.storyFlags, outcome.flags),
    balance: {
      ...g.balance,
      // A cena que mostra o preço de um selo é a que abre o segundo polo.
      revealed: g.balance.revealed || !!outcome.flags?.includes(REVEAL_FLAG),
      tilt: outcome.balance
        ? Math.max(-100, Math.min(100, g.balance.tilt + outcome.balance))
        : g.balance.tilt,
      last: outcome.balance
        ? { amount: outcome.balance, reason: outcome.balanceReason ?? "Pelo que você escolheu", at: Date.now() }
        : g.balance.last,
    },
  };
}

/** A escolha do jogador. Devolve o texto do que aconteceu, para a cena mostrar. */
export function chooseScene(choiceId: string): string | null {
  const s = getState();
  const active = s.adventure.cinematic;
  if (!active) return null;
  const scene = SCENES[active.sceneId];
  const beat = scene?.beats[active.beatId];
  const choice = beat?.choices.find((c) => c.id === choiceId);
  if (!choice) return null;

  const passed = !choice.check || Math.random() < sceneChance(choice, s);
  const outcome = passed ? choice.outcome : choice.failure ?? choice.outcome;

  update((g) => {
    let next = applyKnowledge(g, outcome);
    next = withReward(next, outcome.reward ?? {});

    // O evento no mapa guarda o que sobrou dele.
    if (outcome.eventState && active.eventId && next.worldEvents[active.eventId]) {
      next = { ...next, worldEvents: { ...next.worldEvents, [active.eventId]: {
        ...next.worldEvents[active.eventId], state: outcome.eventState, resolved: true,
      } } };
    }

    // Briga interrompe a cena: ela volta quando o campo estiver resolvido.
    if (outcome.battle) {
      return {
        ...next,
        adventure: {
          ...next.adventure,
          cinematic: null,
          battle: startBattle(next, outcome.battle.band as TroopCount, outcome.battle.name),
        },
      };
    }

    if (outcome.end || !outcome.next) {
      return { ...next, adventure: { ...next.adventure, cinematic: null } };
    }
    return {
      ...next,
      adventure: { ...next.adventure, cinematic: { ...active, beatId: outcome.next } },
    };
  });

  return outcome.text || null;
}

export function closeScene() {
  update((g) => ({ ...g, adventure: { ...g.adventure, cinematic: null } }));
}
