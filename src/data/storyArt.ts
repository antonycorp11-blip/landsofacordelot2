import carriageIntact from "../assets/story/carriage/intact.png?url";
import carriageWrecked from "../assets/story/carriage/wrecked.png?url";
import carriageLooted from "../assets/story/carriage/looted.png?url";
import sealBoxClosed from "../assets/story/seal/box_closed.png?url";
import sealBoxOpen from "../assets/story/seal/box_open.png?url";
import royalSeal from "../assets/story/seal/royal_seal.png?url";
import royalSealBroken from "../assets/story/seal/royal_seal_broken.png?url";

export type StoryArtKey = "carriage_intact" | "carriage_wrecked" | "carriage_looted" |
  "seal_box_closed" | "seal_box_open" | "royal_seal" | "royal_seal_broken";

export const storyArt: Record<StoryArtKey, string> = {
  carriage_intact: carriageIntact,
  carriage_wrecked: carriageWrecked,
  carriage_looted: carriageLooted,
  seal_box_closed: sealBoxClosed,
  seal_box_open: sealBoxOpen,
  royal_seal: royalSeal,
  royal_seal_broken: royalSealBroken,
};

