import { memo } from "react";
import { pathFromPoints } from "../../world/geo";
import { WORLD_SCALE as S } from "../../world/layout";
import { featureWidth, lod } from "../../world/scale";
import { fiefs, type Fief } from "../../world/fiefs";
import { ownerOf, useFiefOwners } from "../../data/fiefOwners";
import { houseById } from "../../data/houses";
import { MapSymbol } from "../MapSymbol";

/**
 * OS SENHORIOS NO MAPA.
 *
 * A divisão que importa para a posse da terra: dentro de cada região, cinco
 * senhorios com dono próprio. A divisa é fina e discreta na vista normal —
 * ela informa sem competir com estrada e rio — e vira linha de tabuleiro na
 * vista política, onde é exatamente o que se está tentando ler.
 *
 * A cor vem do DONO, lido a cada render. Comprar um senhorio repinta só
 * aquele pedaço, sem que a região mude de mãos.
 */
const PLAYER_COLOR = "#e2c169";

/** Abaixo deste zoom as divisas internas só sujariam a vista do reino. */
export const FIEF_MIN_ZOOM = lod(1.35);

function ownerColor(fief: Fief): string {
  const owner = ownerOf(fief.id);
  if (owner === "player") return PLAYER_COLOR;
  return houseById.get(owner)?.color ?? "#8a8a8a";
}

export const FiefLayer = memo(function FiefLayer({
  zoom,
  political,
  selectedFiefId,
  onFiefClick,
}: {
  zoom: number;
  political: boolean;
  selectedFiefId: string | null;
  onFiefClick: (fief: Fief) => void;
}) {
  useFiefOwners();
  if (!political && zoom < FIEF_MIN_ZOOM) return null;

  return (
    <g>
      {fiefs.map((fief) => {
        const color = ownerColor(fief);
        const selected = selectedFiefId === fief.id;
        const d = pathFromPoints(fief.polygon, true);
        return (
          <g key={fief.id} style={{ cursor: "pointer" }} onClick={() => onFiefClick(fief)}>
            <path
              d={d}
              fill={color}
              fillOpacity={political ? (selected ? 0.5 : 0.26) : selected ? 0.16 : 0}
            />
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={featureWidth(political ? 2.2 : 1.2, zoom)}
              strokeOpacity={political ? 0.85 : 0.5}
              strokeDasharray={
                political ? undefined : `${featureWidth(9, zoom)} ${featureWidth(7, zoom)}`
              }
            />
          </g>
        );
      })}

      {/* As sedes. Muitas não têm estrada até elas — são posse, não destino. */}
      {(political || zoom >= FIEF_MIN_ZOOM) &&
        fiefs.map((fief) => (
          <g key={`seat-${fief.id}`} style={{ cursor: "pointer" }} onClick={() => onFiefClick(fief)}>
            <circle cx={fief.seat.x} cy={fief.seat.y} r={30 * S} fill="transparent" />
            <MapSymbol
              assetKey={fief.seatAssetKey}
              x={fief.seat.x}
              y={fief.seat.y}
              scale={fief.tier === "nobre" ? 0.9 : 0.7}
            />
            {(political || zoom >= lod(2.2)) && (
              <text
                x={fief.seat.x}
                y={fief.seat.y + (13 * S) / zoom + (12 * S) / zoom}
                textAnchor="middle"
                fontSize={(12 * S) / zoom}
                fill="#e6dcbc"
                stroke="#263c34"
                strokeWidth={(2.6 * S) / zoom}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {fief.name}
              </text>
            )}
          </g>
        ))}
    </g>
  );
});
