import { memo } from "react";
import { WORLD } from "../../world/layout";
import { reliefTexture } from "../reliefTexture";

/**
 * Sombreado de relevo — uma única imagem assada por `reliefTexture`.
 *
 * Forte na vista de longe, onde os sprites de montanha são pequenos demais
 * para dar volume; discreto de perto, onde eles já fazem esse trabalho.
 */
export const ReliefLayer = memo(function ReliefLayer({ zoom }: { zoom: number }) {
  const url = reliefTexture();
  if (!url) return null;

  const strength = Math.max(0.32, Math.min(1, 1.3 - zoom / 9));

  return (
    <image
      href={url}
      x={WORLD.x}
      y={WORLD.y}
      width={WORLD.width}
      height={WORLD.height}
      opacity={strength}
      preserveAspectRatio="none"
      pointerEvents="none"
    />
  );
});
