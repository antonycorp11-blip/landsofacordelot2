/**
 * Personagens desenhados com formas (elipses, curvas) numa grade de 24×32 unidades e depois
 * "pixelizados": alfa nítido, cores reduzidas e contorno escuro de 1px. A mesma função gera o
 * sprite pequeno do jogo (1 unidade = 1px) e as figuras grandes das cenas e retratos.
 */

export type Who = "tito" | "clara" | "fermata" | "tritono";

export interface Pose {
  /** fase da caminhada (0..1) ou -1 parado */
  walk: number;
  /** tocando o tambor / regendo */
  act: number;
  /** olhos fechados (dormindo) */
  sleep?: boolean;
  /** tempo para pequenas animações (cabelo, cachecol) */
  t: number;
  /** espírito: translúcido e azulado */
  spirit?: boolean;
}

type G = CanvasRenderingContext2D;

function ell(g: G, c: string, x: number, y: number, rx: number, ry: number, rot = 0): void {
  g.fillStyle = c;
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  g.fill();
}
function poly(g: G, c: string, pts: number[]): void {
  g.fillStyle = c;
  g.beginPath();
  for (let i = 0; i < pts.length; i += 2) i ? g.lineTo(pts[i], pts[i + 1]) : g.moveTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fill();
}
function rect(g: G, c: string, x: number, y: number, w: number, h: number): void {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}
function curve(g: G, c: string, w: number, pts: number[]): void {
  g.strokeStyle = c;
  g.lineWidth = w;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  if (pts.length === 6) g.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
  else if (pts.length === 8) g.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
  else g.lineTo(pts[2], pts[3]);
  g.stroke();
}
/** olho grande estilo anime: íris, pupila e brilho */
function eye(g: G, x: number, y: number, iris: string, closed: boolean, s = 1): void {
  if (closed) {
    curve(g, "#2a1420", 0.9, [x - 1.3 * s, y + 0.3, x, y + 1.2 * s, x + 1.3 * s, y + 0.3]);
    return;
  }
  ell(g, "#2a1420", x, y + 0.2, 1.45 * s, 1.85 * s);
  ell(g, iris, x, y + 0.5, 1.05 * s, 1.35 * s);
  ell(g, "#140a14", x, y + 0.7, 0.55 * s, 0.75 * s);
  rect(g, "#ffffff", x - 0.9 * s, y - 0.9 * s, 0.9 * s, 0.9 * s);
  rect(g, "rgba(255,255,255,0.7)", x + 0.4 * s, y + 1 * s, 0.5 * s, 0.5 * s);
}

