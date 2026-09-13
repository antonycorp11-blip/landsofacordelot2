import { canRecruitCompanion, interrogatePrisoners, prisonerIntelChance, recruitCompanion, COMPANION_RELATION } from "../../game/adventure";
import { ResourceIcon } from "../ResourceIcon";
import { useEffect, useRef, useState } from "react";
import { heroById, ATTRIBUTE_EFFECT, ATTRIBUTE_LABEL, type Attributes } from "../../data/heroes";
import { heroPortraitUrl } from "../../data/heroAssets";
import { FAMILY_LABEL, skillsByFamily, type SkillId } from "../../data/skills";
import { perksOfSkill } from "../../data/perks";
import { troopById, troops as troopTypes, troopTotal } from "../../data/troops";
import { CAREERS, CAREER_LABEL, rankName, rankProgress, passiveInfluencePerDay } from "../../game/careers";
import { cargoCapacity, dailyCost, maxTroops, morale, partySpeed, partyStrength, xpToNextLevel } from "../../game/progression";
import { derivedInput } from "../../game/experience";
import { spendAttributePoint, spendSkillPoint } from "../../game/experience";
import { setCompanionStatus, useGame, type CompanionState } from "../../game/store";
import { poiById } from "../../world/valdoria";
import { CourtPanel } from "../allegiance/CourtPanel";
import "./hero.css";

/**
 * A FICHA DO PERSONAGEM.
 *
 * Quatro abas, e nenhuma vazia: só existe aba onde já existe conteúdo de
 * verdade. Toda estatística derivada vem de `game/progression.ts` — a tela
 * lê, nunca calcula, porque no dia em que a fórmula do limite de tropas mudar
 * ela tem de mudar num lugar só.
 */
type Tab = "visao" | "habilidades" | "companheiros" | "grupo" | "corte";

const TAB_LABEL: Record<Tab, string> = {
  visao: "Visão geral",
  habilidades: "Habilidades",
  companheiros: "Companheiros",
  grupo: "Grupo",
  corte: "Corte",
};

const STATUS_LABEL: Record<CompanionState["status"], string> = {
  IN_PARTY: "No grupo",
  AVAILABLE: "Disponível",
  TRAVELING: "Viajando",
  CAPTURED: "Capturado",
  WOUNDED: "Ferido",
};

/** Relação mínima para alguém aceitar seguir você. */
export const RECRUIT_RELATION = COMPANION_RELATION;

