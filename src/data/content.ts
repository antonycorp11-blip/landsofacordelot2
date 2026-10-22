/** Dados do jogo: teoria musical, inimigos, motivos (melhorias da partida) e a árvore de evolução. */

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
  { id: "ii", roman: "ii", degs: [1, 3, 5], quality: "menor", node: "h_ii" },
  { id: "vi", roman: "vi", degs: [5, 0, 2], quality: "menor", node: "h_vi" },
  { id: "iii", roman: "iii", degs: [2, 4, 6], quality: "menor", node: "h_iii" },
  { id: "V7", roman: "V7", degs: [4, 6, 1, 3], quality: "com sétima", node: "h_v7" },
];

export function chordName(key: KeyDef, c: ChordDef): string {
  const root = degreeNote(key, c.degs[0]);
  if (c.id === "V7") return `${root} com sétima`;
  return `${root} ${c.quality}`;
}

// ------------------------------------------------------------------ inimigos
export type EnemyId = "seminima" | "colcheia" | "minima" | "semibreve" | "pausa" | "sustenido" | "bemol" | "tritono";

export interface EnemyDef {
  id: EnemyId;
  name: string;
  desc: string;
  hp: number;
  r: number;
  speed: number;
  dmg: number;
  notes: number;
  xp: number;
  fromRoom: number;
  fromKey: number;
  weight: number;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  seminima: { id: "seminima", name: "Semínima", desc: "A nota mais comum. Marcha no ritmo até a Lyra.", hp: 14, r: 13, speed: 46, dmg: 4, notes: 1, xp: 1, fromRoom: 1, fromKey: 0, weight: 10 },
  colcheia: { id: "colcheia", name: "Colcheia", desc: "Rápida e frágil. Chega em bandos.", hp: 8, r: 11, speed: 66, dmg: 3, notes: 1, xp: 1, fromRoom: 2, fromKey: 0, weight: 6 },
  minima: { id: "minima", name: "Mínima", desc: "Dura o dobro: aguenta mais golpes.", hp: 38, r: 16, speed: 30, dmg: 7, notes: 3, xp: 2, fromRoom: 3, fromKey: 0, weight: 4 },
  semibreve: { id: "semibreve", name: "Semibreve", desc: "Enorme e lenta. Bate muito forte.", hp: 105, r: 22, speed: 19, dmg: 14, notes: 6, xp: 4, fromRoom: 4, fromKey: 0, weight: 2 },
  pausa: { id: "pausa", name: "Pausa", desc: "Fica intocável na batida. Corte entre os tempos.", hp: 20, r: 13, speed: 48, dmg: 5, notes: 2, xp: 2, fromRoom: 2, fromKey: 1, weight: 4 },
  sustenido: { id: "sustenido", name: "Sustenido", desc: "Nota fora da tonalidade: não forma acordes e resiste mais.", hp: 48, r: 15, speed: 38, dmg: 8, notes: 5, xp: 3, fromRoom: 3, fromKey: 1, weight: 3 },
  bemol: { id: "bemol", name: "Bemol", desc: "Para longe e atira notas desafinadas na Lyra. Corte os tiros também.", hp: 28, r: 14, speed: 42, dmg: 5, notes: 4, xp: 3, fromRoom: 2, fromKey: 2, weight: 3 },
  tritono: { id: "tritono", name: "Trítono", desc: "O diabo na música. Chefe do 5º movimento.", hp: 1000, r: 46, speed: 14, dmg: 25, notes: 60, xp: 30, fromRoom: 5, fromKey: 0, weight: 0 },
};

// ------------------------------------------------------------------ motivos (roguelike, valem só na partida)
export type MotifId = "forte" | "legato" | "folego" | "respira" | "acorde" | "sincope" | "aria" | "ganancia" | "staccato" | "ostinato" | "sustain" | "crescendo" | "eco" | "coral";

