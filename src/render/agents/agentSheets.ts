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

export const agentSheets = {
  knight_rider: {
    url: knightRider,
    rows: 4,
    cols: 4,
    cellWidth: 64,
    cellHeight: 64,
    fps: 8,
    shadowWidth: 0.34,
    pixelArt: true,
  },
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
