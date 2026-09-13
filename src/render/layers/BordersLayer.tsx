import { memo } from "react";
import { pathFromPoints } from "../../world/geo";
import { INNER_ARCS, SPOKES, WORLD_SCALE as S } from "../../world/layout";
import { featureWidth, lod } from "../../world/scale";
import { borderCrossings } from "../../world/borderCrossings";
import { valdoria } from "../../world/valdoria";
import { MapSymbol } from "../MapSymbol";

/**
 * Dois níveis de fronteira:
 *  - KINGDOM BORDER: contorno externo de Valdória, forte;
 *  - REGION BORDER: divisas internas dos senhorios, suaves.
 * As divisas internas são desenhadas a partir das MESMAS polilinhas usadas para
 * montar os polígonos, então nunca há descolamento entre traço e território.
 */
export const BordersLayer = memo(function BordersLayer({
  zoom,
  onCrossingClick,
}: {
  zoom: number;
  onCrossingClick: (id: string) => void;
}) {
  return (
    <g>
      <g pointerEvents="none" fill="none" strokeLinecap="round">
        {[...INNER_ARCS, ...SPOKES].map((line, i) => (
          <path key={i} d={pathFromPoints(line)} stroke="#6d6046" strokeWidth={featureWidth(2.2, zoom)} opacity={0.42} strokeDasharray={`${featureWidth(14, zoom)} ${featureWidth(9, zoom)}`} />
        ))}
        <path d={pathFromPoints(valdoria.outline, true)} stroke="#4a3f2c" strokeWidth={featureWidth(7, zoom)} opacity={0.8} />
        <path d={pathFromPoints(valdoria.outline, true)} stroke="#d9c68f" strokeWidth={featureWidth(2.4, zoom)} opacity={0.5} />
      </g>

      {zoom >= lod(1.1) &&
        borderCrossings.map((c) => (
          <g key={c.id} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onCrossingClick(c.id); }}>
            <circle cx={c.x} cy={c.y} r={26 * S} fill="transparent" />
            <MapSymbol assetKey={c.assetKey} x={c.x} y={c.y} scale={0.85} />
            {zoom >= lod(2.2) && (
              <text
                x={c.x}
                y={c.y + (20 / zoom + 8) * S}
                textAnchor="middle"
                fontSize={(13 * S) / zoom}
                fill="#4a3f2c"
                stroke="#f3e9cd"
                strokeWidth={(2.6 * S) / zoom}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {c.name}
              </text>
            )}
          </g>
        ))}
    </g>
  );
});
