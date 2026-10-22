/** Dados do jogo: teoria musical, monstros, masmorras, árvore de habilidades e falas. */

// ------------------------------------------------------------------ teoria
export const NOTE_NAMES = ["Dó", "Dó♯", "Ré", "Ré♯", "Mi", "Fá", "Fá♯", "Sol", "Sol♯", "Lá", "Lá♯", "Si"];
/** intervalos da escala maior em semitons */
export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const DEGREE_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
/** cor de cada grau da escala (1º ao 7º) */
export const DEGREE_COLORS = ["#ff5d73", "#ff9b42", "#ffd84a", "#6ef29a", "#4adcff", "#7b8cff", "#d27aff"];
export const CHROMA_COLOR = "#e8e8f0";

export interface KeyDef {
  id: string;
  name: string;
  /** nota MIDI da tônica */
  root: number;
  sharps: number;
}

/** ciclo das quintas: cada tonalidade nova acrescenta um sustenido e é mais difícil */
export const KEYS: KeyDef[] = [
  { id: "C", name: "Dó maior", root: 60, sharps: 0 },
  { id: "G", name: "Sol maior", root: 55, sharps: 1 },
  { id: "D", name: "Ré maior", root: 62, sharps: 2 },
  { id: "A", name: "Lá maior", root: 57, sharps: 3 },
  { id: "E", name: "Mi maior", root: 64, sharps: 4 },
  { id: "B", name: "Si maior", root: 59, sharps: 5 },
  { id: "F#", name: "Fá♯ maior", root: 54, sharps: 6 },
  { id: "C#", name: "Dó♯ maior", root: 61, sharps: 7 },
];

/** nome da nota de um grau (0..6) numa tonalidade */
export function degreeNote(key: KeyDef, deg: number): string {
  return NOTE_NAMES[(key.root + MAJOR[deg]) % 12];
}

/** nota MIDI de um grau, com oitava extra opcional */
export function degreeMidi(key: KeyDef, deg: number, oct = 0): number {
  return key.root + MAJOR[((deg % 7) + 7) % 7] + 12 * (oct + Math.floor(deg / 7));
}

export interface ChordDef {
  id: string;
  roman: string;
  /** graus (0 = tônica) */
  degs: number[];
  quality: string;
  /** nó da árvore que libera (vazio = desde o começo) */
  node?: string;
}

export const CHORDS: ChordDef[] = [
  { id: "I", roman: "I", degs: [0, 2, 4], quality: "maior" },
  { id: "IV", roman: "IV", degs: [3, 5, 0], quality: "maior" },
  { id: "V", roman: "V", degs: [4, 6, 1], quality: "maior" },
  { id: "ii", roman: "ii", degs: [1, 3, 5], quality: "menor", node: "menores" },
  { id: "vi", roman: "vi", degs: [5, 0, 2], quality: "menor", node: "menores" },
  { id: "iii", roman: "iii", degs: [2, 4, 6], quality: "menor", node: "menores" },
  { id: "V7", roman: "V7", degs: [4, 6, 1, 3], quality: "com sétima", node: "setima" },
];

export function chordName(key: KeyDef, c: ChordDef): string {
  const root = degreeNote(key, c.degs[0]);
  if (c.id === "V7") return `${root} com sétima`;
  return `${root} ${c.quality}`;
}

// ------------------------------------------------------------------ monstros
export type MonsterId = "desafinado" | "tamborim" | "corista" | "cavaleiro" | "gaiteiro" | "maestro";

export interface MonsterDef {
  id: MonsterId;
  name: string;
  hp: number;
  /** armadura: precisa ser quebrada antes (barra branca) */
  armor: number;
  r: number;
  speed: number;
  dmg: number;
  notes: number;
  exp: number;
  fromRoom: number;
  fromDungeon: number;
  weight: number;
  /** altura do corpo em pixels (para o corte acertar o sprite) */
  body: number;
}

