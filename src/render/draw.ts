import { TAU, clamp } from "../core/math";
import type { TowerKind } from "../data/content";
import type { Enemy } from "../game/state";

/** Farol visto de cima: base listrada, galeria com gradil, sala da lâmpada e cúpula. */
export function drawLighthouse(g: CanvasRenderingContext2D, t: number, beamAngle: number, color: [number, number, number]): void {
  // sombra
  g.fillStyle = "rgba(0,0,0,0.45)";
  g.beginPath();
  g.ellipse(6, 8, 30, 27, 0.4, 0, TAU);
  g.fill();
  // anéis listrados vermelho/branco da torre
  const rings = [30, 26, 22];
  rings.forEach((r, i) => {
    const gr = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.2, 0, 0, r);
    const base = i % 2 ? [196, 52, 42] : [236, 232, 222];
    gr.addColorStop(0, `rgb(${base[0] + 15},${base[1] + 15},${base[2] + 15})`);
    gr.addColorStop(1, `rgb(${base[0] * 0.55},${base[1] * 0.55},${base[2] * 0.55})`);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fill();
  });
  // galeria
  g.fillStyle = "#2a2a30";
  g.beginPath();
  g.arc(0, 0, 18, 0, TAU);
  g.fill();
  g.strokeStyle = "#8b8b94";
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, 0, 17.5, 0, TAU);
  g.stroke();
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU;
    g.beginPath();
    g.moveTo(Math.cos(a) * 15, Math.sin(a) * 15);
    g.lineTo(Math.cos(a) * 17.5, Math.sin(a) * 17.5);
    g.stroke();
  }
  // vidro da lanterna com o brilho da lâmpada
  const [r, gg, b] = color;
  const pulse = 0.85 + Math.sin(t * 3) * 0.08;
  const glass = g.createRadialGradient(0, 0, 1, 0, 0, 14);
  glass.addColorStop(0, `rgba(255,255,240,${pulse})`);
  glass.addColorStop(0.5, `rgba(${r},${gg},${b},0.9)`);
  glass.addColorStop(1, "rgba(40,60,70,0.9)");
  g.fillStyle = glass;
  g.beginPath();
  g.arc(0, 0, 13.5, 0, TAU);
  g.fill();
  // lente de Fresnel girando
  g.save();
  g.rotate(beamAngle);
  g.fillStyle = "rgba(255,255,255,0.75)";
  g.beginPath();
  g.moveTo(3, -4);
  g.lineTo(13, -7);
  g.lineTo(13, 7);
  g.lineTo(3, 4);
  g.closePath();
  g.fill();
  g.restore();
  // cúpula
  const dome = g.createRadialGradient(-3, -3, 0.5, 0, 0, 8);
  dome.addColorStop(0, "#c25a46");
  dome.addColorStop(1, "#4a1712");
  g.fillStyle = dome;
  g.beginPath();
  g.arc(0, 0, 7.5, 0, TAU);
  g.fill();
  g.fillStyle = "#e4dccb";
  g.beginPath();
  g.arc(0, 0, 1.6, 0, TAU);
  g.fill();
}

function eyes(g: CanvasRenderingContext2D, ox: number, sep: number, size: number, color: string): void {
  g.fillStyle = color;
  g.beginPath();
  g.arc(ox, -sep, size, 0, TAU);
  g.arc(ox, sep, size, 0, TAU);
  g.fill();
}

