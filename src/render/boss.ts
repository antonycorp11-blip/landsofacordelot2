/** O Maestro Trítono desenhado em pixels, com uma forma diferente em cada lugar. */

type G = CanvasRenderingContext2D;

const R = (g: G, c: string, x: number, y: number, w: number, h: number) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const poly = (g: G, c: string, pts: [number, number][]) => {
  g.fillStyle = c;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y))));
  g.closePath();
  g.fill();
};

/** máscara de porcelana: rosto branco, olhos fendidos que brilham */
function mask(g: G, x: number, y: number, s: number, t: number, half = false, smile = 0) {
  poly(g, "#0c0810", [
    [x - 5 * s, y - 6 * s],
    [x + 5 * s, y - 6 * s],
    [x + 6 * s, y],
    [x + 3 * s, y + 6 * s],
    [x - 3 * s, y + 6 * s],
    [x - 6 * s, y],
  ]);
  poly(g, "#efe8dc", [
    [x - 4 * s, y - 5 * s],
    [x + 4 * s, y - 5 * s],
    [x + 5 * s, y],
    [x + 2.5 * s, y + 5 * s],
    [x - 2.5 * s, y + 5 * s],
    [x - 5 * s, y],
  ]);
  if (half) poly(g, "#2a0c14", [
    [x, y - 5 * s],
    [x + 4 * s, y - 5 * s],
    [x + 5 * s, y],
    [x + 2.5 * s, y + 5 * s],
    [x, y + 5 * s],
  ]);
  const glow = 0.6 + 0.4 * Math.sin(t * 6);
  g.fillStyle = `rgba(255,${Math.round(40 + 40 * glow)},80,1)`;
  g.fillRect(Math.round(x - 3 * s), Math.round(y - 2 * s), Math.round(2 * s), Math.max(1, Math.round(s)));
  if (!half) g.fillRect(Math.round(x + 1 * s), Math.round(y - 2 * s), Math.round(2 * s), Math.max(1, Math.round(s)));
  // lágrima vermelha e boca
  R(g, "#c82a3a", x - 2.5 * s, y - 1 * s, Math.max(1, s * 0.6), 2 * s);
  if (smile > 0) R(g, "#3a1018", x - 2 * s, y + 2.5 * s, 4 * s, Math.max(1, s * 0.6));
  else {
    R(g, "#3a1018", x - 2 * s, y + 3 * s, 4 * s, Math.max(1, s * 0.6));
    R(g, "#3a1018", x - 2.5 * s, y + 3.5 * s, Math.max(1, s * 0.6), Math.max(1, s * 0.6));
    R(g, "#3a1018", x + 2 * s, y + 3.5 * s, Math.max(1, s * 0.6), Math.max(1, s * 0.6));
  }
}

function baton(g: G, x: number, y: number, t: number, s: number) {
  const a = -1.1 + Math.sin(t * 4) * 0.5;
  g.strokeStyle = "#f4eee4";
  g.lineWidth = Math.max(1, s);
  g.beginPath();
  g.moveTo(Math.round(x), Math.round(y));
  g.lineTo(Math.round(x + Math.cos(a) * 12 * s), Math.round(y + Math.sin(a) * 12 * s));
  g.stroke();
  R(g, "#ffd27a", x + Math.cos(a) * 12 * s - 1, y + Math.sin(a) * 12 * s - 1, 2, 2);
}

