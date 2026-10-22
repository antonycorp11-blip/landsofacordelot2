/** Dados do jogo: inimigos, satélites, constantes de equilíbrio e árvore de habilidades. */

export type EnemyId = "wanderer" | "drone" | "armored" | "comet" | "splitter" | "shard" | "antimatter" | "leviathan";

export interface EnemyDef {
  id: EnemyId;
  name: string;
  desc: string;
  hp: number;
  r: number;
  mass: number;
  /** quanto a gravidade do buraco afeta (1 = normal; negativo = repelido) */
  gres: number;
  speed: number;
  steer: number;
  dmg: number;
  frag: number;
  matter: number;
  cost: number;
  fromWave: number;
  weight: number;
  color: string;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  wanderer: { id: "wanderer", name: "Errante", desc: "Nave básica. Vai direto ao núcleo.", hp: 20, r: 8, mass: 1, gres: 1, speed: 34, steer: 1.4, dmg: 8, frag: 2, matter: 1, cost: 1, fromWave: 1, weight: 10, color: "#4ae0ff" },
  drone: { id: "drone", name: "Enxame", desc: "Leves e rápidos, chegam em grupos. Muito fáceis de arrastar.", hp: 9, r: 5.5, mass: 0.6, gres: 1.3, speed: 52, steer: 1.8, dmg: 4, frag: 1, matter: 0.5, cost: 0.7, fromWave: 2, weight: 7, color: "#7aff9a" },
  armored: { id: "armored", name: "Couraçado", desc: "Pesado e blindado. A gravidade quase não o move — use-o como projétil.", hp: 80, r: 13, mass: 3.2, gres: 0.38, speed: 22, steer: 1.2, dmg: 20, frag: 5, matter: 3, cost: 3, fromWave: 4, weight: 5, color: "#ffb04a" },
  comet: { id: "comet", name: "Cometa", desc: "Vem em linha reta, muito rápido. Desvie-o antes que chegue.", hp: 30, r: 7, mass: 1.2, gres: 0.55, speed: 105, steer: 3.2, dmg: 12, frag: 3, matter: 2, cost: 2, fromWave: 6, weight: 4, color: "#ffffff" },
  splitter: { id: "splitter", name: "Fissor", desc: "Ao ser destruído, se parte em três estilhaços.", hp: 45, r: 11, mass: 1.6, gres: 0.8, speed: 28, steer: 1.3, dmg: 12, frag: 3, matter: 2, cost: 3, fromWave: 8, weight: 4, color: "#ff5ad0" },
  shard: { id: "shard", name: "Estilhaço", desc: "Pedaço de Fissor.", hp: 10, r: 5, mass: 0.5, gres: 1.2, speed: 60, steer: 2, dmg: 4, frag: 1, matter: 0.3, cost: 0, fromWave: 999, weight: 0, color: "#ff9ae6" },
  antimatter: { id: "antimatter", name: "Antimatéria", desc: "É repelida pelo buraco negro. Empurre-a contra asteroides e satélites.", hp: 40, r: 9, mass: 1, gres: -0.9, speed: 30, steer: 1.3, dmg: 15, frag: 4, matter: 3, cost: 3, fromWave: 11, weight: 3, color: "#c86bff" },
  leviathan: { id: "leviathan", name: "Leviatã", desc: "Chefe a cada 10 ondas. Enorme, lança enxames.", hp: 900, r: 30, mass: 14, gres: 0.12, speed: 13, steer: 0.8, dmg: 60, frag: 40, matter: 50, cost: 0, fromWave: 10, weight: 0, color: "#ff4a5a" },
};

export type SatId = "laser" | "mine" | "cannon" | "deflector" | "stasis" | "collector";

export interface SatDef {
  id: SatId;
  name: string;
  desc: string;
  cost: number;
  color: string;
  glyph: string;
}

export const SATS: Record<SatId, SatDef> = {
  laser: { id: "laser", name: "Laser", desc: "Raio contínuo no inimigo mais próximo.", cost: 25, color: "#ff5a6a", glyph: "✶" },
  mine: { id: "mine", name: "Mina orbital", desc: "Explode quando algo passa perto. Rearma sozinha.", cost: 20, color: "#ffd84a", glyph: "✹" },
  cannon: { id: "cannon", name: "Canhão de massa", desc: "Dispara projéteis físicos — eles fazem curva na gravidade do buraco.", cost: 40, color: "#ff9a3a", glyph: "➤" },
  deflector: { id: "deflector", name: "Defletor", desc: "Escudo que rebate inimigos. Arremesse-os contra ele para dano de impacto.", cost: 35, color: "#4ae0ff", glyph: "⬡" },
  stasis: { id: "stasis", name: "Estase", desc: "Campo que deixa os inimigos lentos.", cost: 35, color: "#9a8cff", glyph: "❄" },
  collector: { id: "collector", name: "Coletor", desc: "Gera fragmentos e puxa os que estão por perto.", cost: 45, color: "#7aff9a", glyph: "◆" },
};

export const SAT_MAX_LVL = 5;

export const BAL = {
  coreR: 34,
  coreHp: 100,
  ringR: [95, 150, 205] as const,
  ringSlots: [4, 6, 8] as const,
  ringSpin: [0.16, -0.11, 0.08] as const,
  manualSpin: 1.6,
  holeH: 15,
  /** constante da gravidade 2D (aceleração = K / (d + soft)) */
  gravK: 34000,
  gravSoft: 20,
  gravRange: 240,
  weakMul: 0.3,
  holeMaxSpeed: 1100,
  holeFollow: 14,
  energyMax: 100,
  energyDrain: 24,
  energyRegen: 15,
  horizonDps: 32,
  pulseR: 130,
  pulseForce: 420,
  pulseCd: 6,
  impactMin: 55,
  impactK: 0.26,
  comboWindow: 2,
  fragPull: 90,
  fragLife: 12,
  startFrags: 30,
  asteroids: 3,
  breakTime: 7,
} as const;

