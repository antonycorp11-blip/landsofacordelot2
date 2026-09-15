/**
 * Lands of Acordelot — modelo de dados do mundo.
 *
 * Regra de ouro: NADA aqui conhece a aparência final.
 * Todo objeto visual carrega apenas um `assetKey`; quem decide se aquilo vira
 * um PNG real ou um desenho vetorial provisório é `render/mapAssets.ts`.
 */

export type Point = { x: number; y: number };

/* ------------------------------------------------------------------ */
/* Identificadores                                                     */
/* ------------------------------------------------------------------ */

export type RegionId =
  | "heart_of_valdoria"
  | "elmwood"
  | "greystone"
  | "karneth"
  | "sacred_vale"
  | "greenfields"
  | "golden_coast";

/**
 * As Casas do reino.
 *
 * Sete delas dominam um senhorio; as três últimas não têm região própria — têm
 * solares e feudos DENTRO do domínio alheio. Casa e região são coisas
 * separadas: uma Casa pode perder o território e continuar existindo, ou
 * possuir terras no território de outra.
 */
export type HouseId =
  | "house_valdoria"
  | "house_silvarden"
  | "house_dravenor"
  | "house_karneth"
  | "house_caelmont"
  | "house_elmwood"
  | "house_aurenna"
  | "house_morvath"
  | "house_veyr"
  | "house_rosethorne";

/**
 * Quem pode possuir um senhorio.
 *
 * O jogador entra aqui SEM Casa: comprar terra não faz de ninguém um nobre, e
 * a arquitetura precisa aguentar um viajante dono de um feudo muito antes de
 * existir uma Casa dele. `"player"` é o dono, não a Casa.
 */
export type FiefOwner = HouseId | "player";

/** Arquétipo de um personagem. O brasão diz a família; a classe, o ofício. */
export type AgentClass = "MILITARY" | "TRADE" | "POLITICS" | "RELIGION";

export type Biome =
  | "temperate_valley"
  | "dense_forest"
  | "alpine"
  | "steppe_march"
  | "sacred_valley"
  | "plains"
  | "coastal";

/* ------------------------------------------------------------------ */
/* Objetos de mapa                                                     */
/* ------------------------------------------------------------------ */

export type MapObjectType =
  | "castle"
  | "fortress"
  | "city"
  | "town"
  | "village"
  | "market"
  | "temple"
  | "cathedral"
  | "monastery"
  | "shrine"
  | "watchtower"
  | "gate"
  | "fort"
  | "warcamp"
  | "mine"
  | "quarry"
  | "foundry"
  | "sawmill"
  | "farm"
  | "mill"
  | "stud_farm"
  | "port"
  | "shipyard"
  | "lighthouse"
  | "bay"
  | "lake"
  | "grove"
  | "ruins"
  | "inn"
  | "outpost"
  | "pass"
  | "peak"
  | "bridge"
  | "forest"
  | "tree"
  | "mountain"
  | "hill"
  | "ship"
  | "landmark";

/** Unidade mínima renderizável. Posição/lógica são independentes da arte. */
export type MapObject = {
  id: string;
  type: MapObjectType;
  x: number;
  y: number;
  /** Chave no registry de assets. Trocar o PNG não muda nada aqui. */
  assetKey: string;
  regionId: RegionId;
  /** Escala relativa do placeholder/asset (1 = tamanho nominal). */
  scale?: number;
  /** Rotação em graus, usada por cenário (árvores, navios). */
  rotation?: number;
  /** Zoom mínimo em que o objeto aparece (LOD). */
  minZoom?: number;
};

/** Ponto de interesse: MapObject + semântica de jogo. */
export type PointOfInterest = MapObject & {
  name: string;
  /** Importância define LOD do rótulo e tamanho do ícone. */
  tier: 1 | 2 | 3;
  /** POIs navegáveis também são nós da malha de estradas. */
  routeNode?: boolean;
  ownerHouseId?: HouseId;
  description?: string;
};

/* ------------------------------------------------------------------ */
/* Assentamentos apenas em dados (tela "Assentamentos da Região")       */
/* ------------------------------------------------------------------ */

export type SettlementKind =
  | "village"
  | "hamlet"
  | "farm"
  | "outpost"
  | "small_mine"
  | "monastery"
  | "fishing_village";

