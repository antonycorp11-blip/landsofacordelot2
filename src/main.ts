import "./styles.css";
import { RUN, type UnitId } from "./data/content";
import { computeStats, loadProfile, newProfile, saveProfile, SAVE_KEY, type Profile } from "./game/profile";
import { callWaveNow, canPlace, collectAt, finalScrap, newRun, place, removeUnit, slash, step, type RunState } from "./game/run";
import { BoardRenderer } from "./render/board";
import { Hub } from "./ui/hub";
import { RunHud, type RunHudHost } from "./ui/runhud";

const canvas = document.getElementById("board") as HTMLCanvasElement;
const ui = document.getElementById("ui")!;
const board = new BoardRenderer(canvas);
let profile: Profile = loadProfile();
let hub: Hub | null = null;
let run: RunState | null = null;
let runHud: RunHud | null = null;
let resetting = false;

const save = () => {
  if (!resetting) saveProfile(profile);
};

// ---------------------------------------------------------------------------
// Base (entre missões)
// ---------------------------------------------------------------------------

function showHub(tab?: "missions" | "tree" | "arsenal"): void {
  runHud?.destroy();
  runHud = null;
  run = null;
  document.body.classList.remove("in-run");
  hub?.destroy();
  hub = new Hub(
    {
      profile,
      start: (sector) => startRun(sector),
      save,
      reset: () => {
        resetting = true;
        localStorage.removeItem(SAVE_KEY);
        profile = newProfile();
        location.reload();
      },
    },
    ui,
  );
  if (tab) {
    hub.tab = tab;
    hub.render();
  }
}

// ---------------------------------------------------------------------------
// Missão
// ---------------------------------------------------------------------------

const input = {
  selected: null as UnitId | "shovel" | null,
  hover: null as { row: number; col: number } | null,
  trail: [] as { x: number; y: number; t: number }[],
  slashing: false,
  last: null as { x: number; y: number } | null,
  speed: 1,
  paused: false,
  ended: false,
};

function startRun(sector: number): void {
  hub?.destroy();
  hub = null;
  const st = computeStats(profile);
  run = newRun(sector, st, profile.loadout);
  input.selected = null;
  input.paused = false;
  input.ended = false;
  input.trail = [];
  document.body.classList.add("in-run");
  const host: RunHudHost = {
    get run() {
      return run!;
    },
    get selected() {
      return input.selected;
    },
    select(s) {
      input.selected = s;
    },
    get speed() {
      return input.speed;
    },
    setSpeed(n) {
      input.speed = n;
    },
    get paused() {
      return input.paused;
    },
    setPaused(p) {
      input.paused = p;
    },
    callWave() {
      if (run) callWaveNow(run);
    },
    abandon() {
      if (run) {
        run.status = "lost";
        input.paused = false;
      }
    },
    finish(action) {
      const sector = run?.sector ?? 1;
      if (action === "hub") showHub("tree");
      else if (action === "retry") startRun(sector);
      else startRun(sector + 1);
    },
  };
  runHud = new RunHud(host, ui);
  layout();
}

function endRun(r: RunState): void {
  if (input.ended) return;
  input.ended = true;
  const won = r.status === "won";
  const first = won && !profile.cleared[r.sector];
  const loot = finalScrap(r, first);
  const prevBest = profile.bestWave[r.sector] ?? 0;
  profile.scrap += loot.total;
  profile.scrapTotal += loot.total;
  profile.kills += r.kills;
  profile.runs++;
  profile.bestWave[r.sector] = Math.max(prevBest, r.wavesCleared);
  let unlockedNext = false;
  if (won) {
    profile.cleared[r.sector] = true;
    if (profile.sectorUnlocked === r.sector) {
      profile.sectorUnlocked = r.sector + 1;
      unlockedNext = true;
    } else unlockedNext = profile.sectorUnlocked > r.sector;
  }
  save();
  runHud?.showResult(won, loot, unlockedNext, r.wavesCleared > prevBest);
}

function layout(): void {
  const top = runHud ? runHud.trayHeight() : 0;
  board.resize(top, 6);
}
window.addEventListener("resize", () => {
  layout();
  hub?.render();
});

