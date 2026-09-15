import { useState } from "react";
import { EstatePanel } from "./EstatePanel";
import { estateOf, incomeOf } from "../../game/estates";
import { TIER_LABEL, type Fief } from "../../world/fiefs";
import { buyBlocker, buyFief, ownerOf, priceFor, useFiefOwners, BUY_RELATION } from "../../data/fiefOwners";
import { houseById } from "../../data/houses";
import { crestUrl } from "../../data/houseAssets";
import { characterById, CLASS_LABEL } from "../../data/characters";
import { FacePortrait } from "../../render/portraits/FacePortrait";
import { faceOf } from "../../render/portraits/characterFace";
import { relationLabel, relationWith } from "../../data/player";
import { regionById } from "../../world/valdoria";
import { useGame } from "../../game/store";
import { negotiateBlocker, negotiateChance, negotiateFief, offeredPrice } from "../../game/fiefNegotiation";
import { beginSiege, declareSiegeWar, siegeBlocker, siegeDistance, SIEGE_RANGE } from "../../game/siege";
import { belligerentOf } from "../../game/allegiance";
import { atWar } from "../../game/worldSim";
import { pactActive } from "../../game/diplomacy";
import { armyOrderBlocker, orderArmyToFief, orderedArmyAt } from "../../game/armyOrders";
import "../agent/agent.css";

/**
 * A FICHA DE UM SENHORIO.
 *
 * Quem é o dono, quem governa, quanto rende e quanto custa. É a tela da
 * transação: comprar terra é o primeiro jeito de um viajante sem nome deixar
 * de ser só um viajante.
 *
 * Senhorio NOBRE não está à venda, e o painel diz por quê — é a base do poder
 * de uma Casa, não se passa a um estranho por dinheiro.
 */
const BLOCK_TEXT: Record<string, string> = {
  not_for_sale: "Não está à venda. É terra nobre, e a Casa não se desfaz dela por moedas.",
  relation: `A Casa não ouviria a oferta. Seria preciso relação ${BUY_RELATION} ou melhor.`,
  gold: "Ouro insuficiente.",
};

