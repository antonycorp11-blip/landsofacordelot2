import { natureObjects } from '../world/nature';
import { insideLandcover } from '../world/landcover';
import { getAsset } from './mapAssets';
/** Canopy edging only. Existing forest footprints, clearings and object anchors stay intact. */
export const canopyDetails = natureObjects.filter(o => o.assetKey === 'forest_cluster').flatMap(o => {
  const size = getAsset(o.assetKey).size*(o.scale??1);
  return [-1,1].flatMap((side,i) => {
    const p={x:o.x+side*size*.36,y:o.y+size*.12};
    if(!insideLandcover(p,'forest')) return [];
    return [{...o,...p,id:`canopy-${o.id}-${i}`,assetKey:i?'oak_tree':'pine_tree',rotation:0,minZoom:Math.max(1.7,o.minZoom??0)}];
  });
});
