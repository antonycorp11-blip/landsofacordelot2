import { TAU } from "../core/math";
import { Rng } from "../core/rng";
import { DEGREE_COLORS } from "../data/content";
import { sprite, type Who } from "./chars";

/** Cenas animadas desenhadas por código (320×180 ampliado em pixel art), com legenda. */
export interface Shot {
  dur: number;
  caption: string;
  draw: (g: CanvasRenderingContext2D, t: number, k: number) => void;
}

const W = 320;
const H = 180;
type G = CanvasRenderingContext2D;

const R = (g: G, c: string, x: number, y: number, w: number, h: number) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const fig = (g: G, who: Who, x: number, y: number, pose: { walk?: number; act?: number; sleep?: boolean; spirit?: boolean; t: number }, scale = 2, flip = false, alpha = 1) => {
  const c = sprite(who, { walk: pose.walk ?? -1, act: pose.act ?? 0, sleep: pose.sleep, spirit: pose.spirit, t: pose.t }, scale);
  g.save();
  g.globalAlpha = alpha;
  g.translate(Math.round(x), 0);
  if (flip) g.scale(-1, 1);
  g.drawImage(c, -Math.round(c.width / 2), Math.round(y - c.height));
  g.restore();
};

function stars(g: G, t: number, n = 70, seed = 3) {
  const r = new Rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r.next() * W;
    const y = r.next() * H * 0.6;
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + r.next() * 3) + i);
    g.fillStyle = `rgba(255,250,230,${0.3 + 0.6 * tw})`;
    g.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
}

function notesRising(g: G, t: number, n: number, sour = 0, x0 = 0, x1 = W) {
  const r = new Rng(9);
  for (let i = 0; i < n; i++) {
    const sp = 8 + r.next() * 14;
    const x = x0 + r.next() * (x1 - x0) + Math.sin(t * 1.5 + i) * 6;
    const y = H - ((t * sp + r.next() * H) % (H + 20));
    const col = DEGREE_COLORS[i % 7];
    g.fillStyle = sour > r.next() ? "#3a1a3a" : col;
    // cabeça e haste de nota
    g.fillRect(Math.round(x), Math.round(y), 3, 2);
    g.fillRect(Math.round(x) + 2, Math.round(y) - 5, 1, 5);
    if (sour > r.next()) {
      g.fillStyle = "#ff3a5a";
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
      g.fillRect(Math.round(x) + 2, Math.round(y), 1, 1);
    }
  }
}

function curtains(g: G, open: number) {
  for (const side of [0, 1]) {
    const w = 60 - open * 30;
    for (let i = 0; i < w; i += 3) {
      const k = 0.5 + 0.5 * Math.sin(i * 0.9);
      g.fillStyle = `rgb(${Math.round(110 + 70 * k)},${Math.round(18 + 12 * k)},${Math.round(30 + 14 * k)})`;
      g.fillRect(side ? W - i - 3 : i, 0, 3, H);
    }
  }
  for (let i = 0; i < W; i += 20) {
    g.fillStyle = "#8a1424";
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 20, 0);
    g.lineTo(i + 20, 12);
    g.quadraticCurveTo(i + 10, 22, i, 12);
    g.fill();
  }
  R(g, "#e8c060", 0, 11, W, 1);
}

function stage(g: G, light: string) {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1a0c18");
  bg.addColorStop(1, "#08040a");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // assoalho do palco
  for (let y = 112; y < H; y += 5) {
    g.fillStyle = y % 10 ? "#5a3a22" : "#4e321c";
    g.fillRect(0, y, W, 5);
  }
  const sp = g.createRadialGradient(W / 2, 130, 0, W / 2, 130, 110);
  sp.addColorStop(0, light);
  sp.addColorStop(1, "rgba(0,0,0,0)");
  g.globalCompositeOperation = "lighter";
  g.fillStyle = sp;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
}

