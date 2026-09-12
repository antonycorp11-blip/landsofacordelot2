/**
 * RETRATOS DOS QUATRO INÍCIOS.
 *
 * Vazio até a arte chegar. Quem desenha cai num retrato provisório com a cor
 * do arquétipo — nunca uma tentativa de recriar a arte em CSS.
 *
 * Para aplicar: solte os arquivos em `src/assets/heroes/` com estes nomes e
 * acrescente um `import` por linha aqui.
 *
 *   kael_arven.webp · lyra_venn.webp · edrian_vale.webp · serah_elynn.webp
 */
export const heroPortraits: Record<string, string> = {};

export function heroPortraitUrl(key: string | undefined): string | undefined {
  return key ? heroPortraits[key] : undefined;
}

/** Chaves declaradas mas ainda sem arquivo — o autoteste reporta. */
export const MISSING_HERO_PORTRAITS = [
  "hero_kael_arven",
  "hero_lyra_venn",
  "hero_edrian_vale",
  "hero_serah_elynn",
];
