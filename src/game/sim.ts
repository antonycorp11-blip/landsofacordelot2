import { TAU, clamp } from "../core/math";
import { Rng } from "../core/rng";
import { BAL, ENEMIES, SATS, SAT_MAX_LVL, type EnemyId, type SatId } from "../data/content";
import type { Stats } from "./profile";

export type Cause = "horizon" | "impact" | "sat" | "pulse";

export interface Enemy {
  id: number;
  type: EnemyId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  r: number;
  mass: number;
  gres: number;
  speed: number;
  steer: number;
  dmg: number;
  trail: number[];
  slow: number;
  age: number;
  spawnT: number;
  flash: number;
  captured: boolean;
  dead: boolean;
}

export interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  spin: number;
  seed: number;
}

export interface Frag {
  x: number;
  y: number;
  vx: number;
  vy: number;
  v: number;
  life: number;
}

export interface Slug {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
}

export interface Sat {
  type: SatId;
  lvl: number;
  invested: number;
  cd: number;
  x: number;
  y: number;
  /** alvo atual (laser) */
  tx: number;
  ty: number;
  firing: boolean;
  pulse: number;
  acc: number;
}

export interface Ring {
  r: number;
  angle: number;
  spin: number;
  slots: (Sat | null)[];
}

export type SimEvent =
  | { k: "impact"; x: number; y: number; power: number }
  | { k: "kill"; x: number; y: number; type: EnemyId; cause: Cause; combo: number }
  | { k: "dmg"; x: number; y: number; n: number; big: boolean }
  | { k: "core"; x: number; y: number; dmg: number }
  | { k: "pulse"; x: number; y: number; r: number }
  | { k: "boom"; x: number; y: number; r: number }
  | { k: "pickup"; x: number; y: number; v: number }
  | { k: "wave"; n: number; boss: boolean }
  | { k: "waveClear"; n: number; matter: number; frags: number }
  | { k: "shot"; x: number; y: number }
  | { k: "swallow"; x: number; y: number }
  | { k: "shield" }
  | { k: "over" };

export type Phase = "tutorial" | "break" | "wave";

interface Spawn {
  t: number;
  type: EnemyId;
  ang: number;
}

export function waveHp(n: number): number {
  return Math.pow(1.12, n - 1) * (1 + 0.015 * (n - 1));
}

export function waveBudget(n: number): number {
  return 4 + 2.3 * n + 0.07 * n * n;
}

export function satStats(type: SatId, lvl: number, st: Stats) {
  const k = lvl - 1;
  switch (type) {
    case "laser":
      return { range: 115 + 8 * k, dps: 13 * (1 + 0.45 * k) * st.satDmg };
    case "mine":
      return { trigger: 18, radius: 52 + 6 * k, dmg: 60 * (1 + 0.5 * k) * st.satDmg, rearm: (5 - 0.6 * k) / st.satRate };
    case "cannon":
      return { range: 320, cd: 1.5 / (1 + 0.12 * k) / st.satRate, dmg: 22 * (1 + 0.5 * k) * st.satDmg, speed: 330 };
    case "deflector":
      return { radius: 20 + 3 * k, mul: (1 + 0.35 * k) * st.satDmg };
    case "stasis":
      return { radius: 75 + 8 * k, slow: 0.35 + 0.06 * k };
    case "collector":
      return { rate: 0.45 * (1 + 0.6 * k), pull: 95 + 10 * k };
  }
}

const TRAIL = 10;

export class Run {
  readonly rng: Rng;
  t = 0;
  hole = { x: 0, y: -120, vx: 0, vy: 0, tx: 0, ty: -120, strong: false, wantStrong: false, energy: 100, exhausted: false, pulseCd: 0, H: BAL.holeH as number };
  core = { hp: 100, maxHp: 100, shield: 0, shieldUsed: false, flash: 0 };
  enemies: Enemy[] = [];
  asteroids: Asteroid[] = [];
  frags: Frag[] = [];
  slugs: Slug[] = [];
  rings: Ring[] = [];
  fragments: number;
  matter = 0;
  banked = 0;
  kills = 0;
  impactKills = 0;
  combo = 0;
  bestCombo = 0;
  lastKillT = -99;
  wave: number;
  phase: Phase;
  breakT = 0;
  spawnQ: Spawn[] = [];
  waveT = 0;
  waveEnd = 0;
  view = { hw: 480, hh: 270 };
  events: SimEvent[] = [];
  over = false;
  spinDir = 0;
  selRing = 0;
  collected = 0;
  pulses = 0;
  strongTime = 0;
  private nextId = 1;
  private stepN = 0;