export interface MotifDef {
  id: MotifId;
  name: string;
  desc: string;
  max: number;
  glyph: string;
  /** nó da árvore que coloca o motivo no sorteio */
  node?: string;
}

export const MOTIFS: Record<MotifId, MotifDef> = {
  forte: { id: "forte", name: "Forte", desc: "+25% de dano da batuta.", max: 5, glyph: "f" },
  legato: { id: "legato", name: "Legato", desc: "+30% de largura do traço.", max: 3, glyph: "⌒" },
  folego: { id: "folego", name: "Fôlego longo", desc: "+30 de fôlego máximo.", max: 3, glyph: "◯" },
  respira: { id: "respira", name: "Respiração", desc: "+35% de recuperação do fôlego.", max: 3, glyph: "≈" },
  acorde: { id: "acorde", name: "Harmonia rica", desc: "+50% de dano dos acordes.", max: 3, glyph: "♫" },
  sincope: { id: "sincope", name: "Síncope", desc: "Golpes no tempo dão +50% a mais.", max: 3, glyph: "♩" },
  aria: { id: "aria", name: "Ária", desc: "Lyra recupera 20 de vida e ganha +15 de vida máxima.", max: 5, glyph: "♥" },
  ganancia: { id: "ganancia", name: "Plateia cheia", desc: "+25% de notas ♪ ganhas.", max: 3, glyph: "♪" },
  staccato: { id: "staccato", name: "Staccato", desc: "Lyra dispara uma nota no inimigo mais próximo a cada tempo.", max: 3, glyph: "•", node: "r_stacc" },
  ostinato: { id: "ostinato", name: "Ostinato", desc: "Notas giram em volta da Lyra e ferem quem chega perto.", max: 3, glyph: "⟳", node: "l_ost" },
  sustain: { id: "sustain", name: "Sustain", desc: "O rastro da batuta fica no ar e continua cortando.", max: 3, glyph: "〰", node: "m_sust" },
  crescendo: { id: "crescendo", name: "Crescendo", desc: "Cada golpe seguido aumenta o dano em 5% (até +100%).", max: 2, glyph: "<", node: "f_cresc" },
  eco: { id: "eco", name: "Eco", desc: "25% de chance de cada golpe se repetir.", max: 3, glyph: "))", node: "m_eco" },
  coral: { id: "coral", name: "Coral", desc: "Cada acorde cura a Lyra em 4.", max: 2, glyph: "✚", node: "h_coral" },
};

// ------------------------------------------------------------------ árvore de evolução (permanente)
export type Branch = "root" | "melodia" | "folego" | "ritmo" | "harmonia" | "lyra" | "partitura";

export const BRANCHES: Record<Exclude<Branch, "root">, { name: string; color: string; angle: number }> = {
  melodia: { name: "Melodia", color: "#ffd84a", angle: -90 },
  folego: { name: "Fôlego", color: "#6ef29a", angle: -30 },
  ritmo: { name: "Ritmo", color: "#4adcff", angle: 30 },
  harmonia: { name: "Harmonia", color: "#d27aff", angle: 90 },
  lyra: { name: "Lyra", color: "#ff5d73", angle: 150 },
  partitura: { name: "Partitura", color: "#ff9b42", angle: 210 },
};

export interface TreeNode {
  id: string;
  name: string;
  desc: string;
  branch: Branch;
  max: number;
  cost: number;
  growth: number;
  /** custo em partituras (moeda de chefe) em vez de notas */
  score?: boolean;
  /** tonalidade mínima liberada (índice em KEYS) */
  key?: number;
  requires: string[];
  /** posição: profundidade no ramo e desvio lateral */
  depth: number;
  lat: number;
  glyph: string;
}

const N = (id: string, branch: Branch, name: string, desc: string, max: number, cost: number, requires: string[], depth: number, lat: number, glyph: string, extra: Partial<TreeNode> = {}): TreeNode => ({
  id,
  name,
  desc,
  branch,
  max,
  cost,
  growth: max === 1 ? 1 : 1.32,
  requires,
  depth,
  lat,
  glyph,
  ...extra,
});