// ------------------------------------------------------------------ Tito (24×32)
function tito(g: G, p: Pose): void {
  const step = p.walk >= 0 ? Math.sin(p.walk * Math.PI * 2) : 0;
  const bob = p.walk >= 0 ? -Math.abs(step) * 0.8 : Math.sin(p.t * 2) * 0.3;
  g.save();
  g.translate(0, bob);
  // pernas e botas
  const lA = step * 1.6;
  rect(g, "#e8d8c0", 9 - lA * 0.3, 26, 2.4, 3);
  rect(g, "#e8d8c0", 12.8 + lA * 0.3, 26, 2.4, 3);
  ell(g, "#5a3420", 10 - lA * 0.5, 30.2, 2.2, 1.3);
  ell(g, "#5a3420", 14 + lA * 0.5, 30.2, 2.2, 1.3);
  ell(g, "#7a4a2a", 9.6 - lA * 0.5, 29.8, 1.2, 0.6);
  // short do macacão
  poly(g, "#3a5cb8", [7.5, 22, 16.5, 22, 17, 27, 12.6, 27, 12, 25.5, 11.4, 27, 7, 27]);
  // camisa
  poly(g, "#f4ecdc", [7.2, 17.5, 16.8, 17.5, 17.6, 23, 6.4, 23]);
  // peitilho do macacão com alças e botões dourados
  poly(g, "#3a5cb8", [8.6, 19.5, 15.4, 19.5, 15.8, 23.5, 8.2, 23.5]);
  rect(g, "#2c4890", 8.2, 23, 7.6, 0.8);
  rect(g, "#3a5cb8", 8.6, 17.5, 1.1, 2.5);
  rect(g, "#3a5cb8", 14.3, 17.5, 1.1, 2.5);
  ell(g, "#ffd27a", 9.3, 20.2, 0.55, 0.55);
  ell(g, "#ffd27a", 14.7, 20.2, 0.55, 0.55);
  rect(g, "#5a7ad8", 10.5, 21, 3, 1.4);
  // braços
  const arm = p.act > 0 ? -3.5 : 0;
  poly(g, "#f4ecdc", [6.6, 18, 7.8, 18.4, 7.2, 22.6, 5.6, 22.2]);
  ell(g, "#f6d2b0", 6.2, 23, 1.1, 1.1);
  poly(g, "#f4ecdc", [16.2, 18.4, 17.4, 18, 18.6 + (arm ? 0.6 : 0), 21.6 + arm, 17.2, 22.2 + arm]);
  ell(g, "#f6d2b0", 18.2, 22.6 + arm, 1.1, 1.1);
  // baqueta na mão
  curve(g, "#c8964a", 0.8, [18.3, 22.6 + arm, 20.8, 19.2 + arm * 1.4]);
  ell(g, "#f0e0c0", 20.9, 19 + arm * 1.4, 0.6, 0.6);
  // caixa-clara no quadril
  ell(g, "#a82a30", 18.6, 25.6, 3.6, 1.6);
  rect(g, "#c83a3a", 15, 23.6, 7.2, 2.1);
  rect(g, "#e8c050", 15, 23.4, 7.2, 0.6);
  rect(g, "#e8c050", 15, 25.4, 7.2, 0.6);
  ell(g, "#f6f0e4", 18.6, 23.4, 3.6, 1.3);
  ell(g, "#ffffff", 17.6, 23.1, 1.4, 0.5);
  for (const x of [15.8, 18.6, 21.4]) rect(g, "#e8c050", x - 0.25, 23.6, 0.5, 2);
  // cachecol verde (ponta balança)
  const sw = Math.sin(p.t * 3) * 0.8 + (p.walk >= 0 ? -1 : 0);
  poly(g, "#2f9a5e", [7.4, 16.4, 16.6, 16.4, 16.8, 18.6, 7.2, 18.6]);
  poly(g, "#2f9a5e", [8.4, 18, 10.6, 18, 10 + sw, 22.4, 7.6 + sw, 22]);
  rect(g, "#4ec880", 7.8, 16.6, 8.4, 0.7);
  rect(g, "#22744a", 8 + sw, 21.4, 2.3, 0.7);
  // cabeça
  ell(g, "#f6d2b0", 5, 11, 1.2, 1.7);
  ell(g, "#f6d2b0", 19, 11, 1.2, 1.7);
  ell(g, "#f6d2b0", 12, 10.6, 7, 6.9);
  ell(g, "#e8b896", 12, 14.6, 5.2, 2.4);
  ell(g, "#f6d2b0", 12, 13.6, 5.6, 2.6);
  // cabelo castanho bagunçado com franja e redemoinho
  poly(g, "#5a2e18", [4.6, 10.6, 4.4, 6.4, 7, 3, 11, 1.8, 15.6, 2.4, 19, 5, 19.8, 9.6, 19.2, 11.4, 17.6, 7.6, 16.4, 9, 15.2, 6.8, 13.6, 8.8, 12.2, 6.4, 10.6, 8.8, 9, 6.6, 7.6, 9, 6.2, 7.6]);
  curve(g, "#5a2e18", 1.4, [12.4, 2.4, 13.4, 0.2, 15.4, 0.8]);
  curve(g, "#8a5230", 0.9, [7.6, 4.6, 9.6, 3.2, 11.8, 3.2]);
  curve(g, "#8a5230", 0.8, [14.4, 3.6, 16.4, 4.4, 17.8, 6.6]);
  curve(g, "#b06e40", 0.6, [8.6, 4.2, 9.8, 3.6, 10.8, 3.6]);
  // rosto
  eye(g, 9.2, 10.8, "#7a4a24", !!p.sleep);
  eye(g, 14.8, 10.8, "#7a4a24", !!p.sleep);
  curve(g, "#5a2e18", 0.6, [7.8, 8.6, 9.2, 8.1, 10.4, 8.5]);
  curve(g, "#5a2e18", 0.6, [13.6, 8.5, 14.8, 8.1, 16.2, 8.6]);
  ell(g, "rgba(240,120,120,0.55)", 7.4, 13.4, 1.3, 0.7);
  ell(g, "rgba(240,120,120,0.55)", 16.6, 13.4, 1.3, 0.7);
  for (const [x, y] of [
    [7, 12.6],
    [8, 13],
    [16, 13],
    [17, 12.6],
  ])
    rect(g, "#c8784a", x, y, 0.5, 0.5);
  if (p.act > 0) {
    ell(g, "#7a2a34", 12, 14.6, 1.2, 1);
    ell(g, "#e87a8a", 12, 15, 0.7, 0.4);
  } else curve(g, "#7a2a34", 0.6, [10.8, 14.2, 12, 15.2, 13.2, 14.2]);
  g.restore();
}

