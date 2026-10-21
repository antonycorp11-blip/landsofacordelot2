import { CROPS } from "../data/crops";
import type { ImplementDef, VehicleDef } from "../data/machines";
import { pipeLocalAngle } from "../systems/geometry";
import type { Implement, Vehicle } from "../world/entities";
import type { Cargo } from "../world/types";

const RES = 28;

export function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * k)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * k)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * k)));
  return `rgb(${r},${g},${b})`;
}

/** Gradiente transversal que dá volume (centro claro, bordas escuras). */
function bodyGrad(ctx: CanvasRenderingContext2D, color: string, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, shade(color, 0.72));
  g.addColorStop(0.28, shade(color, 1.08));
  g.addColorStop(0.5, shade(color, 1.18));
  g.addColorStop(0.75, shade(color, 0.98));
  g.addColorStop(1, shade(color, 0.66));
  return g;
}

/** Pneu visto de cima com garras que deslizam conforme a rotação. */
export function tire(ctx: CanvasRenderingContext2D, cx: number, cy: number, len: number, wid: number, dist: number, rimColor?: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  rrect(ctx, -len / 2, -wid / 2, len, wid, Math.min(wid * 0.35, 0.18));
  ctx.fillStyle = "#1c1c1c";
  ctx.fill();
  ctx.save();
  ctx.clip();
  const sp = Math.max(0.14, len / 9);
  const off = ((dist % sp) + sp) % sp;
  ctx.strokeStyle = "#3b3b3b";
  ctx.lineWidth = sp * 0.42;
  ctx.beginPath();
  for (let x = -len / 2 - sp + off; x < len / 2 + sp; x += sp) {
    ctx.moveTo(x, -wid / 2);
    ctx.lineTo(x + sp * 0.5, 0);
    ctx.lineTo(x, wid / 2);
  }
  ctx.stroke();
  // sombreado cilíndrico
  const g = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.5, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(-len / 2, -wid / 2, len, wid);
  ctx.restore();
  if (rimColor) {
    ctx.fillStyle = rimColor;
    ctx.fillRect(-len * 0.18, -wid * 0.12, len * 0.36, wid * 0.24);
  }
  ctx.restore();
}

function canvas(wm: number, hm: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement("canvas");
  c.width = Math.ceil(wm * RES);
  c.height = Math.ceil(hm * RES);
  const g = c.getContext("2d")!;
  g.setTransform(RES, 0, 0, RES, c.width / 2, c.height / 2);
  return { c, g };
}

interface Sprite {
  c: HTMLCanvasElement;
  w: number;
  h: number;
}

/** Desenho procedural parametrizado de veículos e implementos. Corpos estáticos ficam em cache. */
export class MachineRenderer {
  private bodies = new Map<string, Sprite>();
  private cargoPatterns = new Map<string, CanvasPattern>();

  private vehicleBody(def: VehicleDef): Sprite {
    const hit = this.bodies.get(def.id);
    if (hit) return hit;
    const extra = def.combine ? def.combine.headerDepth * 2 + 1 : 1;
    const W = Math.max(def.width, def.combine ? def.combine.headerWidth : 0) + 1;
    const L = def.length + extra * 2;
    const { c, g } = canvas(L, W);
    if (def.category === "tractor") this.paintTractor(g, def);
    else if (def.category === "combine") this.paintCombine(g, def);
    else this.paintTruck(g, def);
    const s = { c, w: L, h: W };
    this.bodies.set(def.id, s);
    return s;
  }

