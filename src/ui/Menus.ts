import { BALANCE } from "../config/balance";
import { hash2 } from "../core/rng";
import { dist } from "../core/math";
import { CROPS, CROP_LIST, cropByIndex, type CropId } from "../data/crops";
import { IMPLEMENTS, OP_LABEL, VEHICLES, type WorkOp } from "../data/machines";
import { kgLabel, money } from "../systems/Economy";
import { STAGE_LABEL, opProgress } from "../systems/FieldSystem";
import { dateLabel } from "../systems/TimeSystem";
import { dayWeather, forecastLabel } from "../systems/Weather";
import { assignTask, cancelTask, fireWorker, hireWorker, opsFor } from "../systems/WorkerAI";
import { detach } from "../systems/ImplementSystem";
import type { Game } from "../game/Game";
import type { UI } from "./UI";
import { drawMap } from "./Minimap";

export type MenuTab = "map" | "fields" | "fleet" | "dealer" | "workers" | "market" | "neighbors" | "finance" | "system";

export const MENU_TABS: [MenuTab, string][] = [
  ["map", "Mapa"],
  ["fields", "Campos"],
  ["fleet", "Frota"],
  ["dealer", "Concessionária"],
  ["workers", "Funcionários"],
  ["market", "Armazém e mercado"],
  ["neighbors", "Vizinhos"],
  ["finance", "Finanças"],
  ["system", "Jogo"],
];

interface UsedOffer {
  idx: number;
  kind: "v" | "i";
  defId: string;
  wear: number;
  price: number;
}

const MAX_WORKERS = 6;

/** Menus recolhíveis. Cada aba é renderizada a partir do estado atual; ações usam data-act. */
export class Menus {
  tab: MenuTab = "map";
  private body!: HTMLElement;
  form = { workerId: 0, vehicleId: 0, fieldId: 0, op: "" as WorkOp | "", crop: "wheat" as CropId };
  private mapCanvas: HTMLCanvasElement | null = null;
  private mapState = { cx: 700, cy: 500, scale: 1.6, selected: null as number | null };
  private confirmNew = false;

  constructor(
    private game: Game,
    private ui: UI,
    private root: HTMLElement,
  ) {}

  open(tab: MenuTab, opts: Record<string, number>): void {
    this.tab = tab;
    if (opts.vehicleId) this.form.vehicleId = opts.vehicleId;
    if (opts.fieldId) this.mapState.selected = opts.fieldId;
    if (tab === "map") {
      const w = this.game.world;
      this.mapState.cx = w.player.x;
      this.mapState.cy = w.player.y;
    }
    this.root.innerHTML = `<div class="menu-panel"><nav>${MENU_TABS.map(([id, label]) => `<button data-act="tab:${id}" class="${id === tab ? "on" : ""}">${label}</button>`).join("")}<button class="close" data-act="close:">✕</button></nav><section class="menu-body"></section></div>`;
    this.body = this.root.querySelector(".menu-body")!;
    this.render();
  }

  live(): void {
    const active = document.activeElement;
    if (active && this.root.contains(active) && (active.tagName === "SELECT" || active.tagName === "INPUT")) return;
    if (this.tab === "map") {
      this.drawMapCanvas();
      return;
    }
    this.render();
  }

  private render(): void {
    const scroll = this.body.scrollTop;
    const html = this[this.tab]();
    this.body.innerHTML = html;
    this.body.scrollTop = scroll;
    if (this.tab === "map") this.setupMap();
    this.body.querySelectorAll<HTMLSelectElement>("select[data-form]").forEach((s) =>
      s.addEventListener("change", () => {
        const k = s.dataset.form as keyof Menus["form"];
        (this.form as Record<string, unknown>)[k] = k === "op" || k === "crop" ? s.value : Number(s.value);
        if (k === "vehicleId") this.form.op = "";
        this.render();
      }),
    );
  }

