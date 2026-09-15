import { useMemo } from "react";
import { useGame } from "../../game/store";
import { formatDuration } from "../../world/time";
import { routeEdgeById } from "../../world/navgraph";
import { pathBetween, type RoadStop } from "../../world/roadStops";
import { terrainPath } from "../../world/navigation/routePlanner";
import type { Point } from "../../world/types";
import type { TravelRouteMode } from "../../travel/useTravel";
import "./routeChoice.css";

type Props = {
  destination: RoadStop;
  name: string;
  from: Point;
  roadStop: RoadStop;
  onChoose: (mode: TravelRouteMode) => void;
  onClose: () => void;
};

/** A route decision uses the real planners. Its estimates are never fabricated. */
export function RouteChoice({destination,name,from,roadStop,onChoose,onClose}:Props) {
  const game=useGame();
  const {road,concealed,danger}=useMemo(()=>{
    const byRoad=roadStop.kind==='free'?null:pathBetween(roadStop,destination);
    const road=byRoad??terrainPath(from,destination,"prefer_roads");
    const concealed=terrainPath(from,destination,"avoid_roads");
    const danger=byRoad?.edgeIds.reduce((peak,id)=>Math.max(peak,routeEdgeById.get(id)?.danger??0),0)??0;
    return {road,concealed,danger};
  },[destination.x,destination.y,destination.kind,destination.kind==='node'?destination.id:null,from.x,from.y,roadStop.x,roadStop.y,roadStop.kind,roadStop.kind==='node'?roadStop.id:roadStop.kind==='road'?roadStop.edgeId:null]);
  const followed=Object.values(game.worldForces).some(f=>f.playerPursuit==='tracking'||f.playerPursuit==='searching');
  const extra=road&&concealed?Math.max(0,concealed.travelHours-road.travelHours):0;

  return <div className="route-backdrop" role="presentation" onClick={onClose}>
    <div className="route-scene" role="dialog" aria-modal="true" aria-labelledby="route-title" onClick={e=>e.stopPropagation()}>
      <header>
        <span>Decisão de viagem · {name}</span>
        <button onClick={onClose} aria-label="Fechar a escolha de rota">×</button>
      </header>
      <div className="route-intro">
        <b id="route-title">Por onde você vai?</b>
        <p>{followed
          ? "Há gente procurando você. A estrada é mais rápida e denuncia sua passagem; a mata cobra tempo e provisões, mas encurta a vista de quem persegue."
          : "Toda viagem deixa sinais. Escolha entre chegar mais depressa ou desaparecer do caminho de quem observa a estrada."}</p>
      </div>
      <div className="route-options">
        <button className="route-option road" disabled={!road} onClick={()=>onChoose('road')}>
          <span className="route-emblem" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M8 27c5-5 4-12 12-20M18 7l7 1-3 6M11 15h8M9 23h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          <span className="route-copy"><strong>Pela estrada</strong><small>Marcos, gente e encontros no caminho</small></span>
          <span className="route-time">{road?formatDuration(road.travelHours):"Sem caminho"}</span>
          <em>{danger>0.2?"Trecho perigoso · visível":"Mais rápida · deixa rastro"}</em>
        </button>
        <button className="route-option concealed" disabled={!concealed} onClick={()=>onChoose('concealed')}>
          <span className="route-emblem" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M7 24 16 5l9 19H7ZM16 16v13M13 21l3 3 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          <span className="route-copy"><strong>Pelo mato</strong><small>Evite a estrada e procure cobertura</small></span>
          <span className="route-time">{concealed?formatDuration(concealed.travelHours):"Sem passagem"}</span>
          <em>{extra>0?`Cerca de ${formatDuration(extra)} a mais · menos rastros`:"Menos rastros · terreno difícil"}</em>
        </button>
      </div>
      <footer>O relógio, o soldo e a comida seguem correndo em qualquer caminho.</footer>
    </div>
  </div>;
}
