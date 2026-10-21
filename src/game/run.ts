import { clamp } from "../core/math";
import { Rng } from "../core/rng";
import { ALIENS, BOARD, RUN, UNITS, type AlienDef, type AlienId, type UnitDef, type UnitId } from "../data/content";
import type { Stats } from "./profile";

export interface Unit {
  id: number;
  def: UnitDef;
  row: number;
  col: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cd: number;
  anim: number;
  flash: number;
  armed: boolean;
  recoil: number;
}

export interface Alien {
  id: number;
  def: AlienDef;
  row: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shell: number;
  maxShell: number;
  slowT: number;
  burnT: number;
  burnDps: number;
  biting: boolean;
  jumped: boolean;
  jumpT: number;
  spitCd: number;
  hitFlash: number;
  slashCd: number;
  anim: number;
  boss: boolean;
  dead: boolean;
  scale: number;
}

export interface Bolt {
  x: number;
  y: number;
  row: number;
  dmg: number;
  kind: "plasma" | "cryo" | "acid" | "missile";
  vx: number;
  /** míssil: alvo e progresso */
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  t: number;
  dur: number;
  dead: boolean;
}

export interface Orb {
  id: number;
  x: number;
  y: number;
  groundY: number;
  vy: number;
  value: number;
  life: number;
  age: number;
  collected: boolean;
}

export interface Drone {
  row: number;
  state: "ready" | "running" | "used";
  x: number;
  redeployed: boolean;
}

export type RunEvent =
  | { type: "hit"; x: number; y: number; dmg: number; crit?: boolean; color?: string }
  | { type: "death"; x: number; y: number; alien: AlienId; scrap: number; boss: boolean }
  | { type: "boom"; x: number; y: number; r: number; color: string }
  | { type: "laser"; row: number; x0: number }
  | { type: "zap"; pts: { x: number; y: number }[] }
  | { type: "orb"; x: number; y: number; value: number }
  | { type: "breach"; row: number }
  | { type: "drone"; row: number }
  | { type: "wave"; wave: number; final: boolean }
  | { type: "place"; x: number; y: number }
  | { type: "unitDown"; x: number; y: number }
  | { type: "overheat" };

export interface Card {
  id: UnitId;
  cd: number;
  max: number;
}

export interface RunState {
  sector: number;
  stats: Stats;
  wave: number;
  totalWaves: number;
  /** contagem antes da primeira onda */
  prep: number;
  waveGap: number;
  spawnQueue: { t: number; alien: AlienId; row: number; boss: boolean }[];
  waveTime: number;
  energy: number;
  baseHp: number;
  grid: (Unit | null)[][];
  aliens: Alien[];
  bolts: Bolt[];
  orbs: Orb[];
  drones: Drone[];
  cards: Card[];
  heat: number;
  overheated: boolean;
  skyT: number;
  scrap: number;
  kills: number;
  status: "playing" | "won" | "lost";
  time: number;
  nextId: number;
  events: RunEvent[];
  rng: Rng;
  wavesCleared: number;
}

export const tileX = (col: number) => BOARD.left + col * BOARD.tile + BOARD.tile / 2;
export const tileY = (row: number) => BOARD.top + row * BOARD.tile + BOARD.tile * 0.62;
export const BOARD_RIGHT = BOARD.left + BOARD.cols * BOARD.tile;
export const SPAWN_X = BOARD_RIGHT + 70;
export const BASE_X = BOARD.left - 24;

export function sectorHp(sector: number): number {
  return Math.pow(RUN.hpGrowth, sector - 1);
}

export function sectorReward(sector: number): number {
  return Math.pow(RUN.rewardGrowth, sector - 1);
}

