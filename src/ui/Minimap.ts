import { ST } from "../systems/FieldSystem";
import type { Renderer } from "../render/Renderer";
import type { World } from "../world/World";

export interface MapViewOpts {
  cx: number;
  cy: number;
  /** metros por pixel */
  scale: number;
  selectedField?: number | null;
  labels?: boolean;
}

const OWNER_TINT: Record<string, string> = { player: "rgba(255,214,90,0.55)" };

/** Desenho do mapa (minimapa e mapa grande) a partir do terreno em baixa resolução. */
export function drawMap(ctx: CanvasRenderingContext2D, W: number, H: number, world: World, renderer: Renderer, o: MapViewOpts): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#4d6b35";
  ctx.fillRect(0, 0, W, H);
  const s = 1 / o.scale;
  ctx.setTransform(s, 0, 0, s, W / 2 - o.cx * s, H / 2 - o.cy * s);
  const low = renderer.ground.lowres;
  if (low) ctx.drawImage(low, 0, 0, world.map.width, world.map.height);
  for (const f of world.fields) {
    ctx.beginPath();
    f.poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    const c = f.counts;
    const planted = c[ST.Planted] / (f.maskCount || 1);
    const mature = f.matureCount / (f.maskCount || 1);
    ctx.fillStyle = mature > 0.4 ? "#d7b45a" : planted > 0.4 ? "#6f9e45" : c[ST.Stubble] > f.maskCount * 0.4 ? "#c4ad7a" : c[ST.Raw] > f.maskCount * 0.4 ? "#8c9b5a" : "#7a5c3e";
    ctx.fill();
    const tint = f.owner ? OWNER_TINT[f.owner] ?? world.farmOf(f.owner).color : "rgba(255,255,255,0.9)";
    ctx.lineWidth = Math.max(1.5, 2 * o.scale);
    ctx.strokeStyle = f.owner === null ? "rgba(255,255,255,0.9)" : tint;
    if (f.owner === null) ctx.setLineDash([4 * o.scale, 3 * o.scale]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (o.selectedField === f.id) {
      ctx.lineWidth = 3 * o.scale;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    }
  }
  // locais
  for (const z of world.map.zones) {
    if (z.type !== "sell" && z.type !== "dealer" && z.type !== "fuel") continue;
    ctx.fillStyle = z.type === "sell" ? "#5fcf6a" : z.type === "dealer" ? "#b48ef0" : "#f28c3a";
    ctx.beginPath();
    ctx.arc(z.x, z.y, 5 * o.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1b1b1b";
    ctx.lineWidth = o.scale;
    ctx.stroke();
  }
  // máquinas
  for (const v of world.vehicles) {
    const col = v.owner === "player" ? (v.driver === "worker" ? "#5ec8ff" : "#ffe17a") : world.farmOf(v.owner).color;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.heading);
    ctx.fillStyle = col;
    ctx.strokeStyle = "#111";
    ctx.lineWidth = o.scale * 0.8;
    const k = Math.max(1, o.scale * 1.6);
    ctx.beginPath();
    ctx.moveTo(3 * k, 0);
    ctx.lineTo(-2.2 * k, -2 * k);
    ctx.lineTo(-2.2 * k, 2 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // jogador
  const p = world.player;
  if (p.vehicleId === null) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 * o.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e0442a";
    ctx.lineWidth = o.scale * 1.5;
    ctx.stroke();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (o.labels) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const toS = (x: number, y: number) => ({ x: (x - o.cx) * s + W / 2, y: (y - o.cy) * s + H / 2 });
    ctx.font = "600 12px system-ui, sans-serif";
    for (const pl of world.map.places) {
      const q = toS(pl.x, pl.y - 26);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeText(pl.name, q.x, q.y);
      ctx.fillStyle = "#fff6d8";
      ctx.fillText(pl.name, q.x, q.y);
    }
    ctx.font = "500 11px system-ui, sans-serif";
    for (const f of world.fields) {
      const q = toS((f.bounds.minX + f.bounds.maxX) / 2, (f.bounds.minY + f.bounds.maxY) / 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.strokeText(f.name, q.x, q.y);
      ctx.fillStyle = f.owner === "player" ? "#ffe17a" : f.owner === null ? "#e6ffe0" : "#e8e8e8";
      ctx.fillText(f.name, q.x, q.y);
    }
  }
}
