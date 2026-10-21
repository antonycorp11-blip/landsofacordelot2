import { TAU, clamp } from "../core/math";
import type { AlienId, UnitId } from "../data/content";

type G = CanvasRenderingContext2D;

export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * k), 0, 255);
  const g = clamp(Math.round(((n >> 8) & 255) * k), 0, 255);
  const b = clamp(Math.round((n & 255) * k), 0, 255);
  return `rgb(${r},${g},${b})`;
}

function rr(g: G, x: number, y: number, w: number, h: number, r: number): void {
  const q = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + q, y);
  g.arcTo(x + w, y, x + w, y + h, q);
  g.arcTo(x + w, y + h, x, y + h, q);
  g.arcTo(x, y + h, x, y, q);
  g.arcTo(x, y, x + w, y, q);
  g.closePath();
}

/** Metal com volume: gradiente vertical claro em cima, escuro embaixo. */
function metal(g: G, y0: number, y1: number, base: string): CanvasGradient {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, shade(base, 1.35));
  gr.addColorStop(0.45, shade(base, 1));
  gr.addColorStop(1, shade(base, 0.55));
  return gr;
}

function glowDot(g: G, x: number, y: number, r: number, color: string, a = 1): void {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(255,255,255,${a})`);
  gr.addColorStop(0.35, color);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function shadow(g: G, w: number, h = 9): void {
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  g.ellipse(0, 0, w, h, 0, 0, TAU);
  g.fill();
}

function outline(g: G): void {
  g.strokeStyle = "rgba(8,10,20,0.85)";
  g.lineWidth = 2.2;
  g.stroke();
}

/** Desenha uma unidade com os pés em (0,0). `t` anima, `charge` 0..1 antecipa o disparo. */
export function drawUnit(g: G, id: UnitId, t: number, recoil: number, charge: number, flash: number, hpFrac: number, armed = true): void {
  g.save();
  shadow(g, 34);
  const kick = -recoil * 6;
  switch (id) {
    case "generator": {
      // base
      rr(g, -26, -22, 52, 22, 6);
      g.fillStyle = metal(g, -22, 0, "#5a6478");
      g.fill();
      outline(g);
      // mastro
      g.fillStyle = metal(g, -60, -20, "#7a8498");
      rr(g, -6, -60, 12, 40, 3);
      g.fill();
      outline(g);
      // painel solar inclinado
      g.save();
      g.translate(0, -62);
      g.rotate(-0.25 + Math.sin(t * 0.8) * 0.05);
      rr(g, -30, -12, 60, 20, 4);
      const pg = g.createLinearGradient(-30, -12, 30, 8);
      pg.addColorStop(0, "#1c2a6a");
      pg.addColorStop(0.5, "#3a5ad8");
      pg.addColorStop(1, "#1a2050");
      g.fillStyle = pg;
      g.fill();
      outline(g);
      g.strokeStyle = "rgba(160,200,255,0.5)";
      g.lineWidth = 1;
      for (let x = -20; x <= 20; x += 10) {
        g.beginPath();
        g.moveTo(x, -11);
        g.lineTo(x, 7);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(-29, -2);
      g.lineTo(29, -2);
      g.stroke();
      g.restore();
      // núcleo pulsando antes de gerar
      glowDot(g, 0, -12, 12 + charge * 10, `rgba(255,216,74,${0.6 + charge * 0.4})`);
      break;
    }
    case "blaster":
    case "cryo":
    case "double": {
      const col = id === "cryo" ? "#8ae8ff" : id === "double" ? "#3affb0" : "#4ae0ff";
      // tripé
      g.strokeStyle = "#2a3040";
      g.lineWidth = 5;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(-18, -2);
      g.lineTo(-4, -26);
      g.lineTo(18, -2);
      g.moveTo(-4, -26);
      g.lineTo(-2, -2);
      g.stroke();
      g.save();
      g.translate(kick, 0);
      // cano(s)
      const barrels = id === "double" ? [-46, -32] : [-40];
      for (const by of barrels) {
        rr(g, 0, by - 5, 42, 10, 4);
        g.fillStyle = metal(g, by - 5, by + 5, "#8a94a8");
        g.fill();
        outline(g);
        g.fillStyle = col;
        g.fillRect(36, by - 4, 6, 8);
      }
      // corpo
      g.beginPath();
      g.ellipse(-4, -38, 22, 18, 0, 0, TAU);
      g.fillStyle = metal(g, -56, -20, id === "cryo" ? "#c8d8e8" : "#e8ecf2");
      g.fill();
      outline(g);
      // visor
      g.beginPath();
      g.ellipse(2, -42, 9, 7, 0, 0, TAU);
      g.fillStyle = "#101828";
      g.fill();
      glowDot(g, 4, -43, 9 + charge * 4, col);
      if (id === "cryo") {
        g.fillStyle = "rgba(200,245,255,0.9)";
        for (const [x, y, s] of [
          [-20, -52, 7],
          [-14, -58, 5],
          [-24, -44, 5],
        ]) {
          g.beginPath();
          g.moveTo(x, y - s);
          g.lineTo(x + s * 0.5, y);
          g.lineTo(x, y + s * 0.6);
          g.lineTo(x - s * 0.5, y);
          g.closePath();
          g.fill();
        }
      }
      g.restore();
      break;
    }
    case "wall": {
      // moldura
      rr(g, -26, -78, 52, 78, 8);
      g.fillStyle = metal(g, -78, 0, "#4a5878");
      g.fill();
      outline(g);
      // campo de energia hexagonal
      const a = 0.55 + Math.sin(t * 3) * 0.1;
      const eg = g.createLinearGradient(-20, -72, 20, -6);
      eg.addColorStop(0, `rgba(140,180,255,${a})`);
      eg.addColorStop(1, `rgba(80,110,255,${a * 0.8})`);
      rr(g, -19, -71, 38, 64, 5);
      g.fillStyle = eg;
      g.fill();
      g.strokeStyle = "rgba(220,235,255,0.5)";
      g.lineWidth = 1;
      for (let row = 0; row < 5; row++)
        for (let c = 0; c < 3; c++) {
          const cx = -12 + c * 12 + (row % 2) * 6;
          const cy = -64 + row * 12;
          if (cx > 16) continue;
          g.beginPath();
          for (let k = 0; k < 6; k++) {
            const aa = (k / 6) * TAU;
            const px = cx + Math.cos(aa) * 6;
            const py = cy + Math.sin(aa) * 6;
            k ? g.lineTo(px, py) : g.moveTo(px, py);
          }
          g.closePath();
          g.stroke();
        }
      // rachaduras conforme o dano
      if (hpFrac < 0.66) {
        g.strokeStyle = "rgba(255,255,255,0.8)";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-10, -60);
        g.lineTo(-2, -44);
        g.lineTo(-8, -30);
        if (hpFrac < 0.33) {
          g.moveTo(12, -66);
          g.lineTo(4, -50);
          g.lineTo(12, -36);
          g.lineTo(6, -18);
        }
        g.stroke();
      }
      break;
    }
    case "mine": {
      g.beginPath();
      g.ellipse(0, -6, 24, 10, 0, 0, TAU);
      g.fillStyle = metal(g, -16, 4, "#5a5a62");
      g.fill();
      outline(g);
      g.beginPath();
      g.ellipse(0, -10, 14, 6, 0, 0, TAU);
      g.fillStyle = "#3a3a42";
      g.fill();
      const blink = armed ? (Math.sin(t * 8) > 0 ? 1 : 0.3) : 0.25;
      glowDot(g, 0, -12, 8, armed ? `rgba(255,70,40,${blink})` : "rgba(255,200,80,0.5)", blink);
      if (!armed) {
        g.strokeStyle = "rgba(255,210,90,0.8)";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, -12, 11, -Math.PI / 2, -Math.PI / 2 + TAU * charge);
        g.stroke();
      }
      break;
    }
    case "laser": {
      rr(g, -24, -24, 48, 24, 6);
      g.fillStyle = metal(g, -24, 0, "#4a4458");
      g.fill();
      outline(g);
      g.save();
      g.translate(kick, 0);
      rr(g, -16, -50, 66, 16, 6);
      g.fillStyle = metal(g, -50, -34, "#d8d4e4");
      g.fill();
      outline(g);
      for (let k = 0; k < 3; k++) {
        g.fillStyle = "#ff4a8a";
        g.fillRect(4 + k * 12, -48, 4, 12);
      }
      glowDot(g, 52, -42, 8 + charge * 14, `rgba(255,74,138,${0.4 + charge * 0.6})`);
      g.restore();
      break;
    }
    case "tesla": {
      rr(g, -22, -18, 44, 18, 5);
      g.fillStyle = metal(g, -18, 0, "#4a4060");
      g.fill();
      outline(g);
      rr(g, -6, -74, 12, 58, 3);
      g.fillStyle = metal(g, -74, -16, "#8a7aa8");
      g.fill();
      outline(g);
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.ellipse(0, -28 - k * 12, 16 - k * 2, 4, 0, 0, TAU);
        g.fillStyle = "#c8a24a";
        g.fill();
        g.strokeStyle = "#5a4418";
        g.lineWidth = 1.5;
        g.stroke();
      }
      g.beginPath();
      g.arc(0, -80, 9, 0, TAU);
      g.fillStyle = metal(g, -89, -71, "#d8d0e8");
      g.fill();
      outline(g);
      glowDot(g, 0, -80, 14 + charge * 10 + Math.sin(t * 20) * 2, "rgba(192,138,255,0.9)");
      break;
    }
    case "mortar": {
      rr(g, -28, -26, 56, 26, 6);
      g.fillStyle = metal(g, -26, 0, "#5a5440");
      g.fill();
      outline(g);
      g.save();
      g.translate(0, -26);
      g.rotate(-0.55);
      rr(g, -22, -30, 44, 30, 5);
      g.fillStyle = metal(g, -30, 0, "#7a7458");
      g.fill();
      outline(g);
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.arc(-12 + k * 12, -15, 5, 0, TAU);
        g.fillStyle = "#2a2618";
        g.fill();
        if (charge > k / 3) glowDot(g, -12 + k * 12, -15, 4, "rgba(255,176,32,0.9)");
      }
      g.restore();
      // faixas de perigo
      g.fillStyle = "#ffb020";
      for (let k = -24; k < 24; k += 12) {
        g.beginPath();
        g.moveTo(k, -6);
        g.lineTo(k + 6, -6);
        g.lineTo(k + 10, -2);
        g.lineTo(k + 4, -2);
        g.closePath();
        g.fill();
      }
      break;
    }
  }
  void flash;
  g.restore();
}

/** Alienígena andando para a esquerda, pés em (0,0). */
export function drawAlien(g: G, id: AlienId, t: number, opts: { flash: number; slow: boolean; burn: boolean; shellFrac: number; biting: boolean; scale: number; jump: number }): void {
  g.save();
  g.scale(opts.scale, opts.scale);
  const walk = Math.sin(t * (id === "runner" ? 14 : id === "colossus" ? 4 : 8));
  const bob = Math.abs(walk) * 3;
  const bite = opts.biting ? Math.sin(t * 12) * 4 : 0;
  shadow(g, id === "colossus" ? 50 : id === "swarm" ? 12 : 28, id === "swarm" ? 4 : 8);
  if (opts.jump > 0) g.translate(0, -Math.sin((1 - opts.jump / 0.7) * Math.PI) * 70);
  const tint = (c: string) => (opts.slow ? shade(c, 0.85) : c);
  const legs = (n: number, spread: number, len: number, col: string) => {
    g.strokeStyle = col;
    g.lineWidth = 4;
    g.lineCap = "round";
    for (let k = 0; k < n; k++) {
      const ph = walk * (k % 2 ? 1 : -1);
      const x = -spread / 2 + (k * spread) / Math.max(1, n - 1);
      g.beginPath();
      g.moveTo(x, -len);
      g.lineTo(x + ph * 7 - 4, -len / 2);
      g.lineTo(x + ph * 9, 0);
      g.stroke();
    }
  };
  const eye = (x: number, y: number, r: number, pupil = "#101010") => {
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fillStyle = "#fffbe8";
    g.fill();
    g.strokeStyle = "rgba(0,0,0,0.6)";
    g.lineWidth = 1.5;
    g.stroke();
    g.beginPath();
    g.arc(x - r * 0.3, y + r * 0.1, r * 0.5, 0, TAU);
    g.fillStyle = pupil;
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.beginPath();
    g.arc(x - r * 0.45, y - r * 0.2, r * 0.18, 0, TAU);
    g.fill();
  };
  const body = (cx: number, cy: number, rx: number, ry: number, col: string) => {
    const gr = g.createRadialGradient(cx - rx * 0.3, cy - ry * 0.4, 1, cx, cy, Math.max(rx, ry));
    gr.addColorStop(0, shade(col, 1.45));
    gr.addColorStop(0.6, col);
    gr.addColorStop(1, shade(col, 0.5));
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    g.fillStyle = gr;
    g.fill();
    outline(g);
  };
  switch (id) {
    case "crawler": {
      legs(3, 30, 18, tint("#2e7a32"));
      body(0, -28 - bob, 26, 18, tint("#5ac84a"));
      g.fillStyle = tint("#3a9a3a");
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.arc(-8 + k * 9, -40 - bob, 4, 0, TAU);
        g.fill();
      }
      // boca
      g.beginPath();
      g.ellipse(-22, -22 - bob, 7, 4 + bite * 0.4, 0, 0, TAU);
      g.fillStyle = "#3a1018";
      g.fill();
      eye(-14, -34 - bob, 8);
      break;
    }
    case "runner": {
      legs(2, 14, 26, tint("#a8521a"));
      body(4, -38 - bob, 18, 14, tint("#ff8a3a"));
      // cauda
      g.strokeStyle = tint("#ff8a3a");
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(20, -40 - bob);
      g.quadraticCurveTo(34, -46 + walk * 4, 40, -36);
      g.stroke();
      // cabeça
      body(-16, -48 - bob, 12, 10, tint("#ffa85a"));
      eye(-20, -51 - bob, 5);
      g.fillStyle = "#3a1018";
      g.beginPath();
      g.moveTo(-28, -46 - bob);
      g.lineTo(-20, -43 - bob + bite * 0.3);
      g.lineTo(-27, -40 - bob);
      g.fill();
      break;
    }
    case "armored": {
      legs(3, 34, 18, tint("#4a4a5a"));
      body(0, -28 - bob, 26, 18, tint("#9a7ac8"));
      if (opts.shellFrac > 0) {
        // carapaça de rocha
        g.beginPath();
        g.moveTo(-30, -24 - bob);
        g.quadraticCurveTo(-28, -60 - bob, 4, -60 - bob);
        g.quadraticCurveTo(34, -58 - bob, 32, -22 - bob);
        g.closePath();
        const sg = g.createLinearGradient(0, -60, 0, -22);
        sg.addColorStop(0, tint("#b0b4bc"));
        sg.addColorStop(1, tint("#5a5e68"));
        g.fillStyle = sg;
        g.fill();
        outline(g);
        g.strokeStyle = "rgba(40,40,50,0.7)";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-14, -52 - bob);
        g.lineTo(-6, -40 - bob);
        g.moveTo(10, -56 - bob);
        g.lineTo(14, -38 - bob);
        if (opts.shellFrac < 0.5) {
          g.moveTo(-22, -40 - bob);
          g.lineTo(-10, -30 - bob);
          g.moveTo(22, -46 - bob);
          g.lineTo(26, -28 - bob);
        }
        g.stroke();
      }
      eye(-20, -30 - bob, 6, "#5a0a20");
      break;
    }
    case "swarm": {
      const fly = Math.sin(t * 40);
      g.translate(0, -34 + Math.sin(t * 5) * 5);
      g.fillStyle = `rgba(220,240,255,${0.5 + fly * 0.3})`;
      g.beginPath();
      g.ellipse(-2, -8, 10, 4 + fly * 3, -0.4, 0, TAU);
      g.ellipse(6, -8, 10, 4 - fly * 3, 0.4, 0, TAU);
      g.fill();
      body(0, 0, 12, 8, tint("#ffd84a"));
      g.fillStyle = "#3a2a08";
      g.fillRect(-2, -7, 3, 14);
      g.fillRect(5, -6, 3, 12);
      eye(-8, -1, 4);
      break;
    }
    case "jumper": {
      // pernas de mola
      g.strokeStyle = tint("#2a5a9a");
      g.lineWidth = 6;
      g.lineCap = "round";
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * 8, -24 - bob);
        g.lineTo(s * 18, -14);
        g.lineTo(s * 6, 0);
        g.stroke();
      }
      body(0, -36 - bob, 22, 20, tint("#4a9aff"));
      g.fillStyle = tint("#bfe0ff");
      g.beginPath();
      g.ellipse(-4, -30 - bob, 12, 9, 0, 0, TAU);
      g.fill();
      eye(-10, -50 - bob, 8);
      eye(6, -52 - bob, 7);
      break;
    }
    case "spitter": {
      legs(4, 36, 16, tint("#5a2a6a"));
      body(4, -32 - bob, 28, 22, tint("#b04ad8"));
      // bolsa de ácido
      const sac = 1 + Math.sin(t * 4) * 0.08;
      body(10, -56 - bob, 16 * sac, 14 * sac, tint("#7aff5a"));
      g.fillStyle = "rgba(220,255,200,0.6)";
      g.beginPath();
      g.arc(6, -62 - bob, 4, 0, TAU);
      g.fill();
      // bico
      g.fillStyle = tint("#6a2a8a");
      g.beginPath();
      g.moveTo(-22, -36 - bob);
      g.lineTo(-38, -32 - bob);
      g.lineTo(-22, -26 - bob);
      g.closePath();
      g.fill();
      outline(g);
      eye(-12, -38 - bob, 7, "#2a4a08");
      break;
    }
    case "colossus": {
      legs(2, 40, 34, tint("#6a1a1a"));
      // braços
      g.strokeStyle = tint("#a82a2a");
      g.lineWidth = 14;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(-20, -70 - bob);
      g.lineTo(-44 - bite, -40 - bob);
      g.lineTo(-48 - bite, -12);
      g.stroke();
      body(0, -62 - bob, 44, 40, tint("#d83a3a"));
      // placas
      g.fillStyle = tint("#7a1a1a");
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.moveTo(-20 + k * 14, -98 - bob);
        g.lineTo(-14 + k * 14, -112 - bob);
        g.lineTo(-8 + k * 14, -98 - bob);
        g.closePath();
        g.fill();
      }
      g.beginPath();
      g.ellipse(-32, -54 - bob, 12, 8 + bite * 0.5, 0, 0, TAU);
      g.fillStyle = "#2a0808";
      g.fill();
      g.fillStyle = "#fff";
      for (let k = 0; k < 4; k++) g.fillRect(-40 + k * 4, -60 - bob, 2.5, 4);
      eye(-22, -78 - bob, 9, "#ffcc00");
      eye(-4, -82 - bob, 8, "#ffcc00");
      break;
    }
  }
  g.restore();
}

/** Cores de sobreposição (aplicadas pelo renderizador num canvas auxiliar). */
export function alienTints(t: number, opts: { flash: number; slow: boolean; burn: boolean }): string[] {
  const out: string[] = [];
  if (opts.slow) out.push("rgba(140,220,255,0.35)");
  if (opts.burn) out.push(`rgba(255,140,40,${0.25 + Math.sin(t * 20) * 0.1})`);
  if (opts.flash > 0) out.push(`rgba(255,255,255,${Math.min(0.85, opts.flash * 9)})`);
  return out;
}

/** Célula de energia girando. */
export function drawOrb(g: G, t: number, fade: number): void {
  g.save();
  g.globalAlpha = fade;
  glowDot(g, 0, 0, 30, "rgba(255,216,74,0.6)");
  g.rotate(t * 2);
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    const px = Math.cos(a) * 13;
    const py = Math.sin(a) * 13;
    k ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
  const gr = g.createRadialGradient(-3, -3, 1, 0, 0, 14);
  gr.addColorStop(0, "#fffbe0");
  gr.addColorStop(0.5, "#ffd84a");
  gr.addColorStop(1, "#c88a10");
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = "#7a5000";
  g.lineWidth = 2;
  g.stroke();
  g.restore();
}

/** Drone de contenção (o “cortador de grama” de cada fileira). */
export function drawDrone(g: G, t: number, running: boolean): void {
  g.save();
  const hover = Math.sin(t * 6) * 3 - 20;
  g.fillStyle = "rgba(0,0,0,0.3)";
  g.beginPath();
  g.ellipse(0, 0, 26, 6, 0, 0, TAU);
  g.fill();
  g.translate(0, hover);
  rr(g, -26, -14, 52, 18, 8);
  g.fillStyle = metal(g, -14, 4, "#e0e4ec");
  g.fill();
  outline(g);
  g.fillStyle = "#ff3a3a";
  g.fillRect(16, -9, 10, 8);
  glowDot(g, 22, -5, running ? 16 : 8, "rgba(255,80,60,0.8)");
  // lâminas
  g.strokeStyle = running ? "rgba(255,255,255,0.9)" : "#aab";
  g.lineWidth = 3;
  const a = t * (running ? 40 : 4);
  for (const s of [-14, 8]) {
    g.beginPath();
    g.moveTo(s + Math.cos(a) * 10, 6);
    g.lineTo(s - Math.cos(a) * 10, 6);
    g.stroke();
  }
  g.restore();
}

/** Miniatura para as cartas e a árvore (canvas próprio). */
export function unitIcon(id: UnitId, size = 64): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = size * dpr;
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  const s = size / 100;
  g.translate(size / 2 - (id === "laser" ? 8 * s : 0), size * 0.86);
  g.scale(s, s);
  drawUnit(g, id, 0.5, 0, 0.6, 0, 1);
  return c;
}

export function alienIcon(id: AlienId, size = 64): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = size * dpr;
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  const s = (size / 100) * (id === "colossus" ? 0.55 : 0.85);
  g.translate(size / 2, size * 0.86);
  g.scale(s, s);
  drawAlien(g, id, 0.3, { flash: 0, slow: false, burn: false, shellFrac: 1, biting: false, scale: 1, jump: 0 });
  return c;
}
