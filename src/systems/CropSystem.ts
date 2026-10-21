import { BALANCE } from "../config/balance";
import { cropByIndex } from "../data/crops";
import { FieldGrid, ST, visualKey } from "./FieldSystem";

export interface CropEnv {
  season: number;
  temp: number;
  rain: number;
}

function moistureFactor(m: number): number {
  if (m < 30) return 0.15;
  if (m < 80) return 0.5 + ((m - 30) / 50) * 0.5;
  if (m > 235) return 0.8;
  return 1;
}

function tempFactor(t: number): number {
  if (t < 3) return 0.1;
  if (t < 12) return 0.4 + ((t - 3) / 9) * 0.6;
  if (t > 34) return 0.6;
  return 1;
}

/**
 * Avança crescimento, umidade e ervas de todas as células de um campo.
 * Também atualiza a chave visual e marca células para redesenho.
 */
export function updateField(f: FieldGrid, hours: number, env: CropEnv): void {
  const evap = (BALANCE.evaporationPerDay / 24) * hours * (0.6 + Math.max(0, env.temp) / 30);
  const rain = BALANCE.rainMoisturePerHour * env.rain * hours;
  const dm = rain - evap;
  const weedGrow = (BALANCE.weedGrowthPerDay / 24) * hours;
  const tf = tempFactor(env.temp);
  let mature = 0;
  const w = f.w;
  for (let i = 0; i < f.n; i++) {
    if (!f.mask[i]) continue;
    // umidade com pequena variação espacial (drenagem)
    const m0 = f.moisture[i];
    let m = m0 + dm * (1 + ((i * 2654435761) >>> 28) / 64);
    m = m < 0 ? 0 : m > 255 ? 255 : m;
    f.moisture[i] = m;
    // umidade média do intervalo (evita distorção em passos longos, ex.: dormir)
    m = (m0 + m) / 2;
    const s = f.stage[i];
    if (s === ST.Planted) {
      const crop = cropByIndex(f.crop[i]);
      if (crop) {
        let g = f.growth[i];
        if (g < 1) {
          const rate = (1 / (crop.growthDays * 24)) * crop.seasonGrowth[env.season] * moistureFactor(m) * tf * (0.75 + 0.25 * (f.fertility[i] / 255));
          g += rate * hours;
          if (g >= 1) g = 1;
          if (g < 0.6) {
            const wv = f.weeds[i] + weedGrow * 0.6;
            f.weeds[i] = wv > 255 ? 255 : wv;
          }
          if (m < 30) {
            const hv = f.health[i] - 4 * hours;
            f.health[i] = hv < 40 ? 40 : hv;
          }
        } else {
          // passou do ponto: perde produtividade até se perder
          g += (0.25 / 24) * hours;
        }
        if (g >= BALANCE.witherGrowth) {
          f.setStage(i, ST.Withered);
          g = 0;
        } else if (g >= 1) mature++;
        f.growth[i] = g;
      }
    } else if (s === ST.Cultivated || s === ST.Plowed || s === ST.Stubble) {
      const wv = f.weeds[i] + weedGrow * 0.35;
      f.weeds[i] = wv > 200 ? 200 : wv;
    }
    const k = visualKey(f, i);
    if (k !== f.visKey[i]) {
      f.markDirty(i % w, (i / w) | 0);
    }
  }
  f.matureCount = mature;
}

/** Distribui atualização dos campos entre ticks (round-robin), em passos de ~15 min de jogo. */
export class CropScheduler {
  private pending = new Map<number, number>();
  private cursor = 0;

  tick(fields: FieldGrid[], hours: number, env: CropEnv): void {
    if (!fields.length) return;
    for (const f of fields) this.pending.set(f.id, (this.pending.get(f.id) ?? 0) + hours);
    for (let k = 0; k < 2; k++) {
      const f = fields[this.cursor % fields.length];
      this.cursor++;
      const p = this.pending.get(f.id) ?? 0;
      if (p >= 0.25) {
        updateField(f, p, env);
        this.pending.set(f.id, 0);
      }
    }
  }

  /** Processa tudo imediatamente (ao dormir / pular tempo). */
  flush(fields: FieldGrid[], env: CropEnv): void {
    for (const f of fields) {
      const p = this.pending.get(f.id) ?? 0;
      if (p > 0) updateField(f, p, env);
      this.pending.set(f.id, 0);
    }
  }
}
