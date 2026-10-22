import { describe, expect, it } from "vitest";
import { BAL } from "../src/data/content";
import { buyNode, computeStats, loadProfile, newProfile, nodeCost } from "../src/game/profile";
import { Run, waveBudget, waveHp } from "../src/game/sim";

const view = { hw: 480, hh: 270 };
const mk = (tut = true) => new Run(computeStats(newProfile()), 42, view, tut);
const steps = (r: Run, sec: number) => {
  for (let i = 0; i < Math.round(sec * 60); i++) r.step(1 / 60);
};

describe("gravidade", () => {
  it("puxa inimigos em direção ao buraco", () => {
    const r = mk();
    r.hole.x = r.hole.tx = 200;
    r.hole.y = r.hole.ty = 0;
    r.setStrong(true);
    const e = r.spawn("wanderer", 260, 0);
    steps(r, 0.5);
    expect(e.x).toBeLessThan(260);
    expect(Math.abs(e.x - 200)).toBeLessThan(60);
  });
  it("antimatéria é repelida", () => {
    const r = mk();
    r.hole.x = r.hole.tx = 200;
    r.hole.y = r.hole.ty = 100;
    r.setStrong(true);
    const e = r.spawn("antimatter", 200, 60);
    e.speed = 0;
    steps(r, 0.4);
    expect(e.y).toBeLessThan(60);
  });
  it("gravidade forte gasta energia e recarrega quando solta", () => {
    const r = mk();
    r.setStrong(true);
    steps(r, 1);
    const low = r.hole.energy;
    expect(low).toBeLessThan(r.st.energyMax);
    r.setStrong(false);
    steps(r, 1);
    expect(r.hole.energy).toBeGreaterThan(low);
  });
  it("horizonte destrói inimigos capturados", () => {
    const r = mk();
    r.hole.x = r.hole.tx = 200;
    r.hole.y = r.hole.ty = 0;
    r.setStrong(true);
    r.spawn("wanderer", 200, 0);
    steps(r, 2);
    expect(r.kills).toBe(1);
    expect(r.frags.length + r.collected).toBeGreaterThan(0);
  });
});

describe("colisões", () => {
  it("batida rápida causa dano de impacto", () => {
    const r = mk();
    r.hole.x = r.hole.tx = -400;
    const a = r.spawn("wanderer", 200, 0);
    const b = r.spawn("wanderer", 240, 0);
    a.vx = 300;
    b.vx = -300;
    a.steer = b.steer = 0;
    steps(r, 0.1);
    expect(r.kills).toBe(2);
    expect(r.impactKills).toBe(2);
  });
  it("batida lenta não causa dano", () => {
    const r = mk();
    r.hole.x = r.hole.tx = -400;
    const a = r.spawn("armored", 200, 0);
    const b = r.spawn("armored", 228, 0);
    a.vx = 10;
    b.vx = -10;
    steps(r, 0.2);
    expect(a.hp).toBe(a.maxHp);
    expect(b.hp).toBe(b.maxHp);
  });
  it("asteroide machuca quem bate nele", () => {
    const r = mk();
    r.hole.x = r.hole.tx = -400;
    const s = r.asteroids[0];
    const e = r.spawn("armored", s.x - 60, s.y);
    e.vx = 400;
    e.vy = 0;
    e.steer = 0;
    steps(r, 0.3);
    expect(e.hp).toBeLessThan(e.maxHp);
  });
  it("inimigo que chega ao núcleo causa dano", () => {
    const r = mk();
    r.hole.x = r.hole.tx = -400;
    r.hole.y = r.hole.ty = 260;
    r.spawn("wanderer", 60, 0);
    steps(r, 2);
    expect(r.core.hp).toBeLessThan(r.core.maxHp);
  });
});