/** Composição de uma onda por orçamento de pontos. */
export function buildWave(sector: number, wave: number, total: number, seed: number): { alien: AlienId; row: number; t: number; boss: boolean }[] {
  const rng = new Rng(seed + sector * 7919 + wave * 104729);
  const final = wave === total;
  // começo calmo (dá tempo de montar a economia) e pressão crescente por onda e por setor
  const budget = Math.round(2 + wave * 2.4 * (1 + (sector - 1) * 0.3) + (final ? 5 + sector : 0));
  // alienígenas novos do setor só entram a partir da 3ª onda
  const pool = (Object.values(ALIENS) as AlienDef[]).filter((a) => a.id !== "colossus" && (a.fromSector < sector || (a.fromSector === sector && (wave >= 3 || a.id === "crawler"))));
  const list: { alien: AlienId; row: number; t: number; boss: boolean }[] = [];
  let left = budget;
  const dur = 14 + wave * 2.2;
  while (left > 0) {
    const options = pool.filter((a) => a.points <= left);
    if (!options.length) break;
    const a = rng.pick(options);
    left -= a.points;
    if (a.id === "swarm") {
      const row = Math.floor(rng.next() * BOARD.rows);
      const t = rng.next() * dur;
      for (let k = 0; k < 3; k++) list.push({ alien: "swarm", row, t: t + k * 0.5, boss: false });
    } else list.push({ alien: a.id, row: Math.floor(rng.next() * BOARD.rows), t: rng.next() * dur, boss: false });
  }
  if (final) list.push({ alien: "colossus", row: Math.floor(rng.next() * BOARD.rows), t: dur * 0.55, boss: true });
  else if (sector >= 3 && wave === Math.floor(total / 2)) list.push({ alien: "colossus", row: Math.floor(rng.next() * BOARD.rows), t: dur * 0.7, boss: false });
  // primeiras ondas do primeiro setor: só pela frente mais calma
  return list.sort((a, b) => a.t - b.t);
}

export function newRun(sector: number, stats: Stats, loadout: UnitId[]): RunState {
  return {
    sector,
    stats,
    wave: 0,
    totalWaves: RUN.wavesPerSector,
    prep: 14,
    waveGap: 0,
    spawnQueue: [],
    waveTime: 0,
    energy: stats.startEnergy,
    baseHp: stats.baseHp,
    grid: Array.from({ length: BOARD.rows }, () => new Array(BOARD.cols).fill(null)),
    aliens: [],
    bolts: [],
    orbs: [],
    drones: Array.from({ length: BOARD.rows }, (_, row) => ({ row, state: "ready" as const, x: BASE_X, redeployed: false })),
    cards: loadout.filter((id) => stats.unlocked.includes(id)).map((id) => ({ id, cd: id === "generator" || id === "blaster" ? 0 : UNITS[id].recharge * 0.4, max: UNITS[id].recharge * stats.recharge })),
    heat: 0,
    overheated: false,
    skyT: 4,
    scrap: 0,
    kills: 0,
    status: "playing",
    time: 0,
    nextId: 1,
    events: [],
    rng: new Rng(sector * 31 + 7),
    wavesCleared: 0,
  };
}

export function unitCost(r: RunState, id: UnitId): number {
  return Math.round(UNITS[id].cost * r.stats.costMul);
}

export function canPlace(r: RunState, cardIdx: number, row: number, col: number): boolean {
  const c = r.cards[cardIdx];
  if (!c || c.cd > 0 || r.status !== "playing") return false;
  if (row < 0 || col < 0 || row >= BOARD.rows || col >= BOARD.cols || r.grid[row][col]) return false;
  return r.energy >= unitCost(r, c.id);
}

export function place(r: RunState, cardIdx: number, row: number, col: number): boolean {
  if (!canPlace(r, cardIdx, row, col)) return false;
  const c = r.cards[cardIdx];
  const def = UNITS[c.id];
  r.energy -= unitCost(r, c.id);
  c.cd = c.max;
  const hp = def.hp * r.stats.unitHp;
  r.grid[row][col] = { id: r.nextId++, def, row, col, x: tileX(col), y: tileY(row), hp, maxHp: hp, cd: def.id === "generator" ? 4 : def.id === "mine" ? def.rate : 0.6, anim: 0, flash: 0, armed: false, recoil: 0 };
  r.events.push({ type: "place", x: tileX(col), y: tileY(row) });
  return true;
}

export function removeUnit(r: RunState, row: number, col: number): boolean {
  if (!r.grid[row]?.[col]) return false;
  r.grid[row][col] = null;
  return true;
}

function spawnAlien(r: RunState, id: AlienId, row: number, boss: boolean): void {
  const def = ALIENS[id];
  const hpMul = sectorHp(r.sector) * (boss ? 1 : 1) * (id === "colossus" && r.sector === 1 ? 0.55 : 1);
  const hp = def.hp * hpMul;
  const shell = (def.shell ?? 0) * hpMul;
  r.aliens.push({
    id: r.nextId++,
    def,
    row,
    x: SPAWN_X + r.rng.next() * 30,
    y: tileY(row),
    hp,
    maxHp: hp,
    shell,
    maxShell: shell,
    slowT: 0,
    burnT: 0,
    burnDps: 0,
    biting: false,
    jumped: false,
    jumpT: 0,
    spitCd: 1,
    hitFlash: 0,
    slashCd: 0,
    anim: r.rng.next() * 10,
    boss,
    dead: false,
    scale: boss ? 1.25 : 1,
  });
}

