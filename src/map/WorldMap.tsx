import { SceneryCanvas } from "../render/SceneryCanvas";
import { AtmosphereOverlay } from "../render/layers/AtmosphereLayer";
import { onTilesetsReady } from "../render/tilesets";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BordersLayer } from "../render/layers/BordersLayer";
import { DebugLayer } from "../render/layers/DebugLayer";
import { LandcoverLayer, LANDCOVER_MIN_ZOOM } from "../render/layers/LandcoverLayer";
import { NatureLayer } from "../render/layers/NatureLayer";
import { PoiLayer } from "../render/layers/PoiLayer";
import { ReliefLayer } from "../render/layers/ReliefLayer";
import { RiversLayer } from "../render/layers/RiversLayer";
import { RoadsLayer } from "../render/layers/RoadsLayer";
import { RouteHighlight, TravelerMarker } from "../render/layers/TravelLayer";
import { TerrainLayer } from "../render/layers/TerrainLayer";
import { TerrainTiles } from "../render/TerrainTiles";
import { anyTilesetLoaded, TILES_FADE, TILES_MIN_ZOOM } from "../render/tilesets";
import { centroid } from "../world/geo";
import { formatDuration } from "../world/time";
import { WORLD, WORLD_SCALE as S } from "../world/layout";
import { LOD_SCALE, lod } from "../world/scale";
import { bounds } from "../world/geo";
import type { Point, PointOfInterest, RegionId, TravelEvents } from "../world/types";
import { borderCrossingById } from "../world/borderCrossings";
import { poiById, regionById, regions, valdoria } from "../world/valdoria";
import { useTravel } from "../travel/useTravel";
import { useWanderers, type WandererRuntime } from "../travel/useWanderers";
import { WanderersLayer } from "../render/layers/WanderersLayer";
import { PoliticalLayer } from "../render/layers/PoliticalLayer";
import { SettlementPanel } from "../ui/settlement/SettlementPanel";
import { CharacterScreen } from "../ui/hero/CharacterScreen";
import { AgentPanel } from "../ui/agent/AgentPanel";
import { update, useGame } from "../game/store";
import { checkOffer, checkOfferArrival, checkRoadEvent, checkStory, recordJourney, startWorldForceBattle, tutorialFlag } from "../game/adventure";
import { AdventurePanel, type AdventureView } from "../ui/adventure/AdventurePanel";
import { Coach } from "../ui/coach/Coach";
import { StoryScene } from "../ui/story/StoryScene";
import { OfferCard } from "../ui/offer/OfferCard";
import { restoreJourney } from "../travel/journey";
import { heroById } from "../data/heroes";
import { troopTotal } from "../data/troops";
import { FrontierLayer } from "../render/layers/FrontierLayer";
import { FrontierPanel } from "../ui/frontier/FrontierPanel";
import { PoliticalLegend } from "../ui/PoliticalLegend";
import type { ForeignRealm } from "../world/foreignRealms";
import { FiefLayer } from "../render/layers/FiefLayer";
import { FiefPanel } from "../ui/fief/FiefPanel";
import type { Fief } from "../world/fiefs";
import { nearestRoadStop, nodeStop, type RoadStop } from "../world/roadStops";
import { routeEdgeById } from "../world/navgraph";
import { routeNodeById } from "../world/valdoria";
import { useCamera } from "./useCamera";
import { Hud } from "../ui/Hud";
import type { JournalKind } from "../ui/journal";

/** Onde a campanha começa, quando o herói escolhido não disser outra coisa. */
const FALLBACK_START = "castelo_real";

/** Rótulos das regiões — some quando o jogador se aproxima do terreno. */
/** Enquadramento inicial: a massa territorial, não o viewBox inteiro. */
const KINGDOM_BOUNDS = bounds(valdoria.outline);

/** Até onde um toque é atraído para a estrada. Fora disso, não se anda. */
const ROAD_REACH = 320 * S;

const REGION_LABELS = regions.map((r) => ({ id: r.id, name: r.name, at: centroid(r.polygon) }));

