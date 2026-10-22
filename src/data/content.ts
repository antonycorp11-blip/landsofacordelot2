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
  cavaleiro: { id: "cavaleiro", name: "Metrônomo Blindado", hp: 34, armor: 40, r: 7, speed: 20, dmg: 8, notes: 5, exp: 10, fromRoom: 2, fromDungeon: 0, weight: 5, body: 9 },
  corista: { id: "corista", name: "Corista Fantasma", hp: 22, armor: 0, r: 6, speed: 30, dmg: 5, notes: 3, exp: 8, fromRoom: 3, fromDungeon: 1, weight: 4, body: 8 },
  gaiteiro: { id: "gaiteiro", name: "Sanfona Rabugenta", hp: 20, armor: 0, r: 6, speed: 28, dmg: 5, notes: 4, exp: 8, fromRoom: 3, fromDungeon: 0, weight: 3, body: 8 },
  maestro: { id: "maestro", name: "Maestro Trítono", hp: 700, armor: 260, r: 15, speed: 12, dmg: 20, notes: 80, exp: 200, fromRoom: 99, fromDungeon: 0, weight: 0, body: 30 },
};

// ------------------------------------------------------------------ masmorras (prestígio)
export type Style = "teatro" | "conserv" | "catedral" | "opera" | "coliseu";

export interface DungeonDef {
  id: string;
  name: string;
  key: number;
  rooms: number;
  style: Style;
  /** cor da penumbra (cada lugar tem o seu clima) */
  dark: [number, number, number];
  light: string;
}

export const DUNGEONS: DungeonDef[] = [
  { id: "porao", name: "Porão do Teatro", key: 0, rooms: 5, style: "teatro", dark: [26, 6, 14], light: "#ffc070" },
  { id: "conserv", name: "Conservatório Abandonado", key: 1, rooms: 6, style: "conserv", dark: [4, 10, 26], light: "#9ac8ff" },
  { id: "catedral", name: "Catedral do Órgão", key: 2, rooms: 7, style: "catedral", dark: [14, 6, 26], light: "#d8a0ff" },
  { id: "opera", name: "Ópera em Ruínas", key: 3, rooms: 8, style: "opera", dark: [26, 8, 6], light: "#ffb050" },
  { id: "coliseu", name: "Coliseu dos Ecos", key: 4, rooms: 9, style: "coliseu", dark: [4, 18, 20], light: "#8affe0" },
];

export const dungeonPower = (i: number) => Math.pow(3.2, i);

// ------------------------------------------------------------------ formas do chefe
export interface BossForm {
  name: string;
  title: string;
  hp: number;
  armor: number;
}

export const BOSS_FORMS: BossForm[] = [
  { name: "Trítono", title: "o Regente Mascarado", hp: 700, armor: 260 },
  { name: "Trítono", title: "o Pianista de Ébano", hp: 820, armor: 320 },
  { name: "Trítono", title: "o Organista Sombrio", hp: 950, armor: 380 },
  { name: "Trítono", title: "o Fantasma da Ópera", hp: 1050, armor: 420 },
  { name: "Trítono", title: "o Supremo Desafinado", hp: 1300, armor: 520 },
];

// ------------------------------------------------------------------ objetos quebráveis
export type PropId = "caixote" | "barril" | "vaso" | "caixamusica" | "partituras";
export const PROPS: Record<PropId, { hp: number; loot: number; r: number }> = {
  caixote: { hp: 2, loot: 3, r: 7 },
  barril: { hp: 2, loot: 3, r: 6 },
  vaso: { hp: 1, loot: 2, r: 5 },
  caixamusica: { hp: 3, loot: 7, r: 6 },
  partituras: { hp: 1, loot: 2, r: 6 },
};

// ------------------------------------------------------------------ habilidades do Tito
export type SkillId = "rufar" | "forte" | "pancada" | "metro";
export interface SkillDef {
  id: SkillId;
  name: string;
  desc: string;
  cd: number;
  dur: number;
  key: string;
  node?: string;
}
export const SKILLS: SkillDef[] = [
  { id: "rufar", name: "Rufar", desc: "Rufar de tambor: todos os cortes contam como no tempo.", cd: 16, dur: 5, key: "1" },
  { id: "forte", name: "Fortíssimo", desc: "Os cortes causam o dobro de dano e o rastro fica largo.", cd: 24, dur: 6, key: "2", node: "forte" },
  { id: "pancada", name: "Pancada", desc: "Bate forte no tambor: atordoa e empurra os monstros perto do Tito. Atordoados sofrem mais dano.", cd: 14, dur: 0, key: "3", node: "pancada" },
  { id: "metro", name: "Metrônomo", desc: "Desacelera o tempo: monstros e tiros ficam muito lentos.", cd: 28, dur: 5, key: "4", node: "metro" },
];

