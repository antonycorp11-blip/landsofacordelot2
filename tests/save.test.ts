import { describe, expect, it } from "vitest";
import { World } from "../src/world/World";
import { deserialize, rleDecode, rleEncode, serialize } from "../src/save/SaveSystem";
import { ST } from "../src/systems/FieldSystem";

describe("salvamento", () => {
  it("RLE é reversível", () => {
    const a = Uint8Array.from([1, 1, 1, 2, 2, 3, ...new Array(600).fill(7)]);
    expect(Array.from(rleDecode(rleEncode(a), a.length))).toEqual(Array.from(a));
  });
  it("persiste campo, combustível, carga, posição e relógio", () => {
    const w = new World(99);
    const t = w.addVehicle("tr-campeiro-75", "player", 100.5, 200.25, 1.2);
    t.fuel = 42.5;
    const tr = w.addImplement("trailer-8", "player", 90, 200, 1.2);
    tr.cargo!.kg = 3456;
    tr.cargo!.cropId = "soy";
    const f = w.fields[0];
    for (let i = 0; i < 200; i++) f.setStage(i, ST.Cultivated);
    f.growth[5] = 0.731;
    w.time = { day: 3, minute: 610 };
    w.economy.money = 12345;
    const data = JSON.parse(JSON.stringify(serialize(w)));
    const w2 = deserialize(data);
    const t2 = w2.vehicle(t.id)!;
    expect(t2.fuel).toBeCloseTo(42.5);
    expect(t2.x).toBeCloseTo(100.5);
    expect(t2.heading).toBeCloseTo(1.2);
    expect(w2.implement(tr.id)!.cargo).toEqual({ cropId: "soy", kg: 3456, capacity: 8000 });
    expect(w2.fields[0].counts[ST.Cultivated]).toBe(f.counts[ST.Cultivated]);
    expect(w2.fields[0].growth[5]).toBeCloseTo(0.731, 3);
    expect(w2.time).toEqual({ day: 3, minute: 610 });
    expect(w2.economy.money).toBe(12345);
  });
});
