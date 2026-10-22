import { fmt } from "../core/format";
import { TAU } from "../core/math";
import { BRANCHES, CHORDS, DEGREE_COLORS, DEGREE_ROMAN, ENEMIES, KEYS, MAJOR, ROOMS_PER_CONCERT, TREE, chordName, degreeNote, type TreeNode } from "../data/content";
import { buyNode, canBuy, lvl, nodeAvailable, nodeCost, nodeLockedByKey, type Profile } from "../game/profile";
import { keyHp } from "../game/sim";

export type HubTab = "concert" | "tree" | "theory";

export interface HubHost {
  profile: Profile;
  touch: boolean;
  start(keyIdx: number, tutorial: boolean): void;
  save(): void;
  reset(): void;
  preview(midi: number[]): void;
}

const ROOT_COLOR = "#ffffff";
const colorOf = (n: TreeNode) => (n.branch === "root" ? ROOT_COLOR : BRANCHES[n.branch].color);

/** Camarim: escolher a tonalidade, evoluir e ler um pouco de teoria. */
export class Hub {
  readonly root: HTMLElement;
  tab: HubTab;
  private keySel: number;
  private treeCanvas: HTMLCanvasElement | null = null;
  private selNode = "root";
  private pan = { x: 0, y: 0 };
  private zoom = 1;
  private confirmReset = false;