// ------------------------------------------------------------------ rastros da batuta (visual)
export type TrailId = "prata" | "ouro" | "prisma" | "brasa" | "estrelas";
export const TRAILS: { id: TrailId; name: string; node?: string; level?: number }[] = [
  { id: "prata", name: "Prata" },
  { id: "ouro", name: "Ouro", level: 3 },
  { id: "prisma", name: "Prisma (cores das notas)", node: "prisma" },
  { id: "brasa", name: "Brasa", node: "brasa" },
  { id: "estrelas", name: "Poeira estelar", node: "estelar" },
];

// ------------------------------------------------------------------ árvore de habilidades
export type Currency = "notas" | "cristais" | "partituras";
export type TreeBranch = "root" | "dano" | "vigor" | "rastro" | "ritmo" | "tito" | "busca";

export const TREE_BRANCH: Record<Exclude<TreeBranch, "root">, { angle: number; color: string; name: string }> = {
  dano: { angle: -150, color: "#ff8a7a", name: "Corte" },
  busca: { angle: -90, color: "#ffd27a", name: "Exploração" },
  vigor: { angle: -30, color: "#f2d860", name: "Vigor" },
  tito: { angle: 30, color: "#7affb0", name: "Tito" },
  ritmo: { angle: 90, color: "#7ab8ff", name: "Ritmo e Harmonia" },
  rastro: { angle: 150, color: "#d8a0ff", name: "Rastro" },
};

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
  branch: TreeBranch;
  x: number;
  y: number;
  icon: string;
}

const T = (id: string, branch: TreeBranch, name: string, desc: string, from: string | null, depth: number, lat: number, icon: string, max: number, cost: number, cur: Currency = "notas"): TreeNode => {
  let x = 0;
  let y = 0;
  if (branch !== "root") {
    const a = (TREE_BRANCH[branch].angle * Math.PI) / 180;
    const d = depth * 1.05 + 0.2;
    x = Math.cos(a) * d - Math.sin(a) * lat * 0.62;
    y = Math.sin(a) * d + Math.cos(a) * lat * 0.62;
  }
  return { id, name, desc, max, cost, cur, growth: max === 1 ? 1 : 1.55, from, branch, x, y, icon };
};

