import { useEffect, useRef } from 'react';
import type { CameraView } from '../map/useCamera';
import { landscapeObjects } from './landscape';
import { getAsset, DEFAULT_ANCHOR } from './mapAssets';
import { valdoria } from '../world/valdoria';
import { pathFromPoints } from '../world/geo';
import { landcoverShapes } from '../world/landcover';

type Props={subscribe:(fn:(v:CameraView)=>void)=>()=>void;enabled:boolean};
/** Dense scenery in one canvas, with viewport culling and decoded images reused per asset. */
export function SceneryCanvas({subscribe,enabled}:Props) {
  const ref=useRef<HTMLCanvasElement>(null);
  const repaint=useRef<()=>void>(()=>{});
  const enabledRef=useRef(enabled);enabledRef.current=enabled;
  useEffect(()=>repaint.current(),[enabled]);
  useEffect(()=>{
    const canvas=ref.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;
    let view:CameraView|undefined,disposed=false,frame=0;
    const images=new Map<string,HTMLImageElement>();
    const outline=new Path2D(pathFromPoints(valdoria.outline,true));
    const patches=landcoverShapes.map(s=>({path:new Path2D(pathFromPoints(s.polygon,true)),type:s.type}));
    function draw() {
      if(disposed||!view||!canvas||!ctx)return;
      const v=view,dpr=Math.min(1.5,devicePixelRatio||1);
      if(canvas.width!==Math.round(v.width*dpr)||canvas.height!==Math.round(v.height*dpr)){
        canvas.width=Math.round(v.width*dpr);canvas.height=Math.round(v.height*dpr);
      }
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,v.width,v.height);
      if(!enabledRef.current)return;
      ctx.imageSmoothingEnabled=false;
      ctx.translate(v.width/2-v.cx*v.scale,v.height/2-v.cy*v.scale);ctx.scale(v.scale,v.scale);
      ctx.save();ctx.clip(outline);
      for(const p of patches){ctx.fillStyle=p.type==='forest'?'#264a3438':p.type==='highland'?'#54644c20':p.type==='farmland'?'#d5bb6b22':'#87714325';ctx.fill(p.path);}
      const minX=v.cx-v.width/v.scale/2-600,maxX=v.cx+v.width/v.scale/2+600;
      const minY=v.cy-v.height/v.scale/2-600,maxY=v.cy+v.height/v.scale/2+600;
      for(const o of landscapeObjects){
        if(o.y<minY)continue;if(o.y>maxY)break;
        if(o.x<minX||o.x>maxX||v.zoom<o.minZoom)continue;
        const img=images.get(o.assetKey);if(!img?.complete||!img.naturalWidth)continue;
        const def=getAsset(o.assetKey),anchor=def.anchor??DEFAULT_ANCHOR,w=def.size*o.scale,h=w*(def.aspect??1);
        ctx.drawImage(img,o.x-anchor.x*w,o.y-anchor.y*h,w,h);
      }
      ctx.restore();
    }
    function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;draw();});}
    for(const key of new Set(landscapeObjects.map(o=>o.assetKey))){
      const url=getAsset(key).url;if(!url)continue;
      const img=new Image();img.onload=schedule;img.src=url;images.set(key,img);
    }
    repaint.current=draw;
    const unsubscribe=subscribe(v=>{view=v;draw();});
    return ()=>{disposed=true;unsubscribe();cancelAnimationFrame(frame);images.forEach(i=>{i.onload=null;});repaint.current=()=>{};};
  },[subscribe]);
  return <canvas ref={ref} className="scenery-canvas" aria-hidden="true"/>;
}
