/**
 * O QUE VOCÊ SABE ANTES DE ENTRAR NUMA BRIGA.
 *
 * Olhar um grupo e saber quantos são não deveria ser gratuito. TÁTICA é o que
 * separa "um bando considerável" de "trinta e dois homens, e você leva
 * vantagem" — e é isso que faz a habilidade valer pontos em vez de ser um
 * número na ficha.
 *
 * Nada aqui resolve combate. Só informa.
 */
import { troopStrength, troopTotal, type TroopCount } from "../data/troops";
import { partyStrength } from "./progression";
import { derivedInput } from "./experience";
import { getState } from "./store";
import { hasPerk } from "../data/perks";

export type Confidence = "vago" | "aproximado" | "preciso";

export type ForceReading = {
  /** O que mostrar: número exato, faixa, ou nada. */
  label: string;
  confidence: Confidence;
  /** Comparação com a sua própria força. */
  verdict: string;
  /** Risco de encarar. */
  risk: "baixo" | "moderado" | "alto" | "temerário";
};

function confidenceFor(tactics: number, hasReading: boolean): Confidence {
  if (hasReading || tactics >= 60) return "preciso";
  if (tactics >= 25) return "aproximado";
  return "vago";
}

/** Arredonda para uma faixa, quando o jogador não sabe o bastante para saber. */
function band(n: number, width: number): string {
  const lo = Math.max(0, Math.floor((n - width / 2) / 5) * 5);
  const hi = Math.ceil((n + width / 2) / 5) * 5;
  return `${lo}–${hi} homens`;
}

/**
 * Leitura de um contingente alheio.
 *
 * `troops` é a composição real; o que volta é o que o JOGADOR percebe dela.
 */
export function readForce(troops: TroopCount): ForceReading {
  const s = getState();
  const tactics = s.skills.tatica ?? 0;
  const precise = hasPerk(s.skills, "leitura_de_campo");
  const confidence = confidenceFor(tactics, precise);

  const count = troopTotal(troops);
  const theirs = troopStrength(troops);
  const mine = partyStrength(derivedInput(s));

  const label =
    confidence === "preciso" ? `${count} homens`
    : confidence === "aproximado" ? band(count, Math.max(6, count * 0.3))
    : count < 10 ? "um punhado de homens"
    : count < 30 ? "um grupo considerável"
    : "uma tropa numerosa";

  // Sem tropa nenhuma, qualquer grupo é grande demais.
  const ratio = theirs === 0 ? 99 : mine / theirs;
  const verdict =
    confidence === "vago" ? "Difícil dizer daqui."
    : ratio >= 1.6 ? "Você leva clara vantagem."
    : ratio >= 1.1 ? "Você leva vantagem."
    : ratio >= 0.9 ? "As forças se equivalem."
    : ratio >= 0.6 ? "Eles levam vantagem."
    : "Eles são muito superiores.";

  const risk =
    ratio >= 1.6 ? "baixo" : ratio >= 1.0 ? "moderado" : ratio >= 0.6 ? "alto" : "temerário";

  return { label, confidence, verdict, risk };
}

/** Força estimada em palavras, para quando não se quer mostrar número. */
export function strengthWord(troops: TroopCount): string {
  const v = troopStrength(troops);
  if (v === 0) return "Nenhuma";
  if (v < 12) return "Fraca";
  if (v < 35) return "Moderada";
  if (v < 80) return "Considerável";
  if (v < 160) return "Forte";
  return "Formidável";
}