// entrada: tocar carta e casa para posicionar; arrastar sobre alienígenas corta
canvas.addEventListener("pointerdown", (e) => {
  if (!run || input.paused || run.status !== "playing") return;
  canvas.setPointerCapture(e.pointerId);
  const w = board.toWorld(e.clientX, e.clientY);
  if (input.selected) {
    const tile = board.tileAt(w.x, w.y);
    if (tile) {
      if (input.selected === "shovel") {
        if (removeUnit(run, tile.row, tile.col)) input.selected = null;
      } else {
        const idx = run.cards.findIndex((c) => c.id === input.selected);
        if (canPlace(run, idx, tile.row, tile.col)) {
          place(run, idx, tile.row, tile.col);
          profile.flags.placed = true;
          input.selected = null;
        }
      }
      return;
    }
    input.selected = null;
  }
  collectAt(run, w.x, w.y, 44);
  input.slashing = true;
  input.last = w;
  input.trail = [{ ...w, t: board.time }];
});
canvas.addEventListener("pointermove", (e) => {
  if (!run) return;
  const w = board.toWorld(e.clientX, e.clientY);
  input.hover = input.selected ? board.tileAt(w.x, w.y) : null;
  if (!input.slashing || !input.last || input.paused) return;
  const hits = slash(run, input.last.x, input.last.y, w.x, w.y);
  if (hits) profile.flags.slashed = true;
  input.last = w;
  input.trail.push({ ...w, t: board.time });
  if (input.trail.length > 24) input.trail.shift();
});
const endSlash = () => {
  input.slashing = false;
  input.last = null;
};
canvas.addEventListener("pointerup", endSlash);
canvas.addEventListener("pointercancel", endSlash);
window.addEventListener("keydown", (e) => {
  if (!run || !runHud) return;
  const n = Number(e.key);
  if (n >= 1 && n <= run.cards.length) input.selected = input.selected === run.cards[n - 1].id ? null : run.cards[n - 1].id;
  if (e.key === "Escape") input.selected = null;
  if (e.key === " ") callWaveNow(run);
});

/** Dicas de primeira missão. */
function tip(r: RunState): string {
  if (profile.runs > 0 && profile.flags.slashed) return "";
  const placedGen = r.grid.some((row) => row.some((u) => u?.def.id === "generator"));
  const placedShooter = r.grid.some((row) => row.some((u) => u && u.def.damage > 0));
  if (!placedGen) return input.selected === "generator" ? "Agora toque numa casa do chão (de preferência nas colunas da esquerda)." : "Toque na carta Gerador e depois numa casa do chão.";
  if (r.energy < 100 && !placedShooter && r.orbs.length) return "Toque nas células de energia amarelas para coletá-las.";
  if (!placedShooter) return "Coloque um Blaster: ele atira em tudo que vier pela fileira dele.";
  if (r.aliens.length && !profile.flags.slashed) return "Passe o dedo sobre os alienígenas para cortá-los! Se a lâmina superaquecer, espere esfriar.";
  if (r.prep > 0) return "Monte mais geradores e defesas antes da primeira onda, ou toque em “Chamar onda”.";
  return "";
}

// laço principal
const DT = 1 / 60;
let acc = 0;
let last = performance.now();
let hudT = 0;
function frame(now: number): void {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  if (run) {
    if (!input.paused) {
      acc += dt * input.speed;
      let n = 0;
      while (acc >= DT && n < 12) {
        step(run, DT);
        acc -= DT;
        n++;
      }
      if (n === 12) acc = 0;
    }
    board.consume(run);
    board.render(run, { selected: input.selected, hover: input.hover, trail: input.trail, energyTarget: runHud!.energyTarget() }, input.paused ? 0 : dt);
    hudT += dt;
    if (hudT > 0.08 && runHud) {
      hudT = 0;
      runHud.update();
      runHud.setTip(run.status === "playing" ? tip(run) : "");
    }
    if (run.status !== "playing") endRun(run);
  }
  requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    save();
    if (run && run.status === "playing" && runHud) {
      input.paused = true;
      runHud.root.querySelector<HTMLElement>(".pause")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    }
  } else last = performance.now();
});
window.addEventListener("beforeunload", save);

showHub();
requestAnimationFrame(frame);
(window as unknown as { __game: unknown }).__game = {
  get run() {
    return run;
  },
  get profile() {
    return profile;
  },
  startRun,
  showHub,
  board,
  input,
  step,
  RUN,
};
