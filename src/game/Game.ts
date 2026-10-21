import { BALANCE } from "../config/balance";
import { FIXED_DT, GameLoop } from "../core/GameLoop";
import { clamp, dist } from "../core/math";
import { hash2 } from "../core/rng";
import { CROPS, CROP_LIST } from "../data/crops";
import { Input } from "../input/Input";
import { Renderer } from "../render/Renderer";
import { saveToStorage } from "../save/SaveSystem";
import { CropScheduler } from "../systems/CropSystem";
import { money } from "../systems/Economy";
import { npcDaily, updateNpcs } from "../systems/NpcFarms";
import { advance, daylight, season } from "../systems/TimeSystem";
import { dayWeather, weatherAt } from "../systems/Weather";
import { generateCandidates, updateWorker } from "../systems/WorkerAI";
import { stepContainers, stepVehicle } from "../systems/VehicleSystem";
import { vehicleCircles } from "../systems/geometry";
import { localToWorld } from "../core/math";
import type { World } from "../world/World";
import { UI } from "../ui/UI";
import { contextActions, type Action } from "./Interactions";
import { currentObjective, updateObjectives, type Guide } from "./Objectives";

export interface GameDom {
  canvas: HTMLCanvasElement;
  hud: HTMLElement;
  joyBase: HTMLElement;
  joyKnob: HTMLElement;
}

/** Orquestra simulação (passo fixo), entrada, renderização e interface. */
export class Game {
  readonly renderer: Renderer;
  readonly input: Input;
  readonly ui: UI;
  readonly loop: GameLoop;
  private crops = new CropScheduler();
  private saveTimer = 0;
  private hudTimer = 0;
  private rentAcc = 0;
  actions: Action[] = [];
  guide: Guide | null = null;
  hint = "";
  /** Veículo acompanhado pela câmera (funcionário), quando o jogador escolhe assistir. */
  watchId: number | null = null;
  watchField: number | null = null;
  paused = false;
  lastSeason = -1;

