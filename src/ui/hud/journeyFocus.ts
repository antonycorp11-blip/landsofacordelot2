import type { GameState } from "../../game/store";
import { chapterOfStep, currentStep } from "../../game/story";
import { poiById } from "../../world/valdoria";

export type JourneyFocus = {
  act: string;
  title: string;
  detail: string;
  progress: string | null;
  urgency: "normal" | "warning" | "danger";
  secondary: string | null;
};

/** What the player can do next, derived from the existing campaign state. */
export function journeyFocus(game: GameState, worldHours: number): JourneyFocus {
  const step = currentStep(game.adventure.story);
  const chapter = step ? chapterOfStep.get(step.id) : null;
  const chapterIndex = chapter && step ? chapter.steps.findIndex((s) => s.id === step.id) : -1;
  const contract = game.adventure.contract;
  const hunted = Object.values(game.worldForces).some((f) => f.playerPursuit === "tracking");
  const searched = !hunted && Object.values(game.worldForces).some((f) => f.playerPursuit === "searching");

  let act = chapter ? `Ato ${chapter.number} · ${chapter.title}` : "Ato I · A carruagem";
  let title = step?.objective ?? "Descubra o que houve na estrada.";
  let detail = step?.detail ?? "Uma carruagem tombada, um selo da Coroa e alguém que ainda pode falar.";
  let progress = chapterIndex >= 0 && chapter ? `${chapterIndex + 1} / ${chapter.steps.length}` : null;

  // The first act is driven by cinematic scenes rather than the chapter motor.
  // Its focus changes when the player gains the first piece of evidence.
  if (!game.storyFlags.includes("arco_ii_aberto")) {
    if (game.knowledge.evidence.includes("royal_seal") && !game.storyFlags.includes("mostrou_selo")) {
      title = "Mostre o selo a alguém que possa reconhecê-lo.";
      detail = "Um escrivão, mercador ou sacerdote de uma localidade pode saber de quem era.";
    } else if (game.adventure.cinematic) {
      title = "Veja o que restou da carruagem.";
      detail = "A primeira decisão começa nesta estrada.";
    }
    act = "Ato I · A carruagem";
    progress = null;
  }

  if (game.adventure.story.done) {
    act = "A crônica de Valdória";
    title = "Sua decisão mudou o reino.";
    detail = "A estrada ainda guarda gente, mercados e guerras que dependem de você.";
    progress = null;
  }

  if (step) {
    switch (step.trigger.kind) {
      case "contracts": {
        const count = game.adventure.history.filter((c) => c.status === "completed").length;
        progress = `${Math.min(count, step.trigger.count)} / ${step.trigger.count} encargos`;
        break;
      }
      case "battles":
        progress = `${Math.min(game.adventure.battlesWon, step.trigger.count)} / ${step.trigger.count} vitórias`;
        break;
      case "influence":
        progress = `${Math.floor(game.influence)} / ${step.trigger.amount} influência`;
        break;
      case "level":
        progress = `Nível ${game.level} / ${step.trigger.level}`;
        break;
      case "garrison": {
        const count = Object.entries(game.fiefOwners).reduce((total, [id, owner]) =>
          owner === "player" ? total + Object.values(game.fiefEstates[id]?.garrison ?? {}).reduce((n, v) => n + (v ?? 0), 0) : total, 0);
        progress = `${count} / ${step.trigger.count} na guarnição`;
        break;
      }
      case "prosperity": {
        const best = Object.entries(game.fiefOwners).reduce((value, [id, owner]) =>
          owner === "player" ? Math.max(value, game.fiefEstates[id]?.prosperity ?? 0) : value, 0);
        progress = `${Math.floor(best)} / ${step.trigger.value} prosperidade`;
        break;
      }
      case "visit":
        progress = poiById.get(step.trigger.poiId)?.name ?? null;
        break;
      case "unhunted":
        progress = hunted ? "No seu encalço" : searched ? "Procurando você" : "Rastro perdido";
        break;
    }
  }

  const deadlineHours = contract ? Math.max(0, contract.deadline - worldHours) : 0;
  const secondary = hunted ? "Perseguidores no seu encalço. Mata fechada encurta a visão."
    : searched ? "Estão procurando seu último rastro. Saia da estrada."
    : contract ? `Encargo: ${contract.title} · ${poiById.get(contract.destinationId)?.name ?? "destino"} · ${Math.ceil(deadlineHours / 24)}d restantes`
    : game.adventure.escort ? `Escolta em curso · ${poiById.get(game.adventure.escort.destinationId)?.name ?? "destino"}`
    : null;

  return { act, title, detail, progress, secondary,
    urgency: hunted ? "danger" : searched || (contract && deadlineHours < 24) ? "warning" : "normal" };
}
