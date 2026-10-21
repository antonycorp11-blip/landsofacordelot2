import { describe, expect, it } from "vitest";
import { ALIENS, BOARD, RUN, UNITS } from "../src/data/content";
import { buyNode, computeStats, loadProfile, newProfile, nodeCost, saveProfile, toggleLoadout } from "../src/game/profile";
import { buildWave, canPlace, collectAt, finalScrap, hurt, newRun, place, slash, step, tileX, tileY, BASE_X, type RunState } from "../src/game/run";

const fresh = () => {
  const p = newProfile();
  return newRun(1, computeStats(p), p.loadout);
};

function addAlien(r: RunState, id: keyof typeof ALIENS, row: number, x: number) {
  const def = ALIENS[id];
  r.aliens.push({ id: r.nextId++, def, row, x, y: tileY(row), hp: def.hp, maxHp: def.hp, shell: def.shell ?? 0, maxShell: def.shell ?? 0, slowT: 0, burnT: 0, burnDps: 0, biting: false, jumped: false, jumpT: 0, spitCd: 1, hitFlash: 0, slashCd: 0, anim: 0, boss: false, dead: false, scale: 1 });
  return r.aliens[r.aliens.length - 1];
}

describe("posicionamento", () => {
  it("custa energia, ocupa a casa e põe a carta em recarga", () => {
    const r = fresh();
    const e = r.energy;
    expect(place(r, 0, 2, 0)).toBe(true);
    expect(r.energy).toBe(e - UNITS.generator.cost);
    expect(r.grid[2][0]?.def.id).toBe("generator");
    expect(r.cards[0].cd).toBeGreaterThan(0);
    expect(canPlace(r, 0, 2, 1)).toBe(false); // em recarga
    r.cards[0].cd = 0;
    expect(canPlace(r, 0, 2, 0)).toBe(false); // ocupada
    expect(canPlace(r, 0, 9, 0)).toBe(false); // fora do tabuleiro
  });
  it("sem energia não posiciona", () => {
    const r = fresh();
    r.energy = 10;
    expect(place(r, 1, 0, 0)).toBe(false);
  });
});

describe("combate", () => {
  it("blaster atira na própria fileira e mata", () => {
    const r = fresh();
    r.prep = 999;
    r.energy = 1000;
    place(r, 1, 1, 1);
    const a = addAlien(r, "crawler", 1, 700);
    for (let i = 0; i < 60 * 25 && !a.dead; i++) step(r, 1 / 60);
    expect(a.dead).toBe(true);
    expect(r.scrap).toBeGreaterThan(0);
  });
  it("blaster ignora outras fileiras", () => {
    const r = fresh();
    r.prep = 999;
    r.energy = 1000;
    place(r, 1, 1, 1);
    const a = addAlien(r, "crawler", 3, 1100);
    for (let i = 0; i < 60 * 3; i++) step(r, 1 / 60);
    expect(a.hp).toBe(a.maxHp);
  });
  it("carapaça absorve antes da vida", () => {
    const r = fresh();
    const a = addAlien(r, "armored", 0, 800);
    hurt(r, a, 100);
    expect(a.hp).toBe(a.maxHp);
    expect(a.shell).toBe(a.maxShell - 100);
  });
  it("alienígena morde e destrói a unidade à frente", () => {
    const r = fresh();
    r.prep = 999;
    r.cards[2].cd = 0;
    place(r, 2, 0, 3); // barreira
    const wall = r.grid[0][3]!;
    addAlien(r, "crawler", 0, wall.x + 40);
    step(r, 1);
    expect(wall.hp).toBeLessThan(wall.maxHp);
  });
});

describe("base e drones", () => {
  it("o drone da fileira salva a primeira invasão; a segunda tira integridade", () => {
    const r = fresh();
    r.prep = 999;
    addAlien(r, "runner", 2, BASE_X + 5);
    step(r, 1 / 60);
    expect(r.drones[2].state).toBe("running");
    expect(r.baseHp).toBe(r.stats.baseHp);
    for (let i = 0; i < 60 * 3; i++) step(r, 1 / 60);
    expect(r.drones[2].state).toBe("used");
    addAlien(r, "runner", 2, BASE_X + 5);
    step(r, 1 / 60);
    expect(r.baseHp).toBe(r.stats.baseHp - 1);
  });
  it("integridade zero encerra a missão", () => {
    const r = fresh();
    r.prep = 999;
    r.baseHp = 1;
    r.drones[0].state = "used";
    addAlien(r, "runner", 0, BASE_X + 5);
    step(r, 1 / 60);
    expect(r.status).toBe("lost");
  });
});

