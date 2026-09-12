import { memo } from "react";
import { getAsset, DEFAULT_ANCHOR } from "./mapAssets";
import { imageRendering } from "./renderStyle";
import { placeholderById } from "./placeholders";

type Props = {
  assetKey: string;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
};

/**
 * Desenha um asset do mapa na posição do mundo.
 *
 * Se o registry tiver `url`, usa a imagem; senão, usa o placeholder vetorial.
 * O resto do jogo nunca precisa saber qual dos dois foi usado.
 */
export const MapSymbol = memo(function MapSymbol({ assetKey, x, y, scale = 1, rotation = 0, opacity }: Props) {
  const def = getAsset(assetKey);
  const anchor = def.anchor ?? DEFAULT_ANCHOR;
  const w = def.size * scale;
  const h = w * (def.aspect ?? 1);
  const k = w / 100;
  const ox = -anchor.x * w;
  const oy = -anchor.y * h;

  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})${rotation ? ` rotate(${rotation})` : ""}`} opacity={opacity}>
      {def.url ? (
        <image
          href={def.url}
          x={ox}
          y={oy}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid meet"
          style={{ imageRendering }}
        />
      ) : (
        <g transform={`translate(${ox} ${oy}) scale(${k})`}>{placeholderById[assetKey] ?? placeholderById.village}</g>
      )}
    </g>
  );
});
