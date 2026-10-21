import { describe, expect, it } from "vitest";
import { bulkCost, enemyHp, maxAffordable, offlineEarnings, prestigeGain } from "../src/game/economy";
import { buildTower, buyBeam, buyProducer, prestige, sellTower, upgradeTower } from "../src/game/actions";
import { damage, inBeam, step, waveComposition } from "../src/game/sim";
import { newRuntime, newState } from "../src/game/state";
import { load, migrate, save } from "../src/game/save";
import { BALANCE, ENEMIES, beamStats } from "../src/data/content";
import { fmt } from "../src/core/format";

describe("feixe de luz", () => {
  it("atinge apenas dentro do cone e do alcance", () => {
    const half = (15 * Math.PI) / 180;
    expect(inBeam(0, half, 200, 100, 0)).toBe(true);
    expect(inBeam(0, half, 200, 100, 20)).toBe(true);
    expect(inBeam(0, half, 200, 100, 60)).toBe(false);
    expect(inBeam(0, half, 200, 250, 0)).toBe(false);
    expect(inBeam(0, half, 200, -100, 0)).toBe(false);
  });
  it("o raio do alvo conta (corpo grande na borda do cone)", () => {
    const half = (10 * Math.PI) / 180;
    expect(inBeam(0, half, 200, 100, 25)).toBe(false);
    expect(inBeam(0, half, 200, 100, 25, 10)).toBe(true);
  });
  it("funciona perto do ângulo 2π (sem buraco na virada)", () => {
    expect(inBeam(Math.PI * 2 - 0.05, 0.2, 200, 100, 3)).toBe(true);
  });
});

describe("dano", () => {
  it("água-viva só sente luz, carapaça reduz dano físico", () => {
    const s = newState(1);
    const rt = newRuntime();
    const jelly = { ...mkEnemy("jelly") };
    damage(s, rt, jelly, 10, false);
    expect(jelly.hp).toBe(jelly.maxHp);
    damage(s, rt, jelly, 10, true);
    expect(jelly.hp).toBe(jelly.maxHp - 10);
    const crab = mkEnemy("crab");
    damage(s, rt, crab, 10, false);
    expect(crab.hp).toBeCloseTo(crab.maxHp - 5);
    damage(s, rt, crab, 10, false, 1);
    expect(crab.hp).toBeCloseTo(crab.maxHp - 15);
  });
  it("matar dá óleo", () => {
    const s = newState(1);
    const rt = newRuntime();
    const e = mkEnemy("eel");
    const before = s.oil;
    damage(s, rt, e, 1e9, true);
    expect(e.dead).toBe(true);
    expect(s.oil).toBeGreaterThan(before);
  });
});

function mkEnemy(kind: keyof typeof ENEMIES) {
  return { id: 1, kind, def: ENEMIES[kind], angle: 0, dist: 100, x: 100, y: 0, hp: 50, maxHp: 50, slowT: 0, slowMul: 1, burnT: 0, burnDps: 0, lit: false, glow: 0, wob: 0, boss: false, dead: false, hitFlash: 0 };
}