/** plateia em silhueta */
function audience(g: G, t: number, panic = 0) {
  const r = new Rng(4);
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 24; i++) {
      const x = i * 14 + (row % 2) * 7 + r.next() * 3;
      const bob = Math.round(Math.sin(t * (2 + panic * 6) + i + row) * (1 + panic * 2));
      const y = H - 8 - row * 9 + bob;
      g.fillStyle = row === 0 ? "#120a10" : row === 1 ? "#1a1018" : "#22141e";
      g.beginPath();
      g.arc(x, y - 6, 4, 0, TAU);
      g.fill();
      g.fillRect(x - 5, y - 3, 10, 12);
    }
}

function orchestra(g: G, t: number) {
  for (let i = 0; i < 6; i++) {
    const left = i < 3;
    const x = left ? 60 + i * 18 : 200 + (i - 3) * 18;
    const y = 112;
    g.fillStyle = "#1a1220";
    g.beginPath();
    g.arc(x, y - 18, 4, 0, TAU);
    g.fill();
    g.fillRect(x - 5, y - 14, 10, 14);
    // violino e arco
    g.fillStyle = "#8a4a22";
    g.fillRect(x + (left ? 2 : -6), y - 15, 4, 6);
    g.strokeStyle = "#d8c8a0";
    g.lineWidth = 1;
    g.beginPath();
    const a = Math.sin(t * 6 + i) * 0.5;
    g.moveTo(x + (left ? -2 : 2), y - 14);
    g.lineTo(x + (left ? 10 : -10), y - 18 + a * 6);
    g.stroke();
  }
}

/** Trítono em pixel art (silhueta grande) */
function tritonoBig(g: G, x: number, y: number, t: number, alpha = 1) {
  fig(g, "tritono", x, y, { act: 1, t }, 2, false, alpha);
}

function partitura(g: G, x: number, y: number, t: number, torn: number) {
  if (torn <= 0) {
    R(g, "#f0d890", x - 14, y - 9 + Math.sin(t * 2) * 1, 28, 18);
    for (let i = 0; i < 4; i++) R(g, "#8a6a30", x - 11, y - 5 + i * 3, 22, 1);
    g.globalCompositeOperation = "lighter";
    const gr = g.createRadialGradient(x, y, 0, x, y, 30);
    gr.addColorStop(0, "rgba(255,220,120,0.5)");
    gr.addColorStop(1, "rgba(255,220,120,0)");
    g.fillStyle = gr;
    g.fillRect(x - 30, y - 30, 60, 60);
    g.globalCompositeOperation = "source-over";
    return;
  }
  // cinco páginas voando
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.6;
    const d = torn * 120;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d * 0.6 - torn * 20;
    g.save();
    g.translate(px, py);
    g.rotate(torn * 6 + i);
    R(g, "#f0d890", -5, -4, 10, 8);
    R(g, "#8a6a30", -4, -2, 8, 1);
    R(g, "#8a6a30", -4, 1, 8, 1);
    g.restore();
  }
}

function cage(g: G, x: number, y: number, k: number) {
  const top = y - 76;
  const drop = (1 - k) * -100;
  g.fillStyle = "#e8c060";
  for (let i = 0; i < 5; i++) g.fillRect(x - 22, top + drop + 10 + i * 12, 44, 1);
  for (let i = -2; i <= 2; i++) g.fillRect(x + i * 11, top + drop + 6, 1, 70);
  g.fillRect(x - 24, top + drop + 76, 48, 2);
  g.fillRect(x - 16, top + drop + 4, 32, 2);
}

