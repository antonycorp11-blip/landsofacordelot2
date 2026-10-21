import { fmt } from "../core/format";
import { RUN, UNITS, sectorName, type UnitId } from "../data/content";
import { unitCost, type RunState } from "../game/run";
import { unitIcon } from "../render/sprites";

export interface RunHudHost {
  run: RunState;
  selected: UnitId | "shovel" | null;
  select(s: UnitId | "shovel" | null): void;
  speed: number;
  setSpeed(n: number): void;
  paused: boolean;
  setPaused(p: boolean): void;
  callWave(): void;
  abandon(): void;
  finish(action: "hub" | "retry" | "next"): void;
}

/** Bandeja de cartas, ondas, integridade, calor da lâmina e controles. */
export class RunHud {
  readonly root: HTMLElement;
  private cardsEl: HTMLElement;
  private energyEl: HTMLElement;
  private cardEls: HTMLElement[] = [];
  private lastBanner = -1;
  private tipEl: HTMLElement;

  constructor(
    private host: RunHudHost,
    parent: HTMLElement,
  ) {
    const el = document.createElement("div");
    el.className = "run";
    el.innerHTML = `
      <div class="tray">
        <div class="energy"><i class="cell"></i><b>0</b></div>
        <div class="cards"></div>
        <button class="tool shovel" data-act="shovel" title="Remover unidade"><i class="shovel-ico"></i><span>Remover</span></button>
      </div>
      <div class="side">
        <div class="wavebox"><div class="wavebar"><i></i></div><small class="wavelabel"></small></div>
        <div class="statrow"><div class="hearts"></div><div class="heat" title="Calor da lâmina"><span>Lâmina</span><div class="heatbar"><i></i></div></div></div>
        <div class="controls">
          <button data-act="call" class="call">Chamar onda</button>
          <button data-act="speed" class="speed">1×</button>
          <button data-act="pause" class="pause">II</button>
        </div>
      </div>
      <div class="banner hidden"></div>
      <div class="tip hidden"></div>
      <div class="overlay hidden"></div>`;
    parent.appendChild(el);
    this.root = el;
    this.cardsEl = el.querySelector(".cards")!;
    this.energyEl = el.querySelector(".energy b")!;
    this.tipEl = el.querySelector(".tip")!;
    this.buildCards();
    el.addEventListener("pointerdown", (e) => {
      const t = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
      if (!t) return;
      e.stopPropagation();
      this.act(t.dataset.act!);
    });
  }

  destroy(): void {
    this.root.remove();
  }