// ------------------------------------------------------------------ Clara (24×34): cabelo longo ondulado, laço lavanda, casaca de regente
function clara(g: G, p: Pose): void {
  const fl = p.sleep ? Math.sin(p.t * 1.5) * 0.6 : 0;
  g.save();
  g.translate(0, fl);
  const sway = Math.sin(p.t * 1.6) * 0.6;
  // cabelo de trás (longo, até a cintura)
  poly(g, "#2a1622", [4.6, 9, 19.4, 9, 20.6 + sway, 20, 19 + sway, 25, 16, 22, 12, 24, 8, 22, 5 - sway, 25, 3.4 - sway, 20]);
  curve(g, "#4a2a3a", 0.7, [5.4, 12, 4.6 - sway, 18, 5.6 - sway, 23]);
  curve(g, "#4a2a3a", 0.7, [18.6, 12, 19.6 + sway, 18, 18.4 + sway, 23]);
  // saia escura, meias e casaca de regente com caudas
  poly(g, "#3a2a4a", [8.6, 23, 15.4, 23, 16.6, 28.4, 7.4, 28.4]);
  rect(g, "#2a1e36", 9.4, 28.2, 1.8, 3);
  rect(g, "#2a1e36", 12.8, 28.2, 1.8, 3);
  poly(g, "#d8c8f0", [7.6, 17, 16.4, 17, 17, 23.6, 18.4, 29.4, 15.6, 28, 14.2, 24, 9.8, 24, 8.4, 28, 5.6, 29.4, 7, 23.6]);
  poly(g, "#b8a4e0", [12, 17.4, 16.4, 17, 17, 23.6, 18.4, 29.4, 15.6, 28, 14.2, 24, 12, 24]);
  rect(g, "#ffd27a", 9.8, 23.6, 4.4, 0.7);
  rect(g, "#f6f0ff", 10.8, 17, 2.4, 5.6);
  for (const y of [19, 21, 23]) ell(g, "#ffd27a", 12, y, 0.5, 0.5);
  rect(g, "#ffd27a", 7.4, 17, 2, 0.8);
  rect(g, "#ffd27a", 14.6, 17, 2, 0.8);
  // pés
  ell(g, "#4a2a3a", 10.2, 31.6, 1.7, 0.9);
  ell(g, "#4a2a3a", 13.8, 31.6, 1.7, 0.9);
  // braço esquerdo e direito (regendo)
  const a = p.act > 0 ? Math.sin(p.t * 6) * 2.5 : 0;
  poly(g, "#d8c8f0", [7.4, 17.6, 8.6, 18, 7.6, 23, 6, 22.6]);
  ell(g, "#f6d8c0", 6.6, 23.2, 1, 1);
  if (p.act > 0) {
    poly(g, "#d8c8f0", [15.6, 18, 16.8, 17.6, 20.4, 13.6 + a, 19.4, 12.6 + a]);
    ell(g, "#f6d8c0", 20.2, 12.8 + a, 1, 1);
    curve(g, "#fffaf0", 0.7, [20.4, 12.6 + a, 23.4, 8 + a * 1.4]);
    ell(g, "#ffe8a0", 23.5, 7.8 + a * 1.4, 0.6, 0.6);
  } else {
    poly(g, "#d8c8f0", [15.4, 18, 16.6, 17.6, 18, 22.6, 16.4, 23]);
    ell(g, "#f6d8c0", 17.2, 23.2, 1, 1);
  }
  // pescoço e cabeça
  rect(g, "#f6d8c0", 10.8, 15, 2.4, 2.4);
  ell(g, "#f6d8c0", 12, 10.2, 6.2, 6.4);
  ell(g, "#f6d8c0", 12, 13, 4.8, 2.6);
  // franja e mechas da frente
  poly(g, "#2a1622", [5.4, 11, 5.4, 6, 8, 3.2, 12, 2.4, 16, 3.2, 18.6, 6, 18.6, 11, 17.4, 8.4, 15.6, 6.8, 13.6, 8.2, 12.2, 6, 10.4, 8, 8.4, 6.8, 6.6, 8.6]);
  curve(g, "#2a1622", 1.6, [5.6, 9, 5 - sway * 0.5, 14, 6, 18]);
  curve(g, "#2a1622", 1.6, [18.4, 9, 19 + sway * 0.5, 14, 18, 18]);
  curve(g, "#5a3a4a", 0.6, [8.4, 4, 10.4, 3, 12.4, 3]);
  // laço lavanda
  poly(g, "#b07ad8", [15.4, 3.6, 18.6, 2, 18.4, 5.4]);
  poly(g, "#b07ad8", [15.4, 3.6, 13.2, 1.4, 13.4, 4.8]);
  ell(g, "#d8a8f0", 15.4, 3.6, 0.9, 0.9);
  // rosto
  eye(g, 9.6, 10.4, "#7a6ab0", !!p.sleep);
  eye(g, 14.4, 10.4, "#7a6ab0", !!p.sleep);
  if (!p.sleep) {
    curve(g, "#2a1420", 0.5, [8.2, 8.3, 9.6, 7.9, 10.8, 8.3]);
    curve(g, "#2a1420", 0.5, [13.2, 8.3, 14.4, 7.9, 15.8, 8.3]);
  }
  ell(g, "rgba(240,130,150,0.5)", 8, 12.6, 1.2, 0.6);
  ell(g, "rgba(240,130,150,0.5)", 16, 12.6, 1.2, 0.6);
  curve(g, "#9a3a50", 0.55, [11, 13.8, 12, 14.4, 13, 13.8]);
  g.restore();
}

