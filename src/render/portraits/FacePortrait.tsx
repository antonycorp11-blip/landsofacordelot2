import { useId, useMemo } from "react";
import { buildFace, type FaceTraits } from "./face";

/**
 * O BUSTO.
 *
 * Desenhado em SVG a partir dos números de `face.ts`. Tudo aqui é paramétrico:
 * não há caminho escrito à mão que sirva a um rosto só — o maxilar, o nariz e
 * a boca saem de variáveis, e é por isso que mil pessoas diferentes cabem em
 * duzentas linhas.
 *
 * Escolhas de direção que importam mais do que parecem:
 *
 * - traço na cor da PELE escurecida, nunca preto: preto vira desenho animado;
 * - sombra num lado só, com desfoque, em cima de tudo — é o que dá volume;
 * - olhos pequenos e sem branco visível nos cantos: olho detalhado em 44 px
 *   vira mancha estranha;
 * - a roupa herda a cor da Casa, então um Karneth e um Silvarden se
 *   distinguem de longe mesmo com o mesmo rosto.
 */
export function FacePortrait({ size = 64, className, ...traits }: FaceTraits & { size?: number; className?: string }) {
  const raw = useId();
  const uid = useMemo(() => raw.replace(/[^a-zA-Z0-9_-]/g, ""), [raw]);
  const f = useMemo(() => buildFace(traits), [traits.seed, traits.female, traits.age, traits.accent, traits.kind]);

  // Sistema de coordenadas fixo: 100×100, rosto centrado em (50, 44).
  const cx = 50;
  const cy = 44;
  const hw = 19.4 * f.jaw;    // meia-largura da cabeça
  const hh = 25 * f.face;     // meia-altura
  const chin = cy + hh * 1.06;
  const eyeY = cy + 2;
  const browY = eyeY - 6.2;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`bg${uid}`} cx="50%" cy="34%" r="78%">
          <stop offset="0%" stopColor={f.garment} stopOpacity="0.5" />
          <stop offset="62%" stopColor={f.garmentDark} stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0d1518" stopOpacity="0.92" />
        </radialGradient>
        <filter id={`soft${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <clipPath id={`clip${uid}`}><circle cx="50" cy="50" r="50" /></clipPath>
        <linearGradient id={`fade${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1416" stopOpacity="0" />
          <stop offset="100%" stopColor="#0b1416" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#clip${uid})`}>
        <rect width="100" height="100" fill={`url(#bg${uid})`} />

        {/* ---------------------------- ombros --------------------------- */}
        <path
          d={`M8 100 Q14 ${f.old ? 78 : 80} 34 74 L66 74 Q86 ${f.old ? 78 : 80} 92 100 Z`}
          fill={f.garment}
        />
        <path d={`M34 74 Q50 ${86} 66 74 L66 100 L34 100 Z`} fill={f.garmentDark} />
        {/* Gola: uma linha clara que separa a roupa do pescoço. */}
        <path d={`M36 75 Q50 ${84} 64 75`} fill="none" stroke={f.garment} strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />

        {/* ---------------------------- pescoço --------------------------- */}
        <path d={`M${cx - 7} ${chin - 5} L${cx - 7.6} 78 L${cx + 7.6} 78 L${cx + 7} ${chin - 5} Z`} fill={f.skinShade} />

        {/* -------------------------- cabelo atrás ------------------------ */}
        {f.hairStyle !== 4 && !f.helm && (
          <path
            d={`M${cx - hw - 3} ${cy + 4} Q${cx - hw - 4} ${cy - hh - 8} ${cx} ${cy - hh - 9}
                Q${cx + hw + 4} ${cy - hh - 8} ${cx + hw + 3} ${cy + 4}
                L${cx + hw + 2} ${f.hairStyle === 1 || f.veil ? 80 : cy + 14}
                L${cx - hw - 2} ${f.hairStyle === 1 || f.veil ? 80 : cy + 14} Z`}
            fill={f.hairDark}
          />
        )}

        {/* --------------------------- a cabeça --------------------------- */}
        <path
          d={`M${cx - hw} ${cy - 4}
              Q${cx - hw} ${cy - hh - 2} ${cx} ${cy - hh - 2}
              Q${cx + hw} ${cy - hh - 2} ${cx + hw} ${cy - 4}
              Q${cx + hw * 0.94} ${cy + hh * 0.58} ${cx + hw * 0.42} ${chin - 2}
              Q${cx} ${chin + 2.4} ${cx - hw * 0.42} ${chin - 2}
              Q${cx - hw * 0.94} ${cy + hh * 0.58} ${cx - hw} ${cy - 4} Z`}
          fill={f.skin}
        />
        {/* Orelhas */}
        <ellipse cx={cx - hw + 0.6} cy={eyeY + 1} rx="2.4" ry="3.6" fill={f.skinShade} />
        <ellipse cx={cx + hw - 0.6} cy={eyeY + 1} rx="2.4" ry="3.6" fill={f.skinShade} />

        {/* --------------------------- feições ---------------------------- */}
        {/* Sobrancelhas: o traço que mais muda a expressão. */}
        <path
          d={`M${cx - f.eyeGap - 4} ${browY + f.browTilt * 0.4} q4 -1.8 8 ${-0.2 - f.browTilt * 0.2}`}
          stroke={f.hairDark} strokeWidth={f.beard > 2 ? 2.4 : 2} fill="none" strokeLinecap="round"
        />
        <path
          d={`M${cx + f.eyeGap - 4} ${browY - 0.2 - f.browTilt * 0.2} q4 ${-1.6 + f.browTilt * 0.2} 8 ${f.browTilt * 0.4}`}
          stroke={f.hairDark} strokeWidth={f.beard > 2 ? 2.4 : 2} fill="none" strokeLinecap="round"
        />

        {/* Olhos: pálpebra por cima, íris pequena. */}
        {[-1, 1].map((s) => (
          <g key={s}>
            {/* Sclera pequena e sem brilho: olho grande em 44 px vira boneco. */}
            <ellipse cx={cx + s * f.eyeGap} cy={eyeY + 0.3} rx="2.9" ry="1.85" fill="#e3d9c2" opacity="0.8" />
            <circle cx={cx + s * f.eyeGap} cy={eyeY + 0.4} r="1.55" fill={f.eye} />
            <circle cx={cx + s * f.eyeGap} cy={eyeY + 0.4} r="0.7" fill="#141110" />
            {/* Pálpebra superior pesada — é ela que dá idade e cansaço. */}
            <path
              d={`M${cx + s * f.eyeGap - 3.2} ${eyeY - 0.6} q3.2 -2.2 6.4 0`}
              stroke={f.skinLine} strokeWidth="1.7" fill="none" strokeLinecap="round"
            />
          </g>
        ))}

        {/* Nariz: duas curvas, sem contorno fechado. */}
        <path
          d={`M${cx - 0.6} ${eyeY + 1} q-1.2 ${f.noseLen} 1.2 ${f.noseLen + 0.6} q1.6 0.5 2.6 -0.8`}
          stroke={f.skinLine} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.8"
        />

        {/* Boca */}
        <path
          d={`M${cx - f.mouthWidth} ${eyeY + f.noseLen + 5.4} q${f.mouthWidth} ${f.mouthCurve} ${f.mouthWidth * 2} 0`}
          stroke={f.skinLine} strokeWidth="1.7" fill="none" strokeLinecap="round"
        />

        {/* Rugas de quem já viveu. */}
        {f.old && (
          <g stroke={f.skinLine} strokeWidth="1" fill="none" opacity="0.5" strokeLinecap="round">
            <path d={`M${cx - f.eyeGap - 5} ${eyeY + 3.2} q1.6 1.4 3 1.6`} />
            <path d={`M${cx + f.eyeGap + 2} ${eyeY + 4.8} q1.6 -0.2 3 -1.6`} />
            <path d={`M${cx - 7} ${eyeY + f.noseLen + 3} q-1.6 2.6 -1 4.4`} />
            <path d={`M${cx + 7} ${eyeY + f.noseLen + 3} q1.6 2.6 1 4.4`} />
          </g>
        )}

        {/* ----------------------------- barba ---------------------------- */}
        {f.beard >= 3 && (
          <path
            d={`M${cx - hw * 0.92} ${eyeY + 2} Q${cx - hw * 0.7} ${chin + (f.beard === 4 ? 9 : 4)} ${cx} ${chin + (f.beard === 4 ? 11 : 5)}
                Q${cx + hw * 0.7} ${chin + (f.beard === 4 ? 9 : 4)} ${cx + hw * 0.92} ${eyeY + 2}
                Q${cx + hw * 0.6} ${eyeY + 10} ${cx} ${eyeY + 9}
                Q${cx - hw * 0.6} ${eyeY + 10} ${cx - hw * 0.92} ${eyeY + 2} Z`}
            fill={f.hair} opacity="0.95"
          />
        )}
        {f.beard >= 1 && f.beard < 3 && (
          <path
            d={`M${cx - f.mouthWidth - 2} ${eyeY + f.noseLen + 3.2} q${f.mouthWidth + 2} ${-2.2} ${(f.mouthWidth + 2) * 2} 0 q-${f.mouthWidth + 2} 2.6 -${(f.mouthWidth + 2) * 2} 0 Z`}
            fill={f.hair} opacity="0.9"
          />
        )}

        {/* ------------------------- cabelo na frente --------------------- */}
        {!f.helm && !f.hood && !f.veil && (
          <path
            d={
              f.hairStyle === 0
                ? `M${cx - hw - 1} ${cy - 2} Q${cx - hw} ${cy - hh - 4} ${cx} ${cy - hh - 4} Q${cx + hw} ${cy - hh - 4} ${cx + hw + 1} ${cy - 2} Q${cx + 6} ${cy - hh + 5} ${cx - hw - 1} ${cy - 2} Z`
                : f.hairStyle === 1
                ? `M${cx - hw - 1} ${cy - 1} Q${cx - hw} ${cy - hh - 5} ${cx} ${cy - hh - 5} Q${cx + hw} ${cy - hh - 5} ${cx + hw + 1} ${cy - 1} Q${cx} ${cy - hh + 9} ${cx - hw - 1} ${cy - 1} Z`
                : f.hairStyle === 2
                ? `M${cx - hw - 1} ${cy - 4} Q${cx - hw + 1} ${cy - hh - 4} ${cx} ${cy - hh - 4} Q${cx + hw - 1} ${cy - hh - 4} ${cx + hw + 1} ${cy - 6} Q${cx + 2} ${cy - hh + 2} ${cx - 10} ${cy - hh + 6} Z`
                : f.hairStyle === 3
                ? `M${cx - hw - 1} ${cy - 3} Q${cx - hw} ${cy - hh - 3} ${cx} ${cy - hh - 3} Q${cx + hw} ${cy - hh - 3} ${cx + hw + 1} ${cy - 3} Q${cx + hw - 4} ${cy - hh + 4} ${cx + 4} ${cy - hh + 3} Q${cx - 6} ${cy - hh + 7} ${cx - hw - 1} ${cy - 3} Z`
                : f.hairStyle === 4
                ? /* calvo: só as laterais */ `M${cx - hw - 1} ${cy + 1} Q${cx - hw - 1} ${cy - 8} ${cx - hw + 3} ${cy - 10} Q${cx - hw + 1} ${cy - 2} ${cx - hw + 1} ${cy + 2} Z`
                : `M${cx - hw - 1} ${cy - 2} Q${cx - hw} ${cy - hh - 6} ${cx} ${cy - hh - 6} Q${cx + hw} ${cy - hh - 6} ${cx + hw + 1} ${cy - 2} Q${cx + hw - 3} ${cy - hh + 8} ${cx} ${cy - hh + 4} Q${cx - hw + 3} ${cy - hh + 8} ${cx - hw - 1} ${cy - 2} Z`
            }
            fill={f.hair}
          />
        )}

        {/* --------------------------- adereços --------------------------- */}
        {f.hood && (
          <path
            d={`M${cx - hw - 6} ${cy + 10} Q${cx - hw - 7} ${cy - hh - 12} ${cx} ${cy - hh - 12}
                Q${cx + hw + 7} ${cy - hh - 12} ${cx + hw + 6} ${cy + 10}
                Q${cx + hw - 2} ${cy - 4} ${cx} ${cy - hh + 1} Q${cx - hw + 2} ${cy - 4} ${cx - hw - 6} ${cy + 10} Z`}
            fill={f.garmentDark}
          />
        )}
        {f.veil && (
          <path
            d={`M${cx - hw - 4} 80 Q${cx - hw - 5} ${cy - hh - 8} ${cx} ${cy - hh - 8}
                Q${cx + hw + 5} ${cy - hh - 8} ${cx + hw + 4} 80
                Q${cx + hw - 3} ${cy - 6} ${cx} ${cy - hh + 3} Q${cx - hw + 3} ${cy - 6} ${cx - hw - 4} 80 Z`}
            fill="#e6dcc4" opacity="0.9"
          />
        )}
        {f.helm && (
          <>
            <path
              d={`M${cx - hw - 2} ${cy + 2} Q${cx - hw - 2} ${cy - hh - 9} ${cx} ${cy - hh - 9}
                  Q${cx + hw + 2} ${cy - hh - 9} ${cx + hw + 2} ${cy + 2}
                  L${cx + hw + 2} ${cy - 4} Q${cx} ${cy - 8} ${cx - hw - 2} ${cy - 4} Z`}
              fill="#9aa3a6"
            />
            <path d={`M${cx} ${cy - hh - 9} L${cx} ${cy - 6}`} stroke="#7c858a" strokeWidth="2.4" />
          </>
        )}
        {f.circlet && (
          <path
            d={`M${cx - hw + 1} ${cy - hh + 5} Q${cx} ${cy - hh + 1} ${cx + hw - 1} ${cy - hh + 5}`}
            stroke="#d9bb74" strokeWidth="2.2" fill="none" strokeLinecap="round"
          />
        )}

        {/* ------------- volume: é a sombra que tira o ar de adesivo ------- */}
        {/* Sombra de núcleo, colada no maxilar do lado escuro. */}
        <path
          d={`M${cx - hw} ${cy - hh + 2} Q${cx - hw - 1} ${cy + hh * 0.5} ${cx - hw * 0.36} ${chin - 1}
              Q${cx - hw * 0.2} ${chin - 6} ${cx - hw * 0.5} ${cy - 4} Z`}
          fill="#20120c" opacity="0.4" filter={`url(#soft${uid})`}
        />
        {/* Sombra do busto inteiro, para o lado esquerdo recuar. */}
        <path
          d={`M0 0 L${cx - 6} 0 L${cx - 15} 100 L0 100 Z`}
          fill="#08110f" opacity="0.3" filter={`url(#soft${uid})`}
        />
        {/* Luz na maçã do rosto do lado claro. */}
        <ellipse cx={cx + hw * 0.42} cy={cy - 2} rx="7.5" ry="10" fill="#fff2d8" opacity="0.14" filter={`url(#soft${uid})`} />

        {/* Fios: duas curvas escuras quebram a mancha chapada do cabelo. */}
        {!f.helm && !f.hood && !f.veil && f.hairStyle !== 4 && (
          <g stroke={f.hairDark} strokeWidth="1.1" fill="none" opacity="0.55" strokeLinecap="round">
            <path d={`M${cx - hw * 0.55} ${cy - hh + 1} q${hw * 0.3} ${hh * 0.3} ${hw * 0.15} ${hh * 0.55}`} />
            <path d={`M${cx + hw * 0.45} ${cy - hh + 2} q-${hw * 0.15} ${hh * 0.3} ${hw * 0.05} ${hh * 0.5}`} />
          </g>
        )}

        {/* O busto se apaga para a base, em vez de terminar cortado. */}
        <rect x="0" y="62" width="100" height="38" fill={`url(#fade${uid})`} />
        <circle cx="50" cy="50" r="50" fill="none" stroke="#0b1416" strokeWidth="9" opacity="0.3" />
      </g>
    </svg>
  );
}
