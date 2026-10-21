import "./styles.css";
import { Game } from "./game/Game";
import { newWorld } from "./game/NewGame";
import { MachineRenderer } from "./render/Machines";
import { deserialize, loadFromStorage } from "./save/SaveSystem";
import { VEHICLES } from "./data/machines";
import { createVehicle } from "./world/entities";
import type { World } from "./world/World";

const mobile = matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
if (mobile) document.body.classList.add("touch");

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const title = $<HTMLDivElement>("#title");
let game: Game | null = null;

/** Fundo da tela de título: fileiras de lavoura e uma colheitadeira desenhadas em canvas. */
function titleArt(c: HTMLCanvasElement): () => void {
  const ctx = c.getContext("2d")!;
  const mr = new MachineRenderer();
  const combine = createVehicle(0, "cb-ceifa-6", "player", 0, 0, 0);
  const tractor = createVehicle(0, "tr-campeiro-75", "player", 0, 0, 0);
  combine.lowered = true;
  let raf = 0;
  let t = 14;
  const draw = () => {
    const w = (c.width = c.clientWidth * devicePixelRatio);
    const h = (c.height = c.clientHeight * devicePixelRatio);
    t += 1 / 60;
    const s = Math.max(w, h) / 90;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    const W = w / s;
    const H = h / s;
    const cut = ((t * 2.4) % (W + 30)) - 15;
    for (let y = 0; y < H; y += 0.7) {
      const ripe = y < H * 0.55;
      ctx.fillStyle = ripe ? (Math.floor(y / 0.7) % 2 ? "#d8b65c" : "#c9a54a") : Math.floor(y / 0.7) % 2 ? "#5d4630" : "#6e5338";
      ctx.fillRect(0, y, W, 0.7);
    }
    ctx.fillStyle = "#cdb88a";
    ctx.fillRect(0, H * 0.3, cut, H * 0.12);
    combine.x = cut + 4;
    combine.y = H * 0.36;
    combine.reel = t * 5;
    combine.wheelDist = t * 2.4;
    mr.drawVehicle(ctx, combine, t, false);
    tractor.x = ((t * 3.2) % (W + 20)) - 10;
    tractor.y = H * 0.78;
    tractor.wheelDist = t * 3.2;
    mr.drawVehicle(ctx, tractor, t, false);
    raf = requestAnimationFrame(draw);
  };
  draw();
  return () => cancelAnimationFrame(raf);
}

function showTitle(): void {
  const save = loadFromStorage();
  title.classList.remove("hidden");
  title.innerHTML = `<canvas class="title-bg"></canvas><div class="title-card">
    <h1>TERRA FIRME</h1>
    <p class="tag">Simulação agrícola · operação de máquinas, logística e expansão</p>
    <div class="btns">
      ${save ? `<button class="primary" data-go="continue">Continuar <small>${new Date(save.savedAt).toLocaleString("pt-BR")}</small></button>` : ""}
      <button class="${save ? "" : "primary"}" data-go="new">Novo jogo</button>
    </div>
    <label class="seed">Semente do mundo <input id="seed" type="number" value="20251" /></label>
    <p class="small">Todos os gráficos são desenhados por código. Funciona offline após carregar.</p>
  </div>`;
  const stopArt = titleArt(title.querySelector(".title-bg")!);
  title.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((b) =>
    b.addEventListener("click", () => {
      const seed = Number(($<HTMLInputElement>("#seed")).value) || 20251;
      stopArt();
      void boot(b.dataset.go === "continue" && save ? () => deserialize(save) : () => newWorld(seed));
    }),
  );
}

async function boot(make: () => World): Promise<void> {
  title.innerHTML = `<div class="title-card"><h1>TERRA FIRME</h1><p class="tag">Gerando terreno e lavouras…</p><div class="progress"><i></i></div></div>`;
  const bar = title.querySelector<HTMLElement>(".progress i")!;
  await new Promise((r) => setTimeout(r, 30));
  let world: World;
  try {
    world = make();
  } catch (e) {
    console.error(e);
    world = newWorld(20251);
  }
  game = new Game(world, { canvas: $("#game"), hud: $("#hud"), joyBase: $(".joy-base"), joyKnob: $(".joy-knob") }, mobile, () => {
    game = null;
    showTitle();
  });
  (window as unknown as { __game: Game }).__game = game;
  const total = world.fields.reduce((a, f) => a + f.n, 0);
  await new Promise<void>((resolve) => {
    const tick = () => {
      const done = game!.renderer.warmup(24);
      const left = world.fields.reduce((a, f) => a + (f.dirty ? (f.dirty.y1 - f.dirty.y0 + 1) * f.w : 0), 0);
      bar.style.width = `${Math.round((1 - left / total) * 100)}%`;
      if (done) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });
  title.classList.add("hidden");
  title.innerHTML = "";
  game.start();
  void VEHICLES;
}

showTitle();
