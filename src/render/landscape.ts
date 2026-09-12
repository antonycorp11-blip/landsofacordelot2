/** Scenic geometry only: never enters collision, routes, region data or travel time. */
import { bounds, makeRng, pointInPolygon } from '../world/geo';
import { allPois, regions } from '../world/valdoria';
import { roadGeometry } from '../world/navgraph';
import { rivers } from '../world/rivers';
import { landcoverShapes } from '../world/landcover';
import { noise } from './terrainMaterial';
import { getAsset, DEFAULT_ANCHOR } from './mapAssets';
import type { Biome, Point } from '../world/types';

export type LandscapeObject = Point & { assetKey:string; scale:number; minZoom:number };
const CELL=400;
type Segment={a:Point;b:Point;clearance:number};
const corridors=new Map<string,Segment[]>();
function indexLine(points:Point[],clearance:number) {
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],s={a,b,clearance};
    for(let y=Math.floor((Math.min(a.y,b.y)-clearance)/CELL);y<=Math.floor((Math.max(a.y,b.y)+clearance)/CELL);y++)
      for(let x=Math.floor((Math.min(a.x,b.x)-clearance)/CELL);x<=Math.floor((Math.max(a.x,b.x)+clearance)/CELL);x++) {
        const key=`${x}:${y}`; const list=corridors.get(key)??[];list.push(s);corridors.set(key,list);
      }
  }
}
roadGeometry.forEach(r=>indexLine(r.points,r.road.type==='main'?175:110));
rivers.forEach(r=>indexLine(r.points,150));
export function sceneryClear(p:Point,margin=0) {
  if(allPois.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<260+margin))return false;
  for(const {a,b,clearance} of corridors.get(`${Math.floor(p.x/CELL)}:${Math.floor(p.y/CELL)}`)??[]) {
    const dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
    if(Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<clearance)return false;
  }
  return true;
}
const masses=landcoverShapes.map(s=>({...s,box:bounds(s.polygon)}));
function inMass(p:Point,type:string) {
  return masses.some(s=>s.type===type && p.x>=s.box.minX && p.x<=s.box.maxX && p.y>=s.box.minY && p.y<=s.box.maxY && pointInPolygon(p,s.polygon));
}
/** Mountain spine and foothills share the same elevation used by the ground shader. */
export function elevation(x:number,y:number,biome:Biome) {
  const ridge=1-Math.abs(noise(x/1700,y/1200)*2-1);
  const small=noise(x/600+91,y/700+73);
  const amplitude=biome==='alpine'?1:biome==='steppe_march'?.65:biome==='sacred_valley'?.43:biome==='coastal'?.3:.34;
  return amplitude*(ridge*.72+small*.28);
}
function createLandscape() {
  const out:LandscapeObject[]=[];
  for(const region of regions) {
    const box=bounds(region.polygon), rng=makeRng(`landscape-v2-${region.id}`), biome=region.biome;
    const alpine=biome==='alpine', forest=biome==='dense_forest';
    const spacing=alpine?142:forest?76:115;
    let index=0;
    for(let y=box.minY;y<box.maxY;y+=spacing)for(let x=box.minX;x<box.maxX;x+=spacing) {
      const p={x:x+(rng()-.5)*spacing*.8,y:y+(rng()-.5)*spacing*.8};
      const random=rng(),variation=rng(); index++;
      if(!pointInPolygon(p,region.polygon)||!sceneryClear(p))continue;
      const h=elevation(p.x,p.y,biome),patch=noise(p.x/800+31,p.y/850+57);
      let key='',scale=1,minZoom=0;
      if(alpine) {
        if(h>.65 && random<.90){key=h>.81?'mountain_large':'mountain_small';scale=1.9+variation*1.35;}
        else if(h>.51 && random<.48){key='hill';scale=1.4+variation;}
        else if(random<.5){key='pine_tree';scale=1+variation;}
      } else if(forest) {
        // Continuous canopies with winding glades; anchored to existing forest masses.
        if(patch>.36 || inMass(p,'forest')){key=random<.7?'pine_tree':'oak_tree';scale=1.45+variation*.75;}
        else if(random<.12){key='hill';scale=1.6+variation;}
      } else if(inMass(p,'forest') || patch>(biome==='steppe_march'?.79:.67)) {
        if(biome==='steppe_march'){key=random<.55?'scrub_cluster':'dry_tree';scale=.9+variation*.6;}
        else {key=biome==='sacred_valley'&&random>.6?'cypress_tree':biome==='coastal'&&random>.6?'palm_tree':random<.45?'forest_cluster':'oak_tree';scale=.95+variation*.8;}
      } else if(inMass(p,'highland') || (h>(biome==='steppe_march'?.47:.26)&&patch<.54)) {
        if(index%3===0 && random<.58){key=biome==='steppe_march'?'dry_hill':'hill';scale=1.6+variation*1.0;}
      } else if(inMass(p,'farmland') && random<.35) {
        key=biome==='sacred_valley'?'vineyard':variation>.5?'wheat_field':'field';scale=.85+variation*.4;
      } else if(random<.13) {
        key=biome==='steppe_march'?'scrub_cluster':biome==='coastal'?'palm_tree':random<.05?'hill':'oak_tree';scale=.75+variation*.55;minZoom=1.7;
      }
      if(key) {
        const def=getAsset(key),w=def.size*scale,a=def.anchor??DEFAULT_ANCHOR;
        // Keep the visible body clear as well as its anchor, especially tall peaks.
        if(!sceneryClear({x:p.x,y:p.y-w*a.y*.6}) ||
           !sceneryClear({x:p.x-w*.3,y:p.y-w*.25}) ||
           !sceneryClear({x:p.x+w*.3,y:p.y-w*.25}))continue;
        out.push({...p,assetKey:key,scale,minZoom});
      }
    }
  }
  return out.sort((a,b)=>a.y-b.y);
}
export const landscapeObjects=createLandscape();
