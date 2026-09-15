/** Movimento e persistência das forças; a rotina usa estradas e a caça pode cortar terreno. */
import { createRef, useEffect, useRef, useState, type RefObject } from "react";
import { UNITS_PER_HOUR, findPath } from "../world/navgraph";
import { routeNodeById } from "../world/valdoria";
import type { Point, TravelPath } from "../world/types";
import { nextDestination, rngFor, startNode, wanderers, type Wanderer } from "../world/wanderers";
import { getState, update, useGame } from "../game/store";
import { freshForceState, type WorldForceState } from "../game/worldForces";
import { playerPursuitDestination, updatePlayerPursuits } from "../game/forceSimulation";
import { nearestRoadStop, nodeStop, pathBetween, type RoadStop } from "../world/roadStops";
import { samplePath } from "./samplePath";
import { terrainPath } from "../world/navigation/routePlanner";

const WORLD_HOURS_PER_SECOND = 4;
const ARRIVAL_DISTANCE=170;

export type WandererRuntime = {
  wanderer: Wanderer;
  markerRef: RefObject<SVGGElement>;
  headingRef: RefObject<number>;
  positionRef: RefObject<Point>;
  moving: boolean;
  troops: import("../data/troops").TroopCount;
  playerPursuit:WorldForceState["playerPursuit"];
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
  /** A rota atual nasceu da caça ao jogador, não do objetivo diário. */
  pursuingPlayer: boolean;
  pursuitTarget:Point|null;
};