  constructor(
    readonly st: Stats,
    seed: number,
    view: { hw: number; hh: number },
    tutorial = false,
  ) {
    this.rng = new Rng(seed);
    this.view = { ...view };
    this.hole.energy = st.energyMax;
    this.hole.H = BAL.holeH * st.horizon;
    this.core.hp = this.core.maxHp = st.coreHp;
    this.fragments = st.startFrags;
    this.wave = st.startWave - 1;
    this.phase = tutorial ? "tutorial" : "break";
    this.breakT = 3;
    for (let i = 0; i < 3; i++) {
      const n = BAL.ringSlots[i] + st.extraSlots;
      this.rings.push({ r: BAL.ringR[i], angle: i * 0.4, spin: BAL.ringSpin[i], slots: new Array(n).fill(null) });
    }
    for (let i = 0; i < st.asteroids; i++) {
      const a = (i / st.asteroids) * TAU + this.rng.range(-0.4, 0.4) + 0.5;
      const r = this.rng.range(12, 19);
      const d = this.asteroidMinR() + this.rng.range(15, 60);
      const ast = { x: Math.cos(a) * d, y: Math.sin(a) * d, vx: 0, vy: 0, r, rot: this.rng.range(0, TAU), spin: this.rng.range(-0.6, 0.6), seed: Math.floor(this.rng.next() * 1e6) };
      this.asteroids.push(ast);
    }
    this.setView(view.hw, view.hh);
  }

  setView(hw: number, hh: number): void {
    this.view.hw = hw;
    this.view.hh = hh;
    for (const a of this.asteroids) {
      a.x = clamp(a.x, -hw + a.r, hw - a.r);
      a.y = clamp(a.y, -hh + a.r, hh - a.r);
    }
  }

  asteroidMinR(): number {
    return BAL.ringR[this.st.rings - 1] + 32;
  }

  // ---------------------------------------------------------------- entrada
  setTarget(x: number, y: number): void {
    this.hole.tx = clamp(x, -this.view.hw, this.view.hw);
    this.hole.ty = clamp(y, -this.view.hh, this.view.hh);
  }

  setStrong(on: boolean): void {
    this.hole.wantStrong = on;
  }