  private paintTractor(g: CanvasRenderingContext2D, d: VehicleDef): void {
    const B = d.body;
    const p = d.paint;
    // chassi
    g.fillStyle = "#2b2b2b";
    g.fillRect(d.rear.x - 0.5, -0.36, B.hoodFront - d.rear.x + 0.4, 0.72);
    // contrapesos frontais
    g.fillStyle = "#3a3a3a";
    rrect(g, B.hoodFront - 0.05, -B.hoodWidth * 0.55, 0.32, B.hoodWidth * 1.1, 0.05);
    g.fill();
    g.strokeStyle = "#242424";
    g.lineWidth = 0.03;
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      g.moveTo(B.hoodFront, (k * B.hoodWidth) / 5);
      g.lineTo(B.hoodFront + 0.27, (k * B.hoodWidth) / 5);
      g.stroke();
    }
    // paralamas traseiros
    const fw = d.rear.track / 2 + d.rear.w / 2 + 0.06 + (d.rear.dual ? d.rear.w + 0.05 : 0);
    for (const s of [-1, 1]) {
      g.fillStyle = bodyGrad(g, p.body, s * (B.cabinWidth / 2 - 0.1), s * fw);
      rrect(g, d.rear.x - d.rear.r * 0.95, s > 0 ? B.cabinWidth / 2 - 0.12 : -fw, d.rear.r * 1.9, fw - B.cabinWidth / 2 + 0.12, 0.12);
      g.fill();
      g.strokeStyle = "rgba(0,0,0,0.35)";
      g.lineWidth = 0.03;
      g.stroke();
    }
    // capô
    g.fillStyle = bodyGrad(g, p.body, -B.hoodWidth / 2, B.hoodWidth / 2);
    rrect(g, B.hoodBack, -B.hoodWidth / 2, B.hoodFront - B.hoodBack, B.hoodWidth, 0.22);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,0.4)";
    g.lineWidth = 0.035;
    g.stroke();
    // grade e faróis
    g.fillStyle = "#1e1e1e";
    rrect(g, B.hoodFront - 0.14, -B.hoodWidth * 0.36, 0.1, B.hoodWidth * 0.72, 0.03);
    g.fill();
    g.fillStyle = "#f6f0cc";
    g.fillRect(B.hoodFront - 0.22, -B.hoodWidth * 0.46, 0.12, 0.12);
    g.fillRect(B.hoodFront - 0.22, B.hoodWidth * 0.46 - 0.12, 0.12, 0.12);
    // frisos de ventilação
    g.strokeStyle = shade(p.body, 0.6);
    g.lineWidth = 0.025;
    for (let k = 0; k < 6; k++) {
      const x = B.hoodBack + 0.35 + k * 0.13;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(x, s * B.hoodWidth * 0.32);
        g.lineTo(x + 0.08, s * B.hoodWidth * 0.42);
        g.stroke();
      }
    }
    // faixa de marca
    g.fillStyle = shade(p.accent, 1);
    g.fillRect(B.hoodBack + 0.1, -0.03, B.hoodFront - B.hoodBack - 0.3, 0.06);
    // cabine: vidro e teto
    g.fillStyle = "#26363d";
    rrect(g, B.cabinBack, -B.cabinWidth / 2, B.cabinFront - B.cabinBack, B.cabinWidth, 0.16);
    g.fill();
    const rg = g.createLinearGradient(B.cabinBack, -B.cabinWidth / 2, B.cabinFront, B.cabinWidth / 2);
    rg.addColorStop(0, shade(p.roof, 0.82));
    rg.addColorStop(0.45, shade(p.roof, 1.06));
    rg.addColorStop(1, shade(p.roof, 0.86));
    g.fillStyle = rg;
    rrect(g, B.cabinBack + 0.1, -B.cabinWidth / 2 + 0.1, B.cabinFront - B.cabinBack - 0.2, B.cabinWidth - 0.2, 0.14);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 0.03;
    g.stroke();
    // reflexo no vidro dianteiro
    g.strokeStyle = "rgba(190,225,235,0.55)";
    g.lineWidth = 0.05;
    g.beginPath();
    g.moveTo(B.cabinFront - 0.05, -B.cabinWidth * 0.3);
    g.lineTo(B.cabinFront - 0.05, B.cabinWidth * 0.1);
    g.stroke();
    // espelhos
    g.fillStyle = "#222";
    g.fillRect(B.cabinFront - 0.15, -B.cabinWidth / 2 - 0.22, 0.08, 0.2);
    g.fillRect(B.cabinFront - 0.15, B.cabinWidth / 2 + 0.02, 0.08, 0.2);
    // escapamento
    g.fillStyle = "#1a1a1a";
    g.beginPath();
    g.arc(B.exhaustX, -d.width * 0.18, 0.09, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#777";
    g.lineWidth = 0.025;
    g.stroke();
    // engate traseiro
    if (d.hitch) {
      g.fillStyle = "#333";
      g.fillRect(d.hitch.x, -0.3, 0.3, 0.6);
    }
  }

  private paintCombine(g: CanvasRenderingContext2D, d: VehicleDef): void {
    const B = d.body;
    const p = d.paint;
    const cb = d.combine!;
    // canal alimentador
    g.fillStyle = "#383838";
    g.fillRect(B.hoodFront - 0.1, -0.7, d.length / 2 - B.hoodFront + 0.4, 1.4);
    // plataforma de corte (estrutura)
    const hx = d.length / 2 + 0.1;
    const hw = cb.headerWidth / 2;
    g.fillStyle = bodyGrad(g, p.body, -hw, hw);
    g.fillRect(hx, -hw, cb.headerDepth * 0.55, cb.headerWidth);
    g.fillStyle = "#4a4a4a";
    g.fillRect(hx + 0.05, -hw + 0.15, cb.headerDepth * 0.45, cb.headerWidth - 0.3);
    // rosca sem-fim
    const ag = g.createLinearGradient(hx + 0.1, 0, hx + 0.5, 0);
    ag.addColorStop(0, "#6a6a6a");
    ag.addColorStop(0.5, "#b8b8b8");
    ag.addColorStop(1, "#5a5a5a");
    g.fillStyle = ag;
    g.fillRect(hx + 0.12, -hw + 0.2, 0.36, cb.headerWidth - 0.4);
    g.strokeStyle = "#444";
    g.lineWidth = 0.03;
    for (let y = -hw + 0.3; y < hw - 0.2; y += 0.3) {
      g.beginPath();
      g.moveTo(hx + 0.14, y);
      g.lineTo(hx + 0.46, y + 0.15);
      g.stroke();
    }
    // barra de corte
    g.fillStyle = "#c9c9c9";
    g.fillRect(hx + cb.headerDepth - 0.12, -hw, 0.08, cb.headerWidth);
    g.fillStyle = "#8a8a8a";
    for (let y = -hw; y < hw; y += 0.15) g.fillRect(hx + cb.headerDepth - 0.06, y, 0.08, 0.07);
    // divisores
    for (const s of [-1, 1]) {
      g.fillStyle = p.body;
      g.beginPath();
      g.moveTo(hx, s * hw);
      g.lineTo(hx + cb.headerDepth + 0.35, s * (hw - 0.05));
      g.lineTo(hx + cb.headerDepth * 0.4, s * (hw - 0.35));
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(0,0,0,0.4)";
      g.lineWidth = 0.03;
      g.stroke();
    }
    // corpo
    g.fillStyle = bodyGrad(g, p.body, -B.hoodWidth / 2, B.hoodWidth / 2);
    rrect(g, B.hoodBack, -B.hoodWidth / 2, B.hoodFront - B.hoodBack, B.hoodWidth, 0.3);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,0.4)";
    g.lineWidth = 0.04;
    g.stroke();
    // faixas laterais
    g.fillStyle = shade(p.body, 0.75);
    g.fillRect(B.hoodBack + 0.2, -B.hoodWidth / 2 + 0.1, B.hoodFront - B.hoodBack - 0.4, 0.12);
    g.fillRect(B.hoodBack + 0.2, B.hoodWidth / 2 - 0.22, B.hoodFront - B.hoodBack - 0.4, 0.12);
    // tanque graneleiro (interior)
    g.fillStyle = "#2e2a22";
    rrect(g, -2.0, -B.hoodWidth * 0.36, 3.3, B.hoodWidth * 0.72, 0.15);
    g.fill();
    g.strokeStyle = shade(p.body, 0.55);
    g.lineWidth = 0.08;
    g.stroke();
    // grade do motor
    g.fillStyle = "#2a2a2a";
    g.fillRect(B.hoodBack + 0.3, -0.7, 1.0, 1.4);
    g.strokeStyle = "#555";
    g.lineWidth = 0.03;
    for (let k = 0; k < 8; k++) {
      g.beginPath();
      g.moveTo(B.hoodBack + 0.35 + k * 0.12, -0.65);
      g.lineTo(B.hoodBack + 0.35 + k * 0.12, 0.65);
      g.stroke();
    }
    // picador de palha
    g.fillStyle = "#333";
    g.fillRect(B.hoodBack - 0.35, -1.0, 0.4, 2.0);
    // cabine
    const cy = -B.hoodWidth / 2 + B.cabinWidth / 2 + 0.05;
    g.fillStyle = "#26363d";
    rrect(g, B.cabinBack, cy - B.cabinWidth / 2, B.cabinFront - B.cabinBack, B.cabinWidth, 0.18);
    g.fill();
    g.fillStyle = bodyGrad(g, p.roof, cy - B.cabinWidth / 2, cy + B.cabinWidth / 2);
    rrect(g, B.cabinBack + 0.1, cy - B.cabinWidth / 2 + 0.12, B.cabinFront - B.cabinBack - 0.3, B.cabinWidth - 0.24, 0.16);
    g.fill();
    g.strokeStyle = "rgba(190,225,235,0.5)";
    g.lineWidth = 0.06;
    g.beginPath();
    g.moveTo(B.cabinFront - 0.06, cy - B.cabinWidth * 0.35);
    g.lineTo(B.cabinFront - 0.06, cy + B.cabinWidth * 0.35);
    g.stroke();
    // escada
    g.strokeStyle = "#222";
    g.lineWidth = 0.04;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.moveTo(B.cabinBack - 0.2 - k * 0.18, -B.hoodWidth / 2 - 0.05);
      g.lineTo(B.cabinBack - 0.2 - k * 0.18, -B.hoodWidth / 2 - 0.35);
      g.stroke();
    }
    // base do tubo
    g.fillStyle = shade(p.body, 0.8);
    g.beginPath();
    g.arc(cb.pipePivotX, -d.width * 0.32, 0.32, 0, Math.PI * 2);
    g.fill();
  }

  private paintTruck(g: CanvasRenderingContext2D, d: VehicleDef): void {
    const B = d.body;
    const p = d.paint;
    const back = -d.length / 2;
    const bedFront = B.cabinBack - 0.3;
    g.fillStyle = "#2a2a2a";
    g.fillRect(back, -0.5, d.length - 0.2, 1.0);
    // caçamba
    g.fillStyle = bodyGrad(g, p.body, -d.width / 2, d.width / 2);
    rrect(g, back, -d.width / 2, bedFront - back, d.width, 0.08);
    g.fill();
    g.fillStyle = "#3a3630";
    g.fillRect(back + 0.15, -d.width / 2 + 0.15, bedFront - back - 0.3, d.width - 0.3);
    g.strokeStyle = shade(p.body, 0.7);
    g.lineWidth = 0.05;
    for (let x = back + 1; x < bedFront - 0.3; x += 1.2) {
      g.beginPath();
      g.moveTo(x, -d.width / 2);
      g.lineTo(x, -d.width / 2 + 0.15);
      g.moveTo(x, d.width / 2);
      g.lineTo(x, d.width / 2 - 0.15);
      g.stroke();
    }
    // cabine
    g.fillStyle = bodyGrad(g, p.roof, -d.width / 2, d.width / 2);
    rrect(g, B.cabinBack, -d.width / 2, B.hoodFront - B.cabinBack, d.width, 0.35);
    g.fill();
    g.fillStyle = "#26363d";
    g.fillRect(B.hoodFront - 0.55, -d.width / 2 + 0.15, 0.4, d.width - 0.3);
    g.fillStyle = "rgba(255,255,255,0.75)";
    g.fillRect(B.cabinBack + 0.25, -d.width / 2 + 0.3, 1.0, d.width - 0.6);
    g.fillStyle = "#222";
    g.fillRect(B.hoodFront - 0.6, -d.width / 2 - 0.25, 0.1, 0.25);
    g.fillRect(B.hoodFront - 0.6, d.width / 2, 0.1, 0.25);
  }

  /** Volume de carga com textura de grãos. */
  private cargoFill(ctx: CanvasRenderingContext2D, cargo: Cargo, x0: number, y0: number, w: number, h: number): void {
    if (cargo.kg <= 1 || !cargo.cropId) return;
    const f = Math.min(1, cargo.kg / cargo.capacity);
    const col = CROPS[cargo.cropId].colors.grain;
    let pat = this.cargoPatterns.get(col);
    if (!pat) {
      const c = document.createElement("canvas");
      c.width = c.height = 48;
      const g = c.getContext("2d")!;
      g.fillStyle = col;
      g.fillRect(0, 0, 48, 48);
      for (let k = 0; k < 340; k++) {
        g.fillStyle = k % 3 ? "rgba(255,255,255,0.22)" : "rgba(80,50,10,0.25)";
        g.fillRect(((k * 37) % 48) + (k % 5) * 0.3, (k * 53) % 48, 1.4, 1.4);
      }
      pat = ctx.createPattern(c, "repeat")!;
      pat.setTransform(new DOMMatrix().scale(1 / 40));
      this.cargoPatterns.set(col, pat);
    }
    const inset = (1 - f) * Math.min(w, h) * 0.32;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * f;
    ctx.fillStyle = pat;
    rrect(ctx, x0 + inset, y0 + inset, w - inset * 2, h - inset * 2, Math.min(w, h) * 0.3);
    ctx.fill();
    const g = ctx.createRadialGradient(x0 + w / 2, y0 + h / 2, 0, x0 + w / 2, y0 + h / 2, Math.max(w, h) / 2);
    g.addColorStop(0, "rgba(255,245,210,0.35)");
    g.addColorStop(1, "rgba(60,40,10,0.25)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  shadowVehicle(ctx: CanvasRenderingContext2D, v: Vehicle, sx: number, sy: number): void {
    const d = v.def;
    ctx.save();
    ctx.translate(v.x + sx, v.y + sy);
    ctx.rotate(v.heading);
    rrect(ctx, -d.length / 2, -d.width / 2, d.length, d.width, 0.4);
    ctx.fill();
    if (d.combine) {
      const k = v.lowered ? 0.4 : 1;
      ctx.translate(-sx * (1 - k), -sy * (1 - k));
      ctx.fillRect(d.length / 2, -d.combine.headerWidth / 2, d.combine.headerDepth, d.combine.headerWidth);
    }
    ctx.restore();
  }

  shadowImplement(ctx: CanvasRenderingContext2D, im: Implement, sx: number, sy: number): void {
    const d = im.def;
    const k = d.op && im.lowerAnim > 0.5 && d.hitch === "3pt" ? 0.5 : 1;
    ctx.save();
    ctx.translate(im.x + sx * k, im.y + sy * k);
    ctx.rotate(im.heading);
    const w = d.category === "sprayer" && im.lowerAnim > 0.5 ? d.workWidth : d.width;
    ctx.fillRect(-d.length, -w / 2, d.length - (d.hitch === "drawbar" ? 1.4 : 0.2), w);
    ctx.restore();
  }

  drawVehicle(ctx: CanvasRenderingContext2D, v: Vehicle, time: number, lod: boolean): void {
    const d = v.def;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.heading);
    if (lod) {
      ctx.fillStyle = d.paint.body;
      ctx.fillRect(-d.length / 2, -d.width / 2, d.length, d.width);
      if (d.combine) ctx.fillRect(d.length / 2, -d.combine.headerWidth / 2, d.combine.headerDepth, d.combine.headerWidth);
      ctx.restore();
      return;
    }
    const steer = v.steer;
    // rodas
    const fr = d.front;
    const rr = d.rear;
    for (const s of [-1, 1]) {
      // traseiras
      if (d.category === "truck") {
        for (const ax of [-0.65, 0.65]) {
          tire(ctx, rr.x + ax, (s * rr.track) / 2, rr.r * 2, rr.w, v.wheelDist / rr.r * 0.5, d.paint.rim);
          tire(ctx, rr.x + ax, (s * (rr.track + rr.w * 2.1)) / 2, rr.r * 2, rr.w, v.wheelDist / rr.r * 0.5);
        }
      } else {
        ctx.save();
        ctx.translate(rr.x, (s * rr.track) / 2);
        if (d.rearSteer) ctx.rotate(-steer);
        tire(ctx, 0, 0, rr.r * 2, rr.w, v.wheelDist, d.paint.rim);
        ctx.restore();
        if (rr.dual) tire(ctx, rr.x, s * (rr.track / 2 + rr.w + 0.06), rr.r * 2, rr.w, v.wheelDist);
      }
      // dianteiras
      ctx.save();
      ctx.translate(fr.x, (s * fr.track) / 2);
      if (!d.rearSteer) ctx.rotate(steer);
      tire(ctx, 0, 0, fr.r * 2, fr.w, v.wheelDist, d.paint.rim);
      ctx.restore();
    }
    // corpo em cache
    const body = this.vehicleBody(d);
    ctx.drawImage(body.c, -body.w / 2, -body.h / 2, body.w, body.h);
    // carga do tanque/caçamba
    if (v.cargo) {
      if (d.combine) this.cargoFill(ctx, v.cargo, -1.95, -d.body.hoodWidth * 0.34, 3.2, d.body.hoodWidth * 0.68);
      else if (d.category === "truck") {
        const back = -d.length / 2;
        const front = d.body.cabinBack - 0.3;
        if (v.tip > 0.02) {
          ctx.fillStyle = `rgba(0,0,0,${v.tip * 0.25})`;
          ctx.fillRect(back, -d.width / 2, front - back, d.width);
        }
        this.cargoFill(ctx, v.cargo, back + 0.15, -d.width / 2 + 0.15, front - back - 0.3, d.width - 0.3);
      }
    }
    if (d.combine) {
      // molinete animado
      const cb = d.combine;
      const hx = d.length / 2 + 0.1 + cb.headerDepth * 0.45;
      const depth = cb.headerDepth * 0.6;
      const hw = cb.headerWidth / 2 - 0.25;
      ctx.fillStyle = "rgba(40,40,40,0.25)";
      ctx.fillRect(hx, -hw, depth, hw * 2);
      ctx.strokeStyle = shade(d.paint.body, 0.85);
      ctx.lineWidth = 0.08;
      const n = 6;
      for (let k = 0; k < n; k++) {
        const ph = ((k / n + v.reel * 0.08) % 1 + 1) % 1;
        const x = hx + Math.sin(ph * Math.PI) * depth;
        ctx.globalAlpha = 0.45 + 0.55 * Math.sin(ph * Math.PI);
        ctx.beginPath();
        ctx.moveTo(x, -hw);
        ctx.lineTo(x, hw);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = shade(d.paint.body, 0.7);
      ctx.fillRect(hx - 0.05, -hw - 0.12, depth + 0.1, 0.12);
      ctx.fillRect(hx - 0.05, hw, depth + 0.1, 0.12);
      // tubo de descarga
      const a = pipeLocalAngle(v);
      const px = cb.pipePivotX;
      const py = -d.width * 0.32;
      const ex = px + Math.cos(a) * cb.pipeLength;
      const ey = py + Math.sin(a) * cb.pipeLength;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 0.46;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = d.paint.body;
      ctx.lineWidth = 0.36;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 0.08;
      ctx.stroke();
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.arc(ex, ey, 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineCap = "butt";
    }
    // giroflex quando operado por funcionário
    if (v.beacon) {
      const on = Math.sin(time * 9 + v.id) > 0;
      const bx = d.category === "combine" ? d.body.cabinBack + 0.3 : d.body.cabinBack + 0.3;
      const by = d.category === "combine" ? -d.body.hoodWidth / 2 + d.body.cabinWidth / 2 : 0;
      ctx.fillStyle = on ? "#ffb21e" : "#8a5a10";
      ctx.beginPath();
      ctx.arc(bx, by, 0.14, 0, Math.PI * 2);
      ctx.fill();
      if (on) {
        ctx.fillStyle = "rgba(255,178,30,0.25)";
        ctx.beginPath();
        ctx.arc(bx, by, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawImplement(ctx: CanvasRenderingContext2D, im: Implement, attached: Vehicle | undefined, lod: boolean): void {
    const d = im.def;
    if (attached && d.hitch === "3pt") this.linkage(ctx, attached, im);
    ctx.save();
    ctx.translate(im.x, im.y);
    ctx.rotate(im.heading);
    if (lod) {
      ctx.fillStyle = d.paint.frame;
      ctx.fillRect(-d.length, -d.width / 2, d.length, d.width);
      ctx.restore();
      return;
    }
    switch (d.category) {
      case "cultivator":
        this.cultivator(ctx, im, d);
        break;
      case "plow":
        this.plow(ctx, im, d);
        break;
      case "seeder":
        this.seeder(ctx, im, d);
        break;
      case "sprayer":
        this.sprayer(ctx, im, d);
        break;
      case "trailer":
        this.trailer(ctx, im, d);
        break;
    }
    ctx.restore();
  }

  private linkage(ctx: CanvasRenderingContext2D, v: Vehicle, im: Implement): void {
    const hx = v.def.hitch!.x;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.heading);
    ctx.strokeStyle = "#2c2c2c";
    ctx.lineWidth = 0.11;
    ctx.lineCap = "round";
    const lift = im.lowerAnim;
    const reach = 0.45 + (1 - lift) * 0.12;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + 0.35, s * 0.32);
      ctx.lineTo(hx - reach, s * 0.5);
      ctx.stroke();
    }
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.moveTo(hx + 0.6, 0);
    ctx.lineTo(hx - reach, 0);
    ctx.stroke();
    ctx.restore();
  }

  private cultivator(ctx: CanvasRenderingContext2D, im: Implement, d: ImplementDef): void {
    const W = d.width;
    const raised = 1 - im.lowerAnim;
    ctx.fillStyle = shade(d.paint.frame, 0.9 + raised * 0.15);
    ctx.fillRect(-0.62, -0.18, 0.5, 0.36);
    for (const x of [-0.55, -1.0]) {
      ctx.fillStyle = bodyGrad(ctx, d.paint.frame, x - 0.08, x + 0.08);
      ctx.fillRect(x - 0.08, -W / 2, 0.16, W);
    }
    // hastes (molas)
    ctx.strokeStyle = d.paint.accent;
    ctx.lineWidth = 0.05;
    for (const [x, off] of [
      [-0.55, 0],
      [-1.0, 0.125],
    ] as const) {
      for (let y = -W / 2 + 0.12 + off; y < W / 2 - 0.05; y += 0.25) {
        ctx.beginPath();
        ctx.arc(x - 0.12, y, 0.08, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.fillStyle = "#555";
        ctx.fillRect(x - 0.32, y - 0.025, 0.12, 0.05);
      }
    }
    // rolo destorroador
    const rx = -d.length + 0.25;
    ctx.fillStyle = "#555";
    ctx.fillRect(rx - 0.2, -W / 2, 0.4, W);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.04;
    const sp = 0.16;
    const off = ((im.wheelDist * 0.8) % sp + sp) % sp;
    for (let k = -1; k < 3; k++) {
      const x = rx - 0.2 + off + k * sp;
      if (x < rx - 0.2 || x > rx + 0.2) continue;
      ctx.beginPath();
      ctx.moveTo(x, -W / 2);
      ctx.lineTo(x, W / 2);
      ctx.stroke();
    }
    ctx.fillStyle = d.paint.frame;
    ctx.fillRect(-d.length + 0.1, -W / 2 - 0.08, d.length - 0.5, 0.08);
    ctx.fillRect(-d.length + 0.1, W / 2, d.length - 0.5, 0.08);
  }

  private plow(ctx: CanvasRenderingContext2D, im: Implement, d: ImplementDef): void {
    const n = 4;
    ctx.strokeStyle = shade(d.paint.frame, 0.85);
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    ctx.moveTo(-0.3, 0);
    ctx.lineTo(-d.length + 0.3, d.width / 2 - 0.3);
    ctx.stroke();
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = -0.3 + (-d.length + 0.6) * t;
      const y = -d.width / 2 + 0.2 + (d.width - 0.4) * t;
      ctx.fillStyle = "#cfcfcf";
      ctx.beginPath();
      ctx.moveTo(x + 0.25, y - 0.15);
      ctx.quadraticCurveTo(x - 0.1, y + 0.05, x - 0.45, y + 0.45);
      ctx.lineTo(x - 0.25, y + 0.5);
      ctx.quadraticCurveTo(x, y + 0.1, x + 0.35, y - 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#777";
      ctx.lineWidth = 0.03;
      ctx.stroke();
      ctx.fillStyle = d.paint.frame;
      ctx.fillRect(x - 0.08, y - 0.3, 0.16, 0.35);
    }
    tire(ctx, -d.length + 0.4, -d.width / 2 + 0.1, 0.6, 0.22, im.wheelDist);
  }

  private seeder(ctx: CanvasRenderingContext2D, im: Implement, d: ImplementDef): void {
    const W = d.width;
    const ax = -d.drawbar;
    // rodas de transporte
    for (const s of [-1, 1]) tire(ctx, ax, s * (W / 2 - 0.25), 0.9, 0.3, im.wheelDist);
    // cabeçalho em "A"
    ctx.strokeStyle = shade(d.paint.frame, 0.8);
    ctx.lineWidth = 0.12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-1.3, -0.9);
    ctx.moveTo(0, 0);
    ctx.lineTo(-1.3, 0.9);
    ctx.stroke();
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(0, 0, 0.12, 0, Math.PI * 2);
    ctx.fill();
    // barra porta-ferramentas
    ctx.fillStyle = bodyGrad(ctx, d.paint.frame, -1.5, -1.25);
    ctx.fillRect(-1.5, -W / 2, 0.25, W);
    // linhas de plantio (discos)
    const rows = Math.max(4, Math.round(W / 0.5));
    for (let k = 0; k < rows; k++) {
      const y = -W / 2 + (k + 0.5) * (W / rows);
      ctx.fillStyle = d.paint.frame;
      ctx.fillRect(-2.9, y - 0.07, 1.4, 0.14);
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.ellipse(-3.15, y, 0.24, 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#555";
      ctx.fillRect(-d.length + 0.1, y - 0.06, 0.22, 0.12);
    }
    // depósito de sementes
    const hx0 = -2.75;
    const hl = 1.15;
    const hw = W * 0.86;
    ctx.fillStyle = bodyGrad(ctx, d.paint.accent, -hw / 2, hw / 2);
    rrect(ctx, hx0, -hw / 2, hl, hw, 0.12);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 0.03;
    ctx.stroke();
    // janela com nível de sementes
    const f = d.seedCapacityKg ? im.seedKg / d.seedCapacityKg : 0;
    ctx.fillStyle = "#3a3329";
    ctx.fillRect(hx0 + 0.15, -hw / 2 + 0.15, hl - 0.3, hw - 0.3);
    if (f > 0.005) {
      ctx.fillStyle = CROPS[im.seedCrop].colors.grain;
      ctx.globalAlpha = 0.5 + f * 0.5;
      const inset = (1 - f) * 0.2;
      ctx.fillRect(hx0 + 0.15 + inset, -hw / 2 + 0.15 + inset, hl - 0.3 - inset * 2, hw - 0.3 - inset * 2);
      ctx.globalAlpha = 1;
    }
    // marcadores de linha recolhidos
    ctx.strokeStyle = d.paint.frame;
    ctx.lineWidth = 0.07;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-1.4, s * (W / 2 + 0.05));
      ctx.lineTo(-3.3, s * (W / 2 + 0.05));
      ctx.stroke();
    }
  }

  private sprayer(ctx: CanvasRenderingContext2D, im: Implement, d: ImplementDef): void {
    const ax = -d.drawbar;
    for (const s of [-1, 1]) tire(ctx, ax, s * (d.width / 2 - 0.2), 1.1, 0.32, im.wheelDist);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-1.4, 0);
    ctx.stroke();
    // tanque
    const tg = ctx.createLinearGradient(0, -d.width / 2, 0, d.width / 2);
    tg.addColorStop(0, "#9a9a9a");
    tg.addColorStop(0.45, "#f4f4f4");
    tg.addColorStop(1, "#8a8a8a");
    ctx.fillStyle = tg;
    rrect(ctx, -3.9, -d.width / 2 + 0.2, 2.5, d.width - 0.4, 0.9);
    ctx.fill();
    ctx.fillStyle = d.paint.accent;
    ctx.beginPath();
    ctx.arc(-2.6, 0, 0.25, 0, Math.PI * 2);
    ctx.fill();
    const f = d.liquidCapacityL ? im.liquidL / d.liquidCapacityL : 0;
    ctx.fillStyle = "rgba(60,120,60,0.6)";
    ctx.fillRect(-3.7, d.width / 2 - 0.35, 2.1 * f, 0.1);
    // barras (abrem ao baixar)
    const open = im.lowerAnim;
    const bx = -d.length + 0.3;
    const half = d.workWidth / 2;
    ctx.strokeStyle = shade(d.paint.frame, 0.7);
    ctx.lineWidth = 0.12;
    for (const s of [-1, 1]) {
      const a = (1 - open) * (Math.PI / 2) * 0.98;
      const ex = bx + Math.sin(a) * half;
      const ey = s * (0.5 + Math.cos(a) * (half - 0.5));
      ctx.beginPath();
      ctx.moveTo(bx, s * 0.5);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (open > 0.95) {
        ctx.fillStyle = d.paint.accent;
        for (let y = 0.6; y < half; y += 0.5) ctx.fillRect(bx - 0.06, s * y - 0.04, 0.12, 0.08);
      }
    }
    ctx.fillStyle = "#555";
    ctx.fillRect(bx - 0.1, -0.55, 0.2, 1.1);
  }

  private trailer(ctx: CanvasRenderingContext2D, im: Implement, d: ImplementDef): void {
    const W = d.width;
    const ax = -d.drawbar;
    for (const s of [-1, 1]) {
      tire(ctx, ax - 0.55, s * (W / 2 - 0.05), 1.0, 0.36, im.wheelDist);
      tire(ctx, ax + 0.55, s * (W / 2 - 0.05), 1.0, 0.36, im.wheelDist);
    }
    // cabeçalho
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-1.6, -0.6);
    ctx.moveTo(0, 0);
    ctx.lineTo(-1.6, 0.6);
    ctx.stroke();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(0, 0, 0.12, 0, Math.PI * 2);
    ctx.fill();
    // caçamba
    const x0 = -d.length;
    const len = d.length - 1.6;
    const tipShift = im.tip * 0.35;
    ctx.fillStyle = bodyGrad(ctx, d.paint.frame, -W / 2, W / 2);
    rrect(ctx, x0 - tipShift, -W / 2, len + tipShift * 0.5, W, 0.08);
    ctx.fill();
    ctx.fillStyle = "#3d3830";
    ctx.fillRect(x0 + 0.12 - tipShift, -W / 2 + 0.12, len - 0.24, W - 0.24);
    if (im.cargo) this.cargoFill(ctx, im.cargo, x0 + 0.12 - tipShift, -W / 2 + 0.12, len - 0.24, W - 0.24);
    if (im.tip > 0.02) {
      const g = ctx.createLinearGradient(x0, 0, x0 + len, 0);
      g.addColorStop(0, `rgba(0,0,0,${0.35 * im.tip})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x0 - tipShift, -W / 2, len, W);
      // tampa traseira aberta
      ctx.strokeStyle = shade(d.paint.frame, 0.7);
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      ctx.moveTo(x0 - tipShift, -W / 2);
      ctx.lineTo(x0 - tipShift - im.tip * 0.6, -W / 2 + 0.1);
      ctx.moveTo(x0 - tipShift, W / 2);
      ctx.lineTo(x0 - tipShift - im.tip * 0.6, W / 2 - 0.1);
      ctx.stroke();
    }
    // reforços
    ctx.strokeStyle = shade(d.paint.frame, 0.7);
    ctx.lineWidth = 0.05;
    for (let x = x0 + 0.9; x < x0 + len - 0.3; x += 0.9) {
      ctx.beginPath();
      ctx.moveTo(x - tipShift, -W / 2);
      ctx.lineTo(x - tipShift, -W / 2 + 0.12);
      ctx.moveTo(x - tipShift, W / 2);
      ctx.lineTo(x - tipShift, W / 2 - 0.12);
      ctx.stroke();
    }
  }
}

export interface CharacterStyle {
  shirt: string;
  hat: string;
  skin: string;
}

/** Pessoa vista de cima: ombros, braços balançando, cabeça e chapéu. */
export function drawCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, phase: number, moving: boolean, st: CharacterStyle, sun: { x: number; y: number }): void {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x + sun.x * 0.4, y + sun.y * 0.4, 0.42, 0.32, heading, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y);
  ctx.rotate(heading);
  const sw = moving ? Math.sin(phase) * 0.22 : 0;
  // pernas
  ctx.fillStyle = "#3d4a63";
  ctx.fillRect(-0.08 + sw, -0.17, 0.2, 0.13);
  ctx.fillRect(-0.08 - sw, 0.04, 0.2, 0.13);
  // braços
  ctx.fillStyle = st.shirt;
  ctx.beginPath();
  ctx.ellipse(-sw * 0.8, -0.3, 0.13, 0.08, 0, 0, Math.PI * 2);
  ctx.ellipse(sw * 0.8, 0.3, 0.13, 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  // tronco
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.17, 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 0.03;
  ctx.stroke();
  // cabeça e chapéu
  ctx.fillStyle = st.skin;
  ctx.beginPath();
  ctx.arc(0.02, 0, 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = st.hat;
  ctx.beginPath();
  ctx.arc(0, 0, 0.14, Math.PI * 0.5, Math.PI * 1.5);
  ctx.lineTo(0.2, -0.08);
  ctx.lineTo(0.2, 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
