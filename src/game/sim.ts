import { TAU, angleDiff, clamp } from "../core/math";
import { Rng } from "../core/rng";
import { BALANCE, ENEMIES, LENSES, LIT_TOWER_HASTE, TOWERS, beamStats, type EnemyKind } from "../data/content";
import { damageMult, earn, enemyHp, enemyReward, incomePerSec, oilMult, towerDamage, towerRange } from "./economy";
import { islandShape } from "./island";
import type { Enemy, GameState, Runtime } from "./state";

/** Ponto (x,y) com raio r está dentro do cone de luz? */
export function inBeam(angle: number, halfAngle: number, reach: number, x: number, y: number, r = 0): boolean {
  const d = Math.hypot(x, y);
  if (d > reach + r) return false;
  if (d < r) return true;
  const a = Math.atan2(y, x);
  const pad = Math.atan2(r, Math.max(1, d));
  return Math.abs(angleDiff(a, angle)) <= halfAngle + pad;
}

/** Ângulos dos feixes atuais (o prisma divide em três). */
export function beamAngles(s: GameState, rt: Runtime): number[] {
  if (s.lens === "prism") return [rt.beamAngle, rt.beamAngle + TAU / 3, rt.beamAngle - TAU / 3];
  return [rt.beamAngle];
}

/** Composição determinística de uma onda. */
export function waveComposition(seed: number, wave: number): EnemyKind[] {
  const rng = new Rng(seed ^ (wave * 2654435761));
  const boss = wave % BALANCE.bossEvery === 0;
  const count = Math.min(70, 6 + Math.floor(wave * 1.25)) - (boss ? 4 : 0);
  const pool: [EnemyKind, number][] = [["eel", 5]];
  if (wave >= ENEMIES.crab.fromWave) pool.push(["crab", 2.4]);
  if (wave >= ENEMIES.jelly.fromWave) pool.push(["jelly", 2]);
  if (wave >= ENEMIES.siren.fromWave) pool.push(["siren", 1.1]);
  const total = pool.reduce((a, p) => a + p[1], 0);
  const list: EnemyKind[] = [];
  for (let i = 0; i < count; i++) {
    let r = rng.next() * total;
    for (const [k, w] of pool) {
      r -= w;
      if (r <= 0) {
        list.push(k);
        break;
      }
    }
  }
  if (boss) list.splice(Math.floor(list.length / 2), 0, "kraken");
  return list;
}

export function startWave(s: GameState, rt: Runtime): void {
  rt.spawnList = waveComposition(s.seed + s.island * 97, s.wave);
  rt.spawnInterval = clamp(1.15 - s.wave * 0.012, 0.3, 1.15);
  rt.spawnTimer = 0;
  rt.phase = "spawning";
  rt.events.push({ type: "wave", wave: s.wave, boss: s.wave % BALANCE.bossEvery === 0 });
}

function spawn(s: GameState, rt: Runtime, kind: EnemyKind): void {
  const rng = Math.random;
  const def = ENEMIES[kind];
  const angle = rng() * TAU;
  const hp = enemyHp(kind, s.wave, s.island);
  rt.enemies.push({
    id: rt.nextId++,
    kind,
    def,
    angle,
    dist: rt.spawnRadius,
    x: Math.cos(angle) * rt.spawnRadius,
    y: Math.sin(angle) * rt.spawnRadius,
    hp,
    maxHp: hp,
    slowT: 0,
    slowMul: 1,
    burnT: 0,
    burnDps: 0,
    lit: false,
    glow: 0,
    wob: rng() * TAU,
    boss: kind === "kraken",
    dead: false,
    hitFlash: 0,
  });
  rt.events.push({ type: "spawn", x: Math.cos(angle) * rt.spawnRadius, y: Math.sin(angle) * rt.spawnRadius });
}

/** Aplica dano considerando carapaça e imunidade à força física. */
export function damage(s: GameState, rt: Runtime, e: Enemy, amount: number, light: boolean, pierce = 0): void {
  if (e.dead || amount <= 0) return;
  if (!light && e.def.lightOnly) return;
  const armor = e.def.armor * (1 - pierce);
  e.hp -= amount * (1 - armor);
  e.hitFlash = 0.12;
  if (e.hp <= 0) kill(s, rt, e);
}

function kill(s: GameState, rt: Runtime, e: Enemy): void {
  e.dead = true;
  const reward = enemyReward(s, e.kind, s.wave);
  earn(s, reward);
  s.kills++;
  rt.events.push({ type: "death", x: e.x, y: e.y, kind: e.kind, reward });
}

function nearestBy(rt: Runtime, x: number, y: number, range: number, filter: (e: Enemy) => boolean): Enemy | undefined {
  let best: Enemy | undefined;
  let bd = Infinity;
  for (const e of rt.enemies) {
    if (e.dead || !filter(e)) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d > range + e.def.radius) continue;
    // prioriza quem está mais perto do farol
    if (e.dist < bd) {
      bd = e.dist;
      best = e;
    }
  }
  return best;
}

