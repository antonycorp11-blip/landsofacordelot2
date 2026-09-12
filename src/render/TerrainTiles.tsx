import { elevation } from "./landscape";
import type { Biome } from "../world/types";
import { terrainShade } from "./terrainMaterial";
import { useEffect, useRef } from "react";
import type { CameraView } from "../map/useCamera";
import { GRID_COLS, GRID_ROWS, TERRAIN_CELL, TERRAIN_ORDER, terrainAt } from "../world/terrainGrid";
import { onTilesetsReady, TILES_MIN_ZOOM, tilesetFor } from "./tilesets";
import { CANVAS_DPR } from "./quality";

type Props = {
  /** Assinatura da transformação da câmera — redesenha no mesmo frame do pan. */
  subscribe: (fn: (view: CameraView) => void) => () => void;
  /** 0 = invisível, 1 = totalmente ladrilhado. */
  opacity: number;
};

/**
 * CHÃO LADRILHADO (autotile dual-grid), em canvas.
 *
 * Fica ATRÁS do SVG. Só o chão é rasterizado: seleção, rotas, POIs, rios,
 * estradas e fronteiras continuam vetoriais e intactos — que era a
 * preocupação do briefing ao pedir para não rasterizar o mapa.
 *
 * A grade de desenho é deslocada meia célula em relação à grade de terreno:
 * cada tile olha os quatro cantos que o cercam, monta a máscara e escolhe a
 * peça. Onde os quatro cantos são do mesmo terreno, sai o miolo; onde
 * divergem, saem as bordas — e é daí que nasce a transição entre biomas.
 *
 * DUAS RESOLUÇÕES. Na vista do reino inteiro cada célula ocupa uns 7 pixels:
 * desenhar tile por tile custava mais de vinte mil imagens por frame para um
 * chão que, àquela distância, é cor chapada. Então o mundo inteiro é assado
 * uma vez numa textura de 8 px por célula e a vista de longe blita essa
 * textura — uma imagem por frame. Quando a célula passa de `LIVE_TILE_PX` na
 * tela, o desenho volta a ser tile a tile, com todo o detalhe do autotile.
 * O resultado na tela é o mesmo; muda só quanto custa.
 */

/** Resolução da textura assada, em pixels por célula de terreno. */
const BAKE_PX = 8;
/** A partir deste tamanho de célula na tela vale a pena desenhar tile a tile. */
const LIVE_TILE_PX = BAKE_PX * 2;
/** Linhas assadas por frame — o mundo aparece em pedaços, sem travar a aba. */
const BAKE_ROWS_PER_FRAME = 24;

type Bake = { canvas: HTMLCanvasElement; rowsDone: number };
let bake: Bake | null = null;

/** Retângulo do mundo coberto pela textura (a grade de desenho tem meia célula de sobra). */
const BAKE_RECT = {
  x: -TERRAIN_CELL / 2,
  y: -TERRAIN_CELL / 2,
  width: (GRID_COLS + 1) * TERRAIN_CELL,
  height: (GRID_ROWS + 1) * TERRAIN_CELL,
};

/**
 * Pinta um retângulo da grade de desenho. É o mesmo código para a tela e para
 * a textura — só mudam a origem e o tamanho da célula.
 */
function paintTiles(
  ctx: CanvasRenderingContext2D,
  colFrom: number, colTo: number, rowFrom: number, rowTo: number,
  originX: number, originY: number, cell: number,
) {
  // +1 pixel cobre a costura do arredondamento entre tiles vizinhos.
  const size = Math.ceil(cell) + 1;

  for (let row = rowFrom; row <= rowTo; row++) {
    for (let col = colFrom; col <= colTo; col++) {
      // Os quatro cantos ao redor deste tile de desenho.
      const tl = terrainAt(col - 1, row - 1);
      const tr = terrainAt(col, row - 1);
      const bl = terrainAt(col - 1, row);
      const br = terrainAt(col, row);
      if (tl < 0 && tr < 0 && bl < 0 && br < 0) continue;

      const x = Math.round(originX + (col - 0.5) * cell);
      const y = Math.round(originY + (row - 0.5) * cell);

      // Terrenos presentes, do fundo para a frente (ordem de pintura).
      let present = 0;
      for (const t of [tl, tr, bl, br]) if (t >= 0) present |= 1 << t;

      // Variação pseudoaleatória estável por célula: o chão ganha vida
      // sem ficar diferente a cada frame.
      const variant = (((col * 73856093) ^ (row * 19349663)) >>> 16) & 0xff;

      for (let t = 0; t < TERRAIN_ORDER.length; t++) {
        if (!(present & (1 << t))) continue;
        const mask =
          (tl === t ? 8 : 0) | (tr === t ? 4 : 0) | (bl === t ? 2 : 0) | (br === t ? 1 : 0);
        if (mask === 0) continue;
        const built = tilesetFor(TERRAIN_ORDER[t], variant);
        if (!built) continue;

        const T = built.tileSize;
        ctx.drawImage(built.sheet, (mask % 4) * T, Math.floor(mask / 4) * T, T, T, x, y, size, size);
      }
      // Broad moss/earth variation, anchored to the world rather than the viewport.
      if (tl === tr && tr === bl && bl === br && tl > 0) {
        const wx = col * TERRAIN_CELL, wy = row * TERRAIN_CELL;
        const biome = TERRAIN_ORDER[tl] as Biome;
        const slope = elevation(wx - 160, wy - 160, biome) - elevation(wx + 160, wy + 160, biome);
        const shade = Math.max(-0.3, Math.min(0.25, terrainShade(col, row) + slope * 1.25));
        ctx.globalAlpha = Math.abs(shade);
        ctx.fillStyle = shade < 0 ? "#203d30" : "#e4d9a0";
        ctx.fillRect(x, y, size, size);
        ctx.globalAlpha = 1;
      }
    }
  }
}

