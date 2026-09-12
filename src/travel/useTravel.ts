/**
 * Viagem do personagem pela malha de estradas.
 *
 * O marcador nunca interpola em linha reta entre dois lugares: ele percorre a
 * polilinha real da estrada, ponto a ponto. A posição é escrita direto no DOM
 * a cada frame — só mudanças de estado "grandes" (iniciar, chegar, trocar de
 * região) passam pelo React.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { UNITS_PER_HOUR, findPath, nodeBoundaries, routeEdgeById } from "../world/navgraph";
import { samplePath } from "./samplePath";

import type { Point, RegionId, TravelEvents, TravelPath } from "../world/types";
import { crossingByNodeId, routeNodeById } from "../world/valdoria";

/**
 * Horas do mundo que passam por segundo real na velocidade 1×.
 *
 * A animação é medida em TEMPO, não em distância: assim ela acompanha
 * automaticamente o ritmo definido por `DAYS_TO_CROSS_KINGDOM` e não precisa
 * ser reajustada quando o mapa muda de tamanho.
 */
const WORLD_HOURS_PER_SECOND = 4;

export type TravelState = "idle" | "traveling" | "arrived";

type Options = {
  startNodeId: string;
  events?: TravelEvents;
  /** Chamado a cada frame com a posição atual — usado pela câmera. */
  onFrame?: (pos: Point, regionId: RegionId) => void;
};

