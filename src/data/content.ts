/** Dados declarativos de balanceamento: inimigos, torres, melhorias, produtores, lentes, talentos e ilhas. */

export type EnemyKind = "eel" | "crab" | "jelly" | "siren" | "kraken";

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number;
  radius: number;
  /** Fração do dano físico absorvida pela carapaça. */
  armor: number;
  /** Só a luz fere (feixe e lanternas). */
  lightOnly?: boolean;
  reward: number;
  damage: number;
  fromWave: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  eel: { kind: "eel", name: "Enguia sombria", hp: 10, speed: 50, radius: 10, armor: 0, reward: 4, damage: 5, fromWave: 1 },
  crab: { kind: "crab", name: "Caranguejo do abismo", hp: 36, speed: 22, radius: 16, armor: 0.5, reward: 9, damage: 10, fromWave: 4 },
  jelly: { kind: "jelly", name: "Água-viva fantasma", hp: 24, speed: 30, radius: 15, armor: 0, lightOnly: true, reward: 8, damage: 7, fromWave: 7 },
  siren: { kind: "siren", name: "Sereia da névoa", hp: 44, speed: 27, radius: 15, armor: 0.15, reward: 16, damage: 12, fromWave: 14 },
  kraken: { kind: "kraken", name: "Tentáculo do Kraken", hp: 950, speed: 12, radius: 36, armor: 0.3, reward: 260, damage: 45, fromWave: 10 },
};

export const BALANCE = {
  hpGrowth: 1.125,
  /** Bônus de óleo ao vencer uma onda (× número da onda). */
  waveBonus: 6,
  rewardGrowth: 1.088,
  spawnRadiusPad: 40,
  coreRadius: 44,
  baseHp: 100,
  retreatWaves: 3,
  wavePause: 2.5,
  offlineCapSec: 8 * 3600,
  offlineRate: 0.5,
  bossEvery: 10,
  prestigeMinWave: 20,
  memoryBonus: 0.04,
};

export type TowerKind = "lantern" | "harpoon" | "net" | "bell";

export interface TowerDef {
  kind: TowerKind;
  name: string;
  desc: string;
  cost: number;
  range: number;
  /** dano por segundo (lanterna) ou por golpe */
  damage: number;
  cooldown: number;
  unlockWave: number;
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  lantern: { kind: "lantern", name: "Lanterna", desc: "Ilumina e queima o que chega perto. Fere águas-vivas.", cost: 60, range: 62, damage: 5, cooldown: 0, unlockWave: 1 },
  harpoon: { kind: "harpoon", name: "Arpão", desc: "Disparo certeiro de longo alcance. Dano dobrado em alvos iluminados.", cost: 160, range: 240, damage: 16, cooldown: 1.4, unlockWave: 3 },
  net: { kind: "net", name: "Rede", desc: "Lança redes que prendem grupos e os deixam lentos.", cost: 420, range: 185, damage: 5, cooldown: 3.2, unlockWave: 6 },
  bell: { kind: "bell", name: "Sino de névoa", desc: "Badalada que empurra tudo de volta ao mar.", cost: 1300, range: 135, damage: 24, cooldown: 6, unlockWave: 12 },
};

export const TOWER_UPGRADE = { costGrowth: 1.55, damageGrowth: 1.3, rangeGrowth: 0.035, maxLevel: 60 };
/** Torres dentro do feixe atacam mais rápido. */
export const LIT_TOWER_HASTE = 1.6;

export type BeamStat = "power" | "reach" | "width" | "spin" | "wall";

export interface BeamUpgrade {
  id: BeamStat;
  name: string;
  desc: string;
  baseCost: number;
  growth: number;
  max: number;
}

export const BEAM_UPGRADES: BeamUpgrade[] = [
  { id: "power", name: "Intensidade", desc: "Dano da luz por segundo", baseCost: 12, growth: 1.42, max: 999 },
  { id: "reach", name: "Alcance", desc: "Comprimento do feixe", baseCost: 40, growth: 1.62, max: 20 },
  { id: "width", name: "Abertura", desc: "Largura do cone de luz", baseCost: 70, growth: 1.75, max: 16 },
  { id: "spin", name: "Engrenagem", desc: "Velocidade de giro", baseCost: 30, growth: 1.55, max: 15 },
  { id: "wall", name: "Muralha", desc: "Integridade do farol", baseCost: 90, growth: 1.6, max: 40 },
];

export function beamStats(levels: Partial<Record<BeamStat, number>>) {
  const l = (k: BeamStat) => levels[k] ?? 0;
  return {
    dps: 8 * Math.pow(1.22, l("power")),
    reach: 190 + 17 * l("reach"),
    halfAngle: ((10 + 1.5 * l("width")) * Math.PI) / 180,
    spin: ((35 + 6 * l("spin")) * Math.PI) / 180,
    hpMax: BALANCE.baseHp * (1 + 0.25 * l("wall")),
  };
}

