import { fmt } from "../core/format";
import { TAU } from "../core/math";
import { DUNGEONS, KEYS, MAJOR, TREE, type Currency, type TreeNode } from "../data/content";
import { PORTRAITS } from "../render/pixels";
import { buyNode, canBuy, level, lvl, nodeCost, nodeVisible, type Profile } from "../game/profile";

export type HubTab = "mapa" | "habilidades";

export interface HubHost {
  profile: Profile;
  touch: boolean;
  enter(dIdx: number): void;
  save(): void;
  reset(): void;
  toggleMute(): void;
  muted(): boolean;
  sound(midi: number[]): void;
  talk(): void;
}

const CUR_ICON: Record<Currency, string> = { notas: '<i class="cn n">♪</i>', cristais: '<i class="cn c">◆</i>', partituras: '<i class="cn p">▤</i>' };

/** desenha um ícone simples em pixel art para os nós da árvore */
export function drawIcon(g: CanvasRenderingContext2D, name: string, x: number, y: number, s: number, col: string): void {
  g.save();
  g.translate(x, y);
  g.fillStyle = col;
  g.strokeStyle = col;
  g.lineWidth = Math.max(1.5, s * 0.12);
  g.lineCap = "round";
  const r = s * 0.42;
  const P = (f: () => void) => {
    g.beginPath();
    f();
  };
  switch (name) {
    case "lua":
      P(() => g.arc(0, 0, r, 0, TAU));
      g.fill();
      g.globalCompositeOperation = "destination-out";
      P(() => g.arc(r * 0.45, -r * 0.3, r * 0.85, 0, TAU));
      g.fill();
      break;
    case "lamina":
      P(() => {
        g.moveTo(-r, r);
        g.lineTo(r, -r);
      });
      g.stroke();
      P(() => {
        g.moveTo(-r * 0.6, r * 0.2);
        g.lineTo(-r * 0.2, r * 0.6);
      });
      g.stroke();
      break;
    case "multi":
      for (const o of [-0.5, 0, 0.5])
        P(() => {
          g.moveTo(-r + o * r, r);
          g.lineTo(r + o * r, -r);
        }),
          g.stroke();
      break;
    case "escudo":
      P(() => {
        g.moveTo(0, -r);
        g.lineTo(r, -r * 0.6);
        g.lineTo(r * 0.7, r * 0.5);
        g.lineTo(0, r);
        g.lineTo(-r * 0.7, r * 0.5);
        g.lineTo(-r, -r * 0.6);
        g.closePath();
      });
      g.stroke();
      P(() => {
        g.moveTo(-r * 0.4, -r * 0.4);
        g.lineTo(r * 0.4, r * 0.4);
      });
      g.stroke();
      break;
    case "caveira":
      P(() => g.arc(0, -r * 0.15, r * 0.75, 0, TAU));
      g.fill();
      g.fillRect(-r * 0.45, r * 0.35, r * 0.9, r * 0.5);
      g.fillStyle = "#120c18";
      P(() => g.arc(-r * 0.3, -r * 0.2, r * 0.2, 0, TAU));
      g.fill();
      P(() => g.arc(r * 0.3, -r * 0.2, r * 0.2, 0, TAU));
      g.fill();
      break;
    case "marca":
      P(() => {
        g.moveTo(0, -r);
        g.lineTo(r * 0.7, 0);
        g.lineTo(0, r);
        g.lineTo(-r * 0.7, 0);
        g.closePath();
      });
      g.fill();
      break;
    case "fluxo":
      P(() => g.arc(0, 0, r * 0.85, 0.3, TAU - 0.3));
      g.stroke();
      P(() => g.arc(r * 0.1, r * 0.1, r * 0.4, 0, TAU));
      g.fill();
      break;
    case "gliss":
      P(() => {
        g.moveTo(-r, r * 0.5);
        g.bezierCurveTo(-r * 0.3, -r * 0.8, r * 0.3, r * 0.8, r, -r * 0.5);
      });
      g.stroke();
      break;
    case "orbe":
      P(() => g.arc(0, 0, r, 0, TAU));
      g.stroke();
      g.fillRect(-r * 0.7, 0, r * 1.4, r * 0.65);
      break;
    case "vento":
      for (const k of [-0.5, 0, 0.5])
        P(() => {
          g.moveTo(-r, k * r);
          g.quadraticCurveTo(r * 0.6, k * r - r * 0.5, r * 0.4, k * r + r * 0.1);
        }),
          g.stroke();
      break;
    case "pena":
      P(() => g.ellipse(0, 0, r * 0.35, r, 0.6, 0, TAU));
      g.fill();
      break;
    case "coracao":
      P(() => {
        g.moveTo(0, r);
        g.bezierCurveTo(-r * 1.4, -r * 0.2, -r * 0.4, -r * 1.2, 0, -r * 0.4);
        g.bezierCurveTo(r * 0.4, -r * 1.2, r * 1.4, -r * 0.2, 0, r);
      });
      g.fill();
      break;
    case "circulo":
      P(() => g.arc(0, 0, r * 0.85, 0, TAU * 0.9));
      g.stroke();
      P(() => {
        g.moveTo(r * 0.85, -r * 0.5);
        g.lineTo(r * 0.85, 0);
        g.lineTo(r * 0.4, -r * 0.1);
      });
      g.stroke();
      break;
    case "nota":
    case "acorde": {
      const heads = name === "acorde" ? [-0.4, 0, 0.4] : [0];
      heads.forEach((h, i) => {
        P(() => g.ellipse(-r * 0.25 + i * r * 0.05, r * 0.55 - i * r * 0.45, r * 0.35, r * 0.25, -0.4, 0, TAU));
        g.fill();
        void h;
      });
      P(() => {
        g.moveTo(r * 0.12, r * 0.5);
        g.lineTo(r * 0.12, -r);
        g.lineTo(r * 0.7, -r * 0.6);
      });
      g.stroke();
      break;
    }
    case "ouvido":
      P(() => g.arc(0, -r * 0.1, r * 0.7, Math.PI, Math.PI * 2.4));
      g.stroke();
      P(() => g.arc(0, -r * 0.1, r * 0.3, Math.PI, TAU));
      g.stroke();
      break;
    case "escada":
      for (let i = 0; i < 3; i++) g.fillRect(-r + i * r * 0.7, r * 0.6 - i * r * 0.6, r * 0.6, r * 0.35);
      break;
    case "tambor":
      P(() => g.ellipse(0, -r * 0.4, r, r * 0.35, 0, 0, TAU));
      g.stroke();
      g.strokeRect(-r, -r * 0.4, r * 2, r * 1.1);
      P(() => {
        g.moveTo(-r * 0.4, -r * 1.2);
        g.lineTo(r * 0.2, -r * 0.5);
      });
      g.stroke();
      break;
    case "onda":
      for (const k of [0.4, 0.75, 1.05])
        P(() => g.arc(0, 0, r * k, -0.8, 0.8)),
          g.stroke(),
          P(() => g.arc(0, 0, r * k, Math.PI - 0.8, Math.PI + 0.8)),
          g.stroke();
      break;
    case "cura":
      g.fillRect(-r * 0.25, -r, r * 0.5, r * 2);
      g.fillRect(-r, -r * 0.25, r * 2, r * 0.5);
      break;
    case "moeda":
      P(() => g.arc(0, 0, r * 0.85, 0, TAU));
      g.stroke();
      g.font = `bold ${Math.round(r * 1.3)}px serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("♪", 0, r * 0.05);
      break;
    case "cristal":
      P(() => {
        g.moveTo(0, -r);
        g.lineTo(r * 0.7, -r * 0.2);
        g.lineTo(0, r);
        g.lineTo(-r * 0.7, -r * 0.2);
        g.closePath();
      });
      g.fill();
      break;
    case "livro":
      g.strokeRect(-r * 0.8, -r * 0.7, r * 1.6, r * 1.4);
      P(() => {
        g.moveTo(0, -r * 0.7);
        g.lineTo(0, r * 0.7);
      });
      g.stroke();
      break;
    case "plateia":
      for (const k of [-0.55, 0, 0.55]) {
        P(() => g.arc(k * r, -r * 0.2, r * 0.25, 0, TAU));
        g.fill();
        P(() => g.arc(k * r, r * 0.55, r * 0.35, Math.PI, TAU));
        g.fill();
      }
      break;
    default:
      g.font = `${Math.round(r * 1.5)}px serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("?", 0, 0);
  }
  g.restore();
}

