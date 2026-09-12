import { memo } from "react";
import { pathFromPoints } from "../../world/geo";
import { featureWidth, lod } from "../../world/scale";
import { roadGeometry } from "../../world/navgraph";

/** Larguras na escala calibrada; `featureWidth` converte para o mundo atual. */
const STYLE = {
  main: { casing: 9.5, fill: 5.5, color: "#e0cf9d", casingColor: "#8a7448", dash: 0, minZoom: 0 },
  secondary: { casing: 6.5, fill: 3.6, color: "#d8c79a", casingColor: "#8d7a55", dash: 0, minZoom: lod(1.25) },
  trail: { casing: 0, fill: 2.6, color: "#b9a67a", casingColor: "#b9a67a", dash: 9, minZoom: lod(1.9) },
} as const;

/** Rede viária: estradas reais, regionais e trilhas, com LOD por tipo. */
export const RoadsLayer = memo(function RoadsLayer({ zoom }: { zoom: number }) {
  const visible = roadGeometry.filter((r) => zoom >= STYLE[r.road.type].minZoom);
  return (
    <g pointerEvents="none" strokeLinecap="round" strokeLinejoin="round">
      {visible.map(({ road, points }) => {
        const s = STYLE[road.type];
        return s.casing ? (
          <path key={`c-${road.id}`} d={pathFromPoints(points)} fill="none" stroke={s.casingColor} strokeWidth={featureWidth(s.casing, zoom)} opacity={0.55} />
        ) : null;
      })}
      {visible.map(({ road, points }) => {
        const s = STYLE[road.type];
        return (
          <path
            key={road.id}
            d={pathFromPoints(points)}
            fill="none"
            stroke={s.color}
            strokeWidth={featureWidth(s.fill, zoom)}
            strokeDasharray={s.dash ? `${featureWidth(s.dash, zoom)} ${featureWidth(s.dash * 0.9, zoom)}` : undefined}
          />
        );
      })}
    </g>
  );
});
