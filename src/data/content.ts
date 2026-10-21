/** Dados declarativos: unidades, alienígenas, setores e a árvore de habilidades. */

export const BOARD = { cols: 9, rows: 5, tile: 100, left: 150, top: 120 };

export type UnitId = "generator" | "blaster" | "wall" | "mine" | "cryo" | "double" | "laser" | "tesla" | "mortar";

export interface UnitDef {
  id: UnitId;
  name: string;
  desc: string;
  cost: number;
  hp: number;
  /** recarga da carta (s) */
  recharge: number;
  damage: number;
  /** intervalo entre ataques (s) */
  rate: number;
  /** cor de destaque */
  color: string;
}

export const UNITS: Record<UnitId, UnitDef> = {
  generator: { id: "generator", name: "Gerador", desc: "Produz células de energia. A base da economia.", cost: 50, hp: 300, recharge: 6, damage: 0, rate: 9, color: "#ffd84a" },
  blaster: { id: "blaster", name: "Blaster", desc: "Dispara projéteis de plasma pela fileira.", cost: 100, hp: 300, recharge: 6, damage: 20, rate: 1.4, color: "#4ae0ff" },
  wall: { id: "wall", name: "Barreira", desc: "Escudo de energia que segura os alienígenas.", cost: 50, hp: 4000, recharge: 25, damage: 0, rate: 0, color: "#7c9cff" },
  mine: { id: "mine", name: "Mina", desc: "Arma em 10 s e explode o primeiro que pisar.", cost: 25, hp: 300, recharge: 22, damage: 1800, rate: 10, color: "#ff8a3a" },
  cryo: { id: "cryo", name: "Criotorre", desc: "Projéteis gelados: deixam o alvo 50% mais lento.", cost: 175, hp: 300, recharge: 7, damage: 20, rate: 1.4, color: "#a8f0ff" },
  double: { id: "double", name: "Blaster Duplo", desc: "Dois disparos por ciclo.", cost: 200, hp: 300, recharge: 7, damage: 20, rate: 1.4, color: "#3affb0" },
  laser: { id: "laser", name: "Canhão Laser", desc: "Raio que atravessa a fileira inteira.", cost: 225, hp: 300, recharge: 9, damage: 45, rate: 2.4, color: "#ff4a8a" },
  tesla: { id: "tesla", name: "Bobina Tesla", desc: "Raio em cadeia que salta entre alienígenas de fileiras vizinhas.", cost: 250, hp: 350, recharge: 10, damage: 32, rate: 1.8, color: "#c08aff" },
  mortar: { id: "mortar", name: "Lança-mísseis", desc: "Míssil no alienígena mais avançado, dano em área 3×3.", cost: 325, hp: 300, recharge: 12, damage: 90, rate: 3.2, color: "#ffb020" },
};

export const STARTER_UNITS: UnitId[] = ["generator", "blaster", "wall"];

export type AlienId = "crawler" | "runner" | "armored" | "swarm" | "jumper" | "spitter" | "colossus";

export interface AlienDef {
  id: AlienId;
  name: string;
  hp: number;
  /** carapaça que absorve dano antes da vida */
  shell?: number;
  speed: number;
  /** dano por segundo ao morder unidades */
  bite: number;
  reward: number;
  /** custo em pontos de onda */
  points: number;
  radius: number;
  fromSector: number;
}

export const ALIENS: Record<AlienId, AlienDef> = {
  crawler: { id: "crawler", name: "Rastejante", hp: 200, speed: 20, bite: 100, reward: 3, points: 1, radius: 30, fromSector: 1 },
  runner: { id: "runner", name: "Corredor", hp: 130, speed: 48, bite: 80, reward: 3, points: 1, radius: 26, fromSector: 1 },
  armored: { id: "armored", name: "Blindado", hp: 200, shell: 550, speed: 17, bite: 100, reward: 6, points: 3, radius: 34, fromSector: 2 },
  swarm: { id: "swarm", name: "Enxame", hp: 55, speed: 40, bite: 50, reward: 1, points: 1, radius: 18, fromSector: 2 },
  jumper: { id: "jumper", name: "Saltador", hp: 320, speed: 30, bite: 100, reward: 5, points: 2, radius: 30, fromSector: 3 },
  spitter: { id: "spitter", name: "Cuspidor", hp: 280, speed: 18, bite: 60, reward: 6, points: 3, radius: 30, fromSector: 4 },
  colossus: { id: "colossus", name: "Colosso", hp: 2600, speed: 11, bite: 500, reward: 40, points: 10, radius: 52, fromSector: 1 },
};

