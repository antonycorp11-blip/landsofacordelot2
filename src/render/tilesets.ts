/**
 * TILESETS DE CHÃO (autotile dual-grid).
 *
 * ── Dual-grid em uma linha ─────────────────────────────────────────────────
 * A grade de desenho fica deslocada meia célula: cada tile olha só os 4 CANTOS
 * que o cercam, o que dá 16 combinações — 15 peças úteis e a vazia. Um autotile
 * clássico olharia os 8 vizinhos e exigiria 47 peças.
 *
 *     bit 8 = sup. esquerdo    bit 4 = sup. direito
 *     bit 2 = inf. esquerdo    bit 1 = inf. direito
 *
 * ── Por que as peças são GERADAS ───────────────────────────────────────────
 * Quase nenhum tileset de mercado vem com as 15 peças de transição entre dois
 * BIOMAS — eles trazem tiles de preenchimento e, quando muito, bordas de
 * elevação. Então aqui as 15 peças são construídas a partir de um tile cheio:
 * recorta-se o quadrante de cada canto ligado e a junta recebe um DITHER, que
 * é justamente como a transição é feita em pixel art da era 16/32 bits.
 *
 * Resultado prático: qualquer textura de chão decente vira um autotile
 * completo, e trocar de pack é trocar um arquivo.
 *
 * ── Tinta ──────────────────────────────────────────────────────────────────
 * Um mesmo tile de grama serve a vários biomas via `tint`. Mantém a mesma regra
 * do resto do projeto: a arte carrega o DETALHE, a cor vem dos dados — e é o
 * que deixa possível uma região mudar de dono e de cor.
 */
import type { TerrainId } from "../world/terrainGrid";

export type TilesetConfig = {
  /** Arquivo em `src/assets/tilesets/`, sem extensão. Pode ser compartilhado. */
  sheet: string;
  /** Lado do tile na folha, em pixels. */
  tileSize: number;
  /** Retângulo da folha (em tiles) com os tiles CHEIOS usados como base. */
  fill: { col: number; row: number; cols: number; rows: number };
  /** Cor multiplicada sobre o tile. */
  tint?: string;
  /** 0..1 — quanto da tinta entra. */
  tintStrength?: number;
};

/** Zoom a partir do qual o chão ladrilhado substitui a cor chapada. */
export const TILES_MIN_ZOOM = 0;
/** Faixa de zoom do desvanecimento entre os dois, para a troca não estalar. */
export const TILES_FADE = 0.5;

/** Largura da junta com dither, em pixels do tile. */
const DITHER_BAND = 7;
/**
 * Quantas variações de cada terreno são pré-construídas.
 *
 * Poucas variações criam uma treliça visível no chão — o olho acha o padrão.
 * A folha de grama traz 32 tiles de preenchimento; usar uma dúzia já quebra
 * a repetição sem custo relevante de memória.
 */
const VARIANTS = 12;

export const terrainTilesets: Record<TerrainId, TilesetConfig | null> = Object.fromEntries(
  ["temperate_valley", "plains", "sacred_valley", "dense_forest", "steppe_march", "coastal", "alpine"].map((id) =>
    [id, { sheet: id, tileSize: 32, fill: { col: 0, row: 0, cols: 4, rows: 4 } }]),
) as Record<TerrainId, TilesetConfig | null>;
terrainTilesets.sea = null;

/* ------------------------------------------------------------------ */
/* Construção das peças                                                */
/* ------------------------------------------------------------------ */

const sheetImages = new Map<string, HTMLImageElement>();
/** Por terreno: uma folha 4×4 pronta por variação. */
const built = new Map<TerrainId, HTMLCanvasElement[]>();
let readyListeners: (() => void)[] = [];

