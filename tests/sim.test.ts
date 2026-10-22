import { describe, expect, it } from "vitest";
import { KEYS, chordName, degreeNote } from "../src/data/content";
import { buyNode, computeStats, level, loadProfile, newProfile, nodeVisible } from "../src/game/profile";
import { Run, groundX, groundY, inPoly, isoU, isoV } from "../src/game/sim";

const mk = (p = newProfile()) => new Run(computeStats(p), 0, 7);
/** arrasta o cursor rápido de (u1,v1) até (u2,v2) */
const swipe = (r: Run, u1: number, v1: number, u2: number, v2: number, n = 6) => {
  r.setCursor(u1, v1, true);
  r.step(1 / 60);
  for (let i = 1; i <= n; i++) {
    r.setCursor(u1 + ((u2 - u1) * i) / n, v1 + ((v2 - v1) * i) / n, true);
    r.step(1 / 60);
  }
  r.setCursor(u2, v2, false);
  r.step(1 / 60);
};
const at = (r: Run, x: number, y: number) => ({ u: isoU(x, y), v: isoV(x, y) - 6 });

describe("projeção e teoria", () => {
  it("iso ida e volta", () => {
    const u = isoU(40, 70);
    const v = isoV(40, 70);
    expect(groundX(u, v)).toBeCloseTo(40);
    expect(groundY(u, v)).toBeCloseTo(70);
  });
  it("notas e acordes", () => {
    expect(degreeNote(KEYS[0], 4)).toBe("Sol");
    expect(chordName(KEYS[1], { id: "I", roman: "I", degs: [0, 2, 4], quality: "maior" })).toBe("Sol maior");
  });
  it("ponto dentro de polígono", () => {
    const sq: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    expect(inPoly(5, 5, sq)).toBe(true);
    expect(inPoly(15, 5, sq)).toBe(false);
  });
});

describe("corte", () => {
  it("passar rápido corta e gasta vigor; devagar não corta", () => {
    const r = mk();
    const m = r.spawnAt("desafinado", 0, r.tito.x + 60, r.tito.y);
    m.age = 1;
    const p = at(r, m.x, m.y);
    const v0 = r.vigor;
    // devagar
    r.setCursor(p.u - 20, p.v, true);
    for (let i = 0; i < 40; i++) {
      r.setCursor(p.u - 20 + i, p.v, true);
      r.step(1 / 60);
    }
    expect(m.hp).toBe(m.maxHp);
    swipe(r, p.u - 40, p.v, p.u + 40, p.v);
    expect(m.hp).toBeLessThan(m.maxHp);
    expect(r.vigor).toBeLessThan(v0);
  });
  it("armadura quebra antes da vida", () => {
    const r = mk();
    const m = r.spawnAt("cavaleiro", 0, r.tito.x + 60, r.tito.y);
    let broke = false;
    for (let k = 0; k < 30 && !broke; k++) {
      const p = at(r, m.x, m.y);
      swipe(r, p.u - 40, p.v - 4, p.u + 40, p.v - 4);
      r.step(0.35);
      broke = m.broken;
      if (!broke) expect(m.hp).toBe(m.maxHp);
    }
    expect(broke).toBe(true);
  });
  it("um traço por três notas do acorde I dispara o acorde", () => {
    const r = mk();
    const ms = [0, 2, 4].map((d, i) => r.spawnAt("cavaleiro", d, r.tito.x + 40 + i * 14, r.tito.y - 40 - i * 14));
    const a = at(r, ms[0].x, ms[0].y);
    const b = at(r, ms[2].x, ms[2].y);
    swipe(r, a.u - 20, a.v - 4, b.u + 20, b.v - 4, 10);
    expect(r.chords).toBe(1);
  });
  it("acertos múltiplos geram o evento", () => {
    const r = mk();
    const ms = [1, 3].map((d, i) => r.spawnAt("cavaleiro", d, r.tito.x + 50 + i * 16, r.tito.y - 50 - i * 16));
    const a = at(r, ms[0].x, ms[0].y);
    const b = at(r, ms[1].x, ms[1].y);
    swipe(r, a.u - 20, a.v - 4, b.u + 20, b.v - 4, 10);
    expect(r.events.some((e) => e.k === "acertos" && e.n === 2)).toBe(true);
  });
  it("sem vigor não corta", () => {
    const r = mk();
    const m = r.spawnAt("desafinado", 0, r.tito.x + 60, r.tito.y);
    r.vigor = 1;
    const p = at(r, m.x, m.y);
    swipe(r, p.u - 40, p.v, p.u + 40, p.v);
    expect(m.hp).toBe(m.maxHp);
    expect(r.tired).toBe(true);
  });
});

