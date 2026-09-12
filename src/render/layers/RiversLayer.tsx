import { memo } from "react";
import { pathFromPoints } from "../../world/geo";
import { featureWidth } from "../../world/scale";
import { getTexture } from "../mapTextures";
import { rivers } from "../../world/rivers";
import type { Point, River } from "../../world/types";

/** Constrói o corpo do rio como polígono, para que a largura varie ao longo do curso. */
function riverBody(river: River, zoom: number): Point[] {
  const pts = river.points;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const t = i / (pts.length - 1);
    // Curva de crescimento: o rio engrossa mais depressa perto da foz.
    const w = featureWidth(river.widthStart + (river.widthEnd - river.widthStart) * (t * t * 0.6 + t * 0.4), zoom) / 2;
    left.push({ x: pts[i].x + nx * w, y: pts[i].y + ny * w });
    right.push({ x: pts[i].x - nx * w, y: pts[i].y - ny * w });
  }
  return [...left, ...right.reverse()];
}

/** Rio Serpente e afluentes — principal elemento de orientação do mapa. */
export const RiversLayer = memo(function RiversLayer({ zoom }: { zoom: number }) {
  // Reaproveita o `<pattern>` de água declarado pela camada de terreno.
  const water = getTexture("water");
  return (
    <g pointerEvents="none">
      {rivers.map((river) => (
        <g key={river.id}>
          <path d={pathFromPoints(riverBody(river, zoom), true)} fill="#367d88" stroke="#254f51" strokeWidth={featureWidth(2.4, zoom)} />
          {water?.url && zoom >= water.minZoom && (
            <path
              d={pathFromPoints(riverBody(river, zoom), true)}
              fill="url(#tex-water)"
              opacity={water.opacity}
              style={{ mixBlendMode: "overlay" }}
            />
          )}
          <path
            d={pathFromPoints(river.points)}
            fill="none"
            stroke="#8fc9bd"
            strokeWidth={featureWidth(Math.max(1.2, river.widthStart * 0.35), zoom)}
            strokeLinecap="round"
            opacity={0.55}
          />
        </g>
      ))}
    </g>
  );
});