function spawnOrb(r: RunState, x: number, y: number, fromSky: boolean): void {
  r.orbs.push({ id: r.nextId++, x, y: fromSky ? BOARD.top - 40 : y - 30, groundY: y, vy: fromSky ? 60 : -120, value: RUN.orbValue, life: RUN.orbLife, age: 0, collected: false });
}

/** Aplica dano: carapaça primeiro, depois vida. */
export function hurt(r: RunState, a: Alien, dmg: number, color?: string, crit = false): void {
  if (a.dead || dmg <= 0) return;
  let d = dmg;
  if (a.shell > 0) {
    const absorbed = Math.min(a.shell, d);
    a.shell -= absorbed;
    d -= absorbed;
  }
  a.hp -= d;
  a.hitFlash = 0.1;
  r.events.push({ type: "hit", x: a.x, y: a.y - a.def.radius, dmg, crit, color });
  if (a.hp <= 0) {
    a.dead = true;
    const scrap = a.def.reward * sectorReward(r.sector) * r.stats.scrapMul;
    r.scrap += scrap;
    r.kills++;
    r.energy += r.stats.killEnergy;
    r.events.push({ type: "death", x: a.x, y: a.y, alien: a.def.id, scrap, boss: a.boss });
  }
}

/** Unidade à frente do alienígena, na mesma fileira, encostada. */
function blocker(r: RunState, a: Alien): Unit | null {
  const row = r.grid[a.row];
  let best: Unit | null = null;
  for (const u of row) {
    if (!u || u.def.id === "mine") continue;
    const gap = a.x - u.x;
    if (gap > -10 && gap < a.def.radius + 30 && (!best || u.x > best.x)) best = u;
  }
  return best;
}

function aliensInRow(r: RunState, row: number): Alien[] {
  return r.aliens.filter((a) => !a.dead && a.row === row && a.x < SPAWN_X + 20);
}