/** coloca o Tito numa sala de luta já começada */
const toFight = (r: Run) => {
  r.tito.x = r.exitDoor()!.x;
  r.tito.y = r.exitDoor()!.y;
  for (let i = 0; i < 60 * 6 && r.phase !== "fight"; i++) r.step(1 / 60);
};

describe("masmorra", () => {
  it("começa num salão de exploração; salões e lutas alternam; chefe no fim", () => {
    const r = mk();
    expect(r.rooms.length).toBe(12);
    expect(r.rooms[0].kind).toBe("hall");
    expect(r.rooms[1].kind).toBe("fight");
    expect(r.rooms[10].kind).toBe("hall");
    expect(r.rooms[11].kind).toBe("boss");
    expect(r.phase).toBe("explore");
    expect(r.rooms[0].props.length).toBeGreaterThan(5);
  });
  it("andar até a porta leva para a sala de luta; limpar a luta abre a porta", () => {
    const r = mk();
    toFight(r);
    expect(r.phase).toBe("fight");
    expect(r.roomI).toBe(1);
    r.spawnLeft = 0;
    r.monsters = [];
    r.step(1 / 60);
    expect(r.exp).toBeGreaterThan(0);
  });
  it("na sala de luta o Tito fica parado no centro", () => {
    const r = mk();
    toFight(r);
    const R = r.room;
    expect(Math.hypot(r.tito.x - R.x0 - 130, r.tito.y - R.y0 - 130)).toBeLessThan(2);
    const x0 = r.tito.x;
    r.moveTo(r.tito.x + 60, r.tito.y);
    r.moveDir(1, 0);
    for (let i = 0; i < 60; i++) r.step(1 / 60);
    expect(r.tito.x).toBe(x0);
  });
  it("limpar a luta leva o Tito sozinho para a próxima antessala", () => {
    const r = mk();
    toFight(r);
    r.spawnLeft = 0;
    r.monsters = [];
    for (let i = 0; i < 60 * 8 && r.roomI === 1; i++) r.step(1 / 60);
    expect(r.roomI).toBe(2);
    expect(r.room.kind).toBe("hall");
  });
  it("páginas do diário ficam nas antessalas", () => {
    const r = new Run(computeStats(newProfile()), 0, 7, [], ["a", "b", "c", "d"]);
    const scrolls = r.rooms.filter((x) => x.scroll).map((x) => x.kind);
    expect(scrolls.length).toBe(4);
    expect(scrolls.every((k) => k === "hall")).toBe(true);
    expect(r.rooms[10].scroll?.text).toBe("d");
  });
  it("clicar no chão faz o Tito andar", () => {
    const r = mk();
    const x0 = r.tito.x;
    r.moveTo(r.tito.x + 50, r.tito.y);
    for (let i = 0; i < 60; i++) r.step(1 / 60);
    expect(r.tito.x).toBeGreaterThan(x0 + 30);
  });
  it("a batuta quebra objetos, que soltam itens para o Tito pegar", () => {
    const r = mk();
    const p = r.room.props[0];
    const hp = p.hp;
    for (let k = 0; k < hp; k++) {
      const u = isoU(p.x, p.y);
      const v = isoV(p.x, p.y) - 6;
      swipe(r, u - 30, v, u + 30, v);
      r.step(0.3);
    }
    expect(r.room.props.includes(p)).toBe(false);
    expect(r.pickups.length).toBeGreaterThan(0);
    const pk = r.pickups[0];
    r.moveTo(pk.x, pk.y);
    const n0 = r.notas + r.cristais;
    for (let i = 0; i < 60 * 4; i++) r.step(1 / 60);
    expect(r.notas + r.cristais + (r.tito.hp > 0 ? 0 : 0)).toBeGreaterThanOrEqual(n0);
  });
  it("baú musical abre quando os cadeados são cortados num traço só", () => {
    const r = mk();
    const room = r.rooms.find((x) => x.chest)!;
    r.roomI = r.rooms.indexOf(room);
    const c = room.chest!;
    const pts = c.lit.map((_, i) => r.lockPos(c, i));
    r.setCursor(pts[0].u - 20, pts[0].v, true);
    r.step(1 / 60);
    for (const p of pts) for (let k = 1; k <= 3; k++) {
      r.setCursor(p.u - 6 + k * 4, p.v, true);
      r.step(1 / 60);
    }
    r.setCursor(pts[pts.length - 1].u + 30, pts[pts.length - 1].v, true);
    r.step(1 / 60);
    expect(c.open).toBe(true);
  });
  it("habilidades: Rufar faz todo corte contar no tempo", () => {
    const r = mk();
    expect(r.useSkill("rufar")).toBe(true);
    expect(r.onBeat()).toBe(true);
    expect(r.useSkill("rufar")).toBe(false);
    expect(r.useSkill("forte")).toBe(false); // não liberada
  });
  it("monstros batem no Tito no ritmo", () => {
    const r = mk();
    toFight(r);
    r.spawnAt("desafinado", 0, r.tito.x + 8, r.tito.y);
    for (let i = 0; i < 60 * 3; i++) r.step(1 / 60);
    expect(r.tito.hp).toBeLessThan(r.tito.maxHp);
  });
  it("vencer o chefe termina a masmorra", () => {
    const r = mk();
    r.roomI = 11;
    r.tito.x = r.rooms[11].x0 + 130;
    r.tito.y = r.rooms[11].y0 + 130;
    r.phase = "fight";
    r.spawnLeft = 0;
    r.monsters = [];
    const b = r.spawnAt("maestro", -1, r.tito.x + 50, r.tito.y);
    b.armor = 0;
    b.hp = 0.5;
    const p = { u: isoU(b.x, b.y), v: isoV(b.x, b.y) - 18 };
    swipe(r, p.u - 40, p.v, p.u + 40, p.v);
    r.step(1 / 60);
    expect(r.partituras).toBeGreaterThan(0);
    expect(r.phase).toBe("won");
  });
});

