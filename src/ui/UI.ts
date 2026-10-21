import { BALANCE } from "../config/balance";
import { kmh } from "../data/machines";
import { CROPS } from "../data/crops";
import { kgLabel, money } from "../systems/Economy";
import { clockLabel, dateLabel, daylight } from "../systems/TimeSystem";
import { dayWeather, forecastLabel, weatherLabel } from "../systems/Weather";
import type { Game } from "../game/Game";
import { OBJECTIVES } from "../game/Objectives";
import { ICON, weatherIcon } from "./icons";
import { drawMap } from "./Minimap";
import { MENU_TABS, Menus, type MenuTab } from "./Menus";

function el<T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string): T {
  const e = root.querySelector(sel);
  if (!e) throw new Error(`Elemento ausente: ${sel}`);
  return e as T;
}

function bar(frac: number, color: string): string {
  const f = Math.max(0, Math.min(1, frac));
  return `<span class="bar"><i style="width:${(f * 100).toFixed(1)}%;background:${color}"></i></span>`;
}

/** HUD contextual + menus. Atualiza o DOM só quando o conteúdo muda. */
export class UI {
  private top: HTMLElement;
  private moneyEl: HTMLElement;
  private clockEl: HTMLElement;
  private dateEl: HTMLElement;
  private weatherEl: HTMLElement;
  private speedBtns: HTMLElement;
  private vpanel: HTMLElement;
  private actionsEl: HTMLElement;
  private hintEl: HTMLElement;
  private noticesEl: HTMLElement;
  private objEl: HTMLElement;
  private mini: HTMLCanvasElement;
  private menuEl: HTMLElement;
  readonly menus: Menus;
  private lastActionsSig = "";
  private lastVpanel = "\u0000";
  private lastObj = "";
  private shownNotices = new Set<number>();
  private miniTimer = 0;
  menuOpen: MenuTab | null = null;
  private menuTimer = 0;
  objCollapsed = false;