export const MONSTERS: Record<MonsterId, MonsterDef> = {
  desafinado: { id: "desafinado", name: "Desafinado", hp: 16, armor: 0, r: 6, speed: 28, dmg: 3, notes: 2, exp: 5, fromRoom: 1, fromDungeon: 0, weight: 10, body: 7 },
  tamborim: { id: "tamborim", name: "Tamborim", hp: 9, armor: 0, r: 5, speed: 46, dmg: 3, notes: 1, exp: 4, fromRoom: 2, fromDungeon: 0, weight: 6, body: 5 },
  cavaleiro: { id: "cavaleiro", name: "Cavaleiro Metrônomo", hp: 34, armor: 40, r: 7, speed: 20, dmg: 8, notes: 5, exp: 10, fromRoom: 2, fromDungeon: 0, weight: 5, body: 9 },
  corista: { id: "corista", name: "Corista Fantasma", hp: 22, armor: 0, r: 6, speed: 30, dmg: 5, notes: 3, exp: 8, fromRoom: 3, fromDungeon: 1, weight: 4, body: 8 },
  gaiteiro: { id: "gaiteiro", name: "Gaiteiro", hp: 20, armor: 0, r: 6, speed: 28, dmg: 5, notes: 4, exp: 8, fromRoom: 3, fromDungeon: 0, weight: 3, body: 8 },
  maestro: { id: "maestro", name: "Maestro Trítono", hp: 520, armor: 220, r: 14, speed: 12, dmg: 20, notes: 80, exp: 200, fromRoom: 99, fromDungeon: 0, weight: 0, body: 18 },
};

// ------------------------------------------------------------------ masmorras (prestígio)
export interface DungeonDef {
  id: string;
  name: string;
  key: number;
  rooms: number;
  floor: [string, string];
  wall: string;
  light: string;
}

export const DUNGEONS: DungeonDef[] = [
  { id: "porao", name: "Porão do Teatro", key: 0, rooms: 5, floor: ["#2b2620", "#25211c"], wall: "#3a3128", light: "#ffb45a" },
  { id: "conserv", name: "Conservatório Abandonado", key: 1, rooms: 6, floor: ["#1f2a26", "#1a2420"], wall: "#2c3a33", light: "#9affc8" },
  { id: "catedral", name: "Catedral do Órgão", key: 2, rooms: 7, floor: ["#262033", "#201b2b"], wall: "#352c48", light: "#c8a0ff" },
  { id: "opera", name: "Ópera em Ruínas", key: 3, rooms: 8, floor: ["#331f22", "#2b1a1c"], wall: "#4a2a2e", light: "#ff7a6a" },
  { id: "coliseu", name: "Coliseu dos Ecos", key: 4, rooms: 9, floor: ["#2a2a2e", "#232327"], wall: "#3c3c44", light: "#8ad8ff" },
];

export const dungeonPower = (i: number) => Math.pow(2.2, i);

// ------------------------------------------------------------------ árvore de habilidades
export type Currency = "notas" | "cristais" | "partituras";

export interface TreeNode {
  id: string;
  name: string;
  desc: string;
  max: number;
  cost: number;
  cur: Currency;
  growth: number;
  /** vizinho necessário (a árvore se revela a partir dos nós comprados) */
  from: string | null;
  x: number;
  y: number;
  icon: string;
  dungeon?: number;
}

const T = (id: string, name: string, desc: string, from: string | null, x: number, y: number, icon: string, max: number, cost: number, cur: Currency = "notas", extra: Partial<TreeNode> = {}): TreeNode => ({
  id,
  name,
  desc,
  max,
  cost,
  cur,
  growth: max === 1 ? 1 : 1.45,
  from,
  x,
  y,
  icon,
  ...extra,
});