/** Corpo do inimigo em coordenadas locais (x aponta para o farol). */
export function drawEnemy(g: CanvasRenderingContext2D, e: Enemy, t: number): void {
  const heading = Math.atan2(-e.y, -e.x);
  g.save();
  g.translate(e.x, e.y);
  g.rotate(heading);
  g.scale(1.45, 1.45);
  const lit = e.glow;
  const flash = e.hitFlash > 0 ? 0.5 : 0;
  const k = 0.35 + lit * 0.65 + flash;
  const col = (r: number, gg: number, b: number, a = 1) => `rgba(${clamp(r * k, 0, 255)},${clamp(gg * k, 0, 255)},${clamp(b * k, 0, 255)},${a})`;
  switch (e.kind) {
    case "eel": {
      const n = 12;
      for (let i = n - 1; i >= 0; i--) {
        const s = i * 2.2;
        const w = Math.sin(e.wob * 2 - i * 0.6) * (1 + i * 0.35);
        const rr = 4.2 * (1 - i / (n + 2));
        g.fillStyle = i % 3 === 0 ? col(40, 96, 92) : col(30, 70, 72);
        g.beginPath();
        g.arc(-s, w, rr, 0, TAU);
        g.fill();
      }
      g.fillStyle = col(70, 150, 140, 0.7);
      g.beginPath();
      g.moveTo(-6, 0);
      g.lineTo(-14, 4.5);
      g.lineTo(-10, 0);
      g.lineTo(-14, -4.5);
      g.closePath();
      g.fill();
      break;
    }
    case "crab": {
      const step = Math.sin(t * 10 + e.wob) * 0.35;
      g.strokeStyle = col(120, 50, 36);
      g.lineWidth = 1.6;
      g.lineCap = "round";
      for (const s of [-1, 1])
        for (let l = 0; l < 4; l++) {
          const a = s * (0.8 + l * 0.42) + (l % 2 ? step : -step) * s;
          g.beginPath();
          g.moveTo(-2 + l * 1.5, s * 5);
          const kx = Math.cos(a) * 10;
          const ky = Math.sin(a) * 10;
          g.lineTo(kx * 0.6 - 2, ky * 0.6 + s * 3);
          g.lineTo(kx - 3, ky + s * 2);
          g.stroke();
        }
      // garras
      for (const s of [-1, 1]) {
        g.fillStyle = col(170, 64, 40);
        g.beginPath();
        g.ellipse(9, s * 7, 5, 3.2, s * 0.5, 0, TAU);
        g.fill();
        g.strokeStyle = col(70, 20, 14);
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(12, s * 7);
        g.lineTo(15, s * (6 + Math.sin(t * 6) * 1.5));
        g.stroke();
      }
      const cg = g.createRadialGradient(-2, -3, 1, 0, 0, 10);
      cg.addColorStop(0, col(210, 90, 60));
      cg.addColorStop(1, col(90, 30, 22));
      g.fillStyle = cg;
      g.beginPath();
      g.ellipse(0, 0, 9, 10.5, 0, 0, TAU);
      g.fill();
      g.fillStyle = col(60, 20, 14);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        g.beginPath();
        g.arc(Math.cos(a) * 5, Math.sin(a) * 6, 1, 0, TAU);
        g.fill();
      }
      break;
    }
    case "jelly": {
      const pulse = 1 + Math.sin(e.wob * 3) * 0.12;
      g.strokeStyle = `rgba(220,150,255,${0.35 + lit * 0.3})`;
      g.lineWidth = 0.9;
      for (let i = 0; i < 7; i++) {
        const y0 = -6 + i * 2;
        g.beginPath();
        g.moveTo(-2, y0);
        for (let s = 1; s <= 6; s++) g.lineTo(-2 - s * 3, y0 + Math.sin(e.wob * 2 + s + i) * 2);
        g.stroke();
      }
      const jg = g.createRadialGradient(1, -1, 0.5, 0, 0, 10 * pulse);
      jg.addColorStop(0, "rgba(255,230,255,0.9)");
      jg.addColorStop(0.5, `rgba(200,120,240,${0.55 + lit * 0.3})`);
      jg.addColorStop(1, "rgba(120,60,200,0.15)");
      g.fillStyle = jg;
      g.beginPath();
      g.arc(0, 0, 10 * pulse, 0, TAU);
      g.fill();
      g.strokeStyle = "rgba(255,220,255,0.5)";
      g.beginPath();
      g.arc(0, 0, 6 * pulse, 0, TAU);
      g.stroke();
      break;
    }
    case "siren": {
      // cauda
      g.fillStyle = col(50, 110, 120);
      g.beginPath();
      g.moveTo(-2, -4);
      g.quadraticCurveTo(-14, Math.sin(e.wob * 2) * 4, -20, Math.sin(e.wob * 2) * 6);
      g.lineTo(-22, Math.sin(e.wob * 2) * 6 + 5);
      g.quadraticCurveTo(-12, 4, -2, 4);
      g.closePath();
      g.fill();
      // cabelos
      g.strokeStyle = col(200, 210, 230, 0.85);
      g.lineWidth = 1.1;
      for (let i = -3; i <= 3; i++) {
        g.beginPath();
        g.moveTo(4, i);
        g.quadraticCurveTo(-4, i * 2.5 + Math.sin(e.wob * 2 + i) * 2, -10, i * 3 + Math.sin(e.wob * 2.5 + i) * 3);
        g.stroke();
      }
      g.fillStyle = col(220, 214, 200);
      g.beginPath();
      g.ellipse(0, 0, 5, 6, 0, 0, TAU);
      g.fill();
      g.beginPath();
      g.arc(5, 0, 3.4, 0, TAU);
      g.fill();
      break;
    }
    case "kraken": {
      // tentáculo enrolando
      const n = 22;
      for (let i = n - 1; i >= 0; i--) {
        const s = i / n;
        const curl = Math.sin(t * 1.4 + e.wob + s * 3) * 10 * s;
        const x = -s * 70;
        const y = curl + Math.sin(s * 6 + t) * 4 * s;
        const r = 14 * (1 - s * 0.75);
        const kg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
        kg.addColorStop(0, col(150, 70, 110));
        kg.addColorStop(1, col(60, 20, 50));
        g.fillStyle = kg;
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.fill();
        if (i % 2 === 0 && i < n - 3) {
          g.fillStyle = col(230, 170, 190, 0.8);
          g.beginPath();
          g.arc(x, y + r * 0.45, r * 0.22, 0, TAU);
          g.fill();
        }
      }
      // ondas de água em volta
      g.strokeStyle = "rgba(180,220,230,0.25)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(0, 0, 20 + Math.sin(t * 3) * 3, 0, TAU);
      g.stroke();
      break;
    }
  }
  g.restore();
}

