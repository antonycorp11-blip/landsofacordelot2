import { BALANCE } from "../config/balance";
import { dist, localToWorld } from "../core/math";
import { CROPS, CROP_LIST } from "../data/crops";
import { kgLabel, money } from "../systems/Economy";
import { opProgress } from "../systems/FieldSystem";
import { attach, containers, detach, findAttachable, tipTarget, type ContainerRef } from "../systems/ImplementSystem";
import { handBack, opsFor, takeOver } from "../systems/WorkerAI";
import type { Vehicle } from "../world/entities";
import type { Game } from "./Game";

export interface Action {
  id: string;
  label: string;
  key: string;
  run: () => void;
  tone?: "primary" | "warn" | "normal";
}

export function doorPoint(v: Vehicle) {
  return localToWorld(v.x, v.y, v.heading, (v.def.body.cabinFront + v.def.body.cabinBack) / 2, -v.def.width / 2 - 0.9);
}

export function nearestVehicle(game: Game): Vehicle | undefined {
  const p = game.world.player;
  let best: Vehicle | undefined;
  let bd = Infinity;
  for (const v of game.world.vehicles) {
    const d = Math.min(dist(doorPoint(v), p), dist(v, p) - v.def.length / 2);
    if (d < bd && d < 3.2) {
      bd = d;
      best = v;
    }
  }
  return best;
}

export function playerContainer(game: Game, v: Vehicle): ContainerRef | undefined {
  const all = containers(game.world);
  const im = game.world.implement(v.implementId);
  return all.find((c) => (im && c.implement === im) || c.vehicle === v);
}

export function enterVehicle(game: Game, v: Vehicle): void {
  const w = game.world;
  if (v.owner !== "player") {
    w.notify("Essa máquina pertence a um vizinho.", "warn");
    return;
  }
  w.player.vehicleId = v.id;
  if (v.driver === "worker") {
    const wk = takeOver(w, v);
    if (wk) w.notify(`Você assumiu a máquina de ${wk.name}. Saia ou use “Devolver” para ele continuar.`, "info");
  } else v.driver = "player";
  w.flags.enteredVehicle = true;
}

export function exitVehicle(game: Game): void {
  const w = game.world;
  const v = w.vehicle(w.player.vehicleId);
  w.player.vehicleId = null;
  if (!v) return;
  const door = doorPoint(v);
  w.player.x = door.x;
  w.player.y = door.y;
  v.ctrl = { throttle: 0, steer: 0, brake: 1 };
  if (v.workerId && w.worker(v.workerId)?.state === "paused") {
    const wk = handBack(w, v);
    if (wk) {
      w.notify(`${wk.name} retomou o controle.`, "good");
      w.flags.handedBack = true;
    }
  } else {
    v.driver = null;
    if (Math.abs(v.speed) < 0.5) v.engineOn = false;
  }
}

const OP_DONE: Record<string, string> = { harvest: "colhido", plant: "plantado", spray: "adubado", plow: "arado", cultivate: "cultivado" };