describe("perfil", () => {
  it("árvore se revela a partir dos nós comprados", () => {
    const p = newProfile();
    expect(nodeVisible(p, "fio")).toBe(true);
    expect(nodeVisible(p, "acertos")).toBe(false);
    p.notas = 100;
    expect(buyNode(p, "fio")).toBe(true);
    expect(nodeVisible(p, "acertos")).toBe(true);
  });
  it("custo em cristais", () => {
    const p = newProfile();
    p.nodes = { corte: 1, fio: 1, quebra: 1 };
    p.notas = 999;
    expect(buyNode(p, "execucao")).toBe(false);
    p.cristais = 2;
    expect(buyNode(p, "execucao")).toBe(true);
    expect(computeStats(p).execute).toBeGreaterThan(0);
  });
  it("níveis por EXP", () => {
    expect(level(0).lvl).toBe(1);
    expect(level(50).lvl).toBe(2);
  });
  it("save inválido", () => {
    expect(loadProfile("{").nodes.corte).toBe(1);
    const p = loadProfile(JSON.stringify({ notas: 5, nodes: { fio: 99, xx: 1 }, unlocked: 50 }));
    expect(p.nodes.fio).toBe(20);
    expect(p.nodes.xx).toBeUndefined();
    expect(p.unlocked).toBe(4);
  });
});
