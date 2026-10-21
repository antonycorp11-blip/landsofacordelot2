import { ST, opProgress } from "../systems/FieldSystem";
import type { World } from "../world/World";

export interface Objective {
  id: string;
  text: string;
  done: (w: World) => boolean;
}

const field = (w: World, name: string) => w.fields.find((f) => f.name === name)!;

/** Roteiro do primeiro marco: cada passo é verificado pelo estado real do mundo. */
export const OBJECTIVES: Objective[] = [
  { id: "enter", text: "Entre no trator (E perto da porta)", done: (w) => !!w.flags.enteredVehicle },
  { id: "attachCult", text: "Dê ré até o cultivador e engate (Q)", done: (w) => !!w.flags.attached_cultivator },
  {
    id: "cultivate",
    text: "Baixe o cultivador (V) e prepare parte do Campo 1",
    done: (w) => {
      const f = field(w, "Campo 1");
      return opProgress(f, "cultivate") > 0.15 || f.counts[ST.Planted] > 50;
    },
  },
  { id: "attachSeeder", text: "Desengate (Q) e engate a plantadeira", done: (w) => !!w.flags.attached_seeder },
  { id: "plant", text: "Plante trigo no Campo 1 (sementes no depósito: T)", done: (w) => field(w, "Campo 1").counts[ST.Planted] > 200 },
  { id: "rent", text: "Alugue uma colheitadeira (Menu › Máquinas)", done: (w) => w.vehicles.some((v) => v.owner === "player" && v.def.combine) },
  { id: "harvest", text: "Colha o trigo maduro do Campo 2", done: (w) => field(w, "Campo 2").counts[ST.Stubble] > 300 },
  { id: "unload", text: "Descarregue o tanque numa carreta (tubo: G)", done: (w) => w.implements.some((i) => i.owner === "player" && i.cargo && i.cargo.kg > 100) || !!w.flags.sold },
  { id: "sell", text: "Leve a carreta à cooperativa e venda (G na moega)", done: (w) => w.economy.ledger.some((l) => l.cat === "venda") },
  { id: "worker", text: "Contrate um operador e atribua uma tarefa", done: (w) => w.workers.some((x) => x.owner === "player" && x.tasks.length > 0) },
  { id: "handover", text: "Assuma a máquina do operador e devolva o controle", done: (w) => !!w.flags.handedBack },
];

export function updateObjectives(w: World): void {
  for (const o of OBJECTIVES) if (!w.flags[`obj_${o.id}`] && o.done(w)) w.flags[`obj_${o.id}`] = true;
}
