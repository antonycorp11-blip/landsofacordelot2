import { useState } from "react";
import { houseById, houses } from "../../data/houses";
import { crestUrl } from "../../data/houseAssets";
import { relationLabel } from "../../data/player";
import { troopTotal } from "../../data/troops";
import {
  BLOCK_TEXT, GRANT_STEPS, INDEPENDENCE_FIEFS, INDEPENDENCE_INFLUENCE, INDEPENDENCE_TROOPS,
  allegianceLabel, breakOath, declareIndependence, enemiesOf, independenceBlocker,
  nextGrantAt, playerFiefCount, swearBlocker, swearTo, vassalStipend,
} from "../../game/allegiance";
import { belligerentName } from "../../game/worldSim";
import { useGame } from "../../game/store";

/**
 * DE QUEM VOCÊ É.
 *
 * A pergunta que organiza a segunda metade da partida, e a tela onde ela é
 * respondida. As duas saídas estão lado a lado de propósito, com o que cada
 * uma exige escrito antes: jurar é carreira, declarar-se é aposta.
 *
 * Os requisitos aparecem mesmo quando não são cumpridos — um caminho que só
 * existe depois de você descobri-lo por acaso não organiza nada.
 */
export function CourtPanel() {
  const game = useGame();
  const a = game.allegiance;
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("Casa Arven");

  const fiefCount = playerFiefCount(game);
  const troops = troopTotal(game.troops);
  const indep = independenceBlocker(game);
  const enemies = enemiesOf(game);

  return (
    <div className="court">
      <div className="court-status">
        <span className="panel-title">Posição</span>
        <b>{allegianceLabel(a)}</b>
        {a.kind === "jurado" && (
          <span className="court-line">
            Soldo de {vassalStipend(a)} moedas/dia · serviço {a.service}
            {nextGrantAt(a) ? ` · próxima concessão em ${nextGrantAt(a)}` : " · sem mais concessões"}
          </span>
        )}
        {a.kind === "independente" && (
          <span className="court-line">Soberano desde o dia {a.since}. Ninguém lhe deve proteção.</span>
        )}
        {a.kind === "livre" && (
          <span className="court-line">Livre: ninguém lhe paga, e ninguém marcha contra a sua terra.</span>
        )}
        {enemies.length > 0 && (
          <span className="court-line war">
            Em guerra com {enemies.map((e) => belligerentName(game, e)).join(" · ")}
          </span>
        )}
      </div>

      {/* ------------------------------ jurar ----------------------------- */}
      {a.kind !== "independente" && (
        <div className="court-block">
          <span className="panel-title">{a.kind === "jurado" ? "Seu senhor" : "Jurar a uma Casa"}</span>
          {a.kind === "jurado" ? (
            <>
              <p className="court-note">
                As guerras da sua Casa são suas: os inimigos dela podem marchar sobre os seus senhorios, e a
                guarnição que você deixou lá é a única coisa entre a terra e um exército. Servir rende terra
                nos degraus de {GRANT_STEPS.join(", ")} de serviço.
              </p>
              <button className="btn danger court-wide" onClick={breakOath}>
                Romper o juramento · −45 de relação, −15 de influência
              </button>
            </>
          ) : (
            <>
              <p className="court-note">
                Um vassalo recebe soldo todo dia e terra por serviço prestado. Em troca herda as guerras do
                senhor — e a terra dele deixa de ser intocável.
              </p>
              <div className="court-houses">
                {houses.map((house) => {
                  const block = swearBlocker(game, house.id);
                  const relation = game.houseRelations[house.id] ?? 0;
                  const crest = crestUrl(house.crestAssetKey);
                  return (
                    <button
                      key={house.id}
                      className="court-house"
                      disabled={block !== "none"}
                      title={block === "none" ? undefined : BLOCK_TEXT[block]}
                      onClick={() => swearTo(house.id)}
                    >
                      {crest && <img src={crest} alt="" loading="lazy" />}
                      <span className="court-house-body">
                        <b>{house.shortName}</b>
                        <em>{relationLabel(relation)} · {relation}</em>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* -------------------------- independência ------------------------- */}
      {a.kind !== "independente" && (
        <div className="court-block">
          <span className="panel-title">Declarar-se soberano</span>
          <p className="court-note">
            Não dá nada: tira. Sem soldo, sem protetor, e qualquer Casa pode declarar guerra a você como declara
            a outra qualquer. É o caminho de quem quer o reino, não um lugar nele.
          </p>
          <div className="court-reqs">
            <Req ok={fiefCount >= INDEPENDENCE_FIEFS} label={`${fiefCount}/${INDEPENDENCE_FIEFS} senhorios`} />
            <Req ok={game.influence >= INDEPENDENCE_INFLUENCE} label={`${Math.round(game.influence)}/${INDEPENDENCE_INFLUENCE} influência`} />
            <Req ok={troops >= INDEPENDENCE_TROOPS} label={`${troops}/${INDEPENDENCE_TROOPS} homens`} />
          </div>
          {naming ? (
            <div className="court-name">
              <input value={name} maxLength={28} onChange={(e) => setName(e.target.value)} aria-label="Nome da sua Casa" />
              <button className="btn primary" onClick={() => declareIndependence(name)}>Declarar</button>
            </div>
          ) : (
            <button
              className="btn court-wide"
              disabled={indep !== "none"}
              title={indep === "none" ? undefined : BLOCK_TEXT[indep]}
              onClick={() => setNaming(true)}
            >
              {indep === "none" ? "Nomear a sua Casa" : BLOCK_TEXT[indep]}
            </button>
          )}
          {a.kind === "jurado" && indep === "none" && (
            <p className="court-note war">Fazer isto jurado é traição: guerra imediata com {houseById.get(a.houseId)?.shortName}.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Req({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`court-req ${ok ? "ok" : ""}`}>{ok ? "✓" : "·"} {label}</span>;
}
