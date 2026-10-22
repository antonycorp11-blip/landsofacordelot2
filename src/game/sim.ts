import { TAU, clamp } from "../core/math";
import { Rng } from "../core/rng";
import { DUNGEONS, KEYS, MONSTERS, dungeonPower, type ChordDef, type DungeonDef, type KeyDef, type MonsterId } from "../data/content";
import type { Stats } from "./profile";

/** lado de uma sala (unidades do mundo). Na tela isométrica vira um losango 2× mais largo. */
export const ROOM = 260;
export const DOOR = 46;
export const TITO_R = 6;

/** projeção isométrica: mundo (x, y) → plano da tela (u, v) */
export const isoU = (x: number, y: number) => x - y;
export const isoV = (x: number, y: number) => (x + y) / 2;
/** plano da tela (u, v) → chão do mundo */
export const groundX = (u: number, v: number) => v + u / 2;
export const groundY = (u: number, v: number) => v - u / 2;

export interface Room {
  gx: number;
  gy: number;
  x0: number;
  y0: number;
  cleared: boolean;
  visited: boolean;
  boss: boolean;
  /** direção da porta para a próxima sala */
  next: [number, number] | null;
}

export interface Monster {
  id: number;
  type: MonsterId;
  deg: number;
  x: number;
  y: number;
  kx: number;
  ky: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  r: number;
  speed: number;
  dmg: number;
  marked: boolean;
  stun: number;
  broken: boolean;
  flash: number;
  age: number;
  hitAt: number;
  dead: boolean;
  touching: boolean;
  orbit: number;
  face: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
}

export interface Wave {
  x: number;
  y: number;
  r: number;
  hit: boolean;
}

export type Phase = "fight" | "walk" | "won" | "over";

export type SimEvent =
  | { k: "beat"; n: number }
  | { k: "hit"; u: number; v: number; dmg: number; deg: number; onBeat: boolean; armor: boolean }
  | { k: "broken"; u: number; v: number }
  | { k: "execute"; u: number; v: number }
  | { k: "kill"; u: number; v: number; deg: number; type: MonsterId; marked: boolean }
  | { k: "acertos"; u: number; v: number; n: number }
  | { k: "chord"; u: number; v: number; chord: ChordDef }
  | { k: "scale"; u: number; v: number }
  | { k: "circle"; pts: [number, number][]; hits: number }
  | { k: "tired" }
  | { k: "parry"; u: number; v: number }
  | { k: "tito"; dmg: number }
  | { k: "batuque" }
  | { k: "shock" }
  | { k: "spawn"; u: number; v: number }
  | { k: "gain"; what: "vigor" | "exp" | "cristais" | "partituras"; n: number }
  | { k: "roomClear"; i: number }
  | { k: "enter"; i: number; boss: boolean }
  | { k: "first"; what: "armor" | "marked" | "boss" | "tired" }
  | { k: "won" }
  | { k: "over" };

export class Run {
  readonly rng: Rng;
  readonly dungeon: DungeonDef;
  readonly key: KeyDef;
  readonly power: number;
  t = 0;
  bpm: number;
  period: number;
  beatT = 0;
  beatN = 0;
  rooms: Room[] = [];
  roomI = 0;
  phase: Phase = "fight";
  tito = { x: 0, y: 0, hp: 100, maxHp: 100, flash: 0, walk: [] as [number, number][], moving: false, drum: 0 };
  monsters: Monster[] = [];
  shots: Shot[] = [];
  waves: Wave[] = [];
  spawnLeft = 0;
  spawnTotal = 0;
  spawnT = 0;
  cursor = { u: 0, v: 0, pu: 0, pv: 0, active: false, fresh: true, speed: 0 };
  stroke = { on: false, quiet: 0, ids: new Map<number, number>(), count: 0, notes: [] as number[], pts: [] as [number, number][], len: 0, su: 0, sv: 0, chorded: false };
  vigor = 100;
  vigorMax = 100;
  tired = false;
  lastHit = -9;
  flow = 1;
  circleCd = 0;
  notas = 0;
  cristais = 0;
  partituras = 0;
  exp = 0;
  kills = 0;
  chords = 0;
  events: SimEvent[] = [];
  paused = false;
  private nextId = 1;
  private tiredShown = false;
  private seenArmor = false;
  private seenMarked = false;

