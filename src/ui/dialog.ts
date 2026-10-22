import { SPEAKERS, type Line, type Speaker } from "../data/story";
import { portrait as charPortrait } from "../render/chars";

/** retrato de cada personagem (Clara aparece como espírito dentro da batuta) */
function portrait(who: Speaker): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 120;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const bg = g.createLinearGradient(0, 0, 0, 120);
  const cols: Record<string, [string, string]> = { tritono: ["#3a0c18", "#14040a"], fermata: ["#2e1e48", "#140c22"], clara: ["#18305a", "#08101e"], tito: ["#3a2a18", "#160e08"], diario: ["#e8d4a8", "#c8a870"] };
  const [c1, c2] = cols[who] ?? ["#222", "#111"];
  bg.addColorStop(0, c1);
  bg.addColorStop(1, c2);
  g.fillStyle = bg;
  g.fillRect(0, 0, 120, 120);
  if (who === "diario") {
    g.fillStyle = "#5a3a20";
    for (let i = 0; i < 6; i++) g.fillRect(24, 30 + i * 11, 72 - (i % 3) * 10, 2);
    g.font = "bold 34px Georgia, serif";
    g.textAlign = "center";
    g.fillText("✒", 60, 106);
    return c;
  }
  if (who === "clara") {
    const gr = g.createRadialGradient(60, 60, 0, 60, 60, 60);
    gr.addColorStop(0, "rgba(160,210,255,0.55)");
    gr.addColorStop(1, "rgba(160,210,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 120, 120);
  }
  const pr = charPortrait(who as "tito" | "clara" | "fermata" | "tritono", 60, 0, who === "clara");
  g.drawImage(pr, 0, 0, 120, 120);
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
