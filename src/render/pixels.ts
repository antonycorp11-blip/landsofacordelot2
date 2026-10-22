/** Sprites em pixel art definidos como texto: cada caractere é uma cor da paleta. "Z" é a cor da nota. */

const PAL: Record<string, string> = {
  h: "#6a3a1e",
  H: "#9a5a30",
  S: "#f0c8a0",
  s: "#c89a78",
  f: "#c8784a",
  K: "#1e1420",
  W: "#f4eee4",
  w: "#d8d0c0",
  G: "#3aa86a",
  g: "#22744a",
  B: "#3a5ab0",
  b: "#283e80",
  D: "#c83a3a",
  d: "#8a2222",
  y: "#e8c050",
  N: "#2a1a10",
  k: "#1a1420",
  m: "#5a1a2a",
  p: "#e88a8a",
  O: "#a8743e",
  o: "#6e4a26",
  a: "#3a2414",
  V: "#d8d0c0",
  P: "#dcd4ff",
  q: "#9a90d0",
  T: "#1a1420",
  t: "#3a2e48",
  F: "#ece6dc",
  X: "#ff3a5a",
  E: "#ff3a5a",
  L: "#ffd27a",
  A: "#b8b4c0",
  Q: "#2a2a3a",
  U: "#7a4ab0",
  u: "#5a3288",
  R: "#b0405a",
  r: "#7a2a3e",
  C: "#f4eee4",
  c: "#2a2430",
};

export interface Sprite {
  img: HTMLCanvasElement;
  white: HTMLCanvasElement;
  w: number;
  h: number;
}

export function build(rows: string[], over: Record<string, string> = {}): Sprite {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const W = w + 2;
  const H = h + 2;
  const pal = { ...PAL, ...over };
  const mk = (white: boolean) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    const solid = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== undefined && rows[y][x] !== ".";
    g.fillStyle = white ? "#ffffff" : "#0c0810";
    for (let y = -1; y <= h; y++)
      for (let x = -1; x <= w; x++) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) g.fillRect(x + 1, y + 1, 1, 1);
      }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (!ch || ch === ".") continue;
        g.fillStyle = white ? "#ffffff" : pal[ch] ?? "#ff00ff";
        g.fillRect(x + 1, y + 1, 1, 1);
      }
    return c;
  };
  return { img: mk(false), white: mk(true), w: W, h: H };
}

// ------------------------------------------------------------------ Tito: cachos castanhos, cachecol verde, macacão azul e caixa-clara
const titoHead = [
  "....hHhhh.....",
  "..hhHhhHhh....",
  ".hhhhhhhhhh...",
  ".hhSSSSSShh...",
  ".hSSKSSSKSh...",
  "..SfSSSSSfS...",
  "..SSSSppSSS...",
  "...SSSSSSS....",
  "..GGGGGGGGG...",
  ".WWGgGGGWWW...",
];
const titoBody = [".SWWWWWWWWS...", ".SWBBBBBBBWDDD", "..WBBBBBBDWWWD", "...BBBBBBDwwwD", "...bBBBBbDDDD.", "...BBBBBB.dd.."];
const legs = [
  ["...BBB.BBB....", "...BB...BB....", "..NNN...NNN..."],
  ["...BBB.BB.....", "..BBB...BB....", "..NN....NNN..."],
  ["....BBBBB.....", "...BB..BB.....", "..NNN.NNN....."],
];

const tito = legs.map((l) => build([...titoHead, ...titoBody, ...l]));
const titoDrum = build([
  ...titoHead.slice(0, 8),
  "..GGGGGGGGG.k.",
  ".WWGgGGGWWWk..",
  ".SWWWWWWWWSk..",
  ".SWBBBBBBBWDDD",
  "..WBBBBBBDWWWD",
  "...BBBBBBDwwwD",
  "...bBBBBbDDDD.",
  "...BBBBBB.dd..",
  ...legs[0],
]);