  constructor(
    readonly st: Stats,
    readonly dIdx: number,
    seed: number,
  ) {
    this.rng = new Rng(seed);
    this.dungeon = DUNGEONS[dIdx];
    this.key = KEYS[this.dungeon.key];
    this.power = dungeonPower(dIdx);
    this.bpm = 92 + 8 * dIdx;
    this.period = 60 / this.bpm;
    this.vigor = this.vigorMax = st.vigor;
    this.tito.hp = this.tito.maxHp = st.titoHp;
    this.buildDungeon();
    const r0 = this.rooms[0];
    this.tito.x = r0.x0 + ROOM / 2;
    this.tito.y = r0.y0 + ROOM / 2;
    this.enterRoom(0);
  }

  /** passeio aleatório numa grade: uma sala depois da outra, a última é a do chefe */
  private buildDungeon(): void {
    const n = this.dungeon.rooms + 1;
    const cells: [number, number][] = [[0, 0]];
    const used = new Set(["0,0"]);
    const dirs: [number, number][] = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ];
    while (cells.length < n) {
      const [cx, cy] = cells[cells.length - 1];
      const opts = dirs.filter(([dx, dy]) => !used.has(`${cx + dx},${cy + dy}`) && !(dx < 0 && this.rng.next() < 0.6) && !(dy < 0 && this.rng.next() < 0.6));
      const pick = opts.length ? this.rng.pick(opts) : dirs.find(([dx, dy]) => !used.has(`${cx + dx},${cy + dy}`))!;
      const c: [number, number] = [cx + pick[0], cy + pick[1]];
      used.add(`${c[0]},${c[1]}`);
      cells.push(c);
    }
    this.rooms = cells.map(([gx, gy], i) => ({
      gx,
      gy,
      x0: gx * ROOM,
      y0: gy * ROOM,
      cleared: false,
      visited: i === 0,
      boss: i === n - 1,
      next: i < n - 1 ? [cells[i + 1][0] - gx, cells[i + 1][1] - gy] : null,
    }));
  }

  get room(): Room {
    return this.rooms[this.roomI];
  }

  private enterRoom(i: number): void {
    this.roomI = i;
    const r = this.rooms[i];
    r.visited = true;
    this.phase = "fight";
    this.flow = 1;
    const base = r.boss ? 6 : 12 + 4 * i + 2 * this.dIdx;
    this.spawnLeft = this.spawnTotal = Math.round(base * this.st.spawnMul);
    this.spawnT = 1.2;
    if (r.boss) {
      const m = this.spawnAt("maestro", -1, r.x0 + ROOM * 0.5 + (r.next ? 0 : 0), r.y0 + ROOM * 0.2);
      m.marked = false;
      this.events.push({ k: "first", what: "boss" });
    }
    this.events.push({ k: "enter", i, boss: r.boss });
  }

  // ---------------------------------------------------------------- entrada (coordenadas do plano isométrico)
  setCursor(u: number, v: number, active: boolean): void {
    const c = this.cursor;
    if (!active || !c.active) c.fresh = true;
    c.u = u;
    c.v = v;
    c.active = active;
  }

  // ---------------------------------------------------------------- ritmo
  onBeat(): boolean {
    const w = 0.1 * this.st.beatWindow;
    return this.beatT < w || this.period - this.beatT < w;
  }

  ghost(m: Monster): boolean {
    return m.type === "corista" && this.beatT / this.period < 0.5;
  }

  // ---------------------------------------------------------------- monstros
  spawnAt(type: MonsterId, deg: number, x: number, y: number): Monster {
    const d = MONSTERS[type];
    const mul = this.power * (type === "maestro" ? 1 : 1 + 0.15 * this.roomI);
    const m: Monster = {
      id: this.nextId++,
      type,
      deg,
      x,
      y,
      kx: 0,
      ky: 0,
      hp: d.hp * mul,
      maxHp: d.hp * mul,
      armor: d.armor * mul,
      maxArmor: d.armor * mul,
      r: d.r,
      speed: d.speed * (1 + 0.03 * this.roomI),
      dmg: d.dmg * Math.pow(this.power, 0.6),
      marked: type !== "maestro" && this.rng.next() < this.st.markChance,
      stun: 0,
      broken: false,
      flash: 0,
      age: 0,
      hitAt: -9,
      dead: false,
      touching: false,
      orbit: this.rng.next() < 0.5 ? 1 : -1,
      face: 1,
    };
    this.monsters.push(m);
    this.events.push({ k: "spawn", u: isoU(x, y), v: isoV(x, y) });
    if (m.maxArmor > 0 && type !== "maestro" && !this.seenArmor) {
      this.seenArmor = true;
      this.events.push({ k: "first", what: "armor" });
    }
    if (m.marked && !this.seenMarked) {
      this.seenMarked = true;
      this.events.push({ k: "first", what: "marked" });
    }
    return m;
  }

  private spawnWave(): void {
    const r = this.room;
    const pool = Object.values(MONSTERS).filter((d) => d.weight > 0 && d.fromRoom <= this.roomI + 1 && d.fromDungeon <= this.dIdx);
    const tw = pool.reduce((s, d) => s + d.weight, 0);
    let pick = this.rng.next() * tw;
    let d = pool[0];
    for (const p of pool) {
      pick -= p.weight;
      if (pick <= 0) {
        d = p;
        break;
      }
    }
    const tri = this.rng.next() < 0.5 && this.spawnLeft >= 3;
    const chord = this.rng.pick(this.st.chords.filter((c) => c.degs.length === 3));
    const degs = tri ? [...chord.degs] : [Math.floor(this.rng.next() * 7)];
    // nasce longe do Tito, dentro da sala
    let x = 0;
    let y = 0;
    for (let k = 0; k < 12; k++) {
      x = r.x0 + 24 + this.rng.next() * (ROOM - 48);
      y = r.y0 + 24 + this.rng.next() * (ROOM - 48);
      if (Math.hypot(x - this.tito.x, y - this.tito.y) > 100) break;
    }
    degs.forEach((deg, j) => {
      if (this.spawnLeft <= 0) return;
      this.spawnLeft--;
      const a = (j / degs.length) * TAU;
      this.spawnAt(d.id, deg, x + Math.cos(a) * (tri ? 12 : 0), y + Math.sin(a) * (tri ? 12 : 0));
    });
  }

  // ---------------------------------------------------------------- dano
  private hurt(m: Monster, dmg: number, du: number, dv: number, show: boolean): void {
    if (m.dead) return;
    const u = isoU(m.x, m.y);
    const v = isoV(m.x, m.y) - MONSTERS[m.type].body;
    let armorHit = false;
    if (m.armor > 0) {
      armorHit = true;
      m.armor -= dmg * this.st.armorDmg;
      if (m.armor <= 0) {
        m.armor = 0;
        m.broken = true;
        m.stun = m.type === "maestro" ? 3 : 1.6;
        this.events.push({ k: "broken", u, v });
      }
    } else m.hp -= dmg * (m.stun > 0 ? 1.5 : 1);
    m.flash = 0.1;
    // empurrão na direção do corte
    const len = Math.hypot(du, dv) || 1;
    const kb = m.type === "maestro" ? 15 : 90 / Math.sqrt(m.r / 6);
    m.kx += (groundX(du, dv) / len) * kb;
    m.ky += (groundY(du, dv) / len) * kb;
    if (show) this.events.push({ k: "hit", u, v, dmg, deg: m.deg, onBeat: this.onBeat(), armor: armorHit });
    if (!m.dead && m.armor <= 0 && this.st.execute > 0 && m.hp > 0 && m.hp / m.maxHp < this.st.execute && m.type !== "maestro") {
      this.events.push({ k: "execute", u, v });
      m.hp = 0;
    }
    if (m.hp <= 0) this.kill(m);
  }

  private kill(m: Monster): void {
    m.dead = true;
    const d = MONSTERS[m.type];
    const pr = Math.pow(this.power, 0.8);
    this.notas += d.notes * pr * this.st.notasMul;
    this.exp += d.exp * pr * this.st.expMul;
    this.kills++;
    this.vigor = Math.min(this.vigorMax, this.vigor + this.st.killVigor);
    if (m.marked || (m.type === "cavaleiro" && this.rng.next() < 0.3)) {
      const c = Math.max(1, Math.round((m.marked ? 1 : 0.5) * this.st.cristaisMul * (1 + this.dIdx * 0.5)));
      this.cristais += c;
      this.events.push({ k: "gain", what: "cristais", n: c });
    }
    if (m.marked) {
      this.vigor = Math.min(this.vigorMax, this.vigor + 20);
      this.events.push({ k: "gain", what: "vigor", n: 20 });
      if (this.st.flow) this.flow += 0.1;
    }
    this.events.push({ k: "kill", u: isoU(m.x, m.y), v: isoV(m.x, m.y) - d.body, deg: m.deg, type: m.type, marked: m.marked });
    if (m.type === "maestro") {
      const p = 1 + this.dIdx;
      this.partituras += p;
      this.events.push({ k: "gain", what: "partituras", n: p });
      for (const o of this.monsters) if (!o.dead && o !== m) this.kill(o);
      this.spawnLeft = 0;
    }
  }

  private slash(m: Monster, du: number, dv: number): void {
    const s = this.stroke;
    const cost = 4 * this.st.hitCost;
    if (this.tired || this.vigor < cost) {
      this.tired = true;
      if (!this.tiredShown) {
        this.tiredShown = true;
        this.events.push({ k: "tired" }, { k: "first", what: "tired" });
      }
      return;
    }
    this.vigor -= cost;
    this.lastHit = this.t;
    const first = !s.ids.has(m.id);
    s.ids.set(m.id, this.t);
    m.hitAt = this.t;
    if (first) s.count++;
    let dmg = 7 * this.st.dmg * this.flow * (1 + this.st.multiHit * (s.count - 1));
    if (this.onBeat()) dmg *= this.st.beatMul;
    if (this.st.gliss && s.len > 260) dmg *= 1 + this.st.gliss;
    this.hurt(m, dmg, du, dv, true);
    if (m.deg >= 0 && first) {
      s.notes.push(m.deg);
      this.checkScale();
      this.checkChord();
    }
  }

  private checkScale(): void {
    if (!this.st.scales) return;
    const n = this.stroke.notes;
    if (n.length < 3) return;
    const [a, b, c] = n.slice(-3);
    if ((b - a + 7) % 7 === 1 && (c - b + 7) % 7 === 1) {
      this.vigor = Math.min(this.vigorMax, this.vigor + 15);
      this.events.push({ k: "scale", u: this.cursor.u, v: this.cursor.v }, { k: "gain", what: "vigor", n: 15 });
    }
  }

  private checkChord(): void {
    const s = this.stroke;
    const set = new Set(s.notes);
    const c = [...this.st.chords].sort((a, b) => b.degs.length - a.degs.length).find((ch) => ch.degs.every((d) => set.has(d)));
    if (!c) return;
    s.notes = [];
    this.chords++;
    const big = c.degs.length > 3;
    const gx = groundX(this.cursor.u, this.cursor.v);
    const gy = groundY(this.cursor.u, this.cursor.v);
    const R = big ? 70 : 50;
    const dmg = 14 * this.st.dmg * this.st.chordMul * (big ? 1.8 : 1) * this.flow;
    for (const m of this.monsters) {
      if (m.dead) continue;
      const dx = m.x - gx;
      const dy = m.y - gy;
      const d = Math.hypot(dx, dy);
      if (d < R + m.r) this.hurt(m, dmg, isoU(dx, dy), isoV(dx, dy), true);
    }
    this.vigor = Math.min(this.vigorMax, this.vigor + 6);
    this.events.push({ k: "chord", u: this.cursor.u, v: this.cursor.v, chord: c });
  }

  /** fim do traço: conta os acertos e reconhece o círculo desenhado */
  private endStroke(): void {
    const s = this.stroke;
    if (s.count >= 2) this.events.push({ k: "acertos", u: s.su, v: s.sv - 14, n: s.count });
    if (this.st.circle && this.circleCd <= 0 && s.pts.length > 8 && s.len > 120) {
      const P = s.pts;
      let turn = 0;
      for (let i = 2; i < P.length; i++) {
        const a1 = Math.atan2(P[i - 1][1] - P[i - 2][1], P[i - 1][0] - P[i - 2][0]);
        const a2 = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]);
        let d = a2 - a1;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        turn += d;
      }
      const close = Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]);
      if (Math.abs(turn) > Math.PI * 1.6 && close < Math.max(40, s.len * 0.25)) {
        let hits = 0;
        for (const m of this.monsters) {
          if (m.dead) continue;
          const u = isoU(m.x, m.y);
          const v = isoV(m.x, m.y) - MONSTERS[m.type].body / 2;
          if (inPoly(u, v, P)) {
            hits++;
            this.hurt(m, 30 * this.st.dmg * this.st.circleDmg * this.flow, 0, 1, true);
          }
        }
        this.circleCd = this.st.circleCd;
        this.events.push({ k: "circle", pts: P.slice(), hits });
      }
    }
    s.on = false;
    s.ids.clear();
    s.count = 0;
    s.notes = [];
    s.pts = [];
    s.len = 0;
  }

  // ---------------------------------------------------------------- passo
  step(dt: number): void {
    if (this.phase === "won" || this.phase === "over") return;
    this.t += dt;
    this.beatT += dt;
    if (this.beatT >= this.period) {
      this.beatT -= this.period;
      this.beatN++;
      this.beat();
    }
    this.circleCd = Math.max(0, this.circleCd - dt);
    this.stepCursor(dt);
    this.stepTito(dt);
    this.stepMonsters(dt);
    this.stepShots(dt);
    this.stepRoom(dt);
    if (this.monsters.some((m) => m.dead)) this.monsters = this.monsters.filter((m) => !m.dead);
  }

  private beat(): void {
    this.events.push({ k: "beat", n: this.beatN });
    this.tito.drum = 0.15;
    for (const m of this.monsters) {
      if (m.dead || m.stun > 0) continue;
      if (m.touching) this.hurtTito(m.dmg);
      if (m.type === "gaiteiro" && this.beatN % 2 === 0 && Math.hypot(m.x - this.tito.x, m.y - this.tito.y) < 110) {
        const dx = this.tito.x - m.x;
        const dy = this.tito.y - m.y;
        const d = Math.hypot(dx, dy) || 1;
        this.shots.push({ x: m.x, y: m.y, vx: (dx / d) * 55, vy: (dy / d) * 55, dmg: m.dmg, life: 4 });
      }
      if (m.type === "maestro") {
        if (this.beatN % 6 === 0) this.waves.push({ x: m.x, y: m.y, r: m.r, hit: false });
        if (this.beatN % 8 === 0 && this.monsters.length < 14)
          for (let i = 0; i < 2; i++) {
            const a = this.rng.range(0, TAU);
            const s = this.spawnAt(this.rng.next() < 0.5 ? "desafinado" : "tamborim", Math.floor(this.rng.next() * 7), m.x + Math.cos(a) * 22, m.y + Math.sin(a) * 22);
            s.kx = Math.cos(a) * 60;
            s.ky = Math.sin(a) * 60;
          }
      }
    }
    if (this.st.batuque && this.beatN % 8 === 0) {
      for (const m of this.monsters) {
        const dx = m.x - this.tito.x;
        const dy = m.y - this.tito.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 55 && m.type !== "maestro") {
          m.kx += (dx / d) * 160;
          m.ky += (dy / d) * 160;
        }
      }
      this.events.push({ k: "batuque" });
    }
  }

  private hurtTito(n: number): void {
    const T = this.tito;
    T.hp -= n;
    T.flash = 0.3;
    this.events.push({ k: "tito", dmg: n });
    if (T.hp <= 0) {
      T.hp = 0;
      this.phase = "over";
      this.events.push({ k: "over" });
    }
  }

  private stepCursor(dt: number): void {
    const c = this.cursor;
    const s = this.stroke;
    if (c.fresh) {
      c.pu = c.u;
      c.pv = c.v;
      c.fresh = false;
    }
    const du = c.u - c.pu;
    const dv = c.v - c.pv;
    const len = Math.hypot(du, dv);
    c.speed = c.speed * 0.6 + (len / Math.max(dt, 1e-4)) * 0.4;
    const cutting = c.active && c.speed > 120;
    if (cutting) {
      if (!s.on) {
        s.on = true;
        s.su = c.pu;
        s.sv = c.pv;
        s.pts = [[c.pu, c.pv]];
      }
      s.quiet = 0;
      s.len += len;
      if (s.pts.length < 400) s.pts.push([c.u, c.v]);
      const W = 5;
      for (const m of this.monsters) {
        if (m.dead || this.ghost(m)) continue;
        const last = s.ids.get(m.id);
        if (last !== undefined && this.t - last < 0.3) continue;
        const body = MONSTERS[m.type].body;
        const mu = isoU(m.x, m.y);
        const mv = isoV(m.x, m.y) - body * 0.6;
        if (segDist(mu, mv, c.pu, c.pv, c.u, c.v) < m.r + body * 0.5 + W) this.slash(m, du, dv);
      }
      for (const sh of this.shots) {
        if (sh.life <= 0) continue;
        const su = isoU(sh.x, sh.y);
        const sv = isoV(sh.x, sh.y) - 6;
        if (segDist(su, sv, c.pu, c.pv, c.u, c.v) < 7) {
          sh.life = 0;
          this.events.push({ k: "parry", u: su, v: sv });
        }
      }
      // ondas do maestro drenam o vigor
      const gx = groundX(c.u, c.v);
      const gy = groundY(c.u, c.v);
      for (const w of this.waves)
        if (!w.hit && Math.abs(Math.hypot(gx - w.x, gy - w.y) - w.r) < 8) {
          w.hit = true;
          this.vigor = Math.max(0, this.vigor - 30);
          this.events.push({ k: "shock" });
        }
    } else if (s.on) {
      s.quiet += dt;
      if (s.quiet > 0.1 || !c.active) this.endStroke();
    }
    c.pu = c.u;
    c.pv = c.v;
    if (this.t - this.lastHit > 0.35) this.vigor = Math.min(this.vigorMax, this.vigor + 30 * this.st.vigorRegen * dt);
    if (this.tired && this.vigor >= this.vigorMax * 0.3) {
      this.tired = false;
      this.tiredShown = false;
    }
  }

  private stepTito(dt: number): void {
    const T = this.tito;
    T.flash = Math.max(0, T.flash - dt);
    T.drum = Math.max(0, T.drum - dt);
    if (this.st.titoRegen) T.hp = Math.min(T.maxHp, T.hp + this.st.titoRegen * dt);
    T.moving = false;
    if (this.phase === "walk" && T.walk.length) {
      const [tx, ty] = T.walk[0];
      const dx = tx - T.x;
      const dy = ty - T.y;
      const d = Math.hypot(dx, dy);
      const sp = 90 * dt;
      T.moving = true;
      if (d <= sp) {
        T.x = tx;
        T.y = ty;
        T.walk.shift();
        if (!T.walk.length) this.enterRoom(this.roomI + 1);
      } else {
        T.x += (dx / d) * sp;
        T.y += (dy / d) * sp;
      }
    }
  }

  private stepMonsters(dt: number): void {
    const T = this.tito;
    const r = this.room;
    for (const m of this.monsters) {
      if (m.dead) continue;
      m.age += dt;
      m.flash = Math.max(0, m.flash - dt);
      m.stun = Math.max(0, m.stun - dt);
      if (m.stun <= 0 && m.broken && m.type === "maestro") {
        // o maestro se recompõe
        m.armor = m.maxArmor * 0.6;
        m.broken = false;
      }
      const dx = T.x - m.x;
      const dy = T.y - m.y;
      const d = Math.hypot(dx, dy) || 1;
      let vx = 0;
      let vy = 0;
      const pulse = 0.55 + 0.9 * Math.exp(-(this.beatT / this.period) * 4);
      if (m.stun <= 0 && m.age > 0.5) {
        let sp = m.speed * pulse;
        if (m.type === "gaiteiro" && d < 80) {
          vx = (-dy / d) * m.orbit * 14 - (dx / d) * 10;
          vy = (dx / d) * m.orbit * 14 - (dy / d) * 10;
          sp = 0;
        }
        vx += (dx / d) * sp;
        vy += (dy / d) * sp;
      }
      const reach = TITO_R + m.r;
      m.touching = d <= reach + 1 && m.stun <= 0;
      if (m.touching) vx = vy = 0;
      if (Math.abs(vx) + Math.abs(m.kx) > 0.5) m.face = isoU(vx + m.kx, vy + m.ky) >= 0 ? 1 : -1;
      m.x += (vx + m.kx) * dt;
      m.y += (vy + m.ky) * dt;
      const k = Math.max(0, 1 - 7 * dt);
      m.kx *= k;
      m.ky *= k;
      const nd = Math.hypot(m.x - T.x, m.y - T.y) || 1;
      if (nd < reach) {
        m.x = T.x + ((m.x - T.x) / nd) * reach;
        m.y = T.y + ((m.y - T.y) / nd) * reach;
      }
      m.x = clamp(m.x, r.x0 + m.r + 4, r.x0 + ROOM - m.r - 4);
      m.y = clamp(m.y, r.y0 + m.r + 4, r.y0 + ROOM - m.r - 4);
    }
    const M = this.monsters;
    for (let i = 0; i < M.length; i++)
      for (let j = i + 1; j < M.length; j++) {
        const a = M[i];
        const b = M[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rr = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const p = (rr - d) * 0.5;
        a.x -= (dx / d) * p;
        a.y -= (dy / d) * p;
        b.x += (dx / d) * p;
        b.y += (dy / d) * p;
      }
    for (const w of this.waves) w.r += 120 * dt;
    if (this.waves.length) this.waves = this.waves.filter((w) => w.r < ROOM * 1.2);
  }

  private stepShots(dt: number): void {
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life > 0 && Math.hypot(s.x - this.tito.x, s.y - this.tito.y) < TITO_R + 3) {
        s.life = 0;
        this.hurtTito(s.dmg);
      }
    }
    if (this.shots.some((s) => s.life <= 0)) this.shots = this.shots.filter((s) => s.life > 0);
  }

  private stepRoom(dt: number): void {
    if (this.phase !== "fight") return;
    const r = this.room;
    const cap = 8 + this.roomI + this.dIdx;
    this.spawnT -= dt;
    if (this.spawnLeft > 0 && this.spawnT <= 0 && this.monsters.length < cap) {
      this.spawnWave();
      this.spawnT = this.rng.range(0.7, 1.6);
    }
    if (this.spawnLeft <= 0 && this.monsters.length === 0) {
      r.cleared = true;
      const e = Math.round(50 * Math.pow(this.power, 0.8) * this.st.expMul);
      this.exp += e;
      this.events.push({ k: "roomClear", i: this.roomI }, { k: "gain", what: "exp", n: e });
      this.vigor = this.vigorMax;
      if (!r.next) {
        this.phase = "won";
        this.events.push({ k: "won" });
        return;
      }
      // Tito caminha até a porta e entra na próxima sala
      const [nx, ny] = r.next;
      const cx = r.x0 + ROOM / 2;
      const cy = r.y0 + ROOM / 2;
      this.tito.walk = [
        [cx, cy],
        [cx + (nx * ROOM) / 2, cy + (ny * ROOM) / 2],
        [cx + nx * ROOM, cy + ny * ROOM],
      ];
      this.phase = "walk";
      this.shots = [];
      this.waves = [];
    }
  }

  /** progresso da sala (0..1) para a barra azul */
  roomProgress(): number {
    if (this.phase !== "fight") return 1;
    const left = this.spawnLeft + this.monsters.length;
    return clamp(1 - left / Math.max(1, this.spawnTotal), 0, 1);
  }
}

export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

export function inPoly(x: number, y: number, P: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i];
    const [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi) inside = !inside;
  }
  return inside;
}