/** forma 0..4; (x, y) = pés no chão */
export function drawBoss(g: G, form: number, x: number, y: number, t: number, flash: boolean, angry: boolean): void {
  g.save();
  const s = form === 4 ? 1.35 : 1;
  const bob = form === 2 ? Math.round(Math.sin(t * 2.5) * 2) - 4 : 0;
  const by = y + bob;
  // sombra
  g.fillStyle = "rgba(0,0,0,0.5)";
  g.beginPath();
  g.ellipse(x, y, 14 * s, 5 * s, 0, 0, Math.PI * 2);
  g.fill();
  if (angry) {
    g.globalCompositeOperation = "lighter";
    const gr = g.createRadialGradient(x, by - 18 * s, 0, x, by - 18 * s, 30 * s);
    gr.addColorStop(0, "rgba(255,40,80,0.35)");
    gr.addColorStop(1, "rgba(255,40,80,0)");
    g.fillStyle = gr;
    g.fillRect(x - 30 * s, by - 48 * s, 60 * s, 60 * s);
    g.globalCompositeOperation = "source-over";
  }
  switch (form) {
    case 0: {
      // Regente Mascarado: casaca preta com cauda, capa roxa, cartola
      poly(g, "#3a1650", [
        [x - 12, by - 26],
        [x + 12, by - 26],
        [x + 15, by - 2],
        [x - 15, by - 2],
      ]);
      poly(g, "#16101e", [
        [x - 8, by - 28],
        [x + 8, by - 28],
        [x + 10, by - 6],
        [x + 4, by],
        [x - 4, by],
        [x - 10, by - 6],
      ]);
      poly(g, "#f4eee4", [
        [x - 3, by - 28],
        [x + 3, by - 28],
        [x, by - 18],
      ]);
      R(g, "#c82a3a", x - 3, by - 27, 6, 2);
      R(g, "#16101e", x - 4, by, 3, 2);
      R(g, "#16101e", x + 1, by, 3, 2);
      // braço com batuta
      R(g, "#16101e", x + 8, by - 26, 3, 9);
      baton(g, x + 10, by - 26, t, 1);
      mask(g, x, by - 34, 1, t);
      R(g, "#0c0810", x - 6, by - 43, 12, 4);
      R(g, "#0c0810", x - 4, by - 50, 8, 7);
      R(g, "#c82a3a", x - 4, by - 45, 8, 1);
      break;
    }
    case 1: {
      // Pianista de Ébano: corpo de piano de cauda, tampa aberta como asa
      poly(g, "#0c0810", [
        [x - 4, by - 30],
        [x - 22, by - 44],
        [x - 18, by - 22],
      ]);
      poly(g, "#1a141e", [
        [x - 12, by - 26],
        [x + 12, by - 26],
        [x + 14, by - 4],
        [x - 14, by - 4],
      ]);
      R(g, "#f4eee4", x - 12, by - 16, 24, 5);
      for (let i = 0; i < 6; i++) R(g, "#0c0810", x - 11 + i * 4, by - 16, 2, 3);
      R(g, "#3a3440", x - 13, by - 27, 26, 2);
      R(g, "#0c0810", x - 11, by - 4, 3, 4);
      R(g, "#0c0810", x + 8, by - 4, 3, 4);
      // braços longos com dedos de tecla
      R(g, "#1a141e", x - 16, by - 24, 3, 12);
      R(g, "#1a141e", x + 13, by - 24, 3, 12);
      R(g, "#f4eee4", x - 16, by - 12, 3, 2);
      R(g, "#f4eee4", x + 13, by - 12, 3, 2);
      mask(g, x, by - 32, 1, t);
      R(g, "#0c0810", x - 7, by - 39, 14, 3);
      break;
    }
    case 2: {
      // Organista Sombrio: túnica roxa com capuz e tubos de órgão como asas
      for (let i = -3; i <= 3; i++) {
        const h = 22 + (3 - Math.abs(i)) * 6;
        const px = x + i * 4.5;
        R(g, "#5a5a6a", px - 2, by - 20 - h, 4, h);
        R(g, "#d8d8e8", px - 1, by - 20 - h, 1, h);
        R(g, "#1a1420", px - 1, by - 20 - h + 4, 2, 2);
      }
      poly(g, "#3a1858", [
        [x - 6, by - 32],
        [x + 6, by - 32],
        [x + 14, by - 2],
        [x - 14, by - 2],
      ]);
      poly(g, "#24103a", [
        [x - 8, by - 40],
        [x + 8, by - 40],
        [x + 9, by - 28],
        [x - 9, by - 28],
      ]);
      R(g, "#ffd27a", x - 1, by - 24, 2, 18);
      mask(g, x, by - 33, 0.85, t);
      break;
    }
    case 3: {
      // Fantasma da Ópera: capa vermelha larga, meia máscara, cartola e rosa
      poly(g, "#7a1020", [
        [x - 6, by - 30],
        [x + 6, by - 30],
        [x + 20, by - 2],
        [x - 20, by - 2],
      ]);
      poly(g, "#16101e", [
        [x - 6, by - 28],
        [x + 6, by - 28],
        [x + 7, by - 4],
        [x - 7, by - 4],
      ]);
      R(g, "#f4eee4", x - 2, by - 28, 4, 8);
      R(g, "#c82a3a", x + 8, by - 18, 3, 3);
      R(g, "#2a7a4a", x + 9, by - 15, 1, 5);
      mask(g, x, by - 34, 1, t, true);
      R(g, "#0c0810", x - 7, by - 42, 14, 3);
      R(g, "#0c0810", x - 5, by - 49, 10, 7);
      // coroa de cristais do lustre
      for (let i = -2; i <= 2; i++) R(g, "#dff0ff", x + i * 3 - 1, by - 51 - (i % 2 === 0 ? 2 : 0), 2, 3);
      break;
    }
    default: {
      // Supremo Desafinado: duas máscaras (alegria e tristeza), cornetas de gramofone, teclas e tubos
      poly(g, "#c8963a", [
        [x - 10 * s, by - 30 * s],
        [x - 26 * s, by - 46 * s],
        [x - 20 * s, by - 26 * s],
      ]);
      poly(g, "#c8963a", [
        [x + 10 * s, by - 30 * s],
        [x + 26 * s, by - 46 * s],
        [x + 20 * s, by - 26 * s],
      ]);
      poly(g, "#16101e", [
        [x - 14 * s, by - 30 * s],
        [x + 14 * s, by - 30 * s],
        [x + 17 * s, by - 2],
        [x - 17 * s, by - 2],
      ]);
      R(g, "#f4eee4", x - 13 * s, by - 18 * s, 26 * s, 4 * s);
      for (let i = 0; i < 7; i++) R(g, "#0c0810", x - 12 * s + i * 4 * s, by - 18 * s, 2 * s, 3 * s);
      for (let i = 0; i < 5; i++) {
        const c = 0.5 + 0.5 * Math.sin(t * 5 + i);
        R(g, `rgba(255,${Math.round(40 + 60 * c)},60,1)`, x - 10 * s + i * 5 * s, by - 26 * s + (i % 2) * 3, 1, 5 * s);
      }
      mask(g, x - 7 * s, by - 36 * s, 0.9 * s, t, false, 1);
      mask(g, x + 7 * s, by - 36 * s, 0.9 * s, t + 1, false, 0);
    }
  }
  if (flash) {
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(255,255,255,0.7)";
    g.fillRect(x - 30 * s, by - 60 * s, 60 * s, 62 * s);
  }
  g.restore();
}