  handle(kind: string, arg: string, _target?: HTMLElement): void {
    const g = this.game;
    const w = g.world;
    const t = w.time;
    const ok = (msg: string) => w.notify(msg, "good");
    const bad = (msg: string) => w.notify(msg, "bad");
    switch (kind) {
      case "tab":
        this.open(arg as MenuTab, {});
        return;
      case "close":
        this.ui.closeMenu();
        return;
      case "buy": {
        const [type, defId, mode] = arg.split(":");
        const def = type === "v" ? VEHICLES[defId] : IMPLEMENTS[defId];
        if (!def) return;
        const total = def.price + BALANCE.deliveryFee;
        if (mode === "fin") {
          const down = def.price * BALANCE.financingDownPayment + BALANCE.deliveryFee;
          const loan = def.price - def.price * BALANCE.financingDownPayment;
          if (w.economy.loan + loan > BALANCE.loanMax) return bad("Limite de crédito insuficiente para financiar.");
          if (!w.economy.spend(down, `Entrada · ${def.name}`, "máquinas", t)) return bad("Sem dinheiro para a entrada.");
          w.economy.loan += loan;
          w.economy.ledger.push({ day: t.day, minute: t.minute, text: `Financiamento · ${def.name}`, amount: 0, cat: "empréstimo" });
        } else if (!w.economy.spend(total, `Compra · ${def.name}`, "máquinas", t)) return bad("Dinheiro insuficiente.");
        this.deliver(type as "v" | "i", defId);
        ok(`${def.name} entregue na sede.`);
        break;
      }
      case "used": {
        const offer = this.usedOffers().find((o) => o.idx === Number(arg));
        if (!offer || w.flags[`used_${t.day}_${offer.idx}`]) return;
        if (!w.economy.spend(offer.price + BALANCE.deliveryFee, `Compra usada · ${offer.defId}`, "máquinas", t)) return bad("Dinheiro insuficiente.");
        const e = this.deliver(offer.kind, offer.defId);
        e.wear = offer.wear;
        w.flags[`used_${t.day}_${offer.idx}`] = true;
        ok("Máquina usada entregue na sede.");
        break;
      }
      case "rent": {
        const def = VEHICLES[arg];
        if (!def?.rentPerHour) return;
        if (!w.economy.spend(BALANCE.rentalFee + BALANCE.deliveryFee, `Aluguel · ${def.name}`, "aluguel", t)) return bad("Dinheiro insuficiente para o aluguel.");
        const v = this.deliver("v", def.id) as ReturnType<typeof w.addVehicle>;
        v.rented = true;
        v.fuel = def.fuelCapacity;
        ok(`${def.name} alugada e entregue na sede. Cobrança: ${money(def.rentPerHour)} por hora de motor ligado. Devolva pela aba Frota.`);
        break;
      }
      case "sellV": {
        const v = w.vehicle(Number(arg));
        if (!v) return;
        if (w.player.vehicleId === v.id || v.driver || w.workers.some((x) => x.tasks.some((k) => (k.status === "active" || k.status === "queued") && k.vehicleId === v.id))) return bad("Máquina em uso.");
        if (v.implementId) detach(w, v);
        if (v.rented) {
          w.vehicles = w.vehicles.filter((x) => x !== v);
          ok(`${v.def.name} devolvida à concessionária.`);
        } else {
          const value = v.def.price * BALANCE.resaleFactor * (1 - v.wear * 0.5);
          w.economy.earn(value, `Venda · ${v.def.name}`, "máquinas", t);
          w.vehicles = w.vehicles.filter((x) => x !== v);
          ok(`${v.def.name} vendida por ${money(value)}.`);
        }
        break;
      }
      case "sellI": {
        const im = w.implement(Number(arg));
        if (!im) return;
        const holder = w.vehicle(im.attachedTo);
        if (holder && (holder.driver || w.player.vehicleId === holder.id)) return bad("Implemento em uso.");
        if (holder) detach(w, holder);
        const value = im.def.price * BALANCE.resaleFactor * (1 - im.wear * 0.5);
        w.economy.earn(value, `Venda · ${im.def.name}`, "máquinas", t);
        w.implements = w.implements.filter((x) => x !== im);
        ok(`${im.def.name} vendido por ${money(value)}.`);
        break;
      }
      case "watch": {
        g.watchId = Number(arg);
        g.watchField = null;
        this.ui.closeMenu();
        return;
      }
      case "showField": {
        g.watchField = Number(arg);
        g.watchId = null;
        g.renderer.camera.targetZoom = 2.6;
        this.ui.closeMenu();
        return;
      }
      case "selField":
        this.mapState.selected = Number(arg);
        break;
      case "buyField": {
        const f = w.field(Number(arg));
        if (!f || f.owner !== null) return;
        if (!w.economy.spend(f.price, `Compra de terra · ${f.name}`, "terras", t)) return bad("Dinheiro insuficiente. Considere arrendar ou pedir empréstimo.");
        f.owner = "player";
        f.leased = false;
        ok(`${f.name} agora é seu.`);
        break;
      }
      case "leaseField": {
        const f = w.field(Number(arg));
        if (!f || f.owner !== null) return;
        f.owner = "player";
        f.leased = true;
        ok(`${f.name} arrendado: ${money(f.areaHa * BALANCE.leaseDailyPerHa)} por dia.`);
        break;
      }
      case "releaseField": {
        const f = w.field(Number(arg));
        if (!f || f.owner !== "player") return;
        if (w.workers.some((x) => x.owner === "player" && x.tasks.some((k) => (k.status === "active" || k.status === "queued") && k.fieldId === f.id))) return bad("Há tarefas neste campo.");
        if (!f.leased) {
          const value = f.price * 0.9;
          w.economy.earn(value, `Venda de terra · ${f.name}`, "terras", t);
          ok(`${f.name} vendido por ${money(value)}.`);
        } else ok(`Arrendamento de ${f.name} encerrado.`);
        f.owner = null;
        f.leased = false;
        break;
      }
      case "hire": {
        const c = w.candidates[Number(arg)];
        if (!c) return;
        if (w.workers.filter((x) => x.owner === "player").length >= MAX_WORKERS) return bad("Limite de funcionários atingido.");
        const wk = hireWorker(w, c);
        w.candidates.splice(Number(arg), 1);
        this.form.workerId = wk.id;
        ok(`${wk.name} contratado(a).`);
        break;
      }
      case "fire": {
        const wk = w.worker(Number(arg));
        if (!wk) return;
        if (wk.vehicleId && w.player.vehicleId === wk.vehicleId) return bad("Saia da máquina antes de demitir.");
        fireWorker(w, wk);
        ok(`${wk.name} foi dispensado(a).`);
        break;
      }
      case "assign": {
        const f = this.form;
        const wk = w.worker(f.workerId);
        const v = w.vehicle(f.vehicleId);
        if (!wk || !v || !f.fieldId) return bad("Escolha funcionário, máquina e campo.");
        const ops = opsFor(w, v);
        const op = (f.op || ops[0]) as WorkOp;
        const r = assignTask(w, wk, v.id, f.fieldId, op, op === "plant" ? f.crop : undefined);
        if (!r.ok) return bad(r.reason ?? "Não foi possível atribuir.");
        ok(`${wk.name}: ${OP_LABEL[op]} em ${w.field(f.fieldId)?.name}. Acompanhe pelo mapa ou siga a máquina.`);
        break;
      }
      case "cancelTask": {
        const [wid, tid] = arg.split(":").map(Number);
        const wk = w.worker(wid);
        if (wk) cancelTask(w, wk, tid);
        break;
      }
      case "borrow":
        if (!w.economy.borrow(BALANCE.loanStep, t)) bad("Limite de crédito atingido.");
        break;
      case "repay":
        if (!w.economy.repay(BALANCE.loanStep, t)) bad("Nada a pagar ou sem saldo.");
        break;
      case "save":
        g.save(true);
        break;
      case "newGame":
        if (!this.confirmNew) {
          this.confirmNew = true;
          break;
        }
        localStorage.removeItem("terrafirme.save");
        location.reload();
        return;
      case "title":
        g.exitToTitle();
        return;
      case "quality":
        g.renderer.fieldBudget = g.renderer.fieldBudget > 60000 ? 50000 : 140000;
        g.renderer.particles.quality = g.renderer.particles.quality > 0.6 ? 0.4 : 1;
        break;
      case "zoomMap":
        this.mapState.scale = Math.max(0.4, Math.min(3, this.mapState.scale * Number(arg)));
        this.drawMapCanvas();
        return;
    }
    this.render();
  }

