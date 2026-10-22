import { hash2 } from "../core/rng";
import { DEGREE_COLORS, type Style } from "../data/content";
import { DOOR, ROOM, type Room, type Run } from "../game/sim";

export const WALL = 46;
const TILE = 20;

export interface RoomLight {
  /** posição no canvas da sala */
  x: number;
  y: number;
  r: number;
  color: string;
  flicker: number;
}

export interface RoomArt {
  canvas: HTMLCanvasElement;
  lights: RoomLight[];
}

type Pt = [number, number];

/** Pinta uma sala no estilo do lugar: piso, paredes do fundo, objetos e luzes. */
export function paintRoom(run: Run, r: Room): RoomArt {
  const c = document.createElement("canvas");
  c.width = ROOM * 2 + 4;
  c.height = ROOM + WALL + 40;
  const g = c.getContext("2d")!;
  const OY = WALL + 36;
  const style = run.dungeon.style;
  const P = (lx: number, ly: number): Pt => [ROOM + 2 + (lx - ly), OY + (lx + ly) / 2];
  const lights: RoomLight[] = [];
  const idx = run.rooms.indexOf(r);
  const prev = idx > 0 ? run.rooms[idx - 1] : null;
  const doors: Pt[] = [];
  if (r.next) doors.push(r.next);
  if (prev) doors.push([prev.gx - r.gx, prev.gy - r.gy]);
  const hasDoor = (dx: number, dy: number) => doors.some(([a, b]) => a === dx && b === dy);
  const neighbor = (dx: number, dy: number) => run.rooms.some((o) => o.gx === r.gx + dx && o.gy === r.gy + dy);
  const H = (a: number, b: number, s = 0) => hash2(a + r.gx * 31, b + r.gy * 17, s + 3);
  const quad = (a: Pt, b: Pt, cc: Pt, d: Pt) => {
    g.beginPath();
    g.moveTo(...a);
    g.lineTo(...b);
    g.lineTo(...cc);
    g.lineTo(...d);
    g.closePath();
  };

  // ------------------------------------------------------------ piso
  const n = ROOM / TILE;
  const mid = n / 2;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const a = P(i * TILE, j * TILE);
      const b = P((i + 1) * TILE, j * TILE);
      const cc = P((i + 1) * TILE, (j + 1) * TILE);
      const d = P(i * TILE, (j + 1) * TILE);
      const h = H(i, j);
      let col: string;
      switch (style) {
        case "teatro":
          col = ["#6a4428", "#62402a", "#5a3a22"][(j + Math.floor((i + (j % 2) * 2) / 4)) % 3];
          break;
        case "conserv":
          col = (i + j) % 2 ? "#cbc4b4" : "#2c2834";
          break;
        case "catedral":
          col = j >= mid - 1 && j <= mid ? "#4a2a62" : (i + j) % 2 ? "#2e2a3a" : "#28243a";
          break;
        case "opera":
          col = (i + j) % 2 ? "#6a1e26" : "#621a22";
          break;
        default: {
          const dist = Math.hypot(i + 0.5 - mid, j + 0.5 - mid);
          col = Math.floor(dist) % 3 === 0 ? "#7a6a50" : (i + j) % 2 ? "#8a7a5e" : "#82725a";
        }
      }
      g.fillStyle = col;
      quad(a, b, cc, d);
      g.fill();
      // juntas e detalhes por estilo
      g.strokeStyle = "rgba(0,0,0,0.22)";
      g.lineWidth = 1;
      if (style === "teatro") {
        // tábuas: costura ao longo de x, emenda a cada 4 tábuas
        g.beginPath();
        g.moveTo(...d);
        g.lineTo(...cc);
        if ((i + (j % 2) * 2) % 4 === 0) {
          g.moveTo(...a);
          g.lineTo(...d);
        }
        g.stroke();
        if (h > 0.9) {
          const [x, y] = P((i + 0.5) * TILE, (j + 0.3) * TILE);
          g.fillStyle = "rgba(20,10,4,0.6)";
          g.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
      } else if (style === "opera") {
        if (i % 4 === 0 && j % 4 === 0) {
          const [x, y] = P((i + 1) * TILE, (j + 1) * TILE);
          g.strokeStyle = "rgba(230,180,80,0.35)";
          g.beginPath();
          g.moveTo(x, y - 6);
          g.lineTo(x + 12, y);
          g.lineTo(x, y + 6);
          g.lineTo(x - 12, y);
          g.closePath();
          g.stroke();
        }
      } else if (style === "catedral") {
        if (j === mid - 1 || j === mid + 1) {
          g.strokeStyle = "rgba(230,190,90,0.4)";
          g.beginPath();
          g.moveTo(...a);
          g.lineTo(...b);
          g.stroke();
        } else {
          quad(a, b, cc, d);
          g.stroke();
        }
      } else {
        quad(a, b, cc, d);
        g.stroke();
      }
      if (h < 0.05 && style !== "conserv") {
        const [x, y] = P((i + 0.5) * TILE, (j + 0.5) * TILE);
        g.fillStyle = "rgba(210,200,170,0.25)";
        g.fillRect(Math.round(x) - 3, Math.round(y) - 1, 6, 3);
      }
    }
  if (style === "teatro") {
    // marca em X de fita no centro do palco
    const [x, y] = P(ROOM / 2, ROOM / 2);
    g.strokeStyle = "rgba(240,220,120,0.4)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x - 8, y - 4);
    g.lineTo(x + 8, y + 4);
    g.moveTo(x + 8, y - 4);
    g.lineTo(x - 8, y + 4);
    g.stroke();
  }

  // ------------------------------------------------------------ paredes
  const half = (ROOM - DOOR) / 2;
  const wall = (ax: number, ay: number, bx: number, by: number, side: 0 | 1, seed: number) => {
    const shade = side ? 0.3 : 0.1;
    const len = Math.hypot(bx - ax, by - ay);
    const at = (t: number): Pt => [ax + (bx - ax) * t, ay + (by - ay) * t];
    const face = (col: string, top = WALL, bottom = 0) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(ax, ay - bottom);
      g.lineTo(bx, by - bottom);
      g.lineTo(bx, by - top);
      g.lineTo(ax, ay - top);
      g.closePath();
      g.fill();
    };
    switch (style) {
      case "teatro": {
        // cortinas de veludo com dobras
        for (let s = 0; s < len; s += 2) {
          const [x, y] = at(s / len);
          const k = 0.5 + 0.5 * Math.sin(s * 0.55);
          const R = Math.round(110 + 70 * k);
          g.fillStyle = `rgb(${R},${Math.round(18 + 14 * k)},${Math.round(32 + 16 * k)})`;
          g.fillRect(x, y - WALL, 2.2, WALL);
        }
        // sanefa dourada
        g.fillStyle = "#c89838";
        for (let s = 0; s < len; s += 3) {
          const [x, y] = at(s / len);
          g.fillRect(x, y - WALL, 3, 3);
          if (Math.floor(s / 3) % 2) g.fillRect(x + 1, y - WALL + 3, 1, 2);
        }
        break;
      }
      case "conserv": {
        face("#55665f");
        face("#3a4844", 14, 0);
        g.fillStyle = "rgba(255,255,255,0.08)";
        for (let s = 0; s < len; s += 4) {
          const [x, y] = at(s / len);
          g.fillRect(x, y - 15, 4, 1);
        }
        // janelas em arco com luar
        for (let t = 0.2; t < 0.95; t += 0.3) {
          const [x, y] = at(t);
          const top = y - WALL + 6;
          g.fillStyle = "#28405e";
          g.fillRect(x - 5, top + 5, 10, 20);
          g.beginPath();
          g.arc(x, top + 5, 5, Math.PI, 0);
          g.fill();
          const gr = g.createLinearGradient(x, top, x, top + 25);
          gr.addColorStop(0, "rgba(170,210,255,0.8)");
          gr.addColorStop(1, "rgba(90,140,220,0.4)");
          g.fillStyle = gr;
          g.fillRect(x - 4, top + 5, 8, 19);
          g.beginPath();
          g.arc(x, top + 5, 4, Math.PI, 0);
          g.fill();
          g.fillStyle = "#28405e";
          g.fillRect(x - 0.5, top + 1, 1, 23);
          g.fillRect(x - 4, top + 12, 8, 1);
          lights.push({ x, y: y + 22, r: 50, color: "#9ac8ff", flicker: 0 });
        }
        break;
      }
      case "catedral": {
        face("#3a3450");
        g.strokeStyle = "rgba(0,0,0,0.3)";
        for (let k = 7; k < WALL; k += 8) {
          g.beginPath();
          g.moveTo(ax, ay - k);
          g.lineTo(bx, by - k);
          g.stroke();
        }
        // tubos do órgão
        const [cx, cy] = at(0.5);
        for (let p = -5; p <= 5; p++) {
          const hgt = 30 + (5 - Math.abs(p)) * 6;
          const x = cx + p * 4.5;
          const y = cy + (p * 4.5 * (by - ay)) / Math.max(1, bx - ax);
          const gr = g.createLinearGradient(x - 2, 0, x + 2, 0);
          gr.addColorStop(0, "#6a6a7a");
          gr.addColorStop(0.5, "#d8d8e8");
          gr.addColorStop(1, "#5a5a6a");
          g.fillStyle = gr;
          g.fillRect(x - 2, y - hgt - 4, 4, hgt);
          g.fillStyle = "#1a1420";
          g.fillRect(x - 1, y - hgt + 6, 2, 2);
        }
        // vitral circular com as 7 cores dos graus
        for (const t of [0.2, 0.8]) {
          const [x, y] = at(t);
          const yy = y - WALL + 16;
          for (let k = 0; k < 7; k++) {
            g.fillStyle = DEGREE_COLORS[k];
            g.beginPath();
            g.moveTo(x, yy);
            g.arc(x, yy, 9, (k / 7) * Math.PI * 2, ((k + 1) / 7) * Math.PI * 2);
            g.closePath();
            g.fill();
          }
          g.strokeStyle = "#1a1420";
          g.lineWidth = 1;
          g.beginPath();
          g.arc(x, yy, 9, 0, Math.PI * 2);
          g.stroke();
          g.fillStyle = "#fff6d8";
          g.fillRect(x - 1, yy - 1, 2, 2);
          lights.push({ x, y: y + 24, r: 46, color: DEGREE_COLORS[(seed + Math.round(t * 5)) % 7], flicker: 0 });
        }
        break;
      }
      case "opera": {
        face("#4a1820");
        // camarotes dourados
        for (let t = 0.12; t < 0.95; t += 0.19) {
          const [x, y] = at(t);
          g.fillStyle = "#c89838";
          g.fillRect(x - 6, y - WALL + 6, 12, 14);
          g.fillStyle = "#1a0608";
          g.fillRect(x - 5, y - WALL + 8, 10, 10);
          g.fillStyle = "#e8c060";
          g.fillRect(x - 6, y - WALL + 18, 12, 2);
          g.fillStyle = "#8a1a24";
          g.fillRect(x - 5, y - WALL + 8, 2, 8);
          g.fillRect(x + 3, y - WALL + 8, 2, 8);
        }
        // arandelas
        for (const t of [0.3, 0.7]) {
          const [x, y] = at(t);
          g.fillStyle = "#e8c060";
          g.fillRect(x - 1, y - 22, 2, 4);
          g.fillStyle = "#fff0b0";
          g.fillRect(x - 1, y - 25, 2, 2);
          lights.push({ x, y: y - 8, r: 58, color: "#ffb050", flicker: 1 });
        }
        break;
      }
      default: {
        // coliseu: arcos de pedra
        face("#6e604a");
        for (let t = 0.08; t < 1; t += 0.14) {
          const [x, y] = at(t);
          g.fillStyle = "#1a1612";
          g.fillRect(x - 5, y - 30, 10, 26);
          g.beginPath();
          g.arc(x, y - 30, 5, Math.PI, 0);
          g.fill();
          g.fillStyle = "#9a8a6a";
          g.fillRect(x + 6, y - WALL, 3, WALL);
        }
        g.fillStyle = "#a8987a";
        for (let s = 0; s < len; s += 2) {
          const [x, y] = at(s / len);
          g.fillRect(x, y - WALL, 2, 3);
        }
        for (const t of [0.25, 0.75]) {
          const [x, y] = at(t);
          g.fillStyle = "#3a3a3a";
          g.fillRect(x - 3, y - 12, 6, 4);
          g.fillStyle = "#8affe0";
          g.fillRect(x - 2, y - 15, 4, 3);
          lights.push({ x, y: y - 4, r: 56, color: "#8affe0", flicker: 1 });
        }
      }
    }
    g.fillStyle = `rgba(0,0,0,${shade})`;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.lineTo(bx, by - WALL);
    g.lineTo(ax, ay - WALL);
    g.closePath();
    g.fill();
  };
  if (!neighbor(-1, 0)) {
    if (hasDoor(-1, 0)) {
      wall(...P(0, 0), ...P(0, half), 0, 1);
      wall(...P(0, half + DOOR), ...P(0, ROOM), 0, 2);
    } else wall(...P(0, 0), ...P(0, ROOM), 0, 3);
  }
  if (!neighbor(0, -1)) {
    if (hasDoor(0, -1)) {
      wall(...P(0, 0), ...P(half, 0), 1, 4);
      wall(...P(half + DOOR, 0), ...P(ROOM, 0), 1, 5);
    } else wall(...P(0, 0), ...P(ROOM, 0), 1, 6);
  }
  // bordas da frente
  g.strokeStyle = "rgba(0,0,0,0.55)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(...P(ROOM, 0));
  g.lineTo(...P(ROOM, ROOM));
  g.lineTo(...P(0, ROOM));
  g.stroke();

  // ------------------------------------------------------------ objetos nos cantos do fundo
  const spots: Pt[] = [
    [22, 22],
    [70, 14],
    [14, 70],
    [130, 12],
    [12, 140],
  ];
  spots.forEach(([lx, ly], k) => {
    if (H(k, 7) < 0.25) return;
    const [x, y] = P(lx, ly).map(Math.round) as Pt;
    prop(g, style, k, x, y, lights);
  });
  return { canvas: c, lights };
}