export interface SectorDef {
  name: string;
  floor: [number, number, number];
  glow: string;
}

export const SECTORS: SectorDef[] = [
  { name: "Posto Avançado Kepler", floor: [30, 44, 64], glow: "#3ad8ff" },
  { name: "Cinturão de Ferro", floor: [44, 40, 52], glow: "#ffb84a" },
  { name: "Colmeia Vermelha", floor: [56, 30, 38], glow: "#ff5a6a" },
  { name: "Estação Abissal", floor: [20, 40, 52], glow: "#3affc0" },
  { name: "Coroa de Titã", floor: [40, 32, 62], glow: "#c08aff" },
];

export function sectorDef(n: number): SectorDef {
  return SECTORS[(n - 1) % SECTORS.length];
}

export function sectorName(n: number): string {
  return n <= SECTORS.length ? SECTORS[n - 1].name : `${SECTORS[(n - 1) % SECTORS.length].name} ${Math.ceil(n / SECTORS.length)}`;
}

export const RUN = {
  wavesPerSector: 8,
  startEnergy: 100,
  skyOrbEvery: 9,
  orbValue: 25,
  orbLife: 8,
  baseHp: 3,
  hpGrowth: 1.4,
  rewardGrowth: 1.35,
  heatPerHit: 9,
  heatDecay: 18,
  overheatResume: 25,
  slashDamage: 22,
  slashCooldown: 0.18,
  slashWidth: 16,
};

// ---------------------------------------------------------------------------
// Árvore de habilidades
// ---------------------------------------------------------------------------

export type StatKey =
  | "bladeDmg"
  | "bladeCool"
  | "bladeWidth"
  | "bladeCrit"
  | "bladeMagnet"
  | "bladeChain"
  | "bladeBurn"
  | "unitDmg"
  | "unitHp"
  | "startEnergy"
  | "genBoost"
  | "recharge"
  | "costCut"
  | "scrap"
  | "baseHp"
  | "slots"
  | "killEnergy"
  | "drones"
  | "unlock";

export interface TreeNode {
  id: string;
  name: string;
  desc: string;
  /** posição na grade da árvore (colunas/linhas) */
  x: number;
  y: number;
  requires: string[];
  max: number;
  baseCost: number;
  growth: number;
  stat: StatKey;
  /** valor por nível (ou unidade liberada) */
  value: number;
  unit?: UnitId;
  branch: "core" | "blade" | "eng" | "cmd";
}