// ------------------------------------------------------------------ Dona Fermata (24×30)
function fermata(g: G, p: Pose): void {
  // saia longa e xale roxo com notinhas
  poly(g, "#4a3a5a", [7, 20, 17, 20, 18.6, 30, 5.4, 30]);
  poly(g, "#7a4ab0", [5.4, 15.6, 18.6, 15.6, 20, 21.6, 16, 23.4, 12, 22, 8, 23.4, 4, 21.6]);
  poly(g, "#5a3288", [12, 22, 16, 23.4, 20, 21.6, 18.6, 15.6, 15, 15.6]);
  for (const [x, y] of [
    [8, 18.4],
    [15, 19.6],
    [11.6, 20.6],
  ]) {
    ell(g, "#ffd27a", x, y, 0.6, 0.45);
    rect(g, "#ffd27a", x + 0.4, y - 1.6, 0.3, 1.6);
  }
  ell(g, "#ffd27a", 12, 16.4, 0.8, 0.8);
  // bengala-diapasão
  rect(g, "#c8a050", 19.2, 18, 0.7, 12);
  curve(g, "#e8c070", 0.7, [18.4, 16, 18.4, 18.4, 19.55, 18.6]);
  curve(g, "#e8c070", 0.7, [20.7, 16, 20.7, 18.4, 19.55, 18.6]);
  ell(g, "#f0d0b0", 19.6, 20, 1, 1);
  // cabeça
  ell(g, "#f0d0b4", 12, 10.6, 5.8, 6);
  ell(g, "#e0b898", 12, 13.8, 4.4, 2.2);
  ell(g, "#f0d0b4", 12, 13, 4.6, 2.4);
  // cabelo branco preso em coque, com um lápis
  ell(g, "#e8e4ec", 12, 2.6, 3.2, 2.6);
  curve(g, "#c8a040", 0.7, [9.4, 0.6, 15, 4.4]);
  rect(g, "#ff8a8a", 14.6, 3.8, 0.8, 0.8);
  poly(g, "#e8e4ec", [6, 10, 6.4, 6, 9, 4, 12, 3.6, 15, 4, 17.6, 6, 18, 10, 16.6, 7.4, 12, 6.4, 7.4, 7.4]);
  curve(g, "#ffffff", 0.6, [8, 5.4, 10, 4.4, 12, 4.4]);
  // óculos redondos
  g.strokeStyle = "#3a2a3a";
  g.lineWidth = 0.6;
  g.beginPath();
  g.arc(9.6, 10.6, 1.9, 0, Math.PI * 2);
  g.moveTo(16.3, 10.6);
  g.arc(14.4, 10.6, 1.9, 0, Math.PI * 2);
  g.moveTo(11.5, 10.4);
  g.lineTo(12.5, 10.4);
  g.stroke();
  ell(g, "#3a2a3a", 9.6, 10.8, 0.6, 0.7);
  ell(g, "#3a2a3a", 14.4, 10.8, 0.6, 0.7);
  rect(g, "rgba(255,255,255,0.8)", 8.4, 9.4, 0.8, 0.6);
  rect(g, "rgba(255,255,255,0.8)", 13.2, 9.4, 0.8, 0.6);
  ell(g, "rgba(240,130,130,0.45)", 7.8, 13, 1.1, 0.6);
  ell(g, "rgba(240,130,130,0.45)", 16.2, 13, 1.1, 0.6);
  curve(g, "#8a4a50", 0.55, [10.6, 14, 12, 15, 13.4, 14]);
  curve(g, "#c8a090", 0.4, [8.2, 12.6, 8.8, 13.2]);
  void p;
}

