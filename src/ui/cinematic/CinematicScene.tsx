import { useState } from "react";
import { FacePortrait } from "../../render/portraits/FacePortrait";
import { chooseScene, closeScene, sceneById, sceneChance } from "../../game/sceneRunner";
import { useGame } from "../../game/store";
import { storyArt } from "../../data/storyArt";
import { ExpressionPortrait } from "../portrait/ExpressionPortrait";
import type { SceneResolution } from "../../game/sceneRunner";
import "./cinematic.css";

/**
 * UMA CENA, LIDA COMO CONVERSA.
 *
 * O mapa continua atrás, escurecido — o jogo não trocou de tela, ele parou por
 * um momento. E o que acontece é lido como uma troca de mensagens, que é como
 * se lê hoje:
 *
 *   o que se VÊ vem recuado e sem rosto — é a voz de quem está olhando;
 *   o que alguém DIZ vem numa bolha, com o rosto de quem disse ao lado.
 *
 * A marca de fala é o «» do próprio texto, então escrever a cena e escrever o
 * layout são a mesma coisa: quem redige decide o que é fala.
 */
export function CinematicScene() {
  const game = useGame();
  const active = game.adventure.cinematic;
  const [outcome, setOutcome] = useState<SceneResolution | null>(null);

  /**
   * O resultado aparece ANTES de qualquer outra coisa, inclusive depois de a
   * cena ter acabado: a escolha que encerra limpa o estado na hora, e sem esta
   * ordem a última fala — a que entrega o mistério — sumia sem ser mostrada.
   */
  if (outcome) {
    return (
      <div className="cine">
        <div className="cine-frame">
          {outcome.art && <div className="cine-art"><img src={storyArt[outcome.art]} alt="" /></div>}
          <div className="cine-thread">
            {outcome.text.split("\n\n").map((part, i) => (
              <p key={i} className={part.trim().startsWith("«") ? "said" : "seen"}>
                <span>{part}</span>
              </p>
            ))}
          </div>
          <div className="cine-choices">
            <button className="cine-choice continue" onClick={() => setOutcome(null)}>
              <span className="cine-label">Continuar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!active) return null;
  const scene = sceneById(active.sceneId);
  const beat = scene?.beats[active.beatId];
  if (!beat) return null;

  const face = beat.speaker && !beat.speaker.portraitKey && {
    seed: beat.speaker.seed ?? beat.speaker.name,
    female: beat.speaker.female,
    age: beat.speaker.age ?? 0.45,
    accent: "#7b6a4c",
  };

  const pick = (id: string) => {
    const result = chooseScene(id);
    if (result) setOutcome(result);
  };

  return (
    <div className="cine">
      <div className="cine-frame">
        {(beat.place || beat.time) && (
          <div className="cine-where">
            {beat.place}
            {beat.place && beat.time && <span className="cine-dot">·</span>}
            {beat.time}
          </div>
        )}

        {beat.art && <div className="cine-art"><img src={storyArt[beat.art]} alt="" /></div>}

        {beat.speaker && (
          <div className="cine-who">
            {beat.speaker.portraitKey
              ? <ExpressionPortrait
                  portraitKey={beat.speaker.portraitKey}
                  expression={beat.speaker.expression}
                  sequence={beat.speaker.expressionSequence}
                  className="cine-face"
                />
              : face && <FacePortrait {...face} size={44} className="cine-face" />}
            <span>
              <b>{beat.speaker.name}</b>
              {beat.speaker.role && <em>{beat.speaker.role}</em>}
            </span>
          </div>
        )}

        <div className="cine-thread">
          {beat.text.map((line, i) => {
            const spoken = line.trim().startsWith("«");
            return (
              <p key={i} className={spoken ? "said" : "seen"}>
                {spoken && beat.speaker?.portraitKey && (
                  <ExpressionPortrait
                    portraitKey={beat.speaker.portraitKey}
                    expression={beat.speaker.expression}
                    sequence={beat.speaker.expressionSequence}
                    className="cine-bubble-face"
                  />
                )}
                {spoken && face && <FacePortrait {...face} size={26} className="cine-bubble-face" />}
                <span>{line}</span>
              </p>
            );
          })}
        </div>

        <div className="cine-choices">
          {beat.choices.map((choice, i) => {
            const chance = choice.check ? Math.round(sceneChance(choice, game) * 100) : null;
            return (
              <button key={choice.id} className="cine-choice" onClick={() => pick(choice.id)}>
                <span className="cine-number">{i + 1}</span>
                <span className="cine-label">
                  {choice.label}
                  {choice.hint && <em>{choice.hint}</em>}
                </span>
                {choice.check && (
                  <span className="cine-check">
                    {choice.check.label}
                    <b>{chance}%</b>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {/* Saída de emergência: cena travada é pior que cena pulada. */}
      <button className="cine-escape" onClick={closeScene} aria-label="Afastar-se">×</button>
    </div>
  );
}