  private deliver(type: "v" | "i", defId: string) {
    const w = this.game.world;
    const spot = w.freeParking("player", 5);
    if (type === "v") {
      const v = w.addVehicle(defId, "player", spot.x, spot.y, spot.heading);
      v.fuel = v.def.fuelCapacity;
      return v;
    }
    return w.addImplement(defId, "player", spot.x, spot.y, spot.heading);
  }

  usedOffers(): UsedOffer[] {
    const w = this.game.world;
    const d = w.time.day;
    const pool = [...Object.keys(VEHICLES).filter((k) => VEHICLES[k].category !== "combine").map((k) => ["v", k] as const), ...Object.keys(IMPLEMENTS).map((k) => ["i", k] as const)];
    const out: UsedOffer[] = [];
    for (let i = 0; i < 3; i++) {
      const [kind, id] = pool[Math.floor(hash2(d, i * 17 + 3, w.seed) * pool.length)];
      const def = kind === "v" ? VEHICLES[id] : IMPLEMENTS[id];
      const wear = 0.2 + hash2(d, i * 17 + 4, w.seed) * 0.4;
      const price = Math.round((def.price * (0.48 + hash2(d, i * 17 + 5, w.seed) * 0.18)) / 100) * 100;
      out.push({ idx: i, kind, defId: id, wear, price });
    }
    return out;
  }

  private locationOf(x: number, y: number): string {
    const w = this.game.world;
    const f = w.fieldAt(x, y);
    if (f) return f.name;
    let best = "";
    let bd = Infinity;
    for (const p of w.map.places) {
      const d = dist(p, { x, y });
      if (d < bd) {
        bd = d;
        best = p.name;
      }
    }
    return bd < 80 ? best : `perto de ${best}`;
  }

  // ------------------------------------------------------------------ abas

