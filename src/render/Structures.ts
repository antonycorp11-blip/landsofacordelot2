import { hash2 } from "../core/rng";
import type { Building, Tree } from "../world/types";
import { rrect } from "./Machines";

const BRES = 10;
const TRES = 9;

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

  private treeSprite(kind: number, r: number, season: number): Sprite {
    const rb = Math.round(r * 2) / 2;
    const key = `${kind}|${rb}|${season}`;
    const hit = this.trees.get(key);
    if (hit) return hit;
    const S = rb * 2 + 1;
    const c = document.createElement("canvas");
    c.width = c.height = Math.ceil(S * TRES);
    const g = c.getContext("2d")!;
    g.setTransform(TRES, 0, 0, TRES, c.width / 2, c.height / 2);
    const palettes: Record<number, string[][]> = {
      0: [
        ["#355f28", "#4d7d33", "#6d9c45"],
        ["#2f5a24", "#467a2e", "#649540"],
        ["#8a5a24", "#c07a2a", "#e0a63c"],
        ["#5d5a40", "#77704c", "#8f8660"],
      ],
      1: [
        ["#1f4a30", "#2e6140", "#3f7a52"],
        ["#1d452c", "#2b5d3d", "#3a744d"],
        ["#20482f", "#2f5f3f", "#3e7650"],
        ["#294a39", "#365c48", "#456f58"],
      ],
      2: [
        ["#3f6a3a", "#5a8a4a", "#7ba862"],
        ["#3a6535", "#548343", "#73a05a"],
        ["#6c7a3a", "#8e9a4a", "#b2b862"],
        ["#596650", "#6f7d62", "#879576"],
      ],
    };
    const pal = palettes[kind][season];
    const seed = this.seed + kind * 101 + Math.round(rb * 10);
    if (kind === 1) {
      // conífera: camadas estreladas
      for (let layer = 0; layer < 3; layer++) {
        const rr = rb * (1 - layer * 0.28);
        g.fillStyle = pal[layer];
        g.beginPath();
        const n = 11;
        for (let k = 0; k <= n * 2; k++) {
          const a = (k / (n * 2)) * Math.PI * 2 + layer * 0.3;
          const rad = k % 2 ? rr * 0.62 : rr;
          const x = Math.cos(a) * rad;
          const y = Math.sin(a) * rad;
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
        g.fill();
      }
      g.fillStyle = pal[2];
      g.beginPath();
      g.arc(-rb * 0.1, -rb * 0.1, rb * 0.15, 0, Math.PI * 2);
      g.fill();
    } else {
      const blobs = kind === 0 ? 9 : 7;
      // base escura
      g.fillStyle = pal[0];
      g.beginPath();
      g.arc(0, 0, rb * 0.92, 0, Math.PI * 2);
      g.fill();
      for (let k = 0; k < blobs; k++) {
        const a = hash2(k, 1, seed) * Math.PI * 2;
        const d = hash2(k, 2, seed) * rb * 0.55;
        const rr = rb * (0.35 + hash2(k, 3, seed) * 0.22);
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        const grd = g.createRadialGradient(x - rr * 0.35, y - rr * 0.35, rr * 0.1, x, y, rr);
        grd.addColorStop(0, pal[2]);
        grd.addColorStop(0.7, pal[1]);
        grd.addColorStop(1, pal[0]);
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, y, rr, 0, Math.PI * 2);
        g.fill();
      }
      // folhas pontilhadas
      for (let k = 0; k < rb * 26; k++) {
        const a = hash2(k, 5, seed) * Math.PI * 2;
        const d = Math.sqrt(hash2(k, 6, seed)) * rb * 0.9;
        g.fillStyle = k % 2 ? "rgba(255,255,220,0.12)" : "rgba(0,20,0,0.15)";
        g.fillRect(Math.cos(a) * d, Math.sin(a) * d, 0.18, 0.18);
      }
    }
    const s = { c, w: S, h: S };
    this.trees.set(key, s);
    return s;
  }

  private treeShadow(): HTMLCanvasElement {
    if (this.shadowTree) return this.shadowTree;
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grd.addColorStop(0, "rgba(0,0,0,0.42)");
    grd.addColorStop(0.7, "rgba(0,0,0,0.3)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    this.shadowTree = c;
    return c;
  }

  drawTreeShadow(ctx: CanvasRenderingContext2D, t: Tree, sx: number, sy: number): void {
    const sh = this.treeShadow();
    const r = t.r * 1.1;
    ctx.drawImage(sh, t.x + sx * t.r * 1.4 - r, t.y + sy * t.r * 1.4 - r, r * 2, r * 2);
  }

  drawTree(ctx: CanvasRenderingContext2D, t: Tree, time: number, wind: number, season: number): void {
    const s = this.treeSprite(t.kind, t.r, season);
    const sway = Math.sin(time * 1.4 + t.phase) * 0.05 * wind;
    ctx.save();
    ctx.translate(t.x + sway * t.r * 0.6, t.y + sway * t.r * 0.3);
    ctx.rotate(sway + t.phase);
    ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
  }
}