export const TREE: TreeNode[] = [
  { id: "core", name: "Comandante", desc: "O começo de tudo.", x: 0, y: 0, requires: [], max: 1, baseCost: 0, growth: 1, stat: "scrap", value: 0, branch: "core" },
  // lâmina (cima)
  { id: "b_dmg", name: "Fio da lâmina", desc: "+30% de dano do corte", x: 0, y: -1, requires: ["core"], max: 10, baseCost: 15, growth: 1.55, stat: "bladeDmg", value: 0.3, branch: "blade" },
  { id: "b_cool", name: "Dissipador", desc: "A lâmina esquenta 15% menos", x: -1, y: -2, requires: ["b_dmg"], max: 6, baseCost: 30, growth: 1.7, stat: "bladeCool", value: 0.15, branch: "blade" },
  { id: "b_width", name: "Lâmina larga", desc: "+25% de largura do corte", x: 1, y: -2, requires: ["b_dmg"], max: 5, baseCost: 40, growth: 1.7, stat: "bladeWidth", value: 0.25, branch: "blade" },
  { id: "b_magnet", name: "Ímã de energia", desc: "Cortar coleta energia e as células vêm sozinhas até você", x: 0, y: -2, requires: ["b_dmg"], max: 1, baseCost: 60, growth: 1, stat: "bladeMagnet", value: 1, branch: "blade" },
  { id: "b_crit", name: "Golpe preciso", desc: "+6% de chance de corte crítico (×3)", x: -1, y: -3, requires: ["b_cool"], max: 6, baseCost: 90, growth: 1.75, stat: "bladeCrit", value: 0.06, branch: "blade" },
  { id: "b_chain", name: "Arco voltaico", desc: "Cada corte salta para mais 1 alienígena próximo", x: 1, y: -3, requires: ["b_width"], max: 3, baseCost: 150, growth: 2.2, stat: "bladeChain", value: 1, branch: "blade" },
  { id: "b_burn", name: "Plasma residual", desc: "O corte deixa queimadura (+40% do dano em 2 s)", x: 0, y: -4, requires: ["b_crit", "b_chain"], max: 4, baseCost: 260, growth: 2, stat: "bladeBurn", value: 0.4, branch: "blade" },
  // engenharia (direita)
  { id: "e_dmg", name: "Calibragem", desc: "+15% de dano das unidades", x: 1, y: 0, requires: ["core"], max: 12, baseCost: 15, growth: 1.5, stat: "unitDmg", value: 0.15, branch: "eng" },
  { id: "u_mine", name: "Mina", desc: "Libera a carta Mina", x: 2, y: -1, requires: ["e_dmg"], max: 1, baseCost: 25, growth: 1, stat: "unlock", value: 1, unit: "mine", branch: "eng" },
  { id: "e_hp", name: "Blindagem", desc: "+20% de vida das unidades", x: 2, y: 1, requires: ["e_dmg"], max: 8, baseCost: 30, growth: 1.6, stat: "unitHp", value: 0.2, branch: "eng" },
  { id: "u_cryo", name: "Criotorre", desc: "Libera a carta Criotorre", x: 3, y: -1, requires: ["u_mine"], max: 1, baseCost: 80, growth: 1, stat: "unlock", value: 1, unit: "cryo", branch: "eng" },
  { id: "u_double", name: "Blaster Duplo", desc: "Libera a carta Blaster Duplo", x: 2, y: 0, requires: ["e_dmg"], max: 1, baseCost: 70, growth: 1, stat: "unlock", value: 1, unit: "double", branch: "eng" },
  { id: "e_gen", name: "Painéis eficientes", desc: "Geradores produzem 20% mais rápido", x: 3, y: 0, requires: ["u_double"], max: 5, baseCost: 60, growth: 1.7, stat: "genBoost", value: 0.2, branch: "eng" },
  { id: "u_laser", name: "Canhão Laser", desc: "Libera a carta Canhão Laser", x: 4, y: -1, requires: ["u_cryo"], max: 1, baseCost: 220, growth: 1, stat: "unlock", value: 1, unit: "laser", branch: "eng" },
  { id: "e_recharge", name: "Fabricação rápida", desc: "Cartas recarregam 10% mais rápido", x: 3, y: 1, requires: ["e_hp"], max: 5, baseCost: 90, growth: 1.8, stat: "recharge", value: 0.1, branch: "eng" },
  { id: "u_tesla", name: "Bobina Tesla", desc: "Libera a carta Bobina Tesla", x: 4, y: 0, requires: ["e_gen"], max: 1, baseCost: 380, growth: 1, stat: "unlock", value: 1, unit: "tesla", branch: "eng" },
  { id: "e_cost", name: "Otimização", desc: "Unidades custam 6% menos energia", x: 4, y: 1, requires: ["e_recharge"], max: 5, baseCost: 200, growth: 1.9, stat: "costCut", value: 0.06, branch: "eng" },
  { id: "u_mortar", name: "Lança-mísseis", desc: "Libera a carta Lança-mísseis", x: 5, y: 0, requires: ["u_tesla", "u_laser"], max: 1, baseCost: 700, growth: 1, stat: "unlock", value: 1, unit: "mortar", branch: "eng" },
  // comando (esquerda/baixo)
  { id: "c_scrap", name: "Reciclagem", desc: "+20% de sucata", x: -1, y: 0, requires: ["core"], max: 15, baseCost: 20, growth: 1.5, stat: "scrap", value: 0.2, branch: "cmd" },
  { id: "c_energy", name: "Reserva de energia", desc: "+25 de energia inicial", x: -2, y: 0, requires: ["c_scrap"], max: 8, baseCost: 25, growth: 1.55, stat: "startEnergy", value: 25, branch: "cmd" },
  { id: "c_slot", name: "Baia extra", desc: "+1 carta no seu arsenal por missão", x: -1, y: 1, requires: ["c_scrap"], max: 4, baseCost: 60, growth: 2.4, stat: "slots", value: 1, branch: "cmd" },
  { id: "c_base", name: "Casco reforçado", desc: "+1 de integridade da base", x: -2, y: 1, requires: ["c_slot"], max: 3, baseCost: 120, growth: 2.2, stat: "baseHp", value: 1, branch: "cmd" },
  { id: "c_kill", name: "Captura de energia", desc: "Cada abate dá +3 de energia", x: -3, y: 0, requires: ["c_energy"], max: 5, baseCost: 100, growth: 1.8, stat: "killEnergy", value: 3, branch: "cmd" },
  { id: "c_drones", name: "Drones de contenção", desc: "Drones das fileiras voltam a ficar prontos 1 vez por missão", x: -3, y: 1, requires: ["c_base"], max: 1, baseCost: 400, growth: 1, stat: "drones", value: 1, branch: "cmd" },
];

export const BASE_SLOTS = 4;
