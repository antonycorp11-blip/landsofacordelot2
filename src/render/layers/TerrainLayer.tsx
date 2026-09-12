import { memo } from "react";
import { pathFromPoints } from "../../world/geo";
import { CENTER, WORLD_SCALE as S } from "../../world/layout";
import type { RegionId } from "../../world/types";
import { valdoria } from "../../world/valdoria";
import { activeTextures, getTexture, terrainTextureKey } from "../mapTextures";
import { imageRendering } from "../renderStyle";

/** Base comum do pergaminho: todas as regiões são puxadas para perto dela. */
const PARCHMENT = { r: 0xe3, g: 0xd8, b: 0xb2 };

/**
 * No modo normal o mapa não é "pintado por região": cada bioma só tinge
 * levemente o pergaminho. A identidade visual vem do relevo e da vegetação,
 * não de blocos de cor. O modo DEBUG usa as cores saturadas cruas.
 */
function muted(hex: string, amount = 0.12): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number, base: number) => Math.round(c + (base - c) * amount);
  return `rgb(${mix((n >> 16) & 255, PARCHMENT.r)}, ${mix((n >> 8) & 255, PARCHMENT.g)}, ${mix(n & 255, PARCHMENT.b)})`;
}

/** Terras além da fronteira do reino: presentes, mas fora do jogo por enquanto. */
const UNKNOWN_LANDS = valdoria.outline.map((p) => {
  const d = Math.hypot(p.x - CENTER.x, p.y - CENTER.y) || 1;
  return {
    x: p.x + ((p.x - CENTER.x) / d) * 150 * S,
    y: p.y + ((p.y - CENTER.y) / d) * 130 * S,
  };
});

type Props = {
  zoom: number;
  /** 1 = chão vetorial cheio; 0 = cedeu lugar ao chão ladrilhado em canvas. */
  groundOpacity: number;
  debug: boolean;
  selectedRegion: RegionId | null;
  hoveredRegion: RegionId | null;
  onRegionClick: (id: RegionId) => void;
  onRegionHover: (id: RegionId | null) => void;
};

/**
 * Massa territorial: mar, terra e os polígonos das sete regiões.
 * No modo normal a saturação é baixa (mapa ilustrado, não tabuleiro pintado);
 * em DEBUG cada senhorio recebe uma cor própria bem visível.
 */
export const TerrainLayer = memo(function TerrainLayer({
  zoom,
  groundOpacity,
  debug,
  selectedRegion,
  hoveredRegion,
  onRegionClick,
  onRegionHover,
}: Props) {
  // Ladrilhos declarados uma vez; cada região referencia o do seu bioma.
  const patterns = debug ? [] : activeTextures(zoom);

  return (
    <g>
      <defs>
        {patterns.map(([key, def]) => (
          <pattern key={key} id={`tex-${key}`} width={def.tile} height={def.tile} patternUnits="userSpaceOnUse">
            <image
              href={def.url}
              x={0}
              y={0}
              width={def.tile}
              height={def.tile}
              preserveAspectRatio="none"
              style={{ imageRendering }}
            />
          </pattern>
        ))}
      </defs>

      <path d={pathFromPoints(UNKNOWN_LANDS, true) + pathFromPoints(valdoria.outline, true)} fillRule="evenodd" fill="#314542" opacity={0.8} />
      <path d={pathFromPoints(UNKNOWN_LANDS, true)} fill="none" stroke="#647465" strokeWidth={3 * S} opacity={0.35} strokeDasharray={`${20 * S} ${16 * S}`} />
      {/*
        O mar fica FORA do desvanecimento: não há tileset de água, então o
        chão ladrilhado não tem com que substituí-lo.
      */}
      <path d={pathFromPoints(valdoria.sea, true)} fill="url(#seaGradient)" />
      {(() => {
        const water = getTexture("water");
        return !debug && water?.url && zoom >= water.minZoom ? (
          <path
            d={pathFromPoints(valdoria.sea, true)}
            fill="url(#tex-water)"
            opacity={water.opacity}
            style={{ mixBlendMode: "overlay" }}
          />
        ) : null;
      })()}
      <g opacity={0.5}>
        {[0.35, 0.55, 0.75].map((t, i) => (
          <path
            key={t}
            d={pathFromPoints(
              valdoria.sea.slice(0, 45).map((p) => ({ x: p.x, y: p.y + (40 + i * 46) * S })),
            )}
            fill="none"
            stroke="#9ec4d2"
            strokeWidth={2.5 * S}
            strokeDasharray={`${26 * S} ${34 * S}`}
            opacity={0.5 - i * 0.12}
          />
        ))}
      </g>

      <g opacity={groundOpacity}>
      {/* Sombra da massa territorial — dá volume ao continente. */}
      <path
        d={pathFromPoints(valdoria.outline, true)}
        fill="#7b6a4a"
        opacity={0.35}
        transform={`translate(${6 * S} ${10 * S})`}
      />

      {valdoria.regions.map((region) => {
        const selected = selectedRegion === region.id;
        const hovered = hoveredRegion === region.id;
        return (
          <path
            key={region.id}
            d={pathFromPoints(region.polygon, true)}
            fill={debug ? region.palette.landDebug : muted(region.palette.land)}
            fillOpacity={debug ? 0.85 : 1}
            stroke={debug ? "#2b2b2b" : "none"}
            strokeWidth={debug ? 2 * S : 0}
            style={{ cursor: "pointer" }}
            onPointerEnter={() => onRegionHover(region.id)}
            onPointerLeave={() => onRegionHover(null)}
            onClick={() => onRegionClick(region.id)}
          >
            {selected || hovered ? <title>{region.name}</title> : null}
          </path>
        );
      })}

      </g>

      {/*
        Textura por cima da cor, em `multiply`: o ladrilho carrega só o grão e a
        cor continua vindo do polígono — é o que mantém possível uma região
        mudar de dono e de cor sem arte nova.
      */}
      {!debug && groundOpacity > 0.01 && (
        <g pointerEvents="none" opacity={groundOpacity} style={{ mixBlendMode: "multiply" }}>
          {valdoria.regions.map((region) => {
            const key = terrainTextureKey(region.biome);
            const def = getTexture(key);
            if (!def?.url || zoom < def.minZoom) return null;
            return (
              <path
                key={`tex-${region.id}`}
                d={pathFromPoints(region.polygon, true)}
                fill={`url(#tex-${key})`}
                opacity={def.opacity}
              />
            );
          })}
        </g>
      )}

      {/* Realce de seleção/hover, desenhado por cima sem repintar a região. */}
      {valdoria.regions.map((region) =>
        selectedRegion === region.id || hoveredRegion === region.id ? (
          <path
            key={`hl-${region.id}`}
            d={pathFromPoints(region.polygon, true)}
            fill="#ffffff"
            fillOpacity={selectedRegion === region.id ? 0.14 : 0.07}
            stroke="#fdf3d0"
            strokeOpacity={selectedRegion === region.id ? 0.75 : 0.35}
            strokeWidth={4 * S}
            pointerEvents="none"
          />
        ) : null,
      )}
    </g>
  );
});
