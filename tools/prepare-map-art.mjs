// Slice generated production atlases into the existing registry. No world data changes.
// Usage: node tools/prepare-map-art.mjs /path/to/sharp/lib/index.js
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { mkdir, copyFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const root = fileURLToPath(new URL('../src/assets/', import.meta.url));
const main = 'castle_royal castle_medium fortress city_large city_small village council_hall market_large temple cathedral monastery shrine watchtower gate fort warcamp inn ruins mine quarry foundry sawmill farm mill port lighthouse ship mountain_large mountain_small hill forest_cluster oak_tree pine_tree dry_tree cypress_tree palm_tree'.split(' ');
const extra = 'field wheat_field vineyard salt_pan dry_hill cliff scrub_cluster sacred_grove bridge_stone bridge_wood ford forest_path road_marker lake bay shipyard'.split(' ');
await mkdir(root + 'map', { recursive: true });
await mkdir(root + 'textures', { recursive: true });
await mkdir(root + 'tilesets', { recursive: true });
async function atlas(file, keys, cols, rowCuts) {
  const { width, height } = await sharp(root + 'source-art/' + file).metadata();
  for (let i=0;i<keys.length;i++) {
    const col=i%cols, row=Math.floor(i/cols);
    const left=Math.round(col*width/cols), right=Math.round((col+1)*width/cols);
    const top=Math.round(rowCuts[row]*height), bottom=Math.round(rowCuts[row+1]*height);
    const data=await sharp(root+'source-art/'+file).extract({left,top,width:right-left,height:bottom-top}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    // Find the occupied bounds in each cell, preserving original generated alpha.
    let x0=data.info.width,y0=data.info.height,x1=0,y1=0;
    for(let y=0;y<data.info.height;y++) for(let x=0;x<data.info.width;x++) if(data.data[(y*data.info.width+x)*4+3]>100){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    const tile=await sharp(data.data,{raw:data.info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(88,82,{fit:'inside',kernel:'nearest'}).png().toBuffer();
    const meta=await sharp(tile).metadata();
    await sharp({create:{width:96,height:96,channels:4,background:'#00000000'}}).composite([{input:tile,left:Math.floor((96-meta.width)/2),top:88-meta.height}]).png().toFile(root+'map/'+keys[i]+'.png');
  }
}
await atlas('architecture-nature.png',main,6,[0,.19,.365,.525,.68,.84,1]);
await atlas('environment.png',extra,4,[0,.25,.5,.74,1]);
for(const [key,source] of Object.entries({training_ground:'warcamp',outpost:'watchtower',stud_farm:'farm',mountain_pass:'mountain_small'})) await copyFile(root+'map/'+source+'.png',root+'map/'+key+'.png');
const terrains='temperate_valley dense_forest alpine steppe_march sacred_valley plains coastal water'.split(' ');
const meta=await sharp(root+'source-art/terrain.png').metadata();
for(let i=0;i<8;i++) {
  const left=Math.round(i%4*meta.width/4),top=Math.round(Math.floor(i/4)*meta.height/2);
  const data=await sharp(root+'source-art/terrain.png').extract({left:left+8,top:top+8,width:Math.floor(meta.width/4)-16,height:Math.floor(meta.height/2)-16}).resize(128,128,{fit:'fill',kernel:'nearest'}).png().toBuffer();
  await import('node:fs/promises').then(fs=>fs.writeFile(root+'textures/'+(i===7?'water':'terrain_'+terrains[i])+'.png',data));
  if(i<7) await import('node:fs/promises').then(fs=>fs.writeFile(root+'tilesets/'+terrains[i]+'.png',data));
}
console.log('Prepared 56 sprites, 8 materials and 7 terrain sheets.');