// ------------------------------------------------------------------ Maestro Trítono (28×40): magro, cabelo preto longo, meia máscara
function tritono(g: G, p: Pose): void {
  const a = p.act > 0 ? Math.sin(p.t * 5) * 3 : 0;
  // casaca esfarrapada com forro vermelho
  poly(g, "#7a1020", [8, 16, 20, 16, 23.6, 37, 20, 34, 18, 38, 14, 35, 10, 38, 8, 34, 4.4, 37]);
  poly(g, "#16101e", [9, 16, 19, 16, 21, 34, 18.4, 31, 16, 36, 14, 32, 12, 36, 9.6, 31, 7, 34]);
  poly(g, "#f4eee4", [12.2, 16, 15.8, 16, 14, 23]);
  poly(g, "#c82a3a", [12.6, 16.4, 15.4, 16.4, 14, 18]);
  rect(g, "#16101e", 11.4, 34, 2, 5);
  rect(g, "#16101e", 14.6, 34, 2, 5);
  ell(g, "#0c0810", 12.4, 39.2, 1.8, 0.8);
  ell(g, "#0c0810", 15.6, 39.2, 1.8, 0.8);
  // braços longos, luvas brancas
  poly(g, "#16101e", [8.6, 16.6, 10, 17, 8, 27, 6.4, 26.6]);
  ell(g, "#f4eee4", 7, 27.4, 1.1, 1.2);
  poly(g, "#16101e", [18, 17, 19.4, 16.6, 23.4, 11 + a, 22.2, 10 + a]);
  ell(g, "#f4eee4", 23, 10.4 + a, 1.1, 1.1);
  curve(g, "#fffaf0", 0.7, [23.2, 10 + a, 27, 5 + a * 1.3]);
  // cabeça: rosto pálido, cabelo preto escorrido
  poly(g, "#0c0810", [7, 14, 7.6, 5, 10.6, 1.6, 14, 1, 17.6, 1.6, 20.6, 5, 21, 14, 19.4, 18, 18.4, 10, 9.6, 10, 8.6, 18]);
  ell(g, "#e8dcd8", 14, 9.4, 4.8, 5.6);
  // meia máscara de porcelana (lado esquerdo)
  poly(g, "#fbf8f2", [9.2, 5.6, 14, 4, 14, 15, 11, 14.4, 9.2, 11]);
  curve(g, "#c8c0b8", 0.4, [14, 4, 14, 15]);
  // olhos: o da máscara brilha vermelho
  const gl = 0.6 + 0.4 * Math.sin(p.t * 4);
  ell(g, `rgba(255,${Math.round(40 + 50 * gl)},70,1)`, 11.6, 9, 1.1, 0.6);
  ell(g, "#2a1018", 16.4, 9, 1.1, 0.9);
  ell(g, "#8a2a3a", 16.4, 9.2, 0.6, 0.6);
  rect(g, "#ffffff", 16, 8.4, 0.5, 0.5);
  curve(g, "#2a1018", 0.5, [15, 7.2, 16.4, 6.8, 17.8, 7.4]);
  rect(g, "#c82a3a", 11.2, 10, 0.5, 1.8);
  curve(g, "#5a2030", 0.5, [13, 13, 14.4, 12.6, 16, 13.2]);
  // cabelo da frente
  poly(g, "#0c0810", [9, 6, 11, 2.4, 14, 1.6, 18, 2.4, 19.6, 6.6, 17.4, 4.6, 15, 4.4, 13, 5.6]);
  curve(g, "#3a2a40", 0.6, [12, 2.6, 14.4, 2, 17, 2.8]);
}

