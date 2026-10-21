import { describe, expect, it } from "vitest";
import { FarmStorage, canAccept, cargoAdd, cargoRemove } from "../src/systems/Storage";

describe("carga de carretas e tanques", () => {
  it("respeita a capacidade", () => {
    const c = { cropId: null, kg: 0, capacity: 1000 };
    expect(cargoAdd(c, "wheat", 700)).toBe(700);
    expect(cargoAdd(c, "wheat", 700)).toBe(300);
    expect(c.kg).toBe(1000);
    expect(canAccept(c, "wheat")).toBe(false);
  });
  it("não mistura culturas", () => {
    const c = { cropId: null, kg: 0, capacity: 1000 };
    cargoAdd(c, "soy", 10);
    expect(cargoAdd(c, "wheat", 10)).toBe(0);
    expect(canAccept(c, "wheat")).toBe(false);
  });
  it("esvazia e libera o tipo de grão", () => {
    const c = { cropId: null, kg: 0, capacity: 1000 };
    cargoAdd(c, "corn", 500);
    expect(cargoRemove(c, 800)).toBe(500);
    expect(c.cropId).toBe(null);
    expect(canAccept(c, "wheat")).toBe(true);
  });
});

describe("silo da fazenda", () => {
  it("compartilha a capacidade entre culturas", () => {
    const s = new FarmStorage(1000);
    expect(s.add("wheat", 600)).toBe(600);
    expect(s.add("soy", 600)).toBe(400);
    expect(s.free()).toBe(0);
    expect(s.remove("wheat", 1000)).toBe(600);
    expect(s.total()).toBe(400);
  });
});
