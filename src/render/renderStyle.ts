/**
 * Direção de renderização da arte.
 *
 * Em pixel art o navegador NÃO pode suavizar a imagem: sem isto, um tile de
 * 32×32 ampliado vira um borrão e perde exatamente o que caracteriza o estilo.
 */
export const PIXEL_ART = true;

/** Aplicar em todo `<image>` que desenha arte do mapa. */
export const imageRendering = PIXEL_ART ? ("pixelated" as const) : ("auto" as const);
