/**
 * OS LORDES DOS SENHORIOS.
 *
 * Trinta e cinco pessoas, uma por senhorio. São GERADAS, não escritas à mão:
 * o nome sai de um sorteio estável pelo id do senhorio, e o sobrenome da Casa
 * dona. Escrever trinta e cinco biografias agora seria inventar texto que a
 * primeira missão reescreve — o que precisa existir já é a pessoa: nome, Casa,
 * classe, onde está e o que sente pelo jogador.
 *
 * Eles usam o MESMO tipo dos líderes de Casa. Para o painel, para uma
 * audiência e para uma missão, um lorde de aldeia e o Rei são a mesma coisa
 * com números diferentes.
 */
import { makeRng } from "../world/geo";
import { fiefs, lordNameFor } from "../world/fiefs";
import { houseById } from "./houses";
import type { Character } from "./characters";
import type { AgentClass } from "../world/types";

/** A classe do lorde puxa para a da Casa, mas nem sempre: gente não é molde. */
function classFor(houseClass: AgentClass, roll: number): AgentClass {
  if (roll < 0.55) return houseClass;
  const others: AgentClass[] = ["MILITARY", "TRADE", "POLITICS", "RELIGION"];
  return others[Math.floor(roll * others.length) % others.length];
}

export const fiefLords: Character[] = fiefs.map((fief) => {
  const house = houseById.get(fief.ownerHouseId);
  const rng = makeRng(`lord-${fief.id}`);
  const surname = house?.shortName ?? "de Valdória";

  return {
    id: fief.lordId,
    name: lordNameFor(fief, surname),
    houseId: fief.ownerHouseId,
    title: `${fief.tier === "nobre" ? "Senhor" : "Senhor"} de ${fief.name}`,
    primaryClass: classFor(house?.primaryClass ?? "POLITICS", rng()),
    locationPoiId: `seat_${fief.id}`,
    status: "available",
    // Ninguém começa devendo nada a você, mas nem todos começam indiferentes.
    relationWithPlayer: Math.round((rng() - 0.5) * 16),
    description: `Governa ${fief.name}, em nome da ${house?.name ?? "Coroa"}.`,
  };
});