export function step(r: RunState, dt: number): void {
  if (r.status !== "playing") return;
  r.time += dt;
  const st = r.stats;

  // cartas
  for (const c of r.cards) c.cd = Math.max(0, c.cd - dt);
  // lâmina esfria
  r.heat = Math.max(0, r.heat - RUN.heatDecay * dt);
  if (r.overheated && r.heat <= RUN.overheatResume) r.overheated = false;

  // ondas
  if (r.prep > 0) {
    r.prep -= dt;
    if (r.prep <= 0) startNextWave(r);
  } else {
    r.waveTime += dt;
    while (r.spawnQueue.length && r.spawnQueue[0].t <= r.waveTime) {
      const s = r.spawnQueue.shift()!;
      spawnAlien(r, s.alien, s.row, s.boss);
    }
    const alive = r.aliens.some((a) => !a.dead);
    if (!r.spawnQueue.length && !alive) {
      if (r.wave >= r.totalWaves) {
        r.wavesCleared = r.wave;
        r.status = "won";
        return;
      }
      if (r.waveGap <= 0) {
        r.wavesCleared = r.wave;
        r.waveGap = 5;
      }
      r.waveGap -= dt;
      if (r.waveGap <= 0) startNextWave(r);
    } else if (!r.spawnQueue.length && r.waveTime > 40 + r.wave * 3 && r.wave < r.totalWaves) {
      // não deixa a missão travar com um alienígena teimoso
      r.wavesCleared = r.wave;
      startNextWave(r);
    }
  }

  // energia do céu
  r.skyT -= dt;
  if (r.skyT <= 0) {
    r.skyT = RUN.skyOrbEvery + r.rng.next() * 3;
    const col = Math.floor(r.rng.next() * BOARD.cols);
    const row = Math.floor(r.rng.next() * BOARD.rows);
    spawnOrb(r, tileX(col) + (r.rng.next() - 0.5) * 40, tileY(row), true);
  }
  for (const o of r.orbs) {
    o.age += dt;
    if (o.collected) continue;
    if (o.vy > 0 && o.y < o.groundY - 20) o.y += o.vy * dt;
    else if (o.vy < 0) {
      o.y += o.vy * dt;
      o.vy += 260 * dt;
      if (o.vy > 0) o.vy = 0;
    }
    o.life -= dt;
    if (st.bladeMagnet && o.age > 1.2) collectOrb(r, o);
  }
  r.orbs = r.orbs.filter((o) => !o.collected && o.life > 0);

  // unidades
  for (const row of r.grid)
    for (const u of row) {
      if (!u) continue;
      u.anim += dt;
      u.flash = Math.max(0, u.flash - dt);
      u.recoil = Math.max(0, u.recoil - dt * 4);
      u.cd -= dt * (u.def.id === "generator" ? st.genSpeed : 1);
      unitAct(r, u);
    }

  // projéteis
  for (const b of r.bolts) {
    if (b.kind === "missile") {
      b.t += dt;
      const k = Math.min(1, b.t / b.dur);
      b.x = b.sx + (b.tx - b.sx) * k;
      b.y = b.sy + (b.ty - b.sy) * k - Math.sin(k * Math.PI) * 140;
      if (k >= 1) {
        b.dead = true;
        for (const a of r.aliens) if (!a.dead && Math.abs(a.row - b.row) <= 1 && Math.abs(a.x - b.tx) < 110) hurt(r, a, b.dmg, "#ffb020");
        r.events.push({ type: "boom", x: b.tx, y: b.ty, r: 130, color: "#ffb020" });
      }
      continue;
    }
    if (b.kind === "acid") {
      b.x += b.vx * dt;
      const u = r.grid[b.row].find((x) => x && Math.abs(x.x - b.x) < 30);
      if (u) {
        u.hp -= b.dmg;
        u.flash = 0.15;
        b.dead = true;
        if (u.hp <= 0) killUnit(r, u);
      }
      if (b.x < BOARD.left) b.dead = true;
      continue;
    }
    b.x += b.vx * dt;
    if (b.x > SPAWN_X + 40) b.dead = true;
    for (const a of r.aliens) {
      if (a.dead || a.row !== b.row || a.jumpT > 0) continue;
      if (Math.abs(a.x - b.x) < a.def.radius * a.scale) {
        hurt(r, a, b.dmg, b.kind === "cryo" ? "#a8f0ff" : "#4ae0ff");
        if (b.kind === "cryo") a.slowT = 3;
        b.dead = true;
        break;
      }
    }
  }
  r.bolts = r.bolts.filter((b) => !b.dead);

  // alienígenas
  for (const a of r.aliens) {
    if (a.dead) continue;
    a.anim += dt;
    a.hitFlash = Math.max(0, a.hitFlash - dt);
    a.slashCd = Math.max(0, a.slashCd - dt);
    if (a.burnT > 0) {
      a.burnT -= dt;
      hurt(r, a, a.burnDps * dt);
      if (a.dead) continue;
    }
    if (a.slowT > 0) a.slowT -= dt;
    const slow = a.slowT > 0 ? 0.5 : 1;
    if (a.jumpT > 0) {
      a.jumpT -= dt;
      a.x -= (150 / 0.7) * dt;
      continue;
    }
    // cuspidor ataca de longe
    if (a.def.id === "spitter") {
      const target = r.grid[a.row].filter((u) => u && u.x < a.x && a.x - u.x < 320).sort((p, q) => q!.x - p!.x)[0];
      if (target) {
        a.biting = true;
        a.spitCd -= dt;
        if (a.spitCd <= 0) {
          a.spitCd = 2.2;
          r.bolts.push({ x: a.x - 20, y: a.y - 30, row: a.row, dmg: 60 * sectorHp(r.sector) ** 0.5, kind: "acid", vx: -320, tx: 0, ty: 0, sx: 0, sy: 0, t: 0, dur: 0, dead: false });
        }
        continue;
      }
    }
    const u = blocker(r, a);
    if (u) {
      if (a.def.id === "jumper" && !a.jumped) {
        a.jumped = true;
        a.jumpT = 0.7;
        continue;
      }
      a.biting = true;
      u.hp -= a.def.bite * dt * Math.sqrt(sectorHp(r.sector));
      u.flash = 0.08;
      if (u.hp <= 0) killUnit(r, u);
      continue;
    }
    a.biting = false;
    a.x -= a.def.speed * slow * dt;
    if (a.x <= BASE_X + 10) breach(r, a);
  }

  // drones de contenção (cortadores das fileiras)
  for (const d of r.drones) {
    if (d.state !== "running") continue;
    d.x += 620 * dt;
    for (const a of r.aliens) if (!a.dead && a.row === d.row && Math.abs(a.x - d.x) < 50) hurt(r, a, 1e9, "#fff");
    if (d.x > SPAWN_X + 60) {
      d.state = st.droneRedeploy && !d.redeployed ? "ready" : "used";
      if (d.state === "ready") {
        d.redeployed = true;
        d.x = BASE_X;
      }
    }
  }
  r.aliens = r.aliens.filter((a) => !a.dead);
  if (r.baseHp <= 0) r.status = "lost";
}

