import aldren from "../assets/story/portraits/aldren_valdoria.png?url";
import edran from "../assets/story/portraits/edran_silvarden.png?url";
import garrick from "../assets/story/portraits/garrick_karneth.png?url";
import boran from "../assets/story/portraits/boran_dravenor.png?url";
import aled from "../assets/story/portraits/aled_vern.png?url";
import ilyra from "../assets/story/portraits/ilyra_veyr.png?url";
import caelan from "../assets/story/portraits/caelan_valdoria.png?url";
import elira from "../assets/story/portraits/elira_valdoria.png?url";
import yseld from "../assets/story/portraits/yseld_caelmont.png?url";
import venna from "../assets/story/portraits/venna.png?url";
import harn from "../assets/story/portraits/harn.png?url";
import messenger from "../assets/story/portraits/messenger.png?url";
import seraphine from "../assets/story/portraits/seraphine_aurenna.png?url";
import tomas from "../assets/story/portraits/tomas_elmwood.png?url";
import cassian from "../assets/story/portraits/cassian_caelmont.png?url";
import vaelor from "../assets/story/portraits/vaelor_morvath.png?url";
import edric from "../assets/story/portraits/edric_rosethorne.png?url";

export type PortraitExpression =
  | "neutral" | "attentive" | "hard" | "shaken" | "amused" | "exhausted"
  | "urgent" | "offering" | "fading";

export type StoryPortrait = { url: string; cols: number; rows: number };

/** Atlas leves: seis emoções por personagem, três estados para o mensageiro. */
export const storyPortraits: Record<string, StoryPortrait> = {
  portrait_aldren_valdoria: { url: aldren, cols: 3, rows: 2 },
  portrait_edran_silvarden: { url: edran, cols: 3, rows: 2 },
  portrait_garrick_karneth: { url: garrick, cols: 3, rows: 2 },
  portrait_boran_dravenor: { url: boran, cols: 3, rows: 2 },
  portrait_aled_vern: { url: aled, cols: 3, rows: 2 },
  portrait_ilyra_veyr: { url: ilyra, cols: 3, rows: 2 },
  portrait_caelan_valdoria: { url: caelan, cols: 3, rows: 2 },
  portrait_elira_valdoria: { url: elira, cols: 3, rows: 2 },
  portrait_yseld_caelmont: { url: yseld, cols: 3, rows: 2 },
  portrait_venna: { url: venna, cols: 3, rows: 2 },
  portrait_harn: { url: harn, cols: 3, rows: 2 },
  portrait_messenger: { url: messenger, cols: 3, rows: 1 },
  portrait_seraphine_aurenna: { url: seraphine, cols: 3, rows: 2 },
  portrait_tomas_elmwood: { url: tomas, cols: 3, rows: 2 },
  portrait_cassian_caelmont: { url: cassian, cols: 3, rows: 2 },
  portrait_vaelor_morvath: { url: vaelor, cols: 3, rows: 2 },
  portrait_edric_rosethorne: { url: edric, cols: 3, rows: 2 },
};

const STANDARD: PortraitExpression[] = ["neutral", "attentive", "hard", "shaken", "amused", "exhausted"];
const MESSENGER: PortraitExpression[] = ["urgent", "offering", "fading"];

export function portraitFrame(key: string, expression: PortraitExpression = "neutral") {
  const portrait = storyPortraits[key];
  if (!portrait) return null;
  const order = key === "portrait_messenger" ? MESSENGER : STANDARD;
  const index = Math.max(0, order.indexOf(expression));
  return { ...portrait, col: index % portrait.cols, row: Math.floor(index / portrait.cols) };
}

