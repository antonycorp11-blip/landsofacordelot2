import { describe, expect, it } from "vitest";
import { FieldGrid, ST, applyCell, applyWork, needsWork, opProgress, type Stage, type WorkResult } from "../src/systems/FieldSystem";
import { updateField } from "../src/systems/CropSystem";
import { CROPS } from "../src/data/crops";

const square = (x0: number, y0: number, s: number) => [
  { x: x0, y: y0 },
  { x: x0 + s, y: y0 },
  { x: x0 + s, y: y0 + s },
  { x: x0, y: y0 + s },
];
const mk = (stage: Stage = ST.Raw) => {
  const f = new FieldGrid({ id: 1, name: "T", poly: square(10, 10, 20), owner: "player", price: 0, gate: { x: 0, y: 0 } });
  f.fill(stage);
  return f;
};
const res = (): WorkResult => ({ cells: 0, kg: 0, cropIndex: 0, seedKg: 0, liquidL: 0, blocked: false });

describe("limites do campo", () => {
  it("cria uma célula de 1 m² por metro quadrado do polígono", () => {
    const f = mk();
    expect(f.maskCount).toBe(400);
    expect(f.areaHa).toBeCloseTo(0.04);
  });
  it("cellIndexAt respeita a borda do polígono", () => {
    const f = mk();
    expect(f.cellIndexAt(10.5, 10.5)).toBeGreaterThanOrEqual(0);
    expect(f.cellIndexAt(29.5, 29.5)).toBeGreaterThanOrEqual(0);
    expect(f.cellIndexAt(9.5, 15)).toBe(-1);
    expect(f.cellIndexAt(30.5, 15)).toBe(-1);
  });
  it("polígono irregular exclui células fora do triângulo", () => {
    const f = new FieldGrid({ id: 2, name: "Tri", poly: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 20 }], owner: null, price: 0, gate: { x: 0, y: 0 } });
    expect(f.maskCount).toBeGreaterThan(180);
    expect(f.maskCount).toBeLessThan(220);
    expect(f.cellIndexAt(18, 18)).toBe(-1);
  });
});

describe("transições de solo", () => {
  it("cultivar transforma restolho em solo cultivado", () => {
    const f = mk(ST.Stubble);
    expect(applyCell(f, 0, "cultivate", { heading: 0 }, res())).toBe(true);
    expect(f.stage[0]).toBe(ST.Cultivated);
    expect(applyCell(f, 0, "cultivate", { heading: 0 }, res())).toBe(false);
  });
  it("só planta em solo preparado e consome semente", () => {
    const f = mk(ST.Raw);
    const r = res();
    expect(applyCell(f, 0, "plant", { heading: 0, cropIndex: CROPS.wheat.index }, r)).toBe(false);
    f.setStage(0, ST.Cultivated);
    expect(applyCell(f, 0, "plant", { heading: 0, cropIndex: CROPS.wheat.index }, r)).toBe(true);
    expect(f.stage[0]).toBe(ST.Planted);
    expect(f.crop[0]).toBe(CROPS.wheat.index);
    expect(r.seedKg).toBeCloseTo(CROPS.wheat.seedKgPerHa / 10000);
  });
  it("bloqueia plantio sem sementes suficientes", () => {
    const f = mk(ST.Cultivated);
    const r = res();
    expect(applyCell(f, 0, "plant", { heading: 0, cropIndex: 1, capacity: 0 }, r)).toBe(false);
    expect(r.blocked).toBe(true);
  });
  it("colheita só remove cultura madura e gera grãos", () => {
    const f = mk(ST.Planted);
    f.crop.fill(CROPS.wheat.index);
    f.growth.fill(0.5);
    f.recount();
    const r = res();
    expect(applyCell(f, 0, "harvest", { heading: 0 }, r)).toBe(false);
    f.growth[0] = 1;
    f.recount();
    expect(applyCell(f, 0, "harvest", { heading: 0 }, r)).toBe(true);
    expect(f.stage[0]).toBe(ST.Stubble);
    expect(r.kg).toBeGreaterThan(0.3);
    expect(r.kg).toBeLessThan(CROPS.wheat.yieldKgPerHa / 10000 + 0.01);
  });
  it("needsWork reflete a operação pendente", () => {
    const f = mk(ST.Cultivated);
    expect(needsWork(f, 0, "cultivate")).toBe(false);
    expect(needsWork(f, 0, "plant")).toBe(true);
  });
});

describe("faixa varrida pelo implemento", () => {
  it("afeta exatamente a largura de trabalho", () => {
    const f = mk(ST.Stubble);
    // barra de 3 m varrendo 10 m na direção x, centrada em y=20
    const quad = [
      { x: 12, y: 18.5 },
      { x: 12, y: 21.5 },
      { x: 22, y: 21.5 },
      { x: 22, y: 18.5 },
    ];
    const r = applyWork(f, "cultivate", quad, { heading: 0 });
    expect(r.cells).toBe(30);
    expect(f.counts[ST.Cultivated]).toBe(30);
    expect(opProgress(f, "cultivate")).toBeCloseTo(30 / 400);
    // repetir a mesma faixa não altera nada
    expect(applyWork(f, "cultivate", quad, { heading: 0 }).cells).toBe(0);
  });
  it("nada acontece fora do polígono", () => {
    const f = mk(ST.Stubble);
    const r = applyWork(f, "cultivate", [{ x: 40, y: 40 }, { x: 45, y: 40 }, { x: 45, y: 45 }, { x: 40, y: 45 }], { heading: 0 });
    expect(r.cells).toBe(0);
  });
});

describe("crescimento", () => {
  it("cultura amadurece com o tempo e depende de umidade", () => {
    const f = mk(ST.Planted);
    f.crop.fill(CROPS.wheat.index);
    f.moisture.fill(160);
    f.recount();
    updateField(f, CROPS.wheat.growthDays * 24 * 1.3, { season: 0, temp: 20, rain: 0.2 });
    expect(f.matureCount).toBeGreaterThan(f.maskCount * 0.5);
    const dry = mk(ST.Planted);
    dry.crop.fill(CROPS.wheat.index);
    dry.moisture.fill(10);
    updateField(dry, 24, { season: 0, temp: 20, rain: 0 });
    expect(dry.growth[0]).toBeLessThan(f.growth[0]);
  });
  it("colheita muito atrasada perde a lavoura", () => {
    const f = mk(ST.Planted);
    f.crop.fill(CROPS.wheat.index);
    f.growth.fill(1);
    f.moisture.fill(160);
    updateField(f, 24 * 8, { season: 0, temp: 20, rain: 0.2 });
    expect(f.counts[ST.Withered]).toBe(f.maskCount);
  });
});