  pulse(): boolean {
    const h = this.hole;
    if (h.pulseCd > 0 || this.over) return false;
    h.pulseCd = this.st.pulseCd;
    const R = BAL.pulseR * Math.sqrt(this.st.pulseForce);
    const F = BAL.pulseForce * this.st.pulseForce;
    const push = (o: { x: number; y: number; vx: number; vy: number }, mul: number) => {
      const dx = o.x - h.x;
      const dy = o.y - h.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > R) return false;
      const f = F * (1 - (d / R) * 0.6) * mul;
      o.vx += (dx / d) * f;
      o.vy += (dy / d) * f;
      return true;
    };
    for (const e of this.enemies) {
      if (push(e, 1 / Math.sqrt(e.mass))) {
        e.captured = false;
        if (Math.hypot(e.x - h.x, e.y - h.y) < h.H * 2.2) this.hurt(e, 15 * this.st.pulseForce * waveHp(this.wave) ** 0.5, "pulse", true);
      }
    }
    for (const a of this.asteroids) push(a, 0.35);
    this.pulses++;
    this.events.push({ k: "pulse", x: h.x, y: h.y, r: R });
    return true;
  }

  setSpin(dir: number): void {
    this.spinDir = dir;
  }

  selectRing(i: number): void {
    if (i >= 0 && i < this.st.rings) this.selRing = i;
  }

  skipBreak(): void {
    if (this.phase === "break") this.breakT = 0;
  }

  beginWaves(): void {
    if (this.phase === "tutorial") {
      this.phase = "break";
      this.breakT = 4;
    }
  }

  // ---------------------------------------------------------------- construção
  slotPos(ri: number, i: number): { x: number; y: number } {
    const ring = this.rings[ri];
    const a = ring.angle + (i * TAU) / ring.slots.length;
    return { x: Math.cos(a) * ring.r, y: Math.sin(a) * ring.r };
  }

  satCount(type: SatId): number {
    let n = 0;
    for (const r of this.rings) for (const s of r.slots) if (s?.type === type) n++;
    return n;
  }

  buyCost(type: SatId): number {
    return Math.round(SATS[type].cost * this.st.satCost * (1 + 0.2 * this.satCount(type)));
  }

  upgradeCost(s: Sat): number {
    return Math.round(SATS[s.type].cost * this.st.satCost * 0.9 * Math.pow(1.65, s.lvl - 1));
  }

  sellValue(s: Sat): number {
    return Math.floor(s.invested * 0.6);
  }

  buy(ri: number, i: number, type: SatId): boolean {
    if (ri >= this.st.rings || !this.st.unlocked.includes(type)) return false;
    const ring = this.rings[ri];
    if (!ring || ring.slots[i] !== null || i < 0 || i >= ring.slots.length) return false;
    const c = this.buyCost(type);
    if (this.fragments < c) return false;
    this.fragments -= c;
    const p = this.slotPos(ri, i);
    ring.slots[i] = { type, lvl: 1, invested: c, cd: 0.5, x: p.x, y: p.y, tx: 0, ty: 0, firing: false, pulse: 0, acc: 0 };
    return true;
  }

  upgrade(ri: number, i: number): boolean {
    const s = this.rings[ri]?.slots[i];
    if (!s || s.lvl >= SAT_MAX_LVL) return false;
    const c = this.upgradeCost(s);
    if (this.fragments < c) return false;
    this.fragments -= c;
    s.invested += c;
    s.lvl++;
    return true;
  }

  sell(ri: number, i: number): boolean {
    const s = this.rings[ri]?.slots[i];
    if (!s) return false;
    this.fragments += this.sellValue(s);
    this.rings[ri].slots[i] = null;
    return true;
  }

  // ---------------------------------------------------------------- inimigos
  spawn(type: EnemyId, x: number, y: number, vx = 0, vy = 0): Enemy {
    const d = ENEMIES[type];
    const hp = d.hp * waveHp(Math.max(1, this.wave));
    const sp = 1 + Math.min(0.4, 0.01 * Math.max(0, this.wave - 1));
    const e: Enemy = {
      id: this.nextId++,
      type,
      x,
      y,
      vx,
      vy,
      hp,
      maxHp: hp,
      r: d.r,
      mass: d.mass,
      gres: d.gres,
      speed: d.speed * sp,
      steer: d.steer,
      dmg: d.dmg * (1 + 0.03 * Math.max(0, this.wave - 1)),
      trail: [],
      slow: 0,
      age: 0,
      spawnT: 0,
      flash: 0,
      captured: false,
      dead: false,
    };
    if (type === "comet") {
      const dd = Math.hypot(x, y) || 1;
      e.vx = (-x / dd) * e.speed;
      e.vy = (-y / dd) * e.speed;
    }
    this.enemies.push(e);
    return e;
  }

  edgePoint(ang: number, margin = 24): { x: number; y: number } {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const t = Math.min((this.view.hw + margin) / Math.max(1e-6, Math.abs(c)), (this.view.hh + margin) / Math.max(1e-6, Math.abs(s)));
    return { x: c * t, y: s * t };
  }

  private startWave(): void {
    this.wave++;
    this.phase = "wave";
    this.waveT = 0;
    const n = this.wave;
    const pool = Object.values(ENEMIES).filter((d) => d.weight > 0 && d.fromWave <= n);
    const tw = pool.reduce((s, d) => s + d.weight, 0);
    let budget = waveBudget(n);
    const list: EnemyId[][] = [];
    while (budget > 0) {
      let r = this.rng.next() * tw;
      let d = pool[0];
      for (const p of pool) {
        r -= p.weight;
        if (r <= 0) {
          d = p;
          break;
        }
      }
      if (d.id === "drone") {
        list.push(["drone", "drone", "drone"]);
        budget -= d.cost * 3;
      } else {
        list.push([d.id]);
        budget -= d.cost;
      }
    }
    const dur = Math.min(38, 12 + n * 0.9);
    // inimigos chegam em "frentes": ângulos concentrados para dar chance de amontoar e colidir
    const fronts = 1 + Math.min(3, Math.floor(n / 4));
    const fa = Array.from({ length: fronts }, () => this.rng.range(0, TAU));
    list.forEach((g, i) => {
      const t = 1 + (i / Math.max(1, list.length - 1)) * dur * this.rng.range(0.85, 1);
      const base = fa[i % fronts] + this.rng.range(-0.55, 0.55);
      g.forEach((type, j) => this.spawnQ.push({ t: t + j * 0.18, type, ang: base + j * 0.06 }));
    });
    const boss = n % 10 === 0;
    if (boss) this.spawnQ.push({ t: 3, type: "leviathan", ang: this.rng.range(0, TAU) });
    this.spawnQ.sort((a, b) => a.t - b.t);
    this.waveEnd = this.spawnQ.length ? this.spawnQ[this.spawnQ.length - 1].t : 0;
    this.events.push({ k: "wave", n, boss });
  }

  remaining(): number {
    return this.enemies.length + this.spawnQ.length;
  }

  // ---------------------------------------------------------------- simulação
  private gravAt(d: number): number {
    const h = this.hole;
    const K = BAL.gravK * this.st.grav * (h.strong ? 1 : BAL.weakMul);
    const range = BAL.gravRange * this.st.reach;
    let a = K / (d + BAL.gravSoft);
    if (d > range) a *= Math.max(0, 1 - (d - range) / 140);
    return a * Math.min(1, d / 8);
  }

  hurt(e: Enemy, n: number, cause: Cause, show: boolean): void {
    if (e.dead || n <= 0) return;
    e.hp -= n;
    e.flash = 0.12;
    if (show && n >= 1) this.events.push({ k: "dmg", x: e.x, y: e.y - e.r, n, big: n > e.maxHp * 0.5 });
    if (e.hp <= 0) this.kill(e, cause);
  }

  private kill(e: Enemy, cause: Cause): void {
    e.dead = true;
    const d = ENEMIES[e.type];
    if (this.t - this.lastKillT <= this.st.comboWindow) this.combo++;
    else this.combo = 1;
    this.lastKillT = this.t;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = this.comboMult();
    const crush = cause === "impact" ? 1.5 : 1;
    const w = Math.max(1, this.wave);
    const value = d.frag * this.st.fragVal * mult * crush * (1 + 0.05 * (w - 1));
    const cnt = clamp(Math.round(d.frag), 1, 8);
    for (let i = 0; i < cnt; i++) {
      const a = this.rng.range(0, TAU);
      const s = this.rng.range(40, 120);
      this.frags.push({ x: e.x, y: e.y, vx: e.vx * 0.3 + Math.cos(a) * s, vy: e.vy * 0.3 + Math.sin(a) * s, v: value / cnt, life: BAL.fragLife });
    }
    this.matter += 0.15 * d.matter * (1 + 0.06 * (w - 1)) * this.st.matterMul * (1 + (mult - 1) * 0.5);
    this.kills++;
    if (cause === "impact") this.impactKills++;
    if (e.type === "splitter") {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + this.rng.range(0, 1);
        const s = this.spawn("shard", e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8, e.vx + Math.cos(a) * 90, e.vy + Math.sin(a) * 90);
        s.spawnT = 0.3;
      }
    }
    this.events.push({ k: "kill", x: e.x, y: e.y, type: e.type, cause, combo: this.combo });
  }

  comboMult(): number {
    if (this.t - this.lastKillT > this.st.comboWindow) return 1;
    return Math.min(5, 1 + 0.2 * (this.combo - 1));
  }

  private hitCore(e: Enemy): void {
    e.dead = true;
    let dmg = e.dmg;
    const c = this.core;
    if (c.shield > 0) {
      const ab = Math.min(c.shield, dmg);
      c.shield -= ab;
      dmg -= ab;
    }
    c.hp -= dmg;
    c.flash = 0.4;
    this.events.push({ k: "core", x: e.x, y: e.y, dmg });
    if (this.st.shield && !c.shieldUsed && c.hp > 0 && c.hp < c.maxHp * 0.3) {
      c.shieldUsed = true;
      c.shield = 50 * (1 + 0.05 * this.wave);
      this.events.push({ k: "shield" });
    }
    if (c.hp <= 0) {
      c.hp = 0;
      this.over = true;
      this.events.push({ k: "over" });
    }
  }

  step(dt: number): void {
    if (this.over) return;
    this.t += dt;
    this.stepN++;
    this.stepHole(dt);
    this.stepRings(dt);
    this.stepWaves(dt);
    this.stepEnemies(dt);
    this.stepAsteroids(dt);
    this.collide();
    this.stepSats(dt);
    this.stepSlugs(dt);
    this.stepFrags(dt);
    if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);
    const c = this.core;
    if (this.st.coreRegen > 0) c.hp = Math.min(c.maxHp, c.hp + this.st.coreRegen * dt);
    c.flash = Math.max(0, c.flash - dt);
  }

  private stepHole(dt: number): void {
    const h = this.hole;
    let vx = (h.tx - h.x) * BAL.holeFollow;
    let vy = (h.ty - h.y) * BAL.holeFollow;
    const sp = Math.hypot(vx, vy);
    if (sp > BAL.holeMaxSpeed) {
      vx *= BAL.holeMaxSpeed / sp;
      vy *= BAL.holeMaxSpeed / sp;
    }
    h.vx = vx;
    h.vy = vy;
    h.x += vx * dt;
    h.y += vy * dt;
    if (h.energy <= 0) h.exhausted = true;
    if (h.exhausted && h.energy > this.st.energyMax * 0.25) h.exhausted = false;
    h.strong = h.wantStrong && !h.exhausted;
    if (h.strong) {
      h.energy = Math.max(0, h.energy - BAL.energyDrain * dt);
      this.strongTime += dt;
    } else h.energy = Math.min(this.st.energyMax, h.energy + BAL.energyRegen * this.st.energyRegen * dt);
    h.pulseCd = Math.max(0, h.pulseCd - dt);
  }

  private stepRings(dt: number): void {
    for (let ri = 0; ri < this.rings.length; ri++) {
      const ring = this.rings[ri];
      ring.angle += (ring.spin + (ri === this.selRing ? this.spinDir * BAL.manualSpin : 0)) * dt;
    }
  }

  /** gira anéis mesmo com o tempo parado (modo construção) */
  manualRotate(dt: number): void {
    if (!this.spinDir) return;
    this.rings[this.selRing].angle += this.spinDir * BAL.manualSpin * dt;
    this.updateSatPositions();
  }

  updateSatPositions(): void {
    for (let ri = 0; ri < this.rings.length; ri++)
      this.rings[ri].slots.forEach((s, i) => {
        if (!s) return;
        const p = this.slotPos(ri, i);
        s.x = p.x;
        s.y = p.y;
      });
  }

  private stepWaves(dt: number): void {
    if (this.phase === "break") {
      this.breakT -= dt;
      if (this.breakT <= 0) this.startWave();
      return;
    }
    if (this.phase !== "wave") return;
    this.waveT += dt;
    while (this.spawnQ.length && this.spawnQ[0].t <= this.waveT) {
      const s = this.spawnQ.shift()!;
      const p = this.edgePoint(s.ang, s.type === "leviathan" ? 50 : 24);
      this.spawn(s.type, p.x, p.y);
    }
    // sobreviventes demorando demais: a próxima onda chega mesmo assim
    if (!this.spawnQ.length && this.enemies.length && this.waveT > this.waveEnd + 40) {
      this.startWave();
      return;
    }
    if (!this.spawnQ.length && !this.enemies.length) {
      const n = this.wave;
      const m = (1 + n * 0.5) * this.st.matterMul;
      const f = Math.round((6 + n * 1.5) * this.st.fragVal);
      this.matter += m;
      this.fragments += f;
      this.phase = "break";
      this.breakT = BAL.breakTime;
      this.events.push({ k: "waveClear", n, matter: m, frags: f });
    }
  }

  private stepEnemies(dt: number): void {
    const h = this.hole;
    const H = h.H;
    const sampleTrail = this.stepN % 2 === 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.age += dt;
      e.flash = Math.max(0, e.flash - dt);
      const slowMul = 1 - e.slow;
      e.slow = 0;
      const dc = Math.hypot(e.x, e.y) || 1;
      const dvx = (-e.x / dc) * e.speed * slowMul;
      const dvy = (-e.y / dc) * e.speed * slowMul;
      const steer = Math.min(1, e.steer * dt * (0.4 + 0.6 * slowMul));
      e.vx += (dvx - e.vx) * steer;
      e.vy += (dvy - e.vy) * steer;
      // gravidade do buraco
      const dx = h.x - e.x;
      const dy = h.y - e.y;
      const d = Math.hypot(dx, dy) || 1e-3;
      if (e.spawnT > 0) e.spawnT -= dt;
      else {
        const a = this.gravAt(d) * e.gres;
        e.vx += (dx / d) * a * dt;
        e.vy += (dy / d) * a * dt;
      }
      e.captured = false;
      if (e.gres > 0 && d < H + e.r * 0.6) {
        e.captured = true;
        this.hurt(e, BAL.horizonDps * this.st.horizonDps * (h.strong ? 1 : 0.4) * waveHp(this.wave) ** 0.4 * dt, "horizon", false);
        if (h.strong) {
          const k = Math.min(1, 6 * dt);
          e.vx += (h.vx - e.vx) * k;
          e.vy += (h.vy - e.vy) * k;
        }
      }
      const sp = Math.hypot(e.vx, e.vy);
      if (sp > 900) {
        e.vx *= 900 / sp;
        e.vy *= 900 / sp;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      // muito longe da tela: volta
      const lim = 140;
      if (e.x > this.view.hw + lim) e.vx -= 300 * dt;
      if (e.x < -this.view.hw - lim) e.vx += 300 * dt;
      if (e.y > this.view.hh + lim) e.vy -= 300 * dt;
      if (e.y < -this.view.hh - lim) e.vy += 300 * dt;
      if (sampleTrail) {
        e.trail.push(e.x, e.y);
        if (e.trail.length > TRAIL * 2) e.trail.splice(0, 2);
      }
      if (e.type === "leviathan" && Math.floor(e.age / 7) !== Math.floor((e.age - dt) / 7)) {
        for (let i = 0; i < 3; i++) {
          const a = this.rng.range(0, TAU);
          const s = this.spawn("drone", e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34, Math.cos(a) * 60, Math.sin(a) * 60);
          s.spawnT = 0.4;
        }
      }
      if (dc < BAL.coreR + e.r * 0.7) this.hitCore(e);
    }
  }

  private stepAsteroids(dt: number): void {
    const h = this.hole;
    const minR = this.asteroidMinR();
    for (const a of this.asteroids) {
      const dx = h.x - a.x;
      const dy = h.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      if (h.strong) {
        const g = this.gravAt(d) * 0.22;
        a.vx += (dx / d) * g * dt;
        a.vy += (dy / d) * g * dt;
      }
      const fr = Math.max(0, 1 - 0.7 * dt);
      a.vx *= fr;
      a.vy *= fr;
      const dc = Math.hypot(a.x, a.y) || 1;
      if (dc < minR) {
        const push = 260 * ((minR - dc) / 20);
        a.vx += (a.x / dc) * push * dt;
        a.vy += (a.y / dc) * push * dt;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      const { hw, hh } = this.view;
      if (a.x < -hw + a.r) (a.x = -hw + a.r), (a.vx = Math.abs(a.vx) * 0.6);
      if (a.x > hw - a.r) (a.x = hw - a.r), (a.vx = -Math.abs(a.vx) * 0.6);
      if (a.y < -hh + a.r) (a.y = -hh + a.r), (a.vy = Math.abs(a.vy) * 0.6);
      if (a.y > hh - a.r) (a.y = hh - a.r), (a.vy = -Math.abs(a.vy) * 0.6);
      a.rot += a.spin * dt;
    }
  }

  /** colisão entre dois corpos; retorna velocidade relativa de aproximação (ou 0) */
  private resolve(a: { x: number; y: number; vx: number; vy: number }, ma: number, b: { x: number; y: number; vx: number; vy: number }, mb: number, rr: number, rest: number): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return 0;
    const d = Math.sqrt(d2) || 1e-3;
    const nx = dx / d;
    const ny = dy / d;
    const ia = 1 / ma;
    const ib = 1 / mb;
    const over = rr - d;
    a.x -= nx * over * (ia / (ia + ib));
    a.y -= ny * over * (ia / (ia + ib));
    b.x += nx * over * (ib / (ia + ib));
    b.y += ny * over * (ib / (ia + ib));
    const vrel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (vrel <= 0) return 0;
    const J = ((1 + rest) * vrel) / (ia + ib);
    a.vx -= J * ia * nx;
    a.vy -= J * ia * ny;
    b.vx += J * ib * nx;
    b.vy += J * ib * ny;
    return vrel;
  }

  private impactDmg(vrel: number, mOther: number, mSelf: number): number {
    return BAL.impactK * this.st.impact * (vrel - BAL.impactMin) * ((2 * mOther) / (mOther + mSelf)) * Math.sqrt(waveHp(this.wave));
  }

  private collide(): void {
    const E = this.enemies;
    const n = E.length;
    for (let i = 0; i < n; i++) {
      const a = E[i];
      if (a.dead) continue;
      for (let j = i + 1; j < n; j++) {
        const b = E[j];
        if (b.dead) continue;
        const rr = a.r + b.r;
        if (Math.abs(a.x - b.x) > rr || Math.abs(a.y - b.y) > rr) continue;
        const v = this.resolve(a, a.mass, b, b.mass, rr, 0.55);
        if (v > BAL.impactMin) {
          const da = this.impactDmg(v, b.mass, a.mass);
          const db = this.impactDmg(v, a.mass, b.mass);
          this.events.push({ k: "impact", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, power: v });
          this.hurt(a, da, "impact", true);
          this.hurt(b, db, "impact", true);
        }
      }
      for (const s of this.asteroids) {
        const rr = a.r + s.r;
        if (Math.abs(a.x - s.x) > rr || Math.abs(a.y - s.y) > rr) continue;
        const v = this.resolve(a, a.mass, s, 7, rr, 0.5);
        if (v > BAL.impactMin) {
          this.events.push({ k: "impact", x: (a.x + s.x) / 2, y: (a.y + s.y) / 2, power: v * 1.2 });
          this.hurt(a, this.impactDmg(v, 7, a.mass) * 1.3, "impact", true);
        }
      }
    }
    const A = this.asteroids;
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) this.resolve(A[i], 1, A[j], 1, A[i].r + A[j].r, 0.6);
    // defletores
    for (let ri = 0; ri < this.st.rings; ri++)
      for (const s of this.rings[ri].slots) {
        if (!s || s.type !== "deflector") continue;
        const ds = satStats("deflector", s.lvl, this.st) as { radius: number; mul: number };
        for (const e of E) {
          if (e.dead) continue;
          const rr = ds.radius + e.r;
          if (Math.abs(e.x - s.x) > rr || Math.abs(e.y - s.y) > rr) continue;
          const wall = { x: s.x, y: s.y, vx: 0, vy: 0 };
          const v = this.resolve(e, e.mass, wall, 1e6, rr, 0.9);
          if (v > 0) {
            // sempre devolve com um mínimo de velocidade para fora
            const dx = e.x - s.x;
            const dy = e.y - s.y;
            const d = Math.hypot(dx, dy) || 1;
            e.vx += (dx / d) * 60;
            e.vy += (dy / d) * 60;
            s.pulse = 0.25;
            const dmg = (3 * Math.sqrt(waveHp(this.wave)) + Math.max(0, this.impactDmg(v, 9, e.mass))) * ds.mul;
            this.events.push({ k: "impact", x: e.x - (dx / d) * e.r, y: e.y - (dy / d) * e.r, power: Math.max(80, v) });
            this.hurt(e, dmg, "impact", true);
          }
        }
      }
  }

  private nearest(x: number, y: number, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = range * range;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  private stepSats(dt: number): void {
    for (let ri = 0; ri < this.rings.length; ri++) {
      if (ri >= this.st.rings) break;
      const ring = this.rings[ri];
      ring.slots.forEach((s, i) => {
        if (!s) return;
        const p = this.slotPos(ri, i);
        s.x = p.x;
        s.y = p.y;
        s.pulse = Math.max(0, s.pulse - dt);
        s.cd = Math.max(0, s.cd - dt);
        s.firing = false;
        switch (s.type) {
          case "laser": {
            const L = satStats("laser", s.lvl, this.st) as { range: number; dps: number };
            const e = this.nearest(s.x, s.y, L.range);
            if (e) {
              s.firing = true;
              s.tx = e.x;
              s.ty = e.y;
              this.hurt(e, L.dps * dt, "sat", false);
            }
            break;
          }
          case "mine": {
            if (s.cd > 0) break;
            const M = satStats("mine", s.lvl, this.st) as { trigger: number; radius: number; dmg: number; rearm: number };
            const trig = this.enemies.some((e) => !e.dead && Math.hypot(e.x - s.x, e.y - s.y) < M.trigger + e.r);
            if (trig) {
              s.cd = M.rearm;
              this.events.push({ k: "boom", x: s.x, y: s.y, r: M.radius });
              for (const e of this.enemies) {
                if (e.dead) continue;
                const dx = e.x - s.x;
                const dy = e.y - s.y;
                const d = Math.hypot(dx, dy) || 1;
                if (d > M.radius + e.r) continue;
                const f = 1 - (d / (M.radius + e.r)) * 0.5;
                e.vx += (dx / d) * 220 * f / Math.sqrt(e.mass);
                e.vy += (dy / d) * 220 * f / Math.sqrt(e.mass);
                this.hurt(e, M.dmg * f, "sat", true);
              }
            }
            break;
          }
          case "cannon": {
            if (s.cd > 0) break;
            const C = satStats("cannon", s.lvl, this.st) as { range: number; cd: number; dmg: number; speed: number };
            const e = this.nearest(s.x, s.y, C.range);
            if (!e) break;
            s.cd = C.cd;
            const tt = Math.hypot(e.x - s.x, e.y - s.y) / C.speed;
            const ax = e.x + e.vx * tt - s.x;
            const ay = e.y + e.vy * tt - s.y;
            const d = Math.hypot(ax, ay) || 1;
            this.slugs.push({ x: s.x, y: s.y, vx: (ax / d) * C.speed, vy: (ay / d) * C.speed, dmg: C.dmg, life: 1.6 });
            s.tx = s.x + ax;
            s.ty = s.y + ay;
            s.pulse = 0.15;
            this.events.push({ k: "shot", x: s.x, y: s.y });
            break;
          }
          case "stasis": {
            const S = satStats("stasis", s.lvl, this.st) as { radius: number; slow: number };
            for (const e of this.enemies) if (Math.hypot(e.x - s.x, e.y - s.y) < S.radius + e.r) e.slow = Math.max(e.slow, S.slow);
            break;
          }
          case "collector": {
            const C = satStats("collector", s.lvl, this.st) as { rate: number; pull: number };
            if (this.phase === "wave" || this.phase === "tutorial") s.acc += C.rate * dt * this.st.fragVal;
            if (s.acc >= 1) {
              const v = Math.floor(s.acc);
              s.acc -= v;
              this.fragments += v;
              this.collected += v;
              s.pulse = 0.3;
              this.events.push({ k: "pickup", x: s.x, y: s.y, v });
            }
            break;
          }
          case "deflector":
            break;
        }
      });
    }
  }

  private stepSlugs(dt: number): void {
    const h = this.hole;
    for (const g of this.slugs) {
      const dx = h.x - g.x;
      const dy = h.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      const a = this.gravAt(d) * 1.1;
      g.vx += (dx / d) * a * dt;
      g.vy += (dy / d) * a * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.life -= dt;
      if (d < h.H) {
        g.life = 0;
        this.events.push({ k: "swallow", x: g.x, y: g.y });
        continue;
      }
      for (const e of this.enemies) {
        if (e.dead) continue;
        if ((e.x - g.x) ** 2 + (e.y - g.y) ** 2 < (e.r + 3) ** 2) {
          e.vx += g.vx * 0.12 / e.mass;
          e.vy += g.vy * 0.12 / e.mass;
          this.events.push({ k: "impact", x: g.x, y: g.y, power: 70 });
          this.hurt(e, g.dmg, "sat", true);
          g.life = 0;
          break;
        }
      }
    }
    if (this.slugs.some((g) => g.life <= 0)) this.slugs = this.slugs.filter((g) => g.life > 0);
  }

  private stepFrags(dt: number): void {
    const h = this.hole;
    const pullR = BAL.fragPull * this.st.reach * (h.strong ? 1.6 : 1);
    const collectors: { x: number; y: number; pull: number }[] = [];
    for (let ri = 0; ri < this.st.rings; ri++)
      for (const s of this.rings[ri].slots) if (s?.type === "collector") collectors.push({ x: s.x, y: s.y, pull: (satStats("collector", s.lvl, this.st) as { pull: number }).pull });
    for (const f of this.frags) {
      f.life -= dt;
      const fr = Math.max(0, 1 - 1.6 * dt);
      f.vx *= fr;
      f.vy *= fr;
      const pull = (tx: number, ty: number, R: number, catchR: number): boolean => {
        const dx = tx - f.x;
        const dy = ty - f.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < catchR) return true;
        if (d < R) {
          const a = 1500 * (1 - d / R) + 350;
          f.vx += (dx / d) * a * dt;
          f.vy += (dy / d) * a * dt;
          // componente tangencial para espiralar
          f.vx += (-dy / d) * a * 0.25 * dt;
          f.vy += (dx / d) * a * 0.25 * dt;
        }
        return false;
      };
      let got = pull(h.x, h.y, pullR, h.H + 6);
      for (const c of collectors) if (!got && pull(c.x, c.y, c.pull, 10)) got = true;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (got) {
        this.fragments += f.v;
        this.collected += f.v;
        f.life = -1;
        this.events.push({ k: "pickup", x: f.x, y: f.y, v: f.v });
      }
    }
    if (this.frags.some((f) => f.life <= 0)) this.frags = this.frags.filter((f) => f.life > 0);
  }

  /** transfere matéria ainda não contabilizada para o perfil */
  bank(): number {
    const v = this.matter - this.banked;
    this.banked = this.matter;
    return v;
  }
}