  constructor(
    private game: Game,
    root: HTMLElement,
  ) {
    root.innerHTML = `
      <div class="topbar">
        <div class="tb tb-money">${ICON.coin}<b data-id="money"></b></div>
        <div class="tb tb-time"><b data-id="clock"></b><span data-id="date"></span></div>
        <div class="tb tb-weather" data-id="weather"></div>
        <div class="tb tb-speed" data-id="speeds"></div>
        <button class="tb-btn" data-act="menu:map" title="Mapa (M)">Mapa</button>
        <button class="tb-btn primary" data-act="menu:fleet" title="Menu">${ICON.menu}<span>Menu</span></button>
      </div>
      <canvas class="minimap" width="200" height="150" data-act="menu:map" title="Abrir mapa"></canvas>
      <div class="notices"></div>
      <div class="objectives"></div>
      <div class="vpanel"></div>
      <div class="hint"></div>
      <div class="actions"></div>
      <div class="menu hidden"></div>`;
    this.top = el(root, ".topbar");
    this.moneyEl = el(root, '[data-id="money"]');
    this.clockEl = el(root, '[data-id="clock"]');
    this.dateEl = el(root, '[data-id="date"]');
    this.weatherEl = el(root, '[data-id="weather"]');
    this.speedBtns = el(root, '[data-id="speeds"]');
    this.vpanel = el(root, ".vpanel");
    this.actionsEl = el(root, ".actions");
    this.hintEl = el(root, ".hint");
    this.noticesEl = el(root, ".notices");
    this.objEl = el(root, ".objectives");
    this.mini = el<HTMLCanvasElement>(root, ".minimap");
    this.menuEl = el(root, ".menu");
    this.menus = new Menus(game, this, this.menuEl);
    this.speedBtns.innerHTML = BALANCE.timeScales.map((s, i) => `<button data-act="speed:${i}">${s}×</button>`).join("");
    root.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
      if (!t) return;
      e.stopPropagation();
      this.dispatch(t.dataset.act!, t);
    });
    this.actionsEl.addEventListener(
      "touchstart",
      (e) => {
        const t = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
        if (!t) return;
        e.preventDefault();
        this.dispatch(t.dataset.act!, t);
      },
      { passive: false },
    );
  }

  dispatch(act: string, target?: HTMLElement): void {
    const [kind, ...rest] = act.split(":");
    const arg = rest.join(":");
    const w = this.game.world;
    switch (kind) {
      case "menu":
        this.toggleMenu(arg as MenuTab);
        return;
      case "speed":
        w.timeScaleIdx = Number(arg);
        return;
      case "action": {
        const a = this.game.actions.find((x) => x.id === arg);
        if (a) {
          a.run();
          this.game.refreshActions();
          this.lastActionsSig = "";
          this.update();
        }
        return;
      }
      case "notice": {
        const n = w.notices.find((x) => x.id === Number(arg));
        n?.action?.run();
        return;
      }
      case "obj":
        this.objCollapsed = !this.objCollapsed;
        this.lastObj = "";
        return;
      default:
        this.menus.handle(kind, arg, target);
    }
  }

  openMenu(tab: MenuTab, opts: Record<string, number> = {}): void {
    this.menuOpen = tab;
    this.menus.open(tab, opts);
    this.menuEl.classList.remove("hidden");
    document.body.classList.add("menu-open");
  }

  closeMenu(): void {
    this.menuOpen = null;
    this.menuEl.classList.add("hidden");
    document.body.classList.remove("menu-open");
  }

  toggleMenu(tab: MenuTab): void {
    if (this.menuOpen === tab) this.closeMenu();
    else this.openMenu(tab);
  }

  update(): void {
    const g = this.game;
    const w = g.world;
    this.moneyEl.textContent = money(w.economy.money);
    this.moneyEl.classList.toggle("neg", w.economy.money < 0);
    this.clockEl.textContent = clockLabel(w.time);
    this.dateEl.textContent = dateLabel(w.time.day);
    const ws = w.weather;
    const tomorrow = dayWeather(w.seed, w.time.day + 1);
    this.weatherEl.innerHTML = `${weatherIcon(ws.rain, ws.cloud, daylight(w.time) < 0.3)}<span><b>${Math.round(ws.temp)}°C</b> ${weatherLabel(ws)}<small>Amanhã: ${forecastLabel(tomorrow)}</small></span>`;
    this.speedBtns.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === w.timeScaleIdx));
    this.updateVehiclePanel();
    this.updateActions();
    this.updateNotices();
    this.updateObjectives();
    this.miniTimer += 0.1;
    if (this.miniTimer >= 0.3) {
      this.miniTimer = 0;
      const ctx = this.mini.getContext("2d")!;
      drawMap(ctx, this.mini.width, this.mini.height, w, g.renderer, { cx: w.player.x, cy: w.player.y, scale: 2.4 });
    }
    if (this.menuOpen) {
      this.menuTimer += 0.1;
      if (this.menuTimer > 1) {
        this.menuTimer = 0;
        this.menus.live();
      }
    }
    void this.top;
  }

  private updateVehiclePanel(): void {
    const w = this.game.world;
    const v = w.vehicle(w.player.vehicleId);
    let html = "";
    if (v) {
      const d = v.def;
      const im = w.implement(v.implementId);
      const sp = Math.abs(kmh(v.speed));
      const rev = v.speed < -0.1 ? " R" : "";
      let rows = `<div class="row"><span>${ICON.fuel} Diesel</span>${bar(v.fuel / d.fuelCapacity, v.fuel < d.fuelCapacity * 0.15 ? "#e0533a" : "#f2a03a")}<em>${Math.round(v.fuel)} L</em></div>`;
      rows += `<div class="row"><span>${ICON.wrench} Integridade</span>${bar(1 - v.wear, v.wear > 0.6 ? "#e0533a" : "#6fc36a")}<em>${Math.round((1 - v.wear) * 100)}%</em></div>`;
      if (v.cargo) {
        const c = v.cargo;
        rows += `<div class="row"><span>${ICON.grain} ${d.combine ? "Tanque" : "Caçamba"}</span>${bar(c.kg / c.capacity, "#e2bf6a")}<em>${kgLabel(c.kg)}${c.cropId ? " " + CROPS[c.cropId].name : ""}</em></div>`;
      }
      if (d.combine) rows += `<div class="row state"><span>Plataforma</span><b class="${v.lowered ? "on" : ""}">${v.lowered ? "Cortando" : "Levantada"}</b><b class="${v.pipeOut ? "on" : ""}">${v.unloading ? "Descarregando" : v.pipeOut ? "Tubo aberto" : "Tubo recolhido"}</b></div>`;
      if (im) {
        let fill = "";
        if (im.def.seedCapacityKg) fill = `${bar(im.seedKg / im.def.seedCapacityKg, "#9fd86b")}<em>${Math.round(im.seedKg)} kg ${CROPS[im.seedCrop].name}</em>`;
        else if (im.def.liquidCapacityL) fill = `${bar(im.liquidL / im.def.liquidCapacityL, "#7cc0ff")}<em>${Math.round(im.liquidL)} L</em>`;
        else if (im.cargo) fill = `${bar(im.cargo.kg / im.cargo.capacity, "#e2bf6a")}<em>${kgLabel(im.cargo.kg)}${im.cargo.cropId ? " " + CROPS[im.cargo.cropId].name : ""}</em>`;
        const state = im.def.op ? `<b class="${im.lowered ? "on" : ""}">${im.lowered ? "Baixado" : "Levantado"}</b>` : im.tipping ? `<b class="on">Basculando</b>` : "";
        rows += `<div class="row impl"><span>${im.def.name}</span>${state}</div>`;
        if (fill) rows += `<div class="row"><span></span>${fill}</div>`;
      }
      const wk = w.worker(v.workerId);
      const worker = wk ? `<div class="row worker">Operador: <b>${wk.name}</b> · ${wk.state === "paused" ? "aguardando na cabine" : wk.note}</div>` : "";
      html = `<div class="vp-head"><div class="speedo"><b>${sp.toFixed(0)}</b><small>km/h${rev}</small></div><div class="vp-title"><b>${d.name}</b><small>${d.brand} · ${d.powerHp} cv${v.rented ? " · alugado" : ""}${v.engineOn ? "" : " · motor desligado"}</small></div></div>${rows}${worker}`;
    } else {
      html = "";
    }
    if (html !== this.lastVpanel) {
      this.lastVpanel = html;
      this.vpanel.innerHTML = html;
      this.vpanel.classList.toggle("hidden", !html);
    }
    const hint = this.game.hint;
    if (this.hintEl.textContent !== hint) this.hintEl.textContent = hint;
    this.hintEl.classList.toggle("hidden", !hint);
  }

  private updateActions(): void {
    const acts = this.game.actions;
    const sig = acts.map((a) => a.id + a.label).join("|");
    if (sig === this.lastActionsSig) return;
    this.lastActionsSig = sig;
    this.actionsEl.innerHTML = acts
      .map((a) => `<button class="act ${a.tone ?? ""}" data-act="action:${a.id}"><kbd>${a.key.toUpperCase()}</kbd><span>${a.label}</span></button>`)
      .join("");
  }

  private updateNotices(): void {
    const w = this.game.world;
    const now = w.realTime;
    const visible = w.notices.filter((n) => now - n.time < (n.action ? 14 : 7)).slice(-4);
    const sig = visible.map((n) => n.id).join(",");
    if (this.noticesEl.dataset.sig === sig) return;
    this.noticesEl.dataset.sig = sig;
    this.noticesEl.innerHTML = visible
      .map((n) => {
        const fresh = !this.shownNotices.has(n.id);
        this.shownNotices.add(n.id);
        return `<div class="notice ${n.kind} ${fresh ? "fresh" : ""}"><span>${n.text}</span>${n.action ? `<button data-act="notice:${n.id}">${n.action.label}</button>` : ""}</div>`;
      })
      .join("");
  }

  private updateObjectives(): void {
    const w = this.game.world;
    const done = OBJECTIVES.filter((o) => w.flags[`obj_${o.id}`]).length;
    const sig = `${done}|${this.objCollapsed}`;
    if (sig === this.lastObj) return;
    this.lastObj = sig;
    if (done === OBJECTIVES.length && w.flags.objDismissed) {
      this.objEl.classList.add("hidden");
      return;
    }
    const next = OBJECTIVES.find((o) => !w.flags[`obj_${o.id}`]);
    const items = OBJECTIVES.map((o) => {
      const ok = w.flags[`obj_${o.id}`];
      return `<li class="${ok ? "ok" : o === next ? "next" : ""}">${o.text}</li>`;
    }).join("");
    this.objEl.innerHTML = `<button class="obj-head" data-act="obj:toggle"><b>Primeiro marco</b><span>${done}/${OBJECTIVES.length}</span></button>${this.objCollapsed ? (next ? `<div class="obj-next">${next.text}</div>` : "") : `<ol>${items}</ol>`}${done === OBJECTIVES.length ? `<div class="obj-done">Marco concluído! Agora expanda a fazenda: compre terras, máquinas e contrate mais operadores.</div>` : ""}`;
  }
}

export { MENU_TABS };