export function FiefPanel({ fief, onClose, onTravelToSeat }: { fief: Fief; onClose: () => void; onTravelToSeat: () => void }) {
  useFiefOwners();
  const game = useGame();
  const [note, setNote] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);

  const owner = ownerOf(fief.id);
  const house = owner === "player" ? null : houseById.get(owner);
  const crest = house ? crestUrl(house.crestAssetKey) : undefined;
  const lord = characterById.get(fief.lordId);
  const region = regionById.get(fief.regionId);
  const blocker = buyBlocker(fief.id);
  const relation = house ? relationWith(house.id) : 0;
  const offerBlock = negotiateBlocker(game, fief.id);
  const siegeBlock=owner==='player'?null:siegeBlocker(game,fief);
  const me=belligerentOf(game);
  const war=owner!=='player'&&!!me&&atWar(game,me,owner);
  const canDeclare=owner!=='player'&&game.allegiance.kind==='independente'&&!war&&game.influence>=8&&!pactActive(game,owner);
  const far=owner!=='player'&&siegeDistance(game,fief)>SIEGE_RANGE;
  const armyBlock=owner!=="player"&&game.allegiance.kind==='jurado'&&war?armyOrderBlocker(game,fief):null;
  const orderedArmy=owner!=="player"?orderedArmyAt(game,fief.id):null;

  if (managing && owner === "player") {
    return (
      <aside className="agent-panel" style={{ borderLeftColor: "#e2c169" }}>
        <header className="agent-head">
          <div>
            <h2>{fief.name}</h2>
            <div className="agent-sub">{TIER_LABEL[fief.tier]} · lealdade {Math.round(estateOf(game, fief.id).loyalty)}</div>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className="agent-body">
          <EstatePanel fief={fief} onClose={() => setManaging(false)} />
        </div>
      </aside>
    );
  }

  return (
    <aside className="agent-panel" style={{ borderLeftColor: house?.color ?? "#e2c169" }}>
      <header className="agent-head">
        {lord ? (
          <FacePortrait {...faceOf(lord)} size={38} className="panel-face" />
        ) : (
          crest && <img className="legend-crest" src={crest} alt="" style={{ width: 26, height: 31 }} />
        )}
        <div>
          <h2>{fief.name}</h2>
          <div className="agent-sub">
            {TIER_LABEL[fief.tier]} · {region?.name}
          </div>
        </div>
        <button className="sheet-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </header>

      <div className="agent-body">
        <div className="pair">
          <span>Dono</span>
          <b>{owner === "player" ? "Você" : house?.name}</b>
        </div>
        {lord && (
          <div className="pair">
            <span>Governante</span>
            <b>
              {lord.name.split(" ").slice(0, 2).join(" ")} · {CLASS_LABEL[lord.primaryClass]}
            </b>
          </div>
        )}
        <div className="pair">
          <span>Sede</span>
          <b>{fief.seatName}</b>
        </div>
        <div className="pair">
          <span>População</span>
          <b>{fief.population.toLocaleString("pt-BR")}</b>
        </div>
        <div className="pair">
          <span>Renda</span>
          <b>{owner === "player" ? incomeOf(game, fief.id) : fief.income} moedas / dia</b>
        </div>
        <div className="pair">
          <span>Defesa</span>
          <b>{fief.defense}</b>
        </div>
        {house && (
          <div className="pair">
            <span>Relação com {house.shortName}</span>
            <b>{relationLabel(relation)}</b>
          </div>
        )}

        <div className="pair" style={{ marginTop: 8 }}>
          <span>Preço</span>
          <b>{owner === "player" ? "—" : `${priceFor(fief.id).toLocaleString("pt-BR")} moedas`}</b>
        </div>
        {owner !== "player" && (
          <div className="pair">
            <span>Sua bolsa</span>
            <b>{game.gold.toLocaleString("pt-BR")} moedas</b>
          </div>
        )}

        {note && <p className="realm-rumor">{note}</p>}
      </div>

      <div className="agent-actions fief-actions">
        {owner === "player" ? (
          <button className="btn" onClick={() => setManaging(true)}>
            Gerir
          </button>
        ) : (
          <button
            className="btn"
            disabled={blocker !== "none"}
            title={blocker === "none" ? undefined : BLOCK_TEXT[blocker]}
            onClick={() => {
              const result = buyFief(fief.id);
              setNote(result === "none" ? `${fief.name} agora é seu.` : BLOCK_TEXT[result]);
            }}
          >
            Comprar
          </button>
        )}
        <button className="btn" disabled={owner === "player" || !!offerBlock} title={offerBlock ?? undefined} onClick={() => {
          const result=negotiateFief(fief.id);
          if(result)setNote(result.success?`A Casa aceitou ${result.price} moedas. ${fief.name} agora é seu.`:`Oferta recusada (${result.chance}% de chance). −3 influência, −6 relação. Pode tentar em sete dias.`);
        }}>
          {owner === "player" ? "Negociação encerrada" : `Oferecer ${offeredPrice(fief.id).toLocaleString("pt-BR")} · ${negotiateChance(game, fief.id)}%`}
        </button>
        {owner!=="player"&&<button className="btn" disabled={!!siegeBlock} title={siegeBlock??undefined} onClick={()=>{if(beginSiege(fief.id))onClose();}}>
          Cercar sede
        </button>}
        {owner!=="player"&&game.allegiance.kind==='jurado'&&war&&<button className="btn" disabled={!!armyBlock} title={armyBlock??undefined} onClick={()=>{if(orderArmyToFief(fief.id))setNote('Hoste convocada. Ela precisa marchar até a sede para apoiar seu assalto.');}}>
          {orderedArmy?'Hoste a caminho':'Convocar hoste · −6 influência'}
        </button>}
        {far&&<button className="btn" onClick={onTravelToSeat}>Ir à sede</button>}
        {owner!=="player"&&game.allegiance.kind==='independente'&&!war&&<button className="btn danger" disabled={!canDeclare} title={pactActive(game,owner)?'Um tratado de não agressão ainda protege esta Casa.':game.influence<8?'Precisa de 8 influência.':undefined} onClick={()=>{if(declareSiegeWar(fief.id))setNote('Guerra declarada. Agora sua hoste pode cercar esta sede.');}}>
          Declarar guerra · −8 influência
        </button>}
        {owner!=="player"&&siegeBlock&&<span className="fief-siege-hint">{siegeBlock}</span>}
        {armyBlock&&<span className="fief-siege-hint">Hoste: {armyBlock}</span>}
        <button className="btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </aside>
  );
}
