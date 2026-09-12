/**
 * RELEVO PROCEDURAL.
 *
 * O mapa não tem heightmap autorado. Em vez disso, o campo de altura é
 * derivado do próprio cenário já espalhado: onde `nature.ts` colocou montanhas
 * e colinas, o terreno é alto. Isso tem duas vantagens sobre desenhar um
 * heightmap à mão:
 *
 *  - concorda automaticamente com a geografia — as sombras nascem exatamente
 *    onde estão as montanhas de Pedra Cinza e as colinas de Karneth;
 *  - não depende de asset nenhum, e acompanha sozinho qualquer mudança de
 *    escala, densidade ou bioma.
 *
 * O resultado é um campo grosseiro de propósito: serve para dar MASSA ao
 * relevo na vista de longe, onde os sprites de montanha são pequenos demais
 * para ler. De perto, quem conta a história do relevo são os próprios sprites.
 */
import { WORLD } from "./layout";
import { WORLD_SCALE } from "./scale";
import { natureObjects } from "./nature";

/** Quanto cada tipo de cenário "levanta" o terreno. */
const WEIGHT: Record<string, number> = {
  mountain_large: 3.4,
  mountain_small: 2,
  cliff: 1.5,
  hill: 1,
  dry_hill: 1,
  forest_cluster: 0.22,
};

export const RELIEF_CELL = 52 * WORLD_SCALE;

export type ReliefCell = {
  x: number;
  y: number;
  /** Altura normalizada, 0..1. */
  height: number;
};

function buildReliefField(): ReliefCell[] {
  const cols = Math.ceil(WORLD.width / RELIEF_CELL);
  const rows = Math.ceil(WORLD.height / RELIEF_CELL);
  const field = new Float32Array(cols * rows);

  for (const o of natureObjects) {
    const w = WEIGHT[o.assetKey];
    if (!w) continue;
    const cx = Math.floor(o.x / RELIEF_CELL);
    const cy = Math.floor(o.y / RELIEF_CELL);
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
    field[cy * cols + cx] += w * (o.scale ?? 1);
  }

  // Duas passagens de suavização: transforma pontos isolados em cadeias e
  // maciços, que é o que se quer ver na vista do reino inteiro.
  let current = field;
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const weight = dx === 0 && dy === 0 ? 3 : 1;
            sum += current[ny * cols + nx] * weight;
            count += weight;
          }
        }
        next[y * cols + x] = sum / count;
      }
    }
    current = next;
  }

  let max = 0;
  for (const v of current) if (v > max) max = v;
  if (max === 0) return [];

  const cells: ReliefCell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const height = current[y * cols + x] / max;
      if (height < 0.07) continue;
      cells.push({
        x: (x + 0.5) * RELIEF_CELL,
        y: (y + 0.5) * RELIEF_CELL,
        height: Math.min(1, height * 1.35),
      });
    }
  }
  return cells;
}

export const reliefCells: ReliefCell[] = buildReliefField();
