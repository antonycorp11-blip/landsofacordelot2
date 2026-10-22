import { TAU, clamp } from "../core/math";
import { Rng } from "../core/rng";
import { ENEMIES, KEYS, MOTIFS, ROOMS_PER_CONCERT, type ChordDef, type EnemyId, type KeyDef, type MotifId } from "../data/content";
import type { Stats } from "./profile";

export interface Enemy {
  id: number;
  type: EnemyId;
  deg: number;
  x: number;
  y: number;
  kx: number;
  ky: number;
  hp: number;
  maxHp: number;
  r: number;
  speed: number;
  dmg: number;
  hitCd: number;
  ostCd: number;
  susCd: number;
  flash: number;
  age: number;
  dead: boolean;
  touching: boolean;
  orbit: number;
  hold: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
}

export interface Ring {
  x: number;
  y: number;
  r: number;
  hit: boolean;
}

export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  max: number;
}

export type Phase = "tutorial" | "intro" | "fight" | "clear" | "won" | "over";

export type SimEvent =
  | { k: "beat"; n: number; bar: boolean }
  | { k: "hit"; x: number; y: number; deg: number; dmg: number; crit: boolean; onBeat: boolean; boss: boolean }
  | { k: "kill"; x: number; y: number; deg: number; type: EnemyId; notes: number }
  | { k: "chord"; x: number; y: number; chord: ChordDef; r: number }
  | { k: "scale"; x: number; y: number }
  | { k: "tired" }
  | { k: "parry"; x: number; y: number }
  | { k: "lyra"; dmg: number }
  | { k: "cry" }
  | { k: "shock" }
  | { k: "room"; n: number }
  | { k: "roomClear"; n: number; notes: number }
  | { k: "boss" }
  | { k: "level"; n: number }
  | { k: "shoot"; x: number; y: number }
  | { k: "won" }
  | { k: "over" };

interface Spawn {
  t: number;
  type: EnemyId;
  deg: number;
  ang: number;
}

export const LYRA_R = 20;

export function keyHp(k: number): number {
  return Math.pow(2, k);
}

export class Run {
  readonly rng: Rng;
  readonly key: KeyDef;
  t = 0;
  bpm = 84;
  period = 60 / 84;
  beatT = 0;
  beatN = 0;
  room = 0;
  phase: Phase;
  phaseT = 0;
  roomT = 0;
  spawnQ: Spawn[] = [];
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  bullets: Shot[] = [];
  rings: Ring[] = [];
  trail: Seg[] = [];
  lyra = { hp: 100, maxHp: 100, shield: 0, flash: 0, cryCd: 0 };
  cursor = { x: 0, y: 0, px: 0, py: 0, active: false, fresh: true, speed: 0 };
  stamina = 100;
  staminaMax = 100;
  tired = false;
  lastHitT = -9;
  stroke: number[] = [];
  streak = 0;
  notes = 0;
  scores = 0;
  kills = 0;
  chords = 0;
  xp = 0;
  level = 0;
  xpNext = 6;
  pendingLevels = 0;
  motifs: Partial<Record<MotifId, number>> = {};
  rerolls: number;
  offer: MotifId[] | null = null;
  view = { hw: 400, hh: 300 };
  events: SimEvent[] = [];
  bossId = -1;
  private nextId = 1;
  private tiredShown = false;

  constructor(
    readonly st: Stats,
    readonly keyIdx: number,
    seed: number,
    tutorial = false,
  ) {
    this.rng = new Rng(seed);
    this.key = KEYS[keyIdx];
    this.lyra.hp = this.lyra.maxHp = st.lyraHp;
    this.stamina = this.staminaMax = st.stamina;
    this.rerolls = st.rerolls;
    this.phase = tutorial ? "tutorial" : "intro";
    this.setBpm(1);
    if (!tutorial) this.startRoom(1);
    for (let i = 0; i < st.startMotifs; i++) {
      const pool = this.motifChoices(1);
      if (pool[0]) this.applyMotif(pool[0]);
    }
  }

  m(id: MotifId): number {
    return this.motifs[id] ?? 0;
  }

  setView(hw: number, hh: number): void {
    this.view = { hw, hh };
  }

  private setBpm(room: number): void {
    this.bpm = Math.max(60, 84 + 6 * (room - 1) + 4 * this.keyIdx + this.st.bpmDelta);
    this.period = 60 / this.bpm;
  }