// ------------------------------------------------------------------ monstros
/** nota viva: cabeça de nota (cor da nota), haste e bandeirola, perninhas */
const noteRows = (flag: boolean, step: boolean) => [
  "........k...",
  "........kk..",
  flag ? "........k.k." : "........k...",
  flag ? "........k..k" : "........k...",
  "....ZZZZk...",
  "..ZZZZZZZ...",
  ".ZZWWZZWWZ..",
  ".ZZWKZZWKZ..",
  ".ZZZZZZZZZ..",
  "..ZZmmmmZ...",
  "...ZZZZZ....",
  step ? "...k...k...." : "....k.k.....",
  step ? "..kk...kk..." : "...kk.kk....",
];
const tamborimRows = (up: boolean) => [
  up ? "..........." : "",
  ".yyyyyyyyy.",
  "yWWWWWWWWWy",
  ".yyyyyyyyy.",
  ".ZZWKZZWKZ.",
  ".ZZZZZZZZZ.",
  ".ZZZmmmZZZ.",
  ".yyyyyyyyy.",
  up ? "..k.....k.." : ".k.......k.",
  up ? ".kk.....kk." : "kk.......kk",
].filter((r) => r !== "");
const metroRows = (swing: number) => {
  const p = (row: number) => {
    const base = ["....OOOO....", "...OOaaOO...", "...OaaaaO...", "..OOaaaaOO..", "..OaaaaaaO..", ".OOaaaaaaOO.", ".OaaaaaaaaO."][row];
    const col = 5 + Math.round(swing * (row / 6) * 2);
    return base.slice(0, col) + "V" + base.slice(col + 1);
  };
  return [".....yy.....", ".....OO.....", p(0), p(1), p(2), p(3), p(4), p(5), p(6), "OOOOOOOOOOOO", "OWKOOOOOWKOO", "OOOOmmmmOOOO", "oooooooooooo", "..k......k..", ".kk......kk."];
};
const coristaRows = (b: boolean) => [
  "...PPPP...",
  "..PPPPPP..",
  ".PPPPPPPP.",
  ".PKPPPPKP.",
  ".PPPPPPPP.",
  ".PPPKKPPP.",
  ".PPPKKPPP.",
  "PPPPPPPPPP",
  "PqPPPPPPqP",
  "PPPPPPPPPP",
  "PPqPPPPqPP",
  b ? "P.PP.PP.P." : ".PP.PP.PP.",
  b ? ".P..P..P.." : "..P..P..P.",
];
const sanfonaRows = (open: boolean) => [
  "..RRRRRRRR..",
  ".RrRrRrRrRR.",
  open ? ".RRRRRRRRRR." : "",
  ".RWKRRRWKRR.",
  ".RrRrRrRrRR.",
  ".RRRmmmmRRR.",
  open ? ".RrRrRrRrRR." : "",
  "CcCRRRRRRCcC",
  "cCcRrRrRRcCc",
  "..RRRRRRRR..",
  "...k....k...",
  "..kk....kk..",
].filter((r) => r !== "");
const maestroRows = (arm: boolean) => [
  "...X..........X.....",
  "...XX........XX.....",
  "....XX.FFFF.XX......",
  ".....XFFFFFFX.......",
  ".....FFFFFFFF.......",
  ".....FTEFFTEF.......",
  ".....FFFFFFFF.......",
  ".....FFTTTTFF.......",
  arm ? "......FFFFFF....L..." : "......FFFFFF........",
  arm ? "....TTTWWWWTTT.L...." : "....TTTWWWWTTT......",
  arm ? "...TTTTTWWTTTTTS...." : "...TTTTTWWTTTTT.....",
  "..TTTTTTXXTTTTTT....",
  arm ? "..TTtTTTWWTTTtTT...." : "..TTtTTTWWTTTtTT.LL.",
  arm ? "..TTtTTTWWTTTtTT...." : "..TTtTTTWWTTTtTTL...",
  arm ? "..TT.TTTWWTTT.TT...." : "..TT.TTTWWTTT.TTS...",
  "..SS.TTTWWTTT.SS....",
  ".....TTTTTTTTT......",
  "....TTTTTTTTTTT.....",
  "....TTTT.T.TTTT.....",
  "...TTTTT...TTTTT....",
  "...TTTT.....TTTT....",
  "...TTT.......TTT....",
  "...TTT.......TTT....",
  "..NNNN.......NNNN...",
];