/** Ações contextuais disponíveis agora, na ordem em que aparecem na tela. */
export function contextActions(game: Game): { actions: Action[]; hint: string } {
  const w = game.world;
  const acts: Action[] = [];
  let hint = "";
  const pv = w.vehicle(w.player.vehicleId);
  if (!pv) {
    const near = nearestVehicle(game);
    if (near) {
      if (near.owner === "player") {
        const wk = w.worker(near.workerId);
        acts.push({
          id: "enter",
          key: "e",
          label: near.driver === "worker" ? `Assumir ${near.def.name} (${wk?.name.split(" ")[0] ?? "operador"})` : `Entrar · ${near.def.name}`,
          run: () => enterVehicle(game, near),
          tone: "primary",
        });
      } else hint = `${near.def.name} de ${w.farmOf(near.owner).name}`;
    }
    const home = w.zoneAt(w.player.x, w.player.y, "home");
    const h = w.time.minute / 60;
    if (home && home.owner === "player" && (h >= 19 || h < 5)) acts.push({ id: "sleep", key: "z", label: "Dormir até 6h", run: () => game.sleep() });
    else if (home && home.owner === "player") hint = hint || "Casa da sede · é possível dormir após as 19h";
    return { actions: acts, hint };
  }
  const v = pv;
  const d = v.def;
  const paused = v.workerId && w.worker(v.workerId)?.state === "paused";
  acts.push({ id: "exit", key: "e", label: paused ? "Sair e devolver ao operador" : "Sair", run: () => exitVehicle(game) });
  acts.push({
    id: "engine",
    key: "i",
    label: v.engineOn ? "Desligar motor" : "Ligar motor",
    run: () => {
      if (!v.engineOn && v.fuel <= 0) return w.notify("Tanque vazio.", "bad");
      v.engineOn = !v.engineOn;
    },
  });
  const im = w.implement(v.implementId);
  if (d.hitch) {
    if (im) {
      if (Math.abs(v.speed) < 0.6) acts.push({ id: "detach", key: "q", label: `Desengatar ${im.def.name}`, run: () => void detach(w, v) });
    } else {
      const c = findAttachable(w, v);
      if (c.implement && !c.reason) {
        const target = c.implement;
        acts.push({
          id: "attach",
          key: "q",
          label: `Engatar ${target.def.name}`,
          tone: "primary",
          run: () => {
            attach(v, target);
            w.flags[`attached_${target.def.category}`] = true;
          },
        });
      } else if (c.reason) hint = `${c.implement!.def.name}: ${c.reason}`;
    }
  }
  if (im && im.def.op) {
    const what = im.def.category === "sprayer" ? "barras" : "implemento";
    acts.push({
      id: "lower",
      key: "v",
      label: im.lowered ? `Levantar ${what}` : `Baixar ${what}`,
      tone: im.lowered ? "normal" : "primary",
      run: () => {
        im.lowered = !im.lowered;
        im.lastBar = null;
      },
    });
  }
  if (d.combine) {
    acts.push({
      id: "header",
      key: "v",
      label: v.lowered ? "Levantar plataforma" : "Baixar plataforma e ligar trilha",
      tone: v.lowered ? "normal" : "primary",
      run: () => {
        v.lowered = !v.lowered;
        v.lastBar = null;
      },
    });
    acts.push({ id: "pipe", key: "g", label: v.pipeOut ? "Recolher tubo" : "Estender tubo de descarga", run: () => (v.pipeOut = !v.pipeOut) });
  }
  // caçamba (carreta engatada ou caminhão)
  const cont = playerContainer(game, v);
  if (cont) {
    const holder = cont.implement ?? cont.vehicle!;
    const tgt = tipTarget(w, cont.bed, "player");
    if (tgt && cont.cargo.kg > 1 && cont.cargo.cropId) {
      const crop = cont.cargo.cropId;
      const label =
        tgt.kind === "sell" && tgt.buyerId
          ? `Vender ${kgLabel(cont.cargo.kg)} · ${money(w.economy.price(tgt.buyerId, crop, w.time) * 1000)}/t`
          : `Descarregar ${kgLabel(cont.cargo.kg)} no silo`;
      acts.push({ id: "tip", key: "g", label: holder.tipping ? "Parar descarga" : label, tone: "primary", run: () => (holder.tipping = !holder.tipping) });
    }
    const silo = w.zoneAt(cont.bed.cx, cont.bed.cy, "silo");
    if (silo && silo.owner === "player" && w.storage.total() > 0 && cont.cargo.kg < cont.cargo.capacity - 1) {
      acts.push({ id: "load", key: "l", label: holder.loading ? "Parar carregamento" : "Carregar do silo", run: () => (holder.loading = !holder.loading) });
    }
  }
  // abastecimento
  const fuelZone = w.zoneAt(v.x, v.y, "fuel");
  if (fuelZone && (fuelZone.owner === null || fuelZone.owner === "player") && v.fuel < d.fuelCapacity - 1) {
    const price = BALANCE.dieselPrice * (fuelZone.owner ? BALANCE.farmDieselMarkup : 1);
    const liters = d.fuelCapacity - v.fuel;
    acts.push({
      id: "fuel",
      key: "r",
      label: `Abastecer ${Math.round(liters)} L · ${money(liters * price)}`,
      run: () => {
        const afford = Math.min(liters, w.economy.money / price);
        if (afford < 1) return w.notify("Sem dinheiro para diesel.", "bad");
        w.economy.spend(afford * price, "Diesel", "combustível", w.time);
        v.fuel += afford;
      },
    });
  }
  // sementes / adubo
  if (im && (im.def.seedCapacityKg || im.def.liquidCapacityL)) {
    const probe = localToWorld(im.x, im.y, im.heading, -im.def.length / 2, 0);
    const seedZone = w.zoneAt(probe.x, probe.y, "seed") ?? w.zoneAt(v.x, v.y, "seed");
    if (seedZone && seedZone.owner === "player") {
      if (im.def.seedCapacityKg) {
        const crop = CROPS[im.seedCrop];
        const kg = im.def.seedCapacityKg - im.seedKg;
        if (kg > 0.5)
          acts.push({
            id: "seed",
            key: "t",
            label: `Encher sementes de ${crop.name} · ${money(kg * crop.seedPricePerKg)}`,
            tone: "primary",
            run: () => {
              const buy = Math.min(kg, w.economy.money / crop.seedPricePerKg);
              if (buy < 1) return w.notify("Sem dinheiro para sementes.", "bad");
              w.economy.spend(buy * crop.seedPricePerKg, `Sementes de ${crop.name}`, "insumos", w.time);
              im.seedKg += buy;
            },
          });
        acts.push({
          id: "crop",
          key: "c",
          label: `Trocar cultura (${crop.name})`,
          run: () => {
            const idx = CROP_LIST.findIndex((c) => c.id === im.seedCrop);
            const next = CROP_LIST[(idx + 1) % CROP_LIST.length];
            if (im.seedKg > 0) w.economy.earn(im.seedKg * crop.seedPricePerKg, `Devolução de sementes de ${crop.name}`, "insumos", w.time);
            im.seedKg = 0;
            im.seedCrop = next.id;
          },
        });
      } else if (im.def.liquidCapacityL && im.liquidL < im.def.liquidCapacityL - 1) {
        const l = im.def.liquidCapacityL - im.liquidL;
        acts.push({
          id: "liquid",
          key: "t",
          label: `Encher adubo · ${money(l * BALANCE.fertilizerPricePerL)}`,
          run: () => {
            const buy = Math.min(l, w.economy.money / BALANCE.fertilizerPricePerL);
            if (buy < 1) return w.notify("Sem dinheiro para adubo.", "bad");
            w.economy.spend(buy * BALANCE.fertilizerPricePerL, "Adubo líquido", "insumos", w.time);
            im.liquidL += buy;
          },
        });
      }
    }
  }
  // oficina
  const shop = w.zoneAt(v.x, v.y, "workshop") ?? w.zoneAt(v.x, v.y, "dealer");
  if (shop && (shop.owner === "player" || shop.type === "dealer")) {
    const wear = v.wear + (im?.wear ?? 0);
    if (wear > 0.02) {
      const cost = v.wear * d.price * BALANCE.repairFactor + (im ? im.wear * im.def.price * BALANCE.repairFactor : 0);
      acts.push({
        id: "repair",
        key: "f",
        label: `Revisar e reparar · ${money(cost)}`,
        run: () => {
          if (!w.economy.spend(cost, `Manutenção · ${d.name}`, "manutenção", w.time)) return w.notify("Sem dinheiro para o reparo.", "bad");
          v.wear = 0;
          if (im) im.wear = 0;
          w.notify("Máquina revisada.", "good");
        },
      });
    }
  }
  // funcionários
  const wk = w.worker(v.workerId);
  if (wk && wk.state === "paused") acts.push({ id: "handback", key: "h", label: `Devolver a ${wk.name.split(" ")[0]}`, tone: "primary", run: () => exitVehicle(game) });
  else if (opsFor(w, v).length && v.owner === "player") acts.push({ id: "hire", key: "h", label: "Atribuir a um operador", run: () => game.ui.openMenu("workers", { vehicleId: v.id }) });

  // dicas de trabalho
  const f = w.fieldAt(v.x, v.y);
  if (!hint) {
    if (v.fuel < d.fuelCapacity * 0.12) hint = "Combustível baixo: abasteça no tanque da sede ou no posto.";
    else if (im?.def.op === "plant" && im.seedKg < 1) hint = "Plantadeira vazia: encha as sementes no depósito da sede.";
    else if (d.combine && v.cargo && v.cargo.kg > v.cargo.capacity * 0.9) hint = "Tanque quase cheio: estenda o tubo sobre uma carreta.";
    else if (f && f.owner !== "player") hint = `${f.name} pertence a ${f.owner ? w.farmOf(f.owner).name : "ninguém (à venda)"}: o trabalho não terá efeito.`;
    else if (f && (im?.def.op || d.combine)) {
      const op = d.combine ? "harvest" : im!.def.op!;
      hint = `${f.name}: ${Math.round(opProgress(f, op) * 100)}% ${OP_DONE[op]}`;
    }
  }
  return { actions: acts, hint };
}
