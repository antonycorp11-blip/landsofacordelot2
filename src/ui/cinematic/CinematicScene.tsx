import { useState } from "react";
import { FacePortrait } from "../../render/portraits/FacePortrait";
import { chooseScene, closeScene, sceneById, sceneChance } from "../../game/sceneRunner";
import { useGame } from "../../game/store";
import { storyArt } from "../../data/storyArt";
import { ExpressionPortrait } from "../portrait/ExpressionPortrait";
import { useTyped, type TypedLine } from "./useTyped";
import type { SceneResolution } from "../../game/sceneRunner";
import type { SceneBeat } from "../../game/cinematics";
import "./cinematic.css";

/**
 * UMA CENA.
 *
 * O rosto é o ponto. Os retratos foram feitos para que conversar não fosse
 * "um monte de texto na cara" — então o busto ocupa um terço da tela, inteiro,
 * e o texto divide o resto com as escolhas.
 *
 * A conversa é ESCRITA na frente do jogador, linha por linha. O que já foi
 * dito sobe, escurece e sai por cima; o que está sendo dito fica embaixo, no
 * claro. As escolhas só aparecem quando a última linha termina — antes disso
 * não há o que escolher, e mostrá-las cedo é pedir para o jogador pular a
 * cena.
 *
 * Um toque em qualquer lugar completa o texto na hora.
 */

/** Quanto mais velha a linha, mais apagada. É o que faz a conversa "subir". */
function fade(indexFromEnd: number): number {
  return [1, 0.58, 0.34, 0.2][indexFromEnd] ?? 0.12;
}

function Thread({ lines }: { lines: TypedLine[] }) {
  return (
    <div className="cine-thread">
      {lines.map((line, i) => {
        const spoken = line.text.trim().startsWith("«");
        return (
          <p
            key={i}
            className={spoken ? "said" : "seen"}
            style={{ opacity: fade(lines.length - 1 - i) }}
          >
            <span>
              {line.text}
              {!line.done && <i className="cine-caret" />}
            </span>
          </p>
        );
      })}
    </div>
  );
}

/**
 * O palco: quem fala, em tamanho de gente.
 *
 * Quando não há ninguém falando, o lugar é do objeto — a caixa, o selo, a
 * carruagem —, que é o assunto daquele momento e merece o mesmo espaço.
 */
function Stage({ beat }: { beat: Pick<SceneBeat, "speaker" | "art"> }) {
  const { speaker, art } = beat;
  if (!speaker && !art) return null;

  const face = speaker && !speaker.portraitKey && {
    seed: speaker.seed ?? speaker.name,
    female: speaker.female,
    age: speaker.age ?? 0.45,
    accent: "#7b6a4c",
  };

  return (
    <div className="cine-stage">
      <div className="cine-bust">
        {speaker?.portraitKey ? (
          <ExpressionPortrait
            portraitKey={speaker.portraitKey}
            expression={speaker.expression}
            sequence={speaker.expressionSequence}
            className="cine-bust-art"
          />
        ) : face ? (
          <FacePortrait {...face} size={320} className="cine-bust-art" />
        ) : (
          art && <img className="cine-bust-art item" src={storyArt[art]} alt="" />
        )}
        {/* Objeto e pessoa na mesma cena: o objeto vira um encarte no canto. */}
        {speaker && art && <img className="cine-inset" src={storyArt[art]} alt="" />}
      </div>
      {speaker && (
        <div className="cine-name">
          <b>{speaker.name}</b>
          {speaker.role && <em>{speaker.role}</em>}
        </div>
      )}
    </div>
  );
}

export function CinematicScene() {
  const game = useGame();
  const active = game.adventure.cinematic;
  const [outcome, setOutcome] = useState<SceneResolution | null>(null);

  const scene = active ? sceneById(active.sceneId) : undefined;
  const beat = active && scene ? scene.beats[active.beatId] : undefined;

  // O desfecho tem prioridade sobre tudo, inclusive sobre a cena já encerrada:
  // a escolha que fecha limpa o estado na hora, e sem esta ordem a última fala
  // — a que entrega o mistério — sumia sem ser lida.
  const lines = outcome ? outcome.text.split("\n\n") : beat?.text ?? [];
  const key = outcome ? `outcome:${outcome.text.slice(0, 24)}` : `${active?.sceneId}:${active?.beatId}`;
  const typed = useTyped(lines, key);

  if (!outcome && !beat) return null;

  const stage: Pick<SceneBeat, "speaker" | "art"> = outcome
    ? { art: outcome.art, speaker: undefined }
    : { speaker: beat!.speaker, art: beat!.art };

  const pick = (id: string) => {
    const result = chooseScene(id);
    if (result) setOutcome(result);
  };

  return (
    <div
      // Sem ninguém e sem objeto, é narração pura: a tela apaga de vez, e o
      // mapa some. É a abertura, e é para parecer o começo de um livro.
      className={`cine ${stage.speaker || stage.art ? "" : "solo"}`}
      onClick={() => { if (!typed.done) typed.skip(); }}
    >
      <div className="cine-frame">
        <Stage beat={stage} />

        <div className="cine-side">
          {!outcome && (beat!.place || beat!.time) && (
            <div className="cine-where">
              {beat!.place}
              {beat!.place && beat!.time && <span className="cine-dot">·</span>}
              {beat!.time}
            </div>
          )}

          <Thread lines={typed.shown} />

          <div className={`cine-choices ${typed.done ? "ready" : "waiting"}`}>
            {outcome ? (
              <button className="cine-choice continue" onClick={() => setOutcome(null)}>
                <span className="cine-label">Continuar</span>
              </button>
            ) : (
              beat!.choices.map((choice, i) => {
                const chance = choice.check ? Math.round(sceneChance(choice, game) * 100) : null;
                // Caminho que existe e que você não pode tomar: aparece
                // trancado, com o motivo. Esconder seria esconder que faltou
                // alguma coisa lá atrás.
                const locked = !!choice.needsFlag && !game.storyFlags.includes(choice.needsFlag.flag);
                return (
                  <button
                    key={choice.id}
                    className={`cine-choice ${locked ? "locked" : ""}`}
                    disabled={locked}
                    tabIndex={typed.done && !locked ? 0 : -1}
                    onClick={(e) => { e.stopPropagation(); if (!locked) pick(choice.id); }}
                  >
                    <span className="cine-number">{i + 1}</span>
                    <span className="cine-label">
                      {choice.label}
                      {(locked ? choice.needsFlag!.blocked : choice.hint) && (
                        <em>{locked ? choice.needsFlag!.blocked : choice.hint}</em>
                      )}
                    </span>
                    {choice.check && (
                      <span className="cine-check">
                        {choice.check.label}
                        <b>{chance}%</b>
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
      {/* Saída de emergência: cena travada é pior que cena pulada — exceto
          onde sair custaria a história inteira. */}
      {!scene?.noEscape && (
        <button className="cine-escape" onClick={(e) => { e.stopPropagation(); closeScene(); }} aria-label="Afastar-se">×</button>
      )}
    </div>
  );
}