describe("economia incremental", () => {
  it("custo em lote é a soma da série geométrica", () => {
    const manual = 10 + 10 * 1.5 + 10 * 1.5 * 1.5;
    expect(bulkCost(10, 1.5, 0, 3)).toBeCloseTo(manual);
    expect(maxAffordable(10, 1.5, 0, manual)).toBe(3);
    expect(maxAffordable(10, 1.5, 0, manual - 0.01)).toBe(2);
  });
  it("compras descontam óleo e respeitam o saldo", () => {
    const s = newState(1);
    s.oil = 1000;
    expect(buyBeam(s, "power", 10)).toBe(true);
    expect(s.beam.power).toBe(10);
    s.oil = 0;
    expect(buyProducer(s, "whaler", 1)).toBe(false);
  });
  it("torres: construir, melhorar e vender devolve 60%", () => {
    const s = newState(1);
    s.oil = 10000;
    expect(buildTower(s, 0, "lantern")).toBe(true);
    expect(buildTower(s, 0, "lantern")).toBe(false);
    expect(upgradeTower(s, 0, 1)).toBe(true);
    const spent = s.towers[0]!.spent;
    const before = s.oil;
    sellTower(s, 0);
    expect(s.oil - before).toBeCloseTo(spent * 0.6);
    expect(s.towers[0]).toBe(null);
  });
  it("arpão fica bloqueado até a onda certa", () => {
    const s = newState(1);
    s.oil = 1e6;
    expect(buildTower(s, 1, "harpoon")).toBe(false);
    s.maxWave = 3;
    expect(buildTower(s, 1, "harpoon")).toBe(true);
  });
  it("criaturas ficam mais fortes a cada onda", () => {
    expect(enemyHp("eel", 10, 0)).toBeGreaterThan(enemyHp("eel", 9, 0));
    expect(enemyHp("eel", 10, 1)).toBeGreaterThan(enemyHp("eel", 10, 0));
  });
  it("ganho offline é limitado a 8 horas e rende metade", () => {
    const s = newState(1);
    s.producers.whaler = 10;
    s.savedAt = 0;
    const r = offlineEarnings(s, 100 * 3600 * 1000);
    expect(r.seconds).toBe(BALANCE.offlineCapSec);
    expect(r.oil).toBeCloseTo(10 * 0.6 * BALANCE.offlineCapSec * BALANCE.offlineRate);
  });
  it("formatação de números grandes", () => {
    expect(fmt(950)).toBe("950");
    expect(fmt(1250)).toBe("1,3K");
    expect(fmt(3.4e9)).toBe("3,4B");
  });
});

describe("ondas", () => {
  it("composição é determinística e o Kraken aparece a cada 10 ondas", () => {
    expect(waveComposition(5, 7)).toEqual(waveComposition(5, 7));
    expect(waveComposition(5, 10)).toContain("kraken");
    expect(waveComposition(5, 9)).not.toContain("kraken");
    expect(waveComposition(5, 2).every((k) => k === "eel")).toBe(true);
  });
  it("farol apagado recua ondas sem perder melhorias", () => {
    const s = newState(1);
    const rt = newRuntime();
    s.wave = 12;
    s.beam.power = 5;
    s.hp = -1;
    step(s, rt, 0.016);
    expect(s.wave).toBe(12 - BALANCE.retreatWaves);
    expect(s.beam.power).toBe(5);
    expect(s.hp).toBe(beamStats(s.beam).hpMax);
  });
  it("vencer onda avança e dá bônus", () => {
    const s = newState(1);
    const rt = newRuntime();
    rt.phase = "fighting";
    const oil = s.oil;
    step(s, rt, 0.016);
    expect(s.wave).toBe(2);
    expect(s.oil).toBeGreaterThan(oil);
  });
});

describe("reconstrução (prestígio)", () => {
  it("só depois da onda 20; mantém memórias e talentos, zera a corrida", () => {
    const s = newState(1);
    expect(prestige(s)).toBe(null);
    s.maxWave = 30;
    s.oil = 1e6;
    s.beam.power = 40;
    s.talents.wisdom = 2;
    s.memories = 1;
    const gain = prestigeGain(s);
    const r = prestige(s)!;
    expect(r.gained).toBe(gain);
    expect(r.state.memories).toBe(1 + gain);
    expect(r.state.memoriesTotal).toBe(gain);
    expect(r.state.talents.wisdom).toBe(2);
    expect(r.state.beam.power).toBe(0);
    expect(r.state.island).toBe(1);
  });
});

describe("salvamento", () => {
  it("ida e volta preserva o progresso", () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    const s = newState(7);
    s.oil = 1234;
    s.wave = 17;
    s.towers[3] = { kind: "net", level: 4, cd: 0, spent: 900 };
    save(s, store);
    const l = load(store)!;
    expect(l.oil).toBe(1234);
    expect(l.wave).toBe(17);
    expect(l.towers[3]).toEqual({ kind: "net", level: 4, cd: 0, spent: 900 });
  });
  it("save antigo sem campos novos é completado", () => {
    const m = migrate({ seed: 3, oil: 5, beam: { power: 2 } as never });
    expect(m.beam.reach).toBe(0);
    expect(m.towers.length).toBe(8);
    expect(m.talents.prism).toBe(0);
  });
});