const DRAW: Record<Who, (g: G, p: Pose) => void> = { tito, clara, fermata, tritono };
export const SIZE: Record<Who, [number, number]> = { tito: [24, 32], clara: [24, 34], fermata: [24, 31], tritono: [28, 40] };

/** desenha e pixeliza: alfa nítido, cores em degraus e contorno */
export function render(who: Who, pose: Pose, scale: number, outline = true): HTMLCanvasElement {
  const [w, h] = SIZE[who];
  const pad = 2;
  const W = Math.ceil(w * scale) + pad * 2;
  const H = Math.ceil(h * scale) + pad * 2;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.translate(pad, pad);
  g.scale(scale, scale);
  DRAW[who](g, pose);
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  const solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const a = d[i * 4 + 3];
    if (a >= 110) {
      solid[i] = 1;
      // recupera a cor sem a mistura com o fundo transparente e reduz a paleta
      const k = 255 / Math.max(1, a);
      for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] = Math.min(255, Math.round((d[i * 4 + ch] * Math.min(k, 1.4)) / 12) * 12);
      d[i * 4 + 3] = 255;
    } else d[i * 4 + 3] = 0;
  }
  if (outline)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (solid[i]) continue;
        const n = (x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W]);
        if (n) {
          d[i * 4] = 18;
          d[i * 4 + 1] = 10;
          d[i * 4 + 2] = 22;
          d[i * 4 + 3] = 255;
        }
      }
  if (pose.spirit) {
    for (let i = 0; i < W * H; i++) {
      if (!d[i * 4 + 3]) continue;
      const l = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
      d[i * 4] = Math.min(255, l * 0.6 + 60);
      d[i * 4 + 1] = Math.min(255, l * 0.8 + 90);
      d[i * 4 + 2] = 255;
      d[i * 4 + 3] = 170;
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.putImageData(img, 0, 0);
  return c;
}

const cache = new Map<string, HTMLCanvasElement>();
/** versão em cache (quadros de caminhada quantizados) */
export function sprite(who: Who, pose: Pose, scale: number): HTMLCanvasElement {
  const key = `${who}|${pose.walk < 0 ? -1 : Math.floor(pose.walk * 4) % 4}|${pose.act > 0 ? 1 : 0}|${pose.sleep ? 1 : 0}|${pose.spirit ? 1 : 0}|${scale}|${Math.floor(pose.t * 4) % 8}`;
  let c = cache.get(key);
  if (!c) {
    c = render(who, { ...pose, walk: pose.walk < 0 ? -1 : (Math.floor(pose.walk * 4) % 4) / 4, t: (Math.floor(pose.t * 4) % 8) / 4 }, scale);
    if (cache.size > 400) cache.clear();
    cache.set(key, c);
  }
  return c;
}

/** retrato (cabeça e ombros) para os diálogos */
export function portrait(who: Who, px: number, t = 0, spirit = false): HTMLCanvasElement {
  const [w] = SIZE[who];
  const scale = px / (w * 0.95);
  const full = render(who, { walk: -1, act: 0, t, spirit }, scale);
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const g = c.getContext("2d")!;
  g.drawImage(full, (px - full.width) / 2, who === "tritono" ? -scale * 0.5 : who === "fermata" ? -scale * 0.2 : 0);
  return c;
}
