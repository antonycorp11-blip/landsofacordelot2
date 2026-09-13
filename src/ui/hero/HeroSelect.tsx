import { useState } from "react";
import { heroes, ATTRIBUTE_LABEL, type HeroDefinition } from "../../data/heroes";
import { heroPortraitUrl } from "../../data/heroAssets";
import { CAREER_LABEL } from "../../game/careers";
import { startCampaign } from "../../game/store";
import "./hero.css";

/**
 * ESCOLHA DO PERSONAGEM.
 *
 * Aparece uma vez, no começo de uma campanha nova. A escolha define a ORIGEM —
 * atributos, habilidades já aprendidas, quem você era antes — e nada mais: as
 * quatro carreiras continuam abertas para qualquer um dos quatro.
 *
 * A tela é deitada e não rola: os quatro retratos ficam sempre visíveis lado a
 * lado, e o que se lê sobre cada um aparece na coluna ao lado, trocando com o
 * toque. Comparar quatro origens é o ponto da tela — ter que rolar para ver a
 * quarta destruiria isso.
 */
const ARCHETYPE_COLOR: Record<string, string> = {
  MILITARY: "#d1876e",
  TRADE: "#98b797",
  POLITICS: "#92b4d3",
  RELIGION: "#ddc37f",
};

function Portrait({ hero }: { hero: HeroDefinition }) {
  const url = heroPortraitUrl(hero.portraitAssetKey);
  if (!url) return <span className="hs-portrait-empty">{hero.name[0]}</span>;
  return (
    <span className="hs-figure">
      <img src={url} alt="" />
      {/* O nome vai na faixa de pergaminho que a própria arte reservou. */}
      <span className="hs-plate"><b>{hero.name}</b></span>
    </span>
  );
}

export function HeroSelect() {
  const [pickedId, setPicked] = useState<string | null>(null);
  const picked = heroes.find((h) => h.id === pickedId) ?? null;

  return (
    <div className="hero-select">
      <div className="hs-head">
        <span className="hs-kicker">Lands of Acordelot</span>
        <h1 className="hs-title">De quem será esta história?</h1>
      </div>

      <div className="hs-stage">
        <div className="hs-grid">
          {heroes.map((hero) => (
            <button
              key={hero.id}
              className="hs-card"
              aria-label={`Escolher ${hero.name}`}
              style={{ ["--arch" as string]: ARCHETYPE_COLOR[hero.archetype] }}
              aria-pressed={pickedId === hero.id}
              onClick={() => setPicked(hero.id)}
            >
              <Portrait hero={hero} />
              <span className="hs-role">
                {hero.age} anos · {CAREER_LABEL[hero.archetype]}
              </span>
            </button>
          ))}
        </div>

        <aside className="hs-detail" style={picked ? { ["--arch" as string]: ARCHETYPE_COLOR[picked.archetype] } : undefined}>
          {picked ? (
            <>
              <div className="hs-detail-head">
                <b>{picked.name}</b>
                <span>{CAREER_LABEL[picked.archetype]}</span>
              </div>
              <p className="hs-tag">{picked.tagline}</p>
              <div className="hs-strengths">
                {picked.strengths.map((s) => <span key={s}>{s}</span>)}
              </div>
              <div className="hs-attrs">
                {(Object.keys(picked.attributes) as (keyof typeof picked.attributes)[]).map((k) => (
                  <div className="hs-attr" key={k}>
                    <b>{picked.attributes[k]}</b>
                    <span>{ATTRIBUTE_LABEL[k]}</span>
                  </div>
                ))}
              </div>
              <button className="btn primary hs-go" onClick={() => startCampaign(picked.id)}>
                Começar como {picked.name.split(" ")[0]}
              </button>
            </>
          ) : (
            <p className="hs-empty">
              Quatro origens, um reino por descobrir.<br />
              Toque num retrato para conhecê-lo.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
