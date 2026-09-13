import { memo } from "react";
import { portraitUrl } from "../../data/characterAssets";
import { CLASS_LABEL, type Character } from "../../data/characters";
import { FacePortrait } from "../../render/portraits/FacePortrait";
import { faceOf } from "../../render/portraits/characterFace";
import { relationLabel } from "../../data/player";

/**
 * Um personagem em miniatura: retrato, Casa, título e classe.
 *
 * BRASÃO e CLASSE aparecem lado a lado porque são coisas diferentes — o
 * brasão diz de que família a pessoa é, a classe diz qual é o seu ofício.
 */
const CLASS_GLYPH: Record<string, string> = {
  MILITARY: "⚔",
  TRADE: "⚖",
  POLITICS: "✎",
  RELIGION: "✧",
};

export const CharacterMiniCard = memo(function CharacterMiniCard({
  character,
  here,
}: {
  character: Character;
  /** Se a pessoa está mesmo neste local agora. */
  here: boolean;
}) {
  const portrait = portraitUrl(character.portraitAssetKey);
  return (
    <div className={`char-card ${here ? "" : "away"}`}>
      {portrait ? (
        <img className="char-portrait" src={portrait} alt={character.name} loading="lazy" />
      ) : (
        <div className="char-portrait char-portrait-empty" aria-hidden="true">
          <FacePortrait {...faceOf(character)} size={62} />
        </div>
      )}
      <div className="char-body">
        <div className="char-name">{character.name}</div>
        <div className="char-line">{character.title}</div>
        <div className="char-line char-class">
          <span className="glyph" aria-hidden="true">{CLASS_GLYPH[character.primaryClass]}</span>
          {CLASS_LABEL[character.primaryClass]}
          <span className="char-relation">
            {relationLabel(character.relationWithPlayer)} ({character.relationWithPlayer > 0 ? "+" : ""}
            {character.relationWithPlayer})
          </span>
        </div>
      </div>
    </div>
  );
});