const DEG = ["#ff5d73", "#ff9b42", "#ffd84a", "#6ef29a", "#4adcff", "#7b8cff", "#d27aff", "#e8e8f0"];
/** variantes por grau da escala (índice 7 = fora da tonalidade) */
const byDeg = (rowsA: string[], rowsB: string[]) => DEG.map((c) => [build(rowsA, { Z: c }), build(rowsB, { Z: c })]);

export const SPR = {
  tito,
  titoDrum,
  desafinado: byDeg(noteRows(false, true), noteRows(false, false)),
  tamborim: byDeg(tamborimRows(false), tamborimRows(true)),
  cavaleiro: [[build(metroRows(-1)), build(metroRows(1))]],
  corista: [[build(coristaRows(false)), build(coristaRows(true))]],
  gaiteiro: [[build(sanfonaRows(false)), build(sanfonaRows(true))]],
  maestro: [[build(maestroRows(false)), build(maestroRows(true))]],
};

export function monsterFrames(type: keyof typeof SPR, deg: number): Sprite[] {
  const set = SPR[type] as Sprite[][];
  if (set.length === 8) return set[deg < 0 ? 7 : deg % 7];
  return set[0];
}

// ------------------------------------------------------------------ retratos dos diálogos
export const PORTRAITS = {
  tito: build([
    "......hhHhhh........",
    "....hhHhhhHhhh......",
    "...hhhhhhHhhhhh.....",
    "..hhHhhhhhhhhHhh....",
    "..hhhSSSSSSSSShhh...",
    ".hhhSSSSSSSSSSShh...",
    ".hhSSSSSSSSSSSSShh..",
    ".hhSSWWSSSSSWWSShh..",
    ".hhSSWKSSSSSWKSShh..",
    "..hSSSSSSSSSSSSSh...",
    "..SSfSfSSSSSfSfSS...",
    "..SSSSSSSssSSSSSS...",
    "...SSSSSSSSSSSSS....",
    "...SSSSmmmmmSSSS....",
    "....SSSSmppSSSS.....",
    ".....SSSSSSSSS......",
    "....GGGGGGGGGGG.....",
    "..GGGGgGGGGgGGGGG...",
    ".WWWGGGGGGGGGGGWWW..",
    "WWWWWWWWWWWWWWWWWWW.",
  ]),
  fermata: build([
    "......AAAAAA........",
    ".....AAAAAAAA.......",
    "......AAAAAA........",
    "....AAAAAAAAAA......",
    "...AAAAAAAAAAAA.....",
    "...AASSSSSSSSAA.....",
    "..AASSSSSSSSSSAA....",
    "..ASQQQQSSQQQQSA....",
    "..ASQWKQQQQWKQSA....",
    "..ASQQQQSSQQQQSA....",
    "...SSSSSSsSSSSS.....",
    "...SsSSSSSSSSsS.....",
    "...SSSSmmmmSSSS.....",
    "....SSSSSSSSSS......",
    ".....SSSSSSSS.......",
    "....UUUUUUUUUU......",
    "..UUUULUUUULUUUU....",
    ".UUUuUUUUUUUUuUUU...",
    "UUUUUUUuUUuUUUUUUU..",
    "UUUUUUUUUUUUUUUUUU..",
  ]),
  tritono: build([
    "X..................X",
    "XX................XX",
    ".XX..............XX.",
    "..XX..FFFFFFFF..XX..",
    "...XXFFFFFFFFFFXX...",
    "....FFFFFFFFFFFF....",
    "....FFFFFFFFFFFF....",
    "...FFTTTFFFFTTTFF...",
    "...FFTETFFFFTETFF...",
    "...FFTTTFFFFTTTFF...",
    "....FFFFFFFFFFFF....",
    "....FFFFFwwFFFFF....",
    "....FFFTTTTTTFFF....",
    ".....FFFFFFFFFF.....",
    "......FFFFFFFF......",
    "....TTTTWWWWTTTT....",
    "..TTTTTTTWWTTTTTTT..",
    ".TTTTTTTTXXTTTTTTTT.",
    "TTTTTTTTTWWTTTTTTTTT",
    "TTTTTTTTTWWTTTTTTTTT",
  ]),
};