export const TREE: TreeNode[] = [
  T("corte", "root", "Corte", "A batuta da Clara corta tudo que atravessa. +20% de dano de corte.", null, 0, 0, "lua", 1, 0),
  // corte
  T("fio", "dano", "Fio da Batuta", "+15% de dano de corte.", "corte", 1, 0, "lamina", 20, 6),
  T("acertos", "dano", "Acertos em Série", "Cada inimigo extra no mesmo corte dá +8% de dano ao corte todo.", "fio", 2, -0.8, "multi", 5, 20),
  T("quebra", "dano", "Quebra-Tom", "+30% de dano contra armadura.", "fio", 2, 0.8, "escudo", 8, 16),
  T("execucao", "dano", "Execução", "Cortes executam inimigos com menos de 8% de vida (+3% por nível).", "quebra", 3, 1.3, "caveira", 5, 2, "cristais"),
  T("marcados", "dano", "Olho Clínico", "+5% de chance de monstros marcados.", "acertos", 3, -1.3, "marca", 5, 30),
  T("fluxo", "dano", "Estado de Fluxo", "Abater monstros marcados concede um multiplicador de dano de corte (+10% por abate, na sala).", "marcados", 4, -1.6, "fluxo", 1, 3, "cristais"),
  T("gliss", "dano", "Glissando", "Cortes longos causam +40% de dano.", "acertos", 3, 0, "gliss", 3, 45),
  // exploração
  T("gorjeta", "busca", "Gorjeta", "+12% de notas ♪.", "corte", 1, 0, "moeda", 15, 8),
  T("bolso", "busca", "Bolso Fundo", "O Tito atrai os itens do chão de mais longe.", "gorjeta", 2, -0.8, "ima", 3, 25),
  T("bau", "busca", "Ouvido para Baús", "Baús musicais e objetos quebrados soltam +50% de saque.", "gorjeta", 2, 0.8, "bau", 3, 2, "cristais"),
  T("afinacao", "busca", "Afinação", "+20% de cristais.", "bolso", 3, -1.2, "cristal", 5, 40),
  T("estudo", "busca", "Estudo", "+15% de EXP.", "bau", 3, 1.2, "livro", 5, 35),
  T("plateia", "busca", "Plateia", "+15% de monstros por sala (mais perigo, mais saque).", "estudo", 4, 1.4, "plateia", 5, 80),
  // vigor
  T("vigor", "vigor", "Vigor", "+15 de vigor máximo.", "corte", 1, 0, "orbe", 10, 7),
  T("folego", "vigor", "Fôlego", "+15% de recuperação do vigor.", "vigor", 2, -0.8, "vento", 10, 12),
  T("leveza", "vigor", "Mão Leve", "−7% de vigor gasto por acerto.", "vigor", 2, 0.8, "pena", 5, 22),
  T("segundo", "vigor", "Segundo Fôlego", "Abates devolvem 2 de vigor.", "folego", 3, -1.2, "coracao", 5, 35),
  T("ciclo", "vigor", "Ciclo das Quintas", "Desenhe um círculo em volta dos monstros para golpear todos dentro dele.", "leveza", 3, 1.2, "circulo", 1, 3, "cristais"),
  T("ciclo2", "vigor", "Quintas Justas", "+40% de dano do Ciclo e −1s de recarga.", "ciclo", 4, 1.5, "circulo", 5, 3, "cristais"),
  // Tito
  T("tambor", "tito", "Tambor Firme", "+20% de vida do Tito.", "corte", 1, 0, "tambor", 10, 7),
  T("rufar2", "tito", "Rufar Longo", "Rufar dura +1s e recarrega 1s mais rápido.", "tambor", 2, -0.8, "onda", 5, 25),
  T("cura", "tito", "Canção de Cura", "Tito recupera 0,6 de vida por segundo.", "tambor", 2, 0.8, "cura", 5, 30),
  T("forte", "tito", "Fortíssimo", "Habilidade do Tito: por 6s os cortes causam o dobro de dano.", "rufar2", 3, -1.3, "forte", 1, 3, "cristais"),
  T("pancada", "tito", "Pancada", "Habilidade do Tito: atordoa e empurra os monstros por perto.", "cura", 3, 1.3, "pancada", 1, 90),
  T("metro", "tito", "Metrônomo", "Habilidade do Tito: desacelera os monstros e os tiros por 5s.", "pancada", 4, 1.5, "metro", 1, 1, "partituras"),
  T("passo", "tito", "Passo Ligeiro", "+12% de velocidade do Tito.", "forte", 4, -1.5, "passo", 3, 60),
  // ritmo e harmonia
  T("tempo", "ritmo", "No Tempo", "Cortes na batida do tambor causam +20% de dano.", "corte", 1, 0, "nota", 8, 8),
  T("ouvido", "ritmo", "Ouvido Absoluto", "Janela da batida 20% maior.", "tempo", 2, -0.8, "ouvido", 3, 25),
  T("acorde", "ritmo", "Harmonia", "Acordes (as notas num corte só) causam +25% de dano extra.", "tempo", 2, 0.8, "acorde", 10, 14),
  T("menores", "ritmo", "Tríades Menores", "Libera os acordes menores ii, iii e vi.", "acorde", 3, 1.2, "acorde", 1, 2, "cristais"),
  T("setima", "ritmo", "Dominante com Sétima", "Libera o V7: quatro notas, explosão muito maior.", "menores", 4, 1.5, "acorde", 1, 1, "partituras"),
  T("escala", "ritmo", "Escalas", "Três notas em ordem (Dó-Ré-Mi…) num corte devolvem 15 de vigor.", "ouvido", 3, -1.2, "escada", 1, 45),
  // rastro
  T("rastro", "rastro", "Rastro Cortante", "O rastro da batuta continua cortando por um instante (+tempo e dano por nível).", "corte", 1, 0, "gliss", 8, 10),
  T("largo", "rastro", "Rastro Largo", "+20% de largura do corte e do rastro.", "rastro", 2, -0.8, "multi", 5, 22),
  T("prisma", "rastro", "Prisma", "Rastro nas cores das notas. Acordes deixam o rastro 50% mais forte por 2s.", "rastro", 2, 0.8, "prisma", 1, 2, "cristais"),
  T("brasa", "rastro", "Brasa", "Rastro em chamas: deixa brasas que queimam os monstros.", "largo", 3, -1.2, "brasa", 1, 4, "cristais"),
  T("estelar", "rastro", "Poeira Estelar", "Rastro de estrelas: acertos do rastro devolvem vigor.", "prisma", 3, 1.2, "estrela", 1, 1, "partituras"),
];
