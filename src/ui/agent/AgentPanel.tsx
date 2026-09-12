import { troopById, troops as troopTypes, troopTotal } from "../../data/troops";
import { readForce, strengthWord } from "../../game/estimate";
import { partyOf, type Wanderer } from "../../world/wanderers";
import { useGame } from "../../game/store";
import "./agent.css";

/**
 * O QUE SE SABE DE UM GRUPO NO MAPA.
 *
 * Clicar num agente não mostra a ficha dele: mostra o que VOCÊ consegue ler
 * dali. Com Tática baixa, "um grupo considerável"; com Tática alta, o número e
 * um veredito. É a diferença entre olhar e saber.
 *
 * Nada aqui resolve combate — as ações existem desabilitadas para marcar onde
 * ele vai entrar.
 */
const RISK_LABEL: Record<string, string> = {
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
  temerário: "Temerário",
};

const ROUTINE_KIND: Record<string, string> = {
  patrulha: "Patrulha",
  comércio: "Caravana",
  correio: "Mensageiro",
  peregrinação: "Peregrinos",
  pilhagem: "Bando armado",
  cortejo: "Cortejo",
};

export function AgentPanel({ wanderer, onClose }: { wanderer: Wanderer; onClose: () => void }) {
  useGame(); // a leitura depende das SUAS tropas e da sua Tática
  const troops = partyOf(wanderer);
  const reading = readForce(troops);
  const hostile = wanderer.routine === "pilhagem";

  return (
    <aside className={`agent-panel ${hostile ? "hostile" : ""}`}>
      <header className="agent-head">
        <div>
          <h2>{wanderer.name}</h2>
          <div className="agent-sub">{ROUTINE_KIND[wanderer.routine] ?? wanderer.routine}</div>
        </div>
        <button className="sheet-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </header>

      <div className="agent-body">
        <div className="pair">
          <span>Homens</span>
          <b>{reading.label}</b>
        </div>
        <div className="pair">
          <span>Força estimada</span>
          <b>{reading.confidence === "vago" ? "Incerta" : strengthWord(troops)}</b>
        </div>
        <div className="pair">
          <span>Comparação</span>
          <b>{reading.verdict}</b>
        </div>
        <div className="pair">
          <span>Risco</span>
          <b className={`risk ${reading.risk}`}>{RISK_LABEL[reading.risk]}</b>
        </div>

        {reading.confidence === "preciso" && (
          <div className="agent-breakdown">
            {troopTypes.map((t) => {
              const n = troops[t.id] ?? 0;
              if (!n) return null;
              return (
                <div className="troop-row" key={t.id}>
                  <span className="troop-n">{n}</span>
                  <span>{n === 1 ? t.singular : t.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {reading.confidence !== "preciso" && (
          <p className="agent-hint">
            Tática mais alta revela o número exato e a composição. Você conta {troopTotal(troops) >= 0 ? "" : ""}
            com o que consegue ver daqui.
          </p>
        )}
      </div>

      <div className="agent-actions">
        <button className="btn" disabled title="Ainda não disponível">Abordar</button>
        <button className="btn" disabled title="Ainda não disponível">Atacar</button>
        <button className="btn" onClick={onClose}>Evitar</button>
      </div>
    </aside>
  );
}

export { troopById };