export function useTravel({ startNodeId, events, onFrame }: Options) {
  const start = routeNodeById.get(startNodeId)!;
  const markerRef = useRef<SVGGElement | null>(null);
  const posRef = useRef<Point>({ x: start.x, y: start.y });
  const headingRef = useRef(0);

  const pathRef = useRef<TravelPath | null>(null);
  const boundariesRef = useRef<number[]>([]);
  const progressRef = useRef(0);
  const nodeCursorRef = useRef(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const speedRef = useRef(1);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const [state, setState] = useState<TravelState>("idle");
  const [path, setPath] = useState<TravelPath | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState(startNodeId);
  const [regionId, setRegionId] = useState<RegionId>(start.regionId);
  const [worldHours, setWorldHours] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const regionRef = useRef<RegionId>(start.regionId);

  const writeMarker = useCallback(() => {
    const g = markerRef.current;
    if (g) g.setAttribute("transform", `translate(${posRef.current.x.toFixed(2)} ${posRef.current.y.toFixed(2)})`);
    onFrame?.(posRef.current, regionRef.current);
  }, [onFrame]);

  useEffect(() => {
    writeMarker();
  }, [writeMarker]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  /** Trecho que está sendo percorrido na distância `d`. */
  const edgeAtDistance = useCallback((p: TravelPath, d: number) => {
    const b = boundariesRef.current;
    for (let i = p.edgeIds.length - 1; i >= 0; i--) {
      if (d >= b[i]) return routeEdgeById.get(p.edgeIds[i]);
    }
    return routeEdgeById.get(p.edgeIds[0]);
  }, []);

  const frame = useCallback(
    (now: number) => {
      const p = pathRef.current;
      if (!p) return;
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const before = progressRef.current;
      // O modificador de terreno freia o marcador de verdade: uma trilha de
      // montanha avança na tela na metade da velocidade de uma estrada real.
      const modifier = edgeAtDistance(p, before)?.movementModifier ?? 1;
      const hours = WORLD_HOURS_PER_SECOND * speedRef.current * dt;
      const after = Math.min(p.totalDistance, before + (hours * UNITS_PER_HOUR) / modifier);
      progressRef.current = after;
      const at = samplePath(p, after);
      posRef.current = { x: at.x, y: at.y };
      headingRef.current = at.heading;
      setWorldHours((h) => h + ((after - before) * modifier) / UNITS_PER_HOUR);

      // Nó alcançado?
      while (
        nodeCursorRef.current < p.nodeIds.length - 1 &&
        after >= boundariesRef.current[nodeCursorRef.current + 1] - 0.5
      ) {
        nodeCursorRef.current++;
        const nodeId = p.nodeIds[nodeCursorRef.current];
        const node = routeNodeById.get(nodeId)!;
        setCurrentNodeId(nodeId);
        eventsRef.current?.onRouteNodeReached?.(nodeId, node);

        const crossing = crossingByNodeId.get(nodeId);
        if (crossing) {
          eventsRef.current?.onBorderCrossed?.(crossing);
          const next = p.edgeIds[nodeCursorRef.current];
          const nextRegion = routeEdgeById.get(next)?.regionId;
          const entered =
            nextRegion ?? (crossing.connects.find((r) => r !== regionRef.current) as RegionId);
          if (entered && entered !== regionRef.current) {
            regionRef.current = entered;
            setRegionId(entered);
            eventsRef.current?.onRegionEntered?.(entered);
          }
        } else if (node.regionId !== regionRef.current) {
          regionRef.current = node.regionId;
          setRegionId(node.regionId);
          eventsRef.current?.onRegionEntered?.(node.regionId);
        }

        const traversed = routeEdgeById.get(p.edgeIds[nodeCursorRef.current - 1]);
        if (traversed) {
          const roll = Math.random();
          eventsRef.current?.onRandomEventCheck?.(traversed, roll);
        }
      }

      writeMarker();

      if (after >= p.totalDistance - 0.01) {
        stop();
        setState("arrived");
        const destination = p.nodeIds[p.nodeIds.length - 1];
        setCurrentNodeId(destination);
        eventsRef.current?.onDestinationReached?.(destination);
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    },
    [edgeAtDistance, stop, writeMarker],
  );

  const travelTo = useCallback(
    (destinationNodeId: string) => {
      const from = pathRef.current && state === "traveling" ? currentNodeId : currentNodeId;
      const found = findPath(from, destinationNodeId);
      if (!found) return null;
      stop();
      pathRef.current = found;
      boundariesRef.current = nodeBoundaries(found);
      progressRef.current = 0;
      nodeCursorRef.current = 0;
      lastTimeRef.current = performance.now();
      setPath(found);
      setState("traveling");
      setPaused(false);
      eventsRef.current?.onTravelStart?.(found);
      rafRef.current = requestAnimationFrame(frame);
      return found;
    },
    [currentNodeId, frame, state, stop],
  );

  const cancel = useCallback(() => {
    stop();
    pathRef.current = null;
    setPath(null);
    setState("idle");
  }, [stop]);

  const setSpeed = useCallback((value: number) => {
    speedRef.current = value;
    setSpeedState(value);
  }, []);

  /**
   * Pausa o relógio do mundo.
   *
   * Parar é parar de verdade: o rAF é cancelado, então nada avança e nada é
   * desenhado enquanto o jogador está decidindo. Ao voltar, o cronômetro é
   * rearmado no instante atual — senão o primeiro frame depois da pausa
   * receberia todo o tempo real parado de uma vez e o marcador saltaria.
   */
  const resume = useCallback(() => {
    setPaused(false);
    const p = pathRef.current;
    if (!p || progressRef.current >= p.totalDistance || rafRef.current) return;
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(frame);
  }, [frame]);

  const pause = useCallback(() => {
    setPaused(true);
    stop();
  }, [stop]);

  const togglePause = useCallback(() => {
    if (pausedRef.current) resume();
    else pause();
  }, [pause, resume]);



  /** Teleporta o marcador (usado só por debug — nunca pelo jogo). */
  const placeAt = useCallback(
    (nodeId: string) => {
      const node = routeNodeById.get(nodeId);
      if (!node) return;
      stop();
      pathRef.current = null;
      setPath(null);
      setState("idle");
      posRef.current = { x: node.x, y: node.y };
      regionRef.current = node.regionId;
      setRegionId(node.regionId);
      setCurrentNodeId(nodeId);
      writeMarker();
    },
    [stop, writeMarker],
  );

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return {
    markerRef,
    posRef,
    headingRef,
    state,
    path,
    currentNodeId,
    regionId,
    worldHours,
    speed,
    setSpeed,
    paused,
    togglePause,
    /** Distância já percorrida na rota atual — lida por frame pelo HUD. */
    progressRef,
    travelTo,
    cancel,
    placeAt,
  };
}