/** Árvore de habilidades */
export type Branch = "root" | "sing" | "orb" | "core";

export interface TreeNode {
  id: string;
  name: string;
  desc: string;
  branch: Branch;
  max: number;
  baseCost: number;
  growth: number;
  requires: string[];
  x: number;
  y: number;
  glyph: string;
  sat?: SatId;
}

const N = (id: string, name: string, desc: string, branch: Branch, max: number, baseCost: number, requires: string[], x: number, y: number, glyph: string, extra: Partial<TreeNode> = {}): TreeNode => ({
  id,
  name,
  desc,
  branch,
  max,
  baseCost,
  growth: max === 1 ? 1 : 1.42,
  requires,
  x,
  y,
  glyph,
  ...extra,
});

export const TREE: TreeNode[] = [
  N("root", "Colapso", "O começo de tudo. +10% gravidade.", "root", 1, 3, [], 0, 0, "●"),
  // Singularidade (esquerda)
  N("mass", "Massa", "+12% de força da gravidade por nível.", "sing", 10, 6, ["root"], -1.2, -0.6, "M"),
  N("impact", "Impacto", "+15% de dano em colisões por nível.", "sing", 10, 8, ["root"], -1.2, 0.6, "✸"),
  N("horizon", "Horizonte", "+8% no tamanho do horizonte de eventos.", "sing", 5, 14, ["mass"], -2.4, -1.2, "◯"),
  N("energy", "Reservatório", "+20 de energia máxima para a gravidade forte.", "sing", 5, 10, ["mass"], -2.4, -0.2, "⚡"),
  N("hdmg", "Espaguetificação", "+25% de dano dentro do horizonte.", "sing", 10, 12, ["horizon"], -3.6, -1.6, "≈"),
  N("regen", "Acreção", "+15% de recarga de energia.", "sing", 5, 12, ["energy"], -3.6, -0.4, "↻"),
  N("pulse", "Pulso", "+20% de força e −8% de recarga do pulso.", "sing", 5, 10, ["impact"], -2.4, 1.2, "◎"),
  N("combo", "Sequência", "+0,5s na janela de combo.", "sing", 4, 16, ["impact"], -2.4, 2.2, "×"),
  N("reach", "Alcance", "+20% no raio de atração de fragmentos e da gravidade.", "sing", 4, 14, ["pulse"], -3.6, 1.6, "↔"),
  // Órbita (direita)
  N("satDmg", "Calibração", "+12% de dano dos satélites.", "orb", 10, 8, ["root"], 1.2, -0.6, "⌖"),
  N("discount", "Engenharia", "−6% no custo dos satélites.", "orb", 5, 8, ["root"], 1.2, 0.6, "%"),
  N("u_cannon", "Canhão de massa", "Libera o Canhão de massa.", "orb", 1, 15, ["satDmg"], 2.4, -1.4, "➤", { sat: "cannon" }),
  N("u_deflector", "Defletor", "Libera o Defletor.", "orb", 1, 15, ["satDmg"], 2.4, -0.4, "⬡", { sat: "deflector" }),
  N("satRate", "Cadência", "+8% de velocidade de disparo.", "orb", 5, 14, ["u_cannon"], 3.6, -1.8, "»"),
  N("u_stasis", "Estase", "Libera o satélite de Estase.", "orb", 1, 25, ["u_deflector"], 3.6, -0.6, "❄", { sat: "stasis" }),
  N("startFrag", "Kit inicial", "+25 fragmentos no começo da partida.", "orb", 4, 10, ["discount"], 2.4, 1.0, "◆"),
  N("u_collector", "Coletor", "Libera o Coletor.", "orb", 1, 30, ["startFrag"], 3.6, 0.6, "⊕", { sat: "collector" }),
  N("ring3", "Terceiro anel", "Abre o anel externo com 8 encaixes.", "orb", 1, 40, ["startFrag"], 2.4, 2.1, "◌"),
  N("slots", "Mais encaixes", "+1 encaixe em cada anel.", "orb", 2, 60, ["ring3"], 3.6, 2.4, "+"),
  // Núcleo (baixo)
  N("hp", "Blindagem", "+20% de vida do núcleo.", "core", 10, 6, ["root"], 0, 1.3, "♥"),
  N("fragVal", "Refino", "+10% de valor dos fragmentos.", "core", 8, 10, ["hp"], -0.7, 2.4, "✧"),
  N("coreRegen", "Reparo", "O núcleo regenera 0,4 de vida por segundo.", "core", 5, 12, ["hp"], 0.7, 2.4, "✚"),
  N("matter", "Colheita escura", "+10% de matéria escura ganha.", "core", 10, 14, ["fragVal"], -0.7, 3.5, "●"),
  N("shield", "Escudo de emergência", "Uma vez por partida, um escudo absorve 50 de dano quando o núcleo cai abaixo de 30%.", "core", 1, 35, ["coreRegen"], 0.7, 3.5, "⛨"),
  N("belt", "Cinturão", "+1 asteroide no campo.", "core", 3, 25, ["matter"], -0.7, 4.6, "☄"),
  N("headstart", "Salto", "Começa 2 ondas à frente (com fragmentos de bônus).", "core", 5, 30, ["shield"], 0.7, 4.6, "»"),
];

export const STARTING_SATS: SatId[] = ["laser", "mine"];
