/**
 * DIÁRIO DE VIAGEM.
 *
 * O histórico do que aconteceu na estrada. Hoje é só texto na tela, mas cada
 * entrada já nasce com tipo e hora do mundo — é o formato que um registro de
 * verdade vai precisar quando existirem emboscadas, pedágios e encontros.
 */
export type JournalKind = "partida" | "regiao" | "fronteira" | "marco" | "evento" | "chegada";

export type JournalEntry = {
  id: number;
  kind: JournalKind;
  text: string;
  /** Hora do mundo em que aconteceu. */
  hours: number;
};

/** Símbolo de cada tipo de entrada. Trocável por ícone de verdade depois. */
export const JOURNAL_GLYPH: Record<JournalKind, string> = {
  partida: "➜",
  regiao: "◈",
  fronteira: "⚑",
  marco: "·",
  evento: "✦",
  chegada: "★",
};

/** Dia e hora do mundo, como aparecem no diário. */
export function stamp(hours: number): string {
  const day = Math.floor(hours / 24) + 1;
  const hour = Math.floor(((hours % 24) + 24) % 24);
  return `d${day} ${String(hour).padStart(2, "0")}h`;
}