function city(g: G, t: number) {
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0a0a28");
  sky.addColorStop(0.7, "#2a1a48");
  sky.addColorStop(1, "#4a2a50");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  stars(g, t);
  // lua
  g.fillStyle = "#fff4d8";
  g.beginPath();
  g.arc(250, 36, 14, 0, TAU);
  g.fill();
  g.fillStyle = "#2a1a48";
  g.beginPath();
  g.arc(256, 32, 12, 0, TAU);
  g.fill();
  const pan = -t * 4;
  const r = new Rng(12);
  // prédios ao fundo
  for (let i = 0; i < 26; i++) {
    const w = 14 + r.next() * 18;
    const h = 30 + r.next() * 50;
    const x = ((i * 22 + pan * 0.5) % (W + 60)) - 30;
    R(g, "#1a1430", x, H - h - 20, w, h + 20);
  }
  // prédios da frente com janelas acesas
  for (let i = 0; i < 16; i++) {
    const w = 20 + r.next() * 20;
    const h = 24 + r.next() * 40;
    const x = ((i * 34 + pan) % (W + 80)) - 40;
    if (x > 110 && x < 210) continue;
    R(g, "#0e0a1c", x, H - h, w, h);
    for (let yy = H - h + 4; yy < H - 4; yy += 7)
      for (let xx = x + 3; xx < x + w - 3; xx += 6) if (r.next() < 0.45) R(g, "#ffd27a", xx, yy, 2, 3);
  }
  // o Grande Teatro no centro: cúpula e colunas
  const cx = 160;
  R(g, "#2a1e3a", cx - 50, H - 60, 100, 60);
  g.fillStyle = "#3a2a4e";
  g.beginPath();
  g.arc(cx, H - 60, 32, Math.PI, 0);
  g.fill();
  R(g, "#e8c060", cx - 1, H - 100, 2, 8);
  for (let i = 0; i < 6; i++) R(g, "#4a3a5e", cx - 44 + i * 17, H - 52, 6, 44);
  R(g, "#5a4a6e", cx - 50, H - 60, 100, 6);
  const glow = g.createRadialGradient(cx, H - 20, 0, cx, H - 20, 60);
  glow.addColorStop(0, "rgba(255,200,120,0.6)");
  glow.addColorStop(1, "rgba(255,200,120,0)");
  g.globalCompositeOperation = "lighter";
  g.fillStyle = glow;
  g.fillRect(cx - 60, H - 80, 120, 80);
  g.globalCompositeOperation = "source-over";
  R(g, "#ffd27a", cx - 8, H - 30, 16, 30);
  notesRising(g, t, 26);
}

