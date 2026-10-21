import { TAU, clamp } from "../core/math";
import { fbm, hash2, valueNoise } from "../core/rng";
import type { IslandDef } from "../data/content";
import type { IslandShape } from "../game/island";

export const ISLAND_RES = 3;
export const ISLAND_EXTENT = 190;

/**
 * Ilha pintada por pixel: areia molhada na costa, rocha com relevo iluminado
 * (normal pelo gradiente do ruído), tufos de capim, trilha e as pedras de
 * construção. Gerada uma vez por ilha.
 */
export function paintIsland(shape: IslandShape, def: IslandDef): HTMLCanvasElement {
  const E = ISLAND_EXTENT;
  const N = Math.ceil(E * 2 * ISLAND_RES);
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!;
  const img = g.createImageData(N, N);
  const d = img.data;
  const seed = shape.seed;
  const height = (x: number, y: number) => fbm(x / 38, y / 38, seed + 11, 5) * 0.8 + valueNoise(x / 7, y / 7, seed + 12) * 0.2;
  const L = [-0.6, -0.65, 0.48];
  const ll = Math.hypot(L[0], L[1], L[2]);
  for (let py = 0; py < N; py++) {
    const y = py / ISLAND_RES - E;
    for (let px = 0; px < N; px++) {
      const x = px / ISLAND_RES - E;
      const r = Math.hypot(x, y);
      const a = Math.atan2(y, x);
      const coast = shape.radius(a);
      const inland = coast - r;
      const o = (py * N + px) * 4;
      if (inland < -5) continue;
      const h = height(x, y);
      const hx = height(x + 0.6, y) - height(x - 0.6, y);
      const hy = height(x, y + 0.6) - height(x, y - 0.6);
      const k = 9;
      const nl = Math.hypot(hx * k, hy * k, 1);
      const lam = clamp((-hx * k * L[0] - hy * k * L[1] + L[2]) / (nl * ll), 0, 1);
      const speck = hash2(px, py, seed) - 0.5;
      let R: number, G: number, B: number, A = 255;
      if (inland < 0) {
        // espuma e água rasa na borda
        const t = (inland + 5) / 5;
        R = 120;
        G = 150;
        B = 150;
        A = Math.floor(t * 130);
      } else if (inland < 7) {
        // areia molhada → seca
        const t = inland / 7;
        R = 84 + t * 70;
        G = 76 + t * 62;
        B = 64 + t * 40;
        const k2 = 0.85 + lam * 0.3 + speck * 0.1;
        R *= k2;
        G *= k2;
        B *= k2;
      } else {
        const [rr, gg, bb] = def.rock;
        const shade = 0.45 + lam * 0.85 + (h - 0.5) * 0.3 + speck * 0.08;
        R = rr * shade;
        G = gg * shade;
        B = bb * shade;
        // capim ralo nas partes altas e abrigadas
        const grass = fbm(x / 22, y / 22, seed + 21, 3);
        if (grass > 0.56 && inland > 14) {
          const m = clamp((grass - 0.56) * 6, 0, 0.85);
          const gr = valueNoise(x * 1.8, y * 1.8, seed + 22);
          R = R * (1 - m) + (48 + gr * 30) * m * (0.6 + lam * 0.6);
          G = G * (1 - m) + (78 + gr * 40) * m * (0.6 + lam * 0.6);
          B = B * (1 - m) + (40 + gr * 12) * m * (0.6 + lam * 0.6);
        }
        // fendas escuras
        const crack = Math.abs(valueNoise(x / 9, y / 9, seed + 31) - 0.5);
        if (crack < 0.03) {
          R *= 0.6;
          G *= 0.6;
          B *= 0.62;
        }
      }
      d[o] = R;
      d[o + 1] = G;
      d[o + 2] = B;
      d[o + 3] = A;
    }
  }
  g.putImageData(img, 0, 0);
  g.setTransform(ISLAND_RES, 0, 0, ISLAND_RES, N / 2, N / 2);
  // trilha de pedras do farol até a casa do faroleiro
  g.strokeStyle = "rgba(170,150,120,0.55)";
  g.lineWidth = 7;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(30, 34, 52, 50);
  g.stroke();
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const x = 2 * (1 - t) * t * 30 + t * t * 52 + (hash2(i, 1, seed) - 0.5) * 4;
    const y = 2 * (1 - t) * t * 34 + t * t * 50 + (hash2(i, 2, seed) - 0.5) * 4;
    g.fillStyle = `rgba(${150 + hash2(i, 3, seed) * 40},${136 + hash2(i, 3, seed) * 30},${110},0.85)`;
    g.beginPath();
    g.ellipse(x, y, 1.6, 1.2, hash2(i, 4, seed) * TAU, 0, TAU);
    g.fill();
  }
  // casa do faroleiro
  g.save();
  g.translate(58, 56);
  g.rotate(0.65);
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(-9, -6, 20, 15);
  g.fillStyle = "#7e3b2c";
  g.fillRect(-10, -7, 20, 7);
  g.fillStyle = "#5e2a20";
  g.fillRect(-10, 0, 20, 7);
  g.strokeStyle = "#3c1b14";
  g.lineWidth = 0.6;
  for (let x = -9; x < 10; x += 2) {
    g.beginPath();
    g.moveTo(x, -7);
    g.lineTo(x, 7);
    g.stroke();
  }
  g.fillStyle = "#c9c2b0";
  g.fillRect(4, -10, 3, 3);
  g.restore();
  // rochas soltas
  for (let i = 0; i < 40; i++) {
    const a = hash2(i, 9, seed) * TAU;
    const rr = shape.radius(a) * (0.55 + hash2(i, 10, seed) * 0.4);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (Math.hypot(x, y) < 40) continue;
    const s = 1.5 + hash2(i, 11, seed) * 3.5;
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.beginPath();
    g.ellipse(x + 1, y + 1.2, s, s * 0.75, a, 0, TAU);
    g.fill();
    const gr = g.createRadialGradient(x - s * 0.4, y - s * 0.4, 0, x, y, s);
    gr.addColorStop(0, `rgb(${def.rock[0] + 40},${def.rock[1] + 40},${def.rock[2] + 40})`);
    gr.addColorStop(1, `rgb(${def.rock[0] * 0.55},${def.rock[1] * 0.55},${def.rock[2] * 0.55})`);
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, y, s, s * 0.75, a, 0, TAU);
    g.fill();
  }
  // plataformas das torres
  for (const sl of shape.slots) {
    g.fillStyle = "rgba(0,0,0,0.4)";
    g.beginPath();
    g.arc(sl.x + 1.5, sl.y + 2, 12, 0, TAU);
    g.fill();
    const gr = g.createRadialGradient(sl.x - 4, sl.y - 4, 1, sl.x, sl.y, 12);
    gr.addColorStop(0, "#a8a294");
    gr.addColorStop(1, "#5c584e");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(sl.x, sl.y, 11, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(30,28,24,0.6)";
    g.lineWidth = 0.7;
    for (let k = 0; k < 6; k++) {
      const aa = (k / 6) * TAU;
      g.beginPath();
      g.moveTo(sl.x + Math.cos(aa) * 4, sl.y + Math.sin(aa) * 4);
      g.lineTo(sl.x + Math.cos(aa) * 11, sl.y + Math.sin(aa) * 11);
      g.stroke();
    }
    g.beginPath();
    g.arc(sl.x, sl.y, 4, 0, TAU);
    g.stroke();
  }
  return c;
}

/** Textura de ondulação do mar (repete), usada em duas camadas que se movem. */
export function seaTile(seed: number): HTMLCanvasElement {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const img = g.createImageData(S, S);
  const d = img.data;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      // ruído periódico: amostra num toro para emendar sem costura
      const ax = (x / S) * TAU;
      const ay = (y / S) * TAU;
      const n = fbm(Math.cos(ax) * 2.2 + Math.cos(ay) * 1.4 + 10, Math.sin(ax) * 2.2 + Math.sin(ay) * 1.4 + 10, seed, 4);
      const ridge = 1 - Math.abs(n - 0.5) * 2;
      const v = Math.pow(ridge, 6);
      const o = (y * S + x) * 4;
      d[o] = 160;
      d[o + 1] = 200;
      d[o + 2] = 220;
      d[o + 3] = v * 120;
    }
  g.putImageData(img, 0, 0);
  return c;
}