function prop(g: CanvasRenderingContext2D, style: Style, k: number, x: number, y: number, lights: RoomLight[]): void {
  const R = (c: string, a: number, b: number, w: number, h: number) => {
    g.fillStyle = c;
    g.fillRect(x + a, y + b, w, h);
  };
  switch (style) {
    case "teatro":
      if (k === 0) {
        // piano de cauda
        R("#141018", -14, -10, 28, 9);
        R("#241c28", -14, -12, 24, 3);
        R("#f0ead8", -12, -2, 20, 2);
        for (let i = 0; i < 10; i++) R("#141018", -12 + i * 2, -2, 1, 1);
        R("#141018", -12, 0, 2, 6);
        R("#141018", 8, 0, 2, 6);
      } else if (k % 2) {
        // estante de partitura
        R("#2a2a30", -1, -14, 2, 14);
        R("#3a3a40", -6, -18, 12, 6);
        R("#e8e0c8", -5, -17, 10, 4);
        R("#3a3a40", -4, 0, 8, 1);
      } else {
        // refletor de palco
        R("#2a2a30", -1, -12, 2, 12);
        R("#4a4a52", -5, -18, 10, 7);
        R("#fff0b0", -4, -17, 3, 5);
        lights.push({ x: x - 2, y: y + 4, r: 40, color: "#ffe0a0", flicker: 0 });
      }
      break;
    case "conserv":
      if (k === 0) {
        // harpa
        g.strokeStyle = "#e8c050";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x - 6, y);
        g.lineTo(x - 6, y - 22);
        g.quadraticCurveTo(x + 4, y - 24, x + 6, y - 14);
        g.lineTo(x - 6, y);
        g.stroke();
        g.strokeStyle = "rgba(240,240,255,0.6)";
        g.lineWidth = 0.5;
        for (let i = 1; i < 5; i++) {
          g.beginPath();
          g.moveTo(x - 6 + i * 2.2, y - 3 - i * 1.2);
          g.lineTo(x - 6 + i * 2.2, y - 21);
          g.stroke();
        }
      } else if (k % 2) {
        // vaso com planta
        R("#7a4a2a", -4, -6, 8, 6);
        R("#2a7a4a", -6, -14, 12, 8);
        R("#3aa86a", -4, -18, 8, 6);
      } else {
        // estojo de violoncelo
        R("#3a2416", -4, -22, 8, 22);
        R("#5a3a22", -3, -21, 6, 20);
        R("#c8a040", -1, -12, 2, 2);
      }
      break;
    case "catedral":
      if (k % 2 === 0) {
        // candelabro
        R("#8a7a5a", -1, -14, 2, 14);
        R("#8a7a5a", -6, -14, 12, 2);
        for (const o of [-5, 0, 5]) {
          R("#f0ead8", o - 1, -19, 2, 5);
          R("#ffd27a", o - 1, -21, 2, 2);
        }
        lights.push({ x, y: y - 6, r: 46, color: "#ffc070", flicker: 1 });
      } else {
        // banco
        R("#4a2e1a", -12, -6, 24, 4);
        R("#3a2414", -12, -12, 24, 6);
        R("#2a1a10", -11, -2, 2, 2);
        R("#2a1a10", 9, -2, 2, 2);
      }
      break;
    case "opera":
      if (k === 0) {
        // lustre caído
        g.strokeStyle = "#e8c060";
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(x, y - 3, 12, 5, 0, 0, Math.PI * 2);
        g.stroke();
        for (let i = 0; i < 8; i++) R("#dff0ff", Math.round(Math.cos(i) * 11) - 1, Math.round(Math.sin(i) * 4) - 4, 2, 3);
        lights.push({ x, y, r: 44, color: "#ffe0a0", flicker: 1 });
      } else {
        // poltrona vermelha quebrada
        R("#8a1a24", -6, -10, 12, 6);
        R("#6a1018", -6, -4, 12, 4);
        R("#c89838", -6, -11, 12, 1);
      }
      break;
    default:
      if (k === 0) {
        // gramofone gigante
        g.fillStyle = "#c8963a";
        g.beginPath();
        g.moveTo(x - 2, y - 4);
        g.lineTo(x - 16, y - 26);
        g.lineTo(x + 6, y - 30);
        g.closePath();
        g.fill();
        R("#5a3a20", -6, -6, 12, 6);
      } else {
        // pedaço de coluna
        R("#a8987a", -5, -12, 10, 12);
        R("#8a7a5e", -5, -12, 3, 12);
        R("#c8b898", -6, -13, 12, 2);
      }
  }
}
