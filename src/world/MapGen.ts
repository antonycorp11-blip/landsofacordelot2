import { distToPolygonEdge, pointInPolygon, type Vec2 } from "../core/math";
import { Rng, fbm, hash2 } from "../core/rng";
import { BUILDINGS, type ZoneTemplate } from "../data/buildings";
import type { CropId } from "../data/crops";
import type { FieldDef } from "../systems/FieldSystem";
import { RoadNetwork } from "./Roads";
import type { Building, Buyer, Fence, ParkingSpot, Place, Pond, Tree, Zone } from "./types";

export const WORLD_W = 1400;
export const WORLD_H = 1000;

export interface Surface {
  poly: Vec2[];
  kind: "gravel" | "concrete" | "yard";
}

export interface FarmSite {
  id: string;
  name: string;
  owner: string;
  x: number;
  y: number;
  parking: ParkingSpot[];
  nodeId: number;
  color: string;
}

export interface InitialFieldState {
  stage: number;
  crop?: CropId;
  growth?: number;
}

export interface GameMap {
  seed: number;
  width: number;
  height: number;
  roads: RoadNetwork;
  buildings: Building[];
  zones: Zone[];
  trees: Tree[];
  fences: Fence[];
  ponds: Pond[];
  surfaces: Surface[];
  fields: (FieldDef & { initial: InitialFieldState })[];
  places: Place[];
  buyers: Buyer[];
  farms: FarmSite[];
}

interface FieldSpec {
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  gate: "n" | "s" | "e" | "w";
  owner: string | null;
  pricePerHa: number;
  initial: InitialFieldState;
  cut?: number;
}

