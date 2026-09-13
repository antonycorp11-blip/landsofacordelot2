import { SceneryCanvas } from "../render/SceneryCanvas";
import { lightingAt, type LightingMode } from "../render/dayNight";
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
import { useWanderers } from "../travel/useWanderers";
import { WanderersLayer } from "../render/layers/WanderersLayer";
import { PoliticalLayer } from "../render/layers/PoliticalLayer";
import { SettlementPanel } from "../ui/settlement/SettlementPanel";
import { CharacterScreen } from "../ui/hero/CharacterScreen";
import { AgentPanel } from "../ui/agent/AgentPanel";
import { useGame } from "../game/store";
import { heroById } from "../data/heroes";
import { troopTotal } from "../data/troops";
import type { Wanderer } from "../world/wanderers";
import { FrontierLayer } from "../render/layers/FrontierLayer";
import { FrontierPanel } from "../ui/frontier/FrontierPanel";
import { PoliticalLegend } from "../ui/PoliticalLegend";
import type { ForeignRealm } from "../world/foreignRealms";
import { useCamera } from "./useCamera";
import { Hud, LIGHTING_ORDER } from "../ui/Hud";
import type { JournalEntry, JournalKind } from "../ui/journal";

/** Onde a campanha começa, quando o herói escolhido não disser outra coisa. */
const FALLBACK_START = "castelo_real";

/** Rótulos das regiões — some quando o jogador se aproxima do terreno. */
/** Enquadramento inicial: a massa territorial, não o viewBox inteiro. */
const KINGDOM_BOUNDS = bounds(valdoria.outline);

const REGION_LABELS = regions.map((r) => ({ id: r.id, name: r.name, at: centroid(r.polygon) }));

export function WorldMap() {
  const game = useGame();
  const startNode = (game.heroId && heroById.get(game.heroId)?.startPoiId) || FALLBACK_START;

  const [debug, setDebug] = useState(false);
  const [lightingMode, setLightingMode] = useState<LightingMode>("cycle");
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
  const [readAgent, setReadAgent] = useState<Wanderer | null>(null);
  const [realm, setRealm] = useState<ForeignRealm | null>(null);
  /**
   * Vista política: o mapa vira tabuleiro. O cenário sai da frente para que a
   * cor das Casas possa ser comparada de fronteira a fronteira.
   */
  const [political, setPolitical] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  const followRef = useRef(follow);
  followRef.current = follow;

  const camera = useCamera({ world: WORLD, focus: KINGDOM_BOUNDS, maxZoom: 7 * LOD_SCALE });
  const { centerOn } = camera;

  /**
   * O diário guarda a hora do mundo de cada acontecimento. Como as horas são
   * escritas a cada frame pela viagem, a leitura vem de uma ref — o callback
   * de evento não pode depender do valor capturado no render.
   */
  const hoursRef = useRef(0);
  const entryId = useRef(0);
  const pushLog = useCallback((kind: JournalKind, text: string) => {
    setJournal((l) => [{ id: entryId.current++, kind, text, hours: hoursRef.current }, ...l].slice(0, 60));
  }, []);

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
      onRandomEventCheck: (edge, roll) => {
        if (roll < edge.eventChance * 0.35) pushLog("evento", `Algo se move na estrada… (${edge.terrain})`);
      },
      onDestinationReached: (id) => {
        pushLog("chegada", `Chegou a ${poiById.get(id)?.name ?? id}`);
        // Chegar a um lugar É a maneira principal de abrir o painel dele.
        if (poiById.has(id)) setPanelPoiId(id);
      },
    }),
    [pushLog],
  );

  const travel = useTravel({
    startNodeId: startNode,
    events,
    onFrame: useCallback(
      (pos: Point) => {
        if (followRef.current) centerOn(pos);
      },
      [centerOn],
    ),
  });

  const view = useMemo(
    () => camera.getVisibleRect(),
    // Recalculado quando a câmera assenta ou o zoom muda — não a cada frame.
    [camera.getVisibleRect, camera.settle, camera.zoom],
  );

  const handlePoiClick = useCallback(
    (poi: PointOfInterest) => {
      if (camera.wasDragged()) return;
      setSelectedPoiId(poi.id);
      setSelectedRegion(poi.regionId);
      setPanelPoiId(poi.id);
      if (poi.id === travel.currentNodeId) return;
      if (!travel.travelTo(poi.id)) pushLog("evento", `Sem rota por estrada até ${poi.name}`);
    },
    [camera, pushLog, travel],
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
      if (id !== travel.currentNodeId) travel.travelTo(id);
    },
    [camera, pushLog, travel],
  );

  // Agentes de ambiente: seguem a mesma malha de estradas, a mesma velocidade
  // e a mesma pausa do viajante, mas não escrevem no relógio do mundo.
  const wanderers = useWanderers({ speed: travel.speed, paused: travel.paused });

  const region = selectedRegion ? regionById.get(selectedRegion) : null;
  const zoom = camera.zoom;
  const lighting = lightingAt(travel.worldHours, lightingMode);
  hoursRef.current = travel.worldHours;

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

      <svg className="map-svg" {...camera.handlers}>
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
            />
          )}
          <RiversLayer zoom={zoom} />
          {!political && <NatureLayer zoom={zoom} view={view} />}
          <RoadsLayer zoom={zoom} />
          <BordersLayer zoom={zoom} onCrossingClick={handleCrossingClick} />
          <RouteHighlight path={travel.path} zoom={zoom} />
          <PoiLayer
            zoom={zoom}
            view={view}
            selectedPoiId={selectedPoiId}
            travelerNodeId={travel.currentNodeId}
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
              onSelect={(w) => {
                if (camera.wasDragged()) return;
                setReadAgent(w);
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

      {/* Luz do dia: uma camada sólida multiplicada sobre o mapa. Fica abaixo
          do brilho das lanternas, que é luz somada e não pode ser tingida. */}
      {!debug && <div className="lighting-tint" style={{ background: lighting.tint }} aria-hidden="true" />}

      <AtmosphereOverlay subscribe={camera.subscribe} night={debug ? 0 : lighting.night} view={view} zoom={zoom} />

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
        lightingName={lighting.name}
        lightingNight={lighting.night}
        lightingMode={lightingMode}
        onCycleLighting={() =>
          setLightingMode((m) => LIGHTING_ORDER[(LIGHTING_ORDER.indexOf(m) + 1) % LIGHTING_ORDER.length])
        }
        debug={debug}
        onToggleDebug={() => setDebug((d) => !d)}
        journal={journal}
        coins={game.gold}
        influence={game.influence}
        level={game.level}
        onOpenSheet={() => setSheetOpen(true)}
        political={political}
        onTogglePolitical={() => setPolitical((p) => !p)}
        selected={region ? { name: region.name, biome: region.biome, pois: region.pointsOfInterest.length, settlements: region.settlements.length } : null}
      />

      <SettlementPanel
        poi={panelPoiId ? poiById.get(panelPoiId) ?? null : null}
        worldHours={travel.worldHours}
        onClose={() => setPanelPoiId(null)}
      />

      {political && <PoliticalLegend onClose={() => setPolitical(false)} />}
      {realm && <FrontierPanel realm={realm} onClose={() => setRealm(null)} />}
      {readAgent && !realm && <AgentPanel wanderer={readAgent} onClose={() => setReadAgent(null)} />}
      {sheetOpen && <CharacterScreen onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