/** Direção do maior grupo de inimigos (talento de mira). */
function crowdAngle(rt: Runtime, reach: number): number | null {
  let best: number | null = null;
  let bestScore = 0;
  for (const e of rt.enemies) {
    if (e.dead || e.dist > reach + 40) continue;
    let score = 0;
    for (const o of rt.enemies) if (!o.dead && Math.abs(angleDiff(o.angle, e.angle)) < 0.35 && o.dist < reach + 40) score += 1 + (reach - o.dist) / reach;
    if (score > bestScore) {
      bestScore = score;
      best = Math.atan2(e.y, e.x);
    }
  }
  return best;
}

export function step(s: GameState, rt: Runtime, dt: number): void {
  rt.time += dt;
  const bs = beamStats(s.beam);
  if (s.hp > bs.hpMax) s.hp = bs.hpMax;

  // renda passiva
  earn(s, incomePerSec(s) * dt);

  // giro do farol
  if (rt.aim !== null) {
    const d = angleDiff(rt.aim, rt.beamAngle);
    const max = bs.spin * 3.2 * dt;
    rt.beamAngle += clamp(d, -max, max);
  } else {
    const target = s.talents.aim ? crowdAngle(rt, bs.reach) : null;
    if (target !== null) {
      const d = angleDiff(target, rt.beamAngle);
      rt.beamAngle += clamp(d, -bs.spin * 1.6 * dt, bs.spin * 1.6 * dt);
    } else rt.beamAngle += bs.spin * dt;
  }
  rt.beamAngle = ((rt.beamAngle % TAU) + TAU) % TAU;

  // ondas
  if (rt.phase === "pause") {
    rt.pauseT -= dt;
    if (rt.pauseT <= 0) startWave(s, rt);
  } else if (rt.phase === "spawning") {
    rt.spawnTimer -= dt;
    while (rt.spawnTimer <= 0 && rt.spawnList.length) {
      spawn(s, rt, rt.spawnList.shift()!);
      rt.spawnTimer += rt.spawnInterval;
    }
    if (!rt.spawnList.length) rt.phase = "fighting";
  } else if (rt.phase === "fighting" && !rt.enemies.some((e) => !e.dead)) {
    // onda vencida
    earn(s, BALANCE.waveBonus * s.wave * Math.pow(BALANCE.rewardGrowth, s.wave - 1) * oilMult(s));
    if (s.autoAdvance) s.wave++;
    s.maxWave = Math.max(s.maxWave, s.wave);
    s.bestWaveEver = Math.max(s.bestWaveEver, s.maxWave);
    s.hp = Math.min(bs.hpMax, s.hp + bs.hpMax * 0.2);
    rt.phase = "pause";
    rt.pauseT = BALANCE.wavePause;
  }

  const dmgMul = damageMult(s);
  const lens = s.lens;
  const angles = beamAngles(s, rt);
  const beamDps = bs.dps * dmgMul * (lens === "prism" ? 0.4 : 1);

  // movimento, luz e efeitos sobre os inimigos
  for (const e of rt.enemies) {
    if (e.dead) continue;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    let lit = false;
    for (const a of angles) if (inBeam(a, bs.halfAngle, bs.reach, e.x, e.y, e.def.radius)) lit = true;
    e.lit = lit;
    e.glow = clamp(e.glow + (lit ? dt * 6 : -dt * 2), 0, 1);
    if (lit) {
      damage(s, rt, e, beamDps * dt, true, lens === "white" ? 0.5 : 0);
      if (lens === "amber") {
        e.burnT = 2.5;
        e.burnDps = beamDps * 0.5;
      }
      if (lens === "blue") {
        e.slowT = Math.max(e.slowT, 0.15);
        e.slowMul = Math.min(e.slowMul, 0.55);
      }
    }
    if (e.burnT > 0 && !e.dead) {
      e.burnT -= dt;
      damage(s, rt, e, e.burnDps * dt, true);
    }
    if (e.dead) continue;
    if (e.slowT > 0) e.slowT -= dt;
    else e.slowMul = 1;
    // sereias curam quem está por perto
    if (e.kind === "siren")
      for (const o of rt.enemies) if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 70) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.05 * dt);
    const sp = e.def.speed * e.slowMul;
    e.dist -= sp * dt;
    e.wob += dt * (e.kind === "eel" ? 3 : 1.2);
    const wobble = e.kind === "eel" ? Math.sin(e.wob) * 0.12 : e.kind === "jelly" ? Math.sin(e.wob) * 0.05 : 0;
    const a = e.angle + wobble * Math.min(1, e.dist / 200);
    e.x = Math.cos(a) * e.dist;
    e.y = Math.sin(a) * e.dist;
    const shore = islandShape(s.seed + s.island).radius(e.angle);
    // na costa, caranguejos e enguias reduzem a velocidade
    if (e.dist < shore && e.kind !== "jelly") e.dist += sp * dt * 0.35;
    if (e.dist <= BALANCE.coreRadius + e.def.radius * 0.5) {
      e.dead = true;
      s.hp -= e.def.damage * (e.boss ? 1 : 1 + s.wave * 0.01);
      rt.events.push({ type: "core", x: e.x, y: e.y, dmg: e.def.damage });
    }
  }

  // torres
  const shape = islandShape(s.seed + s.island);
  s.towers.forEach((t, i) => {
    if (!t) return;
    const p = shape.slots[i];
    let litTower = false;
    for (const a of angles) if (inBeam(a, bs.halfAngle, bs.reach, p.x, p.y, 6)) litTower = true;
    rt.litTowers[i] = litTower;
    const haste = litTower ? LIT_TOWER_HASTE : 1;
    const dmg = towerDamage(s, t.kind, t.level);
    const range = towerRange(t.kind, t.level);
    if (t.kind === "lantern") {
      for (const e of rt.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < range + e.def.radius) damage(s, rt, e, dmg * haste * dt, true);
      return;
    }
    t.cd -= dt * haste;
    if (t.cd > 0) return;
    if (t.kind === "harpoon") {
      const e = nearestBy(rt, p.x, p.y, range, (x) => !x.def.lightOnly);
      if (!e) return;
      t.cd = TOWERS.harpoon.cooldown;
      rt.projectiles.push({ kind: "harpoon", x: p.x, y: p.y, sx: p.x, sy: p.y, tx: e.x, ty: e.y, targetId: e.id, speed: 520, dmg, slot: i, t: 0, dur: 0 });
      rt.events.push({ type: "fire", x: p.x, y: p.y, slot: i });
    } else if (t.kind === "net") {
      const e = nearestBy(rt, p.x, p.y, range, (x) => !x.def.lightOnly);
      if (!e) return;
      t.cd = TOWERS.net.cooldown;
      // mira à frente do alvo
      const lead = Math.max(0, e.dist - e.def.speed * 0.7);
      const tx = Math.cos(e.angle) * lead;
      const ty = Math.sin(e.angle) * lead;
      const dur = Math.hypot(tx - p.x, ty - p.y) / 260;
      rt.projectiles.push({ kind: "net", x: p.x, y: p.y, sx: p.x, sy: p.y, tx, ty, targetId: e.id, speed: 260, dmg, slot: i, t: 0, dur });
      rt.events.push({ type: "fire", x: p.x, y: p.y, slot: i });
    } else if (t.kind === "bell") {
      if (!rt.enemies.some((e) => !e.dead && Math.hypot(e.x - p.x, e.y - p.y) < range)) return;
      t.cd = TOWERS.bell.cooldown;
      for (const e of rt.enemies) {
        if (e.dead || Math.hypot(e.x - p.x, e.y - p.y) > range + e.def.radius) continue;
        damage(s, rt, e, dmg, true);
        if (!e.boss) e.dist = Math.min(rt.spawnRadius, e.dist + 48);
      }
      rt.events.push({ type: "bell", x: p.x, y: p.y, r: range, slot: i });
    }
  });

  // projéteis
  for (const pr of rt.projectiles) {
    if (pr.kind === "harpoon") {
      const e = rt.enemies.find((x) => x.id === pr.targetId && !x.dead);
      if (e) {
        pr.tx = e.x;
        pr.ty = e.y;
      }
      const dx = pr.tx - pr.x;
      const dy = pr.ty - pr.y;
      const d = Math.hypot(dx, dy);
      const stepLen = pr.speed * dt;
      if (d <= stepLen + (e ? e.def.radius : 2)) {
        if (e) {
          damage(s, rt, e, pr.dmg * (e.lit ? 2 : 1), false, 0.5);
          rt.events.push({ type: "hit", x: e.x, y: e.y, color: "#d8d0c0" });
        }
        pr.t = -1;
      } else {
        pr.x += (dx / d) * stepLen;
        pr.y += (dy / d) * stepLen;
      }
    } else {
      pr.t += dt;
      const k = Math.min(1, pr.t / pr.dur);
      pr.x = pr.sx + (pr.tx - pr.sx) * k;
      pr.y = pr.sy + (pr.ty - pr.sy) * k;
      if (k >= 1) {
        const R = 36;
        for (const e of rt.enemies) {
          if (e.dead || Math.hypot(e.x - pr.tx, e.y - pr.ty) > R + e.def.radius) continue;
          if (e.def.lightOnly) continue;
          damage(s, rt, e, pr.dmg, false);
          e.slowT = 2.4;
          e.slowMul = Math.min(e.slowMul, e.boss ? 0.7 : 0.4);
        }
        rt.events.push({ type: "net", x: pr.tx, y: pr.ty, r: R });
        pr.t = -1;
      }
    }
  }
  rt.projectiles = rt.projectiles.filter((p) => p.t >= 0);
  rt.enemies = rt.enemies.filter((e) => !e.dead);

  // farol apagado: recua algumas ondas sem perder o progresso econômico
  if (s.hp <= 0) {
    s.wave = Math.max(1, s.wave - BALANCE.retreatWaves);
    s.hp = bs.hpMax;
    rt.enemies = [];
    rt.projectiles = [];
    rt.spawnList = [];
    rt.phase = "pause";
    rt.pauseT = BALANCE.wavePause + 1;
    rt.events.push({ type: "retreat", wave: s.wave });
  }
  void LENSES;
}
