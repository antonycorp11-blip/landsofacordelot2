import { troopTotal } from '../../data/troops';
import { useGame } from '../../game/store';
import { assaultSiege, buildRam, demandSurrender, garrisonOf, liftSiege, surrenderChance, wallProtection } from '../../game/siege';
import { fiefById } from '../../world/fiefs';
import { ownerOf } from '../../data/fiefOwners';
import { belligerentOf } from '../../game/allegiance';
import { atWar } from '../../game/worldSim';
import castleArt from '../../assets/map/castle_medium.png?url';
import { houseById } from '../../data/houses';
import { orderedArmyAt } from '../../game/armyOrders';
import './siege.css';

/** O ataque começa como uma decisão de comandante, diante da sede no mapa. */
export function SiegeCouncil(){
  const game=useGame(),siege=game.adventure.siege;
  if(!siege||game.adventure.battle)return null;
  const fief=fiefById.get(siege.fiefId);
  if(!fief)return null;
  const garrison=troopTotal(garrisonOf(fief,siege.defender));
  const elite=(houseById.get(siege.defender)?.militaryPower??0)>=80;
  const chance=Math.round(surrenderChance(game,siege)*100);
  const wall=Math.round(wallProtection(fief,siege.ramBuilt)*100);
  const wood=game.inventory.wood??0,tools=game.inventory.tools??0;
  const canRam=!siege.ramBuilt&&wood>=2&&tools>=1&&game.food>=1;
  const ramCost=siege.ramBuilt?`Muralha reduzida a ${wall}%`:canRam?'−2 madeira · −1 ferramentas · −1 comida':`Precisa 2 madeira, 1 caixa de ferramentas e 1 comida (tem ${wood}/${tools}/${game.food})`;
  const me=belligerentOf(game);
  const activeWar=!!me&&atWar(game,me,siege.defender)&&ownerOf(fief.id)===siege.defender;
  const army=orderedArmyAt(game,fief.id);
  return <div className="siege-backdrop"><section className="siege-council" role="dialog" aria-modal="true" aria-label={`Cerco de ${fief.seatName}`}>
    <header className="siege-head"><div><small>Conselho de guerra · {fief.name}</small><h2>{fief.seatName}</h2></div><button onClick={liftSiege} aria-label="Levantar cerco">×</button></header>
    <div className="siege-scene">
      <div className="siege-wall" aria-hidden="true"><img src={castleArt} alt=""/><em/></div>
      <div><p>{activeWar?<>A guarnição fechou os portões. Seus homens gastaram <b>3 comida</b> para cercar a sede.{army?army.ready?' A hoste convocada chegou e pode atrair defensores para fora das muralhas.':' A hoste convocada ainda marcha; atacar agora dispensa seu apoio.':''}</>:<>A guerra terminou ou a sede mudou de dono. Levante o cerco e reorganize a hoste.</>}</p>
        <div className="siege-figures"><span><b>{troopTotal(game.troops)}</b> seus soldados</span><span><b>{garrison}</b> defensores{elite?' de elite':''}</span><span><b>{wall}%</b> proteção</span><span><b>{game.food}</b> comida</span>{army&&<span><b>{army.ready?'Pronta':'Marchando'}</b> hoste aliada</span>}</div>
      </div>
    </div>
    <div className="siege-decisions">
      <button disabled={!activeWar||!canRam} onClick={buildRam}><b>{siege.ramBuilt?'Aríete pronto':'Erguer aríete'}</b><span>{ramCost}</span></button>
      <button disabled={!activeWar||siege.demandAttempted} onClick={demandSurrender}><b>{siege.demandAttempted?'Rendição recusada':'Exigir rendição'}</b><span>{siege.demandAttempted?'Resta assaltar ou partir':`${chance}% · Diplomacia e Persuasão · falha: −1 influência`}</span></button>
      <button disabled={!activeWar||game.food<2} onClick={assaultSiege}><b>Ordenar assalto</b><span>{game.food<2?'Precisa de 2 comida para atacar.':'−2 comida · ordens na arena · vitória toma o feudo'}</span></button>
      <button onClick={liftSiege}><b>Levantar cerco</b><span>Recuar sem batalha · os suprimentos gastos não voltam</span></button>
    </div>
  </section></div>;
}