/** Bayer 4×4 — o padrão de dither clássico da era 16 bits. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Máscara de alpha para uma combinação de cantos, com junta dithered. */
function buildMask(size: number, mask: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const data = ctx.createImageData(size, size);
  const half = size / 2;
  const on = (qx: number, qy: number) => {
    const bit = qy === 0 ? (qx === 0 ? 8 : 4) : qx === 0 ? 2 : 1;
    return (mask & bit) !== 0;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = x < half ? 0 : 1;
      const qy = y < half ? 0 : 1;
      let alpha = on(qx, qy) ? 255 : 0;

      // Distância até o quadrante vizinho de estado oposto, na horizontal e
      // na vertical — é onde a junta acontece.
      const dx = qx === 0 ? half - x : x - half + 1;
      const dy = qy === 0 ? half - y : y - half + 1;
      const opposedX = on(1 - qx, qy) !== on(qx, qy);
      const opposedY = on(qx, 1 - qy) !== on(qx, qy);
      const d = Math.min(opposedX ? dx : Infinity, opposedY ? dy : Infinity);

      if (d <= DITHER_BAND) {
        const t = d / DITHER_BAND;
        const threshold = BAYER[y % 4][x % 4] / 16;
        const keep = t > threshold;
        alpha = on(qx, qy) ? (keep ? 255 : 0) : keep ? 0 : 255;
      }

      const o = (y * size + x) * 4;
      data.data[o] = data.data[o + 1] = data.data[o + 2] = 255;
      data.data[o + 3] = alpha;
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

function buildVariant(img: HTMLImageElement, cfg: TilesetConfig, variant: number): HTMLCanvasElement {
  const T = cfg.tileSize;
  const count = cfg.fill.cols * cfg.fill.rows;
  const pick = variant % count;
  const sx = (cfg.fill.col + (pick % cfg.fill.cols)) * T;
  const sy = (cfg.fill.row + Math.floor(pick / cfg.fill.cols)) * T;

  // Tile cheio, já tingido.
  const base = document.createElement("canvas");
  base.width = T;
  base.height = T;
  const bctx = base.getContext("2d")!;
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(img, sx, sy, T, T, 0, 0, T, T);
  // Material albedo: keep the generated grain quiet at kingdom scale.
  const albedo: Record<string, string> = {
    temperate_valley: '#8fa16b', plains: '#b4a363', sacred_valley: '#a2ad78',
    dense_forest: '#556c49', steppe_march: '#a38d60', coastal: '#c2b388', alpine: '#8b9390',
  };
  bctx.globalAlpha = 0.72;
  bctx.fillStyle = albedo[cfg.sheet] ?? '#8fa16b';
  bctx.fillRect(0, 0, T, T);
  bctx.globalAlpha = 1;

  if (cfg.tint) {
    bctx.globalAlpha = cfg.tintStrength ?? 0.5;
    bctx.globalCompositeOperation = "multiply";
    bctx.fillStyle = cfg.tint;
    bctx.fillRect(0, 0, T, T);
    bctx.globalAlpha = 1;
    // A tinta não pode pintar onde o tile é transparente.
    bctx.globalCompositeOperation = "destination-in";
    bctx.drawImage(img, sx, sy, T, T, 0, 0, T, T);
  // Material albedo: keep the generated grain quiet at kingdom scale.
  const albedo: Record<string, string> = {
    temperate_valley: '#8fa16b', plains: '#b4a363', sacred_valley: '#a2ad78',
    dense_forest: '#556c49', steppe_march: '#a38d60', coastal: '#c2b388', alpine: '#8b9390',
  };
  bctx.globalAlpha = 0.72;
  bctx.fillStyle = albedo[cfg.sheet] ?? '#8fa16b';
  bctx.fillRect(0, 0, T, T);
  bctx.globalAlpha = 1;

    bctx.globalCompositeOperation = "source-over";
  }

  // Folha 4×4: uma peça por máscara.
  const sheet = document.createElement("canvas");
  sheet.width = T * 4;
  sheet.height = T * 4;
  const ctx = sheet.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  for (let m = 1; m < 16; m++) {
    const tx = (m % 4) * T;
    const ty = Math.floor(m / 4) * T;
    const piece = document.createElement("canvas");
    piece.width = T;
    piece.height = T;
    const pctx = piece.getContext("2d")!;
    pctx.imageSmoothingEnabled = false;
    pctx.drawImage(base, 0, 0);
    pctx.globalCompositeOperation = "destination-in";
    pctx.drawImage(buildMask(T, m), 0, 0);
    ctx.drawImage(piece, tx, ty);
  }
  return sheet;
}

function buildAll() {
  for (const [terrain, cfg] of Object.entries(terrainTilesets) as [TerrainId, TilesetConfig | null][]) {
    if (!cfg) continue;
    const img = sheetImages.get(cfg.sheet);
    if (!img?.complete || !img.naturalWidth) continue;
    built.set(
      terrain,
      Array.from({ length: VARIANTS }, (_, v) => buildVariant(img, cfg, v)),
    );
  }
  readyListeners.forEach((fn) => fn());

}

export function setTilesetUrl(sheet: string, url: string) {
  const img = new Image();
  img.src = url;
  sheetImages.set(sheet, img);
  if (img.complete) buildAll();
  else img.addEventListener("load", buildAll, { once: true });
}

/** Folhas de origem conhecidas — usado pelo carregador para validar nomes. */
export const knownSheets: Record<string, true> = Object.fromEntries(
  Object.values(terrainTilesets)
    .filter((c): c is TilesetConfig => Boolean(c))
    .map((c) => [c.sheet, true as const]),
);

export type BuiltTileset = { sheet: HTMLCanvasElement; tileSize: number };

export function tilesetFor(terrain: TerrainId, variant: number): BuiltTileset | undefined {
  const sheets = built.get(terrain);
  if (!sheets?.length) return undefined;
  return {
    sheet: sheets[variant % sheets.length],
    tileSize: terrainTilesets[terrain]!.tileSize,
  };
}

export const anyTilesetLoaded = () => built.size > 0;

export function onTilesetsReady(fn: () => void) {
  readyListeners.push(fn);
  if (built.size) fn();
  return () => { readyListeners = readyListeners.filter(listener => listener !== fn); };
}
