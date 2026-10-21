import { fmt, fmtTime } from "../core/format";
import { BALANCE, BEAM_UPGRADES, LENSES, PRODUCERS, PRODUCER_MILESTONE, TALENTS, TOWERS, beamStats, islandAt, type BeamStat, type LensId, type ProducerId, type TalentId, type TowerKind } from "../data/content";
import { beamQuote, buildTower, buyBeam, buyLens, buyProducer, buyTalent, prestige, producerQuote, sellTower, towerQuote, towerUnlocked, upgradeTower, type BuyMode } from "../game/actions";
import { damageMult, incomePerSec, memoryMult, oilMult, prestigeGain, producerRate, talentCost, towerDamage, towerRange } from "../game/economy";
import type { GameState, Runtime } from "../game/state";

export type Tab = "beam" | "towers" | "prod" | "rebuild";

export interface HudHost {
  state: GameState;
  runtime: Runtime;
  selectSlot(i: number | null): void;
  selectedSlot: number | null;
  replaceState(s: GameState, rt: Runtime): void;
  save(): void;
  reset(): void;
}

const $ = <T extends HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;

/** Interface em HTML: barra superior, painel com abas, dicas e avisos. */
export class Hud {
  tab: Tab = "beam";
  mode: BuyMode = 1;
  private root: HTMLElement;
  private content: HTMLElement;
  private lastSig = "";
  private confirmRebuild = false;
  private confirmReset = false;
  readonly panel: HTMLElement;

