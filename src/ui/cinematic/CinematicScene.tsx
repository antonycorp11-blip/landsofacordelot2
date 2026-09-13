import { useState } from "react";
import { FacePortrait } from "../../render/portraits/FacePortrait";
import { chooseScene, closeScene, sceneById, sceneChance } from "../../game/sceneRunner";
import { useGame } from "../../game/store";
import "./cinematic.css";

/**
 * UMA CENA.
 *
 * O mapa continua atrás, escurecido — o jogo não trocou de tela, ele parou por
 * um momento. Sem moldura de painel, sem barra de título, sem números em
 * destaque: local e hora em letra pequena no alto, três linhas de texto, e as
 * escolhas embaixo com o teste dito antes.
 *
 * O resultado de uma escolha é mostrado ANTES de seguir. Uma decisão cujo
 * efeito aparece só depois, misturado a outros, não ensina nada a ninguém.
 */
export function CinematicScene() {
  const game = useGame();
  const active = game.adventure.cinematic;
  const [outcome, setOutcome] = useState<string | null>(null);

  /**
   * O resultado é mostrado ANTES de qualquer outra coisa, inclusive depois de
   * a cena ter terminado.
   *
   * A escolha que encerra a cena limpa o estado na hora — e sem esta ordem a
   * última fala, que é justamente a que entrega o mistério, sumia sem nunca
   * aparecer na tela.
   */
  if (outcome) {
    return (
      <div className="cine">
        <div className="cine-frame">
          <p className="cine-outcome">{outcome}</p>
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

  const pick = (id: string) => {
    const text = chooseScene(id);
    if (text) setOutcome(text);
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

        <div className="cine-body">
          {beat.speaker && (
            <div className="cine-speaker">
              <FacePortrait
                seed={beat.speaker.seed ?? beat.speaker.name}
                female={beat.speaker.female}
                age={beat.speaker.age ?? 0.45}
                accent="#7b6a4c"
                size={54}
                className="cine-face"
              />
              <span>
                <b>{beat.speaker.name}</b>
                {beat.speaker.role && <em>{beat.speaker.role}</em>}
              </span>
            </div>
          )}

          <div className="cine-text">
            {beat.text.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
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
      {/* Saída de emergência: uma cena travada é pior que uma cena pulada. */}
      <button className="cine-escape" onClick={closeScene} aria-label="Afastar-se">×</button>
    </div>
  );
}
