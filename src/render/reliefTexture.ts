/**
 * RELEVO, ASSADO UMA VEZ EM TEXTURA.
 *
 * O campo de altura continua sendo o mesmo de `world/relief.ts` — nada aqui
 * inventa geografia. O que muda é só o desenho: antes cada célula virava duas
 * elipses SVG com gradiente radial, dentro de dois grupos com `mix-blend-mode`
 * e um `clipPath`. São ~900 formas que o navegador precisava recompor a cada
 * frame de arrasto, com dois buffers de mistura fora de tela. No celular era o
 * item mais caro do mapa.
 *
 * Agora as mesmas manchas são pintadas uma única vez num canvas fora de tela,
 * já recortadas no contorno do reino, e o mapa desenha UMA imagem. A sombra e
 * a luz são compostas por alfa normal em vez de multiply/screen: sobre o chão
 * a diferença é imperceptível, e o custo por frame cai para o de um bitmap.
 */
import { WORLD } from "../world/layout";
import { RELIEF_CELL, reliefCells } from "../world/relief";
import { valdoria } from "../world/valdoria";

/** Largura da textura. O relevo é propositalmente grosseiro, então basta pouco. */
const TEX_WIDTH = 1024;

let cached: string | null | undefined;

function build(): string | null {
  if (!reliefCells.length || typeof document === "undefined") return null;

  const k = TEX_WIDTH / WORLD.width;
  const canvas = document.createElement("canvas");
  canvas.width = TEX_WIDTH;
  canvas.height = Math.round(WORLD.height * k);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Mundo → textura. Assim as coordenadas abaixo são as mesmas do mapa.
  ctx.setTransform(k, 0, 0, k, -WORLD.x * k, -WORLD.y * k);

  // Recorte no contorno do reino: a sombra não vaza no mar.
  ctx.beginPath();
  valdoria.outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();

  const r = RELIEF_CELL * 0.95;
  const offset = RELIEF_CELL * 0.26;

  const blob = (x: number, y: number, rx: number, ry: number, rgb: string, alpha: number) => {
    if (alpha <= 0.004) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, `rgba(${rgb},${(alpha * 0.85).toFixed(3)})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Sombra deslocada para o canto inferior direito, luz para o superior
  // esquerdo — a mesma direção de luz dos sprites.
  for (const c of reliefCells) blob(c.x + offset, c.y + offset, r, r * 0.82, "74,60,40", c.height * 0.5);
  for (const c of reliefCells) blob(c.x - offset, c.y - offset, r * 0.85, r * 0.7, "255,250,234", c.height * 0.38);

  return canvas.toDataURL("image/png");
}

/** URL da textura de relevo, construída na primeira chamada. */
export function reliefTexture(): string | null {
  if (cached === undefined) cached = build();
  return cached;
}
