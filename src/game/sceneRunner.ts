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
import { guardScene, merchantScene, priestScene, scribeScene } from "./scenes/leads";
import { deserterScene, halkaScene, postScene, sawmillScene } from "./scenes/favours";
import { breathScene, garrisonScene, incomeScene, siegeScene, widowScene } from "./scenes/arcoII";
import { auctionScene, barrowScene, goldsmithWidowScene, tomasScene } from "./scenes/arcoIII";
import { garrickScene } from "./scenes/arcoIV";
import { gateScene } from "./scenes/arcoV";
import { relicScene } from "./scenes/arcoVI";
import { councilScene, endingScene, warScene } from "./scenes/arcoVII";
import { edranScene } from "./scenes/edran";
import type { Cinematic, SceneChoice, SceneOutcome } from "./cinematics";
import { startBattle } from "./battle";
import { withReward } from "./experience";
import { getState, update, type GameState } from "./store";
import { heroById } from "../data/heroes";
import { REVEAL_FLAG } from "./balance";
import { beginPlayerPursuit } from "./worldForces";
import { loadStop } from "../world/roadStops";
import type { TroopCount } from "../data/troops";

const SCENES: Record<string, Cinematic> = {
  [carriageScene.id]: carriageScene,
  [scribeScene.id]: scribeScene,
  [merchantScene.id]: merchantScene,
  [priestScene.id]: priestScene,
  [guardScene.id]: guardScene,
  [halkaScene.id]: halkaScene,
  [sawmillScene.id]: sawmillScene,
  [postScene.id]: postScene,
  [deserterScene.id]: deserterScene,
  [edranScene.id]: edranScene,
  [breathScene.id]: breathScene,
  [widowScene.id]: widowScene,
  [incomeScene.id]: incomeScene,
  [garrisonScene.id]: garrisonScene,
  [siegeScene.id]: siegeScene,
  [tomasScene.id]: tomasScene,
  [auctionScene.id]: auctionScene,
  [goldsmithWidowScene.id]: goldsmithWidowScene,
  [barrowScene.id]: barrowScene,
  [garrickScene.id]: garrickScene,
  [gateScene.id]: gateScene,
  [relicScene.id]: relicScene,
  [councilScene.id]: councilScene,
  [warScene.id]: warScene,
  [endingScene.id]: endingScene,
};

export function sceneById(id: string): Cinematic | undefined {
  return SCENES[id];
}

/** Primeiro momento de uma cena, para quem abre sem passar por `openScene`. */
export function sceneFirstBeat(id: string): string {
  return SCENES[id]?.first ?? "";
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

/**
 * QUEM SAI ATRÁS DELE.
 *
 * A ordem parte de uma cena, mas a perseguição continua sendo por contato: a
 * força recebe o lugar onde a cena aconteceu como última posição conhecida e,
 * a partir daí, tem de achar o homem sozinha.
 */
function huntFrom(g: GameState, ids: string[]): GameState["worldForces"] {
  const at = loadStop(g.journey?.at);
  if (!at) return g.worldForces;
  const hours = g.journey?.hours ?? 0;
  const next = { ...g.worldForces };
  for (const id of ids) {
    const force = next[id];
    if (force) next[id] = beginPlayerPursuit(force, { x: at.x, y: at.y }, hours);
  }
  return next;
}

/** O nome que ele passa a carregar é o dele. */
function foundHouse(g: GameState): GameState {
  if (g.allegiance.kind === "independente") return g;
  const surname = heroById.get(g.heroId ?? "")?.name.split(" ").slice(-1)[0] ?? "Sem Nome";
  const day = Math.floor((g.journey?.hours ?? 0) / 24) + 1;
  return { ...g, allegiance: { kind: "independente", since: day, name: `Casa ${surname}` } };
}

/** Tira os homens das cercas e põe na linha. Eles voltam pelo painel da terra. */
function callGarrison(g: GameState): GameState {
  const troops: Record<string, number> = { ...(g.troops as Record<string, number>) };
  const estates = { ...g.fiefEstates };
  let moved = false;
  for (const [id, owner] of Object.entries(g.fiefOwners)) {
    if (owner !== "player") continue;
    const estate = estates[id];
    if (!estate) continue;
    for (const [troop, n] of Object.entries(estate.garrison)) {
      if (!n) continue;
      troops[troop] = (troops[troop] ?? 0) + n;
      moved = true;
    }
    estates[id] = { ...estate, garrison: {} };
  }
  return moved ? { ...g, troops: troops as GameState["troops"], fiefEstates: estates } : g;
}

function applyKnowledge(g: GameState, outcome: SceneOutcome): GameState {
  const add = (list: string[], extra?: string[]) =>
    extra ? [...list, ...extra.filter((x) => !list.includes(x))] : list;
  const drop = (list: string[], gone?: string[]) =>
    gone ? list.filter((x) => !gone.includes(x)) : list;
  return {
    ...g,
    knowledge: {
      facts: add(g.knowledge.facts, outcome.facts),
      questions: add(g.knowledge.questions, outcome.questions),
      evidence: drop(add(g.knowledge.evidence, outcome.evidence), outcome.removeEvidence),
    },
    storyFlags: add(g.storyFlags, outcome.flags),
    worldForces: outcome.hunt?.length ? huntFrom(g, outcome.hunt) : g.worldForces,
    fiefOwners: outcome.grantFief ? { ...g.fiefOwners, [outcome.grantFief]: "player" as const } : g.fiefOwners,
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

export type SceneResolution = { text: string; art?: SceneOutcome["art"] };

/** A escolha do jogador. Devolve o que aconteceu para a cena mostrar. */
export function chooseScene(choiceId: string): SceneResolution | null {
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

    // A guarnição desce da cerca antes de a linha ser formada.
    if (outcome.callGarrison) next = callGarrison(next);
    if (outcome.foundHouse) next = foundHouse(next);

    // Briga interrompe a cena: ela volta quando o campo estiver resolvido.
    if (outcome.battle) {
      return {
        ...next,
        adventure: {
          ...next.adventure,
          cinematic: null,
          sceneResume: outcome.battle.resume
            ? { sceneId: active.sceneId, beatId: outcome.battle.resume, eventId: active.eventId }
            : null,
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

  return outcome.text ? { text: outcome.text, art: outcome.art } : null;
}

export function closeScene() {
  update((g) => ({ ...g, adventure: { ...g.adventure, cinematic: null } }));
}
