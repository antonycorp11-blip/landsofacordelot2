/** Visual time only. The travel clock remains the sole simulation clock. */
export type LightingMode = 'cycle' | 'day' | 'dusk' | 'night';
const KEYS = [
  { hour: 0, rgb: [0.47, 0.59, 0.83], night: 1, name: 'Noite' },
  { hour: 5, rgb: [0.51, 0.61, 0.80], night: 0.9, name: 'Antes do amanhecer' },
  { hour: 7, rgb: [1.03, 0.91, 0.78], night: 0.08, name: 'Amanhecer' },
  { hour: 10, rgb: [1.04, 1.03, 0.96], night: 0, name: 'Dia' },
  { hour: 16, rgb: [1.04, 1.01, 0.92], night: 0, name: 'Dia' },
  { hour: 18.5, rgb: [1.04, 0.75, 0.64], night: 0.4, name: 'Crepúsculo' },
  { hour: 21, rgb: [0.47, 0.59, 0.83], night: 1, name: 'Noite' },
  { hour: 24, rgb: [0.47, 0.59, 0.83], night: 1, name: 'Noite' },
];
export function lightingAt(worldHours: number, mode: LightingMode = 'cycle') {
  const hour = mode === 'day' ? 12 : mode === 'dusk' ? 18.5 : mode === 'night' ? 0 : ((worldHours % 24) + 24) % 24;
  const i = Math.max(0, KEYS.findIndex((k, index) => index < KEYS.length - 1 && hour >= k.hour && hour < KEYS[index + 1].hour));
  const a = KEYS[i], b = KEYS[i + 1];
  const x = (hour - a.hour) / (b.hour - a.hour), t = x*x*(3-2*x);
  const rgb = a.rgb.map((v, j) => v + (b.rgb[j] - v)*t);
  return { hour, night: a.night + (b.night-a.night)*t, name: a.name,
    matrix: `${rgb[0]} 0 0 0 0 0 ${rgb[1]} 0 0 0 0 0 ${rgb[2]} 0 0 0 0 0 1 0` };
}