export const TREE: TreeNode[] = [
  T("corte", "Corte", "Sua batuta corta tudo que atravessa. +20% de dano de corte.", null, 0, 0, "lua", 1, 0),
  // dano
  T("fio", "Fio da Batuta", "+15% de dano de corte.", "corte", -1.1, -0.9, "lamina", 20, 4),
  T("acertos", "Acertos em Série", "Cada inimigo extra no mesmo corte dá +8% de dano ao corte todo.", "fio", -2.2, -1.5, "multi", 5, 12),
  T("quebra", "Quebra-Tom", "+30% de dano contra armadura.", "fio", -1.3, -2.1, "escudo", 8, 10),
  T("execucao", "Execução", "Cortes executam inimigos com menos de 8% de vida (+3% por nível).", "quebra", -2.0, -3.0, "caveira", 5, 1, "cristais"),
  T("marcados", "Olho Clínico", "+5% de chance de aparecerem monstros marcados.", "acertos", -3.3, -1.9, "marca", 5, 18),
  T("fluxo", "Estado de Fluxo", "Abater monstros marcados concede um multiplicador de dano de corte (+10% por abate, na sala).", "marcados", -4.1, -1.0, "fluxo", 1, 1, "cristais"),
  T("gliss", "Glissando", "Cortes longos (atravessando boa parte da tela) causam +40% de dano.", "acertos", -3.0, -0.5, "gliss", 3, 25),
  // vigor
  T("vigor", "Vigor", "+15 de vigor máximo.", "corte", 1.1, -0.9, "orbe", 10, 5),
  T("folego", "Fôlego", "+15% de recuperação do vigor.", "vigor", 2.2, -1.4, "vento", 10, 8),
  T("leveza", "Mão Leve", "−7% de vigor gasto por acerto.", "vigor", 1.4, -2.1, "pena", 5, 14),
  T("segundo", "Segundo Fôlego", "Abates devolvem 2 de vigor.", "folego", 3.2, -2.0, "coracao", 5, 20),
  T("ciclo", "Ciclo das Quintas", "Habilidade: desenhe um círculo em volta dos monstros para golpear todos dentro dele.", "leveza", 2.0, -3.1, "circulo", 1, 2, "cristais"),
  T("ciclo2", "Quintas Justas", "+40% de dano do Ciclo e −1s de recarga.", "ciclo", 3.0, -3.7, "circulo", 5, 2, "cristais"),
  // ritmo e harmonia
  T("tempo", "No Tempo", "Cortes na batida do tambor do Tito causam +20% de dano.", "corte", 0, 1.2, "nota", 8, 6),
  T("ouvido", "Ouvido Absoluto", "Janela da batida 20% maior.", "tempo", -0.9, 2.1, "ouvido", 3, 16),
  T("acorde", "Harmonia", "Acordes (as 3 notas num corte só) causam +25% de dano extra.", "tempo", 0.9, 2.1, "acorde", 10, 10),
  T("menores", "Tríades Menores", "Libera os acordes menores ii, iii e vi.", "acorde", 1.6, 3.0, "acorde", 1, 1, "cristais"),
  T("setima", "Dominante com Sétima", "Libera o V7: quatro notas, explosão muito maior.", "menores", 2.4, 3.8, "acorde", 1, 1, "partituras"),
  T("escala", "Escalas", "Três notas em ordem (Dó-Ré-Mi…) num corte devolvem 15 de vigor.", "ouvido", -1.7, 3.0, "escada", 1, 30),
  // Tito
  T("tambor", "Tambor Firme", "+20% de vida do Tito.", "corte", 0, -1.3, "tambor", 10, 6),
  T("batuque", "Batuque", "A cada 8 batidas, o tambor do Tito empurra os monstros próximos.", "tambor", 0.4, -2.4, "onda", 1, 40),
  T("cura", "Canção de Cura", "Tito recupera 0,6 de vida por segundo.", "tambor", -0.5, -2.6, "cura", 5, 25),
  // economia
  T("gorjeta", "Gorjeta", "+12% de notas ♪.", "tempo", 0, 2.6, "moeda", 15, 8),
  T("afinacao", "Afinação", "+20% de cristais.", "gorjeta", -0.7, 3.6, "cristal", 5, 30),
  T("estudo", "Estudo", "+15% de EXP.", "gorjeta", 0.7, 3.6, "livro", 5, 20),
  T("plateia", "Plateia", "+15% de monstros por sala (mais perigo, mais saque).", "estudo", 0.9, 4.6, "plateia", 5, 40),
];

// ------------------------------------------------------------------ falas do Tito
export const LINES = {
  intro: [
    "Ei, mana! Você é a batuta do maestro, lembra? Só passar por cima desses bichos que eles se desfazem.",
    "Eu marco o ritmo no tambor. Se você cortar junto com a batida, dói muito mais neles!",
    "E se cortar Dó, Mi e Sol de uma vez… vira um acorde. Bora limpar esse porão!",
  ],
  start: [
    "Bora, mana! Hoje a gente afina esse lugar inteiro.",
    "Ouvi barulho lá embaixo… parece um coral desafinado.",
    "Segura o tempo comigo: um, dois, três, quatro!",
    "Dessa vez a gente chega no maestro. Eu sinto.",
    "Cuidado com os de armadura. Corta até quebrar!",
  ],
  armor: ["Esse aí tá de armadura! Corta várias vezes até ela quebrar."],
  marked: ["Viu aquele com a marca roxa? Derruba ele que vale mais!"],
  tired: ["Calma, respira! Sem vigor a batuta não corta."],
  boss: ["É ele… o Maestro Trítono. Desafina tudo que toca. Agora é com a gente!"],
  win: ["A gente conseguiu! Ouviu esse silêncio bonito?"],
  lose: ["Ai… não deu dessa vez. Bora treinar e voltar mais forte."],
};
