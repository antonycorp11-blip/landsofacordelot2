/**
 * O ACAMPAMENTO.
 *
 * A maior parte das horas deste jogo é passada entre dois lugares, e até agora
 * essas horas eram uma barra de progresso: você escolhia um destino e olhava.
 * Comida, feridos e perseguição existiam, mas todos em silêncio, somados uma
 * vez por dia num canto.
 *
 * O acampamento é onde essas coisas viram DECISÃO. Parar custa horas. Fogo
 * aceso recupera ferido e é visto de longe; fogo apagado esconde e não cura
 * ninguém. Comer bem gasta o que você talvez precise na semana que vem.
 *
 * Nada aqui é novo no modelo: é o modelo existindo na frente do jogador.
 */
import { troopTotal, troops as allTroops, type TroopCount, type TroopId } from "../data/troops";
import { getState, update, partyCompanions } from "./store";
import { wandererById } from "./worldForces";

export type CampPlan = "fogueira" | "frio" | "banquete";

export const CAMP_HOURS = 8;

/** Feridos que voltam à linha por plano. */
const HEAL = { fogueira: 0.55, frio: 0.15, banquete: 0.8 } as const;
/** Comida gasta além do consumo normal do dia. */
const EXTRA_FOOD = { fogueira: 0, frio: 0, banquete: 4 } as const;

export function woundedTotal(s = getState()): number {
  return troopTotal(s.wounded);
}

/** Quem está caçando você agora, e perto o bastante para ver uma fogueira. */
export function huntersNear(s = getState()): string[] {
  return Object.entries(s.worldForces)
    .filter(([, f]) => f.playerPursuit === "tracking" || f.playerPursuit === "searching")
    .map(([id]) => wandererById.get(id)?.name ?? id);
}

export function campBlocker(s = getState()): string | null {
  const a = s.adventure;
  if (!s.started) return "Nada para acampar ainda.";
  if (a.battle || a.raid || a.event || a.quest?.pending || a.cinematic) return "Agora não.";
  if (s.food < 1) return "Sem uma migalha na bolsa não se monta acampamento.";
  return null;
}

export function campCost(plan: CampPlan, s = getState()): { food: number; heal: number } {
  const hurt = woundedTotal(s);
  return { food: EXTRA_FOOD[plan], heal: Math.round(hurt * HEAL[plan]) };
}

/**
 * Levanta acampamento.
 *
 * Devolve o que aconteceu, em texto, porque a cena mostra isso — e porque um
 * acampamento que não conta o que mudou é outra vez uma tela de números.
 */
export function makeCamp(plan: CampPlan): string[] {
  const s = getState();
  if (campBlocker(s)) return [];
  const { food, heal } = campCost(plan, s);

  const lines: string[] = [];
  update((g) => {
    // Feridos voltam à linha.
    const wounded: TroopCount = { ...g.wounded };
    const troops: TroopCount = { ...g.troops };
    let left = heal;
    for (const type of allTroops) {
      if (left <= 0) break;
      const id = type.id as TroopId;
      const hurt = wounded[id] ?? 0;
      if (!hurt) continue;
      const back = Math.min(hurt, left);
      left -= back;
      wounded[id] = hurt - back;
      if (!wounded[id]) delete wounded[id];
      troops[id] = (troops[id] ?? 0) + back;
    }

    return {
      ...g,
      wounded,
      troops,
      food: Math.max(0, g.food - food),
      hardshipDays: plan === "frio" ? g.hardshipDays : Math.max(0, g.hardshipDays - 1),
    };
  });

  if (heal > 0) lines.push(`${heal} de volta à linha.`);
  else if (woundedTotal(s) > 0) lines.push("Os feridos passam a noite como passaram o dia.");
  if (food > 0) lines.push(`${food} de comida a mais na panela.`);
  return lines;
}

/**
 * O PREÇO DO FOGO.
 *
 * Fogueira em campo aberto com gente atrás de você é um sinal. Quem está
 * procurando passa a saber onde você estava — e a partir daí a caça recomeça
 * do zero, com a posição certa.
 */
export function fireWasSeen(plan: CampPlan): string | null {
  if (plan === "frio") return null;
  const s = getState();
  const hunters = Object.entries(s.worldForces).filter(
    ([, f]) => f.playerPursuit === "searching" || f.playerPursuit === "lost",
  );
  if (!hunters.length) return null;
  const at = s.journey?.at;
  const point = at && "x" in at ? { x: at.x, y: at.y } : null;
  if (!point) return null;

  const hours = s.journey?.hours ?? 0;
  update((g) => {
    const worldForces = { ...g.worldForces };
    for (const [id] of hunters) {
      worldForces[id] = {
        ...worldForces[id],
        knownPlayerPosition: { ...point },
        lastSeenAt: hours,
        searchRadius: 0,
        playerPursuit: "tracking",
      };
    }
    return { ...g, worldForces };
  });
  const name = wandererById.get(hunters[0][0])?.name ?? "Alguém";
  return `${name} viu o fogo.`;
}

/** Quem está com você para conversar à luz do fogo. */
export function campCompanions() {
  return partyCompanions(getState());
}
