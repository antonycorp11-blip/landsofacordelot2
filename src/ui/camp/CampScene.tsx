import { useState } from "react";
import { FacePortrait } from "../../render/portraits/FacePortrait";
import { heroById } from "../../data/heroes";
import { troopTotal } from "../../data/troops";
import { useGame } from "../../game/store";
import { campBlocker, campCost, campCompanions, CAMP_HOURS, fireWasSeen, huntersNear, makeCamp, woundedTotal, type CampPlan } from "../../game/camp";
import { useTyped } from "../cinematic/useTyped";
import "../cinematic/cinematic.css";
import "./camp.css";

/**
 * O ACAMPAMENTO.
 *
 * Usa a moldura das cenas de propósito: este é um MOMENTO, não um painel. O
 * jogo para, o fogo é a única luz, e as três escolhas são as três coisas que
 * um grupo cansado pode fazer com uma noite.
 *
 * O que está em jogo é dito antes de escolher — horas, comida, feridos, e
 * quem está procurando você — porque a decisão só existe se o preço estiver
 * na mesa.
 */
const PLANS: { id: CampPlan; label: string; hint: string }[] = [
  { id: "fogueira", label: "Acender fogo e dormir.", hint: "A noite inteira. Os feridos melhoram, e o fogo se vê de longe." },
  { id: "frio", label: "Acampamento frio, sem fogo.", hint: "Ninguém descansa direito. Ninguém encontra você." },
  { id: "banquete", label: "Abrir as provisões boas.", hint: "Come-se de verdade, e amanhã eles marcham inteiros." },
];

export function CampScene({ onClose, onSkipHours }: { onClose: () => void; onSkipHours: (h: number) => void }) {
  const game = useGame();
  const [result, setResult] = useState<string[] | null>(null);

  const hero = heroById.get(game.heroId ?? "");
  const hurt = woundedTotal(game);
  const hunters = huntersNear(game);
  const blocker = campBlocker(game);
  const party = campCompanions();

  const lines = result ?? [
    "O grupo para onde dá para parar: um corte de terreno, uma pedra grande, o que houver.",
    hurt > 0
      ? `${troopTotal(game.troops)} de pé e ${hurt} que não deviam estar andando.`
      : `${troopTotal(game.troops)} de pé, e comida para ${Math.max(0, Math.floor(game.food))} dia(s).`,
    hunters.length
      ? `Alguém está procurando você esta noite: ${hunters.join(", ")}.`
      : "Ninguém atrás de você esta noite, até onde se sabe.",
  ];
  const typed = useTyped(lines, result ? "resultado" : "chegada");

  const pick = (plan: CampPlan) => {
    const done = makeCamp(plan);
    const seen = fireWasSeen(plan);
    onSkipHours(CAMP_HOURS);
    setResult([
      plan === "frio"
        ? "A noite passa devagar e ninguém dorme bem. De manhã o grupo está inteiro e mal-humorado."
        : "O fogo pega, alguém põe água para ferver, e pela primeira vez em dias o barulho é de gente e não de estrada.",
      ...done,
      ...(seen ? [seen] : []),
    ].filter(Boolean));
  };

  return (
    <div className="cine camp" onClick={() => { if (!typed.done) typed.skip(); }}>
      <div className="cine-frame">
        <div className="cine-stage">
          <div className="cine-bust">
            <span className="camp-fire" aria-hidden="true" />
            {hero && <FacePortrait seed={hero.id} age={0.3} accent="#c98a3c" size={320} className="cine-bust-art" />}
          </div>
          <div className="cine-name">
            <b>{hero?.name}</b>
            <em>{party.length ? `${party.length} com você` : "Sozinho"}</em>
          </div>
        </div>

        <div className="cine-side">
          <div className="cine-where">Acampamento · {CAMP_HOURS} horas</div>

          <div className="cine-thread">
            {typed.shown.map((line, i) => (
              <p key={i} className="seen" style={{ opacity: [1, 0.58, 0.34][typed.shown.length - 1 - i] ?? 0.2 }}>
                <span>{line.text}{!line.done && <i className="cine-caret" />}</span>
              </p>
            ))}
          </div>

          <div className={`cine-choices ${typed.done ? "ready" : "waiting"}`}>
            {result ? (
              <button className="cine-choice continue" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                <span className="cine-label">Levantar acampamento</span>
              </button>
            ) : (
              PLANS.map((plan, i) => {
                const cost = campCost(plan.id, game);
                return (
                  <button
                    key={plan.id}
                    className="cine-choice"
                    disabled={!!blocker}
                    tabIndex={typed.done ? 0 : -1}
                    onClick={(e) => { e.stopPropagation(); pick(plan.id); }}
                  >
                    <span className="cine-number">{i + 1}</span>
                    <span className="cine-label">
                      {plan.label}
                      <em>{blocker ?? plan.hint}</em>
                    </span>
                    <span className="cine-check">
                      {cost.heal > 0 && <b>+{cost.heal}</b>}
                      {cost.food > 0 && <span>−{cost.food} comida</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
      <button className="cine-escape" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Seguir viagem">×</button>
    </div>
  );
}
