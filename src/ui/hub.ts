import { fmt } from "../core/format";
import { TAU } from "../core/math";
import { ALIENS, RUN, TREE, UNITS, sectorName, type TreeNode, type UnitId } from "../data/content";
import { buyNode, computeStats, nodeAvailable, nodeCost, toggleLoadout, type Profile } from "../game/profile";
import { sectorHp } from "../game/run";
import { alienIcon, unitIcon } from "../render/sprites";

export type HubTab = "missions" | "tree" | "arsenal";

export interface HubHost {
  profile: Profile;
  start(sector: number): void;
  save(): void;
  reset(): void;
}

const BRANCH_COLOR: Record<TreeNode["branch"], string> = { core: "#ffd84a", blade: "#4ae0ff", eng: "#ff9a3a", cmd: "#7aff9a" };

/** Base entre missões: escolha de setor, árvore de habilidades e arsenal. */
export class Hub {
  readonly root: HTMLElement;
  tab: HubTab = "missions";
  private sector = 1;
  private treeCanvas: HTMLCanvasElement | null = null;
  private selNode = "b_dmg";
  private pan = { x: 0, y: 0 };
  private iconCache = new Map<string, HTMLCanvasElement>();
  private confirmReset = false;

  constructor(
    private host: HubHost,
    parent: HTMLElement,
  ) {
    const el = document.createElement("div");
    el.className = "hub";
    parent.appendChild(el);
    this.root = el;
    this.sector = Math.max(1, host.profile.sectorUnlocked);
    el.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
      if (t) this.act(t.dataset.act!);
    });
    this.render();
  }

  destroy(): void {
    this.root.remove();
  }

  private act(a: string): void {
    const p = this.host.profile;
    const [k, arg] = a.split(":");
    switch (k) {
      case "tab":
        this.tab = arg as HubTab;
        break;
      case "sector":
        this.sector = Number(arg);
        break;
      case "start":
        this.host.start(this.sector);
        return;
      case "buy":
        if (buyNode(p, arg)) this.host.save();
        break;
      case "load":
        if (toggleLoadout(p, arg as UnitId)) this.host.save();
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
    const st = computeStats(p);
    const tabs: [HubTab, string][] = [
      ["missions", "Missões"],
      ["tree", "Árvore"],
      ["arsenal", "Arsenal"],
    ];
    const available = TREE.filter((n) => (p.nodes[n.id] ?? 0) < n.max && nodeAvailable(p, n.id) && p.scrap >= nodeCost(n.id, p.nodes[n.id] ?? 0)).length;
    this.root.innerHTML = `
      <header><h1>ÚLTIMA LINHA</h1><div class="scrap"><i class="gear"></i><b>${fmt(p.scrap)}</b><small>sucata</small></div></header>
      <nav>${tabs.map(([id, l]) => `<button class="${this.tab === id ? "on" : ""}" data-act="tab:${id}">${l}${id === "tree" && available ? `<em>${available}</em>` : ""}</button>`).join("")}</nav>
      <section class="body ${this.tab}"></section>`;
    const body = this.root.querySelector(".body") as HTMLElement;
    if (this.tab === "missions") body.innerHTML = this.missions(st.slots);
    else if (this.tab === "arsenal") body.innerHTML = this.arsenal();
    else this.tree(body);
    // ícones em canvas
    body.querySelectorAll<HTMLElement>("[data-icon]").forEach((holder) => {
      const [kind, id] = holder.dataset.icon!.split(":");
      holder.appendChild(kind === "u" ? unitIcon(id as UnitId, Number(holder.dataset.size ?? 56)) : alienIcon(id as never, Number(holder.dataset.size ?? 44)));
    });
  }

  private missions(slots: number): string {
    const p = this.host.profile;
    const max = p.sectorUnlocked;
    const cards = [];
    for (let s = 1; s <= max + 1; s++) {
      const locked = s > max;
      const aliens = Object.values(ALIENS).filter((a) => a.fromSector <= s);
      cards.push(`<button class="sector ${this.sector === s ? "on" : ""} ${locked ? "locked" : ""}" ${locked ? "disabled" : `data-act="sector:${s}"`}>
        <b>Setor ${s}</b><span>${sectorName(s)}</span>
        <small>${locked ? "Vença o setor anterior para liberar" : `Força alienígena ×${sectorHp(s).toFixed(1)} · recorde: onda ${p.bestWave[s] ?? 0}/${RUN.wavesPerSector}`}</small>
        ${p.cleared[s] ? '<em class="ok">Defendido</em>' : ""}
        <div class="aliens">${aliens.map((a) => `<i data-icon="a:${a.id}" data-size="40" title="${a.name}"></i>`).join("")}</div>
      </button>`);
    }
    const load = p.loadout.map((id) => `<i data-icon="u:${id}" data-size="52" title="${UNITS[id].name}"></i>`).join("");
    return `<div class="sectors">${cards.join("")}</div>
      <div class="launch"><div class="loadout"><small>Arsenal (${p.loadout.length}/${slots})</small><div>${load}</div><button class="link" data-act="tab:arsenal">trocar cartas</button></div>
      <button class="go" data-act="start">Iniciar missão</button></div>
      ${p.runs === 0 ? '<p class="note">Posicione unidades nas fileiras e corte os alienígenas passando o dedo (ou o mouse com o botão pressionado) sobre eles. Ganhando ou perdendo, você leva sucata para evoluir na Árvore.</p>' : ""}
      <p class="note small">${p.runs} missões · ${fmt(p.kills)} abates · ${fmt(p.scrapTotal)} sucata no total · <button class="link" data-act="reset">${this.confirmReset ? "confirmar: apagar progresso" : "apagar progresso"}</button></p>`;
  }

  private arsenal(): string {
    const p = this.host.profile;
    const st = computeStats(p);
    const all = Object.values(UNITS);
    const cards = all
      .map((u) => {
        const un = st.unlocked.includes(u.id);
        const inL = p.loadout.includes(u.id);
        const node = TREE.find((n) => n.unit === u.id);
        return `<button class="unit ${inL ? "on" : ""} ${un ? "" : "locked"}" ${un ? `data-act="load:${u.id}"` : "disabled"}>
          <i data-icon="u:${u.id}" data-size="64"></i><b>${u.name}</b><small>${u.desc}</small>
          <span class="stats">⚡${Math.round(u.cost * st.costMul)} · vida ${fmt(u.hp * st.unitHp)}${u.damage ? ` · dano ${fmt(u.damage * st.unitDmg)}` : ""}</span>
          <em>${un ? (inL ? "No arsenal" : "Adicionar") : `Libere na Árvore${node ? ` (${fmt(node.baseCost)})` : ""}`}</em></button>`;
      })
      .join("");
    return `<p class="note">Escolha até <b>${st.slots}</b> cartas para levar à missão (${p.loadout.length} escolhidas). Mais baias na Árvore → Comando.</p><div class="units">${cards}</div>`;
  }

  private tree(body: HTMLElement): void {
    const p = this.host.profile;
    const n = TREE.find((x) => x.id === this.selNode) ?? TREE[0];
    const lvl = p.nodes[n.id] ?? 0;
    const maxed = lvl >= n.max;
    const avail = nodeAvailable(p, n.id);
    const cost = nodeCost(n.id, lvl);
    const can = !maxed && avail && p.scrap >= cost;
    body.innerHTML = `<div class="treewrap"><canvas class="treecv"></canvas>
      <div class="detail" style="--bc:${BRANCH_COLOR[n.branch]}">
        <div class="dh"><b>${n.name}</b><span>${lvl}/${n.max}</span></div>
        <p>${n.desc}</p>
        ${n.requires.length && !avail ? `<p class="req">Requer: ${n.requires.map((r) => TREE.find((x) => x.id === r)!.name).join(" e ")}</p>` : ""}
        ${maxed ? '<button class="buy done" disabled>Completo</button>' : `<button class="buy ${can ? "" : "poor"}" data-act="buy:${n.id}" ${can ? "" : "disabled"}>Melhorar · <i class="gear"></i>${fmt(cost)}</button>`}
      </div>
      <div class="legend"><span style="--c:${BRANCH_COLOR.blade}">Lâmina</span><span style="--c:${BRANCH_COLOR.eng}">Engenharia</span><span style="--c:${BRANCH_COLOR.cmd}">Comando</span></div></div>`;
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
    // reserva espaço para o painel de detalhes à direita/embaixo
    const usableW = r.width > 640 ? r.width - Math.min(340, r.width * 0.4) : r.width;
    const usableH = r.width > 640 ? r.height : r.height - 150;
    const step = Math.min(115, Math.max(34, Math.min(usableW / (maxX - minX + 1.4), (usableH - 30) / (maxY - minY + 1.4))));
    const cx = usableW / 2 - ((minX + maxX) / 2) * step + this.pan.x;
    const cy = 24 + usableH / 2 - ((minY + maxY) / 2) * step + this.pan.y;
    return { r, step, cx, cy, rad: step * 0.3 };
  }

  private nodeAt(sx: number, sy: number): TreeNode | undefined {
    const cv = this.treeCanvas;
    if (!cv) return;
    const L = this.layout(cv);
    const x = sx - L.r.left;
    const y = sy - L.r.top;
    return TREE.find((n) => Math.hypot(L.cx + n.x * L.step - x, L.cy + n.y * L.step - y) < L.rad + 6);
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
    // grade de fundo
    g.strokeStyle = "rgba(120,160,220,0.06)";
    for (let x = (L.cx % 40) - 40; x < L.r.width; x += 40) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, L.r.height);
      g.stroke();
    }
    for (let y = (L.cy % 40) - 40; y < L.r.height; y += 40) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(L.r.width, y);
      g.stroke();
    }
    const pos = (n: TreeNode) => ({ x: L.cx + n.x * L.step, y: L.cy + n.y * L.step });
    // conexões
    for (const n of TREE)
      for (const rq of n.requires) {
        const a = pos(TREE.find((x) => x.id === rq)!);
        const b = pos(n);
        const lit = (p.nodes[rq] ?? 0) > 0;
        const own = (p.nodes[n.id] ?? 0) > 0;
        g.strokeStyle = own ? BRANCH_COLOR[n.branch] : lit ? "rgba(200,220,255,0.45)" : "rgba(120,140,170,0.18)";
        g.lineWidth = own ? 4 : 3;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
    // nós
    for (const n of TREE) {
      const { x, y } = pos(n);
      const lvl = p.nodes[n.id] ?? 0;
      const avail = nodeAvailable(p, n.id);
      const col = BRANCH_COLOR[n.branch];
      const affordable = avail && lvl < n.max && p.scrap >= nodeCost(n.id, lvl);
      g.save();
      g.globalAlpha = avail || lvl ? 1 : 0.35;
      if (affordable) {
        g.shadowColor = col;
        g.shadowBlur = 16;
      }
      g.beginPath();
      g.arc(x, y, L.rad, 0, TAU);
      g.fillStyle = lvl ? "#141c2e" : "#0c111c";
      g.fill();
      g.lineWidth = n.id === this.selNode ? 4 : 2.5;
      g.strokeStyle = n.id === this.selNode ? "#ffffff" : lvl || affordable ? col : "rgba(150,170,200,0.5)";
      g.stroke();
      g.shadowBlur = 0;
      // anel de progresso
      if (n.max > 1 && lvl > 0) {
        g.strokeStyle = col;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(x, y, L.rad + 5, -Math.PI / 2, -Math.PI / 2 + (TAU * lvl) / n.max);
        g.stroke();
      }
      // ícone
      if (n.unit) {
        let ic = this.iconCache.get(n.unit);
        if (!ic) this.iconCache.set(n.unit, (ic = unitIcon(n.unit, 64)));
        const s = L.rad * 1.6;
        g.drawImage(ic, x - s / 2, y - s / 2 - 2, s, s);
      } else {
        g.fillStyle = lvl ? col : "rgba(200,210,230,0.8)";
        g.font = `800 ${Math.round(L.rad * 0.9)}px system-ui, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        const glyph: Record<string, string> = { core: "★", bladeDmg: "⚔", bladeCool: "❄", bladeWidth: "↔", bladeMagnet: "◎", bladeCrit: "✦", bladeChain: "ϟ", bladeBurn: "♨", unitDmg: "⌖", unitHp: "⛨", genBoost: "☀", recharge: "↻", costCut: "%", scrap: "⚙", startEnergy: "⚡", slots: "▦", baseHp: "♥", killEnergy: "+", drones: "✈" };
        g.fillText(glyph[n.id === "core" ? "core" : n.stat] ?? "•", x, y + 1);
      }
      if (n.max > 1 && L.step >= 60) {
        g.font = "700 11px system-ui, sans-serif";
        g.fillStyle = "#cfd8e8";
        g.textAlign = "center";
        g.fillText(`${lvl}/${n.max}`, x, y + L.rad + 16);
      }
      g.restore();
    }
  }
}
