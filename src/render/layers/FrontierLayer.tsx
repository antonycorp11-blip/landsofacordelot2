import { memo } from "react";
import { makeRng, pathFromPoints, pointInPolygon } from "../../world/geo";
import { CENTER, WORLD, WORLD_SCALE as S } from "../../world/layout";
import { valdoria } from "../../world/valdoria";
import { foreignRealms, type ForeignRealm } from "../../world/foreignRealms";
import type { Point } from "../../world/types";

/**
 * A FRONTEIRA DO MUNDO.
 *
 * Valdória termina, e o que vem depois não é o fim do mapa — é o que você
 * ainda não pode alcançar. Fora do contorno do reino a terra some numa
 * escuridão de nuvem baixa, e os reinos vizinhos ficam lá, nomeados, longe.
 *
 * O limite em si NÃO é desenhado aqui: ele é geográfico. A malha de estradas
 * não tem um único nó fora do contorno, então o viajante não consegue sair nem
 * que queira. Esta camada existe para que o limite seja LIDO — uma parede que
 * ninguém vê é um bug; um horizonte fechado por nuvem é uma promessa.
 *
 * Tudo é geometria plana: sem filtro, sem mistura, sem gradiente por forma. A
 * camada cobre a tela inteira em qualquer zoom e não pode custar frame.
 */

/**
 * Até onde a névoa avança para fora do reino.
 *
 * Começa DEPOIS do mar: a costa da Costa Dourada faz parte do que se pode ver,
 * e escurecer a água encostada na praia tiraria o litoral do mapa. A escuridão
 * é o que está além do horizonte, não o que encosta nele.
 */
const BANDS = [150, 260, 400, 600].map((v) => v * S);

/** Empurra o contorno do reino para fora, mantendo o formato. */
function expand(distance: number): Point[] {
  return valdoria.outline.map((p) => {
    const dx = p.x - CENTER.x;
    const dy = p.y - CENTER.y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / d) * distance, y: p.y + (dy / d) * distance * 0.86 };
  });
}

/** O mundo inteiro, para recortar o miolo com `evenodd`. */
const WORLD_RECT: Point[] = [
  { x: WORLD.x - WORLD.width, y: WORLD.y - WORLD.height },
  { x: WORLD.x + WORLD.width * 2, y: WORLD.y - WORLD.height },
  { x: WORLD.x + WORLD.width * 2, y: WORLD.y + WORLD.height * 2 },
  { x: WORLD.x - WORLD.width, y: WORLD.y + WORLD.height * 2 },
];

const RINGS = BANDS.map((d) => pathFromPoints(expand(d), true));
const WORLD_PATH = pathFromPoints(WORLD_RECT, true);

/**
 * Nuvens baixas na borda.
 *
 * Bolhas achatadas semeadas ao longo do contorno, sempre nas mesmas posições.
 * Ficam FORA do reino de propósito: nenhuma pode cobrir terra jogável.
 */
type Cloud = { x: number; y: number; rx: number; ry: number; o: number };

const CLOUDS: Cloud[] = (() => {
  const rng = makeRng("frontier-clouds");
  const out: Cloud[] = [];
  const n = valdoria.outline.length;
  for (let i = 0; i < n; i += 2) {
    const p = valdoria.outline[i];
    const dx = p.x - CENTER.x;
    const dy = p.y - CENTER.y;
    const d = Math.hypot(dx, dy) || 1;
    for (let k = 0; k < 3; k++) {
      const push = (160 + rng() * 330) * S;
      const jitter = (rng() - 0.5) * 90 * S;
      const c = {
        x: p.x + (dx / d) * push + jitter,
        y: p.y + (dy / d) * push * 0.86 + jitter * 0.5,
        rx: (60 + rng() * 130) * S,
        ry: (26 + rng() * 55) * S,
        o: 0.1 + rng() * 0.16,
      };
      // Nunca por cima do reino: a nuvem é o que está além, não o que esconde.
      if (!pointInPolygon({ x: c.x, y: c.y }, valdoria.outline)) out.push(c);
    }
  }
  return out;
})();

/** Onde escrever o nome de um reino vizinho: fora do contorno, na direção dele. */
function realmAnchor(realm: ForeignRealm): Point {
  const rad = (realm.angle * Math.PI) / 180;
  const dir = { x: Math.cos(rad), y: Math.sin(rad) };
  // Caminha para fora até sair do reino, e então mais um pouco.
  let r = 0;
  const step = 20 * S;
  for (let i = 0; i < 400; i++) {
    const p = { x: CENTER.x + dir.x * r, y: CENTER.y + dir.y * r * 0.86 };
    if (!pointInPolygon(p, valdoria.outline) && r > 100 * S) break;
    r += step;
  }
  // Logo depois da borda: o nome precisa caber na vista do reino inteiro.
  r += 52 * S;
  return { x: CENTER.x + dir.x * r, y: CENTER.y + dir.y * r * 0.86 };
}

const ANCHORS = foreignRealms.map((realm) => ({ realm, at: realmAnchor(realm) }));

export const FrontierLayer = memo(function FrontierLayer({
  zoom,
  onRealmClick,
}: {
  zoom: number;
  onRealmClick: (realm: ForeignRealm) => void;
}) {
  return (
    <g>
      {/* Quatro anéis cada vez mais escuros: perto da costa ainda se enxerga
          alguma coisa; três léguas adiante, nada. */}
      <g pointerEvents="none">
        {RINGS.map((ring, i) => (
          <path
            key={i}
            d={WORLD_PATH + ring}
            fillRule="evenodd"
            fill="#080d10"
            opacity={[0.2, 0.3, 0.42, 0.72][i]}
          />
        ))}
        {CLOUDS.map((c, i) => (
          <ellipse key={i} cx={c.x} cy={c.y} rx={c.rx} ry={c.ry} fill="#9fb0b8" opacity={c.o} />
        ))}
      </g>

      {/* Os vizinhos. Clicáveis: o limite vira conteúdo em vez de parede. */}
      {ANCHORS.map(({ realm, at }) => (
        <g key={realm.id} style={{ cursor: "pointer" }} onClick={() => onRealmClick(realm)}>
          <circle cx={at.x} cy={at.y} r={90 * S} fill="transparent" />
          <text
            x={at.x}
            y={at.y}
            textAnchor="middle"
            fontSize={(26 * S) / Math.max(0.7, zoom * 0.55)}
            letterSpacing={(4 * S) / Math.max(0.7, zoom * 0.55)}
            fill="#8fa3ad"
            fillOpacity={0.75}
            stroke="#070c0f"
            strokeWidth={(3 * S) / Math.max(0.7, zoom * 0.55)}
            paintOrder="stroke"
            style={{ textTransform: "uppercase" }}
          >
            {realm.name.toUpperCase()}
          </text>
          <text
            x={at.x}
            y={at.y + (26 * S) / Math.max(0.7, zoom * 0.55)}
            textAnchor="middle"
            fontSize={(16 * S) / Math.max(0.7, zoom * 0.55)}
            fill="#6d818b"
            fillOpacity={0.7}
            stroke="#070c0f"
            strokeWidth={(2.4 * S) / Math.max(0.7, zoom * 0.55)}
            paintOrder="stroke"
          >
            fronteira fechada
          </text>
        </g>
      ))}
    </g>
  );
});
