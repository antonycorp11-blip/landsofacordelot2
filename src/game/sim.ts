import { TAU, clamp } from "../core/math";
import { Rng } from "../core/rng";
import { BOSS_FORMS, DUNGEONS, KEYS, MONSTERS, PROPS, SKILLS, dungeonPower, type ChordDef, type DungeonDef, type KeyDef, type MonsterId, type PropId, type SkillId } from "../data/content";
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

export type RoomKind = "fight" | "hall" | "boss";

export interface Prop {
  id: number;
  type: PropId;
  x: number;
  y: number;
  hp: number;
  hitAt: number;
  flash: number;
  dead: boolean;
}

export interface Chest {
  x: number;
  y: number;
  chord: ChordDef;
  lit: boolean[];
  open: boolean;
}

export interface Room {
  gx: number;
  gy: number;
  x0: number;
  y0: number;
  kind: RoomKind;
  cleared: boolean;
  visited: boolean;
  boss: boolean;
  next: [number, number] | null;
  props: Prop[];
  chest: Chest | null;
  memory: { x: number; y: number; taken: boolean; text: string } | null;
  /** página do diário do maestro */
  scroll: { x: number; y: number; taken: boolean; text: string } | null;
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
  dead: boolean;
  touching: boolean;
  orbit: number;
  face: number;
  trailAt: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
  /** nota: tiro comum · tecla: tecla de piano · batuta: batuta arremessada · lustre: cai do teto */
  kind: "nota" | "tecla" | "batuta" | "lustre";
  hp: number;
  /** altura (só o lustre) */
  z: number;
  hitAt: number;
}

export interface Wave {
  x: number;
  y: number;
  r: number;
  hit: boolean;
}

/** ataque anunciado do chefe: área marcada no chão que explode depois de um tempo */
export interface Tele {
  kind: "rect" | "circle";
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  t: number;
  max: number;
  dmg: number;
}

export interface Pickup {
  id: number;
  x: number;
  y: number;
  kind: "nota" | "cristal" | "coracao" | "vigor" | "partitura";
  v: number;
  age: number;
}

export type Phase = "explore" | "fight" | "transit" | "won" | "over";

export type SimEvent =
  | { k: "beat"; n: number }
  | { k: "hit"; u: number; v: number; dmg: number; deg: number; onBeat: boolean; armor: boolean; trail: boolean }
  | { k: "broken"; u: number; v: number }
  | { k: "execute"; u: number; v: number }
  | { k: "kill"; u: number; v: number; deg: number; type: MonsterId; marked: boolean; notes: number }
  | { k: "acertos"; u: number; v: number; n: number }
  | { k: "chord"; u: number; v: number; chord: ChordDef }
  | { k: "scale"; u: number; v: number }
  | { k: "circle"; pts: [number, number][]; hits: number }
  | { k: "tired" }
  | { k: "parry"; u: number; v: number }
  | { k: "tito"; dmg: number }
  | { k: "shock" }
  | { k: "spawn"; u: number; v: number }
  | { k: "gain"; what: "vigor" | "exp" | "cristais" | "partituras" | "notas" | "vida"; n: number }
  | { k: "roomClear"; i: number }
  | { k: "enter"; i: number; kind: RoomKind; fightNo: number }
  | { k: "first"; what: "armor" | "marked" | "tired" | "chest" | "props" }
  | { k: "prop"; u: number; v: number; type: PropId; broke: boolean }
  | { k: "lock"; u: number; v: number; deg: number }
  | { k: "chest"; u: number; v: number }
  | { k: "memory"; text: string }
  | { k: "scroll"; text: string }
  | { k: "skill"; id: SkillId }
  | { k: "pancada"; u: number; v: number }
  | { k: "strike"; u: number; v: number; hit: boolean }
  | { k: "won" }
  | { k: "over" };