/** gaiola de pautas onde a Clara dorme */
export function drawCage(g: G, x: number, y: number, t: number): void {
  const b = Math.round(Math.sin(t * 1.6) * 2);
  const top = y - 40 + b;
  g.fillStyle = "rgba(0,0,0,0.4)";
  g.beginPath();
  g.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = "lighter";
  const gr = g.createRadialGradient(x, top + 18, 0, x, top + 18, 22);
  gr.addColorStop(0, "rgba(140,200,255,0.35)");
  gr.addColorStop(1, "rgba(140,200,255,0)");
  g.fillStyle = gr;
  g.fillRect(x - 22, top - 4, 44, 44);
  g.globalCompositeOperation = "source-over";
  // Clara dormindo: cabelo escuro comprido, vestido branco
  R(g, "#2a1a24", x - 3, top + 10, 6, 6);
  R(g, "#f0c8a0", x - 2, top + 12, 4, 3);
  R(g, "#2a1a24", x - 3, top + 15, 1, 6);
  R(g, "#2a1a24", x + 2, top + 15, 1, 6);
  poly(g, "#e8f0ff", [
    [x - 2, top + 16],
    [x + 2, top + 16],
    [x + 5, top + 28],
    [x - 5, top + 28],
  ]);
  // grades: linhas de pauta douradas e barras
  g.fillStyle = "#e8c060";
  for (let i = 0; i < 5; i++) g.fillRect(x - 10, top + 6 + i * 6, 20, 1);
  for (let i = -2; i <= 2; i++) g.fillRect(x + i * 5, top + 4, 1, 28);
  g.fillRect(x - 11, top + 32, 22, 2);
  g.fillRect(x - 8, top + 2, 16, 2);
  g.fillRect(x - 1, top - 2, 2, 4);
  // clave de sol na frente
  g.fillStyle = "#fff0b0";
  g.font = "10px Georgia, serif";
  g.textAlign = "center";
  g.fillText("♪", x, top + 26);
}
