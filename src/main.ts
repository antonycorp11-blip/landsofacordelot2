import "./styles.css";
import { fmt, fmtTime } from "./core/format";
import { TAU } from "./core/math";
import { beamStats } from "./data/content";
import { earn, offlineEarnings } from "./game/economy";
import { islandShape } from "./game/island";
import { load, save, SAVE_KEY } from "./game/save";
import { step } from "./game/sim";
import { newRuntime, newState, type GameState, type Runtime } from "./game/state";
import { Renderer } from "./render/renderer";
import { Hud, type HudHost } from "./ui/hud";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const hudRoot = document.getElementById("hud")!;
const renderer = new Renderer(canvas);

let state: GameState = load() ?? newState();
let runtime: Runtime = newRuntime();
runtime.beamAngle = -Math.PI / 2;

const host: HudHost = {
  get state() {
    return state;
  },
  get runtime() {
    return runtime;
  },
  selectedSlot: null,
  selectSlot(i) {
    host.selectedSlot = i;
    renderer.selectedSlot = i;
    if (i !== null) hud.tab = "towers";
  },
  replaceState(s, rt) {
    state = s;
    runtime = rt;
    runtime.spawnRadius = renderer.spawnRadius();
    host.selectSlot(null);
    save(state);
  },
  save() {
    save(state);
  },
  reset() {
    resetting = true;
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  },
};

const hud = new Hud(host, hudRoot);
let resetting = false;
const persist = () => {
  if (!resetting) save(state);
};

/** O mar ocupa a área livre: ao lado do painel (paisagem) ou acima dele (retrato). */
function layout(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const portrait = h > w;
  document.body.classList.toggle("portrait", portrait);
  const r = hud.panel.getBoundingClientRect();
  const top = 56;
  const view = portrait ? { x: 0, y: top, w, h: Math.max(200, r.top - top) } : { x: 0, y: top, w: Math.max(200, r.left), h: h - top };
  renderer.resize(view);
  runtime.spawnRadius = renderer.spawnRadius();
}
window.addEventListener("resize", layout);
layout();

// ganhos enquanto o jogo esteve fechado
{
  const off = offlineEarnings(state, Date.now());
  if (off.seconds > 60 && off.oil > 0) {
    earn(state, off.oil);
    hud.modal(`<h2>O farol seguiu aceso</h2><p>Você ficou fora por <b>${fmtTime(off.seconds)}</b>. Seus produtores juntaram</p><p class="big-num"><i class="drop"></i>${fmt(off.oil)} de óleo</p><button class="big" data-act="close">Continuar</button>`);
  } else if (!state.flags.welcomed) {
    hud.modal(`<h2>Farol da Última Costa</h2><p>Quando a noite cai, criaturas sobem do mar em direção à ilha. Só a luz as mantém longe.</p><ul><li><b>Arraste no mar</b> para apontar o feixe. Solte e ele volta a girar.</li><li><b>Toque nas pedras</b> com “+” para construir torres.</li><li>Gaste óleo para fortalecer a luz e comprar produtores que rendem até com o jogo fechado.</li><li>Se o farol apagar, você recua algumas ondas — nunca perde o que construiu.</li></ul><button class="big" data-act="close">Acender o farol</button>`);
    state.flags.welcomed = true;
  }
}

// entrada: arrastar mira o feixe; tocar numa pedra seleciona
let dragging = false;
function worldAt(e: PointerEvent) {
  return renderer.screenToWorld(e.clientX, e.clientY);
}
canvas.addEventListener("pointerdown", (e) => {
  const p = worldAt(e);
  const slots = islandShape(state.seed + state.island).slots;
  const hit = slots.findIndex((sl) => Math.hypot(sl.x - p.x, sl.y - p.y) < 17);
  if (hit >= 0) {
    host.selectSlot(host.selectedSlot === hit ? null : hit);
    hud.update();
    return;
  }
  dragging = true;
  canvas.setPointerCapture(e.pointerId);
  runtime.aim = Math.atan2(p.y, p.x);
  state.flags.aimed = true;
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = worldAt(e);
  runtime.aim = Math.atan2(p.y, p.x);
});
const release = () => {
  dragging = false;
  runtime.aim = null;
};
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);
const keys = new Set<string>();
window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (e.key === "Escape") host.selectSlot(null);
});
window.addEventListener("keyup", (e) => keys.delete(e.key));

// laço: simulação em passo fixo, renderização a cada quadro
const DT = 1 / 60;
let acc = 0;
let last = performance.now();
let hudT = 0;
let saveT = 0;
function frame(now: number): void {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  acc += dt;
  const left = keys.has("ArrowLeft") || keys.has("a");
  const right = keys.has("ArrowRight") || keys.has("d");
  if (left || right) {
    runtime.aim = runtime.beamAngle + (right ? 0.6 : -0.6);
    state.flags.aimed = true;
  } else if (!dragging && runtime.aim !== null) runtime.aim = null;
  let n = 0;
  while (acc >= DT && n < 10) {
    step(state, runtime, DT);
    acc -= DT;
    n++;
  }
  if (n === 10) acc = 0;
  for (const ev of runtime.events) {
    if (ev.type === "wave" && ev.boss) hud.toast(`Onda ${ev.wave}: um Kraken se aproxima!`, "warn");
    if (ev.type === "retreat") hud.toast(`O farol quase apagou. Recuando para a onda ${ev.wave}.`, "warn");
  }
  renderer.consume(runtime, state);
  renderer.render(state, runtime, dt);
  hudT += dt;
  if (hudT > 0.2) {
    hudT = 0;
    hud.update();
  }
  saveT += dt;
  if (saveT > 15) {
    saveT = 0;
    persist();
  }
  requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) persist();
  else last = performance.now();
});
window.addEventListener("beforeunload", persist);
hud.update();
requestAnimationFrame(frame);
(window as unknown as { __farol: unknown }).__farol = { get state() { return state; }, get runtime() { return runtime; }, step, renderer, hud, TAU, beamStats };
