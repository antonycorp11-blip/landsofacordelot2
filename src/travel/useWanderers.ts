/**
 * O MAPA ANDANDO SOZINHO.
 *
 * Move todos os agentes de ambiente num único `requestAnimationFrame`. Um rAF
 * por agente daria dezesseis laços disputando o mesmo frame para escrever
 * dezesseis transformações — aqui é um laço só, e cada posição vai direto para
 * o DOM, sem passar pelo React. Só a troca entre ANDANDO e PARADO passa por
 * estado, e isso acontece algumas vezes por minuto.
 *
 * Eles percorrem a MESMA malha de estradas do jogador, com o mesmo `findPath`:
 * nunca cortam mato, nunca atravessam rio fora da ponte, nunca teleportam.
 *
 * O relógio: seguem o tempo real multiplicado pela velocidade do HUD e param
 * na pausa, com a mesma conversão de horas do viajante. Não escrevem no
 * relógio do mundo — quem conta o tempo do jogo continua sendo a viagem do
 * jogador. É ambiente, não simulação.
 */
import { createRef, useEffect, useRef, useState, type RefObject } from "react";
import { UNITS_PER_HOUR, findPath } from "../world/navgraph";
import { routeNodeById } from "../world/valdoria";
import type { TravelPath } from "../world/types";
import { nextDestination, rngFor, startNode, wanderers, type Wanderer } from "../world/wanderers";
import { samplePath } from "./samplePath";

/** Mesma conversão do viajante: horas do mundo por segundo real na velocidade 1×. */
const WORLD_HOURS_PER_SECOND = 4;

export type WandererRuntime = {
  wanderer: Wanderer;
  markerRef: RefObject<SVGGElement>;
  headingRef: RefObject<number>;
  /** Verdadeiro enquanto anda; falso enquanto descansa no destino. */
  moving: boolean;
};

type State = {
  wanderer: Wanderer;
  markerRef: RefObject<SVGGElement>;
  headingRef: { current: number };
  rng: () => number;
  at: string;
  path: TravelPath | null;
  progress: number;
  /** Horas do mundo que ainda faltam parado no destino. */
  resting: number;
};

function build(): State[] {
  const out: State[] = [];
  for (const wanderer of wanderers) {
    const rng = rngFor(wanderer);
    const at = startNode(wanderer, rng);
    if (!at) continue;
    out.push({
      wanderer,
      markerRef: createRef<SVGGElement>(),
      headingRef: { current: 0 },
      rng,
      at,
      path: null,
      progress: 0,
      // Escalonado, senão os dezesseis partem juntos no primeiro frame.
      resting: rng() * 18,
    });
  }
  return out;
}

export function useWanderers({ speed, paused }: { speed: number; paused: boolean }) {
  const statesRef = useRef<State[] | null>(null);
  statesRef.current ??= build();
  const states = statesRef.current;

  const [moving, setMoving] = useState<boolean[]>(() => states.map(() => false));
  const movingRef = useRef(moving);
  movingRef.current = moving;

  const speedRef = useRef(speed);
  speedRef.current = speed;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    /** Põe o agente no lugar exato em que está, parado ou andando. */
    const place = (s: State) => {
      const node = routeNodeById.get(s.at);
      const g = s.markerRef.current;
      if (!g) return;
      if (s.path) {
        const at = samplePath(s.path, s.progress);
        s.headingRef.current = at.heading;
        g.setAttribute("transform", `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`);
      } else if (node) {
        g.setAttribute("transform", `translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})`);
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(frame);
      if (pausedRef.current) return;

      const hours = WORLD_HOURS_PER_SECOND * speedRef.current * dt;
      let changed = false;
      const flags = movingRef.current.slice();

      states.forEach((s, i) => {
        if (s.path) {
          s.progress = Math.min(
            s.path.totalDistance,
            s.progress + hours * UNITS_PER_HOUR * s.wanderer.pace,
          );
          place(s);
          if (s.progress >= s.path.totalDistance - 0.01) {
            s.at = s.path.nodeIds[s.path.nodeIds.length - 1];
            s.path = null;
            s.progress = 0;
            const [lo, hi] = s.wanderer.dwell;
            s.resting = lo + s.rng() * (hi - lo);
            if (flags[i]) { flags[i] = false; changed = true; }
          }
          return;
        }

        s.resting -= hours;
        if (s.resting > 0) {
          place(s);
          return;
        }

        // Descansou o bastante: escolhe o próximo destino e põe-se a caminho.
        const to = nextDestination(s.wanderer, s.at, s.rng);
        const found = to ? findPath(s.at, to) : null;
        if (!found) {
          // Sem rota (não deveria acontecer numa malha conexa): espera e tenta de novo.
          s.resting = 6;
          return;
        }
        s.path = found;
        s.progress = 0;
        place(s);
        if (!flags[i]) { flags[i] = true; changed = true; }
      });

      if (changed) setMoving(flags);
    };

    // Primeiro posicionamento antes do primeiro frame, senão os agentes
    // aparecem todos na origem do mundo por um instante.
    states.forEach(place);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [states]);

  const runtimes: WandererRuntime[] = states.map((s, i) => ({
    wanderer: s.wanderer,
    markerRef: s.markerRef,
    headingRef: s.headingRef,
    moving: moving[i],
  }));

  return runtimes;
}
