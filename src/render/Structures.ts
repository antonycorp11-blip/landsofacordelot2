import { hash2, valueNoise } from "../core/rng";
import type { Building, Tree } from "../world/types";
import { rrect } from "./Machines";

const BRES = 10;
const TRES = 14;

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * k)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * k)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * k)));
  return `rgb(${r},${g},${b})`;
}

interface Sprite {
  c: HTMLCanvasElement;
  w: number;
  h: number;
}

/** Construções e árvores desenhadas geometricamente, com variações por semente. */
export class StructureRenderer {
  private buildings = new Map<number, Sprite>();
  private trees = new Map<string, Sprite>();
  private shadowTree: HTMLCanvasElement | null = null;

  constructor(private seed: number) {}

  private building(b: Building): Sprite {
    const hit = this.buildings.get(b.id);
    if (hit) return hit;
    const m = 4;
    const W = b.def.w + m * 2;
    const H = b.def.h + m * 2;
    const c = document.createElement("canvas");
    c.width = Math.ceil(W * BRES);
    c.height = Math.ceil(H * BRES);
    const g = c.getContext("2d")!;
    g.setTransform(BRES, 0, 0, BRES, c.width / 2, c.height / 2);
    this.paint(g, b);
    const s = { c, w: W, h: H };
    this.buildings.set(b.id, s);
    return s;
  }

  private gable(g: CanvasRenderingContext2D, w: number, h: number, color: string, corrugated: boolean, ridgeAlongX = true): void {
    const hw = w / 2;
    const hh = h / 2;
    // beirais
    g.fillStyle = shade(color, 0.6);
    g.fillRect(-hw - 0.3, -hh - 0.3, w + 0.6, h + 0.6);
    if (ridgeAlongX) {
      g.fillStyle = shade(color, 1.12);
      g.fillRect(-hw, -hh, w, hh);
      g.fillStyle = shade(color, 0.82);
      g.fillRect(-hw, 0, w, hh);
    } else {
      g.fillStyle = shade(color, 1.1);
      g.fillRect(-hw, -hh, hw, h);
      g.fillStyle = shade(color, 0.84);
      g.fillRect(0, -hh, hw, h);
    }
    g.strokeStyle = "rgba(0,0,0,0.18)";
    g.lineWidth = 0.06;
    if (corrugated) {
      g.beginPath();
      if (ridgeAlongX) for (let x = -hw + 0.35; x < hw; x += 0.38) {
        g.moveTo(x, -hh);
        g.lineTo(x, hh);
      }
      else for (let y = -hh + 0.35; y < hh; y += 0.38) {
        g.moveTo(-hw, y);
        g.lineTo(hw, y);
      }
      g.stroke();
    } else {
      // telhas
      g.beginPath();
      if (ridgeAlongX) for (let y = -hh + 0.4; y < hh; y += 0.42) {
        g.moveTo(-hw, y);
        g.lineTo(hw, y);
      }
      g.stroke();
      g.strokeStyle = "rgba(0,0,0,0.1)";
      g.beginPath();
      for (let x = -hw + 0.3; x < hw; x += 0.3) {
        g.moveTo(x, -hh);
        g.lineTo(x, hh);
      }
      g.stroke();
    }
    g.strokeStyle = shade(color, 0.55);
    g.lineWidth = 0.18;
    g.beginPath();
    if (ridgeAlongX) {
      g.moveTo(-hw, 0);
      g.lineTo(hw, 0);
    } else {
      g.moveTo(0, -hh);
      g.lineTo(0, hh);
    }
    g.stroke();
  }

