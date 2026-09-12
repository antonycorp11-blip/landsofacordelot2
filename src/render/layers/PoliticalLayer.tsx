import { memo } from "react";
import { pathFromPoints } from "../../world/geo";
import { featureWidth } from "../../world/scale";
import { controllerOf, useTerritories } from "../../data/territories";
import { houseById } from "../../data/houses";
import type { RegionId } from "../../world/types";
import { regions } from "../../world/valdoria";

/**
 * A CAMADA POLÍTICA.
 *
 * Quem controla o quê, por cima do mapa — e só por cima. A cor NÃO é do
 * território: é da Casa que o controla, lida a cada render de
 * `controllerOf`. Conquistar uma região repinta isto sozinho, sem que nenhum
 * componente precise mudar.
 *
 * A opacidade é baixa de propósito. O mapa é ilustrado, não é um tabuleiro de
 * Risk: terreno, vegetação, rios e estradas continuam mandando na leitura, e a
 * cor política é um verniz que diz de quem é aquilo.
 */
const TINT = { normal: 0.1, hovered: 0.16, selected: 0.2 };

export const PoliticalLayer = memo(function PoliticalLayer({
  zoom,
  selectedRegion,
  hoveredRegion,
}: {
  zoom: number;
  selectedRegion: RegionId | null;
  hoveredRegion: RegionId | null;
}) {
  // Só para reagir a uma troca de controlador; o valor em si não é usado.
  useTerritories();

  return (
    <g pointerEvents="none">
      {regions.map((region) => {
        const house = houseById.get(controllerOf(region.id));
        if (!house) return null;
        const opacity =
          selectedRegion === region.id
            ? TINT.selected
            : hoveredRegion === region.id
              ? TINT.hovered
              : TINT.normal;
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
              strokeWidth={featureWidth(2.6, zoom)}
              strokeOpacity={0.55}
            />
            <path
              d={d}
              fill="none"
              stroke={house.secondaryColor}
              strokeWidth={featureWidth(0.9, zoom)}
              strokeOpacity={0.35}
            />
          </g>
        );
      })}
    </g>
  );
});
