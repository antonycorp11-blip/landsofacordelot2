import { hash2 } from "../core/rng";
import { clamp, smoothstep } from "../core/math";
import { season, type GameTime } from "./TimeSystem";

export interface DayWeather {
  rainStart: number;
  rainDuration: number;
  intensity: number;
  tMin: number;
  tMax: number;
  cloud: number;
}

const BASE_TEMP: [number, number][] = [
  [12, 25],
  [18, 32],
  [10, 23],
  [2, 15],
];
const RAIN_CHANCE = [0.38, 0.42, 0.3, 0.24];

/** Clima determinístico por dia, a partir da semente do mundo. */
export function dayWeather(seed: number, day: number): DayWeather {
  const s = season(day);
  // períodos secos/úmidos de vários dias
  const spell = hash2(Math.floor(day / 3), 77, seed);
  const chance = clamp(RAIN_CHANCE[s] * (0.4 + spell * 1.3), 0, 0.85);
  const r = hash2(day, 11, seed);
  const raining = r < chance && day > 0;
  const [lo, hi] = BASE_TEMP[s];
  const dt = (hash2(day, 23, seed) - 0.5) * 6;
  return {
    rainStart: raining ? Math.floor(240 + hash2(day, 31, seed) * 900) : -1,
    rainDuration: raining ? Math.floor(90 + hash2(day, 41, seed) * 360) : 0,
    intensity: raining ? 0.35 + hash2(day, 53, seed) * 0.65 : 0,
    tMin: lo + dt - (raining ? 2 : 0),
    tMax: hi + dt - (raining ? 4 : 0),
    cloud: raining ? 0.8 : hash2(day, 61, seed) * 0.6,
  };
}

function rainAt(seed: number, day: number, minute: number): number {
  let v = 0;
  for (const d of [day - 1, day]) {
    if (d < 0) continue;
    const w = dayWeather(seed, d);
    if (w.rainStart < 0) continue;
    const start = w.rainStart + (d - day) * 1440;
    const end = start + w.rainDuration;
    if (minute < start || minute > end) continue;
    const ramp = Math.min(smoothstep(start, start + 30, minute), 1 - smoothstep(end - 30, end, minute));
    v = Math.max(v, ramp * w.intensity);
  }
  return v;
}

export interface WeatherState {
  rain: number;
  temp: number;
  cloud: number;
  wind: number;
  windDir: number;
}

export function weatherAt(seed: number, t: GameTime): WeatherState {
  const w = dayWeather(seed, t.day);
  const h = t.minute / 60;
  const diurnal = 0.5 - 0.5 * Math.cos(((h - 4) / 24) * Math.PI * 2);
  const rain = rainAt(seed, t.day, t.minute);
  return {
    rain,
    temp: w.tMin + (w.tMax - w.tMin) * diurnal,
    cloud: Math.max(w.cloud, rain),
    wind: 0.3 + hash2(t.day, 71, seed) * 0.5 + rain * 0.6,
    windDir: hash2(t.day, 83, seed) * Math.PI * 2,
  };
}

export function weatherLabel(ws: WeatherState): string {
  if (ws.rain > 0.6) return "Chuva forte";
  if (ws.rain > 0.05) return "Chuva";
  if (ws.cloud > 0.45) return "Nublado";
  return "Ensolarado";
}

export function forecastLabel(w: DayWeather): string {
  if (w.rainStart < 0) return w.cloud > 0.45 ? "Nublado" : "Sol";
  const h = Math.floor(w.rainStart / 60);
  return `${w.intensity > 0.65 ? "Chuva forte" : "Chuva"} ~${h}h`;
}
