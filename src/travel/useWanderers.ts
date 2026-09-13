/** Movimento e persistência das forças que percorrem as estradas. */
import { createRef, useEffect, useRef, useState, type RefObject } from "react";
import { UNITS_PER_HOUR, findPath } from "../world/navgraph";
import { routeNodeById } from "../world/valdoria";
import type { Point, TravelPath } from "../world/types";
import { nextDestination, rngFor, startNode, wanderers, type Wanderer } from "../world/wanderers";
import { getState, update, useGame } from "../game/store";
import { freshForceState, type WorldForceState } from "../game/worldForces";
import { nearestRoadStop, nodeStop, type RoadStop } from "../world/roadStops";
import { samplePath } from "./samplePath";

const WORLD_HOURS_PER_SECOND = 4;

export type WandererRuntime = {
  wanderer: Wanderer;
  markerRef: RefObject<SVGGElement>;
  headingRef: RefObject<number>;
  positionRef: RefObject<Point>;
  moving: boolean;
  troops: import("../data/troops").TroopCount;
  currentStop: () => RoadStop | null;
};

type State = {
  wanderer: Wanderer;
  markerRef: RefObject<SVGGElement>;
  headingRef: { current: number };
  positionRef: { current: Point };
  rng: () => number;
  at: string;
  to: string | null;
  path: TravelPath | null;
  progress: number;
  resting: number;
};

function build(): State[] {
  const saved = getState().worldForces;
  return wanderers.flatMap((wanderer) => {
    const rng = rngFor(wanderer);
    const initial = saved[wanderer.id];
    const at = initial?.at ?? startNode(wanderer, rng);
    if (!at) return [];
    const to = initial?.to ?? null;
    const path = to ? findPath(at, to) : null;
    const node = routeNodeById.get(at)!;
    const progress = path ? Math.min(initial?.progress ?? 0, path.totalDistance) : 0;
    const point = path ? samplePath(path, progress) : node;
    return [{
      wanderer,
      markerRef: createRef<SVGGElement>(),
      headingRef: { current: "heading" in point ? point.heading : 0 },
      positionRef: { current: { x: point.x, y: point.y } },
      rng,
      at,
      to: path ? to : null,
      path,
      progress,
      resting: initial?.resting ?? rng() * 18,
    }];
  });
}

function snapshot(state: State, old?: WorldForceState): WorldForceState {
  return {
    ...(old ?? freshForceState(state.wanderer.id, state.at, state.resting)),
    at: state.at,
    to: state.to,
    progress: state.progress,
    resting: state.resting,
  };
}

export function useWanderers({ speed, paused }: { speed: number; paused: boolean }) {
  const game = useGame();
  const statesRef = useRef<State[] | null>(null);
  statesRef.current ??= build();
  const states = statesRef.current;
  const [moving, setMoving] = useState<boolean[]>(() => states.map((state) => !!state.path));
  const movingRef = useRef(moving);
  movingRef.current = moving;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const activeRef = useRef(new Set<string>());
  activeRef.current = new Set(states.filter((state) => (game.worldForces[state.wanderer.id]?.status ?? "active") === "active").map((state) => state.wanderer.id));

  // Cria o registro na primeira abertura e repõe grupos vencidos depois de
  // alguns dias, com a escalação original.
  useEffect(() => {
    const hours = game.journey?.hours ?? 0;
    const missing = states.some((state) => !game.worldForces[state.wanderer.id]);
    const returning = states.some((state) => {
      const force = game.worldForces[state.wanderer.id];
      return force?.status === "defeated" && force.returnsAt <= hours;
    });
    if (!missing && !returning) return;
    update((current) => {
      const worldForces = { ...current.worldForces };
      for (const state of states) {
        const force = worldForces[state.wanderer.id];
        if (!force) worldForces[state.wanderer.id] = snapshot(state);
        else if (force.status === "defeated" && force.returnsAt <= hours) {
          worldForces[state.wanderer.id] = freshForceState(state.wanderer.id, state.at, 8 + state.rng() * 12);
          state.path = null;
          state.to = null;
          state.progress = 0;
          state.resting = worldForces[state.wanderer.id].resting;
        }
      }
      return { ...current, worldForces };
    });
  }, [game.journey?.hours, game.worldForces, states]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSave = last;

    const place = (state: State) => {
      const node = routeNodeById.get(state.at);
      const point = state.path ? samplePath(state.path, state.progress) : node;
      if (!point) return;
      state.positionRef.current = { x: point.x, y: point.y };
      if ("heading" in point) state.headingRef.current = point.heading;
      state.markerRef.current?.setAttribute("transform", `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
    };

    const persist = () => update((current) => {
      const worldForces = { ...current.worldForces };
      for (const state of states) {
        const old = worldForces[state.wanderer.id];
        if (!old || old.status === "active") worldForces[state.wanderer.id] = snapshot(state, old);
      }
      return { ...current, worldForces };
    });

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(frame);
      if (pausedRef.current) return;
      const hours = WORLD_HOURS_PER_SECOND * speedRef.current * dt;
      let changed = false;
      let arrived = false;
      const flags = movingRef.current.slice();

      states.forEach((state, i) => {
        if (!activeRef.current.has(state.wanderer.id)) return;
        if (state.path) {
          state.progress = Math.min(state.path.totalDistance, state.progress + hours * UNITS_PER_HOUR * state.wanderer.pace);
          place(state);
          if (state.progress >= state.path.totalDistance - 0.01) {
            state.at = state.to ?? state.path.nodeIds[state.path.nodeIds.length - 1];
            state.to = null;
            state.path = null;
            state.progress = 0;
            const [lo, hi] = state.wanderer.dwell;
            state.resting = lo + state.rng() * (hi - lo);
            arrived = true;
            if (flags[i]) { flags[i] = false; changed = true; }
          }
          return;
        }
        state.resting -= hours;
        place(state);
        if (state.resting > 0) return;
        const force=getState().worldForces[state.wanderer.id];
        const targetForce=force?.targetForceId?getState().worldForces[force.targetForceId]:undefined;
        const strategic=targetForce?.status==="active"?targetForce.at:force?.targetPoiId;
        if(strategic===state.at&&force&&["defend","gather","siege"].includes(force.objective)){
          state.resting=4;
          return;
        }
        const to = strategic&&strategic!==state.at ? strategic : nextDestination(state.wanderer, state.at, state.rng);
        const found = to ? findPath(state.at, to) : null;
        if (!found) { state.resting = 6; return; }
        state.to = to;
        state.path = found;
        state.progress = 0;
        if (!flags[i]) { flags[i] = true; changed = true; }
      });

      if (changed) setMoving(flags);
      if(arrived){lastSave=now;persist();}
      if (now - lastSave > 4000) { lastSave = now; persist(); }
    };

    states.forEach(place);
    raf = requestAnimationFrame(frame);
    const onVisibility = () => { if (document.hidden) persist(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      persist();
    };
  }, [states]);

  return states.flatMap((state, i): WandererRuntime[] => {
    const force = game.worldForces[state.wanderer.id];
    if (force?.status === "defeated") return [];
    return [{
      wanderer: state.wanderer,
      markerRef: state.markerRef,
      headingRef: state.headingRef,
      positionRef: state.positionRef,
      moving: moving[i],
      troops: force?.troops ?? freshForceState(state.wanderer.id, state.at).troops,
      currentStop: () => nearestRoadStop(state.positionRef.current) ?? nodeStop(state.at),
    }];
  });
}
