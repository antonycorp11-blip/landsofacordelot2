import { forwardRef, memo, useEffect, useId, useRef, type RefObject } from "react";
import {
  AGENT_DIRECTIONS,
  directionFrom,
  type AgentColors,
  type AgentDirection,
  type AgentSheet,
} from "./agentSheets";

/**
 * FIGURA DE UM AGENTE NO MAPA.
 *
 * Desenha uma unidade que anda pelas estradas — hoje o viajante do jogador,
 * amanhã lordes, mensageiros, caravanas e patrulhas. Não sabe nada sobre
 * rotas, tempo do mundo ou pathfinding: recebe onde está (pelo `ref`, que
 * quem move escreve), para onde aponta e se está andando.
 *
 * A posição vem por `transform` escrito no `<g>` de fora, a cada frame, sem
 * passar pelo React. A animação faz o mesmo com o `<image>`: trocar o quadro é
 * mover a folha por trás de um recorte fixo, então nem o React nem o resto do
 * mapa re-renderizam enquanto o cavalo galopa.
 */

/**
 * TAMANHO NA TELA.
 *
 * A figura é medida em PIXELS DE TELA, não em unidades de mundo. Se fosse em
 * unidades, o mesmo zoom daria um cavaleiro de 30 px no desktop e de 11 px no
 * celular, porque a tela estreita mostra o reino inteiro numa escala bem
 * menor. Aqui o tamanho sai de quantos pixels vale uma unidade de mundo agora,
 * com um expoente baixo: na vista do reino a figura fica pequena mas legível,
 * e cresce devagar até um teto quando o jogador se aproxima.
 *
 *   altura em px = SIZE_FACTOR × (px por unidade) ^ SIZE_EXPONENT
 */
const SIZE_FACTOR = 49;
const SIZE_EXPONENT = 0.47;
const MIN_SCREEN_PX = 9;
const MAX_SCREEN_PX = 32;

/** Abaixo desta altura na tela o agente ganha um anel, senão some no mapa. */
const LOCATOR_BELOW_PX = 18;

/**
 * Oscilação da cavalgada, em pixels da folha, por quadro do ciclo.
 *
 * A arte já tem o galope; isto é só um empurrãozinho vertical para o passo
 * "bater". Mais que isso faria o cavalo flutuar.
 */
const BOB = [0, -1.5, 0, -1];

/**
 * Suavização do rumo.
 *
 * As estradas são sinuosas de propósito, então o vetor entre dois pontos
 * seguidos da polilinha oscila bastante — numa subida para nordeste aparecem
 * trechos curtos apontando para sudeste. Seguir isso ao pé da letra faria o
 * cavaleiro alternar entre "de costas" e "de frente" o tempo todo. O rumo é
 * filtrado: a figura acompanha a curva de verdade e ignora o serpenteado.
 */
const HEADING_SMOOTHING = 0.06;

type Props = {
  sheet: AgentSheet;
  /** Pixels de tela por unidade de mundo — o zoom já aplicado. */
  pxPerUnit: number;
  /** Anima enquanto verdadeiro; parado usa o primeiro quadro da direção. */
  moving: boolean;
  /** Rumo atual em graus (0 = leste, cresce para baixo, como na tela). */
  headingRef: RefObject<number>;
  /** Identidade da Casa. Ver a nota em `AgentColors`. */
  colors?: AgentColors;
  /** Anel de localização quando a figura fica pequena. Só o jogador precisa. */
  locator?: boolean;
  /**
   * Quanta gente vai com este agente.
   *
   * É a leitura estratégica do mapa: olhar e saber se ali vão dois mensageiros
   * ou sessenta homens, sem abrir menu nenhum. `undefined` não desenha nada —
   * um agente que não representa um grupo não ganha crachá.
   */
  partySize?: number;
  /** Torna o agente clicável. Sem isto ele continua sem receber toque. */
  onSelect?: () => void;
};