function Meter({ label, value, max, tone }: { label: string; value: number; max: number; tone?: "xp" }) {
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <b>
          {Math.round(value)}
          {max === Infinity ? "" : ` / ${Math.round(max)}`}
        </b>
      </div>
      <div className={`meter-bar ${tone ?? ""}`}>
        <i style={{ width: `${max === Infinity ? 100 : Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
      </div>
    </div>
  );
}

export function CharacterScreen({ onClose }: { onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(sheetRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === sheetRef.current)) {event.preventDefault();last.focus();}
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === sheetRef.current)) {event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown', keys);
    return () => { document.removeEventListener('keydown', keys); if (previous?.isConnected) previous.focus({preventScroll:true}); };
  }, []);

  const game = useGame();
  const [tab, setTab] = useState<Tab>("visao");
  const hero = game.heroId ? heroById.get(game.heroId) : null;
  if (!hero) return null;

  const input = derivedInput(game);
  const limit = maxTroops(input);
  const total = troopTotal(game.troops);
  const woundedTotal=troopTotal(game.wounded);
  const prisonerTotal=troopTotal(game.prisoners);
  const prisonerIntelUsed=game.lastPrisonerIntelDay===Math.floor((game.journey?.hours??0)/24)+1;
  const speed = partySpeed(input);
  const speedWord = speed >= 1.0 ? "Ótima" : speed >= 0.85 ? "Boa" : speed >= 0.7 ? "Moderada" : "Lenta";
  const portrait = heroPortraitUrl(hero.portraitAssetKey);
  const companions = Object.values(game.companions);

  return (
    <div className="sheet-backdrop"><div className="sheet" ref={sheetRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Ficha de ${hero.name}`}>
      <header className="sheet-heading">
        <div><span className="hs-kicker">Crônica do viajante</span><h1>{hero.name}</h1><p>Nível {game.level} · {CAREER_LABEL[hero.archetype]} · Valdória</p></div>
        <button className="sheet-close" onClick={onClose} aria-label="Fechar a ficha">×</button>
      </header>
      <div className="sheet-bar">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button key={t} className="sheet-tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="sheet-body">
        {tab === "visao" && (
          <div className="sheet-inner cols">
            {/* ------------------------- identidade ------------------------- */}
            <div className="panel">
              <div className={`id-portrait ${portrait ? "" : "empty"}`}>
                {portrait ? (
                  <>
                    <img src={portrait} alt={hero.name} />
                    <span className="hs-plate">
                      <b>{hero.name}</b>
                    </span>
                  </>
                ) : (
                  <span className="hs-portrait-note">retrato a caminho</span>
                )}
              </div>
              <div>
                {!portrait && <div className="id-name">{hero.name}</div>}
                <div className="id-line">
                  Nível <b>{game.level}</b> · {hero.age} anos
                </div>
                <div className="id-line">Origem: <b>{CAREER_LABEL[hero.archetype]}</b></div>
                <div className="id-line">Título: <b>Nenhum</b></div>
                <div className="id-line">Casa: <b>Nenhuma</b></div>
              </div>
            </div>

            {/* --------------------------- números --------------------------- */}
            <div className="sheet-core">
              <div className="panel">
                <Meter label="Experiência" value={game.xp} max={xpToNextLevel(game.level)} tone="xp" />
                <div className="pair">
                  <span className="resource-label"><ResourceIcon name="influence"/>Influência</span>
                  <b className="big">{game.influence.toFixed(1)}</b>
                </div>
                <div className="pair">
                  <span className="resource-label"><ResourceIcon name="gold"/>Ouro</span>
                  <b className="big">{game.gold}</b>
                </div>
                <div className="pair">
                  <span>Influência passiva</span>
                  <b>{passiveInfluencePerDay(game.careerXp).toFixed(1)} / dia</b>
                </div>
              </div>

              <div className="panel">
                <div className="panel-title">
                  Atributos
                  {game.attributePoints > 0 && ` · ${game.attributePoints} ponto${game.attributePoints > 1 ? "s" : ""} a distribuir`}
                </div>
                {(Object.keys(ATTRIBUTE_LABEL) as (keyof Attributes)[]).map((k) => (
                  <div className="attr-row" key={k}>
                    <span className="attr-val">{game.attributes[k]}</span>
                    <span className="attr-body">
                      <span className="attr-name">{ATTRIBUTE_LABEL[k]}</span>
                      <span className="attr-eff">{ATTRIBUTE_EFFECT[k]}</span>
                    </span>
                    <button
                      className="attr-plus"
                      disabled={game.attributePoints <= 0 || game.attributes[k] >= 10}
                      onClick={() => spendAttributePoint(k)}
                      aria-label={`Aumentar ${ATTRIBUTE_LABEL[k]}`}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* -------------------------- carreiras -------------------------- */}
            <div className="panel">
              <div className="panel-title">Carreiras</div>
              {CAREERS.map((c) => {
                const xp = game.careerXp[c];
                const p = rankProgress(xp);
                return (
                  <div className="career" key={c}>
                    <div className="career-head">
                      <span className="career-name">{CAREER_LABEL[c]}</span>
                      <span className="career-rank">{rankName(c, xp)}</span>
                    </div>
                    <div className="meter-bar">
                      <i style={{ width: `${Math.round(p.ratio * 100)}%` }} />
                    </div>
                    <div className="meter-head">
                      <span />
                      <b>{p.needed === p.current ? "máximo" : `${p.current} / ${p.needed}`}</b>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "habilidades" && (
          <div className="sheet-inner">
            {game.skillPoints > 0 && (
              <div className="panel">
                <div className="panel-title">
                  {game.skillPoints} ponto{game.skillPoints > 1 ? "s" : ""} de habilidade · cada um vale +5
                </div>
              </div>
            )}
            <div className="skill-groups">
              {CAREERS.map((family) => (
                <div className="panel" key={family}>
                  <div className="panel-title">{FAMILY_LABEL[family]}</div>
                  {skillsByFamily(family).map((skill) => {
                    const value = game.skills[skill.id as SkillId] ?? 0;
                    return (
                      <div className="skill" key={skill.id}>
                        <div className="skill-head">
                          <span className="skill-name">{skill.name}</span>
                          <span className="skill-val">{value} / 100</span>
                          <button
                            className="skill-up"
                            disabled={game.skillPoints <= 0 || value >= 100}
                            onClick={() => spendSkillPoint(skill.id)}
                            aria-label={`Treinar ${skill.name}`}
                          >
                            +
                          </button>
                        </div>
                        <div className="meter-bar">
                          <i style={{ width: `${value}%` }} />
                        </div>
                        <span className="skill-eff">{skill.effect}</span>
                        {perksOfSkill(skill.id).length > 0 && (
                          <div className="skill-perks">
                            {perksOfSkill(skill.id).map((perk) => (
                              <span className={`perk ${value >= perk.at ? "on" : ""}`} key={perk.id} title={perk.effect}>
                                {perk.at} · {perk.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "companheiros" && (
          <div className="sheet-inner companions-view">
            <div className="panel">
              <div className="panel-title">Companheiros</div>
              {companions.length === 0 && <span className="empty">Ninguém ainda.</span>}
              {companions.map((c) => {
                const def = heroById.get(c.id);
                const at = poiById.get(c.locationPoiId);
                const canRecruit = canRecruitCompanion(c.id,game);
                return (
                  <div className="comp" key={c.id}>
                    <div className="comp-portrait">
                      {heroPortraitUrl(def?.portraitAssetKey) ? (
                        <img src={heroPortraitUrl(def?.portraitAssetKey)} alt={def?.name} loading="lazy" />
                      ) : (
                        def?.name[0]
                      )}
                    </div>
                    <div className="comp-body">
                      <span className="comp-name">{def?.name}</span>
                      <span className="comp-line">
                        Nível {c.level} · {def ? CAREER_LABEL[def.archetype] : ""}
                      </span>
                      <span className="comp-line">
                        {at?.name ?? "paradeiro incerto"} · relação {c.relation > 0 ? "+" : ""}
                        {c.relation}
                      </span>
                      <span className="comp-state">{STATUS_LABEL[c.status]}</span>
                    </div>
                    <div className="comp-actions">
                      {c.status === "IN_PARTY" ? (
                        <button className="btn" disabled={!!game.journey?.destinationId} title="Dispense em uma localidade" onClick={() => setCompanionStatus(c.id, "AVAILABLE")}>
                          Dispensar
                        </button>
                      ) : (
                        <button
                          className="btn"
                          disabled={!canRecruit}
                          title={canRecruit ? undefined : `Precisa de relação ${RECRUIT_RELATION} e de sua presença no local`}
                          onClick={() => recruitCompanion(c.id)}
                        >
                          Recrutar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="empty">
              Encontre estes viajantes em Valdória e conquiste sua confiança. Cada companheiro traz suas próprias habilidades para o grupo.
            </p>
          </div>
        )}

        {tab === "corte" && (
          <div className="sheet-inner">
            <div className="panel"><CourtPanel /></div>
          </div>
        )}

        {tab === "grupo" && (
          <div className="sheet-inner party-view">
            <div className="panel">
              <div className="panel-title">Grupo</div>
              <Meter label="Tropas" value={total} max={limit} />
              <Meter label="Moral" value={morale(input)} max={100} />
              <div className="pair">
                <span>Velocidade</span>
                <b>{speedWord} ({Math.round(speed * 100)}%)</b>
              </div>
              <div className="pair">
                <span>Custo diário</span>
                <b>{dailyCost(input)} moedas</b>
              </div>
              <div className="pair">
                <span>Capacidade de carga</span>
                <b>{cargoCapacity(input)}</b>
              </div>
              <div className="pair">
                <span>Força estimada</span>
                <b>{Math.round(partyStrength(input))}</b>
              </div>
            </div>

            {(woundedTotal>0||prisonerTotal>0)&&<div className="panel">
              <div className="panel-title">Depois da batalha</div>
              {woundedTotal>0&&<><div className="pair"><span>Feridos em recuperação</span><b>{woundedTotal}</b></div><span className="empty">Uma parte volta à linha a cada dia em que o grupo consegue comer.</span></>}
              {prisonerTotal>0&&<><div className="pair"><span>Prisioneiros</span><b>{prisonerTotal}</b></div><span className="empty">Mercados pagam resgate. Uma vez por dia, cativos podem revelar um bando real no mapa.</span><button className="btn" disabled={prisonerIntelUsed} onClick={interrogatePrisoners}>{prisonerIntelUsed?"Interrogatório usado hoje":`Pedir informação · ${Math.round(prisonerIntelChance(game)*100)}%`}</button></>}
            </div>}

            <div className="panel">
              <div className="panel-title">Contingente</div>
              {total === 0 && <span className="empty">Você viaja sozinho. Recrute numa cidade ou castelo.</span>}
              {troopTypes.map((t) => {
                const n = game.troops[t.id] ?? 0;
                if (!n) return null;
                return (
                  <div className="troop-row" key={t.id}>
                    <span className="troop-n">{n}</span>
                    <span>{n === 1 ? t.singular : t.name}</span>
                    <span className="troop-str">força {(n * t.strength).toFixed(1)}</span>
                  </div>
                );
              })}
            </div>

            <div className="panel">
              <div className="panel-title">Companheiros no grupo</div>
              {companions.filter((c) => c.status === "IN_PARTY").length === 0 ? (
                <span className="empty">Nenhum.</span>
              ) : (
                companions
                  .filter((c) => c.status === "IN_PARTY")
                  .map((c) => (
                    <div className="troop-row" key={c.id}>
                      <span className="troop-n">1</span>
                      <span>{heroById.get(c.id)?.name}</span>
                      <span className="troop-str">nível {c.level}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>
    </div></div>
  );
}

export { troopById };
