import { hash2 } from "../core/rng";
import { cropByIndex } from "../data/crops";
import { ST } from "../systems/FieldSystem";
import { pipeOutlet } from "../systems/geometry";
import { containerUnderPipe } from "../systems/ImplementSystem";
import { daylight, season, sunAngle } from "../systems/TimeSystem";
import type { World } from "../world/World";
import type { Zone } from "../world/types";
import { Camera } from "./Camera";
import { FieldRenderer } from "./FieldRenderer";
import { Ground } from "./Ground";
import { MachineRenderer, drawCharacter } from "./Machines";
import { Particles } from "./Particles";
import { StructureRenderer } from "./Structures";

const ZONE_COLORS: Record<string, string> = {
  sell: "#5fcf6a",
  silo: "#f2c94c",
  seed: "#9fd86b",
  fuel: "#f28c3a",
  workshop: "#5aa9e6",
  home: "#f4f1e8",
  dealer: "#b48ef0",
};

export interface RenderOptions {
  highlightFieldId?: number;
  showZones: boolean;
  showLabels: boolean;
}

/** Orquestra todas as camadas de desenho. Nada aqui altera o estado do jogo. */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  readonly camera = new Camera();
  readonly particles = new Particles();
  readonly ground: Ground;
  readonly fields: FieldRenderer;
  readonly machines = new MachineRenderer();
  readonly structures: StructureRenderer;
  private light: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private drops: Float32Array;
  dpr = 1;
  mobile: boolean;
  time = 0;
  fieldBudget: number;
  private summaries = new Map<number, { cropIndex: number; growth: number; t: number }>();

  constructor(canvas: HTMLCanvasElement, private world: World, mobile: boolean) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.mobile = mobile;
    this.ground = new Ground(world.map, mobile);
    this.fields = new FieldRenderer(world.seed, mobile);
    this.structures = new StructureRenderer(world.seed);
    this.light = document.createElement("canvas");
    this.lctx = this.light.getContext("2d")!;
    this.drops = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      this.drops[i * 3] = Math.random();
      this.drops[i * 3 + 1] = Math.random();
      this.drops[i * 3 + 2] = 0.6 + Math.random() * 0.8;
    }
    this.fieldBudget = mobile ? 50000 : 140000;
    this.particles.quality = mobile ? 0.5 : 1;
    world.fx = this.particles;
    this.ground.setSeason(season(world.time.day));
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.camera.w = w;
    this.camera.h = h;
    const ls = 0.5;
    this.light.width = Math.max(1, Math.round(w * ls));
    this.light.height = Math.max(1, Math.round(h * ls));
  }

  /** Pré-gera texturas de todos os campos (tela de carregamento). */
  warmup(maxMs: number): boolean {
    const t0 = performance.now();
    for (const f of this.world.fields) {
      while (f.dirty && performance.now() - t0 < maxMs) this.fields.update(f, 400000);
      if (performance.now() - t0 >= maxMs) return false;
    }
    return true;
  }

  render(frameDt: number, opt: RenderOptions): void {
    this.time += frameDt;
    const world = this.world;
    const ctx = this.ctx;
    const cam = this.camera;
    const z = cam.zoom;
    this.ground.setSeason(season(world.time.day));
    const view = cam.view(12);
    this.particles.view = view;
    world.view = { x: cam.x, y: cam.y, r: Math.max(view.maxX - view.minX, view.maxY - view.minY) / 2 + 40 };
    this.particles.update(frameDt);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#5d7d3e";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const d = this.dpr;
    ctx.setTransform(d * z, 0, 0, d * z, d * (cam.w / 2 - cam.x * z), d * (cam.h / 2 - cam.y * z));
    const lod = z < 1.9;

    this.ground.draw(ctx, view, z, this.mobile ? 1 : 2);

    // campos: atualiza os visíveis primeiro
    let budget = this.fieldBudget;
    const visible = world.fields.filter((f) => !(f.bounds.maxX < view.minX || f.bounds.minX > view.maxX || f.bounds.maxY < view.minY || f.bounds.minY > view.maxY));
    for (const f of visible) if (budget > 0 && f.dirty) budget = this.fields.update(f, budget);
    if (budget > 0) for (const f of world.fields) if (budget > 0 && f.dirty && !visible.includes(f)) budget = this.fields.update(f, budget * 0.5);
    for (const f of visible) this.fields.draw(ctx, f);
    if (z > 1.5) this.windShimmer(ctx, visible);
    if (opt.highlightFieldId) {
      const f = world.field(opt.highlightFieldId);
      if (f) {
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = Math.max(0.2, 1.5 / z);
        ctx.setLineDash([2, 1.5]);
        ctx.beginPath();
        f.poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (opt.showZones && z > 1.6) for (const zn of world.map.zones) this.drawZone(ctx, zn);
    if (!lod) this.particles.drawTracks(ctx, view);

    // sombras
    const dl = daylight(world.time);
    const sa = sunAngle(world.time);
    const h = world.time.minute / 60;
    const slen = (0.5 + Math.min(1.6, Math.abs(h - 13) / 5)) * (0.3 + dl * 0.7);
    const sx = Math.cos(sa) * slen;
    const sy = Math.sin(sa) * slen * 0.6 + 0.25;
    const sun = { x: sx, y: sy };
    const shadowAlpha = 0.24 * (0.25 + dl * 0.75) * (1 - world.weather.cloud * 0.5);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    const inView = (x: number, y: number, r: number) => x + r > view.minX && x - r < view.maxX && y + r > view.minY && y - r < view.maxY;
    for (const b of world.map.buildings) if (inView(b.x, b.y, Math.max(b.def.w, b.def.h))) this.structures.drawBuildingShadow(ctx, b, sx, sy);
    for (const im of world.implements) if (inView(im.x, im.y, im.def.length + 4)) this.machines.shadowImplement(ctx, im, sx, sy);
    for (const v of world.vehicles) if (inView(v.x, v.y, 10)) this.machines.shadowVehicle(ctx, v, sx, sy);

    for (const b of world.map.buildings) if (inView(b.x, b.y, Math.max(b.def.w, b.def.h))) this.structures.drawBuilding(ctx, b);
    this.particles.drawLow(ctx);
    for (const im of world.implements) {
      if (!inView(im.x, im.y, im.def.length + 6)) continue;
      this.machines.drawImplement(ctx, im, world.vehicle(im.attachedTo), lod);
    }
    for (const v of world.vehicles) {
      if (!inView(v.x, v.y, 10)) continue;
      v.beacon = v.driver === "worker";
      this.machines.drawVehicle(ctx, v, this.time, lod);
    }
    // pessoas a pé
    const p = world.player;
    if (p.vehicleId === null) drawCharacter(ctx, p.x, p.y, p.heading, p.walkPhase, p.moving, { shirt: "#2f6fb0", hat: "#d9b15a", skin: "#d9a77a" }, sun);
    for (const w of world.workers) {
      if (w.vehicleId !== null || w.state === "idle") continue;
      if (!inView(w.x, w.y, 2)) continue;
      const col = w.owner === "player" ? "#e07a2f" : world.farmOf(w.owner).color;
      drawCharacter(ctx, w.x, w.y, w.heading, w.walkPhase, true, { shirt: col, hat: "#6b4a2a", skin: "#c99572" }, sun);
    }
    // alvo da descarga: ajuda a posicionar a carreta sob o tubo
    for (const v of world.vehicles) {
      if (!v.def.combine || v.pipeAnim < 0.9 || !inView(v.x, v.y, 15)) continue;
      const o = pipeOutlet(v);
      const ok = !!containerUnderPipe(world, v);
      ctx.strokeStyle = ok ? "rgba(120,230,120,0.9)" : "rgba(255,220,120,0.85)";
      ctx.lineWidth = 0.12;
      ctx.setLineDash([0.5, 0.35]);
      ctx.beginPath();
      ctx.arc(o.x, o.y, 0.9 + Math.sin(this.time * 5) * 0.08, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    this.particles.drawHigh(ctx);
    if (!lod) {
      const wind = world.weather.wind;
      const s = season(world.time.day);
      ctx.fillStyle = `rgba(0,0,0,${shadowAlpha * 0.7})`;
      for (const t of world.map.trees) if (inView(t.x, t.y, t.r + 3)) this.structures.drawTreeShadow(ctx, t, sx, sy);
      for (const t of world.map.trees) if (inView(t.x, t.y, t.r + 1)) this.structures.drawTree(ctx, t, this.time, wind, s);
    }
    this.cloudShadows(ctx, view);

    // camada de tela
    ctx.setTransform(d, 0, 0, d, 0, 0);
    if (opt.showLabels) this.labels(ctx);
    this.workerTags(ctx);
    this.lighting(ctx, dl);
    this.rain(ctx, frameDt);
  }

  private windShimmer(ctx: CanvasRenderingContext2D, fields: World["fields"]): void {
    const t = this.time;
    const wind = this.world.weather.wind;
    for (const f of fields) {
      const tall = f.counts[ST.Planted];
      if (tall < f.maskCount * 0.3) continue;
      let s = this.summaries.get(f.id);
      if (!s || t - s.t > 1.5) {
        s = { ...f.summary(), t };
        this.summaries.set(f.id, s);
      }
      if (s.growth < 0.5) continue;
      const crop = cropByIndex(s.cropIndex);
      if (!crop) continue;
      ctx.save();
      ctx.beginPath();
      f.poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.clip();
      const b = f.bounds;
      const span = b.maxX - b.minX + 60;
      const pos = ((t * (6 + wind * 10)) % span) + b.minX - 30;
      for (const off of [0, span / 2]) {
        const x = ((pos + off - b.minX) % span) + b.minX - 30;
        const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
        g.addColorStop(0, "rgba(255,255,230,0)");
        g.addColorStop(0.5, `rgba(255,255,230,${0.05 + wind * 0.05})`);
        g.addColorStop(1, "rgba(255,255,230,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 14, b.minY, 28, b.maxY - b.minY);
      }
      ctx.restore();
    }
  }

  private drawZone(ctx: CanvasRenderingContext2D, zn: Zone): void {
    const cam = this.camera;
    const view = cam.view(20);
    if (zn.x < view.minX || zn.x > view.maxX || zn.y < view.minY || zn.y > view.maxY) return;
    const col = ZONE_COLORS[zn.type] ?? "#fff";
    ctx.save();
    ctx.translate(zn.x, zn.y);
    ctx.rotate(zn.rot);
    ctx.globalAlpha = 0.16 + 0.06 * Math.sin(this.time * 2.5);
    ctx.fillStyle = col;
    ctx.fillRect(-zn.w / 2, -zn.h / 2, zn.w, zn.h);
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.2;
    ctx.setLineDash([1, 0.8]);
    ctx.strokeRect(-zn.w / 2, -zn.h / 2, zn.w, zn.h);
    ctx.setLineDash([]);
    ctx.restore();
  }

  private cloudShadows(ctx: CanvasRenderingContext2D, view: { minX: number; minY: number; maxX: number; maxY: number }): void {
    const w = this.world.weather;
    if (w.cloud < 0.25) return;
    const t = this.time;
    const seed = this.world.seed;
    const dx = Math.cos(w.windDir) * t * 3;
    const dy = Math.sin(w.windDir) * t * 3;
    const cell = 160;
    const a = (w.cloud - 0.2) * 0.2;
    for (let gy = Math.floor((view.minY - dy) / cell) - 1; gy <= Math.floor((view.maxY - dy) / cell) + 1; gy++)
      for (let gx = Math.floor((view.minX - dx) / cell) - 1; gx <= Math.floor((view.maxX - dx) / cell) + 1; gx++) {
        if (hash2(gx, gy, seed + 900) > w.cloud) continue;
        const x = gx * cell + hash2(gx, gy, seed + 901) * cell + dx;
        const y = gy * cell + hash2(gx, gy, seed + 902) * cell + dy;
        const r = 50 + hash2(gx, gy, seed + 903) * 70;
        const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
        g.addColorStop(0, `rgba(20,30,40,${a})`);
        g.addColorStop(1, "rgba(20,30,40,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
  }

  private labels(ctx: CanvasRenderingContext2D): void {
    const cam = this.camera;
    const z = cam.zoom;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = (x: number, y: number, text: string, size: number, color = "#fff") => {
      const s = cam.worldToScreen(x, y);
      if (s.x < -100 || s.x > cam.w + 100 || s.y < -30 || s.y > cam.h + 30) return;
      ctx.font = `600 ${size}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(20,25,15,0.7)";
      ctx.strokeText(text, s.x, s.y);
      ctx.fillStyle = color;
      ctx.fillText(text, s.x, s.y);
    };
    if (z < 4.5) {
      for (const p of this.world.map.places) label(p.x, p.y - 30, p.name, 13, "#fff6d8");
    }
    if (z < 3.2) {
      for (const f of this.world.fields) {
        const c = f.bounds;
        const own = f.owner === "player" ? "#ffe17a" : f.owner === null ? "#d6f5c8" : "#e6e6e6";
        label((c.minX + c.maxX) / 2, (c.minY + c.maxY) / 2, f.owner === null ? `${f.name} · à venda` : f.name, 11, own);
      }
    }
  }

  private workerTags(ctx: CanvasRenderingContext2D): void {
    const cam = this.camera;
    if (cam.zoom < 2.5) return;
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const w of this.world.workers) {
      if (w.owner !== "player") continue;
      const v = this.world.vehicle(w.vehicleId);
      const x = v ? v.x : w.x;
      const y = v ? v.y : w.y;
      if (w.state === "idle") continue;
      const s = cam.worldToScreen(x, y);
      if (s.x < -50 || s.x > cam.w + 50 || s.y < -50 || s.y > cam.h + 50) continue;
      const text = w.name.split(" ")[0] + (w.state === "paused" ? " (pausado)" : w.state === "waiting" ? " ⏸" : "");
      const tw = ctx.measureText(text).width + 10;
      const ty = s.y - 4.5 * cam.zoom - 14;
      ctx.fillStyle = "rgba(20,24,18,0.72)";
      ctx.fillRect(s.x - tw / 2, ty - 9, tw, 18);
      ctx.fillStyle = w.state === "waiting" ? "#ffcf5a" : "#bfe6ff";
      ctx.fillText(text, s.x, ty + 1);
    }
  }

  private lighting(ctx: CanvasRenderingContext2D, dl: number): void {
    const world = this.world;
    const dark = (1 - dl) * 0.66 + world.weather.cloud * 0.08 + world.weather.rain * 0.08;
    const h = world.time.minute / 60;
    // tom dourado de amanhecer/entardecer
    const golden = dl > 0 && dl < 1 ? Math.sin(dl * Math.PI) * 0.16 : 0;
    if (golden > 0.01) {
      ctx.fillStyle = h < 12 ? `rgba(255,180,120,${golden})` : `rgba(255,140,70,${golden})`;
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillRect(0, 0, this.camera.w, this.camera.h);
      ctx.globalCompositeOperation = "source-over";
    }
    if (dark < 0.03) return;
    const L = this.lctx;
    const lw = this.light.width;
    const lh = this.light.height;
    const k = lw / this.camera.w;
    L.globalCompositeOperation = "source-over";
    L.clearRect(0, 0, lw, lh);
    L.fillStyle = `rgba(8,14,34,${Math.min(0.8, dark)})`;
    L.fillRect(0, 0, lw, lh);
    L.globalCompositeOperation = "destination-out";
    const cam = this.camera;
    const glow = (x: number, y: number, r: number, a: number) => {
      const s = cam.worldToScreen(x, y);
      const rr = r * cam.zoom * k;
      if (s.x * k + rr < 0 || s.x * k - rr > lw || s.y * k + rr < 0 || s.y * k - rr > lh) return;
      const g = L.createRadialGradient(s.x * k, s.y * k, 0, s.x * k, s.y * k, rr);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      L.fillStyle = g;
      L.fillRect(s.x * k - rr, s.y * k - rr, rr * 2, rr * 2);
    };
    for (const v of world.vehicles) {
      if (!v.engineOn) continue;
      const c = Math.cos(v.heading);
      const s = Math.sin(v.heading);
      glow(v.x + c * (v.def.length / 2 + 7), v.y + s * (v.def.length / 2 + 7), 9, 0.95);
      glow(v.x + c * (v.def.length / 2 + 15), v.y + s * (v.def.length / 2 + 15), 9, 0.6);
      glow(v.x, v.y, 7, 0.85);
      if (v.def.combine || world.implement(v.implementId)?.lowered) glow(v.x - c * 6, v.y - s * 6, 9, 0.7);
    }
    for (const b of world.map.buildings) {
      if (b.def.kind === "farmhouse" || b.def.kind === "shed" || b.def.kind === "gasStation" || b.def.kind === "showroom" || b.def.kind === "office") glow(b.x, b.y + b.def.h / 2 + 2, 10, 0.75);
    }
    if (world.player.vehicleId === null) glow(world.player.x, world.player.y, 5, 0.6);
    ctx.drawImage(this.light, 0, 0, this.camera.w, this.camera.h);
  }

  private rain(ctx: CanvasRenderingContext2D, dt: number): void {
    const r = this.world.weather.rain;
    if (r < 0.02) return;
    const w = this.camera.w;
    const h = this.camera.h;
    ctx.fillStyle = `rgba(70,85,100,${r * 0.16})`;
    ctx.fillRect(0, 0, w, h);
    const n = Math.floor(600 * r * (this.mobile ? 0.5 : 1));
    const ang = Math.cos(this.world.weather.windDir) * 0.25;
    ctx.strokeStyle = "rgba(210,225,240,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const sp = this.drops[i * 3 + 2];
      let y = this.drops[i * 3 + 1] + dt * sp * 1.6;
      let x = this.drops[i * 3] + dt * sp * ang * 1.6;
      if (y > 1) {
        y -= 1;
        x = Math.random();
      }
      if (x > 1) x -= 1;
      if (x < 0) x += 1;
      this.drops[i * 3] = x;
      this.drops[i * 3 + 1] = y;
      const px = x * w;
      const py = y * h;
      ctx.moveTo(px, py);
      ctx.lineTo(px + ang * 14 * sp, py + 14 * sp);
    }
    ctx.stroke();
  }
}