/** Assa mais um pedaço do mundo. Devolve `true` quando a textura fica pronta. */
function advanceBake(): boolean {
  if (!bake) {
    const canvas = document.createElement("canvas");
    canvas.width = (GRID_COLS + 1) * BAKE_PX;
    canvas.height = (GRID_ROWS + 1) * BAKE_PX;
    bake = { canvas, rowsDone: 0 };
  }
  if (bake.rowsDone > GRID_ROWS) return true;
  const ctx = bake.canvas.getContext("2d");
  if (!ctx) return false;
  ctx.imageSmoothingEnabled = false;
  const to = Math.min(GRID_ROWS, bake.rowsDone + BAKE_ROWS_PER_FRAME);
  paintTiles(ctx, 0, GRID_COLS, bake.rowsDone, to, BAKE_PX / 2, BAKE_PX / 2, BAKE_PX);
  bake.rowsDone = to + 1;
  return bake.rowsDone > GRID_ROWS;
}

/** Descarta a textura quando as folhas mudam (troca de arte em tempo de execução). */
function resetBake() {
  bake = null;
}

export function TerrainTiles({ subscribe, opacity }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const repaint = useRef<() => void>(() => {});
  useEffect(() => repaint.current(), [opacity]);
  const opacityRef = useRef(opacity);
  opacityRef.current = opacity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last: CameraView | null = null;
    let bakeFrame = 0;

    const draw = (view: CameraView) => {
      last = view;
      const dpr = Math.min(CANVAS_DPR, window.devicePixelRatio || 1);
      const pw = Math.round(view.width * dpr);
      const ph = Math.round(view.height * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, view.width, view.height);
      if (opacityRef.current <= 0.01 || view.zoom < TILES_MIN_ZOOM) return;

      // Pixel art não pode ser suavizada na ampliação.
      ctx.imageSmoothingEnabled = false;

      const cell = TERRAIN_CELL * view.scale;
      const originX = view.width / 2 - view.cx * view.scale;
      const originY = view.height / 2 - view.cy * view.scale;

      if (cell < LIVE_TILE_PX) {
        // Vista de longe: uma imagem em vez de milhares de tiles.
        const ready = advanceBake();
        if (!ready && bakeFrame === 0) {
          // Continua assando nos próximos frames mesmo que a câmera pare.
          const step = () => {
            bakeFrame = advanceBake() ? 0 : requestAnimationFrame(step);
            if (!bakeFrame && last) draw(last);
          };
          bakeFrame = requestAnimationFrame(step);
        }
        if (bake && bake.rowsDone > 0) {
          ctx.drawImage(
            bake.canvas,
            originX + BAKE_RECT.x * view.scale,
            originY + BAKE_RECT.y * view.scale,
            BAKE_RECT.width * view.scale,
            BAKE_RECT.height * view.scale,
          );
        }
        return;
      }

      // Grade de desenho deslocada meia célula, recortada ao que está na tela.
      const first = (o: number) => Math.floor(-o / cell) - 1;
      const colFrom = Math.max(0, first(originX));
      const colTo = Math.min(GRID_COLS, Math.ceil((view.width - originX) / cell) + 1);
      const rowFrom = Math.max(0, first(originY));
      const rowTo = Math.min(GRID_ROWS, Math.ceil((view.height - originY) / cell) + 1);

      paintTiles(ctx, colFrom, colTo, rowFrom, rowTo, originX, originY, cell);
    };

    repaint.current = () => { if (last) draw(last); };
    const unsubscribe = subscribe(draw);
    // Uma folha que termina de carregar depois do primeiro frame precisa
    // disparar um redesenho, senão o chão fica vazio até o próximo pan.
    const unsubscribeReady = onTilesetsReady(() => {
      resetBake();
      if (last) draw(last);
    });
    return () => {
      unsubscribe();
      unsubscribeReady();
      cancelAnimationFrame(bakeFrame);
      repaint.current = () => {};
    };
  }, [subscribe]);

  return (
    <canvas
      ref={canvasRef}
      className="terrain-canvas"
      style={{ opacity, imageRendering: "pixelated" }}
    />
  );
}