export function WorldMap() {
  const game = useGame();
  const startNode = (game.heroId && heroById.get(game.heroId)?.startPoiId) || FALLBACK_START;

  const [debug, setDebug] = useState(false);
  const [tilesReady, setTilesReady] = useState(anyTilesetLoaded());
  useEffect(() => onTilesetsReady(() => setTilesReady(true)), []);
  const [follow, setFollow] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<RegionId | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<RegionId | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  /** POI cujo painel político está aberto. `null` = só o mapa na tela. */
  const [panelPoiId, setPanelPoiId] = useState<string | null>(null);
  /** Ficha do personagem e leitura de um grupo no mapa — ambas contextuais. */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [readAgentId, setReadAgentId] = useState<string | null>(null);
  const [realm, setRealm] = useState<ForeignRealm | null>(null);
  const [fief, setFief] = useState<Fief | null>(null);
  /**
   * VISTA POLÍTICA — duas leituras do mesmo tabuleiro.
   *
   * `houses` pinta as REGIÕES pela Casa que as controla: é o mapa da guerra,
   * quem manda em que pedaço do reino. `fiefs` pinta os SENHORIOS pelo dono:
   * é o mapa da posse, onde se compra, se negocia e se vê a terra de quem.
   * São perguntas diferentes, e por isso são duas vistas e não uma.
   */
  const [politicalView, setPoliticalView] = useState<"off" | "houses" | "fiefs">("off");
  const political = politicalView !== "off";
  const [adventureView, setAdventureView] = useState<AdventureView | null>(null);
  const [queuedDestination, setQueuedDestination] = useState<RoadStop | null>(null);
  const [initialPosition] = useState(() => restoreJourney(startNode).position);
  const adventureBlocked = !!adventureView || sheetOpen || !!game.adventure.event || !!game.adventure.notice || !!game.adventure.raid || !!game.adventure.battle || !!game.adventure.quest?.pending || !!game.adventure.story.pending;

  const followRef = useRef(follow);
  followRef.current = follow;

  const camera = useCamera({ world: WORLD, focus: KINGDOM_BOUNDS, maxZoom: 24 * LOD_SCALE, initialCenter: initialPosition, initialScale: 0.3 });
  const { centerOn } = camera;

  const pushLog = useCallback((kind: JournalKind, text: string) => recordJourney(kind, text), []);

  /** Hooks de viagem — pontos de entrada para eventos aleatórios no futuro. */
  const events: TravelEvents = useMemo(
    () => ({
      onTravelStart: (p) =>
        pushLog("partida", `Partida — ${formatDuration(p.travelHours)} de viagem`),
      onRegionEntered: (id) => pushLog("regiao", `Entrou em ${regionById.get(id)?.name ?? id}`),
      onBorderCrossed: (c) => pushLog("fronteira", `Travessia: ${c.name}`),
      onRouteNodeReached: (id) => {
        const poi = poiById.get(id);
        if (poi) pushLog("marco", `Passou por ${poi.name}`);
      },
      onRandomEventCheck: checkRoadEvent,
      onArrival: (stop) => {
        if (stop.kind === "node" && poiById.has(stop.id)) {
          pushLog("chegada", `Chegou a ${poiById.get(stop.id)!.name}`);
          // Chegar a um lugar abre o menu dele — como se chega a uma cidade.
          setPanelPoiId(stop.id);
        } else {
          pushLog("chegada", "Parou na estrada");
        }
      },
    }),
    [pushLog],
  );

  const travel = useTravel({
    startNodeId: startNode,
    blocked: adventureBlocked,
    events,
    onFrame: useCallback(
      (pos: Point) => {
        if (followRef.current) centerOn(pos);
      },
      [centerOn],
    ),
  });

  /**
   * A campanha é conferida a cada mudança de estado. A verificação sai barata
   * quando não há nada a fazer, que é quase sempre — e assim nenhum sistema
   * precisa lembrar de avisar a história de que algo aconteceu.
   */
  useEffect(() => { checkStory(); checkOfferArrival(); }, [game]);
  // Chamados só procuram quem está livre, e a posição importa: o recado chega
  // de um lugar perto de onde você está.
  useEffect(() => { checkOffer(travel.stop); }, [game, travel.stop]);

  const openSheet = useCallback(() => {
    setAdventureView(null);
    tutorialFlag('sheetViewed');
    setSheetOpen(true);
  }, []);
  useEffect(() => {
    if (!queuedDestination || adventureBlocked) return;
    const destination = queuedDestination;
    setQueuedDestination(null);
    travel.travelTo(destination);
  }, [queuedDestination, adventureBlocked, travel.travelTo]);

  const view = useMemo(
    () => camera.getVisibleRect(),
    // Recalculado quando a câmera assenta ou o zoom muda — não a cada frame.
    [camera.getVisibleRect, camera.settle, camera.zoom],
  );

  /**
   * Tocar numa localidade ABRE o menu dela — não parte. Partir é uma escolha
   * dentro do menu, para que um toque perdido no mapa não custe três dias de
   * estrada.
   */
  const handlePoiClick = useCallback(
    (poi: PointOfInterest) => {
      if (camera.wasDragged()) return;
      setSelectedPoiId(poi.id);
      setSelectedRegion(poi.regionId);
      // Já está aqui: abre o menu. Senão, PARTE — tocar num lugar é ir até
      // ele, e o menu abre sozinho na chegada.
      if (travel.currentNodeId === poi.id) setPanelPoiId(poi.id);
      else setQueuedDestination(nodeStop(poi.id));
    },
    [camera, travel.currentNodeId],
  );

  /**
   * Toque no mapa: anda até o ponto de estrada mais próximo. A estrada segue
   * sendo o único lugar caminhável — um toque longe de qualquer uma delas não
   * faz nada —, mas não é preciso mirar numa cidade para se mover, e isso vale
   * no meio de uma viagem já começada.
   */
  const handleMapClick = useCallback(
    (e: React.MouseEvent) => {
      if (camera.wasDragged() || adventureBlocked) return;
      const world = camera.screenToWorld(e.clientX, e.clientY);
      const target = nearestRoadStop(world, ROAD_REACH);
      if (!target) return;
      setPanelPoiId(null);
      setQueuedDestination(target);
    },
    [adventureBlocked, camera],
  );

  const handleRegionClick = useCallback(
    (id: RegionId) => {
      if (camera.wasDragged()) return;
      setSelectedRegion(id);
      setSelectedPoiId(null);
    },
    [camera],
  );

  const handleCrossingClick = useCallback(
    (id: string) => {
      if (camera.wasDragged()) return;
      const c = borderCrossingById.get(id);
      if (!c) return;
      pushLog("fronteira", `${c.name} — ${c.connects.map((r) => regionById.get(r)?.name).join(" ↔ ")}`);
      if (id !== travel.currentNodeId) setQueuedDestination(nodeStop(id));
    },
    [camera, pushLog, travel],
  );

  // Agentes de ambiente: seguem a mesma malha de estradas, a mesma velocidade
  // e a mesma pausa do viajante, mas não escrevem no relógio do mundo.
  const wanderers = useWanderers({ speed: travel.speed, paused: travel.paused });
  const readAgent = readAgentId ? wanderers.find((agent) => agent.wanderer.id === readAgentId) ?? null : null;
  const pursuitAimRef = useRef<Point | null>(null);

  const pursue = useCallback((agent:WandererRuntime) => {
    tutorialFlag("pursuitStarted");
    update((state)=>({...state,pursuedForceId:agent.wanderer.id}));
    setReadAgentId(null);
    const stop=agent.currentStop();
    if(stop)travel.travelTo(stop);
  },[travel.travelTo]);

  // A rota de perseguição acompanha o alvo. Quando os dois grupos entram em
  // alcance, a viagem para e a decisão volta ao jogador.
  useEffect(()=>{
    const id=game.pursuedForceId;
    if(!id)return;
    const timer=window.setInterval(()=>{
      const target=wanderers.find((agent)=>agent.wanderer.id===id);
      if(!target){ update((state)=>({...state,pursuedForceId:null})); return; }
      const here=travel.posRef.current,there=target.positionRef.current;
      if(!here||!there)return;
      const distance=Math.hypot(here.x-there.x,here.y-there.y);
      if(distance<=250){
        travel.halt();
        update((state)=>({...state,pursuedForceId:null}));
        setReadAgentId(id);
        pushLog("evento",`Você interceptou ${target.wanderer.name}.`);
        pursuitAimRef.current=null;
        return;
      }
      const last=pursuitAimRef.current;
      if(!last||travel.state!=="traveling"||Math.hypot(last.x-there.x,last.y-there.y)>300){
        const stop=target.currentStop();
        if(stop){ pursuitAimRef.current={...there}; travel.travelTo(stop); }
      }
    },650);
    return()=>window.clearInterval(timer);
  },[game.pursuedForceId,pushLog,travel.halt,travel.posRef,travel.state,travel.travelTo,wanderers]);

  const zoom = camera.zoom;


  const destinationId = travel.path?.nodeIds[travel.path.nodeIds.length - 1] ?? null;
  const destinationName = destinationId
    ? poiById.get(destinationId)?.name ?? borderCrossingById.get(destinationId)?.name ?? null
    : null;
  const progress =
    travel.path && travel.path.totalDistance > 0
      ? travel.progressRef.current / travel.path.totalDistance
      : 0;

  // Desvanece entre o chão vetorial (cor chapada) e o chão ladrilhado. Sem
  // tileset carregado o vetorial fica sempre em 1 — nada muda no visual.
  const tileOpacity =
    tilesReady && !debug
      ? Math.max(0, Math.min(1, (zoom - TILES_MIN_ZOOM) / TILES_FADE))
      : 0;

  return (
    <div className="map-root" ref={camera.containerRef}>
      <div className="ground-art">
        <TerrainTiles subscribe={camera.subscribe} opacity={political ? 0 : tileOpacity} />
        <SceneryCanvas subscribe={camera.subscribe} enabled={!debug && !political} />
      </div>

      <svg className="map-svg" {...camera.handlers} onClick={handleMapClick}>
        <defs>
          <linearGradient id="seaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#367e87" />
            <stop offset="100%" stopColor="#173c58" />
          </linearGradient>
        </defs>

        <g ref={camera.layerRef}>
          <g>
          <TerrainLayer
            zoom={zoom}
            groundOpacity={1 - tileOpacity}
            debug={debug}
            selectedRegion={selectedRegion}
            hoveredRegion={hoveredRegion}
            onRegionClick={handleRegionClick}
            onRegionHover={setHoveredRegion}
          />
          {!debug && !political && zoom >= LANDCOVER_MIN_ZOOM && <LandcoverLayer view={view} />}
          {!debug && !political && <ReliefLayer zoom={zoom} />}
          {!debug && (
            <PoliticalLayer
              zoom={zoom}
              selectedRegion={selectedRegion}
              hoveredRegion={hoveredRegion}
              political={political}
              /* Na vista de senhorios a cor da região recua: quem tem de
                 saltar aos olhos é o dono da terra, não o da província. */
              muted={politicalView === "fiefs"}
            />
          )}
          <RiversLayer zoom={zoom} />
          {!political && <NatureLayer zoom={zoom} view={view} />}
          {/* Senhorio só responde ao toque na VISTA POLÍTICA. Fora dela o
              toque no mapa é movimento, e abrir uma ficha de terra a cada
              passo dado seria o contrário de jogar. */}
          <FiefLayer
            zoom={zoom}
            view={politicalView === "off" ? "normal" : politicalView}
            selectedFiefId={fief?.id ?? null}
            onFiefClick={(f) => {
              if (camera.wasDragged()) return;
              setFief((current) => (current?.id === f.id ? null : f));
            }}
          />
          <RoadsLayer zoom={zoom} />
          <BordersLayer zoom={zoom} onCrossingClick={handleCrossingClick} />
          <RouteHighlight path={travel.path} zoom={zoom} />
          <PoiLayer
            zoom={zoom}
            view={view}
            selectedPoiId={selectedPoiId}
            travelerNodeId={travel.currentNodeId ?? ""}
            onPoiClick={handlePoiClick}
          />

          </g>


          {zoom < lod(2.4) && (
            <g pointerEvents="none">
              {REGION_LABELS.map((r) => (
                <text
                  key={r.id}
                  x={r.at.x}
                  y={r.at.y - 70 * S}
                  textAnchor="middle"
                  fontSize={(30 * S) / zoom}
                  letterSpacing={(4 * S) / zoom}
                  fill="#f1e6bd"
                  fillOpacity={0.85}
                  stroke="#283d38"
                  strokeWidth={(4 * S) / zoom}
                  paintOrder="stroke"
                  style={{ textTransform: "uppercase" }}
                >
                  {r.name.toUpperCase()}
                </text>
              ))}
            </g>
          )}

          {!debug && (
            <FrontierLayer
              zoom={zoom}
              onRealmClick={(r) => {
                if (camera.wasDragged()) return;
                setRealm(r);
              }}
            />
          )}

          {!debug && (
            <WanderersLayer
              agents={wanderers}
              pxPerUnit={camera.baseScale() * zoom}
              pursuedForceId={game.pursuedForceId}
              onSelect={(agent) => {
                if (camera.wasDragged()) return;
                tutorialFlag("agentInspected");
                setReadAgentId(agent.wanderer.id);
              }}
            />
          )}
          <TravelerMarker
            ref={travel.markerRef}
            pxPerUnit={camera.baseScale() * zoom}
            moving={travel.state === "traveling" && !travel.paused}
            headingRef={travel.headingRef}
            partySize={troopTotal(game.troops)}
          />
          {debug && <DebugLayer zoom={zoom} />}
        </g>
      </svg>

      {/* Sem ciclo de dia e noite: o mapa é lido a toda hora, e escurecê-lo
          por metade do relógio só atrapalhava a leitura. A camada de atmosfera
          continua, sempre em luz plena. */}
      <AtmosphereOverlay subscribe={camera.subscribe} night={0} view={view} zoom={zoom} />

      <Hud
        placeName={regionById.get(travel.regionId)?.name ?? "Valdória"}
        worldHours={travel.worldHours}
        traveling={travel.state === "traveling"}
        destinationName={destinationName}
        travelHours={travel.path?.travelHours ?? 0}
        progress={progress}
        paused={travel.paused}
        onTogglePause={travel.togglePause}
        speed={travel.speed}
        onSpeed={travel.setSpeed}
        follow={follow}
        onToggleFollow={() => setFollow((f) => !f)}
        onFit={camera.fitWorld}
        debug={debug}
        onToggleDebug={() => setDebug((d) => !d)}
        journal={game.adventure.chronicle}
        coins={game.gold}
        influence={game.influence}
        food={game.food}
        heroId={game.heroId}
        xp={game.xp}
        onOpenJourney={() => setAdventureView({tab:"guide"})}
        level={game.level}
        onOpenSheet={openSheet}
        political={political}
        onTogglePolitical={() => setPoliticalView((v) => {
          if (v !== "off") return "off";
          tutorialFlag("politicsSeen");
          return "houses";
        })}
      />

      <SettlementPanel
        key={panelPoiId}
        poi={panelPoiId ? poiById.get(panelPoiId) ?? null : null}
        worldHours={travel.worldHours}
        onTravel={(id) => setQueuedDestination(nodeStop(id))}
        onClose={() => setPanelPoiId(null)}
      />

      {political && (
        <PoliticalLegend
          view={politicalView === "fiefs" ? "fiefs" : "houses"}
          onView={(v) => { setPoliticalView(v); if (v === "houses") setFief(null); }}
          selectedFiefId={fief?.id ?? null}
          onSelectFief={setFief}
          onClose={() => { setPoliticalView("off"); setFief(null); }}
        />
      )}
      {realm && <FrontierPanel realm={realm} onClose={() => setRealm(null)} />}
      {fief && !realm && politicalView === "fiefs" && <FiefPanel fief={fief} onClose={() => setFief(null)} />}
      {readAgent && !realm && !fief && <AgentPanel
        agent={readAgent}
        playerPositionRef={travel.posRef}
        pursuing={game.pursuedForceId===readAgent.wanderer.id}
        onPursue={()=>pursue(readAgent)}
        onAttack={()=>{
          const stop=readAgent.currentStop();
          const edge=stop?.kind==="road"?routeEdgeById.get(stop.edgeId):null;
          const node=stop?.kind==="node"?routeNodeById.get(stop.id):null;
          if(startWorldForceBattle(readAgent.wanderer.id,edge?.regionId??node?.regionId??readAgent.wanderer.home,edge?.terrain??"plain"))setReadAgentId(null);
        }}
        onClose={() => setReadAgentId(null)}
      />}
      {/* A campanha principal fala por cima de tudo: é a linha da partida. */}
      <StoryScene />

      {/* O guia não é uma tela: é uma linha dizendo a próxima ação, que some
          quando a ação acontece. */}
      <Coach stop={travel.stop} traveling={travel.state === "traveling"} />
      <OfferCard onTravel={(id) => setQueuedDestination(nodeStop(id))} />
      {sheetOpen && <CharacterScreen onClose={() => setSheetOpen(false)} />}
      <AdventurePanel view={adventureView} onView={setAdventureView} onClose={() => setAdventureView(null)}
        onNavigate={(id) => {setAdventureView(null);setPanelPoiId(null);setQueuedDestination(nodeStop(id));}}
        onSheet={openSheet} />
    </div>
  );
}