describe("corte com o cursor", () => {
  it("fere quem o traço atravessa e aquece a lâmina", () => {
    const r = fresh();
    const a = addAlien(r, "crawler", 2, 600);
    const n = slash(r, a.x - 50, a.y - 30, a.x + 50, a.y - 30);
    expect(n).toBe(1);
    expect(a.hp).toBeLessThan(a.maxHp);
    expect(r.heat).toBeGreaterThan(0);
  });
  it("superaquece e para de cortar até esfriar", () => {
    const r = fresh();
    for (let k = 0; k < 30; k++) {
      const a = addAlien(r, "colossus", 2, 600);
      slash(r, a.x - 80, a.y - 50, a.x + 80, a.y - 50);
    }
    expect(r.overheated).toBe(true);
    const a = addAlien(r, "crawler", 3, 500);
    expect(slash(r, a.x - 50, a.y - 30, a.x + 50, a.y - 30)).toBe(0);
    r.prep = 999;
    for (let i = 0; i < 60 * 6; i++) step(r, 1 / 60);
    expect(r.overheated).toBe(false);
  });
  it("o traço também coleta células de energia", () => {
    const r = fresh();
    r.orbs.push({ id: 99, x: 500, y: 300, groundY: 300, vy: 0, value: 25, life: 5, age: 0, collected: false });
    const e = r.energy;
    slash(r, 450, 300, 550, 300);
    expect(r.energy).toBe(e + 25);
    expect(collectAt(r, 500, 300)).toBe(false);
  });
});

describe("ondas", () => {
  it("composição determinística, chefe na onda final, começo calmo", () => {
    expect(buildWave(2, 4, 8, 1)).toEqual(buildWave(2, 4, 8, 1));
    expect(buildWave(1, 8, 8, 1).some((x) => x.boss && x.alien === "colossus")).toBe(true);
    expect(buildWave(1, 1, 8, 1).every((x) => x.alien === "crawler")).toBe(true);
    expect(buildWave(3, 6, 8, 1).length).toBeGreaterThan(buildWave(1, 6, 8, 1).length);
  });
  it("todas as fileiras recebem alienígenas válidas", () => {
    for (const s of buildWave(4, 7, 8, 3)) expect(s.row).toBeGreaterThanOrEqual(0), expect(s.row).toBeLessThan(BOARD.rows);
  });
  it("vencer a missão rende bônus de vitória", () => {
    const r = fresh();
    r.status = "won";
    r.wavesCleared = 8;
    const first = finalScrap(r, true);
    const again = finalScrap(r, false);
    expect(first.total).toBeGreaterThan(again.total);
    expect(first.waves).toBeGreaterThan(0);
  });
});

describe("árvore e arsenal", () => {
  it("nó exige pré-requisito e sucata", () => {
    const p = newProfile();
    p.scrap = 1e6;
    expect(buyNode(p, "b_cool")).toBe(false);
    expect(buyNode(p, "b_dmg")).toBe(true);
    expect(buyNode(p, "b_cool")).toBe(true);
    p.scrap = 0;
    expect(buyNode(p, "b_dmg")).toBe(false);
  });
  it("custos crescem por nível e efeitos entram nos atributos", () => {
    expect(nodeCost("e_dmg", 3)).toBeGreaterThan(nodeCost("e_dmg", 0));
    const p = newProfile();
    p.nodes.e_dmg = 4;
    p.nodes.c_energy = 2;
    const st = computeStats(p);
    expect(st.unitDmg).toBeCloseTo(1.6);
    expect(st.startEnergy).toBe(RUN.startEnergy + 50);
  });
  it("liberar unidade a coloca no arsenal; o limite de baias é respeitado", () => {
    const p = newProfile();
    p.scrap = 1e6;
    buyNode(p, "e_dmg");
    buyNode(p, "u_mine");
    expect(p.loadout).toContain("mine");
    buyNode(p, "u_double");
    expect(p.loadout.length).toBe(4);
    buyNode(p, "u_cryo");
    expect(p.loadout).not.toContain("cryo");
    expect(toggleLoadout(p, "cryo")).toBe(false);
    expect(toggleLoadout(p, "wall")).toBe(true);
    expect(toggleLoadout(p, "cryo")).toBe(true);
    expect(toggleLoadout(p, "laser")).toBe(false);
  });
  it("salvar e carregar preserva o progresso", () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    const p = newProfile();
    p.scrap = 321;
    p.nodes.b_dmg = 3;
    p.sectorUnlocked = 4;
    saveProfile(p, store);
    const l = loadProfile(store);
    expect(l.scrap).toBe(321);
    expect(l.nodes.b_dmg).toBe(3);
    expect(l.sectorUnlocked).toBe(4);
  });
});

void tileX;
