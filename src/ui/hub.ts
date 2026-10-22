import { fmt } from "../core/format";
import { TAU } from "../core/math";
import { ENEMIES, SATS, TREE, type Branch, type TreeNode } from "../data/content";
import { buyNode, canBuy, computeStats, lvl, nodeAvailable, nodeCost, type Profile } from "../game/profile";

export type HubTab = "play" | "tree";

export interface HubHost {
  profile: Profile;
  touch: boolean;
  start(tutorial: boolean): void;
  save(): void;
  reset(): void;
}

const BRANCH_COLOR: Record<Branch, string> = { root: "#ffffff", sing: "#b07aff", orb: "#4ae0ff", core: "#ffd84a" };

/** Base entre partidas: começar, árvore de evolução. */
export class Hub {
  readonly root: HTMLElement;
  tab: HubTab = "play";
  private treeCanvas: HTMLCanvasElement | null = null;
  private selNode = "root";
  private pan = { x: 0, y: 0 };
  private confirmReset = false;

  constructor(
    private host: HubHost,
    parent: HTMLElement,
    tab: HubTab = "play",
  ) {
    const el = document.createElement("div");
    el.className = "hub";
    parent.appendChild(el);
    this.root = el;
    this.tab = tab;
    if (lvl(host.profile, "root")) {
      const firstBuyable = TREE.find((n) => canBuy(host.profile, n.id));
      if (firstBuyable) this.selNode = firstBuyable.id;
    }
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
      case "start":
        this.host.start(arg === "tut" || !p.tutorialDone);
        return;
      case "buy":
        if (buyNode(p, arg)) this.host.save();
        break;
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
      <header><h1><span class="logo"></span>POÇO <b>GRAVITACIONAL</b></h1>
        <div class="matter"><i class="dm"></i><b>${fmt(Math.floor(p.matter))}</b><small>matéria escura</small></div></header>
      <nav>
        <button class="${this.tab === "play" ? "on" : ""}" data-act="tab:play">Partida</button>
        <button class="${this.tab === "tree" ? "on" : ""}" data-act="tab:tree">Evolução${avail ? `<em>${avail}</em>` : ""}</button>
      </nav>
      <section class="body ${this.tab}"></section>`;
    const body = this.root.querySelector(".body") as HTMLElement;
    if (this.tab === "play") body.innerHTML = this.play();
    else this.tree(body);
  }

  private play(): string {
    const p = this.host.profile;
    const st = computeStats(p);
    const t = this.host.touch;
    const first = !p.tutorialDone;
    const known = Object.values(ENEMIES).filter((e) => e.weight > 0 || e.id === "leviathan");
    return `<div class="playwrap">
      <div class="pitch">
        <p class="lead">Você é uma <b>singularidade</b> protegendo o último planeta. Puxe as naves inimigas com sua gravidade, <b>arremesse</b> umas contra as outras, contra asteroides e contra os satélites que orbitam o núcleo.</p>
        <button class="go" data-act="start">${first ? "Começar (com tutorial)" : "Iniciar partida"}</button>
        ${first ? "" : '<button class="link" data-act="start:tut">rever tutorial</button>'}
        <div class="stats">
          <div><small>Recorde</small><b>Onda ${p.bestWave}</b></div>
          <div><small>Partidas</small><b>${p.runs}</b></div>
          <div><small>Abates</small><b>${fmt(p.kills)}</b></div>
          <div><small>Começa na</small><b>Onda ${st.startWave}</b></div>
        </div>
      </div>
      <div class="info">
        <h3>Controles</h3>
        <ul class="help">
          <li><b>${t ? "Arraste o dedo" : "Mova o mouse"}</b> — move o buraco negro</li>
          <li><b>${t ? "Segure Gravidade" : "Segure o clique"}</b> — gravidade forte</li>
          <li><b>${t ? "Botão Pulso" : "Clique direito / Espaço"}</b> — pulso de repulsão</li>
          <li><b>Construir</b> — para o tempo, coloca satélites</li>
        </ul>
        <h3>Satélites</h3>
        <div class="chips">${Object.values(SATS)
          .map((s) => `<span class="chip ${st.unlocked.includes(s.id) ? "" : "locked"}" style="--c:${s.color}" title="${s.desc}">${s.glyph} ${s.name}</span>`)
          .join("")}</div>
        <h3>Ameaças</h3>
        <div class="chips">${known
          .map((e) => `<span class="chip ${p.bestWave + 1 >= e.fromWave ? "" : "locked"}" style="--c:${e.color}" title="${e.desc}">${e.name}<small>onda ${e.fromWave}+</small></span>`)
          .join("")}</div>
        <p class="note small">${fmt(Math.floor(p.matterTotal))} matéria escura coletada no total · <button class="link" data-act="reset">${this.confirmReset ? "confirmar: apagar todo o progresso" : "apagar progresso"}</button></p>
      </div></div>`;
  }

  private tree(body: HTMLElement): void {
    const p = this.host.profile;
    const n = TREE.find((x) => x.id === this.selNode) ?? TREE[0];
    const l = lvl(p, n.id);
    const maxed = l >= n.max;
    const avail = nodeAvailable(p, n.id);
    const cost = nodeCost(n.id, l);
    const can = canBuy(p, n.id);
    body.innerHTML = `<div class="treewrap"><canvas class="treecv"></canvas>
      <div class="detail" style="--bc:${BRANCH_COLOR[n.branch]}">
        <div class="dh"><b>${n.name}</b><span>${l}/${n.max}</span></div>
        <p>${n.desc}</p>
        ${n.requires.length && !avail ? `<p class="req">Requer: ${n.requires.map((r) => TREE.find((x) => x.id === r)!.name).join(" e ")}</p>` : ""}
        ${maxed ? '<button class="buy done" disabled>Completo</button>' : `<button class="buy ${can ? "" : "poor"}" data-act="buy:${n.id}" ${can ? "" : "disabled"}>${l ? "Melhorar" : "Comprar"} · <i class="dm"></i>${fmt(cost)}</button>`}
      </div>
      <div class="legend"><span style="--c:${BRANCH_COLOR.sing}">Singularidade</span><span style="--c:${BRANCH_COLOR.orb}">Órbita</span><span style="--c:${BRANCH_COLOR.core}">Núcleo</span></div></div>`;
    const cv = body.querySelector(".treecv") as HTMLCanvasElement;
    this.treeCanvas = cv;
    requestAnimationFrame(() => this.drawTree());
    let drag: { x: number; y: number; px: number; py: number; moved: boolean } | null = null;
    cv.onpointerdown = (e) => {
      drag = { x: e.clientX, y: e.clientY, px: this.pan.x, py: this.pan.y, moved: false };
      cv.setPointerCapture(e.pointerId);
    };
    cv.onpointermove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      if (!drag.moved) return;
      this.pan.x = drag.px + dx;
      this.pan.y = drag.py + dy;
      this.drawTree();
    };
    cv.onpointerup = (e) => {
      if (drag && !drag.moved) {
        const hit = this.nodeAt(e.clientX, e.clientY);
        if (hit) {
          this.selNode = hit.id;
          this.render();
        }
      }
      drag = null;
    };
  }

  private layout(cv: HTMLCanvasElement) {
    const r = cv.getBoundingClientRect();
    const xs = TREE.map((n) => n.x);
    const ys = TREE.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const wide = r.width > 700;
    const usableW = wide ? r.width - Math.min(330, r.width * 0.36) : r.width;
    const usableH = wide ? r.height : r.height - 140;
    const step = Math.min(96, Math.max(30, Math.min(usableW / (maxX - minX + 1.3), (usableH - 34) / (maxY - minY + 1.3))));
    const cx = usableW / 2 - ((minX + maxX) / 2) * step + this.pan.x;
    const cy = 30 + (usableH - 34) / 2 - ((minY + maxY) / 2) * step + this.pan.y;
    return { r, step, cx, cy, rad: step * 0.3 };
  }

  private nodeAt(sx: number, sy: number): TreeNode | undefined {
    const cv = this.treeCanvas;
    if (!cv) return;
    const L = this.layout(cv);
    const x = sx - L.r.left;
    const y = sy - L.r.top;
    return TREE.find((n) => Math.hypot(L.cx + n.x * L.step - x, L.cy + n.y * L.step - y) < L.rad + 8);
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
    const pos = (n: TreeNode) => ({ x: L.cx + n.x * L.step, y: L.cy + n.y * L.step });
    // órbitas decorativas em volta da raiz
    const root = pos(TREE[0]);
    g.strokeStyle = "rgba(150,140,255,0.07)";
    for (let k = 1; k <= 5; k++) {
      g.beginPath();
      g.arc(root.x, root.y, k * L.step * 1.15, 0, TAU);
      g.stroke();
    }
    for (const n of TREE)
      for (const rq of n.requires) {
        const a = pos(TREE.find((x) => x.id === rq)!);
        const b = pos(n);
        const lit = lvl(p, rq) > 0;
        const own = lvl(p, n.id) > 0;
        g.strokeStyle = own ? BRANCH_COLOR[n.branch] : lit ? "rgba(200,210,255,0.4)" : "rgba(120,130,170,0.16)";
        g.lineWidth = own ? 3.5 : 2.5;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
    for (const n of TREE) {
      const { x, y } = pos(n);
      const l = lvl(p, n.id);
      const avail = nodeAvailable(p, n.id);
      const col = BRANCH_COLOR[n.branch];
      const affordable = canBuy(p, n.id);
      g.save();
      g.globalAlpha = avail || l ? 1 : 0.35;
      if (affordable) {
        g.shadowColor = col;
        g.shadowBlur = 18;
      }
      g.beginPath();
      g.arc(x, y, L.rad, 0, TAU);
      g.fillStyle = l ? "#161430" : "#0a0b18";
      g.fill();
      g.lineWidth = n.id === this.selNode ? 4 : 2.5;
      g.strokeStyle = n.id === this.selNode ? "#ffffff" : l || affordable ? col : "rgba(150,160,200,0.45)";
      g.stroke();
      g.shadowBlur = 0;
      if (n.max > 1 && l > 0) {
        g.strokeStyle = col;
        g.lineWidth = 3.5;
        g.beginPath();
        g.arc(x, y, L.rad + 5, -Math.PI / 2, -Math.PI / 2 + (TAU * l) / n.max);
        g.stroke();
      }
      g.fillStyle = l ? col : "rgba(210,215,240,0.85)";
      g.font = `800 ${Math.round(L.rad * 0.95)}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(n.glyph, x, y + 1);
      if (L.step >= 56) {
        g.font = "700 10px system-ui, sans-serif";
        g.fillStyle = "#c8cde8";
        g.fillText(n.max > 1 ? `${l}/${n.max}` : l ? "✓" : "", x, y + L.rad + 13);
      }
      g.restore();
    }
  }
}
