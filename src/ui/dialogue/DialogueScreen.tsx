import { useEffect, useRef } from "react";
import { FacePortrait } from "../../render/portraits/FacePortrait";
import type { FaceTraits } from "../../render/portraits/face";
import { ExpressionPortrait } from "../portrait/ExpressionPortrait";
import type { PortraitExpression } from "../../data/storyPortraits";
import "./dialogue.css";

/**
 * CONVERSA.
 *
 * Uma pessoa, uma fala, e as respostas que você pode dar. Trabalho, notícia e
 * favor nascem daqui — de alguém que você procurou num lugar —, e não de uma
 * tela de lista que aparece do nada.
 *
 * O componente não sabe nada do jogo: recebe a cena montada e devolve o toque.
 * Quem decide o que cada resposta faz é a conversa que a construiu.
 */
export type DialogueOption = {
  id: string;
  label: string;
  /** Linha de apoio: prazo, recompensa, motivo do bloqueio. */
  hint?: string;
  disabled?: boolean;
  onPick: () => void;
};

export type DialogueScene = {
  speakerName: string;
  /** Cargo ou função — "Capitão da guarda", "Senhor das Marchas". */
  speakerRole?: string;
  portraitUrl?: string;
  /** Atlas emocional usado pela campanha; tem prioridade sobre a carta antiga. */
  portraitSetKey?: string;
  expression?: PortraitExpression;
  expressionSequence?: PortraitExpression[];
  /** Cor da Casa, quando houver: a faixa do retrato herda dela. */
  accent?: string;
  /** Onde a conversa acontece. */
  placeName?: string;
  /** Sem ninguém falando: a cena narra, e o círculo de retrato sai. */
  narration?: boolean;
  /**
   * Quando não há arte encomendada, o rosto é DESENHADO a partir da semente.
   * Uma inicial numa bolinha não é personagem — é etiqueta, e conversar com
   * etiqueta parece menu.
   */
  face?: FaceTraits;
  text: string;
  options: DialogueOption[];
};

export function DialogueScreen({ scene, onClose }: { scene: DialogueScene; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
      // Bannerlord responde ao número da fala; aqui também.
      const n = Number(e.key);
      if (n >= 1 && n <= 9) {
        const button = root.current?.querySelectorAll<HTMLButtonElement>(".dlg-option:not(:disabled)")[n - 1];
        button?.click();
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="dlg-backdrop">
      <div
        className="dlg-scene"
        role="dialog"
        aria-modal="true"
        aria-label={`Conversa com ${scene.speakerName}`}
        ref={root}
        tabIndex={-1}
        style={{ ["--accent" as string]: scene.accent ?? "#c8af6e" }}
      >
        <div className="dlg-speaker">
          {!scene.narration && <div className="dlg-portrait">
            {scene.portraitSetKey
              ? <ExpressionPortrait
                  portraitKey={scene.portraitSetKey}
                  expression={scene.expression}
                  sequence={scene.expressionSequence}
                  className="dlg-expression"
                />
              : scene.portraitUrl
              ? <img src={scene.portraitUrl} alt="" />
              : scene.face
              ? <FacePortrait {...scene.face} size={62} className="dlg-face" />
              : <span className="dlg-monogram" aria-hidden="true">{scene.speakerName.replace(/^(Lorde|Lady|Protetor|Protetora|Rei|Rainha|Sir|Mestre|Irmã|Irmão)\s+/i, "")[0]}</span>}
          </div>}
          <div className="dlg-plate">
            <b>{scene.speakerName}</b>
            <span>
              {scene.speakerRole}
              {scene.speakerRole && scene.placeName && " · "}
              {scene.placeName}
            </span>
          </div>
          <button className="dlg-close" onClick={onClose} aria-label="Encerrar a conversa">×</button>
        </div>

        <p className="dlg-line">{scene.text}</p>

        <div className="dlg-options">
          {scene.options.map((o, i) => (
            <button
              key={o.id}
              className="dlg-option"
              disabled={o.disabled}
              onClick={o.onPick}
            >
              <span className="dlg-number" aria-hidden="true">{i + 1}</span>
              <span className="dlg-text">
                {o.label}
                {o.hint && <em>{o.hint}</em>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
