import { useCallback, useEffect, useRef, useState } from 'react';
import { UNITS_PER_HOUR, findPath, nodeBoundaries, routeEdgeById } from '../world/navgraph';
import { crossingByNodeId, routeNodeById } from '../world/valdoria';
import type { Point, RegionId, TravelEvents, TravelPath } from '../world/types';
import { getState, flushGameSave } from '../game/store';
import { saveJourney, tutorialFlag } from '../game/adventure';
import { samplePath } from './samplePath';
import { restoreJourney } from './journey';

const WORLD_HOURS_PER_SECOND=4;
export type TravelState='idle'|'traveling'|'arrived';
type Options={startNodeId:string;events?:TravelEvents;blocked?:boolean;onFrame?:(pos:Point,regionId:RegionId)=>void};

export function useTravel({startNodeId,events,blocked=false,onFrame}:Options) {
  const [initial]=useState(()=>restoreJourney(startNodeId));
  const markerRef=useRef<SVGGElement|null>(null);
  const posRef=useRef<Point>(initial.position);
  const headingRef=useRef(initial.position.heading);
  const pathRef=useRef(initial.path);
  const boundariesRef=useRef(initial.boundaries);
  const progressRef=useRef(initial.distance);
  const nodeCursorRef=useRef(initial.cursor);
  const nodeRef=useRef(initial.node.id);
  const regionRef=useRef<RegionId>(initial.node.regionId);
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
  const [state,setState]=useState<TravelState>(initial.path?'traveling':'idle');
  const [path,setPath]=useState<TravelPath|null>(initial.path);
  const [currentNodeId,setCurrentNodeId]=useState(initial.node.id);
  const [regionId,setRegionId]=useState(initial.node.regionId);
  const [worldHours,setWorldHours]=useState(initial.hours);
  const [speed,setSpeedState]=useState(initial.speed);
  const [paused,setPaused]=useState(initial.paused);

  const writeMarker=useCallback(()=>{
    markerRef.current?.setAttribute('transform',`translate(${posRef.current.x.toFixed(2)} ${posRef.current.y.toFixed(2)})`);
    onFrame?.(posRef.current,regionRef.current);
  },[onFrame]);
  const checkpoint=useCallback(()=>{
    const p=pathRef.current;
    saveJourney({currentNodeId:nodeRef.current,fromNodeId:p?.nodeIds[0]??nodeRef.current,
      destinationId:p?.nodeIds[p.nodeIds.length-1]??null,distance:progressRef.current,
      hours:hoursRef.current,speed:speedRef.current,paused:pausedRef.current,
    });
  },[]);
  const stop=useCallback(()=>{
    cancelAnimationFrame(rafRef.current);
    rafRef.current=0;
  },[]);
  const frame=useCallback((now:number)=>{
    rafRef.current=0;
    const p=pathRef.current;
    if (!p || pausedRef.current || blockedRef.current || document.hidden || getState().adventure.event || getState().adventure.notice) return;
    const dt=Math.min(.05,(now-lastTimeRef.current)/1000);
    lastTimeRef.current=now;
    const before=progressRef.current;
    const edge=routeEdgeById.get(p.edgeIds[nodeCursorRef.current]);
    const modifier=edge?.movementModifier??1;
    // Stop exactly at checkpoints; no untravelled distance is credited on an event pause.
    const nextBoundary=boundariesRef.current[nodeCursorRef.current+1]??p.totalDistance;
    const after=Math.min(nextBoundary,p.totalDistance,before+WORLD_HOURS_PER_SECOND*speedRef.current*dt*UNITS_PER_HOUR/modifier);
    progressRef.current=after;
    const at=samplePath(p,after);
    posRef.current={x:at.x,y:at.y};
    headingRef.current=at.heading;
    hoursRef.current+=((after-before)*modifier)/UNITS_PER_HOUR;
    if (now-lastUiRef.current>=100) {
      lastUiRef.current=now;
      setWorldHours(hoursRef.current);
    }
    const reached=nodeCursorRef.current<p.nodeIds.length-1 && after>=nextBoundary;
    if (reached) {
      setWorldHours(hoursRef.current);
      nodeCursorRef.current++;
      const node=routeNodeById.get(p.nodeIds[nodeCursorRef.current])!;
      nodeRef.current=node.id;
      setCurrentNodeId(node.id);
      const crossing=crossingByNodeId.get(node.id);
      const nextRegion=routeEdgeById.get(p.edgeIds[nodeCursorRef.current])?.regionId;
      const entered=nextRegion??node.regionId;
      if (entered!==regionRef.current) {
        regionRef.current=entered;
        setRegionId(entered);
      }
      const arrived=nodeCursorRef.current===p.nodeIds.length-1;
      if (arrived) { pathRef.current=null; setPath(null); setState('arrived'); }
      checkpoint();
      eventsRef.current?.onRouteNodeReached?.(node.id,node);
      if (crossing) eventsRef.current?.onBorderCrossed?.(crossing);
      if (edge && entered!==edge.regionId) eventsRef.current?.onRegionEntered?.(entered);
      if (edge) eventsRef.current?.onRandomEventCheck?.(edge,Math.random());
      if (arrived) eventsRef.current?.onDestinationReached?.(node.id);
    } else if (now-lastSaveRef.current>1000) {
      lastSaveRef.current=now;
      checkpoint();
    }
    writeMarker();
    if (pathRef.current && !getState().adventure.event && !getState().adventure.notice) rafRef.current=requestAnimationFrame(frame);
  },[checkpoint,writeMarker]);

  useEffect(()=>{
    stop();
    if (!blocked && !paused && pathRef.current && !document.hidden) {
      lastTimeRef.current=performance.now();
      rafRef.current=requestAnimationFrame(frame);
    }
    return stop;
  },[blocked,paused,frame,stop]);

  const travelTo=useCallback((destinationNodeId:string)=>{
    if (blockedRef.current || getState().adventure.event || getState().adventure.notice) return null;
    // Changing destination halfway through a road used to teleport back to a node.
    if (pathRef.current) return null;
    const found=findPath(nodeRef.current,destinationNodeId);
    if (!found || found.totalDistance<=0) return null;
    stop();
    pathRef.current=found;
    boundariesRef.current=nodeBoundaries(found);
    progressRef.current=0;
    nodeCursorRef.current=0;
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
  },[checkpoint,frame,stop]);
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
      if (document.hidden) {stop();persist();}
      else if (!pausedRef.current && !blockedRef.current && pathRef.current) {
        lastTimeRef.current=performance.now();
        stop();rafRef.current=requestAnimationFrame(frame);
      }
    };
    window.addEventListener('pagehide',persist);
    document.addEventListener('visibilitychange',visibility);
    return ()=>{
      stop();persist();
      window.removeEventListener('pagehide',persist);
      document.removeEventListener('visibilitychange',visibility);
    };
  },[checkpoint,frame,stop,writeMarker]);

  return {markerRef,posRef,headingRef,state,path,currentNodeId,regionId,worldHours,speed,setSpeed,
    paused:paused||blocked,togglePause,progressRef,travelTo};
}
