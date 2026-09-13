import { memo } from "react";
import { centroid, pathFromPoints } from "../../world/geo";
import { WORLD_SCALE as S } from "../../world/layout";
import { featureWidth } from "../../world/scale";
import { controllerOf, useTerritories } from "../../data/territories";
import { houseById } from "../../data/houses";
import { crestUrl } from "../../data/houseAssets";
import type { RegionId } from "../../world/types";
import { regions } from "../../world/valdoria";

/**
 * A CAMADA POLÍTICA.
 *
 * Quem controla o quê, por cima do mapa — e só por cima. A cor NÃO é do
 * território: é da Casa que o controla, lida a cada render de `controllerOf`.
 * Conquistar uma região repinta isto sozinho, sem que nenhum componente
 * precise mudar.
 *
 * DOIS MODOS, e a diferença é o que o jogador está tentando fazer:
 *
 *  - NORMAL: um verniz de 10% sobre o mapa ilustrado. Terreno, vegetação, rios
 *    e estradas continuam mandando na leitura, e a cor só diz de quem é aquilo.
 *  - POLÍTICO: o mapa vira tabuleiro. A cor domina, a divisa engrossa e cada
 *    senhorio recebe brasão e nome da Casa. É a vista para planejar conquista,
 *    e existe porque no verniz de 10% não dá para comparar fronteiras.
 */
const TINT = {
  normal: { base: 0.1, hovered: 0.16, selected: 0.2, edge: 0.55, inner: 0.35 },
  political: { base: 0.44, hovered: 0.54, selected: 0.62, edge: 0.95, inner: 0.6 },
  /* Vista de senhorios: a província vira pano de fundo do dono da terra. */
  muted: { base: 0.14, hovered: 0.18, selected: 0.22, edge: 0.55, inner: 0.25 },
};

const CENTROIDS = regions.map((r) => ({ id: r.id, at: centroid(r.polygon) }));

export const PoliticalLayer = memo(function PoliticalLayer({
  zoom,
  selectedRegion,
  hoveredRegion,
  political = false,
  muted = false,
}: {
  zoom: number;
  selectedRegion: RegionId | null;
  hoveredRegion: RegionId | null;
  /** Vista política: a cor manda, e cada senhorio ganha brasão e nome. */
  political?: boolean;
  /** Recua a cor da região para a camada de senhorios ficar legível. */
  muted?: boolean;
}) {
  // Só para reagir a uma troca de controlador; o valor em si não é usado.
  useTerritories();
  const tint = muted ? TINT.muted : political ? TINT.political : TINT.normal;

  return (
    <g pointerEvents="none">
      {regions.map((region) => {
        const house = houseById.get(controllerOf(region.id));
        if (!house) return null;
        const opacity =
          selectedRegion === region.id
            ? tint.selected
            : hoveredRegion === region.id
              ? tint.hovered
              : tint.base;
        const d = pathFromPoints(region.polygon, true);
        return (
          <g key={region.id}>
            <path d={d} fill={house.color} fillOpacity={opacity} />
            {/*
              A divisa interna ganha a cor de quem manda. Cada região desenha a
              sua, então uma fronteira entre duas Casas mostra as duas cores —
              e continua abaixo do contorno do reino, que é mais forte.
            */}
            <path
              d={d}
              fill="none"
              stroke={house.color}
              strokeWidth={featureWidth(political ? 5 : 2.6, zoom)}
              strokeOpacity={tint.edge}
            />
            <path
              d={d}
              fill="none"
              stroke={house.secondaryColor}
              strokeWidth={featureWidth(political ? 1.8 : 0.9, zoom)}
              strokeOpacity={tint.inner}
            />
          </g>
        );
      })}

      {political && !muted &&
        CENTROIDS.map(({ id, at }) => {
          const house = houseById.get(controllerOf(id));
          if (!house) return null;
          const crest = crestUrl(house.crestAssetKey);
          const size = (54 * S) / Math.max(0.6, zoom * 0.5);
          return (
            <g key={`lbl-${id}`}>
              {crest && (
                <image
                  href={crest}
                  x={at.x - size / 2}
                  y={at.y - size * 1.28}
                  width={size}
                  height={size * 1.18}
                  preserveAspectRatio="xMidYMid meet"
                />
              )}
              <text
                x={at.x}
                y={at.y + size * 0.26}
                textAnchor="middle"
                fontSize={size * 0.34}
                fontWeight={600}
                letterSpacing={size * 0.03}
                fill="#f6eed6"
                stroke="#141a18"
                strokeWidth={size * 0.07}
                paintOrder="stroke"
                style={{ textTransform: "uppercase" }}
              >
                {house.shortName.toUpperCase()}
              </text>
            </g>
          );
        })}
    </g>
  );
});
