import { memo } from "react";
import type { Holding } from "../../data/holdings";
import { houseById } from "../../data/houses";
import { relationLabel, relationWith } from "../../data/player";

/**
 * Os números do lugar.
 *
 * Cada categoria mostra só o que faz sentido nela — uma mina não tem
 * guarnição, um templo não tem volume comercial. O que é escala de 0 a 100
 * ganha barra; contagem é número seco.
 */
const BAR_LABEL: Record<string, string> = {
  prosperity: "Prosperidade",
  security: "Segurança",
  loyalty: "Lealdade",
  defense: "Defesa",
  fortification: "Fortificação",
  food: "Alimento",
  trade: "Comércio",
  wealth: "Riqueza",
  output: "Produção",
  fishing: "Pesca",
  seaTraffic: "Tráfego marítimo",
  religiousInfluence: "Influência religiosa",
};

const COUNT_LABEL: Record<string, string> = {
  population: "População",
  garrison: "Guarnição",
  workers: "Trabalhadores",
  followers: "Seguidores",
};

/** Quais campos cada categoria mostra, em ordem. */
const FIELDS: Record<string, string[]> = {
  castle: ["defense", "fortification", "garrison", "food", "prosperity", "loyalty", "population"],
  city: ["population", "prosperity", "security", "trade", "loyalty"],
  town: ["population", "output", "prosperity", "security", "loyalty"],
  village: ["population", "output", "prosperity", "security", "loyalty"],
  market: ["trade", "wealth", "security", "prosperity"],
  mine: ["output", "workers", "security", "prosperity"],
  port: ["trade", "fishing", "seaTraffic", "security", "wealth"],
  temple: ["followers", "religiousInfluence", "loyalty", "security"],
  military: ["defense", "garrison", "security", "loyalty"],
  estate: ["output", "population", "prosperity", "security"],
  site: ["security", "prosperity"],
};

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="sp-stat">
      <div className="sp-stat-head">
        <span>{label}</span>
        <b>{Math.round(value)}</b>
      </div>
      <div className="sp-bar">
        <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export const SettlementStats = memo(function SettlementStats({ holding }: { holding: Holding }) {
  const fields = FIELDS[holding.kind] ?? FIELDS.site;
  const relation = relationWith(holding.controllerHouseId);
  const controller = houseById.get(holding.controllerHouseId);

  return (
    <div className="sp-stats">
      {fields.map((f) => {
        const value = holding[f as keyof Holding];
        if (typeof value !== "number") return null;
        if (BAR_LABEL[f]) return <Bar key={f} label={BAR_LABEL[f]} value={value} />;
        return (
          <div className="sp-count" key={f}>
            <span>{COUNT_LABEL[f] ?? f}</span>
            <b>{value.toLocaleString("pt-BR")}</b>
          </div>
        );
      })}

      {holding.ore && (
        <div className="sp-count">
          <span>Minério</span>
          <b>{holding.ore}</b>
        </div>
      )}
      {holding.faith && (
        <div className="sp-count">
          <span>Fé</span>
          <b>{holding.faith}</b>
        </div>
      )}
      {holding.goods?.length ? (
        <div className="sp-count">
          <span>Mercadorias</span>
          <b>{holding.goods.join(", ")}</b>
        </div>
      ) : null}

      {/*
        Dois números diferentes, e é importante que não se confundam:
        a INFLUÊNCIA é o seu peso NESTE lugar; a RELAÇÃO é o que a Casa pensa
        de você em todo o reino. Dá para ser bem-visto pela Casa e não valer
        nada num porto dela.
      */}
      <div className="sp-divider" />
      <Bar label="Minha influência local" value={holding.playerLocalInfluence} />
      <div className="sp-count">
        <span>Relação com {controller?.shortName}</span>
        <b className={relation < 0 ? "bad" : relation > 0 ? "good" : ""}>
          {relationLabel(relation)} ({relation > 0 ? "+" : ""}
          {relation})
        </b>
      </div>
    </div>
  );
});
