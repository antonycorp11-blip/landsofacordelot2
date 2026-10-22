import { fmt } from "../core/format";
import { TAU } from "../core/math";
import { DEGREE_COLORS, degreeNote } from "../data/content";
import { level, type Profile } from "../game/profile";
import type { Run, SimEvent } from "../game/sim";
import { SPR } from "../render/pixels";

export interface HudHost {
  readonly run: Run;
  readonly profile: Profile;
  readonly touch: boolean;
  setPaused(on: boolean): void;
  toggleMute(): void;
  muted(): boolean;
  abandon(): void;
}

/** HUD no estilo do original: orbe de vigor, habilidades, moedas, minimapa, barras e diálogo. */
export class Hud {
  readonly root: HTMLElement;
  private q = <T extends HTMLElement>(s: string) => this.root.querySelector(s) as T;
  private mini: HTMLCanvasElement;
  private orb: HTMLCanvasElement;
  dialogOpen = false;
  modalOpen = false;
  private dialogQueue: string[] = [];
  private dialogDone: (() => void) | null = null;
  private feedItems: { el: HTMLElement; t: number }[] = [];

  constructor(
    private host: HudHost,
    parent: HTMLElement,
  ) {
    const el = document.createElement("div");
    el.className = "hud";
    el.innerHTML = `
      <button class="menu" data-act="pause" aria-label="Pausa"><i></i><i></i><i></i></button>
      <div class="chordbox"></div>
      <div class="tr">
        <div class="place"></div>
        <canvas class="mini" width="150" height="110"></canvas>
        <div class="bars"><div class="room"><i></i></div><div class="hp"><i></i><span>TITO</span></div></div>
      </div>
      <div class="feed"></div>
      <div class="bl">
        <div class="orbwrap"><canvas class="orb" width="96" height="96"></canvas><b class="lv"></b></div>
        <div class="slots">
          <div class="slot on" title="Corte"><i class="ic lua"></i></div>
          <div class="slot ciclo" title="Ciclo das Quintas: desenhe um círculo"><i class="ic circulo"></i><s></s></div>
          <div class="slot beat" title="Batida do tambor"><i></i><i></i><i></i><i></i></div>
        </div>
        <div class="money"><span><i class="cn n">♪</i><b class="mn"></b></span><span><i class="cn c">◆</i><b class="mc"></b></span><span class="sp"><i class="cn p">▤</i><b class="mp"></b></span></div>
      </div>
      <div class="segs"></div>
      <div class="dialog hidden"><div class="name">TITO</div><canvas class="face" width="96" height="102"></canvas><p></p><small>${host.touch ? "Toque" : "Clique"} para continuar</small></div>
      <div class="modal hidden"></div>`;
    parent.appendChild(el);
    this.root = el;
    this.mini = this.q(".mini");
    this.orb = this.q(".orb");
    const face = (this.q(".face") as HTMLCanvasElement).getContext("2d")!;
    face.imageSmoothingEnabled = false;
    face.drawImage(SPR.portrait.img, 0, 0, SPR.portrait.w * 5.5, SPR.portrait.h * 5.5);
    el.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const b = t.closest("[data-act]") as HTMLElement | null;
      if (b) return this.act(b.dataset.act!);
      if (t.closest(".dialog")) this.nextLine();
    });
    const segs = this.q(".segs");
    segs.innerHTML = host.run.rooms.map((r) => `<i class="${r.boss ? "boss" : ""}"></i>`).join("");
  }

  destroy(): void {
    this.root.remove();
  }

  act(a: string): void {
    switch (a) {
      case "pause":
        if (this.modalOpen) return;
        this.host.setPaused(true);
        this.showPause();
        break;
      case "resume":
        this.closeModal();
        this.host.setPaused(false);
        break;
      case "mute":
        this.host.toggleMute();
        this.showPause();
        break;
      case "abandon":
        this.closeModal();
        this.host.abandon();
        break;
    }
  }

  // ------------------------------------------------------------ diálogo
  say(lines: string[], done?: () => void): void {
    this.dialogQueue = [...lines];
    this.dialogDone = done ?? null;
    this.dialogOpen = true;
    this.q(".dialog").classList.remove("hidden");
    this.nextLine();
  }

  nextLine(): void {
    const l = this.dialogQueue.shift();
    if (l === undefined) {
      this.dialogOpen = false;
      this.q(".dialog").classList.add("hidden");
      const d = this.dialogDone;
      this.dialogDone = null;
      d?.();
      return;
    }
    const p = this.q(".dialog p");
    p.textContent = "";
    let i = 0;
    const type = () => {
      if (p.dataset.line !== l) return;
      p.textContent = l.slice(0, ++i);
      if (i < l.length) setTimeout(type, 14);
    };
    p.dataset.line = l;
    type();
  }

  // ------------------------------------------------------------ registro à esquerda
  feed(text: string, cls = ""): void {
    const box = this.q(".feed");
    const el = document.createElement("div");
    el.className = cls;
    el.textContent = text;
    box.appendChild(el);
    this.feedItems.push({ el, t: 3 });
    while (this.feedItems.length > 6) this.feedItems.shift()!.el.remove();
  }

  onEvents(evs: SimEvent[]): void {
    for (const e of evs) {
      if (e.k === "gain") {
        if (e.what === "vigor") this.feed(`+${e.n} de Vigor`, "vig");
        else if (e.what === "exp") this.feed(`+${fmt(e.n)} EXP`, "exp");
        else if (e.what === "cristais") this.feed(`+${e.n} Cristal${e.n > 1 ? "is" : ""}`, "cri");
        else this.feed(`+${e.n} Partitura${e.n > 1 ? "s" : ""}`, "par");
      } else if (e.k === "roomClear") this.feed("Sala afinada!", "ok");
      else if (e.k === "beat") {
        this.root.querySelectorAll(".slot.beat i").forEach((d, i) => d.classList.toggle("on", i === e.n % 4));
      }
    }
  }

  // ------------------------------------------------------------ por quadro
  update(dt: number): void {
    const run = this.host.run;
    const p = this.host.profile;
    this.q(".place").innerHTML = `${run.dungeon.name} <span>|</span> <em>Ensaio ${p.day}</em>`;
    (this.q(".room i") as HTMLElement).style.width = `${run.roomProgress() * 100}%`;
    (this.q(".hp i") as HTMLElement).style.width = `${Math.max(0, (run.tito.hp / run.tito.maxHp) * 100)}%`;
    this.q(".lv").textContent = String(level(p.exp + run.exp).lvl);
    this.q(".mn").textContent = fmt(Math.floor(p.notas + run.notas));
    this.q(".mc").textContent = fmt(p.cristais + run.cristais);
    this.q(".mp").textContent = fmt(p.partituras + run.partituras);
    this.q(".money .sp").classList.toggle("hidden", p.partituras + run.partituras <= 0);
    const ciclo = this.q(".slot.ciclo");
    ciclo.classList.toggle("locked", !run.st.circle);
    (ciclo.querySelector("s") as HTMLElement).style.height = `${run.st.circle ? (run.circleCd / run.st.circleCd) * 100 : 0}%`;
    this.root.querySelectorAll(".segs i").forEach((s, i) => {
      s.classList.toggle("done", run.rooms[i].cleared);
      s.classList.toggle("cur", i === run.roomI);
    });
    this.drawOrb(run);
    this.drawMini(run);
    this.chordBox(run);
    for (const f of this.feedItems) {
      f.t -= dt;
      f.el.style.opacity = String(Math.max(0, Math.min(1, f.t)));
    }
    while (this.feedItems.length && this.feedItems[0].t <= 0) this.feedItems.shift()!.el.remove();
  }

  private chordKey = "";
  private chordBox(run: Run): void {
    const stroke = new Set(run.stroke.notes);
    const key = run.st.chords.map((c) => c.id).join() + [...stroke].join();
    if (key === this.chordKey) return;
    this.chordKey = key;
    this.q(".chordbox").innerHTML =
      "<small>ACORDES</small>" +
      run.st.chords
        .map((c) => `<div><b>${c.roman}</b>${c.degs.map((d) => `<i class="${stroke.has(d) ? "lit" : ""}" style="--c:${DEGREE_COLORS[d]}">${degreeNote(run.key, d)}</i>`).join("")}</div>`)
        .join("");
  }

  private drawOrb(run: Run): void {
    const g = this.orb.getContext("2d")!;
    const S = 96;
    g.clearRect(0, 0, S, S);
    const c = S / 2;
    const R = 40;
    const f = run.vigor / run.vigorMax;
    g.fillStyle = "#1a1418";
    g.beginPath();
    g.arc(c, c, R + 5, 0, TAU);
    g.fill();
    g.save();
    g.beginPath();
    g.arc(c, c, R, 0, TAU);
    g.clip();
    g.fillStyle = "#2a2018";
    g.fillRect(0, 0, S, S);
    const top = c + R - 2 * R * f;
    const col = run.tired ? ["#c84a3a", "#8a2a22"] : ["#f6d860", "#c8a030"];
    const gr = g.createLinearGradient(0, top, 0, c + R);
    gr.addColorStop(0, col[0]);
    gr.addColorStop(1, col[1]);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, S);
    for (let x = 0; x <= S; x += 4) g.lineTo(x, top + Math.sin(x * 0.12 + performance.now() / 300) * 2);
    g.lineTo(S, S);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.beginPath();
    g.ellipse(c - 14, c - 16, 9, 6, -0.5, 0, TAU);
    g.fill();
    // lua crescente
    g.fillStyle = "rgba(255,250,230,0.55)";
    g.beginPath();
    g.arc(c + 12, c - 4, 9, 0, TAU);
    g.fill();
    g.globalCompositeOperation = "destination-out";
    g.beginPath();
    g.arc(c + 16, c - 7, 8, 0, TAU);
    g.fill();
    g.restore();
    g.strokeStyle = "#5a4a40";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(c, c, R + 2, 0, TAU);
    g.stroke();
  }

  private drawMini(run: Run): void {
    const g = this.mini.getContext("2d")!;
    const W = this.mini.width;
    const H = this.mini.height;
    g.clearRect(0, 0, W, H);
    const cur = run.room;
    const s = 22;
    // salas em losango (projeção isométrica), centrado na sala atual
    const P = (gx: number, gy: number) => [W / 2 + (gx - gy) * s, H / 2 + ((gx + gy) * s) / 2] as const;
    const [ox, oy] = P(cur.gx + 0.5, cur.gy + 0.5);
    const dx = W / 2 - ox;
    const dy = H / 2 - oy;
    run.rooms.forEach((r, i) => {
      if (!r.visited && i !== run.roomI + 1) return;
      const pts = [P(r.gx, r.gy), P(r.gx + 1, r.gy), P(r.gx + 1, r.gy + 1), P(r.gx, r.gy + 1)];
      g.fillStyle = i === run.roomI ? "#4a4440" : r.visited ? "#34302c" : "#201c1a";
      g.beginPath();
      pts.forEach(([x, y], k) => (k ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
      g.closePath();
      g.fill();
      if (r.boss && (r.visited || i === run.roomI + 1)) {
        const [bx, by] = P(r.gx + 0.5, r.gy + 0.5);
        g.fillStyle = "#ff3a5a";
        g.fillRect(bx + dx - 2, by + dy - 2, 4, 4);
      }
    });
    const dot = (x: number, y: number, c: string, sz: number) => {
      const [px, py] = P(x / 260, y / 260);
      g.fillStyle = c;
      g.fillRect(px + dx - sz / 2, py + dy - sz / 2, sz, sz);
    };
    for (const m of run.monsters) dot(m.x, m.y, "#ff4a6a", 3);
    dot(run.tito.x, run.tito.y, "#ffffff", 4);
  }

  // ------------------------------------------------------------ modais
  private showPause(): void {
    this.modalOpen = true;
    const t = this.host.touch;
    const m = this.q(".modal");
    m.classList.remove("hidden");
    m.innerHTML = `<div class="box"><h2>PAUSA</h2>
      <ul>
        <li>${t ? "Arraste o dedo" : "Passe o mouse rápido"} por cima dos monstros para cortar. Cada acerto gasta <b>vigor</b> (o orbe).</li>
        <li>Monstros com armadura: corte até aparecer <b class="cy">Quebrada!</b></li>
        <li>Corte junto com a <b>batida</b> do tambor do Tito para dano extra.</li>
        <li>Corte as 3 notas de um <b>acorde</b> num traço só (ex.: Dó, Mi e Sol).</li>
        <li>Os marcados <b class="pu">◆</b> dão cristais e vigor.</li>
      </ul>
      <div class="row"><button class="pbtn" data-act="resume">CONTINUAR</button><button class="pbtn dim" data-act="mute">SOM: ${this.host.muted() ? "DESLIGADO" : "LIGADO"}</button><button class="pbtn red" data-act="abandon">SAIR DA MASMORRA</button></div></div>`;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.q(".modal").classList.add("hidden");
  }

  showEnd(info: { won: boolean; notas: number; cristais: number; partituras: number; exp: number; kills: number; chords: number; unlocked: string | null }, onHub: () => void): void {
    this.modalOpen = true;
    const m = this.q(".modal");
    m.classList.remove("hidden");
    m.innerHTML = `<div class="box end"><h2>${info.won ? "MASMORRA AFINADA!" : "O TITO CAIU"}</h2>
      ${info.unlocked ? `<p class="unl">Novo lugar no mapa: <b>${info.unlocked}</b></p>` : ""}
      <div class="loot">
        <span><i class="cn n">♪</i>+${fmt(info.notas)}</span>
        ${info.cristais ? `<span><i class="cn c">◆</i>+${fmt(info.cristais)}</span>` : ""}
        ${info.partituras ? `<span><i class="cn p">▤</i>+${fmt(info.partituras)}</span>` : ""}
        <span class="exp">+${fmt(info.exp)} EXP</span>
      </div>
      <p class="st">${fmt(info.kills)} monstros · ${fmt(info.chords)} acordes</p>
      <div class="row"><button class="pbtn" data-end="1">VOLTAR</button></div></div>`;
    m.querySelector("[data-end]")!.addEventListener("click", onHub);
  }
}
