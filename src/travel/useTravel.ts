import { useCallback, useEffect, useRef, useState } from 'react';
import { UNITS_PER_HOUR, routeEdgeById } from '../world/navgraph';
import { crossingByNodeId, routeNodeById } from '../world/valdoria';
import { nodeStop, pathBetween, saveStop, stopAlong, type RoadStop } from '../world/roadStops';
import { terrainPath } from '../world/navigation/routePlanner';
import { regionAtPoint } from '../world/navigation/navigationGrid';
import type { Point, RegionId, TravelEvents, TravelPath } from '../world/types';
import { getState, flushGameSave } from '../game/store';
import { saveJourney, settleDays, tutorialFlag } from '../game/adventure';
import { samplePath } from './samplePath';
import { restoreJourney } from './journey';

const WORLD_HOURS_PER_SECOND=4;
/**
 * O RELÓGIO DO MUNDO NÃO PARA.
 *
 * Parado o tempo corre devagar — uma hora do mundo a cada dois segundos. Na
 * estrada corre como sempre correu. É o que permite que prazo e calendário
 * andem sem obrigar o jogador a cavalgar em círculos para o dia virar.
 */
const IDLE_HOURS_PER_SECOND=0.5;

export type TravelState='idle'|'traveling'|'arrived';
export type TravelRouteMode='road'|'concealed';
type Options={startNodeId:string;events?:TravelEvents;blocked?:boolean;onFrame?:(pos:Point,regionId:RegionId)=>void};

/**
 * A VIAGEM.
 *
 * O destino é uma PARADA, e uma parada pode ser uma cidade ou um ponto
 * qualquer de estrada. Isso vale também para a origem: quem para no meio do
 * caminho parte dali, sem voltar para a cidade anterior — é o que torna
 * possível desviar de uma rota já começada em vez de assistir ao próprio
 * cavalo andar até o fim.
 *
 * O trajeto é percorrido por TRECHOS (`legAt`/`legEnd`), não por nós: um
 * trecho parcial no começo ou no fim não termina em lugar nenhum, e o loop
 * precisa saber disso para não anunciar chegada num nó que não existe.
 */
