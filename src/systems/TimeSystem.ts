import { BALANCE } from "../config/balance";

export interface GameTime {
  day: number;
  minute: number;
}

export const SEASONS = ["Primavera", "Verão", "Outono", "Inverno"] as const;

export function totalMinutes(t: GameTime): number {
  return t.day * 1440 + t.minute;
}

export function season(day: number): number {
  return Math.floor(day / BALANCE.daysPerSeason) % 4;
}

export function year(day: number): number {
  return Math.floor(day / (BALANCE.daysPerSeason * 4)) + 1;
}

export function dayOfSeason(day: number): number {
  return (day % BALANCE.daysPerSeason) + 1;
}

export function hour(t: GameTime): number {
  return t.minute / 60;
}

export function clockLabel(t: GameTime): string {
  const h = Math.floor(t.minute / 60);
  const m = Math.floor(t.minute % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function dateLabel(day: number): string {
  return `${dayOfSeason(day)}º dia · ${SEASONS[season(day)]} · Ano ${year(day)}`;
}

/** Avança o relógio; retorna quantos dias novos começaram. */
export function advance(t: GameTime, minutes: number): number {
  t.minute += minutes;
  let days = 0;
  while (t.minute >= 1440) {
    t.minute -= 1440;
    t.day++;
    days++;
  }
  return days;
}

/** Luminosidade ambiente 0 (noite) .. 1 (dia pleno). */
export function daylight(t: GameTime): number {
  const h = t.minute / 60;
  const s = season(t.day);
  const rise = [6, 5.5, 6.5, 7][s];
  const set = [19, 19.8, 18.4, 17.6][s];
  if (h < rise - 1 || h > set + 1) return 0;
  if (h < rise + 1) return (h - (rise - 1)) / 2;
  if (h > set - 1) return 1 - (h - (set - 1)) / 2;
  return 1;
}

/** Ângulo do sol para direção das sombras (rad, 0 = leste). */
export function sunAngle(t: GameTime): number {
  const h = t.minute / 60;
  // nascente a leste, poente a oeste: sombras para oeste de manhã e leste à tarde
  return Math.PI + ((h - 6) / 12) * Math.PI;
}
