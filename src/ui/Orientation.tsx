import { useEffect, useState } from "react";
import "./orientation.css";

/**
 * O JOGO É DEITADO.
 *
 * Um mapa de campanha se lê na horizontal: é assim que cabem o terreno, o
 * painel do lugar e a barra de cima sem que nada precise rolar. Em pé, num
 * telefone, não cabe — e em vez de espremer tudo numa coluna, o jogo pede o
 * aparelho deitado.
 *
 * Só vale para tela pequena: num monitor alto e estreito não há o que virar.
 */
const QUERY = "(orientation: portrait) and (max-width: 820px)";

export function usePortraitPhone() {
  const [portrait, setPortrait] = useState(
    () => typeof matchMedia === "function" && matchMedia(QUERY).matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia(QUERY);
    const update = () => setPortrait(mq.matches);
    mq.addEventListener("change", update);
    update();
    return () => mq.removeEventListener("change", update);
  }, []);
  return portrait;
}

export function RotateNotice() {
  return (
    <div className="rotate">
      <svg viewBox="0 0 64 64" width="74" height="74" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="20" y="8" width="24" height="42" rx="3.5" />
          <path d="M28 44h8" />
          <path d="M12 54a26 26 0 0 0 40 0" strokeDasharray="3 4" />
          <path d="M50 46v8h-8" />
        </g>
      </svg>
      <b>Vire o aparelho</b>
      <span>Valdória se lê deitada — o mapa, a barra e o painel do lugar foram feitos para a tela na horizontal.</span>
    </div>
  );
}