export const INTRO: Shot[] = [
  {
    dur: 7,
    caption: "A cidade de Harmonia sempre amanheceu cantando. De cada janela saía uma melodia.",
    draw: (g, t) => city(g, t),
  },
  {
    dur: 8,
    caption: "Na noite do Grande Concerto, a jovem regente Clara regia a Partitura Primordial: a música que mantinha a cidade inteira afinada.",
    draw: (g, t) => {
      stage(g, "rgba(255,220,160,0.35)");
      orchestra(g, t);
      partitura(g, 160, 40, t, 0);
      fig(g, "clara", 160, 120, { act: 1, t });
      notesRising(g, t, 18, 0, 90, 230);
      audience(g, t);
      // Tito na primeira fila batendo palmas no tambor
      fig(g, "tito", 70, H - 2, { act: Math.sin(t * 8) > 0 ? 1 : 0, t }, 1.5);
      curtains(g, 1);
    },
  },
  {
    dur: 7,
    caption: "Até que as luzes se apagaram. Das sombras desceu o Maestro Trítono… e rasgou a Partitura em cinco páginas.",
    draw: (g, t, k) => {
      const flick = Math.sin(t * 30) > 0.3 ? 1 : 0.4;
      stage(g, `rgba(255,40,60,${0.35 * flick})`);
      orchestra(g, t * 0.2);
      partitura(g, 160, 40, t, Math.max(0, k * 1.6 - 0.6));
      fig(g, "clara", 190, 120, { t });
      // fumaça
      for (let i = 0; i < 14; i++) {
        const a = i * 1.7 + t;
        g.fillStyle = `rgba(40,10,30,${0.5})`;
        g.beginPath();
        g.arc(120 + Math.cos(a) * 20, 100 + Math.sin(a * 1.3) * 8, 10 + (i % 3) * 3, 0, TAU);
        g.fill();
      }
      tritonoBig(g, 120, 60 + Math.min(1, k * 2) * 60, t, Math.min(1, k * 3));
      audience(g, t, 1);
      curtains(g, 1);
    },
  },
  {
    dur: 8,
    caption: "Uma gaiola de pautas prendeu Clara. Antes de ser levada, ela jogou a batuta para o irmão… e colocou nela a própria alma.",
    draw: (g, t, k) => {
      stage(g, "rgba(120,140,255,0.25)");
      fig(g, "tritono", 110, 120, { act: 1, t }, 2);
      fig(g, "clara", 190, 120, { t, sleep: k > 0.6 });
      cage(g, 190, 120, Math.min(1, k * 2.2));
      // a batuta voa em arco até o Tito e uma luz azul sai da Clara
      const bk = Math.max(0, Math.min(1, (k - 0.35) * 2.2));
      if (bk > 0) {
        const bx = 190 + (60 - 190) * bk;
        const by = 80 - Math.sin(bk * Math.PI) * 60 + (H - 30 - 80) * bk;
        g.save();
        g.translate(bx, by);
        g.rotate(bk * 12);
        R(g, "#fffaf0", -6, -1, 12, 2);
        g.restore();
        g.globalCompositeOperation = "lighter";
        const gr = g.createRadialGradient(bx, by, 0, bx, by, 16);
        gr.addColorStop(0, "rgba(160,210,255,0.9)");
        gr.addColorStop(1, "rgba(160,210,255,0)");
        g.fillStyle = gr;
        g.fillRect(bx - 16, by - 16, 32, 32);
        g.globalCompositeOperation = "source-over";
      }
      audience(g, t, 1);
      fig(g, "tito", 60, H - 2, { act: bk >= 1 ? 1 : 0, t }, 1.5);
      curtains(g, 1);
    },
  },
  {
    dur: 7,
    caption: "As notas que se soltaram azedaram. Viraram Dissonâncias: notas vivas que odeiam qualquer som afinado.",
    draw: (g, t, k) => {
      stage(g, "rgba(120,40,160,0.25)");
      notesRising(g, t, 40, Math.min(1, k * 1.5));
      fig(g, "tito", 160, 140, { t }, 2);
      // a batuta brilha na mão do Tito
      g.globalCompositeOperation = "lighter";
      const gr = g.createRadialGradient(178, 96, 0, 178, 96, 22);
      gr.addColorStop(0, "rgba(160,210,255,0.8)");
      gr.addColorStop(1, "rgba(160,210,255,0)");
      g.fillStyle = gr;
      g.fillRect(150, 70, 56, 56);
      g.globalCompositeOperation = "source-over";
      curtains(g, 0.6 + k * 0.4);
    },
  },
  {
    dur: 7,
    caption: "Sozinho, Tito correu para a oficina da velha professora da irmã: Dona Fermata.",
    draw: (g, t) => {
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#2a1c14");
      bg.addColorStop(1, "#140c08");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      // prateleiras com instrumentos
      for (let s = 0; s < 3; s++) {
        R(g, "#5a3a22", 20, 30 + s * 32, 280, 3);
        for (let i = 0; i < 9; i++) {
          const x = 30 + i * 30 + (s % 2) * 10;
          const kind = (i + s) % 4;
          if (kind === 0) {
            R(g, "#a8642a", x, 12 + s * 32, 8, 16);
            R(g, "#2a1a10", x + 3, 4 + s * 32, 2, 10);
          } else if (kind === 1) R(g, "#c8963a", x, 16 + s * 32, 12, 12);
          else if (kind === 2) {
            g.fillStyle = "#e8d8b0";
            g.fillRect(x, 20 + s * 32, 14, 8);
          } else R(g, "#7a4ab0", x + 2, 14 + s * 32, 6, 14);
        }
      }
      // lampião quente
      g.globalCompositeOperation = "lighter";
      const lamp = g.createRadialGradient(240, 70, 0, 240, 70, 120);
      lamp.addColorStop(0, "rgba(255,190,110,0.45)");
      lamp.addColorStop(1, "rgba(255,190,110,0)");
      g.fillStyle = lamp;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = "source-over";
      R(g, "#3a2414", 0, 150, W, 30);
      fig(g, "fermata", 200, 156, { t }, 2);
      fig(g, "tito", 120, 156, { t }, 2, true);
      g.globalCompositeOperation = "lighter";
      const gr = g.createRadialGradient(100, 120, 0, 100, 120, 18);
      gr.addColorStop(0, "rgba(160,210,255,0.7)");
      gr.addColorStop(1, "rgba(160,210,255,0)");
      g.fillStyle = gr;
      g.fillRect(80, 100, 40, 40);
      g.globalCompositeOperation = "source-over";
    },
  },
];

