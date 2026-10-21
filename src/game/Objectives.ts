import type { Vec2 } from "../core/math";
import { localToWorld } from "../core/math";
import { ST, opProgress } from "../systems/FieldSystem";
import { pipeOutlet } from "../systems/geometry";
import type { Implement, Vehicle } from "../world/entities";
import type { World } from "../world/World";

export interface Guide {
  /** O que fazer agora, de acordo com a situação atual. */
  hint: string;
  target?: Vec2;
  label?: string;
  /** ids de ações contextuais ou data-act de botões a destacar. */
  highlight?: string[];
}

export interface Objective {
  id: string;
  title: string;
  why: string;
  done: (w: World) => boolean;
  guide: (w: World) => Guide;
}

const field = (w: World, name: string) => w.fields.find((f) => f.name === name)!;
const center = (w: World, name: string): Vec2 => {
  const b = field(w, name).bounds;
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
};
const pv = (w: World): Vehicle | undefined => w.vehicle(w.player.vehicleId);
const tractor = (w: World) => w.vehicles.find((v) => v.owner === "player" && v.def.category === "tractor");
const combine = (w: World) => w.vehicles.find((v) => v.owner === "player" && v.def.combine);
const impl = (w: World, cat: string): Implement | undefined => w.implements.find((i) => i.owner === "player" && i.def.category === cat);
const attachedCat = (w: World, v?: Vehicle) => (v ? w.implement(v.implementId)?.def.category : undefined);
const implMid = (i: Implement): Vec2 => localToWorld(i.x, i.y, i.heading, -i.def.length / 2, 0);

function goToTractor(w: World, then: string): Guide {
  const t = tractor(w);
  return { hint: `Vá até o trator (siga a seta) e aperte E para entrar. Depois: ${then}`, target: t ? { x: t.x, y: t.y } : undefined, label: "Trator", highlight: ["enter"] };
}

