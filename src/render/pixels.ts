/** Sprites em pixel art definidos como texto: cada caractere é uma cor da paleta. */

const PAL: Record<string, string> = {
  Y: "#f2c84b",
  y: "#c8962e",
  S: "#f0c8a0",
  s: "#c89a78",
  K: "#2a1a10",
  b: "#3a6ad0",
  W: "#f0e8d8",
  O: "#d0782a",
  o: "#a05418",
  D: "#c83a3a",
  d: "#8a2222",
  B: "#5a3a22",
  N: "#2a1a10",
  G: "#6aa84a",
  g: "#3e6e2c",
  E: "#ffe040",
  m: "#2a1010",
  R: "#7a5a3a",
  r: "#4a3422",
  C: "#e8c050",
  c: "#a88428",
  A: "#9aa0b0",
  a: "#5e6474",
  V: "#b070ff",
  P: "#d8e8ff",
  p: "#90a8d0",
  H: "#5a3a8a",
  h: "#36224e",
  F: "#e0e0e0",
  T: "#1a1420",
  t: "#3a2e48",
  X: "#ff3a5a",
  L: "#ffd27a",
  M: "#b02a3a",
};

export interface Sprite {
  img: HTMLCanvasElement;
  white: HTMLCanvasElement;
  w: number;
  h: number;
}

function build(rows: string[]): Sprite {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  // 1px de contorno escuro em volta
  const W = w + 2;
  const H = h + 2;
  const mk = (white: boolean) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    const solid = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== "." && rows[y][x] !== undefined;
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
        g.fillStyle = white ? "#ffffff" : PAL[ch] ?? "#ff00ff";
        g.fillRect(x + 1, y + 1, 1, 1);
      }
    return c;
  };
  return { img: mk(false), white: mk(true), w: W, h: H };
}

const legsA = ["...BB..BB...", "...BB..BB...", "..NNN..NNN.."];
const legsB = ["...BB.BB....", "..BB...BB...", "..NN....NN.."];
const titoTop = [
  "....YYYY....",
  "...YYYYYY...",
  "..YYYYYYyY..",
  "..YSSSSSYy..",
  "..SSKSSKSY..",
  "...SSSSSS...",
  "....SssS....",
  "...OOOOOO...",
  "..SOOOOOoDD.",
  "..SOOOOODWDD",
  "...OOOOODWWD",
  "...oOOOOdDD.",
  "...BBBBBB...",
];