  // ---------------------------------------------------------------- entrada
  setCursor(x: number, y: number, active: boolean): void {
    const c = this.cursor;
    if (!active || !c.active) c.fresh = true;
    c.x = x;
    c.y = y;
    c.active = active;
  }

  // ---------------------------------------------------------------- ritmo
  onBeat(): boolean {
    const w = 0.09 * this.st.beatWindow;
    return this.beatT < w || this.period - this.beatT < w;
  }

  /** pulso de 1 (logo após a batida) a 0 */
  pulse(): number {
    return Math.exp(-(this.beatT / this.period) * 5);
  }

  intangible(e: Enemy): boolean {
    return e.type === "pausa" && this.beatT / this.period < 0.5;
  }

  // ---------------------------------------------------------------- salas
  get hpMul(): number {
    return keyHp(this.keyIdx) * (1 + 0.18 * Math.max(0, this.room - 1));
  }

  get dmgMul(): number {
    return Math.pow(1.4, this.keyIdx);
  }

  get notesKey(): number {
    return Math.pow(1.8, this.keyIdx);
  }

  beginConcert(): void {
    if (this.phase === "tutorial") this.startRoom(1);
  }

  private startRoom(n: number): void {
    this.room = n;
    this.setBpm(n);
    this.phase = "intro";
    this.phaseT = 2.2;
    this.roomT = 0;
    this.lyra.shield = this.st.lyraShield;
    this.spawnQ = [];
    const pool = Object.values(ENEMIES).filter((d) => d.weight > 0 && d.fromRoom <= n && d.fromKey <= this.keyIdx);
    const tw = pool.reduce((s, d) => s + d.weight, 0);
    let count = Math.round((14 + 7 * n + 2 * this.keyIdx) * this.st.spawnMul * (n === ROOMS_PER_CONCERT ? 0.4 : 1));
    let t = 1;
    while (count > 0) {
      const ang = this.rng.range(0, TAU);
      let r = this.rng.next() * tw;
      let d = pool[0];
      for (const p of pool) {
        r -= p.weight;
        if (r <= 0) {
          d = p;
          break;
        }
      }
      const chordy = d.id !== "sustenido" && (d.id === "colcheia" || this.rng.next() < 0.45);
      if (chordy) {
        const c = this.rng.pick(this.st.chords.filter((c) => c.degs.length === 3));
        const degs = [...c.degs].sort(() => this.rng.next() - 0.5);
        degs.forEach((deg, j) => this.spawnQ.push({ t: t + j * 0.12, type: d.id, deg, ang: ang + (j - 1) * 0.1 }));
        count -= 3;
      } else {
        this.spawnQ.push({ t, type: d.id, deg: d.id === "sustenido" ? -1 : this.rng.range(0, 7) | 0, ang });
        count -= 1;
      }
      t += (this.period * this.rng.range(0.9, 2)) / (1 + 0.08 * n);
    }
    if (n === ROOMS_PER_CONCERT) this.spawnQ.push({ t: 1.5, type: "tritono", deg: -1, ang: this.rng.range(0, TAU) });
    this.spawnQ.sort((a, b) => a.t - b.t);
    this.events.push({ k: "room", n });
  }

  edgePoint(ang: number, margin = 30): { x: number; y: number } {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const t = Math.min((this.view.hw + margin) / Math.max(1e-6, Math.abs(c)), (this.view.hh + margin) / Math.max(1e-6, Math.abs(s)));
    return { x: c * t, y: s * t };
  }

  spawn(type: EnemyId, deg: number, x: number, y: number): Enemy {
    const d = ENEMIES[type];
    const hp = d.hp * (type === "tritono" ? keyHp(this.keyIdx) : this.hpMul);
    const e: Enemy = {
      id: this.nextId++,
      type,
      deg,
      x,
      y,
      kx: 0,
      ky: 0,
      hp,
      maxHp: hp,
      r: d.r,
      speed: d.speed * this.st.enemySpeed * (1 + 0.04 * Math.max(0, this.room - 1)),
      dmg: d.dmg * this.dmgMul,
      hitCd: 0,
      ostCd: 0,
      susCd: 0,
      flash: 0,
      age: 0,
      dead: false,
      touching: false,
      orbit: this.rng.next() < 0.5 ? 1 : -1,
      hold: 150 + this.rng.range(0, 60),
    };
    if (type === "tritono") {
      this.bossId = e.id;
      this.events.push({ k: "boss" });
    }
    this.enemies.push(e);
    return e;
  }