export function useTravel({startNodeId,events,blocked=false,onFrame}:Options) {
  const [initial]=useState(()=>restoreJourney(startNodeId));
  const markerRef=useRef<SVGGElement|null>(null);
  const posRef=useRef<Point>(initial.position);
  const headingRef=useRef(initial.position.heading);
  const pathRef=useRef(initial.path);
  const boundariesRef=useRef(initial.boundaries);
  const progressRef=useRef(initial.distance);
  const legCursorRef=useRef(initial.cursor);
  const stopRef=useRef<RoadStop>(initial.stop);
  const regionRef=useRef<RegionId>(initial.regionId);
  const hoursRef=useRef(initial.hours);
  const speedRef=useRef(initial.speed);
  const pausedRef=useRef(initial.paused);
  const blockedRef=useRef(blocked);
  blockedRef.current=blocked;
  const eventsRef=useRef(events);
  eventsRef.current=events;
  const rafRef=useRef(0);
  const lastTimeRef=useRef(0);
  const lastSaveRef=useRef(0);
  const lastUiRef=useRef(0);
  /** Último dia já fechado, para só cobrar quando o dia realmente vira. */
  const dayRef=useRef(Math.floor(initial.hours/24)+1);
  const [state,setState]=useState<TravelState>(initial.path?'traveling':'idle');
  const [path,setPath]=useState<TravelPath|null>(initial.path);
  const [stop,setStopState]=useState<RoadStop>(initial.stop);
  const [regionId,setRegionId]=useState(initial.regionId);
  const [worldHours,setWorldHours]=useState(initial.hours);
  const [speed,setSpeedState]=useState(initial.speed);
  const [paused,setPaused]=useState(initial.paused);

  const writeMarker=useCallback(()=>{
    markerRef.current?.setAttribute('transform',`translate(${posRef.current.x.toFixed(2)} ${posRef.current.y.toFixed(2)})`);
    onFrame?.(posRef.current,regionRef.current);
  },[onFrame]);

  const checkpoint=useCallback(()=>{
    const p=pathRef.current;
    /**
     * Numa rota de TERRENO a parada não muda enquanto se anda — ela só é
     * atualizada na chegada. Gravar `stopRef` no meio da viagem salvava o
     * ponto de PARTIDA, e recarregar rebobinava o jogador para trás. Aqui a
     * posição real do marcador é a verdade.
     */
    const here: RoadStop = p?.endPoint
      ? { kind: 'free', x: posRef.current.x, y: posRef.current.y }
      : stopRef.current;
    saveJourney({
      currentNodeId:here.kind==='node'?here.id:null,
      destinationId:p?.endStop?.kind==='node'?p.endStop.id:null,
      at:saveStop(here),
      from:p?saveStop(initialStopOf(p,here)):null,
      to:p?.endStop?saveStop(p.endStop):p?.endPoint?saveStop({kind:'free',x:p.endPoint.x,y:p.endPoint.y}):null,
      distance:progressRef.current,
      hours:hoursRef.current,speed:speedRef.current,paused:pausedRef.current,
      routeMode:p?.navigationMode,
    });
  },[]);

  const stopLoop=useCallback(()=>{
    cancelAnimationFrame(rafRef.current);
    rafRef.current=0;
  },[]);

  const setStop=useCallback((next:RoadStop)=>{
    stopRef.current=next;
    setStopState(next);
  },[]);

  /** Fecha o dia uma única vez, no quadro em que ele vira. */
  const closeDay=useCallback(()=>{
    const day=Math.floor(hoursRef.current/24)+1;
    if (day===dayRef.current) return;
    dayRef.current=day;
    settleDays(day);
  },[]);

  /**
   * PULA HORAS DE RELÓGIO.
   *
   * Acampar não é uma tela que dá números: é tempo que passa. Quem dorme até
   * o amanhecer gasta seis horas de mundo — os feridos melhoram, a comida
   * some, e quem está procurando você teve seis horas para procurar.
   */
  const skipHours=useCallback((amount:number)=>{
    if (amount<=0) return;
    hoursRef.current+=amount;
    setWorldHours(hoursRef.current);
    closeDay();
    checkpoint();
  },[checkpoint,closeDay]);

  const frame=useCallback((now:number)=>{
    rafRef.current=0;
    const p=pathRef.current;
    if (pausedRef.current || blockedRef.current || document.hidden || getState().adventure.event || getState().adventure.raid || getState().adventure.battle || getState().adventure.quest?.pending) return;
    const dt=Math.min(.05,(now-lastTimeRef.current)/1000);
    lastTimeRef.current=now;

    if (!p) {
      // Parado: só o relógio anda. A barra mostra horas inteiras, então a
      // interface só é avisada quando a hora vira.
      const before=Math.floor(hoursRef.current);
      hoursRef.current+=IDLE_HOURS_PER_SECOND*speedRef.current*dt;
      if (Math.floor(hoursRef.current)!==before) setWorldHours(hoursRef.current);
      closeDay();
      if (now-lastSaveRef.current>4000) { lastSaveRef.current=now; checkpoint(); }
      rafRef.current=requestAnimationFrame(frame);
      return;
    }

    const boundaries=boundariesRef.current;
    const before=progressRef.current;
    const edge=routeEdgeById.get(p.edgeIds[legCursorRef.current]);
    // Sem aresta, quem carrega o custo do chão é a própria rota de terreno.
    const modifier=edge?.movementModifier??p.terrainModifier??1;
    // Para exatamente nas fronteiras; nenhuma distância não percorrida é
    // creditada quando um encontro interrompe a viagem.
    const nextBoundary=boundaries[legCursorRef.current+1]??p.totalDistance;
    const after=Math.min(nextBoundary,p.totalDistance,before+WORLD_HOURS_PER_SECOND*speedRef.current*dt*UNITS_PER_HOUR/modifier);
    progressRef.current=after;
    const at=samplePath(p,after);
    posRef.current={x:at.x,y:at.y};
    headingRef.current=at.heading;
    hoursRef.current+=((after-before)*modifier)/UNITS_PER_HOUR;
    if(p.endPoint) {
      const region=regionAtPoint(posRef.current);
      if(region&&region!==regionRef.current) {
        regionRef.current=region;
        setRegionId(region);
        eventsRef.current?.onRegionEntered?.(region);
      }
    }
    // O dia vira também na estrada: soldo e comida não esperam você parar.
    closeDay();
    if (now-lastUiRef.current>=100) {
      lastUiRef.current=now;
      setWorldHours(hoursRef.current);
    }

    const arrived=after>=p.totalDistance-1e-6;
    const crossed=after>=nextBoundary-1e-6 && legCursorRef.current<p.edgeIds.length-1;

    if (crossed||arrived) {
      setWorldHours(hoursRef.current);
      const reachedNode=p.legEnd?.[legCursorRef.current];
      if (crossed) legCursorRef.current++;

      const nextRegion=routeEdgeById.get(p.edgeIds[Math.min(legCursorRef.current,p.edgeIds.length-1)])?.regionId;
      const entered=nextRegion??regionRef.current;
      if (entered!==regionRef.current) { regionRef.current=entered; setRegionId(entered); }

      if (arrived) {
        pathRef.current=null;
        setPath(null);
        setState('arrived');
        // Rota de terreno não termina em nó: a parada vira o próprio ponto.
        if (p.endStop?.kind==='node') {
          posRef.current={x:p.endStop.x,y:p.endStop.y};
          setStop(p.endStop);
        } else if (p.endPoint) {
          posRef.current={x:p.endPoint.x,y:p.endPoint.y};
          setStop({kind:'free',x:p.endPoint.x,y:p.endPoint.y});
        } else {
          setStop(p.endStop ?? stopAlong(p,after) ?? stopRef.current);
        }
      } else if (reachedNode) {
        const node=routeNodeById.get(reachedNode);
        if (node) setStop({kind:'node',id:node.id,x:node.x,y:node.y});
      }

      checkpoint();
      if (reachedNode) {
        const node=routeNodeById.get(reachedNode);
        if (node) eventsRef.current?.onRouteNodeReached?.(node.id,node);
        const crossing=crossingByNodeId.get(reachedNode);
        if (crossing) eventsRef.current?.onBorderCrossed?.(crossing);
      }
      if (edge && entered!==edge.regionId) eventsRef.current?.onRegionEntered?.(entered);
      if (edge && !arrived) eventsRef.current?.onRandomEventCheck?.(edge,Math.random());
      if (arrived) eventsRef.current?.onArrival?.(p.endStop ?? stopRef.current);
    } else if (now-lastSaveRef.current>1000) {
      lastSaveRef.current=now;
      checkpoint();
    }

    writeMarker();
    if (!getState().adventure.event && !getState().adventure.raid && !getState().adventure.battle && !getState().adventure.quest?.pending) rafRef.current=requestAnimationFrame(frame);
  },[checkpoint,closeDay,setStop,writeMarker]);

  useEffect(()=>{
    stopLoop();
    if (!blocked && !paused && !document.hidden) {
      lastTimeRef.current=performance.now();
      rafRef.current=requestAnimationFrame(frame);
    }
    return stopLoop;
  },[blocked,paused,frame,stopLoop]);

  /**
   * Parte para uma parada qualquer — e PODE ser chamada no meio de uma
   * viagem: o trajeto novo começa exatamente onde o viajante está, sem
   * voltar a nenhum nó. É assim que se foge de alguma coisa.
   */
  const travelTo=useCallback((destination:RoadStop|string|Point,mode:TravelRouteMode='road')=>{
    // `notice` NÃO entra aqui. É informação, não janela modal, e enquanto
    // estava nesta lista um cartão aberto no canto impedia qualquer viagem.
    if (blockedRef.current || getState().adventure.event || getState().adventure.raid || getState().adventure.battle || getState().adventure.quest?.pending) return null;
    const target=typeof destination==='string'?nodeStop(destination):destination;
    if (!target) return null;
    const isStop='kind' in target;

    // Leaving the road is a real choice: a slower overland route uses the
    // existing terrain planner's avoid_roads cost field, so pursuers see less.
    if(mode==='concealed') {
      const route=terrainPath(posRef.current,target,'avoid_roads');
      if(!route)return null;
      const endStop:RoadStop=isStop?target as RoadStop:{kind:'free',x:target.x,y:target.y};
      const found:TravelPath={...route,endStop,navigationMode:'concealed'};
      stopLoop();
      pathRef.current=found;
      boundariesRef.current=found.legAt??[0,found.totalDistance];
      progressRef.current=0;
      legCursorRef.current=0;
      setPath(found);
      setState('traveling');
      pausedRef.current=false;
      setPaused(false);
      checkpoint();
      tutorialFlag('departed');
      eventsRef.current?.onTravelStart?.(found);
      lastTimeRef.current=performance.now();
      rafRef.current=requestAnimationFrame(frame);
      return found;
    }

    /**
     * DUAS MANEIRAS DE TRAÇAR O CAMINHO, e a escolha é do destino.
     *
     * Destino que é um lugar do grafo continua usando o grafo: assim as
     * travessias, os marcos e os eventos de estrada seguem valendo. Qualquer
     * outro ponto do mapa vira rota de TERRENO — a estrada deixa de ser a
     * única coisa caminhável, mas continua sendo a mais rápida, porque o
     * planejador prefere estrada quando ela compensa.
     */
    if (!isStop || (target as RoadStop).kind==='free') {
      const to=target as Point;
      const route=terrainPath(posRef.current,to,'prefer_roads');
      if (!route) return null;
      const found:TravelPath={...route,endStop:{kind:'free',x:to.x,y:to.y},navigationMode:'road'};
      stopLoop();
      pathRef.current=found;
      boundariesRef.current=found.legAt??[0,found.totalDistance];
      progressRef.current=0;
      legCursorRef.current=0;
      setPath(found);
      setState('traveling');
      pausedRef.current=false;
      setPaused(false);
      checkpoint();
      tutorialFlag('departed');
      eventsRef.current?.onTravelStart?.(found);
      lastTimeRef.current=performance.now();
      rafRef.current=requestAnimationFrame(frame);
      return found;
    }

    const p=pathRef.current;
    const here=p ? (stopAlong(p,progressRef.current) ?? stopRef.current) : stopRef.current;
    const roadPath=pathBetween(here,target as RoadStop);
    /**
     * QUANDO O GRAFO NÃO DÁ CONTA, O TERRENO DÁ.
     *
     * `pathBetween` só sabe ligar pontos que estão na malha de estradas. Desde
     * que a campanha passou a começar no meio do mato, tocar numa cidade a
     * partir de fora da estrada não traçava rota nenhuma e o jogo parecia
     * ignorar o clique — inclusive o botão "Partir" do quadro de trabalho.
     */
    if (!roadPath || roadPath.totalDistance<=0) {
      const route=terrainPath(posRef.current,target as Point,'prefer_roads');
      if (!route) return null;
      const overland:TravelPath={...route,endStop:target as RoadStop,navigationMode:'road'};
      stopLoop();
      pathRef.current=overland;
      boundariesRef.current=overland.legAt??[0,overland.totalDistance];
      progressRef.current=0;
      legCursorRef.current=0;
      setPath(overland);
      setState('traveling');
      pausedRef.current=false;
      setPaused(false);
      checkpoint();
      tutorialFlag('departed');
      eventsRef.current?.onTravelStart?.(overland);
      lastTimeRef.current=performance.now();
      rafRef.current=requestAnimationFrame(frame);
      return overland;
    }
    const found:TravelPath={...roadPath,navigationMode:'road'};
    stopLoop();
    setStop(here);
    pathRef.current=found;
    boundariesRef.current=found.legAt??[0,found.totalDistance];
    progressRef.current=0;
    legCursorRef.current=0;
    setPath(found);
    setState('traveling');
    pausedRef.current=false;
    setPaused(false);
    checkpoint();
    tutorialFlag('departed');
    eventsRef.current?.onTravelStart?.(found);
    lastTimeRef.current=performance.now();
    rafRef.current=requestAnimationFrame(frame);
    return found;
  },[checkpoint,frame,setStop,stopLoop]);

  const halt=useCallback(()=>{
    const p=pathRef.current;
    if (!p) return;
    const here:RoadStop=p.endPoint
      ? {kind:'free',x:posRef.current.x,y:posRef.current.y}
      : stopAlong(p,progressRef.current)??stopRef.current;
    stopLoop();
    pathRef.current=null;
    setPath(null);
    setState('idle');
    setStop(here);
    posRef.current={x:here.x,y:here.y};
    progressRef.current=0;
    checkpoint();
    writeMarker();
    lastTimeRef.current=performance.now();
    rafRef.current=requestAnimationFrame(frame);
  },[checkpoint,frame,setStop,stopLoop,writeMarker]);

  const setSpeed=useCallback((value:number)=>{
    if (![1,2,4].includes(value)) return;
    speedRef.current=value;
    setSpeedState(value);
    checkpoint();
  },[checkpoint]);

  const togglePause=useCallback(()=>{
    if (blockedRef.current) return;
    pausedRef.current=!pausedRef.current;
    setPaused(pausedRef.current);
    checkpoint();
  },[checkpoint]);

  useEffect(()=>{
    writeMarker();
    checkpoint();
    const persist=()=>{checkpoint();flushGameSave();};
    const visibility=()=>{
      if (document.hidden) {stopLoop();persist();}
      else if (!pausedRef.current && !blockedRef.current) {
        // Volta sem creditar o tempo em que a aba esteve escondida.
        lastTimeRef.current=performance.now();
        stopLoop();rafRef.current=requestAnimationFrame(frame);
      }
    };
    window.addEventListener('pagehide',persist);
    document.addEventListener('visibilitychange',visibility);
    return ()=>{
      stopLoop();persist();
      window.removeEventListener('pagehide',persist);
      document.removeEventListener('visibilitychange',visibility);
    };
  },[checkpoint,frame,stopLoop,writeMarker]);

  return {markerRef,posRef,headingRef,state,path,stop,
    currentNodeId:stop.kind==='node'?stop.id:null,
    regionId,worldHours,speed,setSpeed,skipHours,
    paused:paused||blocked,togglePause,progressRef,travelTo,halt};
}

/** De onde o trajeto guardado partiu, para poder ser refeito igual. */
function initialStopOf(path:TravelPath,fallback:RoadStop):RoadStop {
  if(path.endPoint&&path.points[0]) return {kind:'free',x:path.points[0].x,y:path.points[0].y};
  return stopAlong(path,0) ?? fallback;
}
