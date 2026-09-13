import { memo } from "react";
import { WORLD_SCALE as S } from "../../world/layout";
import { lod } from "../../world/scale";
import { getAsset } from "../mapAssets";
import type { PointOfInterest } from "../../world/types";
import { allPois } from "../../world/valdoria";
import { MapSymbol } from "../MapSymbol";
import { crestUrl } from "../../data/houseAssets";
import { houseById } from "../../data/houses";
import { holdingFor } from "../../data/holdings";
import { useTerritories } from "../../data/territories";
import type { ViewRect } from "./NatureLayer";

type Props = {
  zoom: number;
  view: ViewRect;
  selectedPoiId: string | null;
  travelerNodeId: string;
  onPoiClick: (poi: PointOfInterest) => void;
};

/** Corpo do rótulo em unidades do mundo antigo; dividido pelo zoom fica constante na tela. */
const LABEL_BASE: Record<1 | 2 | 3, number> = { 1: 21 * S, 2: 16 * S, 3: 13 * S };

/** Pontos de interesse + rótulos, com LOD por importância. */
export const PoiLayer = memo(function PoiLayer({
  zoom,
  view,
  selectedPoiId,
  travelerNodeId,
  onPoiClick,
}: Props) {
  // Reage a uma troca de controlador: o anel e o brasão seguem quem manda.
  useTerritories();

  const visible = allPois
    .filter(
      (p) =>
        zoom >= (p.minZoom ?? 0) &&
        p.x >= view.minX &&
        p.x <= view.maxX &&
        p.y >= view.minY &&
        p.y <= view.maxY,
    )
    .sort((a, b) => a.y - b.y);

  return (
    <g>
      {visible.map((poi) => {
        const selected = selectedPoiId === poi.id;
        const here = travelerNodeId === poi.id;
        const fontSize = LABEL_BASE[poi.tier] / zoom;
        const radius = getAsset(poi.assetKey).size * 0.62 * (poi.scale ?? 1);
        // A cor de quem manda, nunca uma cor fixa da região.
        const house = houseById.get(holdingFor(poi).controllerHouseId);
        // Brasão só onde ele informa algo: a sede selecionada, ou um castelo
        // grande de perto. Mais que isso vira poluição em cima da arte.
        const crest =
          (selected || (poi.tier === 1 && zoom >= lod(2.4))) && house
            ? crestUrl(house.crestAssetKey)
            : undefined;
        return (
          <g
            key={poi.id}
            style={{ cursor: "pointer" }}
            /* `stopPropagation` não é detalhe: sem ele o mesmo toque chega ao
               POI e depois ao <svg>, que trata toque no mapa como movimento —
               o menu abria e fechava no mesmo quadro. */
            onClick={(e) => { e.stopPropagation(); onPoiClick(poi); }}
          >
            {(selected || here) && (
              <circle
                cx={poi.x}
                cy={poi.y}
                // Proporcional ao asset, não à tela: o anel acompanha o ícone.
                r={radius}
                fill="none"
                stroke={here ? "#f0d48a" : house?.color ?? "#fff6dc"}
                strokeWidth={(3.5 * S) / Math.max(1, zoom * 0.5)}
                opacity={0.9}
              />
            )}
            {crest && (
              <image
                href={crest}
                x={poi.x - (9 * S) / zoom}
                y={poi.y - radius - (26 * S) / zoom}
                width={(18 * S) / zoom}
                height={(21 * S) / zoom}
                preserveAspectRatio="xMidYMid meet"
                opacity={selected ? 1 : 0.82}
                pointerEvents="none"
              />
            )}
            {/* Alvo de clique generoso e com tamanho constante na tela,
                independente do desenho do asset e do nível de zoom. */}
            <circle
              cx={poi.x}
              cy={poi.y}
              r={S * Math.max(26 * (poi.scale ?? 1), 46 / Math.max(0.6, zoom))}
              fill="transparent"
            />
            <MapSymbol assetKey={poi.assetKey} x={poi.x} y={poi.y} scale={poi.scale} />
            {(poi.tier === 1 || zoom >= lod(1.8)) && (
              <text
                x={poi.x}
                y={poi.y + (14 * S) / zoom + fontSize}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight={poi.tier === 1 ? 700 : 500}
                letterSpacing={poi.tier === 1 ? (0.6 * S) / zoom : 0}
                fill="#f3e9c8"
                stroke="#263c34"
                strokeWidth={(3.2 * S) / zoom}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {poi.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});