  constructor(
    private host: HudHost,
    root: HTMLElement,
  ) {
    this.root = root;
    root.innerHTML = `
      <header class="top">
        <div class="res oil"><i class="drop"></i><div><b data-id="oil"></b><small data-id="rate"></small></div></div>
        <div class="res wave"><div><b data-id="wave"></b><small data-id="island"></small></div></div>
        <div class="res hp"><div><span class="bar"><i data-id="hpbar"></i></span><small data-id="hp"></small></div></div>
        <div class="res mem" data-id="memwrap"><i class="star"></i><div><b data-id="mem"></b><small>memórias</small></div></div>
        <button class="auto" data-act="auto"></button>
      </header>
      <div class="hint hidden" data-id="hint"></div>
      <div class="toasts"></div>
      <aside class="panel">
        <nav>
          <button data-act="tab:beam">Farol</button>
          <button data-act="tab:towers">Torres</button>
          <button data-act="tab:prod">Produção</button>
          <button data-act="tab:rebuild">Reconstruir</button>
        </nav>
        <div class="mode"><span>Comprar</span><button data-act="mode:1">×1</button><button data-act="mode:10">×10</button><button data-act="mode:max">Máx</button></div>
        <section class="content"></section>
      </aside>
      <div class="modal hidden"></div>`;
    this.content = $(root, ".content");
    this.panel = $(root, ".panel");
    root.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
      if (!t || t.hasAttribute("disabled")) return;
      this.act(t.dataset.act!);
    });
  }

  toast(text: string, kind: "good" | "warn" | "info" = "info"): void {
    const box = $(this.root, ".toasts");
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.textContent = text;
    box.appendChild(el);
    setTimeout(() => el.classList.add("out"), 2600);
    setTimeout(() => el.remove(), 3200);
    while (box.children.length > 4) box.firstElementChild?.remove();
  }

  modal(html: string): void {
    const m = $(this.root, ".modal");
    m.innerHTML = `<div class="card">${html}</div>`;
    m.classList.remove("hidden");
  }

  private act(a: string): void {
    const h = this.host;
    const s = h.state;
    const [k, arg, arg2] = a.split(":");
    let ok = true;
    switch (k) {
      case "tab":
        this.tab = arg as Tab;
        if (this.tab !== "towers") h.selectSlot(null);
        break;
      case "mode":
        this.mode = arg === "max" ? "max" : (Number(arg) as BuyMode);
        break;
      case "auto":
        s.autoAdvance = !s.autoAdvance;
        break;
      case "beam":
        ok = buyBeam(s, arg as BeamStat, this.mode);
        break;
      case "lens":
        ok = buyLens(s, arg as LensId);
        break;
      case "prod":
        ok = buyProducer(s, arg as ProducerId, this.mode);
        break;
      case "build":
        ok = buildTower(s, Number(arg), arg2 as TowerKind);
        if (ok) this.toast(`${TOWERS[arg2 as TowerKind].name} construída`, "good");
        break;
      case "up":
        ok = upgradeTower(s, Number(arg), this.mode);
        break;
      case "sell": {
        const r = sellTower(s, Number(arg));
        this.toast(`Torre desmontada: +${fmt(r)} de óleo`, "info");
        break;
      }
      case "slot":
        h.selectSlot(arg === "none" ? null : Number(arg));
        break;
      case "talent":
        ok = buyTalent(s, arg as TalentId);
        break;
      case "rebuild": {
        if (!this.confirmRebuild) {
          this.confirmRebuild = true;
          break;
        }
        this.confirmRebuild = false;
        const r = prestige(s);
        if (r) {
          h.replaceState(r.state, r.runtime);
          this.toast(`Farol reconstruído em ${islandAt(r.state.island).name}. +${r.gained} memórias`, "good");
          this.tab = "beam";
        }
        break;
      }
      case "close":
        $(this.root, ".modal").classList.add("hidden");
        break;
      case "save":
        h.save();
        this.toast("Jogo salvo", "good");
        break;
      case "reset":
        if (!this.confirmReset) {
          this.confirmReset = true;
          break;
        }
        h.reset();
        break;
    }
    if (!ok) this.toast("Óleo insuficiente", "warn");
    this.lastSig = "";
    this.update();
  }

  /** Atualiza tudo; o painel só é reescrito quando o conteúdo muda. */
  update(): void {
    const s = this.host.state;
    const rt = this.host.runtime;
    const bs = beamStats(s.beam);
    const set = (id: string, v: string) => {
      const e = $(this.root, `[data-id="${id}"]`);
      if (e.textContent !== v) e.textContent = v;
    };
    set("oil", fmt(s.oil));
    set("rate", `+${fmt(incomePerSec(s))}/s`);
    set("wave", `Onda ${s.wave}${s.wave % BALANCE.bossEvery === 0 ? " · Kraken!" : ""}`);
    set("island", `${islandAt(s.island).name} · recorde ${s.maxWave}`);
    set("hp", `Integridade ${Math.max(0, Math.ceil(s.hp))}/${Math.round(bs.hpMax)}`);
    $(this.root, '[data-id="hpbar"]').style.width = `${Math.max(0, (s.hp / bs.hpMax) * 100)}%`;
    set("mem", fmt(s.memories));
    $(this.root, '[data-id="memwrap"]').classList.toggle("hidden", s.memoriesTotal === 0);
    const auto = $(this.root, ".auto");
    const autoTxt = s.autoAdvance ? "Avançando ondas" : "Repetindo onda";
    if (auto.textContent !== autoTxt) auto.textContent = autoTxt;
    auto.classList.toggle("off", !s.autoAdvance);
    this.root.querySelectorAll("nav button").forEach((b) => b.classList.toggle("on", (b as HTMLElement).dataset.act === `tab:${this.tab}`));
    this.root.querySelectorAll(".mode button").forEach((b) => b.classList.toggle("on", (b as HTMLElement).dataset.act === `mode:${this.mode}`));
    this.updateHint();
    const html = this[this.tab]();
    if (html !== this.lastSig) {
      const scroll = this.content.scrollTop;
      this.content.innerHTML = html;
      this.content.scrollTop = scroll;
      this.lastSig = html;
    }
    void rt;
  }

  private updateHint(): void {
    const s = this.host.state;
    const el = $(this.root, '[data-id="hint"]');
    let text = "";
    if (!s.flags.aimed) text = "Arraste sobre o mar para apontar o feixe. Solte e ele volta a girar sozinho.";
    else if (!s.flags.builtTower && s.oil >= TOWERS.lantern.cost) text = "Você tem óleo: toque numa pedra com “+” para construir uma torre.";
    else if (!s.flags.boughtBeam && s.oil >= BEAM_UPGRADES[0].baseCost && s.flags.builtTower) text = "Na aba Farol, aumente a Intensidade da luz.";
    else if (!s.flags.boughtProd && s.maxWave >= 3 && s.oil >= PRODUCERS[0].baseCost) text = "Na aba Produção, compre um barco baleeiro: óleo chega mesmo sem lutar.";
    else if (s.maxWave >= BALANCE.prestigeMinWave && !s.flags.sawRebuild) text = "A aba Reconstruir está disponível: recomece mais forte numa nova ilha.";
    if (s.flags.boughtBeam === undefined && s.beam.power > 0) s.flags.boughtBeam = true;
    if (!s.flags.boughtProd && Object.values(s.producers).some((n) => n > 0)) s.flags.boughtProd = true;
    if (this.tab === "rebuild") s.flags.sawRebuild = true;
    if (el.textContent !== text) el.textContent = text;
    el.classList.toggle("hidden", !text);
  }

  private costBtn(act: string, cost: number, label: string, can: boolean, disabled = false): string {
    return `<button class="buy ${can ? "" : "poor"}" data-act="${act}" ${disabled ? "disabled" : ""}><span>${label}</span><b><i class="drop"></i>${fmt(cost)}</b></button>`;
  }

  private beam(): string {
    const s = this.host.state;
    const bs = beamStats(s.beam);
    const dm = damageMult(s);
    const val: Record<BeamStat, (st: ReturnType<typeof beamStats>) => string> = {
      power: (b) => `${fmt(b.dps * dm)} dano/s`,
      reach: (b) => `${Math.round(b.reach)} m`,
      width: (b) => `${Math.round((b.halfAngle * 360) / Math.PI)}°`,
      spin: (b) => `${Math.round((b.spin * 180) / Math.PI)}°/s`,
      wall: (b) => `${Math.round(b.hpMax)}`,
    };
    const rows = BEAM_UPGRADES.map((u) => {
      const lvl = s.beam[u.id];
      const maxed = lvl >= u.max;
      const q = beamQuote(s, u.id, this.mode);
      const next = beamStats({ ...s.beam, [u.id]: lvl + Math.max(1, q.n) });
      return `<div class="row"><div class="info"><b>${u.name} <em>${u.max < 999 ? `${lvl}/${u.max}` : `nv ${lvl}`}</em></b><small>${u.desc}: ${val[u.id](bs)}${maxed ? "" : ` → ${val[u.id](next)}`}</small></div>${maxed ? '<span class="maxed">Máximo</span>' : this.costBtn(`beam:${u.id}`, q.cost, `+${q.n}`, s.oil >= q.cost)}</div>`;
    }).join("");
    const lenses = (Object.keys(LENSES) as LensId[])
      .filter((id) => id !== "prism" || s.talents.prism)
      .map((id) => {
        const L = LENSES[id];
        const owned = s.lenses.includes(id);
        const on = s.lens === id;
        const [r, g, b] = L.color;
        return `<button class="lens ${on ? "on" : ""} ${owned ? "" : "locked"}" data-act="lens:${id}" style="--lc:rgb(${r},${g},${b})"><i></i><b>${L.name}</b><small>${L.desc}</small>${owned ? (on ? "<em>Em uso</em>" : "<em>Usar</em>") : `<em><i class="drop"></i>${fmt(L.cost)}</em>`}</button>`;
      })
      .join("");
    return `<h3>Lentes</h3><div class="lenses">${lenses}</div><h3>Mecanismo do farol</h3>${rows}<p class="note">Torres dentro do feixe trabalham ${Math.round((1.6 - 1) * 100)}% mais rápido. Arpões causam o dobro em alvos iluminados.</p>`;
  }

  private towers(): string {
    const s = this.host.state;
    const sel = this.host.selectedSlot;
    if (sel === null) {
      const list = s.towers
        .map((t, i) => `<button class="slot" data-act="slot:${i}"><b>Pedra ${i + 1}</b><small>${t ? `${TOWERS[t.kind].name} · nível ${t.level}` : "vazia"}</small></button>`)
        .join("");
      return `<p class="note">Toque numa pedra da ilha (ou escolha abaixo) para construir ou melhorar.</p><div class="slots">${list}</div>`;
    }
    const t = s.towers[sel];
    const back = `<button class="back" data-act="slot:none">‹ Todas as pedras</button>`;
    if (!t) {
      const cards = (Object.keys(TOWERS) as TowerKind[])
        .map((k) => {
          const d = TOWERS[k];
          const un = towerUnlocked(s, k);
          return `<div class="row tower"><div class="info"><b>${d.name}</b><small>${d.desc}</small><small>Dano ${fmt(towerDamage(s, k, s.talents.veteran))}${k === "lantern" ? "/s" : ""} · alcance ${Math.round(towerRange(k, 0))} m</small></div>${un ? this.costBtn(`build:${sel}:${k}`, d.cost, "Construir", s.oil >= d.cost) : `<span class="maxed">Onda ${d.unlockWave}</span>`}</div>`;
        })
        .join("");
      return `${back}<h3>Pedra ${sel + 1} · construir</h3>${cards}`;
    }
    const d = TOWERS[t.kind];
    const q = towerQuote(s, sel, this.mode);
    const nextLvl = t.level + Math.max(1, q.n);
    return `${back}<h3>${d.name} · nível ${t.level}</h3><p class="note">${d.desc}</p>
      <div class="row"><div class="info"><b>Melhorar</b><small>Dano ${fmt(towerDamage(s, t.kind, t.level))} → ${fmt(towerDamage(s, t.kind, nextLvl))} · alcance ${Math.round(towerRange(t.kind, t.level))} → ${Math.round(towerRange(t.kind, nextLvl))} m</small></div>${this.costBtn(`up:${sel}`, q.cost, `+${q.n}`, s.oil >= q.cost)}</div>
      <div class="row"><div class="info"><b>Desmontar</b><small>Devolve 60% do óleo investido</small></div><button class="buy sell" data-act="sell:${sel}"><span>Vender</span><b>+${fmt(t.spent * 0.6)}</b></button></div>`;
  }

  private prod(): string {
    const s = this.host.state;
    const rows = PRODUCERS.map((p, i) => {
      const prev = i === 0 || s.producers[PRODUCERS[i - 1].id] > 0 || s.producers[p.id] > 0;
      if (!prev) return `<div class="row locked"><div class="info"><b>???</b><small>Compre o produtor anterior para descobrir</small></div></div>`;
      const n = s.producers[p.id];
      const q = producerQuote(s, p.id, this.mode);
      const nextMs = (Math.floor(n / PRODUCER_MILESTONE) + 1) * PRODUCER_MILESTONE;
      return `<div class="row"><div class="info"><b>${p.name} <em>×${n}</em></b><small>${p.desc}</small><small>${fmt(producerRate(s, p.id))}/s · dobra com ${nextMs}</small></div>${this.costBtn(`prod:${p.id}`, q.cost, `+${q.n}`, s.oil >= q.cost)}</div>`;
    }).join("");
    return `<p class="note">Produção total: <b>${fmt(incomePerSec(s))}/s</b> (multiplicador ${fmt(oilMult(s), 2)}×). Fora do jogo, a reserva rende ${Math.round(BALANCE.offlineRate * 100)}% por até ${fmtTime(BALANCE.offlineCapSec)}.</p>${rows}`;
  }

  private rebuild(): string {
    const s = this.host.state;
    const gain = prestigeGain(s);
    const next = islandAt(s.island + 1);
    const talents = TALENTS.map((t) => {
      const lvl = s.talents[t.id];
      const maxed = lvl >= t.max;
      const c = talentCost(t.id, lvl);
      return `<div class="row"><div class="info"><b>${t.name} <em>${lvl}/${t.max}</em></b><small>${t.desc}</small></div>${maxed ? '<span class="maxed">Máximo</span>' : `<button class="buy ${s.memories >= c ? "" : "poor"}" data-act="talent:${t.id}"><span>Aprender</span><b><i class="star"></i>${c}</b></button>`}</div>`;
    }).join("");
    const can = gain > 0;
    return `<div class="rebuild"><h3>Reconstruir o farol</h3>
      <p>Leve suas memórias para <b>${next.name}</b>. Óleo, melhorias, torres e produtores recomeçam; memórias e talentos ficam. Cada memória já conquistada dá +${Math.round(BALANCE.memoryBonus * 100)}% de dano e óleo para sempre (agora ${fmt(memoryMult(s), 2)}×).</p>
      <p>${can ? `Você ganharia <b class="gold">${gain} memórias</b> (recorde da ilha: onda ${s.maxWave}).` : `Disponível a partir da onda ${BALANCE.prestigeMinWave} (recorde atual: ${s.maxWave}).`}</p>
      <button class="big ${can ? "" : "poor"}" data-act="rebuild" ${can ? "" : "disabled"}>${this.confirmRebuild ? "Confirmar: recomeçar em nova ilha" : "Reconstruir"}</button></div>
      <h3>Talentos do faroleiro · <i class="star"></i> ${fmt(s.memories)}</h3>${talents}
      <h3>Jogo</h3><p class="note">${s.kills.toLocaleString("pt-BR")} criaturas afastadas · ${s.prestiges} reconstruções · melhor onda ${s.bestWaveEver}</p>
      <div class="sys"><button data-act="save">Salvar agora</button><button data-act="reset">${this.confirmReset ? "Confirmar: apagar tudo" : "Apagar progresso"}</button></div>`;
  }
}
