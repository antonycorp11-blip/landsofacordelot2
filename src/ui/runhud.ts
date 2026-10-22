import { fmt } from "../core/format";
import { SATS, SAT_MAX_LVL, type SatId } from "../data/content";
import { satStats, type Run } from "../game/sim";
import type { Marker } from "../render/scene";

export interface HudHost {
  readonly run: Run;
  readonly touch: boolean;
  build: boolean;
  sel: { ring: number; slot: number } | null;
  paused: boolean;
  setBuild(on: boolean): void;
  setStrong(src: string, on: boolean): void;
  setPaused(on: boolean): void;
  abandon(): void;
  tutorialFinished(): void;
}

interface TutStep {
  text: string;
  enter?: () => void;
  done: () => boolean;
  marker?: () => Marker | null;
  hl?: string;
  hint?: string;
}

/** HUD da partida, painel de construção e tutorial guiado. */
export class RunHud {
  readonly root: HTMLElement;
  private q = <T extends HTMLElement>(s: string) => this.root.querySelector(s) as T;
  private tut: TutStep[] | null = null;
  private tutI = 0;
  private tutT = 0;
  private moved = 0;
  private lastHole = { x: 0, y: 0 };
  private panelKey = "";
  private bannerT = 0;
  marker: Marker | null = null;

