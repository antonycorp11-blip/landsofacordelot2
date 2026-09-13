/**
 * ROSTOS GERADOS.
 *
 * A maior parte da gente deste reino nunca vai ter arte encomendada: são
 * senescais, capatazes, anciãs e lordes menores gerados a partir do id do
 * lugar. Um monograma numa bolinha não é personagem — é etiqueta. E falar com
 * uma etiqueta é o que fazia a conversa parecer menu.
 *
 * Então o rosto é DESENHADO: um busto de três quartos, com pele, cabelo,
 * barba, olhos e roupa tirados do mesmo id que gerou o nome. O mesmo
 * personagem tem sempre a mesma cara, em qualquer tela, para sempre.
 *
 * A direção é de camafeu pintado, não de avatar de aplicativo: paleta baixa e
 * quente, contorno na própria cor da pele escurecida em vez de preto, sombra
 * de um lado só, e nenhum detalhe pequeno demais para sobreviver a 44 px —
 * que é o tamanho em que ele aparece numa conversa de celular deitado.
 */

export type FaceTraits = {
  /** Semente: normalmente o id do personagem. */
  seed: string;
  female?: boolean;
  /** 0 jovem, 1 velho. Puxa cabelo grisalho, rugas e ombros. */
  age?: number;
  /** Cor da Casa, quando há. Tinge a roupa e o fundo. */
  accent?: string;
  /** Ofício, que decide gola, capuz, elmo ou véu. */
  kind?: "militar" | "corte" | "clero" | "povo";
};

export type Face = {
  skin: string;
  skinShade: string;
  skinLine: string;
  hair: string;
  hairDark: string;
  eye: string;
  garment: string;
  garmentDark: string;
  /** 0–5 */
  hairStyle: number;
  beard: number;
  /** Largura do maxilar, 0.86–1.06. */
  jaw: number;
  /** Altura do rosto, 0.94–1.08. */
  face: number;
  browTilt: number;
  eyeGap: number;
  noseLen: number;
  mouthWidth: number;
  /** Curvatura da boca: negativo desce, positivo sobe. Quase todo mundo é neutro. */
  mouthCurve: number;
  hood: boolean;
  helm: boolean;
  circlet: boolean;
  veil: boolean;
  old: boolean;
};

/* --------------------------- paletas ---------------------------------- */

const SKIN = [
  ["#e8c49c", "#c99b74", "#9c7150"],
  ["#dcb287", "#b98b62", "#8d6343"],
  ["#c9976c", "#a5764f", "#7c5637"],
  ["#a8764f", "#875a3a", "#63402a"],
  ["#7d5336", "#623e28", "#472c1d"],
  ["#f0d3ae", "#d0ab83", "#a37f5c"],
];
const HAIR = [
  ["#2a211c", "#181310"], // preto
  ["#4a3527", "#2e2118"], // castanho escuro
  ["#6b4a2f", "#46301e"], // castanho
  ["#8a6435", "#5d4222"], // claro
  ["#a8763f", "#75512a"], // ruivo
  ["#b9ac97", "#8d8271"], // grisalho
];
const EYES = ["#4a5c52", "#5b4a36", "#3e5162", "#6a4a3a", "#42504a"];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Um valor estável entre 0 e 1 para cada aspecto, a partir da mesma semente. */
function pick(seed: string, salt: string): number {
  return (hash(`${seed}#${salt}`) % 10000) / 10000;
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * amount)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * amount)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function buildFace({ seed, female = false, age = 0.35, accent = "#8a8f7a", kind = "povo" }: FaceTraits): Face {
  const skin = SKIN[Math.floor(pick(seed, "skin") * SKIN.length)];
  // Cabelo embranquece com a idade, e não por sorteio.
  const grey = age > 0.62 ? pick(seed, "grey") < (age - 0.5) * 2.2 : false;
  const hair = grey ? HAIR[5] : HAIR[Math.floor(pick(seed, "hair") * 5)];

  return {
    skin: skin[0],
    skinShade: skin[1],
    skinLine: skin[2],
    hair: hair[0],
    hairDark: hair[1],
    eye: EYES[Math.floor(pick(seed, "eye") * EYES.length)],
    garment: accent,
    garmentDark: shade(accent, 0.62),
    hairStyle: Math.floor(pick(seed, "style") * 6),
    // Barba só em homem, e mais provável em quem já viveu.
    beard: female ? 0 : Math.floor(pick(seed, "beard") * (age > 0.45 ? 5 : 3.4)),
    jaw: (female ? 0.88 : 0.94) + pick(seed, "jaw") * 0.12,
    face: 0.95 + pick(seed, "face") * 0.12,
    browTilt: (pick(seed, "brow") - 0.5) * 5,
    eyeGap: 8.6 + pick(seed, "gap") * 1.6,
    noseLen: 5.4 + pick(seed, "nose") * 2.6,
    mouthWidth: 4.2 + pick(seed, "mouth") * 2,
    // Ninguém posa sorrindo para um camafeu. A maioria fica entre o neutro e o
    // amargo, e o sorriso é a exceção — era o sorriso em todo mundo que fazia
    // a galeria inteira parecer avatar de aplicativo.
    mouthCurve: -1.6 + pick(seed, "curve") * 3.1,
    hood: kind === "clero" && pick(seed, "hood") > 0.35,
    helm: kind === "militar" && pick(seed, "helm") > 0.55,
    circlet: kind === "corte" && pick(seed, "circlet") > 0.5,
    veil: female && kind === "clero" && pick(seed, "veil") > 0.4,
    old: age > 0.6,
  };
}