function breach(r: RunState, a: Alien): void {
  const d = r.drones[a.row];
  if (d.state === "ready") {
    d.state = "running";
    d.x = BASE_X;
    r.events.push({ type: "drone", row: a.row });
    return;
  }
  if (d.state === "running") return;
  a.dead = true;
  r.baseHp -= a.boss ? 2 : 1;
  r.events.push({ type: "breach", row: a.row });
}

function killUnit(r: RunState, u: Unit): void {
  r.grid[u.row][u.col] = null;
  r.events.push({ type: "unitDown", x: u.x, y: u.y });
}

function unitAct(r: RunState, u: Unit): void {
  const st = r.stats;
  const dmg = u.def.damage * st.unitDmg;
  switch (u.def.id) {
    case "generator":
      if (u.cd <= 0) {
        u.cd = u.def.rate;
        u.recoil = 1;
        spawnOrb(r, u.x, u.y, false);
      }
      return;
    case "mine":
      if (!u.armed && u.cd <= 0) u.armed = true;
      if (u.armed) {
        const hit = r.aliens.find((a) => !a.dead && a.row === u.row && Math.abs(a.x - u.x) < 45 && a.jumpT <= 0);
        if (hit) {
          for (const a of r.aliens) if (!a.dead && a.row === u.row && Math.abs(a.x - u.x) < 90) hurt(r, a, dmg, "#ff8a3a");
          r.events.push({ type: "boom", x: u.x, y: u.y, r: 100, color: "#ff8a3a" });
          r.grid[u.row][u.col] = null;
        }
      }
      return;
    case "wall":
      return;
  }
  if (u.cd > 0) return;
  const ahead = aliensInRow(r, u.row).filter((a) => a.x > u.x - 20);
  switch (u.def.id) {
    case "blaster":
    case "cryo":
    case "double": {
      if (!ahead.length) return;
      u.cd = u.def.rate;
      u.recoil = 1;
      const kind = u.def.id === "cryo" ? "cryo" : "plasma";
      const shots = u.def.id === "double" ? 2 : 1;
      for (let k = 0; k < shots; k++) r.bolts.push({ x: u.x + 30 - k * 26, y: u.y - 38, row: u.row, dmg, kind, vx: 640, tx: 0, ty: 0, sx: 0, sy: 0, t: 0, dur: 0, dead: false });
      return;
    }
    case "laser": {
      if (!ahead.length) return;
      u.cd = u.def.rate;
      u.recoil = 1;
      for (const a of ahead) hurt(r, a, dmg, "#ff4a8a");
      r.events.push({ type: "laser", row: u.row, x0: u.x + 30 });
      return;
    }
    case "tesla": {
      const cands = r.aliens.filter((a) => !a.dead && Math.abs(a.row - u.row) <= 1 && a.x > u.x - 60 && a.x - u.x < 340 && a.x < SPAWN_X);
      if (!cands.length) return;
      u.cd = u.def.rate;
      u.recoil = 1;
      cands.sort((p, q) => Math.hypot(p.x - u.x, p.y - u.y) - Math.hypot(q.x - u.x, q.y - u.y));
      const pts = [{ x: u.x, y: u.y - 60 }];
      let cur = cands[0];
      const hitSet = new Set<number>();
      for (let k = 0; k < 4 && cur; k++) {
        hitSet.add(cur.id);
        hurt(r, cur, dmg * (1 - k * 0.15), "#c08aff");
        pts.push({ x: cur.x, y: cur.y - cur.def.radius });
        const from = cur;
        cur = r.aliens.filter((a) => !a.dead && !hitSet.has(a.id) && Math.hypot(a.x - from.x, a.y - from.y) < 170).sort((p, q) => Math.hypot(p.x - from.x, p.y - from.y) - Math.hypot(q.x - from.x, q.y - from.y))[0];
      }
      r.events.push({ type: "zap", pts });
      return;
    }
    case "mortar": {
      const targets = r.aliens.filter((a) => !a.dead && a.x < SPAWN_X);
      if (!targets.length) return;
      u.cd = u.def.rate;
      u.recoil = 1;
      const t = targets.sort((p, q) => p.x - q.x)[0];
      const lead = t.x - t.def.speed * 0.9;
      r.bolts.push({ x: u.x, y: u.y - 50, row: t.row, dmg, kind: "missile", vx: 0, tx: lead, ty: t.y, sx: u.x, sy: u.y - 50, t: 0, dur: 0.9, dead: false });
      return;
    }
  }
}

