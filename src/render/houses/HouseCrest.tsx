import { memo } from "react";
import { crestUrl } from "../../data/houseAssets";
import { houseById } from "../../data/houses";
import type { HouseId } from "../../world/types";

/**
 * Brasão de uma Casa.
 *
 * Quando a arte existe, é a arte. Quando não existe, cai num escudo vetorial
 * com as duas cores da Casa — provisório de propósito, e nunca uma tentativa
 * de redesenhar o brasão: serve só para o painel não ficar com um buraco.
 */
export const HouseCrest = memo(function HouseCrest({
  houseId,
  size = 40,
  title,
}: {
  houseId: HouseId;
  size?: number;
  title?: string;
}) {
  const house = houseById.get(houseId);
  if (!house) return null;
  const url = crestUrl(house.crestAssetKey);
  const label = title ?? house.name;

  if (url) {
    return (
      <img
        className="house-crest"
        src={url}
        alt={label}
        title={label}
        width={size}
        height={Math.round(size * 1.18)}
        loading="lazy"
      />
    );
  }

  return (
    <svg className="house-crest" width={size} height={Math.round(size * 1.18)} viewBox="0 0 40 47" role="img" aria-label={label}>
      <title>{label}</title>
      <path d="M3 4h34v22c0 10-8 15-17 21C11 41 3 36 3 26Z" fill={house.color} stroke={house.secondaryColor} strokeWidth={2.5} />
      <path d="M20 10v26" stroke={house.secondaryColor} strokeWidth={2} opacity={0.7} />
    </svg>
  );
});
