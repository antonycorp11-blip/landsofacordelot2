import { describe, expect, it } from "vitest";
import { World } from "../src/world/World";
import { setupNpcs, updateNpcs } from "../src/systems/NpcFarms";
import { updateWorker } from "../src/systems/WorkerAI";
import { stepVehicle } from "../src/systems/VehicleSystem";
import { ST } from "../src/systems/FieldSystem";

describe("fazendas concorrentes", () => {
  it("vizinhos operam máquinas reais e alteram seus campos", () => {
    const w = new World(20251);
    setupNpcs(w);
    const before = w.fields.filter((f) => f.owner === "osorio").map((f) => [...f.counts]);
    for (let i = 0; i < 240 * 60; i++) {
      updateNpcs(w, 1 / 60);
      for (const wk of w.workers) updateWorker(w, wk, 1 / 60);
      for (const v of w.vehicles) {
        if (v.driver === null) v.ctrl = { throttle: 0, steer: 0, brake: 1 };
        stepVehicle(w, v, 1 / 60);
      }
      if ((globalThis as { TRACE?: boolean }).TRACE && i % (20 * 60) === 0) {
        for (const wk of w.workers.filter((x) => x.owner === "osorio")) {
          const v = w.vehicle(wk.vehicleId);
          const leg = wk.legs[wk.legIdx];
          console.log(i / 60, wk.name, wk.state, wk.note, `leg ${wk.legIdx}/${wk.legs.length} ${leg?.kind}`, v ? `${v.x.toFixed(0)},${v.y.toFixed(0)} ${(v.speed * 3.6).toFixed(1)}` : "");
        }
      }
    }
    const after = w.fields.filter((f) => f.owner === "osorio").map((f) => [...f.counts]);
    const changed = after.some((c, k) => c[ST.Planted] !== before[k][ST.Planted] || c[ST.Stubble] !== before[k][ST.Stubble] || c[ST.Cultivated] !== before[k][ST.Cultivated]);
    expect(changed).toBe(true);
  }, 60000);
});
