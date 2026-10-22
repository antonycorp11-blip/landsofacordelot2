import { TAU } from "../core/math";
import { SPEAKERS, type Line, type Speaker } from "../data/story";
import { PORTRAITS } from "../render/pixels";

/** retrato de cada personagem (Clara é uma luz dentro da batuta) */
function portrait(who: Speaker): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 120;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = who === "tritono" ? "#2a0c14" : who === "fermata" ? "#1e1430" : who === "clara" ? "#0c1a2a" : "#2a1c10";
  g.fillRect(0, 0, 120, 120);
  if (who === "clara") {
    const gr = g.createRadialGradient(60, 60, 0, 60, 60, 56);
    gr.addColorStop(0, "#ffffff");
    gr.addColorStop(0.25, "#b0e0ff");
    gr.addColorStop(0.6, "rgba(120,160,255,0.35)");
    gr.addColorStop(1, "rgba(120,160,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 120, 120);
    g.strokeStyle = "#e8d8b0";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(26, 98);
    g.lineTo(92, 26);
    g.stroke();
    g.fillStyle = "#fff";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      g.fillRect(60 + Math.cos(a) * 34 - 2, 60 + Math.sin(a) * 34 - 2, 4, 4);
    }
    return c;
  }
  const p = PORTRAITS[who as "tito" | "fermata" | "tritono"];
  if (p) g.drawImage(p.img, 0, 120 - p.h * 5.4, p.w * 5.4, p.h * 5.4);
  return c;
}

const cache = new Map<Speaker, HTMLCanvasElement>();
const getPortrait = (w: Speaker) => {
  let c = cache.get(w);
  if (!c) cache.set(w, (c = portrait(w)));
  return c;
};

/** caixa de diálogo com retrato, nome e texto que vai aparecendo */
export class Dialog {
  readonly root: HTMLElement;
  open = false;
  private queue: Line[] = [];
  private done: (() => void) | null = null;
  private typing = false;
  private full = "";
  private timer = 0;

  constructor(
    parent: HTMLElement,
    touch: boolean,
    private onLine?: (l: Line) => void,
  ) {
    const el = document.createElement("div");
    el.className = "dlg hidden";
    el.innerHTML = `<div class="pt"></div><div class="tx"><div class="nm"></div><p></p><small>${touch ? "Toque" : "Clique"} para continuar ▸</small></div>`;
    parent.appendChild(el);
    this.root = el;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      this.next();
    });
  }

  say(lines: Line[], done?: () => void): void {
    if (!lines.length) {
      done?.();
      return;
    }
    this.queue = [...lines];
    this.done = done ?? null;
    this.open = true;
    this.root.classList.remove("hidden");
    this.show();
  }

  /** avança: completa o texto se ainda estiver digitando, senão vai para a próxima fala */
  next(): void {
    if (!this.open) return;
    if (this.typing) {
      this.typing = false;
      clearTimeout(this.timer);
      (this.root.querySelector("p") as HTMLElement).textContent = this.full;
      return;
    }
    this.show();
  }

  private show(): void {
    const l = this.queue.shift();
    if (!l) {
      this.open = false;
      this.root.classList.add("hidden");
      const d = this.done;
      this.done = null;
      d?.();
      return;
    }
    const sp = SPEAKERS[l.who];
    this.root.className = `dlg who-${l.who}`;
    const pt = this.root.querySelector(".pt") as HTMLElement;
    pt.innerHTML = "";
    if (l.who !== "narrador") pt.appendChild(getPortrait(l.who));
    const nm = this.root.querySelector(".nm") as HTMLElement;
    nm.textContent = sp.name;
    nm.style.color = sp.color;
    const p = this.root.querySelector("p") as HTMLElement;
    this.full = l.text;
    this.typing = true;
    let i = 0;
    const step = () => {
      if (!this.typing) return;
      i += 2;
      p.textContent = l.text.slice(0, i);
      if (i < l.text.length) this.timer = window.setTimeout(step, 22);
      else this.typing = false;
    };
    step();
    this.onLine?.(l);
  }
}