  constructor(
    public world: World,
    dom: GameDom,
    public mobile: boolean,
    private onExit: () => void,
  ) {
    this.renderer = new Renderer(dom.canvas, world, mobile);
    this.input = new Input(dom.canvas, dom.joyBase, dom.joyKnob);
    this.ui = new UI(this, dom.hud);
    this.loop = new GameLoop(
      (dt) => this.step(dt),
      (_a, fdt) => this.frame(fdt),
    );
    this.renderer.resize();
    this.renderer.camera.zoom = this.renderer.camera.targetZoom = mobile ? 17 : 16;
    window.addEventListener("resize", () => this.renderer.resize());
    const v = world.vehicle(world.player.vehicleId);
    this.renderer.camera.snap(v ? v.x : world.player.x, v ? v.y : world.player.y);
    this.input.onTap = (x, y) => this.tap(x, y);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.save(false);
    });
    this.lastSeason = season(world.time.day);
  }

  start(): void {
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
  }

  exitToTitle(): void {
    this.save(false);
    this.stop();
    this.onExit();
  }

  save(notify = true): void {
    const ok = saveToStorage(this.world);
    if (notify) this.world.notify(ok ? "Jogo salvo." : "Não foi possível salvar (armazenamento cheio?)", ok ? "good" : "bad");
  }

  private tap(x: number, y: number): void {
    const p = this.renderer.camera.screenToWorld(x, y);
    const f = this.world.fieldAt(p.x, p.y);
    if (f && this.renderer.camera.zoom < 3) this.ui.openMenu("fields", { fieldId: f.id });
  }

  // -------------------------------------------------------------------------
  // Simulação
  // -------------------------------------------------------------------------

  private step(dt: number): void {
    if (this.paused) return;
    const w = this.world;
    w.realTime += dt;
    const minutes = dt * BALANCE.gameMinutesPerSecond * BALANCE.timeScales[w.timeScaleIdx];
    const days = advance(w.time, minutes);
    w.weather = weatherAt(w.seed, w.time);
    this.crops.tick(w.fields, minutes / 60, { season: season(w.time.day), temp: w.weather.temp, rain: w.weather.rain });
    for (let k = 0; k < days; k++) this.newDay();

    this.controlPlayer(dt);
    for (const wk of w.workers) updateWorker(w, wk, dt);
    updateNpcs(w, dt);
    for (const v of w.vehicles) {
      if (v.driver === null) {
        v.ctrl.throttle = 0;
        v.ctrl.steer = 0;
        v.ctrl.brake = 1;
      }
      // nível de detalhe: máquinas longe da câmera integram a 20 Hz
      const far = dist(v, w.view) > w.view.r + 60;
      if (far && v.driver !== "player") {
        v.lodAcc += dt;
        if (v.lodAcc < FIXED_DT * 3) continue;
        const d2 = v.lodAcc;
        v.lodAcc = 0;
        stepVehicle(w, v, d2);
      } else {
        v.lodAcc = 0;
        stepVehicle(w, v, dt);
      }
    }
    this.collideVehicles();
    stepContainers(w, dt);
    // aluguel por hora de motor (1 h de trabalho = BALANCE.workHourRealSeconds)
    this.rentAcc += dt;
    if (this.rentAcc >= 5) {
      for (const v of w.vehicles) {
        if (!v.rented || !v.engineOn || !v.def.rentPerHour) continue;
        w.economy.charge((v.def.rentPerHour * this.rentAcc) / BALANCE.workHourRealSeconds, `Aluguel por hora · ${v.def.name}`, "aluguel", w.time);
      }
      this.rentAcc = 0;
    }
    if (w.flags.sold !== true && w.economy.ledger.some((l) => l.cat === "venda")) w.flags.sold = true;
    const completed = updateObjectives(w);
    if (completed && !w.flags.tutorialOff) w.notify(`✓ ${completed}`, "good");
    this.saveTimer += dt;
    if (this.saveTimer > BALANCE.autosaveSeconds) {
      this.saveTimer = 0;
      this.save(false);
    }
  }

  /** Impede o veículo do jogador de atravessar outras máquinas. */
  private collideVehicles(): void {
    const w = this.world;
    const pv = w.vehicle(w.player.vehicleId);
    if (!pv) return;
    const mine = vehicleCircles(pv).map((c) => ({ ...localToWorld(pv.x, pv.y, pv.heading, c.x, 0), r: c.r }));
    for (const o of w.vehicles) {
      if (o === pv || dist(o, pv) > 20) continue;
      for (const oc of vehicleCircles(o)) {
        const p = localToWorld(o.x, o.y, o.heading, oc.x, 0);
        for (const m of mine) {
          const d = dist(p, m);
          const min = m.r + oc.r;
          if (d < min && d > 1e-3) {
            const push = (min - d) * 0.8;
            pv.x += ((m.x - p.x) / d) * push;
            pv.y += ((m.y - p.y) / d) * push;
            pv.speed *= 0.6;
          }
        }
      }
    }
  }

  private controlPlayer(dt: number): void {
    const w = this.world;
    const inp = this.input;
    const ax = inp.axes();
    if (ax.x || ax.y) this.watchId = null;
    const v = w.vehicle(w.player.vehicleId);
    if (v) {
      if (!v.engineOn && ax.y !== 0 && v.fuel > 0) v.engineOn = true;
      v.ctrl.steer = ax.x;
      // joystick: curva mais agressiva para chegar à velocidade máxima sem esticar o dedo até o fim
      v.ctrl.throttle = Math.sign(ax.y) * Math.min(1, Math.abs(ax.y) * 1.4);
      v.ctrl.brake = ax.brake ? 1 : 0;
      w.player.x = v.x;
      w.player.y = v.y;
      return;
    }
    const p = w.player;
    const mag = Math.min(1, Math.hypot(ax.x, ax.y));
    p.moving = mag > 0.05;
    if (p.moving) {
      const speed = (ax.run || mag > 0.92 ? 9 : 5.5) * Math.min(1, mag * 1.2);
      const dx = ax.x / (mag || 1);
      const dy = -ax.y / (mag || 1);
      p.x += dx * speed * dt;
      p.y += dy * speed * dt;
      p.heading = Math.atan2(dy, dx);
      p.walkPhase += speed * dt * 3.2;
      const r = w.collision.resolveCircle(p.x, p.y, 0.35);
      p.x += r.x;
      p.y += r.y;
      for (const o of w.vehicles) {
        if (dist(o, p) > 8) continue;
        for (const c of vehicleCircles(o)) {
          const q = localToWorld(o.x, o.y, o.heading, c.x, 0);
          const d = dist(q, p);
          if (d < c.r + 0.35 && d > 1e-3) {
            p.x = q.x + ((p.x - q.x) / d) * (c.r + 0.35);
            p.y = q.y + ((p.y - q.y) / d) * (c.r + 0.35);
          }
        }
      }
      p.x = clamp(p.x, 2, w.map.width - 2);
      p.y = clamp(p.y, 2, w.map.height - 2);
    }
  }

  /** Viradas de dia: juros, aluguéis, arrendamentos, mercado, vizinhos e alertas. */
  private newDay(): void {
    const w = this.world;
    const t = w.time;
    w.economy.dailyInterest(t);
    for (const f of w.fields) if (f.leased && f.owner === "player") w.economy.charge(f.areaHa * BALANCE.leaseDailyPerHa, `Arrendamento · ${f.name}`, "terras", t);
    w.candidates = generateCandidates(w.seed, t.day);
    w.candidatesDay = t.day;
    npcDaily(w);
    // previsão para amanhã
    const tomorrow = dayWeather(w.seed, t.day + 1);
    const ripe = w.fields.filter((f) => f.owner === "player" && f.matureCount > f.maskCount * 0.3);
    if (tomorrow.rainStart >= 0 && tomorrow.intensity > 0.6 && ripe.length)
      w.notify(`Chuva forte prevista amanhã. ${ripe[0].name} está pronto para colher — colheita molhada rende menos e atrasa.`, "warn", { label: "Ver campo", run: () => this.ui.openMenu("fields", { fieldId: ripe[0].id }) });
    // evento de mercado determinístico
    const r = hash2(t.day, 991, w.seed);
    if (r < 0.28) {
      const crop = CROP_LIST[Math.floor(hash2(t.day, 992, w.seed) * CROP_LIST.length)];
      const buyer = w.map.buyers.filter((b) => b.accepts.includes(crop.id));
      const b = buyer[Math.floor(hash2(t.day, 993, w.seed) * buyer.length)];
      const up = hash2(t.day, 994, w.seed) < 0.7;
      const mul = up ? 1.12 + hash2(t.day, 995, w.seed) * 0.15 : 0.85;
      w.economy.events.push({ crop: crop.id, buyerId: b.id, mul, untilDay: t.day + 1, text: `${b.name}: ${crop.name} ${up ? "em alta" : "em baixa"}` });
      w.notify(`${b.name} ${up ? `paga +${Math.round((mul - 1) * 100)}%` : "reduziu o preço"} por ${crop.name} até amanhã.`, up ? "good" : "info", { label: "Ver mercado", run: () => this.ui.openMenu("market") });
    }
    const s = season(t.day);
    if (s !== this.lastSeason) {
      this.lastSeason = s;
      w.notify(`Começou ${["a primavera", "o verão", "o outono", "o inverno"][s]}. Veja quais culturas crescem melhor agora.`, "info");
    }
    for (const n of w.npcs) n.cash += 0;
    void CROPS;
  }

  /** Pula para as 6h do dia seguinte. Máquinas ficam paradas (o trabalho não avança sozinho). */
  sleep(): void {
    const w = this.world;
    const target = w.time.minute >= 6 * 60 ? 1440 - w.time.minute + 360 : 360 - w.time.minute;
    const days = advance(w.time, target);
    const env = { season: season(w.time.day), temp: 14, rain: weatherAt(w.seed, w.time).rain };
    this.crops.tick(w.fields, target / 60, env);
    this.crops.flush(w.fields, env);
    for (let k = 0; k < days; k++) this.newDay();
    w.notify(`Bom dia! ${money(w.economy.money)} em caixa.`, "good");
    this.save(false);
  }

  refreshActions(): void {
    const r = contextActions(this);
    this.actions = r.actions;
    this.hint = r.hint;
  }

  // -------------------------------------------------------------------------
  // Renderização
  // -------------------------------------------------------------------------

  /** Atalhos de teclado (uma vez por pressionamento, tratados a cada frame). */
  private handleKeys(): void {
    const inp = this.input;
    if (inp.hit("escape")) this.ui.closeMenu();
    if (inp.hit("m") || inp.hit("tab")) this.ui.toggleMenu("map");
    if (this.ui.menuOpen) return;
    this.refreshActions();
    for (const a of this.actions) {
      if (inp.hit(a.key)) {
        a.run();
        this.refreshActions();
        this.ui.update();
        break;
      }
    }
    if (inp.hit("+") || inp.hit("=")) this.renderer.camera.zoomBy(1.25);
    if (inp.hit("-")) this.renderer.camera.zoomBy(0.8);
  }

  private frame(fdt: number): void {
    const w = this.world;
    const cam = this.renderer.camera;
    this.handleKeys();
    if (this.input.zoomDelta) cam.zoomBy(Math.pow(1.15, this.input.zoomDelta));
    let tx = w.player.x;
    let ty = w.player.y;
    let vx = 0;
    let vy = 0;
    const watched = w.vehicle(this.watchId);
    const v = watched ?? w.vehicle(w.player.vehicleId);
    if (this.watchField !== null) {
      const f = w.field(this.watchField);
      if (f) {
        tx = (f.bounds.minX + f.bounds.maxX) / 2;
        ty = (f.bounds.minY + f.bounds.maxY) / 2;
      }
      if (this.input.axes().x || this.input.axes().y) this.watchField = null;
    } else if (v) {
      tx = v.x;
      ty = v.y;
      vx = Math.cos(v.heading) * v.speed;
      vy = Math.sin(v.heading) * v.speed;
    }
    cam.follow(tx, ty, vx, vy, fdt);
    const pv = w.vehicle(w.player.vehicleId);
    const field = pv ? w.fieldAt(pv.x, pv.y) : undefined;
    this.renderer.render(fdt, { highlightFieldId: field?.id, showZones: true, showLabels: true, guide: this.guide });
    this.hudTimer += fdt;
    if (this.hudTimer > 0.1) {
      this.hudTimer = 0;
      this.refreshActions();
      const obj = currentObjective(w);
      this.guide = obj ? obj.guide(w) : null;
      this.ui.update();
    }
    this.input.endFrame();
    void daylight;
  }
}
