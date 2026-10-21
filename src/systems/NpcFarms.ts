import { CROPS, type CropId } from "../data/crops";
import { VEHICLES, type WorkOp } from "../data/machines";
import { attach } from "./ImplementSystem";
import { ST } from "./FieldSystem";
import { season } from "./TimeSystem";
import { assignTask, hireWorker, opsFor } from "./WorkerAI";
import type { NpcFarm, World } from "../world/World";
import type { Vehicle } from "../world/entities";
import { money } from "./Economy";

interface NpcSpec {
  owner: string;
  cash: number;
  goal: NpcFarm["goal"];
  crops: CropId[];
  fleet: [string, string | null][];
  workers: string[];
}

const SPECS: NpcSpec[] = [
  {
    owner: "bertolini",
    cash: 70000,
    goal: "rendimento",
    crops: ["wheat", "corn"],
    fleet: [
      ["tr-campeiro-75", "cult-3"],
      ["tr-campeiro-75", "seed-3"],
      ["cb-ceifa-6", null],
    ],
    workers: ["Beto Bertolini", "Giovana Bertolini", "Seu Ademir"],
  },
  {
    owner: "osorio",
    cash: 190000,
    goal: "expandir",
    crops: ["soy", "wheat"],
    fleet: [
      ["tr-lavrador-140", "cult-6"],
      ["tr-lavrador-140", "seed-6"],
      ["cb-ceifa-6", null],
    ],
    workers: ["Caio Osório", "Davi Osório", "Elias Osório"],
  },
  {
    owner: "sanches",
    cash: 360000,
    goal: "frota",
    crops: ["corn", "soy"],
    fleet: [
      ["tr-tita-280", "cult-6"],
      ["tr-lavrador-140", "seed-6"],
      ["cb-ceifa-9", null],
    ],
    workers: ["Raul Sanches", "Nádia Lopes", "Fábio Cruz"],
  },
];

/** Cria as fazendas concorrentes com caixa, frota e funcionários reais no mapa. */
export function setupNpcs(world: World): void {
  for (const sp of SPECS) {
    const site = world.farmOf(sp.owner);
    world.npcs.push({ id: sp.owner, name: site.name, owner: sp.owner, cash: sp.cash, goal: sp.goal, crops: sp.crops, color: site.color, lastDecisionDay: 0, history: [] });
    sp.fleet.forEach(([vid, iid], k) => {
      const spot = site.parking[k % site.parking.length];
      const v = world.addVehicle(vid, sp.owner, spot.x, spot.y, spot.heading);
      v.fuel = v.def.fuelCapacity;
      if (iid) {
        const im = world.addImplement(iid, sp.owner, spot.x, spot.y + 4, spot.heading);
        attach(v, im);
        if (im.def.seedCapacityKg) {
          im.seedCrop = sp.crops[0];
          im.seedKg = im.def.seedCapacityKg;
        }
      }
      hireWorker(world, { name: sp.workers[k], salary: 30, skill: 0.95, specialty: v.def.combine ? "harvest" : iid?.startsWith("seed") ? "plant" : "cultivate" }, sp.owner);
    });
  }
}

function pickCrop(npc: NpcFarm, day: number): CropId {
  const s = season(day);
  let best = npc.crops[0];
  for (const c of npc.crops) if (CROPS[c].seasonGrowth[s] > CROPS[best].seasonGrowth[s]) best = c;
  return best;
}

function neededOp(world: World, fieldId: number): WorkOp | null {
  const f = world.field(fieldId)!;
  const c = f.counts;
  const total = f.maskCount || 1;
  if (f.matureCount / total > 0.55) return "harvest";
  if ((c[ST.Raw] + c[ST.Stubble] + c[ST.Withered]) / total > 0.45) return "cultivate";
  if ((c[ST.Cultivated] + c[ST.Plowed]) / total > 0.45) return "plant";
  return null;
}

let acc = 0;

/** Rotina dos concorrentes: distribui operações aos seus funcionários e toma decisões de investimento. */
export function updateNpcs(world: World, dt: number): void {
  acc += dt;
  if (acc < 3) return;
  acc = 0;
  for (const npc of world.npcs) {
    const workers = world.workers.filter((w) => w.owner === npc.owner);
    const busyFields = new Set<number>();
    for (const w of workers) for (const t of w.tasks) if (t.status === "active" || t.status === "queued") busyFields.add(t.fieldId);
    for (const f of world.fields) {
      if (f.owner !== npc.owner || busyFields.has(f.id)) continue;
      const op = neededOp(world, f.id);
      if (!op) continue;
      for (const w of workers) {
        if (w.tasks.some((t) => t.status === "active" || t.status === "queued")) continue;
        const v: Vehicle | undefined = world.vehicles.find((x) => x.owner === npc.owner && opsFor(world, x).includes(op) && !world.workers.some((o) => o.id !== w.id && o.tasks.some((t) => (t.status === "active" || t.status === "queued") && t.vehicleId === x.id)));
        if (!v) continue;
        const crop = op === "plant" ? pickCrop(npc, world.time.day) : undefined;
        const r = assignTask(world, w, v.id, f.id, op, crop);
        if (r.ok) {
          busyFields.add(f.id);
          if (op === "plant") {
            const im = world.implement(v.implementId);
            if (im && im.seedCrop !== crop && crop) {
              im.seedCrop = crop;
              im.seedKg = 0;
            }
          }
          break;
        }
      }
    }
    // limpa tarefas antigas
    for (const w of workers) if (w.tasks.length > 12) w.tasks = w.tasks.filter((t) => t.status === "active" || t.status === "queued");
  }
}

/** Decisões diárias: compra de terras e máquinas, alterando oportunidades do jogador. */
export function npcDaily(world: World): void {
  for (const npc of world.npcs) {
    if (world.time.day - npc.lastDecisionDay < 3) continue;
    if (npc.goal === "expandir" || npc.cash > 450000) {
      const forSale = world.fields.filter((f) => f.owner === null).sort((a, b) => a.price - b.price);
      const target = forSale.find((f) => npc.cash > f.price + 120000);
      if (target) {
        npc.cash -= target.price;
        target.owner = npc.owner;
        npc.lastDecisionDay = world.time.day;
        npc.history.unshift(`Comprou ${target.name} por ${money(target.price)}`);
        for (const f of world.fields) if (f.owner === null) f.price = Math.round((f.price * 1.05) / 100) * 100;
        world.notify(`${npc.name} comprou o ${target.name}. Terras à venda valorizaram 5%.`, "warn");
        continue;
      }
    }
    if (npc.goal === "frota" && npc.cash > 520000) {
      const spot = world.freeParking(npc.owner);
      const def = VEHICLES["tr-lavrador-140"];
      npc.cash -= def.price;
      const v = world.addVehicle(def.id, npc.owner, spot.x, spot.y, spot.heading);
      v.fuel = def.fuelCapacity;
      npc.lastDecisionDay = world.time.day;
      npc.history.unshift(`Comprou um ${def.name}`);
      world.notify(`${npc.name} comprou um ${def.name} novo.`, "info");
    }
  }
}