/** tocador de cenas: desenha no canvas principal e mostra legenda + botão pular */
export class Cutscene {
  private low: HTMLCanvasElement;
  private g: G;
  private i = 0;
  private t = 0;
  private ui: HTMLElement;
  private cap: HTMLElement;
  private typed = 0;
  done = false;

  constructor(
    private shots: Shot[],
    parent: HTMLElement,
    touch: boolean,
    private onDone: () => void,
    private onShot?: (i: number) => void,
  ) {
    this.low = document.createElement("canvas");
    this.low.width = W;
    this.low.height = H;
    this.g = this.low.getContext("2d")!;
    const ui = document.createElement("div");
    ui.className = "cutscene";
    ui.innerHTML = `<div class="cap"></div><small>${touch ? "toque" : "clique"} para continuar</small><button class="skipcut">pular abertura ▸▸</button>`;
    parent.appendChild(ui);
    this.ui = ui;
    this.cap = ui.querySelector(".cap") as HTMLElement;
    ui.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".skipcut")) return this.finish();
      this.advance();
    });
    this.onShot?.(0);
  }

  private advance(): void {
    const s = this.shots[this.i];
    if (this.typed < s.caption.length) {
      this.typed = s.caption.length;
      return;
    }
    this.next();
  }

  private next(): void {
    this.i++;
    this.t = 0;
    this.typed = 0;
    if (this.i >= this.shots.length) return this.finish();
    this.onShot?.(this.i);
  }

  finish(): void {
    if (this.done) return;
    this.done = true;
    this.ui.remove();
    this.onDone();
  }

  draw(main: HTMLCanvasElement, dt: number): void {
    if (this.done) return;
    const s = this.shots[this.i];
    this.t += dt;
    if (this.t > s.dur + Math.max(0, s.caption.length / 35 - s.dur * 0.6)) this.next();
    if (this.done) return;
    const shot = this.shots[this.i];
    const k = Math.min(1, this.t / shot.dur);
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.imageSmoothingEnabled = false;
    shot.draw(g, this.t, k);
    // fade de entrada e saída
    const fade = Math.min(1, this.t / 0.6, (shot.dur - this.t) / 0.6 + 0.4);
    if (fade < 1) {
      g.fillStyle = `rgba(0,0,0,${1 - Math.max(0, fade)})`;
      g.fillRect(0, 0, W, H);
    }
    this.typed = Math.min(shot.caption.length, this.typed + dt * 45);
    this.cap.textContent = shot.caption.slice(0, Math.floor(this.typed));
    // cobre a tela mantendo a proporção (corta as bordas)
    const mg = main.getContext("2d")!;
    mg.setTransform(1, 0, 0, 1, 0, 0);
    mg.imageSmoothingEnabled = false;
    mg.fillStyle = "#000";
    mg.fillRect(0, 0, main.width, main.height);
    const sc = Math.max(main.width / W, (main.height * 0.82) / H);
    const dw = W * sc;
    const dh = H * sc;
    mg.drawImage(this.low, (main.width - dw) / 2, (main.height * 0.82 - dh) / 2, dw, dh);
  }
}
