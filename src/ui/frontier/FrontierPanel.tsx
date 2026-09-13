import { REALM_STATUS_LABEL, realmRelationLabel, type ForeignRealm } from "../../world/foreignRealms";
import "../agent/agent.css";

/**
 * O QUE SE SABE DE UM REINO VIZINHO.
 *
 * O jogador não pode ir lá — e não é uma parede invisível: a malha de estradas
 * termina no contorno de Valdória. Este painel existe para que o limite seja
 * conteúdo. Nome, fama, relação com a Coroa e o rumor que corre nas estalagens:
 * é a matéria-prima das missões de fronteira.
 */
export function FrontierPanel({ realm, onClose }: { realm: ForeignRealm; onClose: () => void }) {
  return (
    <aside className="agent-panel">
      <header className="agent-head">
        <div>
          <h2>{realm.name}</h2>
          <div className="agent-sub">{realm.epithet}</div>
        </div>
        <button className="sheet-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </header>

      <div className="agent-body">
        <div className="pair">
          <span>Situação</span>
          <b>{REALM_STATUS_LABEL[realm.status]}</b>
        </div>
        <div className="pair">
          <span>Relação com a Coroa</span>
          <b>
            {realmRelationLabel(realm.relation)} ({realm.relation > 0 ? "+" : ""}
            {realm.relation})
          </b>
        </div>
        <div className="pair">
          <span>Vê-se de</span>
          <b>{realm.throughRegion}</b>
        </div>

        <p className="agent-hint" style={{ marginTop: 10 }}>{realm.knownFor}</p>
        <p className="realm-rumor">“{realm.rumor}”</p>
      </div>

      <div className="agent-actions">
        <button className="btn" disabled title="A estrada termina no contorno do reino">
          Viajar para lá
        </button>
        <button className="btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </aside>
  );
}
