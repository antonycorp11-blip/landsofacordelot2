/**
 * RETRATOS DOS PERSONAGENS.
 *
 * Mesmo princípio do registry de brasões. Quem não tem arte devolve
 * `undefined` e o painel mostra só o nome e a Casa — nada quebra.
 */
import aldren from "../assets/characters/aldren_valdoria.webp?url";
import garrick from "../assets/characters/garrick_karneth.webp?url";
import seraphine from "../assets/characters/seraphine_aurenna.webp?url";
import edran from "../assets/characters/edran_silvarden.webp?url";
import boran from "../assets/characters/boran_dravenor.webp?url";
import tomas from "../assets/characters/tomas_elmwood.webp?url";
import yseld from "../assets/characters/yseld_caelmont.webp?url";
import vaelor from "../assets/characters/vaelor_morvath.webp?url";
import ilyra from "../assets/characters/ilyra_veyr.webp?url";
import rosethorne from "../assets/characters/rosethorne_leader.webp?url";

export const characterPortraits: Record<string, string> = {
  portrait_aldren_valdoria: aldren,
  portrait_garrick_karneth: garrick,
  portrait_seraphine_aurenna: seraphine,
  portrait_edran_silvarden: edran,
  portrait_boran_dravenor: boran,
  portrait_tomas_elmwood: tomas,
  portrait_yseld_caelmont: yseld,
  portrait_vaelor_morvath: vaelor,
  portrait_ilyra_veyr: ilyra,
  portrait_rosethorne_leader: rosethorne,
};

export function portraitUrl(key: string | undefined): string | undefined {
  return key ? characterPortraits[key] : undefined;
}
