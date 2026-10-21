import { BALANCE } from "../config/balance";
import { kmh } from "../data/machines";
import { CROPS } from "../data/crops";
import { kgLabel, money } from "../systems/Economy";
import { clockLabel, dateLabel, daylight } from "../systems/TimeSystem";
import { dayWeather, forecastLabel, weatherLabel } from "../systems/Weather";
import type { Game } from "../game/Game";
import { OBJECTIVES, currentObjective } from "../game/Objectives";
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
  private introEl: HTMLElement | null = null;
  private root: HTMLElement;

  constructor(
    private game: Game,
    root: HTMLElement,
  ) {
    this.root = root;
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
      <div class="zoombtns"><button data-act="zoom:in" title="Aproximar (+)">+</button><button data-act="zoom:out" title="Afastar (−)">−</button></div>
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
    this.objCollapsed = window.innerHeight < 560;
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
      case "zoom":
        this.game.renderer.camera.zoomBy(arg === "in" ? 1.35 : 1 / 1.35);
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
      case "tut":
        if (arg === "skip") w.flags.tutorialOff = true;
        else w.flags.objDismissed = true;
        this.lastObj = "";
        return;
      case "intro":
        w.flags.introSeen = true;
        if (arg === "skip") w.flags.tutorialOff = true;
        this.introEl?.remove();
        this.introEl = null;
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
    this.updateHighlights();
    this.showIntro();
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
    const next = currentObjective(w);
    const guide = this.game.guide;
    const sig = `${done}|${this.objCollapsed}|${next?.id}|${guide?.hint}|${w.flags.tutorialOff}|${w.flags.objDismissed}`;
    if (sig === this.lastObj) return;
    this.lastObj = sig;
    if (w.flags.tutorialOff || (done === OBJECTIVES.length && w.flags.objDismissed)) {
      this.objEl.classList.add("hidden");
      return;
    }
    this.objEl.classList.remove("hidden");
    if (!next) {
      this.objEl.innerHTML = `<div class="obj-head"><b>Primeiro marco concluído!</b><span>${done}/${OBJECTIVES.length}</span></div><div class="obj-done">Agora expanda a fazenda: arrende ou compre terras, contrate operadores e acompanhe os preços no mercado.</div><div class="obj-foot"><button data-act="tut:close">Fechar</button></div>`;
      return;
    }
    const idx = OBJECTIVES.indexOf(next) + 1;
    const dots = OBJECTIVES.map((o) => `<i class="${w.flags[`obj_${o.id}`] ? "ok" : o === next ? "now" : ""}"></i>`).join("");
    this.objEl.innerHTML = `<button class="obj-head" data-act="obj:toggle"><span class="step">${idx}</span><b>${next.title}</b><span class="chev">${this.objCollapsed ? "▾" : "▴"}</span></button>
      <div class="obj-hint">${guide?.hint ?? ""}</div>
      ${this.objCollapsed ? "" : `<div class="obj-why">${next.why}</div><div class="obj-dots">${dots}</div><div class="obj-foot"><span>Passo ${idx} de ${OBJECTIVES.length}</span><button data-act="tut:skip">Pular tutorial</button></div>`}`;
  }

  /** Faz piscar os botões que o passo atual do tutorial pede. */
  private updateHighlights(): void {
    const ids = new Set(this.game.guide?.highlight ?? []);
    this.root.querySelectorAll(".pulse").forEach((e) => {
      const act = (e as HTMLElement).dataset.act ?? "";
      if (!ids.has(act.replace(/^action:/, "")) && !ids.has(act)) e.classList.remove("pulse");
    });
    for (const id of ids) {
      this.root.querySelectorAll(`[data-act="action:${id}"], [data-act="${id}"]`).forEach((e) => e.classList.add("pulse"));
    }
  }

  private showIntro(): void {
    const w = this.game.world;
    if (w.flags.introSeen || this.introEl) return;
    const touch = document.body.classList.contains("touch");
    const el = document.createElement("div");
    el.className = "intro";
    el.innerHTML = `<div class="intro-card"><h2>Bem-vindo ao Sítio Boa Vista</h2>
      <p>Você tem um trator usado, um cultivador, uma plantadeira, uma carreta e <b>R$ 32 mil</b>. O Campo 2 tem trigo quase maduro; o Campo 1 precisa ser preparado.</p>
      <ul>${
        touch
          ? "<li><b>Joystick</b>: toque e arraste na metade esquerda da tela para andar e dirigir.</li><li><b>Botões à direita</b>: as ações possíveis naquele momento.</li><li><b>Pinça</b> ou <b>+ −</b> para zoom.</li>"
          : "<li><b>WASD / setas</b> para andar e dirigir · <b>Espaço</b> freia · <b>Shift</b> corre.</li><li>As teclas das ações aparecem nos botões à direita (E, Q, V, G…).</li><li><b>Roda do mouse</b> ou <b>+ −</b> para zoom · <b>M</b> abre o mapa.</li>"
      }</ul>
      <p>O tutorial mostra cada passo com uma seta amarela até o objetivo.</p>
      <div class="btns"><button class="primary" data-act="intro:start">Começar</button><button data-act="intro:skip">Jogar sem tutorial</button></div></div>`;
    this.root.appendChild(el);
    this.introEl = el;
  }
}

export { MENU_TABS };
