import { fmt } from "../core/format";
import { DEGREE_COLORS, MOTIFS, ROOM_NAMES, ROOMS_PER_CONCERT, chordName, degreeNote, type MotifId } from "../data/content";
import type { Run, SimEvent } from "../game/sim";
import type { Marker } from "../render/scene";

export interface HudHost {
  readonly run: Run;
  readonly touch: boolean;
  muted: boolean;
  setPaused(on: boolean): void;
  toggleMute(): void;
  abandon(): void;
  tutorialFinished(): void;
}

interface TutStep {
  text: string;
  hint?: string;
  enter?: () => void;
  done: () => boolean;
  marker?: () => Marker | null;
  hl?: string;
}

/** HUD da partida, escolha de motivos, modais e tutorial guiado. */
export class RunHud {
  readonly root: HTMLElement;
  private q = <T extends HTMLElement>(s: string) => this.root.querySelector(s) as T;
  marker: Marker | null = null;
  offerOpen = false;
  modalOpen = false;
  private tut: TutStep[] | null = null;
  private tutI = 0;
  private tutT = 0;
  private beatHits = 0;
  private bannerT = 0;
  private chordKey = "";

  constructor(
    private host: HudHost,
    parent: HTMLElement,
    tutorial: boolean,
  ) {
    const el = document.createElement("div");
    el.className = "hud";
    el.innerHTML = `
      <div class="tl">
        <div class="lyrabar"><span>LYRA</span><div class="bar"><i></i><s></s></div><b class="hp"></b></div>
        <div class="roominfo"><b class="rn"></b><small class="ki"></small></div>
        <div class="beats"><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="tc"><div class="notes"><i class="nt">♪</i><b></b></div></div>
      <div class="tr">
        <button class="btn icon mute" data-act="mute" aria-label="Som"></button>
        <button class="btn icon" data-act="pause" aria-label="Pausar">❚❚</button>
      </div>
      <div class="chordguide"></div>
      <div class="xp"><i></i><span></span></div>
      <div class="banner hidden"></div>
      <div class="tutorial hidden"><div class="tt"></div><div class="th"></div><button class="link" data-act="skiptut">pular tutorial</button></div>
      <div class="modal hidden"></div>`;
    parent.appendChild(el);
    this.root = el;
    el.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
      if (b) this.act(b.dataset.act!);
    });
    if (tutorial) this.startTutorial();
    this.update(0);
  }

  destroy(): void {
    this.root.remove();
  }

  /** posição do contador de notas (as notas coletadas voam até lá) */
  notesHome(): { x: number; y: number } {
    const r = this.q(".notes").getBoundingClientRect();
    return { x: r.left + 18, y: r.top + r.height / 2 };
  }

  act(a: string): void {
    const h = this.host;
    const [k, arg] = a.split(":");
    switch (k) {
      case "pause":
        if (this.offerOpen || this.modalOpen) return;
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
        break;
      case "mute":
        h.toggleMute();
        break;
      case "skiptut":
        this.endTutorial();
        break;
      case "pick":
        h.run.choose(arg as MotifId);
        this.closeOffer();
        break;
      case "reroll":
        if (h.run.reroll()) this.renderOffer();
        break;
    }
    this.update(0);
  }

  onEvents(evs: SimEvent[]): void {
    for (const e of evs) {
      if (e.k === "room") this.flash(`<small>${e.n === ROOMS_PER_CONCERT ? "movimento final" : `movimento ${e.n} de ${ROOMS_PER_CONCERT}`}</small><b>${ROOM_NAMES[e.n - 1]}</b>`, e.n === ROOMS_PER_CONCERT ? "boss" : "");
      else if (e.k === "roomClear") this.flash(`<b>Bravo!</b><small>+${fmt(e.notes)} ♪</small>`, "ok", 1.8);
      else if (e.k === "boss") this.flash("<small>a orquestra desafina…</small><b>O Trítono chegou</b>", "boss", 2.6);
      else if (e.k === "tired") this.flash("<small>sem fôlego — pare de cortar um instante</small>", "warn", 1.4);
      else if (e.k === "hit" && e.onBeat) this.beatHits++;
      else if (e.k === "beat") {
        const dots = this.root.querySelectorAll(".beats i");
        dots.forEach((d, i) => d.classList.toggle("on", i === e.n % 4));
      }
    }
  }

  flash(html: string, cls = "", time = 2.2): void {
    const b = this.q(".banner");
    b.className = `banner ${cls}`;
    b.innerHTML = html;
    void b.offsetWidth;
    this.bannerT = time;
  }

  update(dt: number): void {
    const run = this.host.run;
    const L = run.lyra;
    const hpf = Math.max(0, L.hp / L.maxHp);
    const bar = this.q(".lyrabar i");
    bar.style.width = `${(hpf * 100).toFixed(1)}%`;
    bar.style.background = hpf > 0.5 ? "var(--rose)" : hpf > 0.25 ? "var(--orange)" : "var(--red)";
    this.q(".lyrabar s").style.width = `${Math.min(100, (L.shield / L.maxHp) * 100)}%`;
    this.q(".lyrabar .hp").textContent = `${fmt(Math.ceil(L.hp))}/${fmt(L.maxHp)}`;
    this.q(".rn").textContent = run.phase === "tutorial" ? "Ensaio" : ROOM_NAMES[run.room - 1] ?? "";
    this.q(".ki").textContent = `${run.key.name} · ${run.bpm} BPM`;
    this.q(".notes b").textContent = fmt(Math.floor(run.notes));
    this.q(".mute").textContent = this.host.muted ? "🔇" : "🔊";
    const xp = this.q(".xp");
    (xp.querySelector("i") as HTMLElement).style.width = `${Math.min(100, (run.xp / run.xpNext) * 100)}%`;
    (xp.querySelector("span") as HTMLElement).textContent = `inspiração · motivos ${run.level}`;
    this.renderChords();
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.q(".banner").classList.add("hidden");
    }
    if (this.tut) this.tickTutorial(dt);
  }

  /** guia dos acordes disponíveis: as notas já cortadas no traço acendem */
  private renderChords(): void {
    const run = this.host.run;
    const stroke = new Set(run.stroke);
    const key = run.st.chords.map((c) => c.id).join() + "|" + [...stroke].join();
    if (key === this.chordKey) return;
    this.chordKey = key;
    this.q(".chordguide").innerHTML =
      `<small>acordes · corte as 3 notas num traço só</small>` +
      run.st.chords
        .map((c) => {
          const full = c.degs.every((d) => stroke.has(d));
          return `<div class="ch ${full ? "full" : ""}"><b>${c.roman}</b>${c.degs
            .map((d) => `<i class="${stroke.has(d) ? "lit" : ""}" style="--c:${DEGREE_COLORS[d]}">${degreeNote(run.key, d)}</i>`)
            .join("")}</div>`;
        })
        .join("");
  }

  // ------------------------------------------------------------ motivos
  showOffer(): void {
    this.offerOpen = true;
    this.host.run.openOffer();
    this.renderOffer();
  }

  private renderOffer(): void {
    const run = this.host.run;
    const offer = run.openOffer();
    const m = this.q(".modal");
    m.classList.remove("hidden");
    if (!offer.length) {
      run.offer = null;
      run.pendingLevels = 0;
      this.closeOffer();
      return;
    }
    m.innerHTML = `<div class="box offer"><h2><span>Inspiração!</span> escolha um motivo</h2>
      <div class="cards">${offer
        .map((id) => {
          const d = MOTIFS[id];
          const l = run.m(id);
          return `<button class="card" data-act="pick:${id}"><i class="glyph">${d.glyph}</i><b>${d.name}</b><small>${d.desc}</small><em>${l ? `nível ${l} → ${l + 1}` : "novo"}</em></button>`;
        })
        .join("")}</div>
      ${run.rerolls > 0 ? `<button class="btn small" data-act="reroll">↻ trocar opções (${run.rerolls})</button>` : ""}</div>`;
  }

  private closeOffer(): void {
    this.offerOpen = false;
    this.q(".modal").classList.add("hidden");
  }

  // ------------------------------------------------------------ modais
  private showPause(): void {
    this.modalOpen = true;
    const t = this.host.touch;
    const run = this.host.run;
    const motifs = (Object.keys(run.motifs) as MotifId[]).map((id) => `<span class="chip">${MOTIFS[id].glyph} ${MOTIFS[id].name} ${run.m(id)}</span>`).join("");
    const m = this.q(".modal");
    m.classList.remove("hidden");
    m.innerHTML = `<div class="box"><h2>Pausa</h2>
      <ul class="help">
        <li><b>${t ? "Arraste o dedo" : "Passe o mouse"}</b> sobre as notas para cortá-las. Cada golpe gasta fôlego.</li>
        <li><b>No tempo:</b> golpes na batida (quando o anel pulsa) causam mais dano.</li>
        <li><b>Acordes:</b> corte as 3 notas de um acorde num traço só para uma explosão harmônica.</li>
        <li><b>Escala:</b> 3 notas seguidas em ordem (Dó-Ré-Mi…) devolvem fôlego.</li>
      </ul>
      ${motifs ? `<div class="chips">${motifs}</div>` : ""}
      <div class="row"><button class="btn ok" data-act="resume">Continuar</button><button class="btn danger" data-act="abandon">Encerrar concerto</button></div></div>`;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.q(".modal").classList.add("hidden");
  }

  showEnd(info: { won: boolean; room: number; kills: number; chords: number; notes: number; scores: number; unlocked: string | null; time: string }, onHub: () => void, onAgain: () => void): void {
    this.modalOpen = true;
    const m = this.q(".modal");
    m.classList.remove("hidden");
    m.innerHTML = `<div class="box end ${info.won ? "won" : ""}"><h2>${info.won ? "Bravo! Bis!" : "A Lyra desafinou"}</h2>
      <p class="big">${info.won ? "Você venceu o Trítono" : `Chegou ao movimento <b>${info.room}</b>`}</p>
      ${info.unlocked ? `<p class="unlock">Nova tonalidade liberada: <b>${info.unlocked}</b></p>` : ""}
      <div class="grid">
        <div><small>Notas cortadas</small><b>${fmt(info.kills)}</b></div>
        <div><small>Acordes</small><b>${fmt(info.chords)}</b></div>
        <div><small>Tempo</small><b>${info.time}</b></div>
      </div>
      <p class="gain">+${fmt(info.notes)} <span>♪ notas</span>${info.scores ? ` · +${info.scores} <span>partituras</span>` : ""}</p>
      <div class="row"><button class="btn ok" data-end="hub">Evoluir</button><button class="btn" data-end="again">Reger de novo</button></div></div>`;
    m.querySelector('[data-end="hub"]')!.addEventListener("click", onHub);
    m.querySelector('[data-end="again"]')!.addEventListener("click", onAgain);
  }

  // ------------------------------------------------------------ tutorial
  private startTutorial(): void {
    const run = this.host.run;
    const t = this.host.touch;
    const k = run.key;
    const group = (degs: number[], ang: number, type: "seminima" = "seminima") => {
      degs.forEach((d, i) => {
        const p = run.edgePoint(ang + (i - (degs.length - 1) / 2) * 0.12, 10);
        const e = run.spawn(type, d, p.x * 0.92, p.y * 0.92);
        e.speed *= 0.6;
      });
    };
    let chordTries = 0;
    this.tut = [
      {
        text: `Você é a <b>batuta</b> do maestro. ${t ? "Arraste o dedo" : "Passe o mouse"} por cima das notas para <b>cortá-las</b>.`,
        hint: "Elas querem calar a Lyra, a cantora no centro. Cada corte toca a nota do monstro.",
        enter: () => group([0, 3, 5], 0),
        marker: () => {
          const e = run.enemies[0];
          return e ? { x: e.x, y: e.y, r: 24 } : null;
        },
        done: () => run.enemies.length === 0,
      },
      {
        text: `Agora um <b>acorde</b>: corte <b style="color:${DEGREE_COLORS[0]}">${degreeNote(k, 0)}</b>, <b style="color:${DEGREE_COLORS[2]}">${degreeNote(k, 2)}</b> e <b style="color:${DEGREE_COLORS[4]}">${degreeNote(k, 4)}</b> num traço só.`,
        hint: `Juntas elas formam o acorde I · ${chordName(k, run.st.chords[0])}, que explode tudo em volta. O guia de acordes fica no canto.`,
        hl: ".chordguide",
        enter: () => group([0, 2, 4], Math.PI),
        marker: () => {
          const e = run.enemies[1] ?? run.enemies[0];
          return e ? { x: e.x, y: e.y, r: 46 } : null;
        },
        done: () => {
          if (run.chords > 0) return true;
          if (run.enemies.length === 0 && chordTries++ < 4) group([0, 2, 4], Math.PI * (chordTries % 2 ? 0.5 : 1.5));
          return run.enemies.length === 0;
        },
      },
      {
        text: "Corte <b>no tempo</b>: quando o anel dourado pulsa e a ponta da batuta brilha, o golpe é mais forte.",
        hint: "Os bichos também marcham no ritmo. Ouça o metrônomo.",
        hl: ".beats",
        enter: () => {
          this.beatHits = 0;
          group([1, 4, 6, 2], Math.PI / 2);
        },
        done: () => run.enemies.length === 0,
      },
      {
        text: "Cada golpe gasta <b>fôlego</b> (o arco em volta da batuta). Sem fôlego, a batuta não corta.",
        hint: "Pare de cortar por um instante e ele volta. Uma escala (3 notas em ordem, tipo Dó-Ré-Mi) também devolve fôlego.",
        done: () => this.tutT > 5,
      },
      {
        text: "Ao cortar notas você ganha <b>inspiração</b>. Cada nível cheio deixa você escolher um <b>motivo</b>.",
        hint: "Motivos valem só para este concerto. Na árvore de Evolução você libera mais.",
        hl: ".xp",
        enter: () => run.gainXp(run.xpNext - run.xp, true),
        done: () => run.level > 0 && !this.offerOpen && this.tutT > 1,
      },
      {
        text: "Pronto, maestro! O concerto tem <b>5 movimentos</b>. No último, o <b>Trítono</b> aparece.",
        hint: "Ganhando ou perdendo, as notas ♪ ficam com você para evoluir.",
        done: () => this.tutT > 4,
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
    box.classList.remove("hidden", "pop");
    void box.offsetWidth;
    box.classList.add("pop");
    this.q(".tutorial .tt").innerHTML = `<em>${this.tutI + 1}/${this.tut.length}</em> ${st.text}`;
    this.q(".tutorial .th").innerHTML = st.hint ?? "";
  }

  private tickTutorial(dt: number): void {
    const st = this.tut![this.tutI];
    if (!st) return;
    this.tutT += dt;
    if (st.hl) this.root.querySelectorAll(st.hl).forEach((e) => e.classList.add("hl"));
    this.marker = st.marker?.() ?? null;
    if (this.tutT > 0.5 && st.done()) this.nextTut();
  }

  private endTutorial(): void {
    if (!this.tut) return;
    this.tut = null;
    this.marker = null;
    this.root.querySelectorAll(".hl").forEach((e) => e.classList.remove("hl"));
    this.q(".tutorial").classList.add("hidden");
    this.host.run.enemies.length = 0;
    this.host.run.beginConcert();
    this.host.tutorialFinished();
  }
}