const MEM_TAKE = 14;

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
  phase: Phase = "explore";
  tito = { x: 0, y: 0, hp: 100, maxHp: 100, flash: 0, drum: 0, moving: false, face: 1, tx: NaN, ty: NaN, dx: 0, dy: 0, path: [] as [number, number][] };
  monsters: Monster[] = [];
  shots: Shot[] = [];
  waves: Wave[] = [];
  teles: Tele[] = [];
  pickups: Pickup[] = [];
  embers: { x: number; y: number; life: number }[] = [];
  trail: { u1: number; v1: number; u2: number; v2: number; t: number }[] = [];
  spawnLeft = 0;
  spawnTotal = 0;
  spawnT = 0;
  cursor = { u: 0, v: 0, pu: 0, pv: 0, active: false, fresh: true, speed: 0 };
  stroke = { on: false, quiet: 0, ids: new Map<number, number>(), count: 0, notes: [] as number[], pts: [] as [number, number][], len: 0, su: 0, sv: 0 };
  vigor = 100;
  vigorMax = 100;
  tired = false;
  lastHit = -9;
  flow = 1;
  circleCd = 0;
  prismT = 0;
  skillCd: Record<SkillId, number> = { rufar: 0, forte: 0, pancada: 0, metro: 0 };
  skillT: Record<SkillId, number> = { rufar: 0, forte: 0, pancada: 0, metro: 0 };
  notas = 0;
  cristais = 0;
  partituras = 0;
  exp = 0;
  kills = 0;
  chords = 0;
  fightNo = 0;
  events: SimEvent[] = [];
  private nextId = 1;
  private tiredShown = false;
  private seen = new Set<string>();

  constructor(
    readonly st: Stats,
    readonly dIdx: number,
    seed: number,
    readonly memories: string[] = [],
    readonly diary: string[] = [],
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

  /** salões de exploração e salas de luta alternados; a última é a do chefe */
  private buildDungeon(): void {
    const fights = this.dungeon.rooms;
    const n = fights * 2 + 2;
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
      const free = dirs.filter(([dx, dy]) => !used.has(`${cx + dx},${cy + dy}`));
      const pref = free.filter(([dx, dy]) => dx >= 0 && dy >= 0);
      const pick = pref.length && this.rng.next() < 0.75 ? this.rng.pick(pref) : free.length ? this.rng.pick(free) : dirs[0];
      const c: [number, number] = [cx + pick[0], cy + pick[1]];
      used.add(`${c[0]},${c[1]}`);
      cells.push(c);
    }
    let mem = 0;
    let dia = 0;
    // páginas do diário espalhadas pelos salões, a última na antessala do palco
    const halls = cells.map((_, i) => i).filter((i) => i !== n - 1 && i % 2 === 0 && i > 0);
    const D = Math.min(this.diary.length, halls.length);
    const diaryAt = new Set(Array.from({ length: D }, (_, k) => halls[Math.round(((k + 1) * (halls.length - 1)) / D)]));
    this.rooms = cells.map(([gx, gy], i) => {
      const kind: RoomKind = i === n - 1 ? "boss" : i % 2 === 0 ? "hall" : "fight";
      const r: Room = {
        gx,
        gy,
        x0: gx * ROOM,
        y0: gy * ROOM,
        kind,
        cleared: kind === "hall",
        visited: i === 0,
        boss: kind === "boss",
        next: i < n - 1 ? [cells[i + 1][0] - gx, cells[i + 1][1] - gy] : null,
        props: [],
        chest: null,
        memory: null,
        scroll: null,
      };
      const prev = i > 0 ? [cells[i - 1][0] - gx, cells[i - 1][1] - gy] : null;
      this.furnish(r, prev as [number, number] | null);
      if (kind === "hall" && mem < this.memories.length && i > 0) {
        const p = this.freeSpot(r, prev as [number, number] | null, 50);
        r.memory = { x: p.x, y: p.y, taken: false, text: this.memories[mem++] };
      }
      if (kind === "hall" && dia < D && diaryAt.has(i)) {
        const p = this.freeSpot(r, prev as [number, number] | null, 40);
        r.scroll = { x: p.x, y: p.y, taken: false, text: this.diary[dia++] };
      }
      return r;
    });
  }

  private doorPoint(r: Room, d: [number, number]): { x: number; y: number } {
    return { x: r.x0 + ROOM / 2 + (d[0] * ROOM) / 2, y: r.y0 + ROOM / 2 + (d[1] * ROOM) / 2 };
  }

  private freeSpot(r: Room, prev: [number, number] | null, avoidCenter: number): { x: number; y: number } {
    for (let k = 0; k < 40; k++) {
      const x = r.x0 + 26 + this.rng.next() * (ROOM - 52);
      const y = r.y0 + 26 + this.rng.next() * (ROOM - 52);
      if (Math.hypot(x - r.x0 - ROOM / 2, y - r.y0 - ROOM / 2) < avoidCenter) continue;
      const doors = [r.next, prev].filter(Boolean) as [number, number][];
      if (doors.some((d) => Math.hypot(x - this.doorPoint(r, d).x, y - this.doorPoint(r, d).y) < 50)) continue;
      if (r.props.some((p) => Math.hypot(p.x - x, p.y - y) < 20)) continue;
      if (r.chest && Math.hypot(r.chest.x - x, r.chest.y - y) < 30) continue;
      return { x, y };
    }
    return { x: r.x0 + 40, y: r.y0 + 40 };
  }

  private furnish(r: Room, prev: [number, number] | null): void {
    if (r.kind === "boss") return;
    if (r.kind === "hall" && this.rng.next() < 0.8) {
      const p = this.freeSpot(r, prev, 30);
      const c = this.rng.pick(this.st.chords);
      r.chest = { x: p.x, y: p.y, chord: c, lit: c.degs.map(() => false), open: false };
    }
    const n = r.kind === "hall" ? 9 + Math.floor(this.rng.next() * 5) : 3 + Math.floor(this.rng.next() * 3);
    const types: PropId[] = ["caixote", "barril", "vaso", "vaso", "partituras", "caixamusica"];
    for (let i = 0; i < n; i++) {
      const p = this.freeSpot(r, prev, 36);
      const type = this.rng.pick(types);
      r.props.push({ id: this.nextId++, type, x: p.x, y: p.y, hp: PROPS[type].hp, hitAt: -9, flash: 0, dead: false });
    }
  }

  get room(): Room {
    return this.rooms[this.roomI];
  }

  private enterRoom(i: number): void {
    this.roomI = i;
    const r = this.rooms[i];
    r.visited = true;
    this.flow = 1;
    this.teles = [];
    if (r.kind === "hall") this.phase = "explore";
    else {
      this.phase = "fight";
      if (r.kind === "fight") this.fightNo++;
      const fi = this.fightNo;
      const base = r.boss ? 4 + this.dIdx : 14 + 6 * (fi - 1) + 3 * this.dIdx;
      this.spawnLeft = this.spawnTotal = Math.round(base * this.st.spawnMul);
      this.spawnT = 1.2;
      if (r.boss) this.spawnAt("maestro", -1, r.x0 + ROOM * 0.5, r.y0 + ROOM * 0.22);
    }
    this.events.push({ k: "enter", i, kind: r.kind, fightNo: this.fightNo });
  }

  // ---------------------------------------------------------------- entrada
  setCursor(u: number, v: number, active: boolean): void {
    const c = this.cursor;
    if (!active || !c.active) c.fresh = true;
    c.u = u;
    c.v = v;
    c.active = active;
  }

  /** andar até um ponto do chão (clique / toque) */
  moveTo(x: number, y: number): void {
    if (this.phase !== "explore") return;
    this.tito.tx = x;
    this.tito.ty = y;
  }

  /** andar numa direção (teclado), em coordenadas da tela */
  moveDir(sx: number, sy: number): void {
    // tela → mundo isométrico
    const len = Math.hypot(sx, sy);
    if (len < 0.01 || this.phase !== "explore") {
      this.tito.dx = this.tito.dy = 0;
      return;
    }
    const u = sx / len;
    const v = sy / len / 2;
    const x = groundX(u, v);
    const y = groundY(u, v);
    const l2 = Math.hypot(x, y) || 1;
    this.tito.dx = x / l2;
    this.tito.dy = y / l2;
    this.tito.tx = NaN;
  }

  useSkill(id: SkillId): boolean {
    if (!this.st.skills.includes(id) || this.skillCd[id] > 0 || this.phase === "won" || this.phase === "over") return false;
    const d = SKILLS.find((s) => s.id === id)!;
    this.skillCd[id] = id === "rufar" ? this.st.rufarCd : d.cd;
    this.skillT[id] = id === "rufar" ? this.st.rufarDur : d.dur;
    if (id === "pancada") {
      const T = this.tito;
      for (const m of this.monsters) {
        const dx = m.x - T.x;
        const dy = m.y - T.y;
        const dd = Math.hypot(dx, dy) || 1;
        if (dd < 75) {
          if (m.type !== "maestro") {
            m.kx += (dx / dd) * 240;
            m.ky += (dy / dd) * 240;
            m.stun = Math.max(m.stun, 2);
          } else m.stun = Math.max(m.stun, 0.8);
        }
      }
      this.events.push({ k: "pancada", u: isoU(T.x, T.y), v: isoV(T.x, T.y) });
    }
    this.tito.drum = 0.4;
    this.events.push({ k: "skill", id });
    return true;
  }

  // ---------------------------------------------------------------- ritmo
  onBeat(): boolean {
    if (this.skillT.rufar > 0) return true;
    const w = 0.1 * this.st.beatWindow;
    return this.beatT < w || this.period - this.beatT < w;
  }

  ghost(m: Monster): boolean {
    return m.type === "corista" && this.beatT / this.period < 0.5;
  }

  private slowMul(): number {
    return this.skillT.metro > 0 ? 0.35 : 1;
  }

  // ---------------------------------------------------------------- monstros
  spawnAt(type: MonsterId, deg: number, x: number, y: number): Monster {
    const d = MONSTERS[type];
    const boss = type === "maestro";
    const form = BOSS_FORMS[this.dIdx];
    const mul = this.power * (boss ? 1.5 : 1 + 0.38 * Math.max(0, this.fightNo - 1));
    const hp = (boss ? form.hp : d.hp) * mul;
    const armor = (boss ? form.armor : d.armor) * mul;
    const m: Monster = {
      id: this.nextId++,
      type,
      deg,
      x,
      y,
      kx: 0,
      ky: 0,
      hp,
      maxHp: hp,
      armor,
      maxArmor: armor,
      r: d.r,
      speed: d.speed * (1 + 0.04 * this.fightNo) * (1 + 0.06 * this.dIdx),
      dmg: d.dmg * 1.6 * Math.pow(this.power, 0.8) * (1 + 0.08 * Math.max(0, this.fightNo - 1)),
      marked: !boss && this.rng.next() < this.st.markChance,
      stun: 0,
      broken: false,
      flash: 0,
      age: 0,
      dead: false,
      touching: false,
      orbit: this.rng.next() < 0.5 ? 1 : -1,
      face: 1,
      trailAt: -9,
    };
    this.monsters.push(m);
    this.events.push({ k: "spawn", u: isoU(x, y), v: isoV(x, y) });
    if (m.maxArmor > 0 && !boss && !this.seen.has("armor")) {
      this.seen.add("armor");
      this.events.push({ k: "first", what: "armor" });
    }
    if (m.marked && !this.seen.has("marked")) {
      this.seen.add("marked");
      this.events.push({ k: "first", what: "marked" });
    }
    return m;
  }

  private spawnWave(): void {
    const r = this.room;
    const pool = Object.values(MONSTERS).filter((d) => d.weight > 0 && d.fromRoom <= Math.max(1, this.fightNo) && d.fromDungeon <= this.dIdx);
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

  // ---------------------------------------------------------------- saque
  private drop(x: number, y: number, kind: Pickup["kind"], v: number): void {
    const a = this.rng.range(0, TAU);
    const d = this.rng.range(4, 16);
    this.pickups.push({ id: this.nextId++, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, kind, v, age: 0 });
  }

  private lootPile(x: number, y: number, base: number): void {
    const pr = Math.pow(this.power, 0.8) * this.st.lootMul;
    const notes = Math.max(1, Math.round(base * pr * this.st.notasMul));
    const parts = Math.min(5, notes);
    for (let i = 0; i < parts; i++) this.drop(x, y, "nota", notes / parts);
    const roll = this.rng.next();
    if (roll < 0.14 * this.st.lootMul) this.drop(x, y, "cristal", Math.max(1, Math.round(this.st.cristaisMul * (1 + this.dIdx * 0.5))));
    else if (roll < 0.26) this.drop(x, y, "coracao", 1);
    else if (roll < 0.4) this.drop(x, y, "vigor", 1);
  }

  private breakProp(p: Prop): void {
    p.dead = true;
    this.lootPile(p.x, p.y, PROPS[p.type].loot);
    if (!this.seen.has("props")) {
      this.seen.add("props");
      this.events.push({ k: "first", what: "props" });
    }
  }

  private openChest(c: Chest): void {
    c.open = true;
    const pr = Math.pow(this.power, 0.8) * this.st.lootMul;
    for (let i = 0; i < 8; i++) this.drop(c.x, c.y, "nota", Math.round(4 * pr * this.st.notasMul));
    const cr = Math.max(1, Math.round((2 + this.dIdx) * this.st.cristaisMul * this.st.lootMul));
    this.drop(c.x, c.y, "cristal", cr);
    if (this.dIdx > 0 && this.rng.next() < 0.25) this.drop(c.x, c.y, "partitura", 1);
    this.drop(c.x, c.y, "coracao", 1);
    this.events.push({ k: "chest", u: isoU(c.x, c.y), v: isoV(c.x, c.y) - 10 });
  }

  // ---------------------------------------------------------------- dano
  private hurt(m: Monster, dmg: number, du: number, dv: number, show: boolean, trail = false): void {
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
    const len = Math.hypot(du, dv) || 1;
    const kb = m.type === "maestro" ? 12 : trail ? 30 : 90 / Math.sqrt(m.r / 6);
    m.kx += (groundX(du, dv) / len) * kb;
    m.ky += (groundY(du, dv) / len) * kb;
    if (show) this.events.push({ k: "hit", u, v, dmg, deg: m.deg, onBeat: !trail && this.onBeat(), armor: armorHit, trail });
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
    const notes = d.notes * pr * this.st.notasMul;
    this.notas += notes;
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
    this.events.push({ k: "kill", u: isoU(m.x, m.y), v: isoV(m.x, m.y) - d.body, deg: m.deg, type: m.type, marked: m.marked, notes });
    if (m.type === "maestro") {
      const p = 1 + this.dIdx;
      this.partituras += p;
      this.events.push({ k: "gain", what: "partituras", n: p });
      for (const o of this.monsters) if (!o.dead && o !== m) this.kill(o);
      this.spawnLeft = 0;
      this.teles = [];
      this.shots = [];
    }
  }

  private cutDamage(): number {
    let d = 7 * this.st.dmg * this.flow;
    if (this.skillT.forte > 0) d *= 2;
    return d;
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
    if (first) s.count++;
    let dmg = this.cutDamage() * (1 + this.st.multiHit * (s.count - 1));
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
    if (this.st.prisma) this.prismT = 2;
    const big = c.degs.length > 3;
    const gx = groundX(this.cursor.u, this.cursor.v);
    const gy = groundY(this.cursor.u, this.cursor.v);
    const R = big ? 70 : 50;
    const dmg = 14 * this.st.dmg * this.st.chordMul * (big ? 1.8 : 1) * this.flow * (this.skillT.forte > 0 ? 2 : 1);
    for (const m of this.monsters) {
      if (m.dead) continue;
      const dx = m.x - gx;
      const dy = m.y - gy;
      if (Math.hypot(dx, dy) < R + m.r) this.hurt(m, dmg, isoU(dx, dy), isoV(dx, dy), true);
    }
    this.vigor = Math.min(this.vigorMax, this.vigor + 6);
    this.events.push({ k: "chord", u: this.cursor.u, v: this.cursor.v, chord: c });
  }

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
          if (inPoly(isoU(m.x, m.y), isoV(m.x, m.y) - MONSTERS[m.type].body / 2, P)) {
            hits++;
            this.hurt(m, 30 * this.st.dmg * this.st.circleDmg * this.flow, 0, 1, true);
          }
        }
        this.circleCd = this.st.circleCd;
        this.events.push({ k: "circle", pts: P.slice(), hits });
      }
    }
    // cadeados do baú só contam no mesmo traço
    const ch = this.room.chest;
    if (ch && !ch.open) ch.lit = ch.lit.map(() => false);
    s.on = false;
    s.ids.clear();
    s.count = 0;
    s.notes = [];
    s.pts = [];
    s.len = 0;
  }

  /** posição (plano iso) dos cadeados de nota do baú */
  lockPos(c: Chest, i: number): { u: number; v: number } {
    const n = c.lit.length;
    return { u: isoU(c.x, c.y) + (i - (n - 1) / 2) * 15, v: isoV(c.x, c.y) - 24 - Math.abs(i - (n - 1) / 2) * -3 };
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
    this.prismT = Math.max(0, this.prismT - dt);
    for (const k of Object.keys(this.skillCd) as SkillId[]) {
      this.skillCd[k] = Math.max(0, this.skillCd[k] - dt);
      this.skillT[k] = Math.max(0, this.skillT[k] - dt);
    }
    this.stepCursor(dt);
    this.stepTrail(dt);
    this.stepTito(dt);
    this.stepMonsters(dt);
    this.stepShots(dt);
    this.stepTeles(dt);
    this.stepPickups(dt);
    this.stepRoom(dt);
    if (this.monsters.some((m) => m.dead)) this.monsters = this.monsters.filter((m) => !m.dead);
    const r = this.room;
    if (r.props.some((p) => p.dead)) r.props = r.props.filter((p) => !p.dead);
  }

  private beat(): void {
    this.events.push({ k: "beat", n: this.beatN });
    this.tito.drum = Math.max(this.tito.drum, 0.15);
    const boss = this.monsters.find((m) => m.type === "maestro");
    for (const m of this.monsters) {
      if (m.dead || m.stun > 0) continue;
      if (m.touching) this.hurtTito(m.dmg);
      if (m.type === "gaiteiro" && this.beatN % 2 === 0 && Math.hypot(m.x - this.tito.x, m.y - this.tito.y) < 110) {
        const dx = this.tito.x - m.x;
        const dy = this.tito.y - m.y;
        const d = Math.hypot(dx, dy) || 1;
        this.shots.push({ x: m.x, y: m.y, vx: (dx / d) * 55, vy: (dy / d) * 55, dmg: m.dmg, life: 4, kind: "nota", hp: 1, z: 0, hitAt: -9 });
      }
    }
    if (boss && boss.stun <= 0) this.bossBeat(boss);
  }

  /** padrões de ataque de cada forma do Trítono */
  private bossBeat(b: Monster): void {
    const n = this.beatN;
    const T = this.tito;
    const r = this.room;
    const angry = b.hp < b.maxHp / 2;
    const form = this.dIdx;
    const summon = () => {
      if (this.monsters.length >= 12) return;
      for (let i = 0; i < 2; i++) {
        const a = this.rng.range(0, TAU);
        const s = this.spawnAt(this.rng.next() < 0.5 ? "desafinado" : "tamborim", Math.floor(this.rng.next() * 7), b.x + Math.cos(a) * 26, b.y + Math.sin(a) * 26);
        s.kx = Math.cos(a) * 60;
        s.ky = Math.sin(a) * 60;
      }
    };
    const toward = (kind: Shot["kind"], k: number, spread: number, speed: number, hp: number, dmg: number) => {
      const base = Math.atan2(T.y - b.y, T.x - b.x);
      for (let i = 0; i < k; i++) {
        const a = base + (i - (k - 1) / 2) * spread;
        this.shots.push({ x: b.x, y: b.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, life: 7, kind, hp, z: 0, hitAt: -9 });
      }
    };
    // teclas de piano voando em leque (2 cortes cada)
    const keys = () => toward("tecla", angry ? 5 : 3, 0.28, 46, 2, b.dmg * 0.6);
    const volley = (k: number) => {
      for (let i = 0; i < k; i++) {
        const a = (i / k) * TAU + n * 0.3;
        this.shots.push({ x: b.x, y: b.y, vx: Math.cos(a) * 44, vy: Math.sin(a) * 44, dmg: b.dmg * 0.4, life: 6, kind: "nota", hp: 1, z: 0, hitAt: -9 });
      }
    };
    // lustre cai sobre o Tito: corte-o antes de chegar ao chão (3 cortes)
    const drop = (k: number) => {
      for (let i = 0; i < k; i++) {
        const ox = i === 0 ? 0 : this.rng.range(-30, 30);
        const oy = i === 0 ? 0 : this.rng.range(-30, 30);
        this.shots.push({ x: clamp(T.x + ox, r.x0 + 20, r.x0 + ROOM - 20), y: clamp(T.y + oy, r.y0 + 20, r.y0 + ROOM - 20), vx: 0, vy: 0, dmg: i === 0 ? b.dmg * 1.2 : 0, life: 99, kind: "lustre", hp: 3, z: 110, hitAt: -9 });
      }
    };
    const batons = () => toward("batuta", angry ? 3 : 1, 0.35, 70, 1, b.dmg * 0.5);
    if (n % (angry ? 6 : 8) === 0) summon();
    switch (form) {
      case 0:
        if (n % 6 === 0) this.waves.push({ x: b.x, y: b.y, r: b.r, hit: false });
        if (n % 3 === 0) batons();
        break;
      case 1:
        if (n % (angry ? 3 : 4) === 0) keys();
        break;
      case 2:
        if (n % (angry ? 2 : 3) === 0) volley(angry ? 12 : 8);
        if (n % 8 === 4) this.waves.push({ x: b.x, y: b.y, r: b.r, hit: false });
        break;
      case 3:
        if (n % 3 === 0) drop(angry ? 3 : 1);
        if (n % 7 === 0) volley(6);
        break;
      default:
        if (n % 6 === 0) keys();
        else if (n % 6 === 3) volley(angry ? 12 : 8);
        if (n % 4 === 2) drop(angry ? 2 : 1);
        if (n % 9 === 0) this.waves.push({ x: b.x, y: b.y, r: b.r, hit: false });
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
      if (len > 0.5) this.trail.push({ u1: c.pu, v1: c.pv, u2: c.u, v2: c.v, t: this.t });
      const W = 5 * this.st.width * (this.skillT.forte > 0 ? 1.6 : 1);
      for (const m of this.monsters) {
        if (m.dead || this.ghost(m)) continue;
        const last = s.ids.get(m.id);
        if (last !== undefined && this.t - last < 0.3) continue;
        const body = MONSTERS[m.type].body;
        if (segDist(isoU(m.x, m.y), isoV(m.x, m.y) - body * 0.6, c.pu, c.pv, c.u, c.v) < m.r + body * 0.5 + W) this.slash(m, du, dv);
      }
      this.cutProps(c.pu, c.pv, c.u, c.v, W);
      for (const sh of this.shots) {
        if (sh.life <= 0 || this.t - sh.hitAt < 0.2) continue;
        const su = isoU(sh.x, sh.y);
        const sv = isoV(sh.x, sh.y) - 6 - sh.z;
        const rad = sh.kind === "lustre" ? 14 : sh.kind === "tecla" ? 9 : 7;
        if (segDist(su, sv, c.pu, c.pv, c.u, c.v) < rad + W) {
          sh.hitAt = this.t;
          sh.hp--;
          if (sh.hp <= 0) sh.life = 0;
          this.events.push({ k: "parry", u: su, v: sv });
        }
      }
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

  /** a batuta quebra objetos e acende os cadeados do baú */
  private cutProps(u1: number, v1: number, u2: number, v2: number, W: number): void {
    const r = this.room;
    for (const p of r.props) {
      if (p.dead || this.t - p.hitAt < 0.25) continue;
      if (segDist(isoU(p.x, p.y), isoV(p.x, p.y) - 6, u1, v1, u2, v2) < PROPS[p.type].r + W) {
        p.hitAt = this.t;
        p.hp--;
        p.flash = 0.12;
        this.events.push({ k: "prop", u: isoU(p.x, p.y), v: isoV(p.x, p.y) - 6, type: p.type, broke: p.hp <= 0 });
        if (p.hp <= 0) this.breakProp(p);
      }
    }
    const ch = r.chest;
    if (ch && !ch.open) {
      ch.lit.forEach((lit, i) => {
        if (lit) return;
        const lp = this.lockPos(ch, i);
        if (segDist(lp.u, lp.v, u1, v1, u2, v2) < 6 + W) {
          ch.lit[i] = true;
          this.events.push({ k: "lock", u: lp.u, v: lp.v, deg: ch.chord.degs[i] });
          if (ch.lit.every(Boolean)) this.openChest(ch);
        }
      });
    }
  }

  /** o rastro continua cortando por um instante */
  private stepTrail(dt: number): void {
    const life = this.st.trailTime;
    while (this.trail.length && this.t - this.trail[0].t > Math.max(0.12, life)) this.trail.shift();
    if (this.st.trailDmg > 0) {
      const W = 4 * this.st.width;
      const dmg = this.cutDamage() * this.st.trailDmg * (this.prismT > 0 ? 1.5 : 1);
      for (const seg of this.trail) {
        if (this.t - seg.t < 0.04) continue;
        for (const m of this.monsters) {
          if (m.dead || this.ghost(m) || this.t - m.trailAt < 0.25) continue;
          const body = MONSTERS[m.type].body;
          if (segDist(isoU(m.x, m.y), isoV(m.x, m.y) - body * 0.6, seg.u1, seg.v1, seg.u2, seg.v2) < m.r + body * 0.4 + W) {
            m.trailAt = this.t;
            this.hurt(m, dmg, seg.u2 - seg.u1, seg.v2 - seg.v1, true, true);
            if (this.st.estelar) this.vigor = Math.min(this.vigorMax, this.vigor + 1.5);
          }
        }
      }
      if (this.st.brasa && this.trail.length && this.rng.next() < 0.25) {
        const s = this.trail[this.trail.length - 1];
        this.embers.push({ x: groundX(s.u2, s.v2), y: groundY(s.u2, s.v2), life: 1.4 });
      }
    }
    for (const e of this.embers) {
      e.life -= dt;
      for (const m of this.monsters)
        if (!m.dead && Math.hypot(m.x - e.x, m.y - e.y) < m.r + 6 && this.t - m.trailAt > 0.3) {
          m.trailAt = this.t;
          this.hurt(m, this.cutDamage() * 0.25, 0, 0, true, true);
        }
    }
    if (this.embers.length) this.embers = this.embers.filter((e) => e.life > 0);
    void dt;
  }

  private stepTito(dt: number): void {
    const T = this.tito;
    const r = this.room;
    T.flash = Math.max(0, T.flash - dt);
    T.drum = Math.max(0, T.drum - dt);
    if (this.st.titoRegen) T.hp = Math.min(T.maxHp, T.hp + this.st.titoRegen * dt);
    T.moving = false;
    const sp = 78 * this.st.titoSpeed * (this.phase === "fight" ? 0.9 : 1) * dt;
    if (this.phase === "transit") {
      const [tx, ty] = T.path[0];
      const dx = tx - T.x;
      const dy = ty - T.y;
      const d = Math.hypot(dx, dy);
      T.moving = true;
      T.face = isoU(dx, dy) >= 0 ? 1 : -1;
      if (d <= sp * 1.2) {
        T.x = tx;
        T.y = ty;
        T.path.shift();
        if (!T.path.length) this.enterRoom(this.roomI + 1);
      } else {
        T.x += (dx / d) * sp * 1.2;
        T.y += (dy / d) * sp * 1.2;
      }
      return;
    }
    let mx = 0;
    let my = 0;
    if (this.phase !== "explore") {
      T.tx = NaN;
      T.dx = T.dy = 0;
    }
    if (T.dx || T.dy) {
      mx = T.dx;
      my = T.dy;
    } else if (!isNaN(T.tx)) {
      const dx = T.tx - T.x;
      const dy = T.ty - T.y;
      const d = Math.hypot(dx, dy);
      if (d < 2) T.tx = NaN;
      else {
        mx = dx / d;
        my = dy / d;
        if (d < sp) {
          mx *= d / sp;
          my *= d / sp;
        }
      }
    }
    if (mx || my) {
      T.moving = true;
      T.x += mx * sp;
      T.y += my * sp;
      T.face = isoU(mx, my) >= 0 ? 1 : -1;
    }
    // objetos bloqueiam a passagem
    for (const p of r.props) {
      const rr = PROPS[p.type].r + TITO_R;
      const dx = T.x - p.x;
      const dy = T.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < rr && d > 0) {
        T.x = p.x + (dx / d) * rr;
        T.y = p.y + (dy / d) * rr;
      }
    }
    if (r.chest) {
      const dx = T.x - r.chest.x;
      const dy = T.y - r.chest.y;
      const d = Math.hypot(dx, dy);
      if (d < 14 && d > 0) {
        T.x = r.chest.x + (dx / d) * 14;
        T.y = r.chest.y + (dy / d) * 14;
      }
    }
    T.x = clamp(T.x, r.x0 + 10, r.x0 + ROOM - 10);
    T.y = clamp(T.y, r.y0 + 10, r.y0 + ROOM - 10);
    // memórias da Clara espalhadas pelos salões
    const mem = r.memory;
    if (mem && !mem.taken && Math.hypot(T.x - mem.x, T.y - mem.y) < MEM_TAKE) {
      mem.taken = true;
      this.events.push({ k: "memory", text: mem.text });
    }
    const sc = r.scroll;
    if (sc && !sc.taken && Math.hypot(T.x - sc.x, T.y - sc.y) < MEM_TAKE) {
      sc.taken = true;
      this.events.push({ k: "scroll", text: sc.text });
    }
    // porta aberta: o Tito segue para a próxima sala
    if (this.phase === "explore" && r.next) {
      const dp = this.doorPoint(r, r.next);
      if (Math.hypot(T.x - dp.x, T.y - dp.y) < 30) this.goNext();
    }
  }

  /** caminha até a próxima sala: salões param na entrada; nas lutas o Tito vai para o centro e fica parado */
  private goNext(): void {
    const r = this.room;
    const T = this.tito;
    if (!r.next) return;
    const dp = this.doorPoint(r, r.next);
    const nr = this.rooms[this.roomI + 1];
    const inner: [number, number] = nr.kind === "hall" ? [nr.x0 + ROOM / 2 - r.next[0] * (ROOM / 2 - 40), nr.y0 + ROOM / 2 - r.next[1] * (ROOM / 2 - 40)] : [nr.x0 + ROOM / 2, nr.y0 + ROOM / 2];
    T.path = [[dp.x, dp.y], inner];
    T.tx = NaN;
    T.dx = T.dy = 0;
    this.phase = "transit";
    this.pickups = [];
  }

  /** ponto da porta de saída da sala atual (para indicar o caminho) */
  exitDoor(): { x: number; y: number } | null {
    const r = this.room;
    return r.next ? this.doorPoint(r, r.next) : null;
  }

  private stepMonsters(dt: number): void {
    const T = this.tito;
    const r = this.room;
    const slow = this.slowMul();
    for (const m of this.monsters) {
      if (m.dead) continue;
      m.age += dt;
      m.flash = Math.max(0, m.flash - dt);
      m.stun = Math.max(0, m.stun - dt);
      if (m.stun <= 0 && m.broken && m.type === "maestro") {
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
        let sp = m.speed * pulse * slow;
        if (m.type === "gaiteiro" && d < 80) {
          vx = ((-dy / d) * m.orbit * 14 - (dx / d) * 10) * slow;
          vy = ((dx / d) * m.orbit * 14 - (dy / d) * 10) * slow;
          sp = 0;
        }
        if (m.type === "maestro" && d < 60) sp *= 0.2;
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
    for (const w of this.waves) w.r += 120 * dt * slow;
    if (this.waves.length) this.waves = this.waves.filter((w) => w.r < ROOM * 1.2);
  }

  private stepShots(dt: number): void {
    const slow = this.slowMul();
    for (const s of this.shots) {
      if (s.kind === "lustre") {
        s.z -= 62 * dt * slow;
        if (s.z <= 0 && s.life > 0) {
          s.life = 0;
          const hit = s.dmg > 0 && Math.hypot(s.x - this.tito.x, s.y - this.tito.y) < 26;
          this.events.push({ k: "strike", u: isoU(s.x, s.y), v: isoV(s.x, s.y), hit });
          if (hit) this.hurtTito(s.dmg);
        }
        continue;
      }
      s.x += s.vx * dt * slow;
      s.y += s.vy * dt * slow;
      s.life -= dt;
      if (s.life > 0 && Math.hypot(s.x - this.tito.x, s.y - this.tito.y) < TITO_R + 3) {
        s.life = 0;
        this.hurtTito(s.dmg);
      }
    }
    if (this.shots.some((s) => s.life <= 0)) this.shots = this.shots.filter((s) => s.life > 0);
  }

  private stepTeles(dt: number): void {
    const T = this.tito;
    for (const t of this.teles) {
      t.t -= dt * this.slowMul();
      if (t.t > 0) continue;
      const inside = t.kind === "rect" ? T.x > t.x && T.x < t.x + t.w && T.y > t.y && T.y < t.y + t.h : Math.hypot(T.x - t.x, T.y - t.y) < t.r;
      const cx = t.kind === "rect" ? t.x + t.w / 2 : t.x;
      const cy = t.kind === "rect" ? t.y + t.h / 2 : t.y;
      this.events.push({ k: "strike", u: isoU(cx, cy), v: isoV(cx, cy), hit: inside });
      if (inside) this.hurtTito(t.dmg);
    }
    if (this.teles.some((t) => t.t <= 0)) this.teles = this.teles.filter((t) => t.t > 0);
  }

  private stepPickups(dt: number): void {
    const T = this.tito;
    for (const p of this.pickups) {
      p.age += dt;
      if (p.age < 0.4) continue;
      const dx = T.x - p.x;
      const dy = T.y - p.y;
      const d = Math.hypot(dx, dy);
      const mag = this.phase === "explore" && this.room.kind === "fight" ? 999 : this.st.magnet;
      if (d < mag) {
        const sp = 170 * dt;
        p.x += (dx / (d || 1)) * Math.min(d, sp);
        p.y += (dy / (d || 1)) * Math.min(d, sp);
      }
      if (d < 8) {
        p.age = -999;
        switch (p.kind) {
          case "nota":
            this.notas += p.v;
            this.events.push({ k: "gain", what: "notas", n: Math.round(p.v) });
            break;
          case "cristal":
            this.cristais += p.v;
            this.events.push({ k: "gain", what: "cristais", n: p.v });
            break;
          case "partitura":
            this.partituras += 1;
            this.events.push({ k: "gain", what: "partituras", n: 1 });
            break;
          case "coracao": {
            const h = Math.round(T.maxHp * 0.2);
            T.hp = Math.min(T.maxHp, T.hp + h);
            this.events.push({ k: "gain", what: "vida", n: h });
            break;
          }
          default:
            this.vigor = Math.min(this.vigorMax, this.vigor + 30);
            this.events.push({ k: "gain", what: "vigor", n: 30 });
        }
      }
    }
    if (this.pickups.some((p) => p.age < 0)) this.pickups = this.pickups.filter((p) => p.age >= 0);
  }

  private clearT = 0;
  private stepRoom(dt: number): void {
    if (this.phase === "explore" && this.room.kind === "fight") {
      this.clearT -= dt;
      if (this.clearT <= 0 && this.pickups.length === 0) this.goNext();
      return;
    }
    if (this.phase !== "fight") return;
    const r = this.room;
    const cap = 8 + this.fightNo + this.dIdx * 2;
    this.spawnT -= dt;
    if (this.spawnLeft > 0 && this.spawnT <= 0 && this.monsters.length < cap) {
      this.spawnWave();
      this.spawnT = this.rng.range(0.6, 1.4);
    }
    if (this.spawnLeft <= 0 && this.monsters.length === 0) {
      r.cleared = true;
      const e = Math.round(50 * Math.pow(this.power, 0.8) * this.st.expMul);
      this.exp += e;
      this.events.push({ k: "roomClear", i: this.roomI }, { k: "gain", what: "exp", n: e });
      this.vigor = this.vigorMax;
      this.shots = [];
      this.waves = [];
      this.teles = [];
      if (r.boss) {
        this.phase = "won";
        this.events.push({ k: "won" });
        return;
      }
      // sala de luta limpa: o Tito segue sozinho para a próxima antessala
      this.phase = "explore";
      this.clearT = 1.6;
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
