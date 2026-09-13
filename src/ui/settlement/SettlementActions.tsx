import { memo } from "react";
import type { Holding } from "../../data/holdings";
import type { Character } from "../../data/characters";
import { ownsHolding } from "../../data/player";

/**
 * O que dá para fazer aqui.
 *
 * Quase tudo ainda não existe como sistema, e os botões correspondentes ficam
 * DESABILITADOS em vez de ausentes: é o mapa do que vem, e evita que o painel
 * mude de forma a cada sistema novo. As ações de administração só aparecem se
 * a estrutura for da Casa do jogador — hoje, nunca.
 */
type Action = { id: string; label: string; enabled: boolean; primary?: boolean };

/** Onde faz sentido levantar homens. Um templo não arma ninguém. */
const RECRUITS: string[] = ["castle", "city", "town", "village", "military", "market", "port", "mine", "estate"];

function actionsFor(holding: Holding, present: Character[]): Action[] {
  const list: Action[] = [];
  const leader = present[0];

  if (leader) {
    list.push({ id: "audience", label: `Pedir audiência a ${leader.name.split(" ")[1] ?? leader.name}`, enabled: false, primary: true });
  }

  if (holding.kind === "city" || holding.kind === "town" || holding.kind === "castle") {
    list.push({ id: "enter", label: "Entrar", enabled: false });
  }
  if (holding.kind === "market" || holding.kind === "city" || holding.kind === "port") {
    list.push({ id: "market", label: "Mercado", enabled: false });
  }
  if (RECRUITS.includes(holding.kind)) {
    list.push({ id: "recruit", label: "Recrutar", enabled: true });
  }
  if (holding.kind === "temple") {
    list.push({ id: "temple", label: "Templo", enabled: false });
  }
  if (holding.kind === "estate" || holding.kind === "village") {
    list.push({ id: "rest", label: "Descansar", enabled: false });
  }

  list.push({ id: "talk", label: "Conversar", enabled: false });
  list.push({ id: "info", label: "Informações", enabled: false });

  if (ownsHolding(holding.ownerHouseId)) {
    list.push({ id: "manage", label: "Gerir", enabled: false });
    list.push({ id: "laws", label: "Leis", enabled: false });
    list.push({ id: "taxes", label: "Impostos", enabled: false });
    list.push({ id: "garrison", label: "Guarnição", enabled: false });
  }

  return list;
}

export const SettlementActions = memo(function SettlementActions({
  holding,
  present,
  onAction,
  here,
}: {
  holding: Holding;
  present: Character[];
  onAction: (id: string) => void;
  here: boolean;
}) {
  const actions = actionsFor(holding, present);
  return (
    <div className="sp-actions">
      {actions.map((a) => (
        <button
          key={a.id}
          className={`sp-action ${a.primary ? "primary" : ""}`}
          disabled={!a.enabled || !here}
          title={!here ? "Chegue ao local para agir" : a.enabled ? undefined : "Ainda não disponível"}
          onClick={() => onAction(a.id)}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
});