  private paint(g: CanvasRenderingContext2D, b: Building): void {
    const d = b.def;
    const w = d.w;
    const h = d.h;
    const hw = w / 2;
    const hh = h / 2;
    const v = b.variant;
    switch (d.kind) {
      case "farmhouse": {
        // jardim
        for (let k = 0; k < 26; k++) {
          const a = hash2(k, b.id, this.seed) * Math.PI * 2;
          const x = Math.cos(a) * (hw + 1.5);
          const y = Math.sin(a) * (hh + 1.5);
          g.fillStyle = k % 3 === 0 ? "#d9566b" : k % 3 === 1 ? "#f2d24b" : "#4f8a3a";
          g.beginPath();
          g.arc(x, y, 0.35, 0, Math.PI * 2);
          g.fill();
        }
        // varanda
        g.fillStyle = "#8a6a48";
        g.fillRect(-hw * 0.6, hh, w * 0.6, 1.8);
        g.fillStyle = shade(d.roof, 0.85);
        g.fillRect(-hw * 0.62, hh - 0.1, w * 0.64, 2.0);
        // telhado de quatro águas
        g.fillStyle = shade(d.roof, 0.55);
        g.fillRect(-hw - 0.4, -hh - 0.4, w + 0.8, h + 0.8);
        const r = Math.min(hw, hh);
        const faces: [number, number][][] = [
          [[-hw, -hh], [hw, -hh], [hw - r, 0], [-hw + r, 0]],
          [[hw, -hh], [hw, hh], [hw - r, 0]],
          [[hw, hh], [-hw, hh], [-hw + r, 0], [hw - r, 0]],
          [[-hw, hh], [-hw, -hh], [-hw + r, 0]],
        ];
        const k = [1.15, 0.9, 0.78, 1.02];
        faces.forEach((f, i) => {
          g.fillStyle = shade(d.roof, k[i]);
          g.beginPath();
          f.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.closePath();
          g.fill();
        });
        g.strokeStyle = "rgba(0,0,0,0.14)";
        g.lineWidth = 0.05;
        for (let y = -hh + 0.4; y < -0.2; y += 0.4) {
          const inset = ((y + hh) / hh) * r;
          g.beginPath();
          g.moveTo(-hw + inset, y);
          g.lineTo(hw - inset, y);
          g.stroke();
          g.beginPath();
          g.moveTo(-hw + inset, -y);
          g.lineTo(hw - inset, -y);
          g.stroke();
        }
        g.strokeStyle = shade(d.roof, 0.5);
        g.lineWidth = 0.15;
        g.beginPath();
        g.moveTo(-hw, -hh);
        g.lineTo(-hw + r, 0);
        g.lineTo(hw - r, 0);
        g.lineTo(hw, -hh);
        g.moveTo(-hw, hh);
        g.lineTo(-hw + r, 0);
        g.moveTo(hw - r, 0);
        g.lineTo(hw, hh);
        g.stroke();
        // chaminé
        g.fillStyle = "#7c6a5a";
        g.fillRect(hw * 0.35, -hh * 0.55, 0.9, 0.9);
        g.fillStyle = "#3a3330";
        g.fillRect(hw * 0.35 + 0.2, -hh * 0.55 + 0.2, 0.5, 0.5);
        break;
      }
      case "shed":
      case "warehouse": {
        this.gable(g, w, h, d.roof, true);
        // claraboias
        g.fillStyle = "rgba(220,235,240,0.55)";
        for (let x = -hw + 2; x < hw - 2; x += 4.5) {
          g.fillRect(x, -hh + 1, 1.4, hh - 1.6);
          g.fillRect(x + 2, 0.6, 1.4, hh - 1.6);
        }
        if (d.kind === "shed") {
          // portão e pátio frontal
          g.fillStyle = "#6c6c6c";
          g.fillRect(-hw * 0.55, hh + 0.3, w * 0.55, 0.4);
        }
        break;
      }
      case "barn": {
        this.gable(g, w, h, d.roof, true, false);
        g.strokeStyle = "#f2efe6";
        g.lineWidth = 0.25;
        g.strokeRect(-hw, -hh, w, h);
        g.fillStyle = "#e8e4da";
        g.fillRect(-0.9, -0.9, 1.8, 1.8);
        g.fillStyle = shade(d.roof, 0.7);
        g.beginPath();
        g.moveTo(-0.9, -0.9);
        g.lineTo(0.9, 0.9);
        g.moveTo(0.9, -0.9);
        g.lineTo(-0.9, 0.9);
        g.strokeStyle = shade(d.roof, 0.6);
        g.lineWidth = 0.1;
        g.stroke();
        break;
      }
      case "silo": {
        const r = w / 2;
        const grd = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
        grd.addColorStop(0, "#eef1f3");
        grd.addColorStop(0.6, "#b9c0c6");
        grd.addColorStop(1, "#7f878e");
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, 0, r, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "rgba(60,70,80,0.35)";
        g.lineWidth = 0.05;
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          g.beginPath();
          g.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18);
          g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          g.stroke();
        }
        for (const rr of [0.45, 0.75]) {
          g.beginPath();
          g.arc(0, 0, r * rr, 0, Math.PI * 2);
          g.stroke();
        }
        g.fillStyle = "#6d757c";
        g.beginPath();
        g.arc(0, 0, r * 0.16, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#555";
        g.lineWidth = 0.08;
        g.beginPath();
        g.moveTo(0, r * 0.16);
        g.lineTo(0, r);
        g.stroke();
        break;
      }
      case "fuelTank": {
        g.fillStyle = "#555";
        g.fillRect(-hw + 0.4, -hh - 0.2, 0.3, h + 0.4);
        g.fillRect(hw - 0.7, -hh - 0.2, 0.3, h + 0.4);
        const tg = g.createLinearGradient(0, -hh, 0, hh);
        tg.addColorStop(0, "#9b9686");
        tg.addColorStop(0.4, "#f1ecd9");
        tg.addColorStop(1, "#8f8a78");
        g.fillStyle = tg;
        rrect(g, -hw, -hh, w, h, hh);
        g.fill();
        g.fillStyle = "#c23b2a";
        g.fillRect(-hw + 1.2, -0.25, w - 2.4, 0.5);
        g.fillStyle = "#3a3a3a";
        g.fillRect(-0.5, hh + 0.4, 1.0, 0.8);
        g.fillStyle = "#e8c53a";
        g.fillRect(-0.3, hh + 0.55, 0.6, 0.25);
        break;
      }
      case "seedPallets": {
        g.fillStyle = "#b9b4a6";
        g.fillRect(-hw, -hh, w, h);
        const cols = ["#e8e2cf", "#e4c35c", "#7aa54a", "#d9d2bd"];
        for (let k = 0; k < 6; k++) {
          const x = -hw + 0.5 + (k % 3) * 2.5;
          const y = -hh + 0.4 + Math.floor(k / 3) * 2.2;
          g.fillStyle = "#8a6a44";
          g.fillRect(x, y, 2.1, 1.9);
          g.fillStyle = cols[(k + v) % cols.length];
          for (let a = 0; a < 2; a++)
            for (let bb = 0; bb < 2; bb++) {
              rrect(g, x + 0.1 + a * 1.0, y + 0.1 + bb * 0.88, 0.9, 0.78, 0.2);
              g.fill();
            }
        }
        break;
      }
      case "grainPit": {
        g.fillStyle = "#e3c23a";
        g.fillRect(-hw - 0.4, -hh - 0.4, w + 0.8, h + 0.8);
        g.fillStyle = "#222";
        for (let x = -hw - 0.4; x < hw + 0.4; x += 0.8) {
          g.beginPath();
          g.moveTo(x, -hh - 0.4);
          g.lineTo(x + 0.4, -hh - 0.4);
          g.lineTo(x, -hh);
          g.closePath();
          g.fill();
        }
        g.fillStyle = "#2c2c2c";
        g.fillRect(-hw, -hh, w, h);
        g.strokeStyle = "#5a5a5a";
        g.lineWidth = 0.08;
        g.beginPath();
        for (let x = -hw + 0.3; x < hw; x += 0.3) {
          g.moveTo(x, -hh);
          g.lineTo(x, hh);
        }
        g.stroke();
        break;
      }
      case "showroom":
      case "office": {
        g.fillStyle = shade(d.roof, 0.7);
        g.fillRect(-hw - 0.2, -hh - 0.2, w + 0.4, h + 0.4);
        g.fillStyle = d.roof;
        g.fillRect(-hw, -hh, w, h);
        g.strokeStyle = "rgba(0,0,0,0.12)";
        g.lineWidth = 0.05;
        for (let x = -hw + 1; x < hw; x += 1.5) {
          g.beginPath();
          g.moveTo(x, -hh);
          g.lineTo(x, hh);
          g.stroke();
        }
        g.fillStyle = "#8c9399";
        for (let k = 0; k < 3; k++) g.fillRect(-hw + 2 + k * 3.5, -hh + 1.5, 1.6, 1.2);
        if (d.kind === "showroom") {
          g.fillStyle = "#5d8fb3";
          g.fillRect(-hw, hh - 1.2, w, 1.2);
          g.fillStyle = "#c33b2c";
          g.fillRect(-hw + 2, -1.2, w - 4, 2.4);
          g.save();
          g.scale(0.1, 0.1);
          g.fillStyle = "#fff";
          g.font = "bold 16px sans-serif";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.rotate(Math.PI);
          g.fillText("CAMPO FORTE", 0, 0);
          g.restore();
        }
        break;
      }
      case "gasStation": {
        g.fillStyle = "#e2ded4";
        g.fillRect(-hw + 1, -hh - 4, 8, 3.6);
        g.fillStyle = "rgba(0,0,0,0.2)";
        g.fillRect(-hw, -hh, w, h);
        g.fillStyle = "#f4f1e8";
        g.fillRect(-hw, -hh, w, h);
        g.fillStyle = d.wall;
        g.fillRect(-hw, -hh, w, 0.6);
        g.fillRect(-hw, hh - 0.6, w, 0.6);
        g.fillStyle = "#cfcac0";
        for (let k = 0; k < 3; k++) g.fillRect(-hw + 3 + k * 6, -0.4, 2.5, 0.8);
        g.save();
        g.scale(0.1, 0.1);
        g.fillStyle = d.wall;
        g.font = "bold 22px sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("POSTO", 0, -30);
        g.restore();
        break;
      }
      case "mill": {
        this.gable(g, w * 0.6, h, d.roof, true, false);
        g.save();
        g.translate(w * 0.32, 0);
        for (let k = 0; k < 3; k++) {
          const y = -hh + 3.5 + k * 7.5;
          const grd = g.createRadialGradient(-1, y - 1, 0.5, 0, y, 3.3);
          grd.addColorStop(0, "#f2f0ea");
          grd.addColorStop(1, "#8d8a82");
          g.fillStyle = grd;
          g.beginPath();
          g.arc(0, y, 3.3, 0, Math.PI * 2);
          g.fill();
        }
        g.restore();
        g.strokeStyle = "#555";
        g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(w * 0.32, -hh + 3.5);
        g.lineTo(0, -hh + 2);
        g.stroke();
        break;
      }
    }
  }

  drawBuildingShadow(ctx: CanvasRenderingContext2D, b: Building, sx: number, sy: number): void {
    const d = b.def;
    if (d.kind === "grainPit") return;
    const hgt = d.kind === "silo" ? 3.2 : d.kind === "seedPallets" || d.kind === "fuelTank" ? 0.5 : d.kind === "gasStation" ? 1 : 1.6;
    ctx.save();
    ctx.translate(b.x + sx * hgt, b.y + sy * hgt);
    ctx.rotate(b.rot);
    if (d.kind === "silo") {
      ctx.beginPath();
      ctx.arc(0, 0, d.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
    ctx.restore();
  }

  drawBuilding(ctx: CanvasRenderingContext2D, b: Building): void {
    const s = this.building(b);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
  }

  /** Orçamento de geração de copas por frame (evita travadas). */
  treeBudget = 4;
  private treeShadows = new Map<string, HTMLCanvasElement>();

  /**
   * Copa gerada por pixel: um campo de altura formado por cachos de folhas,
   * iluminado por um sol fixo a noroeste (normal pelo gradiente), com oclusão
   * nos vãos, pontilhado de folhas e borda irregular.
   */
  private treeSprite(kind: number, r: number, season: number, variant: number): Sprite | null {
    const rb = Math.round(r * 2) / 2;
    const key = `${kind}|${rb}|${season}|${variant}`;
    const hit = this.trees.get(key);
    if (hit) return hit;
    if (this.treeBudget <= 0) return null;
    this.treeBudget--;
    const S = rb * 2 + 1;
    const N = Math.ceil(S * TRES);
    const c = document.createElement("canvas");
    c.width = c.height = N;
    const g = c.getContext("2d")!;
    const img = g.createImageData(N, N);
    const d = img.data;
    const seed = this.seed + kind * 101 + Math.round(rb * 10) * 7 + variant * 1009;
    // paletas [escuro, médio, claro] por estação
    const PAL: Record<number, number[][][]> = {
      0: [
        [[34, 62, 26], [72, 112, 44], [148, 180, 82]],
        [[28, 56, 22], [62, 102, 38], [132, 168, 72]],
        [[90, 52, 20], [176, 104, 34], [236, 182, 80]],
        [[70, 66, 46], [110, 102, 72], [160, 150, 112]],
      ],
      1: [
        [[16, 40, 28], [38, 78, 52], [96, 138, 98]],
        [[14, 38, 26], [34, 72, 48], [88, 130, 90]],
        [[18, 42, 30], [40, 78, 54], [96, 134, 98]],
        [[30, 52, 42], [52, 80, 66], [104, 132, 114]],
      ],
      2: [
        [[44, 66, 40], [92, 120, 70], [170, 190, 120]],
        [[40, 62, 36], [84, 114, 62], [160, 182, 110]],
        [[86, 90, 40], [146, 146, 64], [214, 204, 112]],
        [[70, 76, 62], [112, 120, 98], [164, 170, 146]],
      ],
    };
    const pal = PAL[kind][season];
    // tom individual
    const tint = 0.9 + hash2(variant, kind, seed) * 0.2;
    const H = new Float32Array(N * N);
    const half = N / 2;
    const toM = 1 / TRES;
    if (kind === 1) {
      // pinheiro: galhos irregulares saindo do topo, cada um com tufos de agulhas
      const nb = 14 + Math.floor(hash2(1, 2, seed) * 8);
      const br: [number, number, number][] = [];
      for (let k = 0; k < nb; k++) br.push([(k / nb) * Math.PI * 2 + (hash2(k, 5, seed) - 0.5) * 0.5, rb * (0.7 + hash2(k, 6, seed) * 0.3), 0.16 + hash2(k, 7, seed) * 0.1]);
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const px = (x - half + 0.5) * toM;
          const py = (y - half + 0.5) * toM;
          const dd = Math.hypot(px, py);
          if (dd > rb) continue;
          const a = Math.atan2(py, px);
          let h = 0;
          for (const [ba, blen, bw] of br) {
            const da = Math.abs(Math.atan2(Math.sin(a - ba), Math.cos(a - ba)));
            const lat = da * Math.max(0.3, dd);
            const wdt = bw * rb * (0.35 + 0.65 * (1 - dd / blen));
            if (dd > blen || lat > wdt) continue;
            const v = (1 - lat / wdt) * 0.45 + (1 - dd / blen) * 0.75;
            if (v > h) h = v;
          }
          // miolo denso perto do tronco
          const core = Math.max(0, 1 - dd / (rb * 0.42));
          h = Math.max(h, core * 0.95);
          if (h <= 0) continue;
          h += (valueNoise(px * 9, py * 9, seed + 3) - 0.5) * 0.18 + (hash2(x, y, seed + 4) - 0.5) * 0.06;
          H[y * N + x] = Math.max(0, h);
        }
    } else {
      const n = kind === 0 ? 18 + Math.floor(hash2(3, 4, seed) * 8) : 12 + Math.floor(hash2(3, 4, seed) * 6);
      const bumps: [number, number, number, number][] = [];
      for (let k = 0; k < n; k++) {
        const a = hash2(k, 1, seed) * Math.PI * 2;
        const dist = Math.sqrt(hash2(k, 2, seed)) * rb * (kind === 0 ? 0.62 : 0.68);
        const br = rb * (kind === 0 ? 0.28 + hash2(k, 3, seed) * 0.2 : 0.2 + hash2(k, 3, seed) * 0.17);
        const top = 0.55 + (1 - dist / rb) * 0.45 + hash2(k, 4, seed) * 0.15;
        bumps.push([Math.cos(a) * dist, Math.sin(a) * dist, br, top]);
      }
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const px = (x - half + 0.5) * toM;
          const py = (y - half + 0.5) * toM;
          let h = 0;
          for (const [bx, by, br, top] of bumps) {
            const q = ((px - bx) ** 2 + (py - by) ** 2) / (br * br);
            if (q < 1) {
              const v = Math.sqrt(1 - q) * top;
              if (v > h) h = v;
            }
          }
          if (h <= 0) continue;
          // tufos de folhas (textura fina) e falhas na borda
          const leaf = valueNoise(px * 5.5, py * 5.5, seed + 7) - 0.5;
          const fine = valueNoise(px * 12, py * 12, seed + 8) - 0.5;
          h += leaf * 0.16 + fine * 0.08;
          if (kind === 2 && h < 0.22 && valueNoise(px * 3, py * 3, seed + 9) < 0.45) h = 0;
          H[y * N + x] = Math.max(0, h);
        }
    }
    // iluminação
    const L = [-0.55, -0.62, 0.56];
    const ll = Math.hypot(L[0], L[1], L[2]);
    for (let y = 1; y < N - 1; y++)
      for (let x = 1; x < N - 1; x++) {
        const i = y * N + x;
        const h = H[i];
        if (h <= 0) continue;
        const gx = (H[i + 1] - H[i - 1]) * TRES * 0.18;
        const gy = (H[i + N] - H[i - N]) * TRES * 0.18;
        const nl = Math.hypot(gx, gy, 1);
        let lam = (-gx * L[0] - gy * L[1] + L[2]) / (nl * ll);
        lam = Math.max(0, Math.min(1, lam));
        const ao = 0.5 + 0.5 * Math.min(1, h * 1.3);
        const k = Math.min(1, lam * 1.15) * ao;
        const spk = (hash2(x, y, seed + 11) - 0.5) * 0.18;
        const mixc = (a: number, b: number, t: number) => a + (b - a) * t;
        let rr: number, gg: number, bb: number;
        if (k < 0.5) {
          const t = k / 0.5;
          rr = mixc(pal[0][0], pal[1][0], t);
          gg = mixc(pal[0][1], pal[1][1], t);
          bb = mixc(pal[0][2], pal[1][2], t);
        } else {
          const t = (k - 0.5) / 0.5;
          rr = mixc(pal[1][0], pal[2][0], t);
          gg = mixc(pal[1][1], pal[2][1], t);
          bb = mixc(pal[1][2], pal[2][2], t);
        }
        const f = (1 + spk) * tint;
        const o = i * 4;
        d[o] = rr * f;
        d[o + 1] = gg * f;
        d[o + 2] = bb * f;
        d[o + 3] = Math.min(255, h * 1400);
      }
    g.putImageData(img, 0, 0);
    if (kind === 2) {
      // galhos aparecendo nas falhas da copa
      g.globalCompositeOperation = "destination-over";
      g.strokeStyle = "rgba(92,70,48,0.9)";
      g.lineCap = "round";
      for (let k = 0; k < 5; k++) {
        const a = hash2(k, 21, seed) * Math.PI * 2;
        g.lineWidth = TRES * 0.16;
        g.beginPath();
        g.moveTo(half, half);
        g.lineTo(half + Math.cos(a) * rb * 0.8 * TRES, half + Math.sin(a) * rb * 0.8 * TRES);
        g.stroke();
      }
      g.globalCompositeOperation = "source-over";
    }
    // sombra suave a partir da silhueta
    const sc = document.createElement("canvas");
    const SN = Math.max(8, Math.round(N / 4));
    sc.width = sc.height = SN;
    const sg = sc.getContext("2d")!;
    sg.drawImage(c, 0, 0, SN, SN);
    sg.globalCompositeOperation = "source-in";
    sg.fillStyle = "#000";
    sg.fillRect(0, 0, SN, SN);
    this.treeShadows.set(key, sc);
    const sp = { c, w: S, h: S };
    this.trees.set(key, sp);
    return sp;
  }

  private variantOf(t: Tree): number {
    return Math.floor(((t.phase / (Math.PI * 2)) * 997) % 3);
  }

  drawTreeShadow(ctx: CanvasRenderingContext2D, t: Tree, sx: number, sy: number, season = 0): void {
    const rb = Math.round(t.r * 2) / 2;
    const sh = this.treeShadows.get(`${t.kind}|${rb}|${season}|${this.variantOf(t)}`);
    const S = rb * 2 + 1;
    const ox = t.x + sx * t.r * 1.3;
    const oy = t.y + sy * t.r * 1.3;
    if (sh) {
      ctx.drawImage(sh, ox - S / 2, oy - S / 2, S, S);
      return;
    }
    if (!this.shadowTree) {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const g = c.getContext("2d")!;
      const grd = g.createRadialGradient(16, 16, 2, 16, 16, 16);
      grd.addColorStop(0, "rgba(0,0,0,1)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 32, 32);
      this.shadowTree = c;
    }
    ctx.drawImage(this.shadowTree, ox - t.r, oy - t.r, t.r * 2, t.r * 2);
  }

  drawTree(ctx: CanvasRenderingContext2D, t: Tree, time: number, wind: number, season: number): void {
    const s = this.treeSprite(t.kind, t.r, season, this.variantOf(t));
    // balanço: deslocamento e leve escala, sem girar (a luz fica coerente)
    const sway = Math.sin(time * 1.3 + t.phase) * wind;
    const sway2 = Math.sin(time * 2.1 + t.phase * 1.7) * wind * 0.5;
    const dx = sway * 0.14 * (t.r / 4);
    const dy = sway2 * 0.1 * (t.r / 4);
    if (!s) {
      ctx.fillStyle = t.kind === 1 ? "#2c5a3a" : "#4a7a34";
      ctx.beginPath();
      ctx.arc(t.x + dx, t.y + dy, t.r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const k = 1 + sway2 * 0.012;
    ctx.drawImage(s.c, t.x + dx - (s.w * k) / 2, t.y + dy - (s.h * k) / 2, s.w * k, s.h * k);
  }
}