  // ---------------------------------------------------------------- motivos
  motifChoices(n: number): MotifId[] {
    const pool = this.st.motifPool.filter((m) => this.m(m) < MOTIFS[m].max);
    const out: MotifId[] = [];
    while (out.length < n && pool.length) out.push(pool.splice((this.rng.next() * pool.length) | 0, 1)[0]);
    return out;
  }

  openOffer(): MotifId[] {
    if (!this.offer) this.offer = this.motifChoices(this.st.choices);
    return this.offer;
  }

  reroll(): boolean {
    if (this.rerolls <= 0 || !this.offer) return false;
    this.rerolls--;
    this.offer = this.motifChoices(this.st.choices);
    return true;
  }

  choose(id: MotifId): void {
    if (!this.offer?.includes(id)) return;
    this.applyMotif(id);
    this.offer = null;
    this.pendingLevels = Math.max(0, this.pendingLevels - 1);
  }

  private applyMotif(id: MotifId): void {
    this.motifs[id] = this.m(id) + 1;
    if (id === "aria") {
      this.lyra.maxHp += 15;
      this.lyra.hp = Math.min(this.lyra.maxHp, this.lyra.hp + 20);
    }
    if (id === "folego") {
      this.staminaMax += 30;
      this.stamina += 30;
    }
  }

  // ---------------------------------------------------------------- dano
  private baseDmg(): number {
    return 6 * this.st.dmg * (1 + 0.25 * this.m("forte"));
  }

  private damage(e: Enemy, n: number): void {
    if (e.dead) return;
    e.hp -= n;
    e.flash = 0.1;
    if (e.hp <= 0) this.kill(e);
  }

  private kill(e: Enemy): void {
    e.dead = true;
    const d = ENEMIES[e.type];
    const notes = d.notes * this.st.notesMul * this.notesKey * (1 + 0.25 * this.m("ganancia"));
    this.notes += notes;
    this.kills++;
    this.stamina = Math.min(this.staminaMax, this.stamina + this.st.killStamina);
    this.gainXp(d.xp * this.st.xpMul);
    this.events.push({ k: "kill", x: e.x, y: e.y, deg: e.deg, type: e.type, notes });
    if (e.type === "tritono") {
      this.scores += 1 + this.keyIdx;
      // sem o trítono, o resto da orquestra desafinada se desfaz
      this.spawnQ = [];
      for (const o of this.enemies) if (!o.dead) this.kill(o);
    }
  }

