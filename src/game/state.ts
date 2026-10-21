import type { BeamStat, EnemyDef, EnemyKind, LensId, ProducerId, TalentId, TowerKind } from "../data/content";

export interface TowerState {
  kind: TowerKind;
  level: number;
  cd: number;
  spent: number;
}

/** Estado persistente (vai para o save). */
export interface GameState {
  version: number;
  seed: number;
  island: number;
  wave: number;
  maxWave: number;
  bestWaveEver: number;
  oil: number;
  oilRun: number;
  oilLifetime: number;
  memories: number;
  memoriesTotal: number;
  beam: Record<BeamStat, number>;
  lens: LensId;
  lenses: LensId[];
  producers: Record<ProducerId, number>;
  towers: (TowerState | null)[];
  talents: Record<TalentId, number>;
  hp: number;
  autoAdvance: boolean;
  savedAt: number;
  kills: number;
  prestiges: number;
  flags: Record<string, boolean>;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  def: EnemyDef;
  /** ângulo de aproximação e distância ao farol */
  angle: number;
  dist: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  slowT: number;
  slowMul: number;
  burnT: number;
  burnDps: number;
  lit: boolean;
  glow: number;
  wob: number;
  boss: boolean;
  dead: boolean;
  hitFlash: number;
}

export interface Projectile {
  kind: "harpoon" | "net";
  x: number;
  y: number;
  tx: number;
  ty: number;
  targetId: number;
  speed: number;
  dmg: number;
  slot: number;
  t: number;
  dur: number;
  sx: number;
  sy: number;
}

export type GameEvent =
  | { type: "death"; x: number; y: number; kind: EnemyKind; reward: number }
  | { type: "hit"; x: number; y: number; color: string }
  | { type: "spawn"; x: number; y: number }
  | { type: "core"; x: number; y: number; dmg: number }
  | { type: "bell"; x: number; y: number; r: number; slot: number }
  | { type: "net"; x: number; y: number; r: number }
  | { type: "wave"; wave: number; boss: boolean }
  | { type: "retreat"; wave: number }
  | { type: "fire"; x: number; y: number; slot: number }
  | { type: "msg"; text: string };

/** Estado de execução (recriado a cada sessão). */
export interface Runtime {
  enemies: Enemy[];
  projectiles: Projectile[];
  spawnList: EnemyKind[];
  spawnTimer: number;
  spawnInterval: number;
  phase: "spawning" | "fighting" | "pause";
  pauseT: number;
  beamAngle: number;
  /** ângulo desejado enquanto o jogador mira (null = giro automático) */
  aim: number | null;
  time: number;
  events: GameEvent[];
  nextId: number;
  spawnRadius: number;
  litTowers: boolean[];
}

export function newState(seed = Math.floor(Math.random() * 1e9)): GameState {
  return {
    version: 1,
    seed,
    island: 0,
    wave: 1,
    maxWave: 1,
    bestWaveEver: 1,
    oil: 80,
    oilRun: 0,
    oilLifetime: 0,
    memories: 0,
    memoriesTotal: 0,
    beam: { power: 0, reach: 0, width: 0, spin: 0, wall: 0 },
    lens: "white",
    lenses: ["white"],
    producers: { whaler: 0, still: 0, fireflies: 0, neighbor: 0, fleet: 0 },
    towers: new Array(8).fill(null),
    talents: { wisdom: 0, fortune: 0, head: 0, reserve: 0, prism: 0, aim: 0, veteran: 0 },
    hp: 100,
    autoAdvance: true,
    savedAt: Date.now(),
    kills: 0,
    prestiges: 0,
    flags: {},
  };
}

export function newRuntime(): Runtime {
  return {
    enemies: [],
    projectiles: [],
    spawnList: [],
    spawnTimer: 0,
    spawnInterval: 1,
    phase: "pause",
    pauseT: 1.5,
    beamAngle: -Math.PI / 2,
    aim: null,
    time: 0,
    events: [],
    nextId: 1,
    spawnRadius: 520,
    litTowers: new Array(8).fill(false),
  };
}
