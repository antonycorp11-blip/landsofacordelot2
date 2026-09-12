import { canopyDetails } from "../vegetation";
import { memo } from "react";
import { natureObjects, seaObjects } from "../../world/nature";
import type { MapObject } from "../../world/types";
import { MapSymbol } from "../MapSymbol";

export type ViewRect = { minX: number; maxX: number; minY: number; maxY: number };

/**
 * Cenário (florestas, montanhas, colinas, campos, navios).
 *
 * É a camada mais pesada do mapa, então recebe dois filtros: LOD por zoom e
 * culling por viewport. Ambos usam apenas dados — nada depende do desenho.
 */
export const NatureLayer = memo(function NatureLayer({ zoom, view }: { zoom: number; view: ViewRect }) {
  const inView = (o: MapObject) =>
    o.x >= view.minX && o.x <= view.maxX && o.y >= view.minY && o.y <= view.maxY;
  const visible = [...natureObjects, ...canopyDetails, ...seaObjects]
    .filter((o) => zoom >= (o.minZoom ?? 0) && inView(o))
    // Pinta de trás para frente: o que está mais ao sul cobre o que está ao norte.
    .sort((a, b) => a.y - b.y);

  return (
    <g pointerEvents="none">
      {visible.map((o) => (
        <MapSymbol key={o.id} assetKey={o.assetKey} x={o.x} y={o.y} scale={o.scale} rotation={o.type === "ship" ? o.rotation : 0} />
      ))}
    </g>
  );
});