/** Tela entre masmorras: MAPA e HABILIDADES, como no original. */
export class Hub {
  readonly root: HTMLElement;
  tab: HubTab;
  private dSel: number;
  private sel = "corte";
  private hover: string | null = null;
  private pan = { x: 0, y: 0 };
  private zoom = 1;
  private cv: HTMLCanvasElement | null = null;
  private menuOpen = false;
  private confirmReset = false;

  constructor(
    private host: HubHost,
    parent: HTMLElement,
    tab: HubTab = "habilidades",
  ) {
    const el = document.createElement("div");
    el.className = "hub";
    parent.appendChild(el);
    this.root = el;
    this.tab = tab;
    this.dSel = host.profile.unlocked;
    const b = TREE.find((n) => canBuy(host.profile, n.id));
    if (b) this.sel = b.id;
    el.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
      if (t) this.act(t.dataset.act!);
    });
    this.onKey = this.onKey.bind(this);
    window.addEventListener("keydown", this.onKey);
    this.onResize = this.onResize.bind(this);
    window.addEventListener("resize", this.onResize);
    this.render();
  }

  private onResize(): void {
    this.draw();
  }

  private onKey(e: KeyboardEvent): void {
    if (this.tab !== "habilidades") return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      this.act(`buy:${this.sel}`);
    }
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKey);
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
      case "enter":
        this.host.enter(this.dSel);
        return;
      case "dungeon":
        if (Number(arg) <= p.unlocked) {
          this.dSel = Number(arg);
          const key = KEYS[DUNGEONS[this.dSel].key];
          this.host.sound([0, 4, 7].map((m) => key.root + m));
        }
        break;
      case "buy":
        if (buyNode(p, arg)) {
          this.host.save();
          this.host.sound([72 + (TREE.findIndex((n) => n.id === arg) % 7) * 2, 79]);
        }
        break;
      case "talk":
        this.host.talk();
        return;
      case "menu":
        this.menuOpen = !this.menuOpen;
        this.confirmReset = false;
        break;
      case "mute":
        this.host.toggleMute();
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
    const lv = level(p.exp);
    const avail = TREE.filter((n) => canBuy(p, n.id)).length;
    this.root.innerHTML = `
      <div class="top"><span class="where">OFICINA DA DONA FERMATA</span><div class="tabs"><button class="${this.tab === "mapa" ? "on" : ""}" data-act="tab:mapa">CIDADE</button><button class="${this.tab === "habilidades" ? "on" : ""}" data-act="tab:habilidades">LIÇÕES</button></div>
        <button class="menu" data-act="menu"><i></i><i></i><i></i></button></div>
      <div class="left">
        <div class="lvl"><span><em>${lv.lvl}</em></span><div class="xb"><i style="width:${(lv.cur / lv.next) * 100}%"></i></div></div>
        <small class="xp">${fmt(lv.cur)} / ${fmt(lv.next)} EXP</small>
        <ul class="wal"><li>${CUR_ICON.notas}<b>${fmt(Math.floor(p.notas))}</b></li><li>${CUR_ICON.cristais}<b>${fmt(p.cristais)}</b></li><li>${CUR_ICON.partituras}<b>${fmt(p.partituras)}</b></li></ul>
        <small class="day">Ensaio ${p.day}</small>
        <button class="npc" data-act="talk"><canvas width="60" height="60"></canvas><span><b>Dona Fermata</b><small>conversar</small></span></button>
      </div>
      <div class="stage"></div>
      <div class="bottom">${this.tab === "habilidades" ? `<span class="avail">${avail ? `${avail} lição${avail > 1 ? "ões" : ""} disponíve${avail > 1 ? "is" : "l"}` : ""}</span>` : ""}<button class="enter" data-act="enter">COMEÇAR O ENSAIO ▶</button></div>
      ${this.menuOpen ? `<div class="dropdown"><button data-act="mute">Som: ${this.host.muted() ? "desligado" : "ligado"}</button><button data-act="reset" class="red">${this.confirmReset ? "Confirmar: apagar tudo" : "Apagar progresso"}</button></div>` : ""}`;
    const npc = this.root.querySelector(".npc canvas") as HTMLCanvasElement;
    const ng = npc.getContext("2d")!;
    ng.imageSmoothingEnabled = false;
    ng.fillStyle = "#1e1430";
    ng.fillRect(0, 0, 60, 60);
    ng.drawImage(PORTRAITS.fermata.img, 0, 60 - PORTRAITS.fermata.h * 2.7, PORTRAITS.fermata.w * 2.7, PORTRAITS.fermata.h * 2.7);
    const stage = this.root.querySelector(".stage") as HTMLElement;
    if (this.tab === "habilidades") this.tree(stage);
    else this.map(stage);
  }

  // ------------------------------------------------------------ mapa
  private map(stage: HTMLElement): void {
    const p = this.host.profile;
    const d = DUNGEONS[this.dSel];
    const key = KEYS[d.key];
    const pts = DUNGEONS.map((_, i) => [36 + i * 13, 44 - (i % 2) * 18]);
    stage.innerHTML = `<div class="mapa">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts.map(([x, y]) => `${x},${y}`).join(" ")}" /></svg>
      ${DUNGEONS.map((dd, i) => {
        const open = i <= p.unlocked;
        return `<button class="loc ${open ? "open" : ""} ${i === this.dSel ? "on" : ""} ${p.cleared[dd.id] ? "done" : ""}" style="left:${pts[i][0]}%;top:${pts[i][1]}%" ${open ? `data-act="dungeon:${i}"` : "disabled"}><i></i><span>${open ? dd.name : "???"}</span></button>`;
      }).join("")}
      <div class="info"><h3>${d.name}</h3>
        <p>Tonalidade: <b>${key.name}</b> · ${MAJOR.map((m) => ["Dó", "Dó♯", "Ré", "Ré♯", "Mi", "Fá", "Fá♯", "Sol", "Sol♯", "Lá", "Lá♯", "Si"][(key.root + m) % 12]).join(" ")}</p>
        <p>${d.rooms} salas + chefe · força ×${fmt(Math.pow(2.2, this.dSel))}${p.cleared[d.id] ? " · <b class='ok'>afinada</b>" : ""}</p>
        <p class="hint">Vença o Maestro Trítono no fim para abrir o próximo lugar.</p></div>
    </div>`;
  }

  // ------------------------------------------------------------ árvore
  private tree(stage: HTMLElement): void {
    const p = this.host.profile;
    const n = TREE.find((x) => x.id === this.sel)!;
    const l = lvl(p, n.id);
    const vis = nodeVisible(p, n.id);
    const maxed = l >= n.max;
    const cost = nodeCost(n.id, l);
    const have = p[n.cur];
    stage.innerHTML = `<canvas class="treecv"></canvas>
      <div class="hints"><span><i class="k">${this.host.touch ? "toque" : "clique"}</i>Comprar</span><span><i class="k">${this.host.touch ? "pinça" : "roda"}</i>Zoom</span><span><i class="k">arraste</i>Mover</span></div>
      <div class="tip">${
        vis
          ? `<h4>${n.name.toUpperCase()}</h4><small>NVL. ${l} / ${n.max}</small><p>${n.desc}</p>
        ${maxed ? '<div class="cost done">COMPLETO</div>' : `<button class="cost ${have >= cost ? "ok" : ""}" data-act="buy:${n.id}">${CUR_ICON[n.cur]} ${fmt(Math.floor(have))} / ${fmt(cost)}</button>`}`
          : `<h4>???</h4><p>Compre uma habilidade vizinha para revelar.</p>`
      }</div>`;
    const cv = stage.querySelector(".treecv") as HTMLCanvasElement;
    this.cv = cv;
    requestAnimationFrame(() => this.draw());
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
      if (!pts.has(e.pointerId)) {
        const h = this.nodeAt(e.clientX, e.clientY);
        const id = h?.id ?? null;
        if (id !== this.hover) {
          this.hover = id;
          cv.style.cursor = id ? "pointer" : "grab";
          this.draw();
        }
        return;
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) this.zoom = Math.max(0.5, Math.min(2.5, this.zoom * (d / pinch)));
        pinch = d;
        this.draw();
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      if (!drag.moved) return;
      this.pan.x = drag.px + dx;
      this.pan.y = drag.py + dy;
      this.draw();
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (drag && !drag.moved && pts.size === 0) {
        const hit = this.nodeAt(e.clientX, e.clientY);
        if (hit) {
          if (hit.id === this.sel && nodeVisible(p, hit.id)) this.act(`buy:${hit.id}`);
          else {
            this.sel = hit.id;
            this.render();
          }
          return;
        }
      }
      if (pts.size === 0) drag = null;
    };
    cv.onpointerup = up;
    cv.onpointercancel = up;
    cv.onwheel = (e) => {
      e.preventDefault();
      this.zoom = Math.max(0.5, Math.min(2.5, this.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      this.draw();
    };
  }

  private layout() {
    const r = this.cv!.getBoundingClientRect();
    const step = Math.min(r.width, r.height) / 9.5 * this.zoom;
    return { r, step, cx: r.width * 0.42 + this.pan.x, cy: r.height * 0.42 + this.pan.y, rad: Math.max(14, Math.min(30, step * 0.38)) };
  }

  private nodeAt(sx: number, sy: number): TreeNode | undefined {
    if (!this.cv) return;
    const L = this.layout();
    const x = sx - L.r.left;
    const y = sy - L.r.top;
    const p = this.host.profile;
    return TREE.find((n) => (nodeVisible(p, n.id) || (n.from && lvl(p, n.from) === 0 && nodeVisible(p, n.from))) && Math.hypot(L.cx + n.x * L.step - x, L.cy + n.y * L.step - y) < L.rad + 8);
  }

  private draw(): void {
    const cv = this.cv;
    if (!cv || !cv.isConnected) return;
    const p = this.host.profile;
    const L = this.layout();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(L.r.width * dpr);
    cv.height = Math.round(L.r.height * dpr);
    const g = cv.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pos = (n: TreeNode) => ({ x: L.cx + n.x * L.step, y: L.cy + n.y * L.step });
    // só aparecem os comprados, os vizinhos (visíveis) e os "?" um passo adiante
    const shown = (n: TreeNode) => nodeVisible(p, n.id) || (n.from !== null && nodeVisible(p, n.from));
    for (const n of TREE) {
      if (!n.from || !shown(n)) continue;
      const a = pos(TREE.find((x) => x.id === n.from)!);
      const b = pos(n);
      const own = lvl(p, n.id) > 0;
      const vis = nodeVisible(p, n.id);
      g.strokeStyle = own ? "#6ad86a" : vis ? "rgba(200,200,210,0.55)" : "rgba(140,140,150,0.25)";
      g.lineWidth = own ? 2.5 : 1.5;
      g.setLineDash(vis ? [] : [3, 4]);
      const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.18;
      const my = (a.y + b.y) / 2 - (b.x - a.x) * 0.18;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.quadraticCurveTo(mx, my, b.x, b.y);
      g.stroke();
      g.setLineDash([]);
    }
    for (const n of TREE) {
      if (!shown(n)) continue;
      const { x, y } = pos(n);
      const vis = nodeVisible(p, n.id);
      const l = lvl(p, n.id);
      const R = L.rad;
      if (!vis) {
        g.fillStyle = "rgba(170,170,180,0.45)";
        g.font = `bold ${Math.round(R * 1.3)}px "VT323", monospace`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("?", x, y);
        continue;
      }
      const afford = canBuy(p, n.id);
      const square = n.max === 1;
      g.save();
      if (afford) {
        g.shadowColor = "#ffb45a";
        g.shadowBlur = 16;
      }
      g.fillStyle = l ? "#1c2420" : "#141218";
      g.beginPath();
      if (square) g.rect(x - R, y - R, R * 2, R * 2);
      else g.arc(x, y, R, 0, TAU);
      g.fill();
      g.shadowBlur = 0;
      g.lineWidth = n.id === this.sel ? 3 : 2;
      g.strokeStyle = n.id === this.sel ? "#ffffff" : l >= n.max ? "#6ad86a" : l ? "#4aa86a" : afford ? "#e8a050" : "#6a6470";
      g.stroke();
      g.restore();
      if (n.max > 1 && l > 0) {
        g.strokeStyle = "#6ad86a";
        g.lineWidth = 3;
        g.beginPath();
        g.arc(x, y, R + 4, -Math.PI / 2, -Math.PI / 2 + (TAU * l) / n.max);
        g.stroke();
      }
      drawIcon(g, n.icon, x, y, R * 1.6, l ? "#f0ead8" : n.id === this.hover ? "#ffffff" : "#b8b0c0");
    }
  }
}