  constructor(
    private host: HubHost,
    parent: HTMLElement,
    tab: HubTab = "concert",
  ) {
    const el = document.createElement("div");
    el.className = "hub";
    parent.appendChild(el);
    this.root = el;
    this.tab = tab;
    this.keySel = host.profile.keyUnlocked;
    const buyable = TREE.find((n) => canBuy(host.profile, n.id));
    if (buyable) this.selNode = buyable.id;
    el.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
      if (t) this.act(t.dataset.act!);
    });
    this.onResize = this.onResize.bind(this);
    window.addEventListener("resize", this.onResize);
    this.render();
  }

  private onResize(): void {
    if (this.tab === "tree") this.drawTree();
  }

  destroy(): void {
    window.removeEventListener("resize", this.onResize);
    this.root.remove();
  }

  private act(a: string): void {
    const p = this.host.profile;
    const [k, arg] = a.split(":");
    switch (k) {
      case "tab":
        this.tab = arg as HubTab;
        break;
      case "key":
        if (Number(arg) <= p.keyUnlocked) {
          this.keySel = Number(arg);
          const key = KEYS[this.keySel];
          this.host.preview([0, 2, 4].map((d) => key.root + MAJOR[d]));
        }
        break;
      case "start":
        this.host.start(this.keySel, arg === "tut" || !p.tutorialDone);
        return;
      case "buy":
        if (buyNode(p, arg)) {
          this.host.save();
          this.host.preview([72 + (TREE.findIndex((n) => n.id === arg) % 7) * 2]);
        }
        break;
      case "hear": {
        const key = KEYS[this.keySel];
        const c = CHORDS.find((c) => c.id === arg);
        if (c) this.host.preview(c.degs.map((d) => key.root + MAJOR[d] + (d < c.degs[0] ? 12 : 0)));
        else this.host.preview(MAJOR.map((m) => key.root + m).concat([key.root + 12]));
        return;
      }
      case "reset":
        if (!this.confirmReset) this.confirmReset = true;
        else this.host.reset();
        break;
    }
    this.render();
  }

  render(): void {
    const p = this.host.profile;
    const avail = TREE.filter((n) => canBuy(p, n.id)).length;
    this.root.innerHTML = `
      <header><h1><span class="logo">♪</span><span>DISSO<b>NÂNCIA</b></span></h1>
        <div class="wallet"><span class="notes"><i class="nt">♪</i><b>${fmt(Math.floor(p.notes))}</b><small>notas</small></span>${p.scores || p.wins ? `<span class="scores"><i class="sc"></i><b>${p.scores}</b><small>partituras</small></span>` : ""}</div></header>
      <nav>
        <button class="${this.tab === "concert" ? "on" : ""}" data-act="tab:concert">Concerto</button>
        <button class="${this.tab === "tree" ? "on" : ""}" data-act="tab:tree">Evolução${avail ? `<em>${avail}</em>` : ""}</button>
        <button class="${this.tab === "theory" ? "on" : ""}" data-act="tab:theory">Teoria</button>
      </nav>
      <section class="body tab-${this.tab}"></section>`;
    const body = this.root.querySelector(".body") as HTMLElement;
    if (this.tab === "concert") body.innerHTML = this.concert();
    else if (this.tab === "theory") body.innerHTML = this.theory();
    else this.tree(body);
  }

  // ------------------------------------------------------------ concerto
  private concert(): string {
    const p = this.host.profile;
    const key = KEYS[this.keySel];
    const first = !p.tutorialDone;
    // ciclo das quintas: as 12 tonalidades em volta; as 8 primeiras são jogáveis
    const circle = ["Dó", "Sol", "Ré", "Lá", "Mi", "Si", "Fá♯", "Dó♯", "Lá♭", "Mi♭", "Si♭", "Fá"];
    const R = 41;
    const dots = circle
      .map((name, i) => {
        const a = (i / 12) * TAU - Math.PI / 2;
        const x = 50 + Math.cos(a) * R;
        const y = 50 + Math.sin(a) * R;
        const playable = i < KEYS.length;
        const open = playable && i <= p.keyUnlocked;
        const cls = `${open ? "open" : ""} ${i === this.keySel ? "on" : ""} ${playable ? "" : "soon"}`;
        const done = (p.best[KEYS[i]?.id] ?? 0) > ROOMS_PER_CONCERT;
        return `<button class="kdot ${cls}" style="left:${x}%;top:${y}%" ${open ? `data-act="key:${i}"` : "disabled"}>${name}${done ? "<i>✓</i>" : ""}</button>`;
      })
      .join("");
    const best = p.best[key.id] ?? 0;
    const scale = MAJOR.map((_, d) => `<i style="--c:${DEGREE_COLORS[d]}">${degreeNote(key, d)}</i>`).join("");
    const threats = Object.values(ENEMIES)
      .filter((e) => e.fromKey <= this.keySel)
      .map((e) => `<span class="chip" title="${e.desc}">${e.name}</span>`)
      .join("");
    return `<div class="concert">
      <div class="wheel"><div class="ring"></div>${dots}<div class="center"><small>ciclo das quintas</small><b>${key.name}</b><span>${key.sharps ? `${key.sharps} sustenido${key.sharps > 1 ? "s" : ""}` : "sem acidentes"}</span></div></div>
      <div class="side">
        <p class="lead">Você é a <b>batuta</b>. Corte as notas desafinadas que querem calar a <b>Lyra</b>, forme <b>acordes</b> e golpeie <b>no tempo</b>.</p>
        <div class="keycard">
          <div class="scale">${scale}</div>
          <div class="kstats"><span>Força <b>×${fmt(keyHp(this.keySel))}</b></span><span>Recompensa <b>×${fmt(Math.pow(1.8, this.keySel))}</b></span><span>Recorde <b>${best > ROOMS_PER_CONCERT ? "vencido" : best ? `mov. ${best}` : "—"}</b></span></div>
          <div class="chips">${threats}</div>
        </div>
        <button class="go" data-act="start">${first ? "Primeiro ensaio (tutorial)" : `Reger em ${key.name}`}</button>
        ${first ? "" : '<button class="link" data-act="start:tut">rever tutorial</button>'}
        <p class="note small">${p.runs} concertos · ${p.wins} vitórias · ${fmt(p.kills)} notas cortadas · ${fmt(p.chords)} acordes · <button class="link" data-act="reset">${this.confirmReset ? "confirmar: apagar tudo" : "apagar progresso"}</button></p>
      </div></div>`;
  }

  // ------------------------------------------------------------ teoria
  private theory(): string {
    const key = KEYS[this.keySel];
    const scale = MAJOR.map((_, d) => `<i style="--c:${DEGREE_COLORS[d]}"><small>${DEGREE_ROMAN[d]}</small>${degreeNote(key, d)}</i>`).join("");
    const chords = CHORDS.map((c) => {
      const has = !c.node || lvl(this.host.profile, c.node) > 0;
      return `<button class="tchord ${has ? "" : "locked"}" data-act="hear:${c.id}"><b>${c.roman}</b><span>${chordName(key, c)}</span><span class="nn">${c.degs.map((d) => `<i style="--c:${DEGREE_COLORS[d]}">${degreeNote(key, d)}</i>`).join("")}</span>${has ? "" : "<small>libere na Evolução</small>"}</button>`;
    }).join("");
    return `<div class="theory">
      <article><h3>A escala maior <button class="link" data-act="hear:scale">▶ ouvir</button></h3>
        <p>Sete notas com o padrão <b>tom, tom, semitom, tom, tom, tom, semitom</b>. Em ${key.name}:</p>
        <div class="scale big">${scale}</div>
        <p>Cada <b>grau</b> (I a VII) tem uma cor no jogo. As notas-monstro carregam essa cor e o nome da nota.</p></article>
      <article><h3>Tríades e acordes</h3>
        <p>Uma tríade empilha três notas pulando uma: 1ª, 3ª e 5ª. Corte as três num único traço para formar o acorde. Toque para ouvir:</p>
        <div class="tchords">${chords}</div>
        <p><b>I, IV e V</b> são maiores e sustentam quase toda música popular. <b>ii, iii e vi</b> são menores, mais melancólicas. O <b>V7</b> tem quatro notas e cria a tensão que pede para voltar ao I.</p></article>
      <article><h3>Ritmo e tempo</h3>
        <p><b>BPM</b> é quantas batidas por minuto. Um compasso de 4 tempos tem 4 batidas, e a 1ª é a mais forte. Golpes que caem na batida são mais fortes. A <b>Pausa</b> é silêncio, então ela só pode ser cortada entre os tempos.</p></article>
      <article><h3>Ciclo das quintas</h3>
        <p>Subindo uma quinta (Dó → Sol → Ré…), cada tonalidade nova ganha um <b>sustenido</b>. No jogo, cada passo no ciclo é um concerto mais difícil e mais rico.</p></article>
      <article><h3>Trítono</h3>
        <p>O intervalo de três tons inteiros (ex.: Fá–Si), apelidado de <i>diabolus in musica</i> por soar instável. É o chefe de cada concerto.</p></article>
    </div>`;
  }

  // ------------------------------------------------------------ árvore
  private nodePos(n: TreeNode): { x: number; y: number } {
    if (n.branch === "root") return { x: 0, y: 0 };
    const a = (BRANCHES[n.branch].angle * Math.PI) / 180;
    const d = n.depth * 1.05 + 0.25;
    const px = -Math.sin(a);
    const py = Math.cos(a);
    return { x: Math.cos(a) * d + px * n.lat * 0.55, y: Math.sin(a) * d + py * n.lat * 0.55 };
  }

  private tree(body: HTMLElement): void {
    const p = this.host.profile;
    const n = TREE.find((x) => x.id === this.selNode) ?? TREE[0];
    const l = lvl(p, n.id);
    const maxed = l >= n.max;
    const lockedKey = nodeLockedByKey(p, n.id);
    const avail = nodeAvailable(p, n.id);
    const cost = nodeCost(n.id, l);
    const can = canBuy(p, n.id);
    const cur = n.score ? `<i class="sc"></i>${cost}` : `<i class="nt">♪</i>${fmt(cost)}`;
    const branch = n.branch === "root" ? "Origem" : BRANCHES[n.branch].name;
    body.innerHTML = `<div class="treewrap"><canvas class="treecv"></canvas>
      <div class="detail" style="--bc:${colorOf(n)}">
        <div class="dh"><b>${n.name}</b><span>${l}/${n.max}</span></div>
        <small class="br">${branch}</small>
        <p>${n.desc}</p>
        ${lockedKey ? `<p class="req">Vença o concerto em ${KEYS[(n.key ?? 1) - 1].name} para liberar.</p>` : !avail ? `<p class="req">Requer: ${n.requires.map((r) => TREE.find((x) => x.id === r)!.name).join(" ou ")}</p>` : ""}
        ${maxed ? '<button class="buy done" disabled>Completo</button>' : `<button class="buy ${can ? "" : "poor"}" data-act="buy:${n.id}" ${can ? "" : "disabled"}>${l ? "Melhorar" : "Aprender"} · ${cur}</button>`}
      </div>
      <div class="legend">${Object.values(BRANCHES)
        .map((b) => `<span style="--c:${b.color}">${b.name}</span>`)
        .join("")}</div></div>`;
    const cv = body.querySelector(".treecv") as HTMLCanvasElement;
    this.treeCanvas = cv;
    requestAnimationFrame(() => this.drawTree());
    const pts = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; px: number; py: number; moved: boolean } | null = null;
    let pinch = 0;
    cv.onpointerdown = (e) => {
      cv.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, px: this.pan.x, py: this.pan.y, moved: false };
      else {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
        if (drag) drag.moved = true;
      }
    };
    cv.onpointermove = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) this.zoom = Math.max(0.6, Math.min(2.4, this.zoom * (d / pinch)));
        pinch = d;
        this.drawTree();
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      if (!drag.moved) return;
      this.pan.x = drag.px + dx;
      this.pan.y = drag.py + dy;
      this.drawTree();
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (drag && !drag.moved && pts.size === 0) {
        const hit = this.nodeAt(e.clientX, e.clientY);
        if (hit) {
          this.selNode = hit.id;
          this.render();
          return;
        }
      }
      if (pts.size === 0) drag = null;
    };
    cv.onpointerup = up;
    cv.onpointercancel = up;
    cv.onwheel = (e) => {
      e.preventDefault();
      this.zoom = Math.max(0.6, Math.min(2.4, this.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      this.drawTree();
    };
  }

  private layout(cv: HTMLCanvasElement) {
    const r = cv.getBoundingClientRect();
    const P = TREE.map((n) => this.nodePos(n));
    const ext = Math.max(...P.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y)))) + 0.7;
    const wide = r.width > 700;
    const usableW = wide ? r.width - Math.min(330, r.width * 0.36) : r.width;
    const usableH = wide ? r.height : r.height - 130;
    const step = Math.max(26, Math.min(usableW, usableH - 30) / (ext * 2)) * this.zoom;
    const cx = usableW / 2 + this.pan.x;
    const cy = (usableH - 30) / 2 + 6 + this.pan.y;
    return { r, step, cx, cy, rad: Math.max(12, Math.min(26, step * 0.36)) };
  }

  private nodeAt(sx: number, sy: number): TreeNode | undefined {
    const cv = this.treeCanvas;
    if (!cv) return;
    const L = this.layout(cv);
    const x = sx - L.r.left;
    const y = sy - L.r.top;
    let best: TreeNode | undefined;
    let bd = L.rad + 10;
    for (const n of TREE) {
      const p = this.nodePos(n);
      const d = Math.hypot(L.cx + p.x * L.step - x, L.cy + p.y * L.step - y);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  private drawTree(): void {
    const cv = this.treeCanvas;
    if (!cv || !cv.isConnected) return;
    const p = this.host.profile;
    const L = this.layout(cv);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(L.r.width * dpr);
    cv.height = Math.round(L.r.height * dpr);
    const g = cv.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, L.r.width, L.r.height);
    const pos = (n: TreeNode) => {
      const q = this.nodePos(n);
      return { x: L.cx + q.x * L.step, y: L.cy + q.y * L.step };
    };
    // pauta circular decorativa
    g.strokeStyle = "rgba(230,190,120,0.07)";
    for (let k = 0; k < 5; k++) {
      g.beginPath();
      g.arc(L.cx, L.cy, L.step * (2.6 + k * 0.18), 0, TAU);
      g.stroke();
    }
    for (const n of TREE)
      for (const rq of n.requires) {
        const a = pos(TREE.find((x) => x.id === rq)!);
        const b = pos(n);
        const own = lvl(p, n.id) > 0;
        const lit = lvl(p, rq) > 0;
        g.strokeStyle = own ? colorOf(n) : lit ? "rgba(220,210,255,0.4)" : "rgba(130,120,170,0.15)";
        g.lineWidth = own ? 3.5 : 2.2;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
    for (const n of TREE) {
      const { x, y } = pos(n);
      const l = lvl(p, n.id);
      const avail = nodeAvailable(p, n.id);
      const col = colorOf(n);
      const afford = canBuy(p, n.id);
      const keyLock = nodeLockedByKey(p, n.id);
      g.save();
      g.globalAlpha = avail || l ? 1 : 0.32;
      if (afford) {
        g.shadowColor = col;
        g.shadowBlur = 18;
      }
      const big = n.max === 1 || n.branch === "root";
      g.beginPath();
      if (big) {
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU + Math.PI / 6;
          const rr = L.rad * 1.08;
          if (k) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.closePath();
      } else g.arc(x, y, L.rad, 0, TAU);
      g.fillStyle = l ? "#211836" : "#0d0a18";
      g.fill();
      g.lineWidth = n.id === this.selNode ? 3.5 : 2.2;
      g.strokeStyle = n.id === this.selNode ? "#fff" : l || afford ? col : "rgba(160,150,200,0.45)";
      g.stroke();
      g.shadowBlur = 0;
      if (n.max > 1 && l > 0) {
        g.strokeStyle = col;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(x, y, L.rad + 4.5, -Math.PI / 2, -Math.PI / 2 + (TAU * l) / n.max);
        g.stroke();
      }
      g.fillStyle = l ? col : "rgba(220,215,240,0.85)";
      const gl = keyLock ? "🔒" : n.glyph;
      g.font = `800 ${Math.round(L.rad * (gl.length > 1 ? 0.62 : 0.9))}px Georgia, serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(gl, x, y + 1);
      if (L.step > 46 && n.max > 1) {
        g.font = "700 10px system-ui, sans-serif";
        g.fillStyle = "#c8c0e0";
        g.fillText(`${l}/${n.max}`, x, y + L.rad + 12);
      }
      if (n.score && !l) {
        g.font = "700 9px system-ui, sans-serif";
        g.fillStyle = "#ffd27a";
        g.fillText("partitura", x, y - L.rad - 8);
      }
      g.restore();
    }
  }
}

