/**
 * AGENTES DO MAPA.
 *
 * Um agente é qualquer figura que anda pelas estradas: o viajante do jogador
 * hoje, e depois lordes, mensageiros, caravanas, patrulhas e exércitos. Todos
 * usam a mesma folha de sprites direcional e o mesmo componente de desenho —
 * o que muda é só qual folha e quais cores.
 *
 * As folhas passam por `tools/pack-agent-sheet.py`, que alinha todos os
 * quadros pelo ponto de apoio (cascos). Por isso a âncora é sempre a mesma:
 * centro horizontal, base vertical da célula.
 */
import knightRider from "../../assets/agents/knight_rider.png?url";
import lordRider from "../../assets/agents/lord_rider.png?url";
import outriders from "../../assets/agents/outriders.png?url";
import messenger from "../../assets/agents/messenger.png?url";
import patrolFootmen from "../../assets/agents/patrol_footmen.png?url";
import levyColumn from "../../assets/agents/levy_column.png?url";
import raiders from "../../assets/agents/raiders.png?url";
import pilgrims from "../../assets/agents/pilgrims.png?url";
import merchantMule from "../../assets/agents/merchant_mule.png?url";
import caravanWagon from "../../assets/agents/caravan_wagon.png?url";
import royalCarriage from "../../assets/agents/royal_carriage.png?url";

/** As quatro diagonais do mapa. É a ordem das linhas da folha. */
export const AGENT_DIRECTIONS = ["NW", "NE", "SW", "SE"] as const;
export type AgentDirection = (typeof AGENT_DIRECTIONS)[number];

export type AgentSheet = {
  url: string;
  /** Uma linha por direção, na ordem de `AGENT_DIRECTIONS`. */
  rows: number;
  /** Quadros de caminhada por direção. */
  cols: number;
  /** Tamanho da célula na folha, em pixels. */
  cellWidth: number;
  cellHeight: number;
  /** Quadros por segundo da cavalgada. */
  fps: number;
  /** Largura da sombra, como fração da altura. */
  shadowWidth: number;
  /** Arte em pixel art não pode ser suavizada na ampliação. */
  pixelArt?: boolean;
};

/**
 * Cores da Casa.
 *
 * Ainda NÃO são aplicadas: recolorir estandarte e traje separadamente exige
 * que a arte venha com máscaras por parte (bandeira, capa, escudo) em canais
 * ou camadas próprias, e esta folha é uma imagem achatada. O tipo existe e já
 * atravessa o componente para que, quando a arte tiver as máscaras, só a
 * pintura mude — nem o agente, nem a viagem, nem o mapa.
 */
export type AgentColors = {
  primary?: string;
  secondary?: string;
  bannerColor?: string;
  houseStyle?: string;
};

/**
 * Todas as folhas saem de `tools/pack-agent-sheet.py --pixel 48`, então a
 * ALTURA da célula é sempre 48: é o padrão do jogo. A largura varia com o
 * assunto — uma carroça ocupa mais lado a lado que um cavaleiro — e é o número
 * que a ferramenta imprime ao empacotar.
 *
 * `fps` mais baixo para quem anda a pé e para veículos pesados; a passada de
 * um bufarinheiro não tem o mesmo compasso de um cavalo a meio galope.
 */
export const agentSheets = {
  knight_rider:   { url: knightRider,   rows: 4, cols: 4, cellWidth: 48, cellHeight: 48, fps: 8, shadowWidth: 0.34, pixelArt: true },
  lord_rider:     { url: lordRider,     rows: 4, cols: 4, cellWidth: 55, cellHeight: 48, fps: 7, shadowWidth: 0.34, pixelArt: true },
  outriders:      { url: outriders,     rows: 4, cols: 4, cellWidth: 43, cellHeight: 48, fps: 8, shadowWidth: 0.36, pixelArt: true },
  messenger:      { url: messenger,     rows: 4, cols: 4, cellWidth: 58, cellHeight: 48, fps: 9, shadowWidth: 0.34, pixelArt: true },
  patrol_footmen: { url: patrolFootmen, rows: 4, cols: 4, cellWidth: 50, cellHeight: 48, fps: 6, shadowWidth: 0.42, pixelArt: true },
  levy_column:    { url: levyColumn,    rows: 4, cols: 4, cellWidth: 59, cellHeight: 48, fps: 6, shadowWidth: 0.46, pixelArt: true },
  raiders:        { url: raiders,       rows: 4, cols: 4, cellWidth: 64, cellHeight: 48, fps: 6, shadowWidth: 0.5,  pixelArt: true },
  pilgrims:       { url: pilgrims,      rows: 4, cols: 4, cellWidth: 75, cellHeight: 48, fps: 5, shadowWidth: 0.56, pixelArt: true },
  merchant_mule:  { url: merchantMule,  rows: 4, cols: 4, cellWidth: 81, cellHeight: 48, fps: 5, shadowWidth: 0.6,  pixelArt: true },
  caravan_wagon:  { url: caravanWagon,  rows: 4, cols: 4, cellWidth: 74, cellHeight: 48, fps: 6, shadowWidth: 0.6,  pixelArt: true },
  royal_carriage: { url: royalCarriage, rows: 4, cols: 4, cellWidth: 69, cellHeight: 48, fps: 6, shadowWidth: 0.58, pixelArt: true },
} satisfies Record<string, AgentSheet>;

export type AgentSheetId = keyof typeof agentSheets;

/**
 * Direção a partir do vetor de deslocamento, com zona morta.
 *
 * Sem a zona morta o sprite piscaria entre duas linhas sempre que a estrada
 * corresse quase na horizontal ou quase na vertical, porque o sinal do
 * componente pequeno troca a cada curva mínima. Aqui cada eixo só vira quando
 * o movimento naquele eixo é claro; senão mantém o que estava.
 */
export function directionFrom(dx: number, dy: number, previous: AgentDirection): AgentDirection {
  const length = Math.hypot(dx, dy) || 1;
  const x = dx / length;
  const y = dy / length;
  const DEAD = 0.2;

  let east = previous === "NE" || previous === "SE";
  let north = previous === "NW" || previous === "NE";
  if (x > DEAD) east = true;
  else if (x < -DEAD) east = false;
  if (y < -DEAD) north = true;
  else if (y > DEAD) north = false;

  return north ? (east ? "NE" : "NW") : east ? "SE" : "SW";
}