/** Olhos brilhantes: desenhados por cima da escuridão. */
export function drawEyes(g: CanvasRenderingContext2D, e: Enemy): void {
  const heading = Math.atan2(-e.y, -e.x);
  g.save();
  g.translate(e.x, e.y);
  g.rotate(heading);
  g.scale(1.45, 1.45);
  const glow = e.kind === "jelly" ? "rgba(255,200,255,0.9)" : e.kind === "siren" ? "rgba(255,230,120,0.95)" : e.kind === "kraken" ? "rgba(255,90,60,0.95)" : "rgba(140,255,230,0.95)";
  const ox = e.kind === "eel" ? 1.5 : e.kind === "crab" ? 6 : e.kind === "siren" ? 7 : e.kind === "kraken" ? 6 : 3;
  const sep = e.kind === "crab" ? 3 : e.kind === "kraken" ? 5 : 1.8;
  const size = e.kind === "kraken" ? 2.6 : 1.2;
  if (e.kind !== "jelly") {
    g.globalAlpha = 0.35;
    eyes(g, ox, sep, size * 2.4, glow);
    g.globalAlpha = 1;
    eyes(g, ox, sep, size, glow);
  }
  g.restore();
  // barra de vida
  if (e.hp < e.maxHp) {
    const w = e.boss ? 46 : 16;
    const y = e.y - e.def.radius - (e.boss ? 18 : 7);
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.fillRect(e.x - w / 2, y, w, e.boss ? 4 : 2.2);
    g.fillStyle = e.burnT > 0 ? "#ffa43a" : e.boss ? "#e2487a" : "#9fe8c8";
    g.fillRect(e.x - w / 2, y, w * clamp(e.hp / e.maxHp, 0, 1), e.boss ? 4 : 2.2);
  }
}

