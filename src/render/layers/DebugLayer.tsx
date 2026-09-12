import { memo } from "react";
import { bounds, centroid, pathFromPoints } from "../../world/geo";
import { borderCrossings } from "../../world/borderCrossings";
import { WORLD_SCALE as S } from "../../world/layout";
import { lod } from "../../world/scale";
import { routeEdges } from "../../world/navgraph";
import { regions, routeNodes } from "../../world/valdoria";

/** Sobreposição de diagnóstico: polígonos, ids, nós, arestas, bounds. */
export const DebugLayer = memo(function DebugLayer({ zoom }: { zoom: number }) {
  return (
    <g pointerEvents="none">
      {regions.map((r) => {
        const b = bounds(r.polygon);
        const c = centroid(r.polygon);
        return (
          <g key={r.id}>
            <rect x={b.minX} y={b.minY} width={b.width} height={b.height} fill="none" stroke="#ff3b6b" strokeWidth={1.5 * S} strokeDasharray={`${10 * S} ${8 * S}`} opacity={0.55} />
            <path d={pathFromPoints(r.polygon, true)} fill="none" stroke="#ff3b6b" strokeWidth={2.5 * S} />
            {r.polygon.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.6 * S} fill="#ff3b6b" />
            ))}
            <text x={c.x} y={c.y} textAnchor="middle" fontSize={(26 * S) / zoom} fill="#ff3b6b" stroke="#1a1a1a" strokeWidth={(4 * S) / zoom} paintOrder="stroke" fontFamily="monospace">
              {r.id}
            </text>
          </g>
        );
      })}

      {routeEdges.map((e) => (
        <path key={e.id} d={pathFromPoints(e.via ?? [])} fill="none" stroke="#39d0ff" strokeWidth={1.8 * S} opacity={0.9} />
      ))}

      {routeNodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={5 * S} fill={n.kind === "crossing" ? "#ffd23b" : "#39d0ff"} stroke="#10222b" strokeWidth={1.5 * S} />
          {zoom >= lod(2) && (
            <text x={n.x + 8 * S} y={n.y - 8 * S} fontSize={(11 * S) / zoom} fill="#39d0ff" stroke="#101418" strokeWidth={(3 * S) / zoom} paintOrder="stroke" fontFamily="monospace">
              {n.id}
            </text>
          )}
        </g>
      ))}

      {borderCrossings.map((c) => (
        <g key={c.id}>
          <circle cx={c.x} cy={c.y} r={12 * S} fill="none" stroke="#ffd23b" strokeWidth={2.4 * S} />
          {zoom >= lod(1.4) && (
            <text x={c.x} y={c.y - 18 * S} textAnchor="middle" fontSize={(12 * S) / zoom} fill="#ffd23b" stroke="#101418" strokeWidth={(3 * S) / zoom} paintOrder="stroke" fontFamily="monospace">
              {c.connects.join(" ↔ ")}
            </text>
          )}
        </g>
      ))}
    </g>
  );
});