  private map(): string {
    const w = this.game.world;
    const f = this.mapState.selected ? w.field(this.mapState.selected) : undefined;
    let side = `<p class="muted">Toque num campo para ver detalhes. Amarelo: seus campos. Tracejado branco: à venda. Setas: máquinas (azul = operador).</p>`;
    if (f) side = this.fieldCard(f.id);
    return `<div class="map-wrap"><div class="map-box"><canvas class="bigmap"></canvas><div class="map-zoom"><button data-act="zoomMap:0.7">+</button><button data-act="zoomMap:1.4">−</button></div></div><aside>${side}</aside></div>`;
  }

  private setupMap(): void {
    const c = this.body.querySelector<HTMLCanvasElement>(".bigmap");
    if (!c) return;
    this.mapCanvas = c;
    const r = c.getBoundingClientRect();
    c.width = Math.max(200, Math.round(r.width));
    c.height = Math.max(200, Math.round(r.height));
    let drag: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
    c.onpointerdown = (e) => {
      drag = { x: e.clientX, y: e.clientY, cx: this.mapState.cx, cy: this.mapState.cy, moved: false };
      c.setPointerCapture(e.pointerId);
    };
    c.onpointermove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      this.mapState.cx = drag.cx - dx * this.mapState.scale;
      this.mapState.cy = drag.cy - dy * this.mapState.scale;
      this.drawMapCanvas();
    };
    c.onpointerup = (e) => {
      if (drag && !drag.moved) {
        const rect = c.getBoundingClientRect();
        const wx = (e.clientX - rect.left - c.width / 2) * this.mapState.scale + this.mapState.cx;
        const wy = (e.clientY - rect.top - c.height / 2) * this.mapState.scale + this.mapState.cy;
        const f = this.game.world.fieldAt(wx, wy);
        this.mapState.selected = f ? f.id : null;
        this.render();
      }
      drag = null;
    };
    c.onwheel = (e) => {
      e.preventDefault();
      this.mapState.scale = Math.max(0.4, Math.min(3, this.mapState.scale * (e.deltaY > 0 ? 1.15 : 0.87)));
      this.drawMapCanvas();
    };
    this.drawMapCanvas();
  }

  private drawMapCanvas(): void {
    const c = this.mapCanvas;
    if (!c || !c.isConnected) return;
    drawMap(c.getContext("2d")!, c.width, c.height, this.game.world, this.game.renderer, { cx: this.mapState.cx, cy: this.mapState.cy, scale: this.mapState.scale, selectedField: this.mapState.selected, labels: true });
  }

  private fieldCard(id: number): string {
    const w = this.game.world;
    const f = w.field(id)!;
    const s = f.summary();
    const crop = cropByIndex(s.cropIndex);
    const owner = f.owner === "player" ? (f.leased ? "Você (arrendado)" : "Você") : f.owner ? w.farmOf(f.owner).name : "À venda";
    const growth = s.stage === 3 ? ` · ${Math.min(100, Math.round(s.growth * 100))}% do ciclo${s.growth >= 1 ? " (pronto para colher)" : ""}` : "";
    const ops: WorkOp[] = ["cultivate", "plant", "harvest"];
    let btns = `<button data-act="showField:${f.id}">Ver no mundo</button>`;
    if (f.owner === null)
      btns += `<button class="primary" data-act="buyField:${f.id}">Comprar · ${money(f.price)}</button><button data-act="leaseField:${f.id}">Arrendar · ${money(f.areaHa * BALANCE.leaseDailyPerHa)}/dia</button>`;
    else if (f.owner === "player") btns += `<button data-act="releaseField:${f.id}">${f.leased ? "Encerrar arrendamento" : `Vender · ${money(f.price * 0.9)}`}</button>`;
    return `<div class="card"><h3>${f.name}</h3><p>${f.areaHa.toFixed(2)} ha · ${owner}</p><p><b>${STAGE_LABEL[s.stage]}</b>${crop ? ` · ${crop.name}` : ""}${growth}</p><div class="mini-bars">${ops.map((op) => `<div><span>${OP_LABEL[op]}</span><i style="width:${Math.round(opProgress(f, op) * 100)}%"></i><em>${Math.round(opProgress(f, op) * 100)}%</em></div>`).join("")}</div><div class="btns">${btns}</div></div>`;
  }

  private fields(): string {
    const w = this.game.world;
    const rows = [...w.fields].sort((a, b) => (a.owner === "player" ? -1 : 0) - (b.owner === "player" ? -1 : 0) || (a.owner === null ? -1 : 0) - (b.owner === null ? -1 : 0));
    return `<h2>Campos</h2><p class="muted">Compre ou arrende terras para expandir. Os vizinhos também compram — terras disponíveis valorizam quando eles expandem.</p><div class="grid">${rows.map((f) => this.fieldCard(f.id)).join("")}</div>`;
  }

  private fleet(): string {
    const w = this.game.world;
    const vs = w.vehicles.filter((v) => v.owner === "player");
    const is = w.implements.filter((i) => i.owner === "player");
    const vRows = vs
      .map((v) => {
        const im = w.implement(v.implementId);
        const wk = w.worker(v.workerId);
        const status = w.player.vehicleId === v.id ? "Você está dirigindo" : wk ? `${wk.name}: ${wk.note}` : "Parado";
        const cargo = v.cargo ? ` · ${kgLabel(v.cargo.kg)}` : "";
        return `<tr><td><b>${v.def.name}</b>${v.rented ? ' <span class="tag">alugado</span>' : ""}<br><small>${im ? `+ ${im.def.name}` : "sem implemento"}</small></td><td>${this.locationOf(v.x, v.y)}<br><small>${status}</small></td><td>${Math.round(v.fuel)} L${cargo}<br><small>Integridade ${Math.round((1 - v.wear) * 100)}%</small></td><td class="btns"><button data-act="watch:${v.id}">Seguir</button><button data-act="sellV:${v.id}">${v.rented ? "Devolver" : `Vender ${money(v.def.price * BALANCE.resaleFactor * (1 - v.wear * 0.5))}`}</button></td></tr>`;
      })
      .join("");
    const iRows = is
      .map((i) => {
        const holder = w.vehicle(i.attachedTo);
        const fill = i.def.seedCapacityKg ? `${Math.round(i.seedKg)} kg ${CROPS[i.seedCrop].name}` : i.cargo ? kgLabel(i.cargo.kg) : i.def.liquidCapacityL ? `${Math.round(i.liquidL)} L` : "";
        return `<tr><td><b>${i.def.name}</b><br><small>${i.def.workWidth ? `${i.def.workWidth} m · ${i.def.powerHp} cv mín.` : `${kgLabel(i.def.cargoKg ?? 0)}`}</small></td><td>${holder ? `engatado em ${holder.def.name}` : this.locationOf(i.x, i.y)}</td><td>${fill}<br><small>Integridade ${Math.round((1 - i.wear) * 100)}%</small></td><td class="btns"><button data-act="sellI:${i.id}">Vender ${money(i.def.price * BALANCE.resaleFactor * (1 - i.wear * 0.5))}</button></td></tr>`;
      })
      .join("");
    return `<h2>Sua frota</h2><table><thead><tr><th>Veículo</th><th>Local</th><th>Estado</th><th></th></tr></thead><tbody>${vRows || '<tr><td colspan="4">Nenhum veículo</td></tr>'}</tbody></table><h3>Implementos</h3><table><tbody>${iRows || '<tr><td colspan="4">Nenhum implemento</td></tr>'}</tbody></table><p class="muted">Compras novas, usados e aluguel na aba Concessionária. Reparos: leve a máquina à oficina da sede (zona azul) ou ao pátio da concessionária.</p>`;
  }

  private dealer(): string {
    const w = this.game.world;
    const vCards = Object.values(VEHICLES)
      .map((d) => {
        const spec = d.combine ? `Plataforma ${d.combine.headerWidth} m · tanque ${kgLabel(d.cargoKg ?? 0)}` : d.cargoKg ? `Caçamba ${kgLabel(d.cargoKg)} · ${d.maxSpeedKmh} km/h` : `${d.sizeClass} · ${d.maxSpeedKmh} km/h · tanque ${d.fuelCapacity} L`;
        const rent = d.rentPerHour ? `<button data-act="rent:${d.id}">Alugar · ${money(BALANCE.rentalFee)} + ${money(d.rentPerHour)}/h motor</button>` : "";
        return `<div class="card shop"><h3>${d.name}</h3><p><small>${d.brand} · ${d.powerHp} cv</small><br>${spec}</p><p class="price">${money(d.price)}</p><div class="btns"><button class="primary" data-act="buy:v:${d.id}:cash">Comprar</button><button data-act="buy:v:${d.id}:fin">Financiar (25% entrada)</button>${rent}</div></div>`;
      })
      .join("");
    const iCards = Object.values(IMPLEMENTS)
      .map((d) => {
        const spec = d.cargoKg ? `Carga ${kgLabel(d.cargoKg)}` : `${d.workWidth} m · ${d.workSpeedKmh} km/h · ${d.op ? OP_LABEL[d.op] : ""}`;
        return `<div class="card shop"><h3>${d.name}</h3><p><small>Engate ${d.hitch === "3pt" ? "3 pontos" : "barra de tração"} · exige ${d.powerHp} cv</small><br>${spec}${d.seedCapacityKg ? ` · ${d.seedCapacityKg} kg sementes` : ""}${d.liquidCapacityL ? ` · ${d.liquidCapacityL} L` : ""}</p><p class="price">${money(d.price)}</p><div class="btns"><button class="primary" data-act="buy:i:${d.id}:cash">Comprar</button><button data-act="buy:i:${d.id}:fin">Financiar</button></div></div>`;
      })
      .join("");
    const used = this.usedOffers()
      .map((o) => {
        const def = o.kind === "v" ? VEHICLES[o.defId] : IMPLEMENTS[o.defId];
        const sold = w.flags[`used_${w.time.day}_${o.idx}`];
        return `<div class="card shop used"><h3>${def.name} <span class="tag">usado</span></h3><p>Integridade ${Math.round((1 - o.wear) * 100)}% · novo: ${money(def.price)}</p><p class="price">${money(o.price)}</p><div class="btns">${sold ? "<em>Vendido</em>" : `<button class="primary" data-act="used:${o.idx}">Comprar usado</button>`}</div></div>`;
      })
      .join("");
    return `<h2>Concessionária Campo Forte</h2><p class="muted">Entrega na sede por ${money(BALANCE.deliveryFee)}. Financiamento soma ao empréstimo (juros de ${(BALANCE.loanDailyRate * 100).toFixed(1)}% ao dia). Ofertas de usados mudam todo dia.</p><h3>Usados de hoje</h3><div class="grid">${used}</div><h3>Veículos</h3><div class="grid">${vCards}</div><h3>Implementos</h3><div class="grid">${iCards}</div>`;
  }

  private workers(): string {
    const w = this.game.world;
    const mine = w.workers.filter((x) => x.owner === "player");
    if (!this.form.workerId && mine.length) this.form.workerId = mine[0].id;
    const vehicles = w.vehicles.filter((v) => v.owner === "player" && opsFor(w, v).length);
    if (!vehicles.find((v) => v.id === this.form.vehicleId)) this.form.vehicleId = vehicles[0]?.id ?? 0;
    const myFields = w.fields.filter((f) => f.owner === "player");
    if (!myFields.find((f) => f.id === this.form.fieldId)) this.form.fieldId = myFields[0]?.id ?? 0;
    const v = w.vehicle(this.form.vehicleId);
    const ops = v ? opsFor(w, v) : [];
    const op = (this.form.op || ops[0]) as WorkOp | undefined;
    const list = mine
      .map((wk) => {
        const tasks = wk.tasks
          .filter((t) => t.status === "active" || t.status === "queued")
          .map((t) => `<li>${t.status === "active" ? "▶" : "•"} ${OP_LABEL[t.op]} · ${w.field(t.fieldId)?.name} · ${w.vehicle(t.vehicleId)?.def.name ?? "?"} · ${Math.round(t.progress * 100)}% <button class="link" data-act="cancelTask:${wk.id}:${t.id}">cancelar</button></li>`)
          .join("");
        const recent = wk.tasks
          .filter((t) => t.status === "done" || t.status === "failed")
          .slice(-2)
          .map((t) => `<li class="muted">${t.status === "done" ? "✓" : "✗"} ${OP_LABEL[t.op]} · ${w.field(t.fieldId)?.name}${t.reason ? ` (${t.reason})` : ""}</li>`)
          .join("");
        return `<div class="card"><h3>${wk.name}</h3><p><small>Especialidade: ${OP_LABEL[wk.specialty]} · eficiência ${Math.round(wk.skill * 100)}% · ${money(wk.salary)}/h de trabalho</small></p><p><b>${wk.note}</b></p><ul class="tasks">${tasks || '<li class="muted">Sem tarefas na fila</li>'}${recent}</ul><div class="btns">${wk.vehicleId ? `<button data-act="watch:${wk.vehicleId}">Seguir máquina</button>` : ""}<button data-act="fire:${wk.id}">Dispensar</button></div></div>`;
      })
      .join("");
    const form = mine.length
      ? `<div class="card form"><h3>Nova tarefa</h3>
        <label>Funcionário<select data-form="workerId">${mine.map((x) => `<option value="${x.id}" ${x.id === this.form.workerId ? "selected" : ""}>${x.name}</option>`).join("")}</select></label>
        <label>Máquina<select data-form="vehicleId">${vehicles.map((x) => `<option value="${x.id}" ${x.id === this.form.vehicleId ? "selected" : ""}>${x.def.name}${w.implement(x.implementId) ? ` + ${w.implement(x.implementId)!.def.name}` : ""}</option>`).join("") || "<option>Nenhuma máquina equipada</option>"}</select></label>
        <label>Campo<select data-form="fieldId">${myFields.map((f) => `<option value="${f.id}" ${f.id === this.form.fieldId ? "selected" : ""}>${f.name} (${f.areaHa.toFixed(2)} ha)</option>`).join("")}</select></label>
        <label>Operação<select data-form="op">${ops.map((o) => `<option value="${o}" ${o === op ? "selected" : ""}>${OP_LABEL[o]}</option>`).join("") || "<option>—</option>"}</select></label>
        ${op === "plant" ? `<label>Cultura<select data-form="crop">${CROP_LIST.map((c) => `<option value="${c.id}" ${c.id === this.form.crop ? "selected" : ""}>${c.name}</option>`).join("")}</select></label>` : ""}
        <p class="muted">A máquina precisa estar equipada com o implemento da operação. O operador vai até ela a pé, segue pelas estradas, trabalha em faixas e busca sementes/diesel na sede quando faltar.</p>
        <div class="btns"><button class="primary" data-act="assign:">Adicionar à fila</button></div></div>`
      : "";
    const cands = w.candidates
      .map((c, i) => `<div class="card"><h3>${c.name}</h3><p>Especialidade: ${OP_LABEL[c.specialty]}<br>Eficiência ${Math.round(c.skill * 100)}% · ${money(c.salary)}/h</p><div class="btns"><button class="primary" data-act="hire:${i}">Contratar</button></div></div>`)
      .join("");
    return `<h2>Funcionários</h2><div class="grid">${list}${form}</div><h3>Candidatos de hoje</h3><p class="muted">Salário cobrado por hora de trabalho efetivo (1 min real = 1 h de operação).</p><div class="grid">${cands || '<p class="muted">Novos candidatos amanhã.</p>'}</div>`;
  }

  private market(): string {
    const w = this.game.world;
    const st = w.storage;
    const stock = CROP_LIST.map((c) => `<tr><td>${c.name}</td><td>${kgLabel(st.stock[c.id])}</td></tr>`).join("");
    const buyers = w.map.buyers;
    const priceRows = CROP_LIST.map((c) => {
      const cells = buyers
        .map((b) => {
          if (!b.accepts.includes(c.id)) return "<td class='muted'>não compra</td>";
          const p = w.economy.price(b.id, c.id, w.time) * 1000;
          const y = w.economy.priceOnDay(b.id, c.id, w.time.day - 1) * 1000;
          const arrow = p > y * 1.01 ? "▲" : p < y * 0.99 ? "▼" : "■";
          const hist = Array.from({ length: 7 }, (_, k) => w.economy.priceOnDay(b.id, c.id, w.time.day - 6 + k) * 1000);
          const lo = Math.min(...hist);
          const hi = Math.max(...hist);
          const spark = hist.map((h, k) => `${k * 8},${16 - ((h - lo) / Math.max(1, hi - lo)) * 14}`).join(" ");
          return `<td><b>${money(p)}</b>/t <span class="${arrow === "▲" ? "up" : arrow === "▼" ? "down" : ""}">${arrow}</span><svg class="spark" viewBox="0 0 48 18" width="48" height="18"><polyline points="${spark}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></td>`;
        })
        .join("");
      return `<tr><td>${c.name}<br><small>semente ${money(c.seedPricePerKg)}/kg</small></td>${cells}</tr>`;
    }).join("");
    const events = w.economy.events.filter((e) => e.untilDay >= w.time.day).map((e) => `<li>${e.text} (até ${dateLabel(e.untilDay)})</li>`).join("");
    const forecast = [1, 2, 3].map((k) => {
      const d = dayWeather(w.seed, w.time.day + k);
      return `<li>${dateLabel(w.time.day + k)}: ${forecastLabel(d)} · ${Math.round(d.tMin)}–${Math.round(d.tMax)}°C</li>`;
    });
    const dist = (id: string) => {
      const z = w.map.zones.find((zz) => zz.buyerId === id);
      return z ? `${Math.round(Math.hypot(z.x - w.farmOf("player").x, z.y - w.farmOf("player").y))} m da sede` : "";
    };
    return `<h2>Armazém e mercado</h2><div class="grid two"><div class="card"><h3>Silo da sede</h3><p>${kgLabel(st.total())} de ${kgLabel(st.capacity)}</p><table><tbody>${stock}</tbody></table><p class="muted">Bascule a carreta na moega amarela do silo para guardar; use “Carregar do silo” com a carreta sobre a moega para retirar e vender quando o preço subir.</p></div>
      <div class="card"><h3>Previsão</h3><ul>${forecast.join("")}</ul><h3>Mercado</h3><ul>${events || "<li class='muted'>Sem eventos ativos</li>"}</ul></div></div>
      <h3>Preços por tonelada</h3><table><thead><tr><th>Cultura</th>${buyers.map((b) => `<th>${b.name}<br><small>${dist(b.id)}</small></th>`).join("")}</tr></thead><tbody>${priceRows}</tbody></table>
      <p class="muted">O moinho paga mais por trigo e milho, mas fica no outro extremo da estrada: compare o ganho com o tempo, o diesel e o desgaste da viagem.</p>`;
  }

  private neighbors(): string {
    const w = this.game.world;
    const goals: Record<string, string> = { expandir: "Expandir terras", frota: "Modernizar a frota", rendimento: "Rendimento estável" };
    return `<h2>Fazendas vizinhas</h2><p class="muted">Os vizinhos plantam, colhem e vendem com máquinas e funcionários reais no mapa. Quando têm caixa, compram terras e máquinas.</p><div class="grid">${w.npcs
      .map((n) => {
        const fields = w.fields.filter((f) => f.owner === n.owner);
        const fleet = w.vehicles.filter((v) => v.owner === n.owner);
        const staff = w.workers.filter((x) => x.owner === n.owner);
        return `<div class="card"><h3 style="color:${n.color}">${n.name}</h3><p>Objetivo: ${goals[n.goal]} · Caixa ${money(n.cash)}</p><p>${fields.length} campos (${fields.reduce((a, f) => a + f.areaHa, 0).toFixed(1)} ha) · ${fleet.length} máquinas</p><ul class="tasks">${staff.map((s) => `<li>${s.name}: ${s.note}</li>`).join("")}</ul><ul class="tasks muted">${n.history.slice(0, 4).map((h) => `<li>${h}</li>`).join("")}</ul><div class="btns">${fleet.slice(0, 3).map((v) => `<button data-act="watch:${v.id}">Ver ${v.def.name}</button>`).join("")}</div></div>`;
      })
      .join("")}</div>`;
  }

  private finance(): string {
    const w = this.game.world;
    const e = w.economy;
    const today = e.ledger.filter((l) => l.day === w.time.day);
    const byCat = new Map<string, number>();
    for (const l of today) byCat.set(l.cat, (byCat.get(l.cat) ?? 0) + l.amount);
    const rows = [...e.ledger]
      .reverse()
      .slice(0, 40)
      .map((l) => `<tr><td><small>${dateLabel(l.day).split(" · ")[0]} ${String(Math.floor(l.minute / 60)).padStart(2, "0")}h</small></td><td>${l.text}</td><td>${l.cat}</td><td class="${l.amount >= 0 ? "up" : "down"}">${money(l.amount)}</td></tr>`)
      .join("");
    return `<h2>Finanças</h2><div class="grid two"><div class="card"><h3>Caixa ${money(e.money)}</h3><p>Empréstimo: <b>${money(e.loan)}</b> de ${money(BALANCE.loanMax)} · juros ${(BALANCE.loanDailyRate * 100).toFixed(1)}%/dia (${money(e.loan * BALANCE.loanDailyRate)} amanhã)</p><div class="btns"><button data-act="borrow:">Pegar ${money(BALANCE.loanStep)}</button><button data-act="repay:">Pagar ${money(BALANCE.loanStep)}</button></div></div><div class="card"><h3>Hoje</h3><ul>${[...byCat.entries()].map(([k, v]) => `<li>${k}: <b class="${v >= 0 ? "up" : "down"}">${money(v)}</b></li>`).join("") || "<li class='muted'>Sem movimentos</li>"}</ul></div></div><h3>Lançamentos</h3><table><tbody>${rows}</tbody></table>`;
  }

  private system(): string {
    const g = this.game;
    return `<h2>Jogo</h2><div class="grid two"><div class="card"><h3>Salvar</h3><p class="muted">Salvamento automático a cada ${BALANCE.autosaveSeconds}s e ao sair. Campos, máquinas, combustível, cargas, funcionários e economia são persistidos localmente.</p><div class="btns"><button class="primary" data-act="save:">Salvar agora</button><button data-act="title:">Voltar ao título</button><button data-act="newGame:">${this.confirmNew ? "Confirmar: apagar e recomeçar" : "Novo jogo"}</button></div></div>
    <div class="card"><h3>Desempenho</h3><p>${g.loop.fps.toFixed(0)} FPS · ${g.renderer.particles.count} partículas</p><div class="btns"><button data-act="quality:">Qualidade: ${g.renderer.particles.quality > 0.6 ? "alta" : "econômica"}</button></div></div>
    <div class="card"><h3>Controles</h3><ul class="keys"><li><kbd>WASD</kbd>/<kbd>setas</kbd> andar, acelerar, ré e esterçar</li><li><kbd>Espaço</kbd> freio · <kbd>Shift</kbd> correr a pé</li><li><kbd>E</kbd> entrar/sair · <kbd>I</kbd> motor · <kbd>Q</kbd> engatar/desengatar</li><li><kbd>V</kbd> baixar/levantar implemento ou plataforma</li><li><kbd>G</kbd> tubo da colheitadeira / bascular carreta</li><li><kbd>L</kbd> carregar do silo · <kbd>R</kbd> diesel · <kbd>T</kbd> sementes · <kbd>C</kbd> trocar cultura · <kbd>F</kbd> reparar</li><li><kbd>H</kbd> operador · <kbd>M</kbd> mapa · <kbd>roda</kbd>/<kbd>+ −</kbd> zoom</li><li>No celular: joystick à esquerda, botões de ação à direita, pinça para zoom.</li></ul></div></div>`;
  }
}