export type Settlement = {
  id: string;
  name: string;
  kind: SettlementKind;
  regionId: RegionId;
  population: number;
  /** Ancorado a um POI para uso futuro (viagem, administração). */
  nearPoiId?: string;
};

/* ------------------------------------------------------------------ */
/* Malha de navegação                                                  */
/* ------------------------------------------------------------------ */

export type RoadType = "main" | "secondary" | "trail";

export type TerrainType =
  | "plain"
  | "hill"
  | "forest"
  | "mountain"
  | "marsh"
  | "coast"
  | "river_crossing";

export type RouteNode = {
  id: string;
  x: number;
  y: number;
  regionId: RegionId;
  /** POI correspondente, quando o nó é um lugar visitável. */
  poiId?: string;
  /** Travessia de fronteira correspondente, quando aplicável. */
  borderCrossingId?: string;
  kind: "poi" | "junction" | "crossing";
};

export type RouteEdge = {
  id: string;
  from: string;
  to: string;
  /** Distância no espaço do mundo (unidades de viewBox), já com sinuosidade. */
  distance: number;
  roadType: RoadType;
  regionId: RegionId;
  /** 0..1 — usado depois por emboscadas/eventos. */
  danger: number;
  terrain: TerrainType;
  /** Multiplicador de custo de movimento (>1 = mais lento). */
  movementModifier: number;
  /** 0..1 — chance de disparar checagem de evento ao percorrer. */
  eventChance: number;
  /** Trecho fechado por guerra/ponte destruída (futuro). */
  blocked?: boolean;
  /** Pontos intermediários apenas para desenho (não afetam lógica). */
  via?: Point[];
};

/** Estrada declarada em dados; as arestas do grafo são derivadas dela. */
export type RoadDefinition = {
  id: string;
  name: string;
  type: RoadType;
  regionId: RegionId;
  /** Sequência de ids de RouteNode. */
  nodes: string[];
  danger?: number;
  terrain?: TerrainType;
  movementModifier?: number;
  /** Fator de sinuosidade aplicado à distância em linha reta. */
  windiness?: number;
};

/* ------------------------------------------------------------------ */
/* Hidrografia                                                          */
/* ------------------------------------------------------------------ */

export type River = {
  id: string;
  name: string;
  /** Polilinha do leito, da nascente à foz. */
  points: Point[];
  /** Largura na nascente e na foz; interpolada ao longo do curso. */
  widthStart: number;
  widthEnd: number;
  regionIds: RegionId[];
  tributaryOf?: string;
};

/* ------------------------------------------------------------------ */
/* Fronteiras                                                           */
/* ------------------------------------------------------------------ */

export type BorderKind = "kingdom" | "region";

export type BorderCrossingType =
  | "bridge"
  | "mountain_pass"
  | "gate"
  | "road"
  | "forest_path"
  | "ford";

export type BorderCrossing = {
  id: string;
  name: string;
  type: BorderCrossingType;
  x: number;
  y: number;
  /** Sempre exatamente duas regiões, na ordem [a, b]. */
  connects: [RegionId, RegionId];
  assetKey: string;
  /** Base para pedágio/bloqueio/controle territorial no futuro. */
  controlledBy?: HouseId;
  tollable: boolean;
  blocked?: boolean;
};

/* ------------------------------------------------------------------ */
/* Economia (somente metadados por enquanto)                            */
/* ------------------------------------------------------------------ */

export type GoodId =
  | "grain"
  | "food"
  | "fish"
  | "salt"
  | "wine"
  | "herbs"
  | "wood"
  | "game"
  | "iron"
  | "stone"
  | "ore"
  | "horses"
  | "weapons"
  | "armor"
  | "luxury"
  | "religious_goods"
  | "tools";

export type RegionEconomy = {
  produces: Partial<Record<GoodId, number>>;
  consumes: Partial<Record<GoodId, number>>;
  /** 0..1 — intensidade de comércio externo (portos altos). */
  tradeActivity: number;
  importExportHub?: boolean;
};

/* ------------------------------------------------------------------ */
/* Região                                                               */
/* ------------------------------------------------------------------ */

