import { useEffect, useRef } from 'react';
import type { CameraView } from '../map/useCamera';
import { landscapeObjects } from './landscape';
import { getAsset, DEFAULT_ANCHOR } from './mapAssets';
import { valdoria } from '../world/valdoria';
import { WORLD } from '../world/layout';
import { pathFromPoints } from '../world/geo';
import { landcoverShapes } from '../world/landcover';
import { CANVAS_DPR } from './quality';

type Props={subscribe:(fn:(v:CameraView)=>void)=>()=>void;enabled:boolean};

/**
 * Cenário denso num canvas, com recorte por viewport e imagens reaproveitadas.
 *
 * São mais de sete mil elementos. Na vista do reino inteiro TODOS estão na
 * tela, cada um com uns quatro pixels — sete mil imagens por frame para
 * desenhar o que, àquela distância, é a textura da paisagem. Por isso o mundo
 * é assado uma vez numa textura e a vista de longe desenha essa textura. A
 * partir de `SCENERY_TEX_W` pixels de mundo o desenho volta a ser objeto a
 * objeto, e aí o recorte por viewport já deixa poucas centenas em cena.
 */
const SCENERY_TEX_W = 2048;
const BAKE_SCALE = SCENERY_TEX_W / WORLD.width;
/** Objetos assados por frame — o mapa aparece em pedaços, sem travar a aba. */
const BAKE_CHUNK = 700;

export function SceneryCanvas({subscribe,enabled}:Props) {
  const ref=useRef<HTMLCanvasElement>(null);
  const repaint=useRef<()=>void>(()=>{});
  const enabledRef=useRef(enabled);enabledRef.current=enabled;
  useEffect(()=>repaint.current(),[enabled]);
  useEffect(()=>{
    const canvas=ref.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;
    let view:CameraView|undefined,disposed=false,frame=0,bakeFrame=0;
    const images=new Map<string,HTMLImageElement>();
    const outline=new Path2D(pathFromPoints(valdoria.outline,true));
    const patches=landcoverShapes.map(s=>({path:new Path2D(pathFromPoints(s.polygon,true)),type:s.type}));
    const patchFill=(type:string)=>type==='forest'?'#264a3438':type==='highland'?'#54644c20':type==='farmland'?'#d5bb6b22':'#87714325';

    /** Desenha um trecho da lista já ordenada por y, no contexto dado. */
    function paint(target:CanvasRenderingContext2D,from:number,to:number,minX:number,maxX:number,minY:number,maxY:number,zoom:number) {
      for(let i=from;i<to;i++) {
        const o=landscapeObjects[i];
        if(o.y<minY)continue;if(o.y>maxY)break;
        if(o.x<minX||o.x>maxX||zoom<o.minZoom)continue;
        const img=images.get(o.assetKey);if(!img?.complete||!img.naturalWidth)continue;
        const def=getAsset(o.assetKey),anchor=def.anchor??DEFAULT_ANCHOR,w=def.size*o.scale,h=w*(def.aspect??1);
        target.drawImage(img,o.x-anchor.x*w,o.y-anchor.y*h,w,h);
      }
    }

    /* ------------------------- textura da vista de longe ------------------- */
    let bakeCanvas:HTMLCanvasElement|null=null,bakeDone=0;
    function advanceBake():boolean {
      if(!bakeCanvas) {
        bakeCanvas=document.createElement('canvas');
        bakeCanvas.width=SCENERY_TEX_W;
        bakeCanvas.height=Math.round(WORLD.height*BAKE_SCALE);
        const b=bakeCanvas.getContext('2d');
        if(!b){bakeCanvas=null;return false;}
        b.setTransform(BAKE_SCALE,0,0,BAKE_SCALE,-WORLD.x*BAKE_SCALE,-WORLD.y*BAKE_SCALE);
        b.clip(outline);
        for(const p of patches){b.fillStyle=patchFill(p.type);b.fill(p.path);}
      }
      const b=bakeCanvas.getContext('2d');
      if(!b)return false;
      const to=Math.min(landscapeObjects.length,bakeDone+BAKE_CHUNK);
      // A textura mostra o mapa de longe, então usa o mesmo corte de LOD.
      paint(b,bakeDone,to,-Infinity,Infinity,-Infinity,Infinity,1);
      bakeDone=to;
      return bakeDone>=landscapeObjects.length;
    }
    /** Invalida a textura quando a arte muda em tempo de execução. */
    function resetBake(){bakeCanvas=null;bakeDone=0;}

    function draw() {
      if(disposed||!view||!canvas||!ctx)return;
      const v=view,dpr=Math.min(CANVAS_DPR,devicePixelRatio||1);
      if(canvas.width!==Math.round(v.width*dpr)||canvas.height!==Math.round(v.height*dpr)){
        canvas.width=Math.round(v.width*dpr);canvas.height=Math.round(v.height*dpr);
      }
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,v.width,v.height);
      if(!enabledRef.current)return;
      ctx.imageSmoothingEnabled=false;

      if(v.scale<BAKE_SCALE) {
        const ready=advanceBake();
        if(!ready&&!bakeFrame) {
          const step=()=>{bakeFrame=advanceBake()?0:requestAnimationFrame(step);draw();};
          bakeFrame=requestAnimationFrame(step);
        }
        if(bakeCanvas&&bakeDone>0) {
          ctx.drawImage(bakeCanvas,
            v.width/2-v.cx*v.scale+WORLD.x*v.scale, v.height/2-v.cy*v.scale+WORLD.y*v.scale,
            WORLD.width*v.scale, WORLD.height*v.scale);
        }
        return;
      }

      ctx.translate(v.width/2-v.cx*v.scale,v.height/2-v.cy*v.scale);ctx.scale(v.scale,v.scale);
      ctx.save();ctx.clip(outline);
      for(const p of patches){ctx.fillStyle=patchFill(p.type);ctx.fill(p.path);}
      const minX=v.cx-v.width/v.scale/2-600,maxX=v.cx+v.width/v.scale/2+600;
      const minY=v.cy-v.height/v.scale/2-600,maxY=v.cy+v.height/v.scale/2+600;
      paint(ctx,0,landscapeObjects.length,minX,maxX,minY,maxY,v.zoom);
      ctx.restore();
    }
    function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;resetBake();draw();});}
    for(const key of new Set(landscapeObjects.map(o=>o.assetKey))){
      const url=getAsset(key).url;if(!url)continue;
      const img=new Image();img.onload=schedule;img.src=url;images.set(key,img);
    }
    repaint.current=draw;
    const unsubscribe=subscribe(v=>{view=v;draw();});
    return ()=>{disposed=true;unsubscribe();cancelAnimationFrame(frame);cancelAnimationFrame(bakeFrame);images.forEach(i=>{i.onload=null;});repaint.current=()=>{};};
  },[subscribe]);
  return <canvas ref={ref} className="scenery-canvas" aria-hidden="true"/>;
}
