import { memo, useEffect, useRef } from 'react';
import type { CameraView } from '../../map/useCamera';
import { allPois } from '../../world/valdoria';
import { getAsset } from '../mapAssets';
import type { ViewRect } from './NatureLayer';
import { natureObjects } from '../../world/nature';
import { ANIMATED_DECOR } from '../quality';
const UNLIT = new Set(['lake','bay','mountain_pass','ruins','sacred_grove','quarry']);
const lights = allPois.filter(p => !UNLIT.has(p.assetKey));
const fireflies = natureObjects.filter((p,i) => i % 19 === 0 && (p.assetKey === 'forest_cluster' || p.assetKey === 'oak_tree'));
/** Purely decorative illumination: no hitboxes, events, clock or simulation writes. */
export const AtmosphereLayer = memo(function AtmosphereLayer({night,view,zoom}:{night:number;view:ViewRect;zoom:number}) {
  if (night < .015) return null;
  const visible = (p:{x:number;y:number}) => p.x>view.minX-200 && p.x<view.maxX+200 && p.y>view.minY-200 && p.y<view.maxY+200;
  return <g pointerEvents="none" opacity={night} aria-hidden="true">
    <defs><radialGradient id="lantern-halo"><stop stopColor="#ffc974" stopOpacity=".65"/><stop offset=".4" stopColor="#eba143" stopOpacity=".28"/><stop offset="1" stopColor="#ed9b43" stopOpacity="0"/></radialGradient></defs>
    {lights.filter(p => visible(p) && zoom >= (p.minZoom ?? 0)).map(p=>{
      const size=getAsset(p.assetKey).size*(p.scale??1);
      return <g key={p.id}>
        <ellipse cx={p.x} cy={p.y-size*.12} rx={size*.7} ry={size*.42} fill="url(#lantern-halo)"/>
        {[-.18,0,.18].map((offset,i)=><rect key={i} x={p.x+size*offset} y={p.y-size*(i===1?.45:.27)} width={size*.027} height={size*.045} fill="#ffe6a0"/>)}
      </g>;
    })}
    {ANIMATED_DECOR && zoom>2 && fireflies.filter(visible).map((p,i)=><rect className="firefly" key={p.id} x={p.x+20} y={p.y-35} width={6} height={6} fill="#d9ed9c" style={{animationDelay:`${-(i%9)}s`}}/>)}
  </g>;
});

/** Screen-sized light pass avoids filtering a giant off-screen world surface. */
export function AtmosphereOverlay({subscribe, ...props}: {
  subscribe:(fn:(view:CameraView)=>void)=>()=>void;
  night:number; view:ViewRect; zoom:number;
}) {
  const ref=useRef<SVGGElement>(null);
  useEffect(()=>subscribe(v=>{
    ref.current?.setAttribute('transform',`translate(${v.width/2} ${v.height/2}) scale(${v.scale}) translate(${-v.cx} ${-v.cy})`);
  }),[subscribe]);
  return <svg className="atmosphere-overlay" aria-hidden="true"><g ref={ref}><AtmosphereLayer {...props}/></g></svg>;
}
