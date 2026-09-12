import { memo } from "react";
import { pathFromPoints } from "../../world/geo";
import { RELIEF_CELL, reliefCells } from "../../world/relief";
import { valdoria } from "../../world/valdoria";

/**
 * Sombreado de relevo.
 *
 * Cada célula do campo de altura vira uma mancha suave: escura deslocada para
 * o canto inferior direito, clara para o superior esquerdo — a mesma direção
 * de luz dos placeholders. Sobrepostas, as manchas se fundem em cadeias.
 *
 * Recortado no contorno do reino, para a sombra não vazar no mar.
 */
export const ReliefLayer = memo(function ReliefLayer({ zoom }: { zoom: number }) {
  if (!reliefCells.length) return null;

  // Forte na vista de longe, onde os sprites de montanha são pequenos demais
  // para dar volume; discreto de perto, onde eles já fazem esse trabalho.
  const strength = Math.max(0.32, Math.min(1, 1.3 - zoom / 9));
  const r = RELIEF_CELL * 0.95;
  const offset = RELIEF_CELL * 0.26;

  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id="reliefShadow">
          <stop offset="0%" stopColor="#4a3c28" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#4a3c28" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="reliefLight">
          <stop offset="0%" stopColor="#fffaea" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fffaea" stopOpacity="0" />
        </radialGradient>
        <clipPath id="reliefClip">
          <path d={pathFromPoints(valdoria.outline, true)} />
        </clipPath>
      </defs>

      <g clipPath="url(#reliefClip)">
        <g style={{ mixBlendMode: "multiply" }}>
          {reliefCells.map((c, i) => (
            <ellipse
              key={i}
              cx={c.x + offset}
              cy={c.y + offset}
              rx={r}
              ry={r * 0.82}
              fill="url(#reliefShadow)"
              opacity={c.height * 0.5 * strength}
            />
          ))}
        </g>
        <g style={{ mixBlendMode: "screen" }}>
          {reliefCells.map((c, i) => (
            <ellipse
              key={i}
              cx={c.x - offset}
              cy={c.y - offset}
              rx={r * 0.85}
              ry={r * 0.7}
              fill="url(#reliefLight)"
              opacity={c.height * 0.38 * strength}
            />
          ))}
        </g>
      </g>
    </g>
  );
});
