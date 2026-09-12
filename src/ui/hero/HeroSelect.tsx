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
 * atributos, habilidades já aprendidas, onde a história começa — e nada mais:
 * as quatro carreiras continuam abertas para qualquer um dos quatro.
 *
 * Os três não escolhidos não somem. Continuam no mundo, cada um no seu canto,
 * e podem ser recrutados depois.
 */
const ARCHETYPE_COLOR: Record<string, string> = {
  MILITARY: "#9c3b2e",
  TRADE: "#3f7a4a",
  POLITICS: "#3d6ea8",
  RELIGION: "#c2a552",
};

function Portrait({ hero }: { hero: HeroDefinition }) {
  const url = heroPortraitUrl(hero.portraitAssetKey);
  if (url) return <img className="hs-portrait" src={url} alt={hero.name} />;
  // Sem arte ainda: a inicial na cor do arquétipo, e não um desenho inventado.
  return (
    <div className="hs-portrait">
      <div style={{ textAlign: "center", display: "grid", gap: 6 }}>
        <span className="hs-portrait-empty">{hero.name[0]}</span>
        <span className="hs-portrait-note">retrato a caminho</span>
      </div>
    </div>
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
        <p className="hs-sub">
          Nenhum dos quatro tem Casa, título ou exército. A escolha define onde a
          história começa — não onde ela termina. Os outros três continuam em
          Valdória, e você pode encontrá-los pelo caminho.
        </p>
      </div>

      <div className="hs-grid">
        {heroes.map((hero) => (
          <button
            key={hero.id}
            className="hs-card"
            style={{ ["--arch" as string]: ARCHETYPE_COLOR[hero.archetype] }}
            aria-pressed={pickedId === hero.id}
            onClick={() => setPicked(hero.id)}
          >
            <Portrait hero={hero} />
            <div>
              <div className="hs-name">{hero.name}</div>
              <div className="hs-role">
                {hero.age} anos · {CAREER_LABEL[hero.archetype]}
              </div>
            </div>
            <div className="hs-tag">{hero.tagline}</div>
            <div className="hs-strengths">
              {hero.strengths.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <div className="hs-attrs">
              {(Object.keys(hero.attributes) as (keyof typeof hero.attributes)[]).map((k) => (
                <div className="hs-attr" key={k}>
                  <b>{hero.attributes[k]}</b>
                  <span>{ATTRIBUTE_LABEL[k].slice(0, 4)}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="hs-confirm">
        {picked ? (
          <>
            <p>
              Você iniciará sua jornada como <b>{picked.name}</b>.
            </p>
            <div className="hs-actions">
              <button className="btn" onClick={() => setPicked(null)}>
                Voltar
              </button>
              <button className="btn primary" onClick={() => startCampaign(picked.id)}>
                Confirmar
              </button>
            </div>
          </>
        ) : (
          <p className="hs-sub">Escolha um dos quatro para continuar.</p>
        )}
      </div>
    </div>
  );
}
