/**
 * Traços de rosto a partir de um personagem do mundo.
 *
 * Mesma regra em toda parte: nome feminino recebe rosto feminino, ofício
 * decide elmo ou capuz, e a Casa tinge a roupa. Quem tem arte encomendada
 * nunca chega aqui — este é o caminho dos outros mil.
 */
import { houseById } from "../../data/houses";
import type { Character } from "../../data/characters";
import { hashText } from "../../data/notables";
import { faceKindOf } from "../../data/notables";
import type { FaceTraits } from "./face";

/** Nomes femininos do mundo, para o rosto concordar com quem é a pessoa. */
const FEMININE = /^(Lady|Rainha|Irmã|Dama|Madre)\b|^(Seraphine|Yseld|Ilyra|Lyra|Serah|Gisela|Alwen|Rhian|Marla|Esmer|Hedda|Ilsa|Lorwyn|Maeve|Orla|Quenna|Sable|Vessa|Ysolde|Brida|Delia|Fadwyn)\b/i;

export function faceOf(character: Character): FaceTraits {
  const bare = character.name.replace(/^(Lorde|Lady|Rei|Rainha|Sir|Mestre|Mestra|Irmã|Irmão|Dama|Madre)\s+/i, "");
  const h = hashText(character.id);
  return {
    seed: character.id,
    female: FEMININE.test(character.name) || FEMININE.test(bare),
    // Lorde é gente feita; a faixa vai de maduro a velho.
    age: 0.38 + ((h >>> 11) % 100) / 180,
    accent: houseById.get(character.houseId)?.color,
    kind: faceKindOf(character.primaryClass),
  };
}