export type Region = {
  id: RegionId;
  name: string;
  houseId: HouseId;
  biome: Biome;
  /** Polígono fechado, em coordenadas do mundo. Compartilha vértices com vizinhos. */
  polygon: Point[];
  adjacentRegions: RegionId[];
  /** Paleta usada pelos placeholders; arte final pode ignorar. */
  palette: {
    land: string;
    landDebug: string;
    accent: string;
    forest: string;
    rock: string;
  };
  economy: RegionEconomy;
  settlements: Settlement[];
  pointsOfInterest: PointOfInterest[];
  roads: RoadDefinition[];
  /** Nós de estrada que não são POIs (entroncamentos, curvas obrigatórias). */
  junctions: RouteNode[];
  riverIds: string[];
  borderCrossingIds: string[];
  /** Capital / sede da casa dominante. */
  seatPoiId: string;
};

export type House = {
  id: HouseId;
  name: string;
  /** Nome curto, para caber em painel e etiqueta. */
  shortName: string;
  /** Chave no registry de brasões. Trocar a arte não muda nada aqui. */
  crestAssetKey: string;
  /** Cor política da Casa. É daqui que o mapa tira o tom de um território. */
  color: string;
  secondaryColor: string;
  leaderId: string;
  primaryClass: AgentClass;
  /** Região-sede. `undefined` nas Casas sem domínio próprio. */
  seatRegionId?: RegionId;
  capitalPoiId?: string;
  description?: string;
  /** Escalas 0–100. Metadados por enquanto: nada de simulação ainda. */
  power?: number;
  wealth?: number;
  militaryPower?: number;
  politicalInfluence?: number;
  religiousInfluence?: number;
};

export type Kingdom = {
  id: string;
  name: string;
  /** viewBox virtual do mundo. */
  bounds: { x: number; y: number; width: number; height: number };
  houses: House[];
  regions: Region[];
  rivers: River[];
  borderCrossings: BorderCrossing[];
  /** Estradas reais que cruzam mais de uma região. */
  royalRoads: RoadDefinition[];
  /** Contorno externo do reino (fronteira forte). */
  outline: Point[];
  /** Polígono do mar (Costa Dourada). */
  sea: Point[];
};

/* ------------------------------------------------------------------ */
/* Viagem                                                               */
/* ------------------------------------------------------------------ */

export type TravelPath = {
  nodeIds: string[];
  edgeIds: string[];
  /** Polilinha densa já pronta para animar o marcador. */
  points: Point[];
  /** Distância acumulada em cada ponto de `points`. */
  cumulative: number[];
  totalDistance: number;
  /** Custo em horas do mundo, considerando modificadores. */
  travelHours: number;
  /**
   * Distância acumulada ao FIM de cada trecho de `edgeIds` — o índice 0 é
   * sempre 0. Um trajeto que começa ou termina no meio de uma aresta tem
   * trechos parciais, e então isto não coincide com a distância das arestas.
   */
  legAt?: number[];
  /** Nó alcançado ao fim de cada trecho; ausente quando o trecho para no meio da estrada. */
  legEnd?: (string | undefined)[];
  /** Onde a viagem termina, quando não é um nó. */
  endStop?: import("./roadStops").RoadStop;
  /**
   * Custo médio do chão desta rota, quando ela foi traçada pelo TERRENO e não
   * pelo grafo de estradas. O laço de viagem multiplica o tempo por ele — é
   * como uma travessia de bosque leva mais horas que a mesma distância em
   * planície sem existir aresta nenhuma para carregar o modificador.
   */
  terrainModifier?: number;
  /** Ponto exato onde a rota termina, quando o destino é chão livre. */
  endPoint?: Point;
  /** Fração do trajeto feita sobre estrada. */
  roadShare?: number;
  /** Escolha de viagem do jogador, para reconstruir o mesmo caminho após recarregar. */
  navigationMode?: "road" | "concealed";
};

export type TravelEvents = {
  onTravelStart?: (path: TravelPath) => void;
  onRouteNodeReached?: (nodeId: string, node: RouteNode) => void;
  onRegionEntered?: (regionId: RegionId) => void;
  onBorderCrossed?: (crossing: BorderCrossing) => void;
  onRandomEventCheck?: (edge: RouteEdge, roll: number) => void;
  /** Chegada ao destino — que pode ser um lugar OU um ponto de estrada. */
  onArrival?: (stop: import("./roadStops").RoadStop) => void;
};