/** Torres sobre as plataformas de pedra. `aim` = direção do último disparo. */
export function drawTower(g: CanvasRenderingContext2D, kind: TowerKind, level: number, x: number, y: number, aim: number, t: number, lit: boolean, ring: number): void {
  g.save();
  g.translate(x, y);
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  g.arc(2, 2.5, 9, 0, TAU);
  g.fill();
  switch (kind) {
    case "lantern": {
      g.fillStyle = "#3a3026";
      g.fillRect(-5, -5, 10, 10);
      const flick = 0.85 + Math.sin(t * 13 + x) * 0.08 + Math.sin(t * 7.3 + y) * 0.06;
      const lg = g.createRadialGradient(0, 0, 0.5, 0, 0, 6);
      lg.addColorStop(0, `rgba(255,240,190,${flick})`);
      lg.addColorStop(1, "rgba(230,140,40,0.85)");
      g.fillStyle = lg;
      g.fillRect(-3.8, -3.8, 7.6, 7.6);
      g.strokeStyle = "#1e1a14";
      g.lineWidth = 0.8;
      g.strokeRect(-3.8, -3.8, 7.6, 7.6);
      g.beginPath();
      g.moveTo(-3.8, 0);
      g.lineTo(3.8, 0);
      g.moveTo(0, -3.8);
      g.lineTo(0, 3.8);
      g.stroke();
      break;
    }
    case "harpoon": {
      g.rotate(aim);
      g.fillStyle = "#5b4630";
      g.beginPath();
      g.arc(0, 0, 6, 0, TAU);
      g.fill();
      g.strokeStyle = "#8a6a44";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-6, 0);
      g.lineTo(11, 0);
      g.stroke();
      g.strokeStyle = "#c8c0b0";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(2, -9);
      g.quadraticCurveTo(-2, 0, 2, 9);
      g.stroke();
      g.fillStyle = "#d8d4cc";
      g.beginPath();
      g.moveTo(14, 0);
      g.lineTo(10, -2);
      g.lineTo(10, 2);
      g.closePath();
      g.fill();
      break;
    }
    case "net": {
      g.rotate(aim);
      g.fillStyle = "#4e3e2c";
      g.fillRect(-6, -6, 12, 12);
      g.strokeStyle = "#7a6040";
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(-3, 0);
      g.lineTo(9, 0);
      g.stroke();
      g.strokeStyle = "#cdbf9a";
      g.lineWidth = 0.6;
      g.beginPath();
      g.arc(10, 0, 3.4, 0, TAU);
      g.moveTo(7, -2);
      g.lineTo(13, 2);
      g.moveTo(7, 2);
      g.lineTo(13, -2);
      g.stroke();
      break;
    }
    case "bell": {
      const swing = Math.sin(t * 14) * ring * 0.4;
      g.strokeStyle = "#4b3a28";
      g.lineWidth = 2.5;
      g.strokeRect(-8, -8, 16, 16);
      g.rotate(swing);
      const bg = g.createRadialGradient(-2, -2, 0.5, 0, 0, 7);
      bg.addColorStop(0, "#f2d98a");
      bg.addColorStop(1, "#8a6420");
      g.fillStyle = bg;
      g.beginPath();
      g.arc(0, 0, 6.5, 0, TAU);
      g.fill();
      g.fillStyle = "#3a2a14";
      g.beginPath();
      g.arc(0, 0, 1.6, 0, TAU);
      g.fill();
      break;
    }
  }
  g.restore();
  // nível e realce de "energizada pela luz"
  if (lit) {
    g.strokeStyle = "rgba(255,240,180,0.7)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(x, y, 12.5 + Math.sin(t * 6) * 0.8, 0, TAU);
    g.stroke();
  }
  if (level > 0) {
    g.fillStyle = "rgba(10,12,16,0.8)";
    g.beginPath();
    g.arc(x + 9, y - 9, 5, 0, TAU);
    g.fill();
    g.fillStyle = "#ffd646";
    g.font = "700 6px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(level), x + 9, y - 8.6);
  }
}