export function startNextWave(r: RunState): void {
  r.wave++;
  r.waveTime = 0;
  r.waveGap = 0;
  r.spawnQueue = buildWave(r.sector, r.wave, r.totalWaves, 12345);
  r.events.push({ type: "wave", wave: r.wave, final: r.wave === r.totalWaves });
}

/** Pula a contagem inicial ou a pausa entre ondas. */
export function callWaveNow(r: RunState): void {
  if (r.prep > 0) {
    r.prep = 0;
    startNextWave(r);
  } else if (r.waveGap > 0) {
    r.waveGap = 0;
    startNextWave(r);
  }
}

export function collectOrb(r: RunState, o: Orb): void {
  if (o.collected) return;
  o.collected = true;
  r.energy += o.value;
  r.events.push({ type: "orb", x: o.x, y: o.y, value: o.value });
}

export function collectAt(r: RunState, x: number, y: number, radius = 34): boolean {
  let any = false;
  for (const o of r.orbs) if (!o.collected && Math.hypot(o.x - x, o.y - y) < radius) {
    collectOrb(r, o);
    any = true;
  }
  return any;
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/**
 * Corte do cursor entre dois pontos: fere alienígenas tocados pelo traço,
 * aquece a lâmina, salta em arco e coleta energia pelo caminho.
 */
export function slash(r: RunState, ax: number, ay: number, bx: number, by: number): number {
  if (r.status !== "playing") return 0;
  const st = r.stats;
  // o traço sempre coleta células
  for (const o of r.orbs) if (!o.collected && distToSeg(o.x, o.y, ax, ay, bx, by) < 30) collectOrb(r, o);
  if (r.overheated) return 0;
  const width = RUN.slashWidth * st.bladeWidth;
  let hits = 0;
  for (const a of r.aliens) {
    if (a.dead || a.slashCd > 0) continue;
    const cy = a.y - a.def.radius * a.scale * 0.8;
    if (distToSeg(a.x, cy, ax, ay, bx, by) > a.def.radius * a.scale + width) continue;
    const crit = r.rng.next() < st.bladeCrit;
    const dmg = RUN.slashDamage * st.bladeDmg * Math.sqrt(sectorHp(r.sector)) * (crit ? 3 : 1);
    a.slashCd = RUN.slashCooldown;
    hurt(r, a, dmg, crit ? "#ffe14a" : "#ffffff", crit);
    if (st.bladeBurn > 0 && !a.dead) {
      a.burnT = 2;
      a.burnDps = (dmg * st.bladeBurn) / 2;
    }
    hits++;
    // arco voltaico
    let from = a;
    const chained = new Set([a.id]);
    for (let k = 0; k < st.bladeChain; k++) {
      const next = r.aliens.filter((o) => !o.dead && !chained.has(o.id) && Math.hypot(o.x - from.x, o.y - from.y) < 160).sort((p, q) => Math.hypot(p.x - from.x, p.y - from.y) - Math.hypot(q.x - from.x, q.y - from.y))[0];
      if (!next) break;
      chained.add(next.id);
      hurt(r, next, dmg * 0.6, "#c08aff");
      r.events.push({ type: "zap", pts: [{ x: from.x, y: from.y - 30 }, { x: next.x, y: next.y - 30 }] });
      from = next;
    }
    r.heat += RUN.heatPerHit * st.bladeHeat;
    if (r.heat >= 100) {
      r.heat = 100;
      r.overheated = true;
      r.events.push({ type: "overheat" });
      break;
    }
  }
  return hits;
}

/** Sucata final da missão (abates + bônus por ondas e por vitória). */
export function finalScrap(r: RunState, firstClear: boolean): { kills: number; waves: number; victory: number; total: number } {
  const g = sectorReward(r.sector) * r.stats.scrapMul;
  const waves = r.wavesCleared * 4 * g;
  const victory = r.status === "won" ? (firstClear ? 60 : 25) * g : 0;
  return { kills: r.scrap, waves, victory, total: r.scrap + waves + victory };
}
