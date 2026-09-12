/**
 * RETRATOS DOS QUATRO INÍCIOS.
 *
 * Mesmo registry dos brasões e dos líderes: a arte é referenciada por chave, e
 * trocar um arquivo não toca em componente nenhum. Chave sem arquivo devolve
 * `undefined` e a tela cai na inicial do nome, nunca num retrato inventado.
 */
import kael from "../assets/heroes/kael_arven.webp?url";
import lyra from "../assets/heroes/lyra_venn.webp?url";
import edrian from "../assets/heroes/edrian_vale.webp?url";
import serah from "../assets/heroes/serah_elynn.webp?url";

export const heroPortraits: Record<string, string> = {
  hero_kael_arven: kael,
  hero_lyra_venn: lyra,
  hero_edrian_vale: edrian,
  hero_serah_elynn: serah,
};

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
