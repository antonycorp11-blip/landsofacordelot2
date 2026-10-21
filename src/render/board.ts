import { TAU, clamp } from "../core/math";
import { fmt } from "../core/format";
import { hash2, valueNoise } from "../core/rng";
import { BOARD, UNITS, sectorDef, type UnitId } from "../data/content";
import { BASE_X, BOARD_RIGHT, SPAWN_X, tileX, tileY, type RunState } from "../game/run";
import { alienTints, drawAlien, drawDrone, drawOrb, drawUnit, shade } from "./sprites";

export const WORLD = { x0: 0, y0: 70, x1: 1240, y1: 668 };

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  size: number;
  color: string;
  glow: boolean;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  t: number;
  color: string;
  size: number;
}

export interface BoardUi {
  selected: UnitId | "shovel" | null;
  hover: { row: number; col: number } | null;
  trail: { x: number; y: number; t: number }[];
  energyTarget: { x: number; y: number };
}

/** Campo de batalha em visão 3/4: tudo desenhado por código. */
export class BoardRenderer {
  private g: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private bgSector = -1;
  private scratch = document.createElement("canvas");
  private sg = this.scratch.getContext("2d")!;
  dpr = 1;
  scale = 1;
  ox = 0;
  oy = 0;
  w = 0;
  h = 0;
  time = 0;
  shake = 0;
  private parts: Particle[] = [];
  private texts: FloatText[] = [];
  private beams: { row: number; x0: number; t: number }[] = [];
  private zaps: { pts: { x: number; y: number }[]; t: number }[] = [];
  private booms: { x: number; y: number; r: number; t: number; color: string }[] = [];
  private flyOrbs: { sx: number; sy: number; t: number }[] = [];
  private stars: number[] = [];
  breachFlash = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.g = canvas.getContext("2d", { alpha: false })!;
    for (let i = 0; i < 140; i++) this.stars.push(Math.random(), Math.random(), Math.random());
  }

  /** Encaixa o mundo na área livre da tela (abaixo da bandeja de cartas). */
  resize(topInset: number, bottomInset: number): void {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    const ww = WORLD.x1 - WORLD.x0;
    const wh = WORLD.y1 - WORLD.y0;
    const availH = this.h - topInset - bottomInset;
    this.scale = Math.min(this.w / ww, availH / wh);
    this.ox = (this.w - ww * this.scale) / 2 - WORLD.x0 * this.scale;
    this.oy = topInset + (availH - wh * this.scale) / 2 - WORLD.y0 * this.scale;
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.ox) / this.scale, y: (sy - this.oy) / this.scale };
  }

  toScreen(x: number, y: number): { x: number; y: number } {
    return { x: x * this.scale + this.ox, y: y * this.scale + this.oy };
  }

  tileAt(x: number, y: number): { row: number; col: number } | null {
    const col = Math.floor((x - BOARD.left) / BOARD.tile);
    const row = Math.floor((y - BOARD.top) / BOARD.tile);
    if (col < 0 || row < 0 || col >= BOARD.cols || row >= BOARD.rows) return null;
    return { row, col };
  }

  private spark(x: number, y: number, n: number, color: string, speed = 160, grav = 300, size = 4, glow = false): void {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU;
      const sp = speed * (0.3 + Math.random() * 0.7);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - speed * 0.4, g: grav, life: 0.4 + Math.random() * 0.5, max: 0.9, size: size * (0.5 + Math.random()), color, glow });
    }
    if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700);
  }

  /** Converte eventos da simulação em efeitos. */
  consume(r: RunState): void {
    for (const ev of r.events) {
      switch (ev.type) {
        case "hit":
          this.spark(ev.x, ev.y, ev.crit ? 10 : 4, ev.color ?? "#fff", 140, 200, 3, true);
          if (ev.dmg >= 1 && ev.dmg < 1e6) this.texts.push({ x: ev.x + (Math.random() - 0.5) * 20, y: ev.y, text: fmt(ev.dmg), t: 0, color: ev.crit ? "#ffe14a" : "#ffffff", size: ev.crit ? 26 : 17 });
          break;
        case "death": {
          const goo = ev.alien === "crawler" ? "#5ac84a" : ev.alien === "runner" ? "#ff8a3a" : ev.alien === "armored" ? "#9a7ac8" : ev.alien === "swarm" ? "#ffd84a" : ev.alien === "jumper" ? "#4a9aff" : ev.alien === "spitter" ? "#b04ad8" : "#d83a3a";
          this.spark(ev.x, ev.y - 30, ev.boss ? 60 : 18, goo, ev.boss ? 320 : 200, 420, ev.boss ? 9 : 6);
          this.texts.push({ x: ev.x, y: ev.y - 60, text: `+${fmt(ev.scrap)} ⚙`, t: 0, color: "#9fe8ff", size: 18 });
          if (ev.boss) this.shake = 0.6;
          break;
        }
        case "boom":
          this.booms.push({ x: ev.x, y: ev.y, r: ev.r, t: 0, color: ev.color });
          this.spark(ev.x, ev.y - 20, 30, ev.color, 280, 380, 6, true);
          this.shake = Math.max(this.shake, 0.3);
          break;
        case "laser":
          this.beams.push({ row: ev.row, x0: ev.x0, t: 0 });
          break;
        case "zap":
          this.zaps.push({ pts: ev.pts, t: 0 });
          break;
        case "orb": {
          const s = this.toScreen(ev.x, ev.y);
          this.flyOrbs.push({ sx: s.x, sy: s.y, t: 0 });
          break;
        }
        case "breach":
          this.shake = 0.7;
          this.breachFlash = 1;
          break;
        case "drone":
          this.shake = Math.max(this.shake, 0.25);
          break;
        case "place":
          this.spark(ev.x, ev.y - 20, 14, "#9fe8ff", 140, 200, 4, true);
          break;
        case "unitDown":
          this.spark(ev.x, ev.y - 30, 20, "#c8ccd8", 200, 400, 5);
          this.shake = Math.max(this.shake, 0.2);
          break;
      }
    }
    r.events.length = 0;
  }

  private buildBackground(sector: number): HTMLCanvasElement {
    const sd = sectorDef(sector);
    const K = 2;
    const W = WORLD.x1 - WORLD.x0;
    const H = WORLD.y1 - WORLD.y0 + 140;
    const c = document.createElement("canvas");
    c.width = W * K;
    c.height = H * K;
    const g = c.getContext("2d")!;
    g.scale(K, K);
    g.translate(-WORLD.x0, -(WORLD.y0 - 140));
    // céu espacial
    const sky = g.createLinearGradient(0, WORLD.y0 - 140, 0, BOARD.top + 40);
    sky.addColorStop(0, "#05060f");
    sky.addColorStop(1, shade("#1a2040", 1));
    g.fillStyle = sky;
    g.fillRect(WORLD.x0, WORLD.y0 - 140, W, H);
    for (let i = 0; i < 160; i++) {
      const x = hash2(i, 1, sector) * W;
      const y = WORLD.y0 - 140 + hash2(i, 2, sector) * 190;
      const s = hash2(i, 3, sector) * 1.6 + 0.3;
      g.fillStyle = `rgba(255,255,255,${0.3 + hash2(i, 4, sector) * 0.6})`;
      g.fillRect(x, y, s, s);
    }
    // planeta no horizonte
    const pg = g.createRadialGradient(980, -40, 40, 1000, 40, 420);
    pg.addColorStop(0, shade(sd.glow, 0.8));
    pg.addColorStop(0.5, shade(sd.glow, 0.35));
    pg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = pg;
    g.beginPath();
    g.arc(1000, 320, 420, Math.PI * 1.05, Math.PI * 1.95);
    g.fill();
    // chão: placas metálicas em xadrez com bisel e rebites
    const [fr, fg, fb] = sd.floor;
    g.fillStyle = `rgb(${fr * 0.6},${fg * 0.6},${fb * 0.6})`;
    g.fillRect(WORLD.x0, BOARD.top - 16, W, H);
    for (let row = 0; row < BOARD.rows; row++)
      for (let col = -2; col < BOARD.cols + 2; col++) {
        const x = BOARD.left + col * BOARD.tile;
        const y = BOARD.top + row * BOARD.tile;
        const inside = col >= 0 && col < BOARD.cols;
        const alt = (row + col) % 2 === 0 ? 1.12 : 0.92;
        const k = inside ? alt : 0.62;
        const tg = g.createLinearGradient(0, y, 0, y + BOARD.tile);
        tg.addColorStop(0, `rgb(${fr * k * 1.25},${fg * k * 1.25},${fb * k * 1.25})`);
        tg.addColorStop(1, `rgb(${fr * k * 0.85},${fg * k * 0.85},${fb * k * 0.85})`);
        g.fillStyle = tg;
        g.fillRect(x + 2, y + 2, BOARD.tile - 4, BOARD.tile - 4);
        // bisel
        g.strokeStyle = "rgba(255,255,255,0.08)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x + 3, y + BOARD.tile - 3);
        g.lineTo(x + 3, y + 3);
        g.lineTo(x + BOARD.tile - 3, y + 3);
        g.stroke();
        g.strokeStyle = "rgba(0,0,0,0.35)";
        g.beginPath();
        g.moveTo(x + BOARD.tile - 3, y + 3);
        g.lineTo(x + BOARD.tile - 3, y + BOARD.tile - 3);
        g.lineTo(x + 3, y + BOARD.tile - 3);
        g.stroke();
        // rebites
        g.fillStyle = "rgba(0,0,0,0.35)";
        for (const [rx, ry] of [
          [10, 10],
          [BOARD.tile - 10, 10],
          [10, BOARD.tile - 10],
          [BOARD.tile - 10, BOARD.tile - 10],
        ]) {
          g.beginPath();
          g.arc(x + rx, y + ry, 2.4, 0, TAU);
          g.fill();
        }
        // desgaste por ruído
        for (let n = 0; n < 14; n++) {
          const px = x + hash2(col * 31 + n, row, sector) * BOARD.tile;
          const py = y + hash2(row * 17 + n, col, sector) * BOARD.tile;
          g.fillStyle = `rgba(0,0,0,${0.05 + hash2(n, col + row, sector) * 0.08})`;
          g.fillRect(px, py, 3 + hash2(n, 9, sector) * 8, 1.5);
        }
        if (inside && hash2(col, row, sector + 5) > 0.82) {
          g.strokeStyle = "rgba(0,0,0,0.25)";
          g.lineWidth = 1;
          g.beginPath();
          for (let k2 = 0; k2 < 4; k2++) {
            const px = x + 20 + k2 * 18;
            const py = y + 30 + valueNoise(k2, row, sector) * 40;
            k2 ? g.lineTo(px, py) : g.moveTo(px, py);
          }
          g.stroke();
        }
      }
    // linhas das fileiras
    g.strokeStyle = sd.glow;
    g.globalAlpha = 0.18;
    g.lineWidth = 2;
    for (let row = 0; row <= BOARD.rows; row++) {
      g.beginPath();
      g.moveTo(BOARD.left, BOARD.top + row * BOARD.tile);
      g.lineTo(BOARD_RIGHT, BOARD.top + row * BOARD.tile);
      g.stroke();
    }
    g.globalAlpha = 1;
    // gosma alienígena à direita
    for (let i = 0; i < 90; i++) {
      const x = BOARD_RIGHT + 10 + hash2(i, 5, sector) * 140;
      const y = BOARD.top + hash2(i, 6, sector) * BOARD.rows * BOARD.tile;
      const s = 8 + hash2(i, 7, sector) * 26;
      g.fillStyle = `rgba(${90 + hash2(i, 8, sector) * 60},40,${120 + hash2(i, 9, sector) * 60},0.35)`;
      g.beginPath();
      g.ellipse(x, y, s, s * 0.6, 0, 0, TAU);
      g.fill();
    }
    // muralha da base
    const wx = BOARD.left - 70;
    const wg = g.createLinearGradient(wx, 0, wx + 60, 0);
    wg.addColorStop(0, "#2a3040");
    wg.addColorStop(0.6, "#5a6478");
    wg.addColorStop(1, "#3a4252");
    g.fillStyle = wg;
    g.fillRect(wx, BOARD.top - 60, 60, BOARD.rows * BOARD.tile + 80);
    g.fillStyle = "#1a1e28";
    g.fillRect(wx - 70, BOARD.top - 60, 70, BOARD.rows * BOARD.tile + 80);
    for (let y = BOARD.top - 60; y < BOARD.top + BOARD.rows * BOARD.tile + 20; y += 26) {
      g.fillStyle = "#ffb020";
      g.beginPath();
      g.moveTo(wx + 44, y);
      g.lineTo(wx + 56, y);
      g.lineTo(wx + 56, y + 12);
      g.closePath();
      g.fill();
    }
    for (let row = 0; row < BOARD.rows; row++) {
      const y = tileY(row);
      g.fillStyle = "#12161e";
      g.fillRect(wx + 6, y - 46, 40, 50);
      g.strokeStyle = "#6a748a";
      g.lineWidth = 2;
      g.strokeRect(wx + 6, y - 46, 40, 50);
    }
    return c;
  }

  /** Desenha um sprite com sobreposições de cor só sobre ele (canvas auxiliar). */
  private tinted(x: number, y: number, tints: string[], draw: (g: CanvasRenderingContext2D) => void): void {
    const g = this.g;
    if (!tints.length) {
      g.save();
      g.translate(x, y);
      draw(g);
      g.restore();
      return;
    }
    const S = 300;
    const k = this.scale * this.dpr;
    const px = Math.ceil(S * k);
    if (this.scratch.width < px) this.scratch.width = this.scratch.height = px;
    const sg = this.sg;
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.clearRect(0, 0, px, px);
    sg.setTransform(k, 0, 0, k, (S / 2) * k, S * 0.8 * k);
    draw(sg);
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.globalCompositeOperation = "source-atop";
    for (const t of tints) {
      sg.fillStyle = t;
      sg.fillRect(0, 0, px, px);
    }
    sg.globalCompositeOperation = "source-over";
    g.drawImage(this.scratch, 0, 0, px, px, x - S / 2, y - S * 0.8, S, S);
  }

  render(r: RunState, ui: BoardUi, dt: number): void {
    this.time += dt;
    const t = this.time;
    const g = this.g;
    if (this.bgSector !== r.sector) {
      this.bg = this.buildBackground(r.sector);
      this.bgSector = r.sector;
    }
    this.shake = Math.max(0, this.shake - dt);
    this.breachFlash = Math.max(0, this.breachFlash - dt * 1.5);
    const sx = (Math.random() - 0.5) * this.shake * 14;
    const sy = (Math.random() - 0.5) * this.shake * 14;
    const d = this.dpr;
    g.setTransform(d, 0, 0, d, 0, 0);
    g.fillStyle = "#05060f";
    g.fillRect(0, 0, this.w, this.h);
    g.setTransform(d * this.scale, 0, 0, d * this.scale, d * (this.ox + sx), d * (this.oy + sy));
    if (this.bg) g.drawImage(this.bg, WORLD.x0, WORLD.y0 - 140, WORLD.x1 - WORLD.x0, WORLD.y1 - WORLD.y0 + 140);
    // estrelas piscando
    for (let i = 0; i < this.stars.length; i += 3) {
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + this.stars[i + 2] * 3) + i);
      g.fillStyle = `rgba(255,255,255,${tw * 0.6})`;
      g.fillRect(WORLD.x0 + this.stars[i] * (WORLD.x1 - WORLD.x0), WORLD.y0 - 140 + this.stars[i + 1] * 180, 1.5, 1.5);
    }
    const sd = sectorDef(r.sector);
    // escudo da base
    const shieldA = 0.25 + Math.sin(t * 3) * 0.08 + this.breachFlash * 0.5;
    const sh = g.createLinearGradient(BOARD.left - 14, 0, BOARD.left + 6, 0);
    sh.addColorStop(0, "rgba(0,0,0,0)");
    sh.addColorStop(1, this.breachFlash > 0 ? `rgba(255,70,60,${shieldA})` : `rgba(90,200,255,${shieldA})`);
    g.fillStyle = sh;
    g.fillRect(BOARD.left - 14, BOARD.top - 10, 20, BOARD.rows * BOARD.tile + 20);
    // portal alienígena
    for (let k = 0; k < 3; k++) {
      const pg = g.createRadialGradient(SPAWN_X + 30, BOARD.top + 250, 10, SPAWN_X + 30, BOARD.top + 250, 300 - k * 40);
      pg.addColorStop(0, `rgba(180,60,255,${0.14 + Math.sin(t * 2 + k) * 0.04})`);
      pg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = pg;
      g.fillRect(BOARD_RIGHT, BOARD.top - 40, 260, BOARD.rows * BOARD.tile + 80);
    }

    // pré-visualização de posicionamento
    if (ui.hover && ui.selected) {
      const { row, col } = ui.hover;
      const x = BOARD.left + col * BOARD.tile;
      const y = BOARD.top + row * BOARD.tile;
      const occupied = !!r.grid[row][col];
      const ok = ui.selected === "shovel" ? occupied : !occupied;
      g.fillStyle = ok ? "rgba(120,255,180,0.18)" : "rgba(255,90,90,0.2)";
      g.fillRect(x + 3, y + 3, BOARD.tile - 6, BOARD.tile - 6);
      g.strokeStyle = ok ? "rgba(120,255,180,0.8)" : "rgba(255,90,90,0.8)";
      g.lineWidth = 3;
      g.strokeRect(x + 4, y + 4, BOARD.tile - 8, BOARD.tile - 8);
      if (ui.selected !== "shovel" && ok) {
        g.globalAlpha = 0.5;
        g.save();
        g.translate(tileX(col), tileY(row));
        drawUnit(g, ui.selected, t, 0, 0.5, 0, 1);
        g.restore();
        g.globalAlpha = 1;
        // linha de alcance para atiradores
        const def = UNITS[ui.selected];
        if (def.damage > 0 && def.id !== "mine") {
          g.strokeStyle = "rgba(160,230,255,0.25)";
          g.setLineDash([8, 8]);
          g.beginPath();
          g.moveTo(tileX(col) + 30, tileY(row) - 40);
          g.lineTo(BOARD_RIGHT, tileY(row) - 40);
          g.stroke();
          g.setLineDash([]);
        }
      }
    }

    // entidades por fileira (de trás para frente)
    for (let row = 0; row < BOARD.rows; row++) {
      const dr = r.drones[row];
      if (dr.state !== "used") {
        g.save();
        g.translate(dr.state === "running" ? dr.x : BASE_X + 6, tileY(row) - 4);
        drawDrone(g, t + row, dr.state === "running");
        g.restore();
      }
      for (const u of r.grid[row]) {
        if (!u) continue;
        const charge = u.def.rate > 0 ? clamp(1 - u.cd / u.def.rate, 0, 1) : 0;
        this.tinted(u.x, u.y, u.flash > 0 ? [`rgba(255,80,80,${Math.min(0.55, u.flash * 5)})`] : [], (gg) => drawUnit(gg, u.def.id, u.anim, u.recoil, charge, u.flash, u.hp / u.maxHp, u.armed));
        if (u.hp < u.maxHp && u.def.id !== "mine") {
          g.fillStyle = "rgba(0,0,0,0.6)";
          g.fillRect(u.x - 26, u.y + 6, 52, 6);
          g.fillStyle = u.hp / u.maxHp > 0.4 ? "#6aff9a" : "#ff6a5a";
          g.fillRect(u.x - 26, u.y + 6, 52 * clamp(u.hp / u.maxHp, 0, 1), 6);
        }
      }
      const rowAliens = r.aliens.filter((a) => a.row === row).sort((p, q) => q.x - p.x);
      for (const a of rowAliens) {
        const tints = alienTints(a.anim, { flash: a.hitFlash, slow: a.slowT > 0, burn: a.burnT > 0 });
        this.tinted(a.x, a.y, tints, (gg) => drawAlien(gg, a.def.id, a.anim, { flash: a.hitFlash, slow: a.slowT > 0, burn: a.burnT > 0, shellFrac: a.maxShell ? a.shell / a.maxShell : 0, biting: a.biting, scale: a.scale, jump: a.jumpT }));
        if (a.hp < a.maxHp || a.shell < a.maxShell || a.boss) {
          const w = a.boss ? 110 : 54;
          const by = a.y - a.def.radius * a.scale * 2.6 - 16;
          g.fillStyle = "rgba(0,0,0,0.65)";
          g.fillRect(a.x - w / 2, by, w, a.boss ? 9 : 6);
          g.fillStyle = a.boss ? "#ff4a6a" : "#ff8a5a";
          g.fillRect(a.x - w / 2, by, w * clamp(a.hp / a.maxHp, 0, 1), a.boss ? 9 : 6);
          if (a.maxShell > 0 && a.shell > 0) {
            g.fillStyle = "#c8ccd8";
            g.fillRect(a.x - w / 2, by - 5, w * (a.shell / a.maxShell), 4);
          }
        }
      }
    }

    // projéteis
    g.globalCompositeOperation = "lighter";
    for (const b of r.bolts) {
      if (b.kind === "missile") {
        g.fillStyle = "#ffb020";
        g.beginPath();
        g.arc(b.x, b.y, 8, 0, TAU);
        g.fill();
        this.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 30, vy: 20, g: -40, life: 0.5, max: 0.5, size: 7, color: "#ff8a3a", glow: true });
        continue;
      }
      const col = b.kind === "cryo" ? "160,235,255" : b.kind === "acid" ? "140,255,90" : "80,220,255";
      const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, 18);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.35, `rgba(${col},0.9)`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(b.x, b.y, 22, 10, 0, 0, TAU);
      g.fill();
      g.fillStyle = `rgba(${col},0.35)`;
      g.fillRect(b.x - (b.vx > 0 ? 40 : -10), b.y - 3, 30, 6);
    }
    // lasers
    this.beams = this.beams.filter((bm) => (bm.t += dt) < 0.25);
    for (const bm of this.beams) {
      const y = tileY(bm.row) - 42;
      const a = 1 - bm.t / 0.25;
      g.fillStyle = `rgba(255,74,138,${a * 0.5})`;
      g.fillRect(bm.x0, y - 12 * a, SPAWN_X - bm.x0, 24 * a);
      g.fillStyle = `rgba(255,230,240,${a})`;
      g.fillRect(bm.x0, y - 3 * a, SPAWN_X - bm.x0, 6 * a);
    }
    // raios tesla
    this.zaps = this.zaps.filter((z) => (z.t += dt) < 0.2);
    for (const z of this.zaps) {
      g.strokeStyle = `rgba(200,160,255,${1 - z.t / 0.2})`;
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i < z.pts.length - 1; i++) {
        const p = z.pts[i];
        const q = z.pts[i + 1];
        g.moveTo(p.x, p.y);
        for (let k = 1; k <= 6; k++) {
          const f = k / 6;
          g.lineTo(p.x + (q.x - p.x) * f + (Math.random() - 0.5) * 18, p.y + (q.y - p.y) * f + (Math.random() - 0.5) * 18);
        }
      }
      g.stroke();
    }
    // explosões
    this.booms = this.booms.filter((b) => (b.t += dt) < 0.5);
    for (const b of this.booms) {
      const k = b.t / 0.5;
      const gr = g.createRadialGradient(b.x, b.y - 20, 0, b.x, b.y - 20, b.r * (0.4 + k));
      gr.addColorStop(0, `rgba(255,250,220,${1 - k})`);
      gr.addColorStop(0.4, `rgba(255,170,60,${(1 - k) * 0.8})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(b.x, b.y - 20, b.r * (0.4 + k), 0, TAU);
      g.fill();
    }
    g.globalCompositeOperation = "source-over";

    // partículas
    for (const p of this.parts) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = clamp(p.life / p.max, 0, 1);
      g.globalAlpha = a;
      if (p.glow) g.globalCompositeOperation = "lighter";
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, TAU);
      g.fill();
      g.globalCompositeOperation = "source-over";
    }
    g.globalAlpha = 1;
    this.parts = this.parts.filter((p) => p.life > 0);

    // células de energia
    for (const o of r.orbs) {
      g.save();
      g.translate(o.x, o.y + Math.sin(o.age * 3) * 3);
      drawOrb(g, o.age, o.life < 2 ? 0.4 + 0.6 * Math.abs(Math.sin(o.age * 8)) : 1);
      g.restore();
    }

    // números flutuantes
    g.textAlign = "center";
    g.textBaseline = "middle";
    this.texts = this.texts.filter((x) => (x.t += dt) < 0.9);
    for (const x of this.texts) {
      const k = x.t / 0.9;
      g.globalAlpha = 1 - k * k;
      g.font = `900 ${x.size}px system-ui, sans-serif`;
      g.lineWidth = 4;
      g.strokeStyle = "rgba(0,0,0,0.7)";
      const y = x.y - k * 40 - (x.t < 0.1 ? 0 : 0);
      g.strokeText(x.text, x.x, y);
      g.fillStyle = x.color;
      g.fillText(x.text, x.x, y);
    }
    g.globalAlpha = 1;
    if (this.texts.length > 80) this.texts.splice(0, this.texts.length - 80);

    // rastro do corte
    const trail = ui.trail;
    if (trail.length > 1) {
      g.globalCompositeOperation = "lighter";
      g.lineCap = "round";
      g.lineJoin = "round";
      const hot = r.overheated ? "255,90,70" : r.heat > 70 ? "255,190,90" : "120,230,255";
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i];
        const p = trail[i - 1];
        const age = clamp(1 - (t - a.t) / 0.18, 0, 1);
        g.strokeStyle = `rgba(${hot},${age * 0.5})`;
        g.lineWidth = 18 * age * r.stats.bladeWidth;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(a.x, a.y);
        g.stroke();
        g.strokeStyle = `rgba(255,255,255,${age})`;
        g.lineWidth = 4 * age;
        g.stroke();
      }
      g.globalCompositeOperation = "source-over";
    }

    // tela: células voando até o contador de energia
    g.setTransform(d, 0, 0, d, 0, 0);
    this.flyOrbs = this.flyOrbs.filter((f) => (f.t += dt) < 0.55);
    for (const f of this.flyOrbs) {
      const k = f.t / 0.55;
      const e = k * k * (3 - 2 * k);
      const x = f.sx + (ui.energyTarget.x - f.sx) * e;
      const y = f.sy + (ui.energyTarget.y - f.sy) * e - Math.sin(k * Math.PI) * 60;
      g.save();
      g.translate(x, y);
      g.scale(0.7 - k * 0.3, 0.7 - k * 0.3);
      drawOrb(g, t, 1);
      g.restore();
    }
    if (this.breachFlash > 0) {
      g.fillStyle = `rgba(255,40,40,${this.breachFlash * 0.25})`;
      g.fillRect(0, 0, this.w, this.h);
    }
    void sd;
  }
}