describe("satélites e economia", () => {
  it("comprar, melhorar e vender", () => {
    const r = mk();
    r.fragments = 500;
    expect(r.buy(0, 0, "laser")).toBe(true);
    expect(r.buy(0, 0, "laser")).toBe(false);
    expect(r.buy(0, 1, "collector")).toBe(false); // bloqueado
    const before = r.fragments;
    expect(r.upgrade(0, 0)).toBe(true);
    expect(r.rings[0].slots[0]!.lvl).toBe(2);
    expect(r.fragments).toBeLessThan(before);
    const v = r.sellValue(r.rings[0].slots[0]!);
    const f = r.fragments;
    expect(r.sell(0, 0)).toBe(true);
    expect(r.fragments).toBe(f + v);
    expect(r.buy(2, 0, "laser")).toBe(false); // anel 3 fechado
  });
  it("laser mata quem passa por perto", () => {
    const r = mk();
    r.hole.x = r.hole.tx = -400;
    r.hole.y = r.hole.ty = 260;
    r.fragments = 100;
    r.buy(0, 0, "laser");
    const p = r.slotPos(0, 0);
    r.spawn("drone", p.x * 1.6, p.y * 1.6);
    steps(r, 3);
    expect(r.kills).toBe(1);
  });
  it("mina explode e rearma", () => {
    const r = mk();
    r.hole.x = r.hole.tx = -400;
    r.hole.y = r.hole.ty = 260;
    r.fragments = 100;
    r.buy(1, 0, "mine");
    r.rings[1].spin = 0;
    const p = r.slotPos(1, 0);
    steps(r, 0.6);
    const e = r.spawn("wanderer", p.x, p.y);
    e.speed = 0;
    steps(r, 0.1);
    expect(e.dead).toBe(true);
    expect(r.rings[1].slots[0]!.cd).toBeGreaterThan(0);
  });
  it("combo aumenta o multiplicador", () => {
    const r = mk();
    r.hole.x = r.hole.tx = -400;
    for (let i = 0; i < 4; i++) {
      const e = r.spawn("drone", 200, i * 40 - 60);
      r.hurt(e, 999, "sat", false);
    }
    expect(r.combo).toBe(4);
    expect(r.comboMult()).toBeGreaterThan(1.5);
  });
});

describe("ondas", () => {
  it("orçamento e vida crescem", () => {
    expect(waveBudget(10)).toBeGreaterThan(waveBudget(1));
    expect(waveHp(20)).toBeGreaterThan(waveHp(5));
  });
  it("onda começa sozinha após o intervalo e termina quando todos morrem", () => {
    const r = mk(false);
    steps(r, 3.2);
    expect(r.phase).toBe("wave");
    expect(r.wave).toBe(1);
    for (let i = 0; i < 60 * 60 && r.phase === "wave"; i++) {
      for (const e of r.enemies) r.hurt(e, 9999, "sat", false);
      r.step(1 / 60);
    }
    expect(r.phase).toBe("break");
    expect(r.matter).toBeGreaterThan(0);
  });
  it("leviatã aparece na onda 10", () => {
    const r = mk(false);
    r.wave = 9;
    steps(r, 7);
    expect(r.enemies.some((e) => e.type === "leviathan")).toBe(true);
  });
});

describe("perfil", () => {
  it("compra nós com pré-requisito", () => {
    const p = newProfile();
    p.matter = 1000;
    expect(buyNode(p, "mass")).toBe(false);
    expect(buyNode(p, "root")).toBe(true);
    expect(buyNode(p, "mass")).toBe(true);
    expect(p.matter).toBe(1000 - nodeCost("root", 0) - nodeCost("mass", 0));
    const st = computeStats(p);
    expect(st.grav).toBeGreaterThan(1.2);
  });
  it("carrega saves inválidos sem quebrar", () => {
    expect(loadProfile("lixo").matter).toBe(0);
    const p = loadProfile(JSON.stringify({ matter: 50, nodes: { root: 5, inexistente: 3 } }));
    expect(p.matter).toBe(50);
    expect(p.nodes.root).toBe(1);
    expect(p.nodes.inexistente).toBeUndefined();
  });
  it("terceiro anel e encaixes extras", () => {
    const p = newProfile();
    p.nodes = { root: 1, discount: 1, startFrag: 1, ring3: 1, slots: 2 };
    const st = computeStats(p);
    expect(st.rings).toBe(3);
    const r = new Run(st, 1, view, true);
    expect(r.rings[0].slots.length).toBe(BAL.ringSlots[0] + 2);
  });
});
