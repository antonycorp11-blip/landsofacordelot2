import { characterById } from "../../data/characters";
import { portraitUrl } from "../../data/characterAssets";
import { houseById } from "../../data/houses";
import { poiById } from "../../world/valdoria";
import { chapterOfStep, currentStep } from "../../game/story";
import { chooseStoryOption } from "../../game/adventure";
import { useGame } from "../../game/store";
import { DialogueScreen } from "../dialogue/DialogueScreen";

/**
 * UMA CENA DA CAMPANHA PRINCIPAL.
 *
 * Usa a mesma tela das conversas de localidade de propósito: para quem joga,
 * falar com o Protetor do Reino tem exatamente a forma de falar com um mestre
 * de guilda —
 * retrato, fala, respostas numeradas. O que muda é o peso do que se responde.
 *
 * Quando ninguém fala, a cena narra: sai o retrato e fica o capítulo.
 */
export function StoryScene() {
  const game = useGame();
  const story = game.adventure.story;
  const step = currentStep(story);
  if (!step || story.pending !== step.id || !step.scene) return null;

  const scene = step.scene;
  const chapter = chapterOfStep.get(step.id);
  const speaker = scene.speakerId ? characterById.get(scene.speakerId) : undefined;
  const place = scene.poiId ? poiById.get(scene.poiId) : undefined;
  const house = speaker ? houseById.get(speaker.houseId) : undefined;

  return (
    <DialogueScreen
      scene={{
        narration: !speaker,
        speakerName: speaker?.name ?? chapter?.title ?? "A campanha",
        speakerRole: speaker?.title ?? `Capítulo ${chapter?.number ?? 1}`,
        portraitUrl: speaker ? portraitUrl(speaker.portraitAssetKey) : undefined,
        accent: house?.color ?? "#d8bb79",
        placeName: place?.name,
        text: scene.text,
        options: scene.options.map((o) => ({
          id: o.id,
          label: o.label,
          hint: o.hint,
          onPick: () => chooseStoryOption(o.id),
        })),
      }}
      /* A campanha não se fecha com um toque fora: é escolha, não janela. */
      onClose={() => {}}
    />
  );
}