export type LensId = "white" | "amber" | "blue" | "prism";

export interface LensDef {
  id: LensId;
  name: string;
  desc: string;
  cost: number;
  color: [number, number, number];
}

export const LENSES: Record<LensId, LensDef> = {
  white: { id: "white", name: "Lente clara", desc: "Atravessa metade da carapaça dos caranguejos.", cost: 0, color: [255, 244, 210] },
  amber: { id: "amber", name: "Lente âmbar", desc: "Incendeia: o alvo segue queimando por 2,5 s depois de sair da luz.", cost: 500, color: [255, 176, 70] },
  blue: { id: "blue", name: "Lente azul", desc: "Luz fria que deixa tudo 45% mais lento enquanto iluminado.", cost: 4000, color: [130, 200, 255] },
  prism: { id: "prism", name: "Prisma", desc: "Divide a luz em três feixes (40% do dano cada). Talento.", cost: 0, color: [210, 160, 255] },
};

export type ProducerId = "whaler" | "still" | "fireflies" | "neighbor" | "fleet";

export interface ProducerDef {
  id: ProducerId;
  name: string;
  desc: string;
  rate: number;
  baseCost: number;
  growth: number;
}

export const PRODUCERS: ProducerDef[] = [
  { id: "whaler", name: "Barco baleeiro", desc: "Traz óleo de baleia todas as manhãs", rate: 0.6, baseCost: 40, growth: 1.14 },
  { id: "still", name: "Destilaria", desc: "Refina algas em óleo de lamparina", rate: 5, baseCost: 550, growth: 1.15 },
  { id: "fireflies", name: "Vagalumes engarrafados", desc: "Luz viva que vira combustível", rate: 40, baseCost: 6500, growth: 1.15 },
  { id: "neighbor", name: "Farol vizinho", desc: "Outro faroleiro divide a reserva", rate: 300, baseCost: 80000, growth: 1.16 },
  { id: "fleet", name: "Frota de cabotagem", desc: "Navios que você salvou pagam pedágio", rate: 2500, baseCost: 1.1e6, growth: 1.17 },
];

/** A cada 25 unidades, o produtor dobra. */
export const PRODUCER_MILESTONE = 25;

export type TalentId = "wisdom" | "fortune" | "head" | "reserve" | "prism" | "aim" | "veteran";

export interface TalentDef {
  id: TalentId;
  name: string;
  desc: string;
  baseCost: number;
  growth: number;
  max: number;
}

export const TALENTS: TalentDef[] = [
  { id: "wisdom", name: "Sabedoria do faroleiro", desc: "+20% de dano de tudo por nível", baseCost: 1, growth: 1.8, max: 50 },
  { id: "fortune", name: "Fortuna das marés", desc: "+25% de óleo por nível", baseCost: 1, growth: 1.8, max: 50 },
  { id: "head", name: "Partida rápida", desc: "Recomeça 5 ondas adiante por nível", baseCost: 2, growth: 2.2, max: 6 },
  { id: "reserve", name: "Óleo de reserva", desc: "Começa com óleo guardado", baseCost: 1, growth: 2.5, max: 6 },
  { id: "aim", name: "Mira do faroleiro", desc: "Sem você mirar, o feixe procura o maior grupo", baseCost: 3, growth: 1, max: 1 },
  { id: "prism", name: "Prisma", desc: "Desbloqueia a lente que divide o feixe em três", baseCost: 6, growth: 1, max: 1 },
  { id: "veteran", name: "Torres veteranas", desc: "Torres novas já nascem com níveis extras", baseCost: 4, growth: 2, max: 10 },
];

export interface IslandDef {
  name: string;
  sea: [number, number, number];
  rock: [number, number, number];
}

export const ISLANDS: IslandDef[] = [
  { name: "Rochedo do Corvo", sea: [16, 38, 58], rock: [96, 96, 92] },
  { name: "Ilha das Brumas", sea: [22, 44, 52], rock: [110, 104, 96] },
  { name: "Recife Negro", sea: [12, 28, 48], rock: [70, 70, 76] },
  { name: "Pico do Albatroz", sea: [20, 36, 62], rock: [120, 112, 100] },
  { name: "Baía dos Naufrágios", sea: [26, 40, 44], rock: [90, 84, 72] },
  { name: "Última Costa", sea: [30, 22, 48], rock: [84, 80, 96] },
];

export function islandAt(i: number): IslandDef {
  return ISLANDS[i % ISLANDS.length];
}