  /** Posição na tela do contador de energia (destino das células coletadas). */
  energyTarget(): { x: number; y: number } {
    const r = this.root.querySelector(".energy i")!.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  trayHeight(): number {
    return (this.root.querySelector(".tray") as HTMLElement).getBoundingClientRect().bottom + 4;
  }

  private buildCards(): void {
    this.cardsEl.innerHTML = "";
    this.cardEls = this.host.run.cards.map((c, i) => {
      const b = document.createElement("button");
      b.className = "card";
      b.dataset.act = `card:${i}`;
      const icon = unitIcon(c.id, 56);
      icon.className = "icon";
      b.appendChild(icon);
      const cost = document.createElement("b");
      cost.className = "cost";
      cost.textContent = String(unitCost(this.host.run, c.id));
      b.appendChild(cost);
      const cd = document.createElement("i");
      cd.className = "cd";
      b.appendChild(cd);
      b.title = `${UNITS[c.id].name}: ${UNITS[c.id].desc}`;
      this.cardsEl.appendChild(b);
      return b;
    });
  }

  private act(a: string): void {
    const h = this.host;
    const [k, arg] = a.split(":");
    switch (k) {
      case "card": {
        const c = h.run.cards[Number(arg)];
        h.select(h.selected === c.id ? null : c.id);
        break;
      }
      case "shovel":
        h.select(h.selected === "shovel" ? null : "shovel");
        break;
      case "speed":
        h.setSpeed(h.speed === 1 ? 2 : 1);
        break;
      case "pause":
        h.setPaused(true);
        this.showPause();
        break;
      case "resume":
        h.setPaused(false);
        this.hideOverlay();
        break;
      case "abandon":
        this.hideOverlay();
        h.abandon();
        return;
      case "call":
        h.callWave();
        break;
      case "hub":
      case "retry":
      case "next":
        h.finish(k);
        return;
    }
    this.update();
  }

  private showPause(): void {
    const o = this.root.querySelector(".overlay") as HTMLElement;
    o.innerHTML = `<div class="panel"><h2>Pausado</h2><p>Abandonar encerra a missão como derrota, mas você leva a sucata dos abates.</p><div class="btns"><button class="primary" data-act="resume">Continuar</button><button data-act="abandon">Abandonar missão</button></div></div>`;
    o.classList.remove("hidden");
  }

  hideOverlay(): void {
    this.root.querySelector(".overlay")!.classList.add("hidden");
  }

  showResult(won: boolean, breakdown: { kills: number; waves: number; victory: number; total: number }, unlockedNext: boolean, isRecord: boolean): void {
    const r = this.host.run;
    const o = this.root.querySelector(".overlay") as HTMLElement;
    o.innerHTML = `<div class="panel result ${won ? "won" : "lost"}">
      <h2>${won ? "Setor defendido!" : "A base caiu"}</h2>
      <p class="sub">${sectorName(r.sector)} · onda ${r.wavesCleared}/${r.totalWaves}${isRecord ? " · novo recorde" : ""}</p>
      <div class="loot">
        <div><span>Abates (${r.kills})</span><b>${fmt(breakdown.kills)}</b></div>
        <div><span>Bônus de ${r.wavesCleared} ondas</span><b>${fmt(breakdown.waves)}</b></div>
        ${won ? `<div><span>Vitória</span><b>${fmt(breakdown.victory)}</b></div>` : ""}
        <div class="total"><span>Sucata</span><b>+${fmt(breakdown.total)} <i class="gear"></i></b></div>
      </div>
      ${unlockedNext ? `<p class="unlock">Novo setor liberado: ${sectorName(r.sector + 1)}</p>` : ""}
      <p class="hint">${won ? "Gaste a sucata na Árvore para ficar mais forte." : "Gaste a sucata na Árvore e tente de novo: cada tentativa deixa você mais forte."}</p>
      <div class="btns">
        <button class="primary" data-act="hub">Ir para a Árvore</button>
        <button data-act="${won && unlockedNext ? "next" : "retry"}">${won && unlockedNext ? "Próximo setor" : "Tentar de novo"}</button>
      </div></div>`;
    o.classList.remove("hidden");
  }

  private banner(text: string, big = false): void {
    const b = this.root.querySelector(".banner") as HTMLElement;
    b.textContent = text;
    b.className = `banner ${big ? "big" : ""}`;
    void b.offsetWidth;
    b.classList.add("show");
  }

  setTip(text: string): void {
    if (this.tipEl.textContent !== text) this.tipEl.textContent = text;
    this.tipEl.classList.toggle("hidden", !text);
  }

  update(): void {
    const h = this.host;
    const r = h.run;
    const e = String(Math.floor(r.energy));
    if (this.energyEl.textContent !== e) this.energyEl.textContent = e;
    r.cards.forEach((c, i) => {
      const el = this.cardEls[i];
      const cost = unitCost(r, c.id);
      el.classList.toggle("poor", r.energy < cost);
      el.classList.toggle("sel", h.selected === c.id);
      el.classList.toggle("cooling", c.cd > 0);
      (el.querySelector(".cd") as HTMLElement).style.height = `${(c.cd / c.max) * 100}%`;
    });
    this.root.querySelector(".shovel")!.classList.toggle("sel", h.selected === "shovel");
    // ondas
    const prog = r.prep > 0 ? 0 : (r.wave - (r.spawnQueue.length || r.aliens.length ? 1 : 0)) / r.totalWaves;
    (this.root.querySelector(".wavebar i") as HTMLElement).style.width = `${Math.max(0, prog) * 100}%`;
    const label = r.prep > 0 ? `Preparação · ${Math.ceil(r.prep)} s` : r.waveGap > 0 ? `Próxima onda em ${Math.ceil(r.waveGap)} s` : `Onda ${r.wave}/${r.totalWaves}${r.wave === r.totalWaves ? " · FINAL" : ""}`;
    const wl = this.root.querySelector(".wavelabel")!;
    if (wl.textContent !== label) wl.textContent = label;
    const call = this.root.querySelector(".call") as HTMLElement;
    call.classList.toggle("hidden", !(r.prep > 0 || r.waveGap > 0));
    const hearts = this.root.querySelector(".hearts")!;
    const hs = Array.from({ length: r.stats.baseHp }, (_, i) => `<i class="${i < r.baseHp ? "on" : ""}"></i>`).join("");
    if (hearts.innerHTML !== hs) hearts.innerHTML = hs;
    const heat = this.root.querySelector(".heat") as HTMLElement;
    (heat.querySelector(".heatbar i") as HTMLElement).style.width = `${r.heat}%`;
    heat.classList.toggle("over", r.overheated);
    heat.classList.toggle("warm", r.heat > 70);
    (this.root.querySelector(".speed") as HTMLElement).textContent = `${h.speed}×`;
    if (r.wave !== this.lastBanner && r.prep <= 0) {
      this.lastBanner = r.wave;
      this.banner(r.wave === r.totalWaves ? "ONDA FINAL" : `ONDA ${r.wave}`, r.wave === r.totalWaves);
    }
    void RUN;
  }
}
