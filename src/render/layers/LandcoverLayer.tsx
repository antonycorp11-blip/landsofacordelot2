import { memo } from "react";
import { pathFromPoints } from "../../world/geo";
import { landcoverShapes } from "../../world/landcover";
import type { LandcoverType } from "../../world/landcover";
import { lod } from "../../world/scale";
import { regionById } from "../../world/valdoria";
import type { ViewRect } from "./NatureLayer";

/**
 * As grandes massas de floresta, lavoura e monte.
 *
 * É o que tira o terreno do vazio na aproximação: a floresta passa a ser uma
 * mancha com silhueta, e as árvores viram acabamento em cima dela.
 *
 * A cor sai da paleta da própria região, então uma conquista que repinte o
 * senhorio repinta a mata junto — a massa é dado, não desenho fixo.
 */
const TINT: Record<LandcoverType, { key: "forest" | "accent" | "rock"; alpha: number }> = {
  forest: { key: "forest", alpha: 0.24 },
  farmland: { key: "accent", alpha: 0.12 },
  highland: { key: "rock", alpha: 0.14 },
  scrub: { key: "forest", alpha: 0.16 },
};

export const LandcoverLayer = memo(function LandcoverLayer({ view }: { view: ViewRect }) {
  return (
    <g pointerEvents="none" shapeRendering="crispEdges">
      {landcoverShapes.map((shape) => {
        const first = shape.polygon[0];
        if (
          first.x < view.minX - 4000 ||
          first.x > view.maxX + 4000 ||
          first.y < view.minY - 4000 ||
          first.y > view.maxY + 4000
        )
          return null;
        const palette = regionById.get(shape.regionId)!.palette;
        const tint = TINT[shape.type];
        const d = pathFromPoints(shape.polygon, true);
        return (
          <g key={shape.id}>
            <path d={d} fill={palette[tint.key]} fillOpacity={tint.alpha} />
            <path d={d} fill="none" stroke={palette[tint.key]} strokeOpacity={tint.alpha * 0.9} strokeWidth={3} />
          </g>
        );
      })}
    </g>
  );
});

/** Massas só aparecem depois que o reino inteiro deixa de ser a vista. */
export const LANDCOVER_MIN_ZOOM = lod(1.05);
