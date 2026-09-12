/**
 * BRASÕES DAS CASAS.
 *
 * Registry igual ao dos assets do mapa: a arte é referenciada por chave, então
 * trocar um PNG não toca em nenhum componente. Casa sem arte devolve
 * `undefined` e quem desenha cai no brasão vetorial provisório.
 */
import valdoria from "../assets/houses/valdoria.webp?url";
import silvarden from "../assets/houses/silvarden.webp?url";
import dravenor from "../assets/houses/dravenor.webp?url";
import karneth from "../assets/houses/karneth.webp?url";
import caelmont from "../assets/houses/caelmont.webp?url";
import elmwood from "../assets/houses/elmwood.webp?url";
import aurenna from "../assets/houses/aurenna.webp?url";
import morvath from "../assets/houses/morvath.webp?url";
import veyr from "../assets/houses/veyr.webp?url";
import rosethorne from "../assets/houses/rosethorne.webp?url";

export const houseCrests: Record<string, string> = {
  crest_valdoria: valdoria,
  crest_silvarden: silvarden,
  crest_dravenor: dravenor,
  crest_karneth: karneth,
  crest_caelmont: caelmont,
  crest_elmwood: elmwood,
  crest_aurenna: aurenna,
  crest_morvath: morvath,
  crest_veyr: veyr,
  crest_rosethorne: rosethorne,
};

export function crestUrl(key: string | undefined): string | undefined {
  return key ? houseCrests[key] : undefined;
}