export function generateMap(seed: number): GameMap {
  const rng = new Rng(seed);
  const roads = new RoadNetwork();
  const buildings: Building[] = [];
  const zones: Zone[] = [];
  const surfaces: Surface[] = [];
  const fences: Fence[] = [];
  const ponds: Pond[] = [];
  const places: Place[] = [];
  const farms: FarmSite[] = [];
  let bid = 1;
  let zid = 1;

  // ---------------- Estrada principal (asfalto) ----------------
  roads.addRoad(
    [
      { x: -30, y: 522 },
      { x: 200, y: 506 },
      { x: 420, y: 538 },
      { x: 650, y: 516 },
      { x: 900, y: 496 },
      { x: 1150, y: 470 },
      { x: 1430, y: 480 },
    ],
    "asphalt",
    9,
    12,
  );

  const junction = (x: number, y: number) => roads.splitNearest(x, y, ["asphalt"]);
  const dirt = (pts: Vec2[], start: number, width = 5.5) => roads.addRoad(pts, "dirt", width, 9, start);

  const addBuilding = (defId: string, x: number, y: number, rot = 0, owner: string | null = null, buyerId?: string, label?: string) => {
    const def = BUILDINGS[defId];
    const b: Building = { id: bid++, def, x, y, rot, variant: Math.floor(hash2(x, y, seed) * 4), owner, label };
    buildings.push(b);
    for (const zt of def.zones ?? []) addZone(zt, b, buyerId);
    return b;
  };
  const addZone = (zt: ZoneTemplate, b: Building, buyerId?: string) => {
    const c = Math.cos(b.rot);
    const s = Math.sin(b.rot);
    zones.push({
      id: zid++,
      type: zt.type,
      x: b.x + zt.x * c - zt.y * s,
      y: b.y + zt.x * s + zt.y * c,
      w: zt.w,
      h: zt.h,
      rot: b.rot,
      label: b.label ? `${zt.label} · ${b.label}` : zt.label,
      buyerId,
      owner: b.owner,
    });
  };
  const rect = (x0: number, y0: number, x1: number, y1: number): Vec2[] => [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
  // ---------------- Sede do jogador: Sítio Boa Vista ----------------
  const jPlayer = junction(250, 512);
  dirt(
    [
      { x: 250, y: 512 },
      { x: 248, y: 580 },
      { x: 245, y: 640 },
      { x: 245, y: 700 },
      { x: 238, y: 750 },
      { x: 175, y: 790 },
      { x: 162, y: 860 },
      { x: 165, y: 930 },
    ],
    jPlayer,
  );
  surfaces.push({ poly: [{ x: 226, y: 632 }, { x: 306, y: 632 }, { x: 308, y: 742 }, { x: 222, y: 746 }], kind: "yard" });
  surfaces.push({ poly: rect(192, 682, 226, 742), kind: "gravel" });
  fences.push({ pts: [{ x: 237, y: 622 }, { x: 180, y: 622 }, { x: 180, y: 754 }, { x: 220, y: 754 }] });
  fences.push({ pts: [{ x: 244, y: 754 }, { x: 318, y: 754 }, { x: 318, y: 680 }] });
  fences.push({ pts: [{ x: 318, y: 662 }, { x: 318, y: 622 }, { x: 255, y: 622 }] });
  addBuilding("farmhouse", 207, 648, 0, "player");
  addBuilding("shed", 285, 655, 0, "player");
  addBuilding("siloSmall", 286, 707, 0, "player");
  addBuilding("siloSmall", 297, 707, 0, "player");
  addBuilding("grainPitFarm", 291, 723, 0, "player");
  addBuilding("fuelTank", 203, 690, 0, "player");
  addBuilding("seedPallets", 204, 718, 0, "player");
  farms.push({
    id: "player",
    name: "Sítio Boa Vista",
    owner: "player",
    x: 245,
    y: 690,
    parking: [
      { x: 262, y: 690, heading: -Math.PI / 2 },
      { x: 270, y: 690, heading: -Math.PI / 2 },
      { x: 262, y: 718, heading: -Math.PI / 2 },
      { x: 270, y: 718, heading: -Math.PI / 2 },
      { x: 228, y: 735, heading: -Math.PI / 2 },
      { x: 258, y: 737, heading: 0 },
    ],
    nodeId: roads.nearestNode(245, 700).id,
    color: "#e8c53a",
  });
  ponds.push({ x: 115, y: 690, rx: 24, ry: 15, rot: 0.3 });
  fences.push({
    pts: [
      { x: 70, y: 660 },
      { x: 160, y: 660 },
      { x: 160, y: 735 },
      { x: 70, y: 735 },
      { x: 70, y: 660 },
    ],
  });

  // ---------------- Cooperativa ----------------
  const jCoop = junction(930, 494);
  const coopRoad = dirt([{ x: 930, y: 494 }, { x: 931, y: 460 }, { x: 930, y: 432 }], jCoop, 7);
  surfaces.push({ poly: rect(870, 345, 1000, 462), kind: "concrete" });
  addBuilding("warehouse", 968, 372, 0, "coop");
  addBuilding("siloBig", 885, 365, 0, "coop");
  addBuilding("siloBig", 885, 380 + 1, 0, "coop");
  addBuilding("siloBig", 900, 362, 0, "coop");
  addBuilding("office", 980, 438, 0, "coop");
  addBuilding("coopPit", 930, 418, 0, "coop", "coop", "Cooperativa");
  places.push({ id: "coop", name: "Cooperativa Vale Verde", x: 930, y: 418, kind: "coop", nodeId: coopRoad[coopRoad.length - 1] });

  // ---------------- Concessionária ----------------
  const jDealer = junction(722, 512);
  const dealerRoad = dirt([{ x: 722, y: 512 }, { x: 721, y: 545 }, { x: 720, y: 566 }], jDealer, 7);
  surfaces.push({ poly: rect(675, 552, 770, 626), kind: "concrete" });
  addBuilding("showroom", 722, 605, Math.PI, "dealer", undefined, "Campo Forte");
  places.push({ id: "dealer", name: "Concessionária Campo Forte", x: 722, y: 585, kind: "dealer", nodeId: dealerRoad[dealerRoad.length - 1] });

  // ---------------- Posto ----------------
  surfaces.push({ poly: rect(530, 474, 594, 516), kind: "concrete" });
  addBuilding("gasStation", 562, 494, 0, null, undefined, "Posto Estrada Real");
  const jFuel = junction(562, 524);
  const fuelNode = roads.addNode(562, 496);
  roads.addEdge(jFuel, fuelNode, "dirt", 7);
  places.push({ id: "fuel", name: "Posto Estrada Real", x: 562, y: 494, kind: "fuel", nodeId: fuelNode });

  // ---------------- Moinho (comprador distante) ----------------
  const jMill = junction(1320, 476);
  const millRoad = dirt([{ x: 1320, y: 476 }, { x: 1322, y: 445 }, { x: 1320, y: 424 }], jMill, 7);
  surfaces.push({ poly: rect(1270, 345, 1385, 450), kind: "concrete" });
  addBuilding("mill", 1335, 372, 0, "mill");
  addBuilding("siloBig", 1290, 362, 0, "mill");
  addBuilding("coopPit", 1320, 414, 0, "mill", "mill", "Moinho Serra Alta");
  places.push({ id: "mill", name: "Moinho Serra Alta", x: 1320, y: 414, kind: "mill", nodeId: millRoad[millRoad.length - 1] });

  // ---------------- Fazendas vizinhas ----------------
  const npcFarm = (id: string, name: string, color: string, jx: number, jy: number, road: Vec2[], yx: number, yy: number, rot: number) => {
    const j = junction(jx, jy);
    const r = dirt(road, j);
    surfaces.push({ poly: rect(yx - 50, yy - 38, yx + 50, yy + 38), kind: "yard" });
    addBuilding("farmhouse", yx - 30, yy - 20, rot, id);
    addBuilding("barn", yx + 26, yy - 20, 0, id);
    addBuilding("siloSmall", yx + 32, yy + 18, 0, id);
    addBuilding("siloSmall", yx + 42, yy + 18, 0, id);
    addBuilding("grainPitFarm", yx + 36, yy + 31, 0, id);
    addBuilding("fuelTank", yx - 36, yy + 14, 0, id);
    addBuilding("seedPallets", yx - 36, yy + 26, 0, id);
    const site: FarmSite = {
      id,
      name,
      owner: id,
      x: yx,
      y: yy,
      parking: [
        { x: yx - 10, y: yy + 22, heading: -Math.PI / 2 },
        { x: yx - 2, y: yy + 22, heading: -Math.PI / 2 },
        { x: yx + 6, y: yy + 22, heading: -Math.PI / 2 },
        { x: yx + 14, y: yy + 22, heading: -Math.PI / 2 },
      ],
      nodeId: r[r.length - 1],
      color,
    };
    farms.push(site);
    places.push({ id, name, x: yx, y: yy, kind: "npc", nodeId: site.nodeId });
  };
  npcFarm("bertolini", "Família Bertolini", "#d86a3a", 228, 508, [{ x: 228, y: 508 }, { x: 226, y: 430 }, { x: 222, y: 360 }, { x: 220, y: 335 }], 220, 300, 0);
  npcFarm("osorio", "Fazenda Três Irmãos", "#7a5cc8", 652, 516, [{ x: 652, y: 516 }, { x: 648, y: 430 }, { x: 642, y: 360 }, { x: 640, y: 330 }], 640, 300, 0);
  npcFarm("sanches", "Agropecuária Sanches", "#2f9ec4", 1085, 478, [{ x: 1085, y: 478 }, { x: 1078, y: 560 }, { x: 1066, y: 650 }, { x: 1060, y: 735 }], 1060, 770, 0);

  places.push({ id: "player", name: "Sítio Boa Vista", x: 245, y: 690, kind: "farm", nodeId: farms[0].nodeId });

  // ---------------- Campos ----------------
  const specs: FieldSpec[] = [
    { name: "Campo 1", x0: 335, y0: 640, x1: 395, y1: 700, gate: "w", owner: "player", pricePerHa: 52000, initial: { stage: 4, crop: "wheat" } },
    { name: "Campo 2", x0: 192, y0: 792, x1: 280, y1: 862, gate: "w", owner: "player", pricePerHa: 52000, initial: { stage: 3, crop: "wheat", growth: 0.93 } },
    { name: "Campo 3", x0: 320, y0: 778, x1: 420, y1: 868, gate: "n", owner: null, pricePerHa: 48000, initial: { stage: 0 }, cut: 1 },
    { name: "Campo 4", x0: 55, y0: 800, x1: 135, y1: 905, gate: "e", owner: null, pricePerHa: 45000, initial: { stage: 4, crop: "soy" } },
    { name: "Campo 5", x0: 450, y0: 615, x1: 565, y1: 720, gate: "n", owner: null, pricePerHa: 50000, initial: { stage: 0 }, cut: 2 },
    // Bertolini
    { name: "Bertolini Norte", x0: 50, y0: 190, x1: 150, y1: 300, gate: "e", owner: "bertolini", pricePerHa: 50000, initial: { stage: 3, crop: "wheat", growth: 0.55 } },
    { name: "Bertolini Leste", x0: 290, y0: 215, x1: 400, y1: 330, gate: "w", owner: "bertolini", pricePerHa: 50000, initial: { stage: 4, crop: "wheat" } },
    { name: "Bertolini Sul", x0: 60, y0: 370, x1: 170, y1: 465, gate: "e", owner: "bertolini", pricePerHa: 50000, initial: { stage: 3, crop: "corn", growth: 0.2 } },
    // Osório
    { name: "Três Irmãos A", x0: 455, y0: 160, x1: 572, y1: 285, gate: "e", owner: "osorio", pricePerHa: 52000, initial: { stage: 3, crop: "soy", growth: 0.7 } },
    { name: "Três Irmãos B", x0: 716, y0: 170, x1: 840, y1: 290, gate: "w", owner: "osorio", pricePerHa: 52000, initial: { stage: 1 } },
    { name: "Três Irmãos C", x0: 716, y0: 345, x1: 822, y1: 445, gate: "w", owner: "osorio", pricePerHa: 52000, initial: { stage: 3, crop: "wheat", growth: 0.97 }, cut: 3 },
    // Sanches
    { name: "Sanches 1", x0: 870, y0: 615, x1: 990, y1: 728, gate: "e", owner: "sanches", pricePerHa: 47000, initial: { stage: 3, crop: "corn", growth: 0.45 } },
    { name: "Sanches 2", x0: 1110, y0: 600, x1: 1265, y1: 715, gate: "w", owner: "sanches", pricePerHa: 47000, initial: { stage: 3, crop: "soy", growth: 0.92 } },
    { name: "Sanches 3", x0: 1132, y0: 805, x1: 1290, y1: 925, gate: "w", owner: "sanches", pricePerHa: 47000, initial: { stage: 4, crop: "corn" } },
    { name: "Sanches 4", x0: 862, y0: 805, x1: 985, y1: 930, gate: "e", owner: "sanches", pricePerHa: 47000, initial: { stage: 2 } },
  ];

  const fields: GameMap["fields"] = [];
  specs.forEach((sp, idx) => {
    const fr = new Rng(seed ^ (0x9e37 * (idx + 1)));
    const j = () => fr.range(-4.5, 4.5);
    let poly: Vec2[] = [
      { x: sp.x0 + j(), y: sp.y0 + j() },
      { x: sp.x1 + j(), y: sp.y0 + j() },
      { x: sp.x1 + j(), y: sp.y1 + j() },
      { x: sp.x0 + j(), y: sp.y1 + j() },
    ];
    if (sp.cut !== undefined) {
      // corta um canto para formar um pentágono natural
      const k = sp.cut % 4;
      const a = poly[k];
      const b = poly[(k + 1) % 4];
      const c = poly[(k + 3) % 4];
      const t = fr.range(0.2, 0.32);
      const p1 = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const p2 = { x: a.x + (c.x - a.x) * t, y: a.y + (c.y - a.y) * t };
      poly = poly.flatMap((p, i) => (i === k ? [p2, p1] : [p]));
    }
    const cx = (sp.x0 + sp.x1) / 2;
    const cy = (sp.y0 + sp.y1) / 2;
    const gate =
      sp.gate === "n"
        ? { x: cx, y: sp.y0 - 8 }
        : sp.gate === "s"
          ? { x: cx, y: sp.y1 + 8 }
          : sp.gate === "w"
            ? { x: sp.x0 - 8, y: cy }
            : { x: sp.x1 + 8, y: cy };
    const area = Math.abs((sp.x1 - sp.x0) * (sp.y1 - sp.y0)) / 10000;
    // trilha de acesso até a estrada mais próxima
    const gateNode = roads.addNode(gate.x, gate.y);
    fields.push({ id: idx + 1, name: sp.name, poly, owner: sp.owner, price: Math.round((area * sp.pricePerHa) / 100) * 100, gate, gateNode, initial: sp.initial });
    const near = roads.nearestNode(gate.x, gate.y, (n) => n.id !== gateNode && n.edges.length > 0 && roads.edges[n.edges[0]].kind !== "track");
    roads.addEdge(gateNode, near.id, "track", 4.5);
  });

  // ---------------- Compradores ----------------
  const buyers: Buyer[] = [
    { id: "coop", name: "Cooperativa Vale Verde", priceMul: { wheat: 1, soy: 1, corn: 1 }, accepts: ["wheat", "soy", "corn"] },
    { id: "mill", name: "Moinho Serra Alta", priceMul: { wheat: 1.17, soy: 1, corn: 1.11 }, accepts: ["wheat", "corn"] },
  ];

  // ---------------- Vegetação ----------------
  const trees: Tree[] = [];
  const blocked = (x: number, y: number, pad: number): boolean => {
    if (x < 4 || y < 4 || x > WORLD_W - 4 || y > WORLD_H - 4) return true;
    for (const f of fields) {
      const b = { minX: Math.min(...f.poly.map((p) => p.x)), maxX: Math.max(...f.poly.map((p) => p.x)), minY: Math.min(...f.poly.map((p) => p.y)), maxY: Math.max(...f.poly.map((p) => p.y)) };
      if (x < b.minX - 18 - pad || x > b.maxX + 18 + pad || y < b.minY - 18 - pad || y > b.maxY + 18 + pad) continue;
      if (pointInPolygon(x, y, f.poly) || distToPolygonEdge(x, y, f.poly) < 18 + pad) return true;
    }
    for (const s of surfaces) {
      if (pointInPolygon(x, y, s.poly) || distToPolygonEdge(x, y, s.poly) < 5 + pad) return true;
    }
    for (const p of ponds) {
      if (((x - p.x) / (p.rx + 4)) ** 2 + ((y - p.y) / (p.ry + 4)) ** 2 < 1) return true;
    }
    const r = roads.roadAt(x, y);
    if (r.d < r.width / 2 + 5 + pad) return true;
    return false;
  };

  // bosques por ruído
  const step = 6.5;
  for (let gy = 0; gy < WORLD_H; gy += step) {
    for (let gx = 0; gx < WORLD_W; gx += step) {
      const x = gx + (hash2(gx, gy, seed + 1) - 0.5) * step * 0.9;
      const y = gy + (hash2(gx, gy, seed + 2) - 0.5) * step * 0.9;
      const forest = fbm(x / 150, y / 150, seed + 9, 4);
      const isForest = forest > 0.6;
      const lone = hash2(gx, gy, seed + 3) < 0.012;
      if (!isForest && !lone) continue;
      if (isForest && hash2(gx, gy, seed + 4) < 0.18) continue;
      if (blocked(x, y, 0)) continue;
      const broad = fbm(x / 60, y / 60, seed + 19, 2) > 0.48;
      trees.push({ x, y, r: (broad ? 3.2 : 2.4) + hash2(gx, gy, seed + 5) * 2.2, kind: broad ? 0 : hash2(gx, gy, seed + 6) < 0.5 ? 1 : 2, phase: hash2(gx, gy, seed + 7) * Math.PI * 2 });
    }
  }
  // quebra-vento ao longo da estrada principal
  for (const e of roads.edges) {
    if (e.kind !== "asphalt") continue;
    const a = roads.nodes[e.a];
    const b = roads.nodes[e.b];
    const dx = (b.x - a.x) / e.len;
    const dy = (b.y - a.y) / e.len;
    for (let s = 0; s < e.len; s += 11) {
      for (const side of [-1, 1]) {
        const k = hash2(Math.floor(a.x + dx * s), side, seed + 8);
        if (k < 0.45) continue;
        const x = a.x + dx * s - dy * side * 13;
        const y = a.y + dy * s + dx * side * 13;
        if (blocked(x, y, -4)) continue;
        trees.push({ x, y, r: 2.6 + k * 1.6, kind: 2, phase: k * 6.28 });
      }
    }
  }
  // árvores de sombra nas sedes
  for (const f of farms) {
    for (let k = 0; k < 5; k++) {
      const x = f.x - 62 + k * 4 + rng.range(-2, 2);
      const y = f.y - 52 + rng.range(-3, 3) + k * 9;
      if (!blocked(x, y, -3)) trees.push({ x, y, r: 3.6 + rng.range(0, 1.4), kind: 0, phase: rng.range(0, 6.28) });
    }
  }

  return { seed, width: WORLD_W, height: WORLD_H, roads, buildings, zones, trees, fences, ponds, surfaces, fields, places, buyers, farms };
}