function build(): State[] {
  const saved = getState().worldForces;
  return wanderers.flatMap((wanderer) => {
    const rng = rngFor(wanderer);
    const initial = saved[wanderer.id];
    const at = initial?.at ?? startNode(wanderer, rng);
    if (!at) return [];
    const node = routeNodeById.get(at)!;
    const pursuitTarget=initial?playerPursuitDestination(initial):null;
    const startingPoint=initial?.position??node;
    const to = pursuitTarget ? null : initial?.to ?? null;
    const resumedFrom = initial?.position ? nearestRoadStop(initial.position,135) : null;
    const destination = to ? nodeStop(to) : null;
    const resumed = initial?.position&&destination
      ? resumedFrom?pathBetween(resumedFrom,destination):terrainPath(initial.position,destination,"prefer_roads")
      : null;
    const path = pursuitTarget
      ? terrainPath(startingPoint,pursuitTarget,"prefer_roads")
      : to ? resumed ?? findPath(at, to) : null;
    const progress = path ? (pursuitTarget||resumed ? 0 : Math.min(initial?.progress ?? 0, path.totalDistance)) : 0;
    const point = startingPoint;
    return [{
      wanderer,
      markerRef: createRef<SVGGElement>(),
      headingRef: { current: "heading" in point && typeof point.heading==="number" ? point.heading : 0 },
      positionRef: { current: { x: point.x, y: point.y } },
      rng,
      at,
      to: path ? to : null,
      path,
      progress,
      resting: initial?.resting ?? rng() * 18,
      pursuingPlayer:!!pursuitTarget,
      pursuitTarget,
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
    position:{...state.positionRef.current},
  };
}

export function useWanderers({
  speed,paused,playerPositionRef,worldHours,
}:{speed:number;paused:boolean;playerPositionRef:RefObject<Point>;worldHours:number}) {
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
  const playerRef=useRef(playerPositionRef);
  playerRef.current=playerPositionRef;
  const hoursRef=useRef(worldHours);
  hoursRef.current=worldHours;
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
          state.pursuingPlayer=false;
          state.pursuitTarget=null;
        }
      }
      return { ...current, worldForces };
    });
  }, [game.journey?.hours, game.worldForces, states]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSave = last;
    let lastPerception=last-400;

    const place = (state: State) => {
      // Sem rota, mantenha o ponto físico. Uma força que terminou uma busca no
      // mato não pode reaparecer no último nó de estrada conhecido.
      const point = state.path ? samplePath(state.path, state.progress) : state.positionRef.current;
      if (!point) return;
      state.positionRef.current = { x: point.x, y: point.y };
      if ("heading" in point && typeof point.heading==="number") state.headingRef.current = point.heading;
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
        const forceNow=getState().worldForces[state.wanderer.id];
        const pursuitTarget=forceNow?playerPursuitDestination(forceNow):null;

        // Uma caça começa e termina no ponto físico atual. Replanejar daqui
        // impede o salto de volta ao último nó salvo.
        if(state.pursuingPlayer&&!pursuitTarget){
          state.path=null;state.to=null;state.progress=0;state.resting=0;state.pursuingPlayer=false;state.pursuitTarget=null;
          if(flags[i]){flags[i]=false;changed=true;}
        }
        if(pursuitTarget&&(!state.pursuingPlayer||!state.pursuitTarget||Math.hypot(state.pursuitTarget.x-pursuitTarget.x,state.pursuitTarget.y-pursuitTarget.y)>90)){
          const found=terrainPath(state.positionRef.current,pursuitTarget,"prefer_roads");
          state.pursuingPlayer=true;
          state.pursuitTarget={...pursuitTarget};
          if(found){state.to=null;state.path=found;state.progress=0;state.resting=0;
            if(!flags[i]){flags[i]=true;changed=true;}}
          else {state.to=null;state.path=null;state.resting=.5;}
        }
        const commandedTarget=forceNow?.campaignOrder?.targetPoiId;
        if(commandedTarget&&!pursuitTarget&&((state.path&&state.to!==commandedTarget)||(!state.path&&state.at!==commandedTarget))){
          // A ordem vira a marcha no ponto físico atual, inclusive no meio de
          // uma estrada. O planner monta a nova rota no mesmo pulso.
          if(state.path&&state.to!==commandedTarget){state.path=null;state.to=null;state.progress=0;
            if(flags[i]){flags[i]=false;changed=true;}}
          state.resting=0;
        }
        if (state.path) {
          const terrainModifier=state.path.terrainModifier??1;
          state.progress = Math.min(state.path.totalDistance, state.progress + hours * UNITS_PER_HOUR * state.wanderer.pace/terrainModifier);
          place(state);
          if (state.progress >= state.path.totalDistance - 0.01) {
            if(state.to)state.at=state.to;
            else {
              const nearby=nearestRoadStop(state.positionRef.current,190);
              if(nearby?.kind==="node")state.at=nearby.id;
            }
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
        if(pursuitTarget)state.resting=0;
        state.resting -= hours;
        place(state);
        if (state.resting > 0) return;
        const force=getState().worldForces[state.wanderer.id];
        const playerTarget=force?playerPursuitDestination(force):null;
        if(playerTarget&&Math.hypot(state.positionRef.current.x-playerTarget.x,state.positionRef.current.y-playerTarget.y)<=ARRIVAL_DISTANCE){state.resting=.35;return;}
        const targetForce=force?.targetForceId?getState().worldForces[force.targetForceId]:undefined;
        const strategic=targetForce?.status==="active"?targetForce.at:force?.targetPoiId;
        if(strategic===state.at&&force&&["defend","gather","siege"].includes(force.objective)){
          state.resting=4;
          return;
        }
        const to = strategic&&strategic!==state.at ? strategic : nextDestination(state.wanderer, state.at, state.rng);
        const here=nearestRoadStop(state.positionRef.current,135);
        const destination=to?nodeStop(to):null;
        const found = to ? (here&&destination?pathBetween(here,destination):destination?terrainPath(state.positionRef.current,destination,"prefer_roads"):findPath(state.at, to)) : null;
        if (!found) { state.resting = 6; return; }
        state.to = to;
        state.path = found;
        state.progress = 0;
        state.pursuingPlayer=false;
        state.pursuitTarget=null;
        if (!flags[i]) { flags[i] = true; changed = true; }
      });

      if(now-lastPerception>=320&&playerRef.current.current){
        lastPerception=now;
        const player={...playerRef.current.current};
        const positions=new Map(states.filter((s)=>activeRef.current.has(s.wanderer.id))
          .map((s)=>[s.wanderer.id,{...s.positionRef.current}] as const));
        // Uma distância curta da malha basta para denunciar poeira, pegadas e
        // testemunhas de estrada; fora dela o bônus de visibilidade desaparece.
        const onRoad=!!nearestRoadStop(player,135);
        update((current)=>{
          const worldForces=updatePlayerPursuits(current.worldForces,positions,player,hoursRef.current,onRoad);
          return worldForces===current.worldForces?current:{...current,worldForces};
        });
      }

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
      playerPursuit:force?.playerPursuit??"none",
      currentStop: () => nearestRoadStop(state.positionRef.current,180) ?? {kind:"free",...state.positionRef.current},
    }];
  });
}
