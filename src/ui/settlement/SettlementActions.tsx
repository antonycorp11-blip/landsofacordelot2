import { memo } from "react";
import type { Holding } from "../../data/holdings";
import { ownsHolding } from "../../data/player";

/**
 * O MENU DA LOCALIDADE.
 *
 * Uma lista vertical, cada linha uma coisa que se faz aqui — a forma de um
 * menu de cidade, não de uma barra de ferramentas. O que ainda não existe como
 * sistema fica DESABILITADO em vez de ausente: é o mapa do que vem, e o painel
 * não muda de forma a cada sistema novo.
 */
export type MenuItem = {
  id: string;
  label: string;
  /** Segunda linha: o que acontece, ou por que não dá. */
  hint?: string;
  enabled: boolean;
  primary?: boolean;
};

/** Onde faz sentido levantar homens. Um templo não arma ninguém. */
const RECRUITS: string[] = ["castle", "city", "town", "village", "military", "market", "port", "mine", "estate"];

export function menuFor(holding: Holding, opts: { here: boolean; speaker: string; canDeliver: boolean }): MenuItem[] {
  const { here, speaker, canDeliver } = opts;
  const list: MenuItem[] = [];

  if (!here) {
    list.push({ id: "travel", label: "Viajar até aqui", hint: "Seguir pela estrada até esta localidade", enabled: true, primary: true });
  }

  if (canDeliver) {
    list.push({ id: "deliver", label: "Entregar o encargo", hint: "Você chegou ao destino do contrato", enabled: here, primary: true });
  }

  list.push({
    id: "talk",
    label: speaker === "quem atende" ? "Falar com quem atende" : `Falar com ${speaker}`,
    hint: here ? "Trabalho, notícias e o que se passa por aqui" : "É preciso estar no local",
    enabled: here,
    primary: !canDeliver,
  });

  if (RECRUITS.includes(holding.kind)) {
    list.push({ id: "recruit", label: "Recrutar tropas", hint: here ? "Levantar homens com ouro" : "É preciso estar no local", enabled: here });
  }
  if (holding.kind === "market" || holding.kind === "city" || holding.kind === "port") {
    list.push({ id: "market", label: "Ir ao mercado", hint: "Comércio ainda não disponível", enabled: false });
  }
  if (holding.kind === "temple") {
    list.push({ id: "temple", label: "Entrar no templo", hint: "Ainda não disponível", enabled: false });
  }
  if (holding.kind === "estate" || holding.kind === "village") {
    list.push({ id: "rest", label: "Descansar", hint: "Ainda não disponível", enabled: false });
  }

  list.push({ id: "info", label: "Ver informações", hint: "População, prosperidade, guarnição", enabled: true });

  if (ownsHolding(holding.ownerHouseId)) {
    list.push({ id: "manage", label: "Administrar", hint: "Leis, impostos e guarnição — ainda não disponível", enabled: false });
  }

  return list;
}

export const SettlementMenu = memo(function SettlementMenu({
  items,
  onPick,
}: {
  items: MenuItem[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="sp-menu">
      {items.map((item) => (
        <button
          key={item.id}
          className={`sp-menu-item ${item.primary ? "primary" : ""}`}
          disabled={!item.enabled}
          onClick={() => onPick(item.id)}
        >
          <span className="sp-menu-label">{item.label}</span>
          {item.hint && <span className="sp-menu-hint">{item.hint}</span>}
        </button>
      ))}
    </div>
  );
});