export const SPR = {
  tito: [build([...titoTop, ...legsA]), build([...titoTop, ...legsB])],
  titoDrum: build([...titoTop.slice(0, 8), "..SOOOOOoDDS", "..OOOOOODWDD", "...OOOOODWWD", "...oOOOOdDD.", "...BBBBBB...", ...legsA]),
  desafinado: [
    build(["..G....G..", "..GG..GG..", "..GGGGGG..", ".GGEGGEGG.", ".GGGGGGGG.", "..GmmmmG..", "...GGGG..C", "..RRRRRRCc", ".GRRRRRRGC", "..RrRRrR..", "..GG..GG..", ".gg....gg."]),
    build(["..G....G..", "..GG..GG..", "..GGGGGG..", ".GGEGGEGG.", ".GGGGGGGG.", "..GmmmmG..", "...GGGG..C", "..RRRRRRCc", ".GRRRRRRGC", "..RrRRrR..", "...GGGG...", "..gg..gg.."]),
  ],
  tamborim: [
    build([".M....M.", ".MM..MM.", ".MMMMMM.", "MMEMMEMM", ".MMmmMM.", "..DDDD..", ".DWWWWD.", ".DDDDDD.", "..M..M..", ".MM..MM."]),
    build(["M......M", ".MM..MM.", ".MMMMMM.", "MMEMMEMM", ".MMmmMM.", "..DDDD..", ".DWWWWD.", ".DDDDDD.", "..M..M..", "..MMMM.."]),
  ],
  cavaleiro: [
    build(["....AAAA....", "...AAAAAA...", "..AAaaaaAA..", "..AVVVVVVA..", "..AaaaaaaA..", "...AAAAAA...", "..aAAAAAAa..", ".AAAaLLaAAA.", ".AAAaLaaAAA.", ".AaAaLaaAaA.", ".a.AAAAAA.a.", "...AaaaaA...", "...AA..AA...", "...AA..AA...", "..aaa..aaa.."]),
    build(["....AAAA....", "...AAAAAA...", "..AAaaaaAA..", "..AVVVVVVA..", "..AaaaaaaA..", "...AAAAAA...", "..aAAAAAAa..", ".AAAaaLaAAA.", ".AAAaaLaAAA.", ".AaAaaLaAaA.", ".a.AAAAAA.a.", "...AaaaaA...", "...AA.AA....", "..AA...AA...", "..aa....aa.."]),
  ],
  corista: [
    build(["...PPPP...", "..PPPPPP..", ".PPPPPPPP.", ".PTPPPPTP.", ".PPPPPPPP.", ".PPPTTPPP.", ".PPPTTPPP.", "PPPPPPPPPP", "PpPPPPPPpP", "PPPPPPPPPP", "PPpPPPPpPP", ".PP.PP.PP.", "..P..P..P."]),
    build(["...PPPP...", "..PPPPPP..", ".PPPPPPPP.", ".PTPPPPTP.", ".PPPPPPPP.", ".PPPPTPPP.", ".PPPPTPPP.", "PPPPPPPPPP", "PpPPPPPPpP", "PPPPPPPPPP", "PPpPPPPpPP", "P.PP.PP.P.", ".P..P..P.."]),
  ],
  gaiteiro: [
    build(["...HHHH...", "..HHHHHH..", ".HHhhhhHH.", ".HhEhhEhH.", ".HhhhhhhH.", "..HHHHHH..", ".HHHHHHHH.", "HHHCCHHHH.", "HHCCCCHHH.", ".HCCCHHHH.", ".HHHHHHHH.", "..HHHHHH..", "..hh..hh.."]),
    build(["...HHHH...", "..HHHHHH..", ".HHhhhhHH.", ".HhEhhEhH.", ".HhhhhhhH.", "..HHHHHH..", ".HHHHHHHH.", "HHHCCHHHH.", "HHCCCCHHH.", ".HCCCHHHH.", ".HHHHHHHH.", "..HHHHHH..", ".hh....hh."]),
  ],
  maestro: [
    build([
      "...X..........X.....",
      "...XX........XX.....",
      "....XX.FFFF.XX......",
      ".....XFFFFFFX.......",
      ".....FFFFFFFF.......",
      ".....FXFFFFXF.......",
      ".....FFFFFFFF.......",
      ".....FFmmmmFF.......",
      "......FFFFFF........",
      "....TTTWWWWTTT......",
      "...TTTTTWWTTTTT.....",
      "..TTTTTTXXTTTTTT....",
      "..TTtTTTWWTTTtTT.LL.",
      "..TTtTTTWWTTTtTTL...",
      "..TT.TTTWWTTT.TTS...",
      "..SS.TTTWWTTT.SS....",
      ".....TTTTTTTTT......",
      ".....TTTTTTTTT......",
      ".....TTTT.TTTT......",
      "....TTTTT.TTTTT.....",
      "....TTTT...TTTT.....",
      "....TTT.....TTT.....",
      "....TTT.....TTT.....",
      "...NNNN.....NNNN....",
    ]),
    build([
      "...X..........X.....",
      "...XX........XX.....",
      "....XX.FFFF.XX......",
      ".....XFFFFFFX.......",
      ".....FFFFFFFF.......",
      ".....FXFFFFXF.......",
      ".....FFFFFFFF.......",
      ".....FFmmmmFF.......",
      "......FFFFFF....L...",
      "....TTTWWWWTTT.L....",
      "...TTTTTWWTTTTTS....",
      "..TTTTTTXXTTTTTT....",
      "..TTtTTTWWTTTtTT....",
      "..TTtTTTWWTTTtTT....",
      "..TT.TTTWWTTT.TT....",
      "..SS.TTTWWTTT.......",
      ".....TTTTTTTTT......",
      ".....TTTTTTTTT......",
      ".....TTTT.TTTT......",
      "....TTTTT.TTTTT.....",
      "...TTTT.....TTTT....",
      "...TTT.......TTT....",
      "...TTT.......TTT....",
      "..NNNN.......NNNN...",
    ]),
  ],
  portrait: build([
    "....YYYYYYYY....",
    "...YYYYYYYYYY...",
    "..YYYYYYYYYYYY..",
    ".YYYyYYYYYYyYYY.",
    ".YYSSSSSSSSSSYY.",
    ".YSSSSSSSSSSSSY.",
    ".YSSWWSSSSWWSSY.",
    ".YSSWbSSSSWbSSY.",
    "..SSSSSSSSSSSS..",
    "..SsSSSssSSSsS..",
    "..SSSSSSSSSSSS..",
    "...SSSmmmmSSS...",
    "....SSSSSSSS....",
    ".....SSSSSS.....",
    "...OOOSSSSOOO...",
    "..OOOOOOOOOOOO..",
    ".OOOOOOOOOOOOOO.",
  ]),
};