export const MapAgentSprite = memo(
  forwardRef<SVGGElement, Props>(function MapAgentSprite({ sheet, pxPerUnit, moving, headingRef, colors, locator = true, partySize, onSelect }, ref) {
    const imageRef = useRef<SVGImageElement>(null);
    const bobRef = useRef<SVGGElement>(null);
    const directionRef = useRef<AgentDirection>("SE");
    // `useId` devolve algo como ":r1:", e dois-pontos não é válido dentro de
    // url(#…) — o recorte seria ignorado e a folha inteira apareceria.
    const clipId = `agent${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

    useEffect(() => {
      const image = imageRef.current;
      if (!image) return;

      let raf = 0;
      let frame = 0;
      let carry = 0;
      let last = performance.now();
      const initial = (headingRef.current ?? 0) * (Math.PI / 180);
      let vx = Math.cos(initial);
      let vy = Math.sin(initial);

      const write = () => {
        const row = AGENT_DIRECTIONS.indexOf(directionRef.current);
        // A célula corrente é trazida para baixo do recorte; a âncora da folha
        // (centro horizontal, base) cai exatamente na origem do grupo.
        image.setAttribute("x", String(-frame * sheet.cellWidth - sheet.cellWidth / 2));
        image.setAttribute("y", String(-row * sheet.cellHeight - sheet.cellHeight));
        const lift = moving ? BOB[frame % BOB.length] : 0;
        bobRef.current?.setAttribute("transform", `translate(0 ${lift})`);
      };

      if (!moving) {
        frame = 0;
        write();
        return;
      }

      const period = 1 / sheet.fps;
      const step = (now: number) => {
        carry += (now - last) / 1000;
        last = now;

        const radians = (headingRef.current ?? 0) * (Math.PI / 180);
        vx += (Math.cos(radians) - vx) * HEADING_SMOOTHING;
        vy += (Math.sin(radians) - vy) * HEADING_SMOOTHING;
        directionRef.current = directionFrom(vx, vy, directionRef.current);

        if (carry >= period) {
          frame = (frame + Math.floor(carry / period)) % sheet.cols;
          carry %= period;
        }
        write();
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }, [moving, sheet, headingRef]);

    const screenPx = Math.min(
      MAX_SCREEN_PX,
      Math.max(MIN_SCREEN_PX, SIZE_FACTOR * Math.pow(Math.max(1e-6, pxPerUnit), SIZE_EXPONENT)),
    );
    const height = screenPx / pxPerUnit;
    // Unidades de mundo por pixel da folha.
    const k = height / sheet.cellHeight;
    const shadow = height * sheet.shadowWidth;
    // A cor da Casa já aparece no mapa pelo anel e pela sombra; o sprite em si
    // só poderá ser recolorido quando a arte trouxer máscaras por parte.
    const houseColor = colors?.primary ?? "#f2d98a";

    // O crachá é medido em pixels de tela, como a própria figura: precisa ficar
    // legível de longe sem virar um balão em cima do sprite de perto.
    const badgeFont = Math.max(8.5, Math.min(12, screenPx * 0.34)) / pxPerUnit;
    const badgeY = -height - badgeFont * 0.55;

    return (
      <g ref={ref} pointerEvents={onSelect ? "auto" : "none"} style={onSelect ? { cursor: "pointer" } : undefined} onClick={onSelect && ((e) => { e.stopPropagation(); onSelect(); })}>
        {onSelect && (
          <circle r={Math.max(height * 0.5, 20 / pxPerUnit)} cy={-height * 0.45} fill="transparent" />
        )}
        <defs>
          <clipPath id={clipId}>
            <rect
              x={-sheet.cellWidth / 2}
              y={-sheet.cellHeight}
              width={sheet.cellWidth}
              height={sheet.cellHeight}
            />
          </clipPath>
        </defs>

        {locator && screenPx <= LOCATOR_BELOW_PX && (
          <circle r={shadow * 0.95} fill="none" stroke={houseColor} strokeWidth={height * 0.035} opacity={0.7} />
        )}

        <ellipse rx={shadow * 0.5} ry={shadow * 0.19} fill="#241d10" opacity={0.34} />

        {partySize !== undefined && partySize > 0 && (
          <g pointerEvents="none">
            <text
              x={0}
              y={badgeY}
              textAnchor="middle"
              fontSize={badgeFont}
              fontWeight={600}
              fill="#f6ecc8"
              stroke="#1b2320"
              strokeWidth={badgeFont * 0.26}
              paintOrder="stroke"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {partySize}
            </text>
          </g>
        )}

        <g transform={`scale(${k})`}>
          <g ref={bobRef}>
            <g clipPath={`url(#${clipId})`}>
              <image
                ref={imageRef}
                href={sheet.url}
                x={-sheet.cellWidth / 2}
                y={-sheet.cellHeight}
                width={sheet.cellWidth * sheet.cols}
                height={sheet.cellHeight * sheet.rows}
                style={sheet.pixelArt ? { imageRendering: "pixelated" } : undefined}
              />
            </g>
          </g>
        </g>
      </g>
    );
  }),
);