export const TREE: TreeNode[] = [
  N("root", "root", "Batuta", "Sua batuta de maestro. +20% de dano.", 1, 3, [], 0, 0, "♪"),
  // Melodia — o golpe
  N("m_dmg", "melodia", "Dano", "+15% de dano da batuta.", 25, 5, ["root"], 1, 0, "⚔"),
  N("m_width", "melodia", "Traço largo", "+12% de largura do traço.", 5, 12, ["m_dmg"], 2, -1, "⌒"),
  N("m_crit", "melodia", "Acento", "+4% de chance de golpe crítico.", 10, 15, ["m_dmg"], 2, 1, ">"),
  N("m_critd", "melodia", "Sforzando", "+30% de dano do golpe crítico.", 10, 25, ["m_crit"], 3, 1.4, "sf"),
  N("m_speed", "melodia", "Arco veloz", "Golpes rápidos causam até +10% a mais.", 5, 20, ["m_width"], 3, -1.4, "»"),
  N("m_sust", "melodia", "Repertório: Sustain", "Coloca o motivo Sustain no sorteio das partidas.", 1, 40, ["m_speed"], 4, -1.8, "〰"),
  N("m_eco", "melodia", "Repertório: Eco", "Coloca o motivo Eco no sorteio das partidas.", 1, 60, ["m_critd"], 4, 1.8, "))", { key: 1 }),
  N("m_dmg2", "melodia", "Virtuose", "+40% de dano da batuta.", 10, 400, ["m_sust", "m_eco"], 5, 0, "★", { key: 2 }),
  // Fôlego — estamina
  N("f_max", "folego", "Pulmões", "+15 de fôlego máximo.", 10, 6, ["root"], 1, 0, "◯"),
  N("f_regen", "folego", "Respiração", "+12% de recuperação do fôlego.", 10, 10, ["f_max"], 2, -1, "≈"),
  N("f_cost", "folego", "Economia", "−6% de fôlego por golpe.", 5, 18, ["f_max"], 2, 1, "−"),
  N("f_second", "folego", "Segundo fôlego", "Cada abate devolve 2 de fôlego.", 5, 30, ["f_regen"], 3, -1, "↺"),
  N("f_cresc", "folego", "Repertório: Crescendo", "Coloca o motivo Crescendo no sorteio.", 1, 50, ["f_cost"], 3, 1, "<"),
  N("f_max2", "folego", "Respiração circular", "+40 de fôlego máximo.", 5, 300, ["f_second", "f_cresc"], 4, 0, "∞", { key: 2 }),
  // Ritmo
  N("r_mul", "ritmo", "No tempo", "Golpes na batida causam +25% a mais.", 10, 8, ["root"], 1, 0, "♩"),
  N("r_window", "ritmo", "Ouvido absoluto", "Janela da batida 15% maior.", 5, 14, ["r_mul"], 2, -1, "◐"),
  N("r_march", "ritmo", "Andante", "Inimigos 4% mais lentos.", 5, 20, ["r_mul"], 2, 1, "⏷"),
  N("r_stacc", "ritmo", "Repertório: Staccato", "Coloca o motivo Staccato no sorteio.", 1, 45, ["r_window"], 3, -1, "•"),
  N("r_metro", "ritmo", "Metrônomo", "−4 BPM: as músicas ficam mais lentas.", 3, 35, ["r_march"], 3, 1, "⏱"),
  N("r_mul2", "ritmo", "Maestria rítmica", "Golpes no tempo causam +60% a mais.", 5, 350, ["r_stacc", "r_metro"], 4, 0, "♬", { key: 2 }),
  // Harmonia — acordes
  N("h_dmg", "harmonia", "Ressonância", "+20% de dano dos acordes.", 15, 10, ["root"], 1, 0, "♫"),
  N("h_ii", "harmonia", "Acorde ii", "Libera o acorde menor do 2º grau (ex.: Ré–Fá–Lá).", 1, 25, ["h_dmg"], 2, -1, "ii"),
  N("h_radius", "harmonia", "Reverberação", "+12% de raio dos acordes.", 5, 18, ["h_dmg"], 2, 1, "◎"),
  N("h_vi", "harmonia", "Acorde vi", "Libera o acorde menor do 6º grau (ex.: Lá–Dó–Mi).", 1, 60, ["h_ii"], 3, -1.4, "vi"),
  N("h_coral", "harmonia", "Repertório: Coral", "Coloca o motivo Coral no sorteio.", 1, 50, ["h_radius"], 3, 1.4, "✚"),
  N("h_iii", "harmonia", "Acorde iii", "Libera o acorde menor do 3º grau (ex.: Mi–Sol–Si).", 1, 150, ["h_vi"], 4, -1.8, "iii", { key: 1 }),
  N("h_v7", "harmonia", "Dominante com sétima", "Libera o V7 (4 notas, ex.: Sol–Si–Ré–Fá): o acorde mais forte.", 1, 2, ["h_coral"], 4, 1.8, "V7", { score: true, key: 1 }),
  N("h_arp", "harmonia", "Arpejo", "Acordes também atingem todos os inimigos das mesmas notas na tela.", 1, 3, ["h_iii", "h_v7"], 5, 0, "⋰", { score: true, key: 2 }),
  // Lyra — a cantora no centro
  N("l_hp", "lyra", "Voz firme", "+20% de vida da Lyra.", 15, 6, ["root"], 1, 0, "♥"),
  N("l_regen", "lyra", "Afinação", "Lyra recupera 0,5 de vida por segundo.", 5, 15, ["l_hp"], 2, -1, "✚"),
  N("l_shield", "lyra", "Canção de ninar", "Escudo de 15 de vida a cada movimento.", 5, 22, ["l_hp"], 2, 1, "⛨"),
  N("l_ost", "lyra", "Repertório: Ostinato", "Coloca o motivo Ostinato no sorteio.", 1, 45, ["l_regen"], 3, -1, "⟳"),
  N("l_cry", "lyra", "Agudo", "Quando é atingida, Lyra solta um agudo que empurra os inimigos (a cada 8 tempos).", 1, 2, ["l_shield"], 3, 1, "!", { score: true }),
  N("l_hp2", "lyra", "Diva", "+50% de vida da Lyra.", 5, 300, ["l_ost", "l_cry"], 4, 0, "♛", { key: 2 }),
  // Partitura — economia
  N("p_notes", "partitura", "Cachê", "+12% de notas ♪ ganhas.", 20, 8, ["root"], 1, 0, "♪"),
  N("p_xp", "partitura", "Inspiração", "+12% de inspiração (motivos mais rápido).", 10, 12, ["p_notes"], 2, -1, "✦"),
  N("p_spawn", "partitura", "Plateia", "+12% de inimigos (mais notas, mais perigo).", 5, 20, ["p_notes"], 2, 1, "☺"),
  N("p_reroll", "partitura", "Rascunho", "+1 troca de motivos por partida.", 3, 40, ["p_xp"], 3, -1, "↻"),
  N("p_start", "partitura", "Ensaio", "Começa cada partida com 1 motivo.", 2, 80, ["p_spawn"], 3, 1, "▶"),
  N("p_choice", "partitura", "Improviso", "4 opções de motivo em vez de 3.", 1, 3, ["p_reroll", "p_start"], 4, 0, "4", { score: true, key: 1 }),
];

export const ROOMS_PER_CONCERT = 5;
export const ROOM_NAMES = ["I · Prelúdio", "II · Allegro", "III · Scherzo", "IV · Presto", "V · Finale"];