/** Roteiro do primeiro marco: cada passo é verificado pelo estado real do mundo. */
export const OBJECTIVES: Objective[] = [
  {
    id: "enter",
    title: "Suba no trator",
    why: "O Campeiro 75 é usado, mas é o que move a fazenda no começo.",
    done: (w) => !!w.flags.enteredVehicle,
    guide: (w) => goToTractor(w, "você vai engatar o cultivador."),
  },
  {
    id: "attachCult",
    title: "Engate o cultivador",
    why: "Implementos se prendem no engate traseiro: é preciso dar ré até encostar.",
    done: (w) => !!w.flags.attached_cultivator,
    guide: (w) => {
      const v = pv(w);
      if (!v) return goToTractor(w, "dê ré até o cultivador.");
      const c = impl(w, "cultivator");
      return {
        hint: "Dê ré devagar (S ou joystick para baixo) até a traseira do trator encostar no cultivador. Quando aparecer “Engatar”, aperte Q.",
        target: c ? { x: c.x, y: c.y } : undefined,
        label: "Cultivador",
        highlight: ["attach"],
      };
    },
  },
  {
    id: "cultivate",
    title: "Prepare o Campo 1",
    why: "O restolho da safra passada precisa ser revolvido antes do plantio.",
    done: (w) => {
      const f = field(w, "Campo 1");
      return opProgress(f, "cultivate") > 0.15 || f.counts[ST.Planted] > 50;
    },
    guide: (w) => {
      const v = pv(w);
      if (!v) return goToTractor(w, "leve o cultivador ao Campo 1.");
      const im = w.implement(v.implementId);
      const f = field(w, "Campo 1");
      const inField = !!w.fieldAt(v.x, v.y) && w.fieldAt(v.x, v.y) === f;
      if (!im || im.def.category !== "cultivator") return { hint: "O cultivador não está engatado. Volte até ele e aperte Q.", target: impl(w, "cultivator") ? { ...impl(w, "cultivator")! } : undefined, label: "Cultivador" };
      if (!inField) return { hint: "Saia da sede pela abertura da cerca a leste (perto do galpão) e entre no Campo 1. A seta mostra o caminho.", target: center(w, "Campo 1"), label: "Campo 1" };
      if (!im.lowered) return { hint: "Você está no Campo 1. Aperte V para baixar o cultivador e acelere.", highlight: ["lower"], target: center(w, "Campo 1"), label: "Campo 1" };
      return { hint: `Ande em linhas retas, de uma ponta à outra. O solo escurece por onde o cultivador passa. ${Math.round(opProgress(f, "cultivate") * 100)}% feito — 15% já conclui este passo.`, target: center(w, "Campo 1"), label: "Campo 1" };
    },
  },
  {
    id: "attachSeeder",
    title: "Troque pela plantadeira",
    why: "Cada operação usa um implemento. A plantadeira está estacionada na sede.",
    done: (w) => !!w.flags.attached_seeder,
    guide: (w) => {
      const v = pv(w);
      if (!v) return goToTractor(w, "troque o implemento.");
      const s = impl(w, "seeder");
      if (attachedCat(w, v) === "cultivator") return { hint: "Levante o implemento (V), pare e aperte Q para desengatar o cultivador — pode deixá-lo ali mesmo.", highlight: ["detach", "lower"], target: s ? implMid(s) : undefined, label: "Plantadeira" };
      return { hint: "Vá até a plantadeira na sede e dê ré até encostar no cabeçalho dela. Aperte Q.", target: s ? { x: s.x, y: s.y } : undefined, label: "Plantadeira", highlight: ["attach"] };
    },
  },
  {
    id: "plant",
    title: "Plante trigo no Campo 1",
    why: "A plantadeira tem 120 kg de semente de trigo, suficiente para começar.",
    done: (w) => field(w, "Campo 1").counts[ST.Planted] > 200,
    guide: (w) => {
      const v = pv(w);
      if (!v) return goToTractor(w, "plante o Campo 1.");
      const im = w.implement(v.implementId);
      if (!im || im.def.category !== "seeder") return { hint: "Engate a plantadeira (dê ré até ela e aperte Q).", target: impl(w, "seeder") ? { ...impl(w, "seeder")! } : undefined, label: "Plantadeira" };
      if (im.seedKg < 2) {
        const z = w.map.zones.find((x) => x.type === "seed" && x.owner === "player")!;
        return { hint: "Sem sementes. Pare a plantadeira na área verde do depósito de insumos e aperte T para comprar.", target: { x: z.x, y: z.y }, label: "Sementes", highlight: ["seed"] };
      }
      const f = w.fieldAt(v.x, v.y);
      if (f?.name !== "Campo 1") return { hint: "Leve a plantadeira ao Campo 1 — ela só planta sobre solo já cultivado.", target: center(w, "Campo 1"), label: "Campo 1" };
      if (!im.lowered) return { hint: "Aperte V para baixar a plantadeira e passe sobre as faixas cultivadas (escuras).", highlight: ["lower"] };
      return { hint: "Passe sobre o solo escuro: fileiras de sementes aparecem atrás da plantadeira. O trigo cresce sozinho com o tempo (use 15× ou 45× no relógio).", target: center(w, "Campo 1"), label: "Campo 1", highlight: ["speed:2"] };
    },
  },
  {
    id: "rent",
    title: "Alugue uma colheitadeira",
    why: "O Campo 2 já está com trigo maduro. Comprar uma colheitadeira é caro: alugue.",
    done: (w) => !!combine(w),
    guide: () => ({ hint: "Toque em Menu › Concessionária e escolha “Alugar” na Ceifa 6. Ela é entregue no pátio da sede; você paga por hora de motor ligado.", highlight: ["menu:fleet", "tab:dealer", "rent:cb-ceifa-6"] }),
  },
  {
    id: "harvest",
    title: "Colha o Campo 2",
    why: "Trigo maduro que fica no campo perde produtividade a cada dia.",
    done: (w) => field(w, "Campo 2").counts[ST.Stubble] > 300,
    guide: (w) => {
      const v = pv(w);
      const c = combine(w);
      if (!c) return { hint: "Alugue a colheitadeira primeiro." };
      if (v !== c) return { hint: "Saia do trator (E) e entre na colheitadeira.", target: { x: c.x, y: c.y }, label: "Colheitadeira", highlight: ["exit", "enter"] };
      if (w.fieldAt(c.x, c.y)?.name !== "Campo 2") return { hint: "Dirija até o Campo 2, ao sul da sede.", target: center(w, "Campo 2"), label: "Campo 2" };
      if (!c.lowered) return { hint: "Aperte V para baixar a plataforma e ligar a trilha.", highlight: ["header"] };
      return { hint: "Passe pela lavoura dourada: a plataforma corta na largura real e deixa restolho. O tanque vai enchendo.", target: center(w, "Campo 2"), label: "Campo 2" };
    },
  },
  {
    id: "unload",
    title: "Descarregue na carreta",
    why: "A colheitadeira não vai até a cooperativa: o grão segue de carreta.",
    done: (w) => w.implements.some((i) => i.owner === "player" && i.cargo && i.cargo.kg > 100) || !!w.flags.sold,
    guide: (w) => {
      const v = pv(w);
      const c = combine(w);
      const trailer = impl(w, "trailer");
      if (!c || !trailer) return { hint: "Você precisa da colheitadeira e da carreta." };
      if (v === c) {
        if (!c.pipeOut) return { hint: "Com grão no tanque, estenda o tubo de descarga (G) e deixe a colheitadeira parada.", highlight: ["pipe"] };
        return { hint: "Tubo aberto. Saia (E), vá até o trator, engate a carreta e pare-a embaixo do tubo (círculo amarelo).", target: { x: trailer.x, y: trailer.y }, label: "Carreta", highlight: ["exit"] };
      }
      if (!v) return { hint: "Pegue o trator e engate a carreta (dê ré até ela, Q).", target: { x: trailer.x, y: trailer.y }, label: "Carreta" };
      if (trailer.attachedTo !== v.id) {
        if (v.implementId) return { hint: "Desengate o implemento atual (Q) e engate a carreta.", highlight: ["detach"], target: { x: trailer.x, y: trailer.y }, label: "Carreta" };
        return { hint: "Dê ré até a carreta e aperte Q.", target: { x: trailer.x, y: trailer.y }, label: "Carreta", highlight: ["attach"] };
      }
      if (!c.pipeOut) return { hint: "Entre na colheitadeira e estenda o tubo (G) — ou deixe um operador colhendo: ele abre o tubo sozinho quando enche.", target: { x: c.x, y: c.y }, label: "Colheitadeira" };
      return { hint: "Pare a caçamba da carreta embaixo da ponta do tubo: o círculo fica verde e o grão começa a cair.", target: pipeOutlet(c), label: "Tubo" };
    },
  },
  {
    id: "sell",
    title: "Venda na cooperativa",
    why: "O preço muda todo dia. A cooperativa fica a leste, na estrada asfaltada.",
    done: (w) => w.economy.ledger.some((l) => l.cat === "venda"),
    guide: (w) => {
      const z = w.map.zones.find((x) => x.type === "sell" && x.buyerId === "coop")!;
      const v = pv(w);
      const tr = impl(w, "trailer");
      if (!v || !tr || tr.attachedTo !== v.id) return { hint: "Entre no trator com a carreta carregada.", target: tr ? { x: tr.x, y: tr.y } : undefined, label: "Carreta" };
      return { hint: "Siga pela estrada até a Cooperativa Vale Verde. Pare a caçamba sobre a moega (área verde) e aperte G para bascular e vender.", target: { x: z.x, y: z.y }, label: "Cooperativa", highlight: ["tip"] };
    },
  },
  {
    id: "worker",
    title: "Contrate um operador",
    why: "Sozinho você não dá conta. Operadores dirigem, fazem as faixas e buscam insumos.",
    done: (w) => w.workers.some((x) => x.owner === "player" && x.tasks.length > 0),
    guide: (w) => {
      const any = w.workers.some((x) => x.owner === "player");
      return {
        hint: any
          ? "Em Menu › Funcionários, escolha máquina, campo e operação e toque “Adicionar à fila”. A máquina precisa estar com o implemento certo engatado."
          : "Abra Menu › Funcionários e contrate um candidato.",
        highlight: ["menu:fleet", "tab:workers", "hire:0", "assign:"],
      };
    },
  },
  {
    id: "handover",
    title: "Assuma e devolva o controle",
    why: "Você pode pegar qualquer máquina em uso e depois devolvê-la ao operador.",
    done: (w) => !!w.flags.handedBack,
    guide: (w) => {
      const wk = w.workers.find((x) => x.owner === "player" && x.vehicleId);
      const v = pv(w);
      if (v && v.workerId) return { hint: "O operador está pausado na cabine. Aperte H (ou saia com E) para devolver: ele replaneja dali e continua.", highlight: ["handback", "exit"] };
      if (!wk) return { hint: "Espere o operador chegar à máquina (ele vai a pé).", target: w.workers.find((x) => x.owner === "player") ? { ...w.workers.find((x) => x.owner === "player")! } : undefined, label: "Operador" };
      const m = w.vehicle(wk.vehicleId)!;
      return { hint: `Chegue perto da máquina de ${wk.name.split(" ")[0]} e aperte E para assumir.`, target: { x: m.x, y: m.y }, label: wk.name.split(" ")[0], highlight: ["enter"] };
    },
  },
];

export function updateObjectives(w: World): string | null {
  let completed: string | null = null;
  for (const o of OBJECTIVES)
    if (!w.flags[`obj_${o.id}`] && o.done(w)) {
      w.flags[`obj_${o.id}`] = true;
      completed = o.title;
    }
  return completed;
}

export function currentObjective(w: World): Objective | undefined {
  if (w.flags.tutorialOff) return undefined;
  return OBJECTIVES.find((o) => !w.flags[`obj_${o.id}`]);
}

