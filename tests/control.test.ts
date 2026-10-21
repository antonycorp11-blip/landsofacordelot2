import { describe, expect, it } from "vitest";
import { World } from "../src/world/World";
import { attach } from "../src/systems/ImplementSystem";
import { assignTask, handBack, hireWorker, takeOver, updateWorker } from "../src/systems/WorkerAI";
import { stepVehicle } from "../src/systems/VehicleSystem";
import { Economy } from "../src/systems/Economy";

function setup() {
  const w = new World(20251);
  const t = w.addVehicle("tr-campeiro-75", "player", 250, 708, -Math.PI / 2);
  const c = w.addImplement("cult-3", "player", 250, 711, -Math.PI / 2);
  attach(t, c);
  const field = w.fields.find((f) => f.name === "Campo 1")!;
  const wk = hireWorker(w, { name: "Teste", salary: 30, skill: 1, specialty: "cultivate" });
  const r = assignTask(w, wk, t.id, field.id, "cultivate");
  return { w, t, wk, field, r };
}

function run(w: World, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) {
    for (const wk of w.workers) updateWorker(w, wk, 1 / 60);
    for (const v of w.vehicles) {
      if (v.driver === null) v.ctrl = { throttle: 0, steer: 0, brake: 1 };
      stepVehicle(w, v, 1 / 60);
    }
  }
}

describe("troca de controle manual/automático", () => {
  it("funcionário vai até a máquina, dirige e trabalha", () => {
    const { w, t, wk, r } = setup();
    expect(r.ok).toBe(true);
    run(w, 30);
    expect(wk.vehicleId).toBe(t.id);
    expect(t.driver).toBe("worker");
    expect(wk.state).toBe("driving");
  });
  it("jogador assume (funcionário pausa) e devolve (funcionário replaneja)", () => {
    const { w, t, wk, field } = setup();
    run(w, 100);
    const before = field.counts[1];
    expect(before).toBeGreaterThan(0);
    takeOver(w, t);
    expect(t.driver).toBe("player");
    expect(wk.state).toBe("paused");
    run(w, 5);
    expect(wk.state).toBe("paused");
    const back = handBack(w, t);
    expect(back).toBe(wk);
    expect(t.driver).toBe("worker");
    expect(wk.state).toBe("driving");
    expect(wk.legs.length).toBeGreaterThan(0);
    run(w, 90);
    expect(field.counts[1]).toBeGreaterThan(before);
  });
  it("recusa tarefa incompatível com o implemento", () => {
    const { w, t, wk, field } = setup();
    const r = assignTask(w, wk, t.id, field.id, "harvest");
    expect(r.ok).toBe(false);
  });
  it("recusa campo de outro proprietário", () => {
    const { w, t, wk } = setup();
    const other = w.fields.find((f) => f.owner !== "player")!;
    expect(assignTask(w, wk, t.id, other.id, "cultivate").ok).toBe(false);
  });
});

describe("economia", () => {
  it("gasto exige saldo, cobranças obrigatórias usam cheque especial", () => {
    const e = new Economy(1, [{ id: "coop", name: "C", priceMul: { wheat: 1, soy: 1, corn: 1 }, accepts: ["wheat", "soy", "corn"] }], 100);
    const t = { day: 0, minute: 0 };
    expect(e.spend(200, "x", "outros", t)).toBe(false);
    expect(e.money).toBe(100);
    e.charge(300, "salário", "salários", t);
    expect(e.money).toBeGreaterThanOrEqual(0);
    expect(e.loan).toBeGreaterThan(0);
  });
  it("preços são determinísticos pela semente", () => {
    const b = [{ id: "coop", name: "C", priceMul: { wheat: 1, soy: 1, corn: 1 }, accepts: ["wheat", "soy", "corn"] as ("wheat" | "soy" | "corn")[] }];
    const a = new Economy(7, b);
    const c = new Economy(7, b);
    expect(a.price("coop", "wheat", { day: 3, minute: 300 })).toBe(c.price("coop", "wheat", { day: 3, minute: 300 }));
  });
});