  gainXp(v: number, force = false): void {
    if (this.phase === "tutorial" && !force) return;
    this.xp += v;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = Math.round(6 * Math.pow(1.28, this.level));
      this.pendingLevels++;
      this.events.push({ k: "level", n: this.level });
    }
  }

  private slash(e: Enemy, dx: number, dy: number): void {
    const cost = 6 * this.st.hitCost;
    if (this.tired || this.stamina < cost) {
      this.tired = true;
      if (!this.tiredShown) {
        this.tiredShown = true;
        this.events.push({ k: "tired" });
      }
      return;
    }
    this.stamina -= cost;
    this.lastHitT = this.t;
    this.streak++;
    const onBeat = this.onBeat();
    const crit = this.rng.next() < this.st.crit;
    const spd = Math.min(1, this.cursor.speed / 2200) * this.st.speedBonus;
    let dmg = this.baseDmg() * (1 + spd);
    if (onBeat) dmg *= this.st.beatMul + 0.5 * this.m("sincope");
    if (crit) dmg *= this.st.critMul;
    dmg *= 1 + Math.min(0.5 * this.m("crescendo"), 0.05 * this.streak);
    if (this.m("eco") && this.rng.next() < 0.25 * this.m("eco")) dmg *= 2;
    const len = Math.hypot(dx, dy) || 1;
    const kb = (e.type === "tritono" ? 20 : 150) / Math.sqrt(e.r / 13);
    e.kx += (dx / len) * kb;
    e.ky += (dy / len) * kb;
    e.hitCd = 0.16;
    this.events.push({ k: "hit", x: e.x, y: e.y, deg: e.deg, dmg, crit, onBeat, boss: e.type === "tritono" });
    this.damage(e, dmg);
    if (e.deg >= 0) {
      this.stroke.push(e.deg);
      if (this.stroke.length > 8) this.stroke.shift();
      this.checkScale(e);
      this.checkChord();
    }
  }

  private checkScale(e: Enemy): void {
    const s = this.stroke;
    if (s.length < 3) return;
    const [a, b, c] = s.slice(-3);
    if ((b - a + 7) % 7 === 1 && (c - b + 7) % 7 === 1) {
      this.stamina = Math.min(this.staminaMax, this.stamina + 15);
      this.events.push({ k: "scale", x: e.x, y: e.y });
    }
  }

  private checkChord(): void {
    const set = new Set(this.stroke);
    const opts = [...this.st.chords].sort((a, b) => b.degs.length - a.degs.length);
    const c = opts.find((ch) => ch.degs.every((d) => set.has(d)));
    if (!c) return;
    this.stroke = [];
    this.chords++;
    const R = 95 * this.st.chordRadius * (c.degs.length > 3 ? 1.3 : 1);
    const dmg = 16 * this.st.dmg * this.st.chordDmg * (1 + 0.5 * this.m("acorde")) * (c.degs.length > 3 ? 1.8 : 1);
    const { x, y } = this.cursor;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const near = Math.hypot(e.x - x, e.y - y) < R + e.r;
      const arp = this.st.arpeggio && c.degs.includes(e.deg);
      if (near || arp) {
        const dx = e.x - x;
        const dy = e.y - y;
        const d = Math.hypot(dx, dy) || 1;
        if (near) {
          e.kx += (dx / d) * 220;
          e.ky += (dy / d) * 220;
        }
        this.damage(e, dmg);
      }
    }
    if (this.m("coral")) this.lyra.hp = Math.min(this.lyra.maxHp, this.lyra.hp + 4 * this.m("coral"));
    this.notes += 1 * this.notesKey * this.st.notesMul;
    this.events.push({ k: "chord", x, y, chord: c, r: R });
  }

  private hurtLyra(n: number): void {
    const L = this.lyra;
    if (this.phase === "tutorial") n *= 0.3;
    const ab = Math.min(L.shield, n);
    L.shield -= ab;
    n -= ab;
    L.hp -= n;
    L.flash = 0.35;
    this.events.push({ k: "lyra", dmg: n });
    if (this.st.lyraCry && L.cryCd <= 0) {
      L.cryCd = 8;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x, e.y) || 1;
        if (d < 140 && e.type !== "tritono") {
          e.kx += (e.x / d) * 380;
          e.ky += (e.y / d) * 380;
        }
      }
      this.events.push({ k: "cry" });
    }
    if (L.hp <= 0) {
      L.hp = 0;
      if (this.phase === "tutorial") L.hp = 1;
      else {
        this.phase = "over";
        this.events.push({ k: "over" });
      }
    }
  }

  // ---------------------------------------------------------------- passo
  step(dt: number): void {
    if (this.phase === "over" || this.phase === "won") return;
    this.t += dt;
    this.beatT += dt;
    if (this.beatT >= this.period) {
      this.beatT -= this.period;
      this.beatN++;
      this.beat();
    }
    this.stepPhase(dt);
    this.stepCursor(dt);
    this.stepEnemies(dt);
    this.stepShots(dt);
    const L = this.lyra;
    L.flash = Math.max(0, L.flash - dt);
    if (this.st.lyraRegen) L.hp = Math.min(L.maxHp, L.hp + this.st.lyraRegen * dt);
    if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);
  }

  private beat(): void {
    this.events.push({ k: "beat", n: this.beatN, bar: this.beatN % 4 === 0 });
    const L = this.lyra;
    L.cryCd = Math.max(0, L.cryCd - 1);
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.touching) this.hurtLyra(e.dmg);
      if (e.type === "bemol" && Math.hypot(e.x, e.y) < e.hold + 20 && this.beatN % 2 === 0) {
        const d = Math.hypot(e.x, e.y) || 1;
        this.shots.push({ x: e.x, y: e.y, vx: (-e.x / d) * 120, vy: (-e.y / d) * 120, dmg: e.dmg, life: 6 });
        this.events.push({ k: "shoot", x: e.x, y: e.y });
      }
      if (e.type === "tritono") {
        const half = e.hp < e.maxHp / 2;
        if (this.beatN % 4 === 0) this.rings.push({ x: e.x, y: e.y, r: e.r, hit: false });
        if (this.beatN % (half ? 8 : 12) === 0)
          for (let i = 0; i < 2; i++) {
            const a = (i / 2) * TAU + this.t;
            const m = this.spawn(half ? "colcheia" : "seminima", this.rng.range(0, 7) | 0, e.x + Math.cos(a) * 55, e.y + Math.sin(a) * 55);
            m.kx = Math.cos(a) * 120;
            m.ky = Math.sin(a) * 120;
          }
      }
    }
    // Staccato: Lyra atira
    const sc = this.m("staccato");
    if (sc) {
      const targets = [...this.enemies].filter((e) => !e.dead).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y)).slice(0, sc);
      for (const t of targets) {
        const d = Math.hypot(t.x, t.y) || 1;
        this.bullets.push({ x: 0, y: 0, vx: (t.x / d) * 430, vy: (t.y / d) * 430, dmg: 4 * this.st.dmg * (1 + 0.25 * this.m("forte")), life: 1.5 });
      }
    }
  }

  private stepPhase(dt: number): void {
    if (this.phase === "intro") {
      this.phaseT -= dt;
      if (this.phaseT <= 0) this.phase = "fight";
      return;
    }
    if (this.phase === "clear") {
      this.phaseT -= dt;
      if (this.phaseT <= 0) this.startRoom(this.room + 1);
      return;
    }
    if (this.phase !== "fight") return;
    this.roomT += dt;
    while (this.spawnQ.length && this.spawnQ[0].t <= this.roomT) {
      const s = this.spawnQ.shift()!;
      const R = Math.min(this.view.hw, this.view.hh) + 50;
      const p = s.type === "tritono" ? { x: Math.cos(s.ang) * R, y: Math.sin(s.ang) * R } : this.edgePoint(s.ang, 30);
      this.spawn(s.type, s.deg, p.x, p.y);
    }
    if (!this.spawnQ.length && !this.enemies.length) {
      if (this.room >= ROOMS_PER_CONCERT) {
        this.phase = "won";
        this.events.push({ k: "won" });
        return;
      }
      const bonus = this.room * 3 * this.notesKey * this.st.notesMul;
      this.notes += bonus;
      this.phase = "clear";
      this.phaseT = 2.6;
      this.events.push({ k: "roomClear", n: this.room, notes: bonus });
    }
  }

  private stepCursor(dt: number): void {
    const c = this.cursor;
    if (c.fresh) {
      c.px = c.x;
      c.py = c.y;
      c.fresh = false;
    }
    const dx = c.x - c.px;
    const dy = c.y - c.py;
    const len = Math.hypot(dx, dy);
    c.speed = c.speed * 0.7 + (len / Math.max(dt, 1e-4)) * 0.3;
    if (this.t - this.lastHitT > 0.55) {
      this.stroke = [];
      this.streak = 0;
    }
    // fôlego
    if (this.t - this.lastHitT > 0.45) this.stamina = Math.min(this.staminaMax, this.stamina + 32 * this.st.staminaRegen * (1 + 0.35 * this.m("respira")) * dt);
    if (this.tired && this.stamina >= this.staminaMax * 0.35) {
      this.tired = false;
      this.tiredShown = false;
    }
    const W = 9 * this.st.width * (1 + 0.3 * this.m("legato"));
    if (c.active && len > 0.01) {
      for (const e of this.enemies) {
        if (e.dead || e.hitCd > 0 || this.intangible(e)) continue;
        if (segDist(e.x, e.y, c.px, c.py, c.x, c.y) < e.r + W) this.slash(e, dx, dy);
      }
      for (const s of this.shots)
        if (s.life > 0 && segDist(s.x, s.y, c.px, c.py, c.x, c.y) < 7 + W) {
          s.life = 0;
          this.events.push({ k: "parry", x: s.x, y: s.y });
        }
      const sus = this.m("sustain");
      if (sus && len > 2) this.trail.push({ x1: c.px, y1: c.py, x2: c.x, y2: c.y, life: 0.35 * sus, max: 0.35 * sus });
      // ondas do trítono drenam o fôlego
      for (const r of this.rings)
        if (!r.hit && Math.abs(Math.hypot(c.x - r.x, c.y - r.y) - r.r) < 10) {
          r.hit = true;
          this.stamina = Math.max(0, this.stamina - 30);
          this.events.push({ k: "shock" });
        }
    }
    c.px = c.x;
    c.py = c.y;
    // rastro que continua cortando
    for (const s of this.trail) {
      s.life -= dt;
      for (const e of this.enemies) {
        if (e.dead || e.susCd > 0 || this.intangible(e)) continue;
        if (segDist(e.x, e.y, s.x1, s.y1, s.x2, s.y2) < e.r + W * 0.7) {
          e.susCd = 0.3;
          this.damage(e, this.baseDmg() * 0.3);
          this.events.push({ k: "hit", x: e.x, y: e.y, deg: e.deg, dmg: this.baseDmg() * 0.3, crit: false, onBeat: false, boss: false });
        }
      }
    }
    if (this.trail.length) this.trail = this.trail.filter((s) => s.life > 0);
  }

  private stepEnemies(dt: number): void {
    const pulse = this.pulse();
    const ost = this.m("ostinato");
    const orbs = ost ? this.ostinatoOrbs() : [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.age += dt;
      e.hitCd = Math.max(0, e.hitCd - dt);
      e.ostCd = Math.max(0, e.ostCd - dt);
      e.susCd = Math.max(0, e.susCd - dt);
      e.flash = Math.max(0, e.flash - dt);
      const d = Math.hypot(e.x, e.y) || 1;
      const ux = -e.x / d;
      const uy = -e.y / d;
      let v = e.speed * (0.45 + 1.3 * pulse);
      let vx = ux * v;
      let vy = uy * v;
      if (e.type === "bemol" && d < e.hold) {
        // para longe e circula
        vx = -uy * e.orbit * 18 - ux * (e.hold - d) * 0.8;
        vy = ux * e.orbit * 18 - uy * (e.hold - d) * 0.8;
      }
      if (e.type === "tritono") {
        v = e.speed * (e.hp < e.maxHp / 2 ? 1.6 : 1);
        vx = ux * v;
        vy = uy * v;
      }
      const touch = LYRA_R + e.r;
      e.touching = d <= touch + 1;
      if (e.touching) {
        vx = 0;
        vy = 0;
      }
      e.x += (vx + e.kx) * dt;
      e.y += (vy + e.ky) * dt;
      const k = Math.max(0, 1 - 6 * dt);
      e.kx *= k;
      e.ky *= k;
      const nd = Math.hypot(e.x, e.y) || 1;
      if (nd < touch) {
        e.x = (e.x / nd) * touch;
        e.y = (e.y / nd) * touch;
      }
      // não deixa fugir muito da tela
      const lim = 90;
      e.x = clamp(e.x, -this.view.hw - lim, this.view.hw + lim);
      e.y = clamp(e.y, -this.view.hh - lim, this.view.hh + lim);
      for (const o of orbs)
        if (e.ostCd <= 0 && Math.hypot(e.x - o.x, e.y - o.y) < e.r + 9) {
          e.ostCd = 0.4;
          const dmg = 5 * this.st.dmg * (1 + 0.25 * this.m("forte"));
          this.damage(e, dmg);
          this.events.push({ k: "hit", x: e.x, y: e.y, deg: e.deg, dmg, crit: false, onBeat: false, boss: false });
        }
    }
    // separação simples entre inimigos
    const E = this.enemies;
    for (let i = 0; i < E.length; i++)
      for (let j = i + 1; j < E.length; j++) {
        const a = E[i];
        const b = E[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rr = (a.r + b.r) * 0.9;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (rr - d) * 0.5;
        const wa = b.r / (a.r + b.r);
        a.x -= (dx / d) * push * wa;
        a.y -= (dy / d) * push * wa;
        b.x += (dx / d) * push * (1 - wa);
        b.y += (dy / d) * push * (1 - wa);
      }
    for (const r of this.rings) r.r += 230 * dt;
    if (this.rings.length) this.rings = this.rings.filter((r) => r.r < Math.hypot(this.view.hw, this.view.hh) + 200);
  }

  ostinatoOrbs(): { x: number; y: number }[] {
    const n = 2 * this.m("ostinato");
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = this.t * 2.4 + (i / n) * TAU;
      out.push({ x: Math.cos(a) * 62, y: Math.sin(a) * 62 });
    }
    return out;
  }

  private stepShots(dt: number): void {
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life > 0 && Math.hypot(s.x, s.y) < LYRA_R + 4) {
        s.life = 0;
        this.hurtLyra(s.dmg);
      }
    }
    if (this.shots.some((s) => s.life <= 0)) this.shots = this.shots.filter((s) => s.life > 0);
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      for (const e of this.enemies) {
        if (e.dead || this.intangible(e)) continue;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (e.r + 4) ** 2) {
          b.life = 0;
          this.damage(e, b.dmg);
          this.events.push({ k: "hit", x: e.x, y: e.y, deg: e.deg, dmg: b.dmg, crit: false, onBeat: false, boss: false });
          break;
        }
      }
    }
    if (this.bullets.some((b) => b.life <= 0)) this.bullets = this.bullets.filter((b) => b.life > 0);
  }

  remaining(): number {
    return this.enemies.length + this.spawnQ.length;
  }
}

export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}
