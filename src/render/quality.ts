/**
 * ORÇAMENTO DE DESENHO POR APARELHO.
 *
 * O mapa é o mesmo em toda parte — mesma geografia, mesmas rotas, mesmos
 * assets. O que muda aqui é só quanto o navegador precisa pintar por frame.
 * Um celular tem uma tela de densidade alta e um orçamento de GPU bem menor
 * que um desktop: pintar em 3× a resolução custa nove vezes mais pixels para
 * um ganho que ninguém enxerga num mapa de pixel art.
 */

/** Toque como entrada principal — na prática, celular ou tablet. */
export const IS_TOUCH =
  typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

/** Teto de densidade para os canvas do chão e do cenário. */
export const CANVAS_DPR = IS_TOUCH ? 1.5 : 2;

/** Enfeites animados: bonitos no desktop, repintura contínua no celular. */
export const ANIMATED_DECOR = !IS_TOUCH;