  constructor(
    private host: HudHost,
    parent: HTMLElement,
    tutorial: boolean,
  ) {
    const el = document.createElement("div");
    el.className = "hud";
    const t = host.touch;
    el.innerHTML = `
      <div class="tl">
        <div class="corebar"><span>NÚCLEO</span><div class="bar"><i></i><s></s></div><b class="hp"></b></div>
        <div class="waveinfo"><b class="wv"></b><small class="left"></small></div>
      </div>
      <div class="tc">
        <div class="frags"><i class="gem"></i><b></b></div>
        <div class="combo"></div>
      </div>
      <div class="tr">
        <button class="btn build" data-act="build"><i class="ico-build"></i><span>Construir</span></button>
        <button class="btn icon pause" data-act="pause" aria-label="Pausar">❚❚</button>
      </div>
      <div class="bl">
        <button class="hold grav" data-hold="grav"><span class="gico"></span><b>Gravidade</b><small>${t ? "segure" : "segure o clique"}</small><i class="en"><u></u></i></button>
      </div>
      <div class="bc">
        <div class="ringctl">
          <button class="hold rot" data-hold="spin:-1" aria-label="Girar anel para a esquerda">⟲</button>
          <button class="ringsel" data-act="ring"><small>girar</small><b>Anel 1</b></button>
          <button class="hold rot" data-hold="spin:1" aria-label="Girar anel para a direita">⟳</button>
        </div>
      </div>
      <div class="br">
        <button class="pulse" data-act="pulse"><span>Pulso</span><small>${t ? "" : "clique direito / espaço"}</small><i class="cd"></i></button>
      </div>
      <div class="breakbar hidden"><span></span><button class="btn small" data-act="skip">Começar agora</button></div>
      <div class="banner hidden"></div>
      <div class="buildbar hidden"><b>MODO CONSTRUÇÃO</b><span>O tempo está parado. ${t ? "Toque" : "Clique"} em um encaixe <i class="slotdot"></i> dos anéis.</span><button class="btn small ok" data-act="build">Concluir</button></div>
      <div class="panel hidden"></div>
      <div class="tutorial hidden"><div class="tt"></div><div class="th"></div><button class="link" data-act="skiptut">pular tutorial</button></div>
      <div class="modal hidden"></div>`;
    parent.appendChild(el);
    this.root = el;
    el.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
      if (b) this.act(b.dataset.act!);
    });
    // botões de segurar
    el.querySelectorAll<HTMLElement>("[data-hold]").forEach((b) => {
      const [k, v] = b.dataset.hold!.split(":");
      const on = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        b.setPointerCapture(e.pointerId);
        b.classList.add("down");
        if (k === "grav") host.setStrong("btn", true);
        else host.run.setSpin(Number(v));
      };
      const off = () => {
        b.classList.remove("down");
        if (k === "grav") host.setStrong("btn", false);
        else host.run.setSpin(0);
      };
      b.addEventListener("pointerdown", on);
      b.addEventListener("pointerup", off);
      b.addEventListener("pointercancel", off);
      b.addEventListener("lostpointercapture", off);
      b.addEventListener("contextmenu", (e) => e.preventDefault());
    });
    this.lastHole = { x: host.run.hole.x, y: host.run.hole.y };
    if (tutorial) this.startTutorial();
  }

  destroy(): void {
    this.root.remove();
  }

  act(a: string): void {
    const h = this.host;
    const run = h.run;
    const [k, arg, arg2] = a.split(":");
    switch (k) {
      case "build":
        h.setBuild(!h.build);
        break;
      case "pause":
        h.setPaused(true);
        this.showPause();
        break;
      case "resume":
        this.closeModal();
        h.setPaused(false);
        break;
      case "abandon":
        this.closeModal();
        h.abandon();
        return;
      case "pulse":
        run.pulse();
        break;
      case "ring":
        run.selectRing((run.selRing + 1) % run.st.rings);
        break;
      case "skip":
        run.skipBreak();
        break;
      case "skiptut":
        this.endTutorial();
        break;
      case "buy":
        if (h.sel && run.buy(h.sel.ring, h.sel.slot, arg as SatId)) this.panelKey = "";
        break;
      case "up":
        if (h.sel) run.upgrade(h.sel.ring, h.sel.slot);
        this.panelKey = "";
        break;
      case "sell":
        if (h.sel) run.sell(h.sel.ring, h.sel.slot);
        this.panelKey = "";
        break;
      case "close":
        h.sel = null;
        break;
      case "slot":
        h.sel = { ring: Number(arg), slot: Number(arg2) };
        break;
    }
    this.update();
  }

  flash(text: string, cls = "", time = 2.2): void {
    const b = this.q(".banner");
    b.className = `banner ${cls}`;
    b.innerHTML = text;
    this.bannerT = time;
  }

  // ------------------------------------------------------------ atualização por quadro
  update(dt = 0): void {
    const h = this.host;
    const run = h.run;
    const c = run.core;
    const hpf = c.hp / c.maxHp;
    const bar = this.q(".corebar i");
    bar.style.width = `${(hpf * 100).toFixed(1)}%`;
    bar.style.background = hpf > 0.5 ? "var(--cyan)" : hpf > 0.25 ? "var(--orange)" : "var(--red)";
    this.q(".corebar s").style.width = `${Math.min(100, (c.shield / c.maxHp) * 100)}%`;
    this.q(".corebar .hp").textContent = `${fmt(Math.ceil(c.hp))}/${fmt(c.maxHp)}`;
    this.q(".wv").textContent = run.phase === "tutorial" ? "Treino" : `Onda ${Math.max(1, run.wave)}`;
    this.q(".left").textContent = run.phase === "wave" ? `${run.remaining()} inimigos` : run.phase === "break" ? "intervalo" : "";
    this.q(".frags b").textContent = fmt(Math.floor(run.fragments));
    const cm = run.comboMult();
    const combo = this.q(".combo");
    combo.textContent = cm > 1 ? `combo ×${cm.toFixed(1).replace(".", ",")}` : "";
    combo.classList.toggle("hot", cm >= 2);
    // energia e pulso
    const ef = run.hole.energy / run.st.energyMax;
    const en = this.q(".grav .en u");
    en.style.width = `${ef * 100}%`;
    this.q(".grav").classList.toggle("tired", run.hole.exhausted);
    this.q(".grav").classList.toggle("on", run.hole.strong);
    const pf = run.hole.pulseCd / run.st.pulseCd;
    const pb = this.q(".pulse");
    pb.classList.toggle("ready", pf <= 0);
    (pb.querySelector(".cd") as HTMLElement).style.height = `${pf * 100}%`;
    // anéis
    const rs = this.q(".ringsel b");
    rs.textContent = `Anel ${run.selRing + 1}`;
    this.q(".ringctl").classList.toggle("hidden", !h.build && !this.wantRingCtl());
    // intervalo
    const bb = this.q(".breakbar");
    const showBreak = run.phase === "break" && run.wave > 0;
    bb.classList.toggle("hidden", !showBreak);
    if (showBreak) (bb.querySelector("span") as HTMLElement).innerHTML = `Onda <b>${run.wave + 1}</b> em ${Math.ceil(run.breakT)}s`;
    if (run.phase === "break" && run.wave === 0) {
      bb.classList.remove("hidden");
      (bb.querySelector("span") as HTMLElement).innerHTML = `Primeira onda em ${Math.ceil(run.breakT)}s`;
    }
    // modo construção
    this.q(".buildbar").classList.toggle("hidden", !h.build);
    this.q(".build").classList.toggle("on", h.build);
    this.root.classList.toggle("building", h.build);
    this.renderPanel();
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.q(".banner").classList.add("hidden");
    }
    if (this.tut) this.tickTutorial(dt);
  }

  /** os controles de giro aparecem quando há satélites (ou no modo construção) */
  private wantRingCtl(): boolean {
    return this.host.run.rings.some((r) => r.slots.some((s) => s));
  }

  private renderPanel(): void {
    const h = this.host;
    const run = h.run;
    const panel = this.q(".panel");
    if (!h.build || !h.sel) {
      panel.classList.add("hidden");
      this.panelKey = "";
      return;
    }
    const { ring, slot } = h.sel;
    const s = run.rings[ring].slots[slot];
    const frags = Math.floor(run.fragments);
    const key = `${ring}:${slot}:${s?.type}:${s?.lvl}:${frags}`;
    if (key === this.panelKey) return;
    this.panelKey = key;
    panel.classList.remove("hidden");
    if (!s) {
      const items = (Object.keys(SATS) as SatId[])
        .map((id) => {
          const d = SATS[id];
          const un = run.st.unlocked.includes(id);
          const cost = run.buyCost(id);
          const can = un && frags >= cost;
          return `<button class="sat ${can ? "" : "poor"} ${un ? "" : "locked"}" ${un ? `data-act="buy:${id}"` : "disabled"} style="--c:${d.color}">
            <i class="sg">${d.glyph}</i><b>${d.name}</b><small>${un ? d.desc : "Libere na Evolução"}</small><em>${un ? `<i class="gem"></i>${cost}` : "🔒"}</em></button>`;
        })
        .join("");
      panel.innerHTML = `<header><b>Anel ${ring + 1} · encaixe vazio</b><button class="x" data-act="close">✕</button></header><div class="sats">${items}</div>`;
    } else {
      const d = SATS[s.type];
      const maxed = s.lvl >= SAT_MAX_LVL;
      const cost = run.upgradeCost(s);
      const cur = this.describe(s.type, s.lvl);
      const next = maxed ? "" : this.describe(s.type, s.lvl + 1);
      panel.innerHTML = `<header style="--c:${d.color}"><b><i class="sg">${d.glyph}</i>${d.name} · nível ${s.lvl}</b><button class="x" data-act="close">✕</button></header>
        <p>${d.desc}</p>
        <div class="statline">${cur}${next ? `<span class="arrow">→</span>${next}` : ""}</div>
        <div class="row">
          ${maxed ? '<button class="btn" disabled>Nível máximo</button>' : `<button class="btn ok ${frags >= cost ? "" : "poor"}" data-act="up" ${frags >= cost ? "" : "disabled"}>Melhorar <i class="gem"></i>${cost}</button>`}
          <button class="btn danger" data-act="sell">Vender +${run.sellValue(s)}</button>
        </div>`;
    }
  }

  private describe(type: SatId, lvl: number): string {
    const st = satStats(type, lvl, this.host.run.st) as unknown as Record<string, number>;
    switch (type) {
      case "laser":
        return `<span>${fmt(st.dps)} dano/s · alcance ${Math.round(st.range)}</span>`;
      case "mine":
        return `<span>${fmt(st.dmg)} dano · rearma ${st.rearm.toFixed(1).replace(".", ",")}s</span>`;
      case "cannon":
        return `<span>${fmt(st.dmg)} por tiro · ${(1 / st.cd).toFixed(1).replace(".", ",")}/s</span>`;
      case "deflector":
        return `<span>escudo ${Math.round(st.radius)} · dano ×${st.mul.toFixed(1).replace(".", ",")}</span>`;
      case "stasis":
        return `<span>−${Math.round(st.slow * 100)}% velocidade · raio ${Math.round(st.radius)}</span>`;
      case "collector":
        return `<span>${st.rate.toFixed(1).replace(".", ",")} ◆/s · atrai ${Math.round(st.pull)}</span>`;
    }
  }

  // ------------------------------------------------------------ modais
  private showPause(): void {
    const t = this.host.touch;
    const m = this.q(".modal");
    m.classList.remove("hidden");
    m.innerHTML = `<div class="box"><h2>Pausa</h2>
      <ul class="help">
        <li><b>${t ? "Arraste o dedo em qualquer lugar" : "Mova o mouse"}</b> — o buraco negro segue.</li>
        <li><b>${t ? "Segure Gravidade" : "Segure o clique"}</b> — gravidade forte (gasta energia).</li>
        <li><b>${t ? "Pulso" : "Clique direito / Espaço"}</b> — empurra tudo para longe.</li>
        <li><b>Construir${t ? "" : " (B)"}</b> — para o tempo e coloca satélites nos anéis.</li>
        <li><b>⟲ ⟳${t ? "" : " (Q / E, 1-2-3 escolhe o anel)"}</b> — gira o anel escolhido.</li>
        <li>Inimigos que batem com força uns nos outros, em asteroides ou em defletores tomam <b>dano de impacto</b> e valem mais fragmentos.</li>
      </ul>
      <div class="row"><button class="btn ok" data-act="resume">Continuar</button><button class="btn danger" data-act="abandon">Encerrar partida</button></div></div>`;
  }

  closeModal(): void {
    this.q(".modal").classList.add("hidden");
  }

  showEnd(info: { wave: number; kills: number; impacts: number; combo: number; matter: number; record: boolean; time: string }, onHub: () => void, onAgain: () => void): void {
    const m = this.q(".modal");
    m.classList.remove("hidden");
    m.innerHTML = `<div class="box end"><h2>O núcleo caiu</h2>
      <p class="big">Onda <b>${info.wave}</b>${info.record ? '<em class="rec">novo recorde!</em>' : ""}</p>
      <div class="grid">
        <div><small>Abates</small><b>${fmt(info.kills)}</b></div>
        <div><small>Esmagados</small><b>${fmt(info.impacts)}</b></div>
        <div><small>Maior combo</small><b>×${info.combo}</b></div>
        <div><small>Tempo</small><b>${info.time}</b></div>
      </div>
      <p class="gain"><i class="dm"></i> +${fmt(info.matter)} <span>matéria escura</span></p>
      <div class="row"><button class="btn ok" data-act="end:hub">Evoluir</button><button class="btn" data-act="end:again">Jogar de novo</button></div></div>`;
    m.querySelector('[data-act="end:hub"]')!.addEventListener("click", (e) => (e.stopPropagation(), onHub()));
    m.querySelector('[data-act="end:again"]')!.addEventListener("click", (e) => (e.stopPropagation(), onAgain()));
  }

  // ------------------------------------------------------------ tutorial
  private startTutorial(): void {
    const run = this.host.run;
    const t = this.host.touch;
    const edgeGroup = (type: "wanderer" | "drone", n: number, ang: number) => {
      for (let i = 0; i < n; i++) {
        const p = run.edgePoint(ang + (i - n / 2) * 0.09, 20 + i * 14);
        run.spawn(type, p.x, p.y);
      }
    };
    this.tut = [
      {
        text: `Você é o <b>buraco negro</b>. ${t ? "Arraste o dedo em qualquer lugar da tela" : "Mova o mouse"} para movê-lo.`,
        hint: "O planeta no centro é o Núcleo: é ele que você precisa proteger.",
        done: () => this.moved > 500,
      },
      {
        text: `${t ? "Segure o botão <b>Gravidade</b>" : "<b>Segure o botão do mouse</b>"} para puxar com força.`,
        hint: "A gravidade forte gasta energia (o arco em volta do buraco). Solte para recarregar.",
        hl: t ? ".grav" : undefined,
        done: () => run.strongTime > 1.2,
      },
      {
        text: "Inimigos! <b>Puxe-os</b> e faça eles <b>baterem</b> uns nos outros ou nos asteroides.",
        hint: "Quanto mais rápida a batida, maior o dano. Dentro do horizonte (o disco negro) eles também se desfazem.",
        enter: () => edgeGroup("wanderer", 5, -0.25),
        marker: () => {
          const e = run.enemies[0];
          return e ? { x: e.x, y: e.y, r: 22 } : null;
        },
        done: () => run.enemies.length === 0,
      },
      {
        text: "Passe perto dos <b>fragmentos ◆</b> para coletá-los.",
        hint: "Fragmentos compram satélites. Eles somem depois de alguns segundos.",
        marker: () => {
          const f = run.frags[0];
          return f ? { x: f.x, y: f.y, r: 14 } : null;
        },
        done: () => run.frags.length === 0,
      },
      {
        text: "Agora abra o modo <b>Construir</b>.",
        hint: "Construir para o tempo. Satélites ficam em anéis que giram em volta do núcleo.",
        hl: ".build",
        enter: () => {
          if (run.fragments < run.buyCost("laser")) run.fragments = run.buyCost("laser");
        },
        done: () => this.host.build,
      },
      {
        text: `${t ? "Toque" : "Clique"} num encaixe do anel e compre um <b>Laser</b>.`,
        hint: "Os satélites atacam sozinhos. Você ainda pode melhorar, vender e girar os anéis.",
        marker: () => {
          if (this.host.sel) return null;
          const p = run.slotPos(0, 0);
          return { x: p.x, y: p.y, r: 14 };
        },
        hl: ".panel [data-act='buy:laser']",
        done: () => run.rings.some((r) => r.slots.some((s) => s)),
      },
      {
        text: `${t ? "Toque" : "Clique"} em <b>Concluir</b> para o tempo voltar.`,
        hl: ".buildbar .ok",
        done: () => !this.host.build,
      },
      {
        text: `Um enxame vem aí. Use o <b>Pulso</b> ${t ? "(botão à direita)" : "(clique direito ou Espaço)"} para arremessá-los.`,
        hint: "O pulso empurra tudo para longe do buraco: ótimo para jogar inimigos contra asteroides.",
        hl: ".pulse",
        enter: () => edgeGroup("drone", 6, 2.6),
        done: () => run.pulses > 0 && run.enemies.length === 0,
      },
      {
        text: "Pronto! As ondas começam agora. <b>Sobreviva o máximo que puder.</b>",
        hint: "Ao fim de cada partida você leva Matéria escura para a árvore de Evolução.",
        done: () => this.tutT > 4.5,
      },
    ];
    this.tutI = -1;
    this.nextTut();
  }

  private nextTut(): void {
    if (!this.tut) return;
    this.tutI++;
    this.tutT = 0;
    this.root.querySelectorAll(".hl").forEach((e) => e.classList.remove("hl"));
    const st = this.tut[this.tutI];
    if (!st) return this.endTutorial();
    st.enter?.();
    const box = this.q(".tutorial");
    box.classList.remove("hidden");
    box.classList.remove("pop");
    void box.offsetWidth;
    box.classList.add("pop");
    this.q(".tutorial .tt").innerHTML = `<em>${this.tutI + 1}/${this.tut.length}</em> ${st.text}`;
    this.q(".tutorial .th").innerHTML = st.hint ?? "";
  }

  private tickTutorial(dt: number): void {
    const st = this.tut![this.tutI];
    if (!st) return;
    this.tutT += dt;
    const run = this.host.run;
    this.moved += Math.hypot(run.hole.x - this.lastHole.x, run.hole.y - this.lastHole.y);
    this.lastHole = { x: run.hole.x, y: run.hole.y };
    if (st.hl) this.root.querySelectorAll(st.hl).forEach((e) => e.classList.add("hl"));
    this.marker = st.marker?.() ?? null;
    if (this.tutT > 0.6 && st.done()) this.nextTut();
  }

  private endTutorial(): void {
    this.tut = null;
    this.marker = null;
    this.root.querySelectorAll(".hl").forEach((e) => e.classList.remove("hl"));
    this.q(".tutorial").classList.add("hidden");
    this.host.run.beginWaves();
    this.host.tutorialFinished();
  }

  get inTutorial(): boolean {
    return !!this.tut;
  }
}

