import { describe, expect, it } from "vitest";
import { CHORDS, KEYS, chordName, degreeMidi, degreeNote } from "../src/data/content";
import { buyNode, computeStats, loadProfile, newProfile, nodeCost } from "../src/game/profile";
import { Run, segDist } from "../src/game/sim";

const mk = (tut = true, p = newProfile()) => {
  const r = new Run(computeStats(p), 0, 42, tut);
  r.setView(480, 300);
  return r;
};
const steps = (r: Run, sec: number) => {
  for (let i = 0; i < Math.round(sec * 60); i++) r.step(1 / 60);
};
/** arrasta a batuta de (x1,y1) até (x2,y2) em n passos */
const swipe = (r: Run, x1: number, y1: number, x2: number, y2: number, n = 6) => {
  r.setCursor(x1, y1, true);
  r.step(1 / 60);
  for (let i = 1; i <= n; i++) {
    r.setCursor(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, true);
    r.step(1 / 60);
  }
  r.setCursor(x2, y2, false);
};

describe("teoria", () => {
  it("nomes e alturas das notas", () => {
    expect(degreeNote(KEYS[0], 0)).toBe("Dó");
    expect(degreeNote(KEYS[0], 4)).toBe("Sol");
    expect(degreeNote(KEYS[1], 6)).toBe("Fá♯");
    expect(degreeMidi(KEYS[0], 2)).toBe(64);
    expect(chordName(KEYS[0], CHORDS[2])).toBe("Sol maior");
    expect(chordName(KEYS[0], CHORDS.find((c) => c.id === "vi")!)).toBe("Lá menor");
  });
  it("distância ponto-segmento", () => {
    expect(segDist(0, 5, -10, 0, 10, 0)).toBeCloseTo(5);
    expect(segDist(20, 0, -10, 0, 10, 0)).toBeCloseTo(10);
  });
});

describe("batuta", () => {
  it("corta inimigos no caminho e gasta fôlego", () => {
    const r = mk();
    const e = r.spawn("seminima", 0, 100, 0);
    const before = r.stamina;
    swipe(r, 100, -60, 100, 60);
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(r.stamina).toBeLessThan(before);
  });
  it("sem fôlego não corta", () => {
    const r = mk();
    const e = r.spawn("semibreve", 0, 150, 0);
    r.stamina = 1;
    swipe(r, 150, -60, 150, 60);
    expect(e.hp).toBe(e.maxHp);
    expect(r.tired).toBe(true);
  });
  it("cortar Dó, Mi e Sol num traço forma o acorde I", () => {
    const r = mk();
    for (const [i, d] of [0, 2, 4].entries()) r.spawn("semibreve", d, 100 + i * 40, 100);
    swipe(r, 60, 100, 220, 100, 8);
    expect(r.chords).toBe(1);
  });
  it("notas espalhadas em traços separados não formam acorde", () => {
    const r = mk();
    r.spawn("semibreve", 0, 100, 100);
    r.spawn("semibreve", 2, -100, -100);
    swipe(r, 60, 100, 140, 100);
    steps(r, 1);
    swipe(r, -140, -100, -60, -100);
    expect(r.chords).toBe(0);
  });
  it("a pausa só pode ser cortada entre os tempos", () => {
    const r = mk();
    const e = r.spawn("pausa", 0, 150, 0);
    r.beatT = 0.01;
    expect(r.intangible(e)).toBe(true);
    r.beatT = r.period * 0.7;
    expect(r.intangible(e)).toBe(false);
  });
});

describe("partida", () => {
  it("inimigos chegam à Lyra e causam dano no ritmo", () => {
    const r = mk(false);
    r.phase = "fight";
    r.spawnQ = [];
    r.spawn("seminima", 0, 40, 0);
    steps(r, 4);
    expect(r.lyra.hp).toBeLessThan(r.lyra.maxHp);
  });
  it("movimento acaba quando todos morrem e o próximo começa", () => {
    const r = mk(false);
    for (let i = 0; i < 60 * 80 && r.room === 1; i++) {
      r.enemies.forEach((e) => (e.hp = 0.0001));
      r.stamina = r.staminaMax;
      for (const e of [...r.enemies]) swipe(r, e.x, e.y - 40, e.x, e.y + 40, 2);
      r.step(1 / 60);
      r.lyra.hp = r.lyra.maxHp;
    }
    expect(r.room).toBe(2);
    expect(r.notes).toBeGreaterThan(0);
  });
  it("subir de nível oferece motivos e aplica a escolha", () => {
    const r = mk(false);
    r.gainXp(r.xpNext);
    expect(r.pendingLevels).toBe(1);
    const o = r.openOffer();
    expect(o.length).toBe(3);
    r.choose(o[0]);
    expect(r.pendingLevels).toBe(0);
    expect(r.m(o[0])).toBe(1);
  });
  it("motivos de repertório só aparecem depois de liberados", () => {
    const st = computeStats(newProfile());
    expect(st.motifPool).not.toContain("staccato");
    const p = newProfile();
    p.nodes = { root: 1, r_mul: 1, r_window: 1, r_stacc: 1 };
    expect(computeStats(p).motifPool).toContain("staccato");
  });
  it("matar o trítono vence o concerto", () => {
    const r = mk(false);
    r.room = 5;
    r.phase = "fight";
    r.spawnQ = [];
    const b = r.spawn("tritono", -1, 200, 0);
    r.spawn("seminima", 1, -200, 0);
    b.hp = 1;
    swipe(r, 200, -80, 200, 80, 4);
    steps(r, 0.1);
    expect(r.phase).toBe("won");
    expect(r.scores).toBeGreaterThan(0);
  });
});

describe("perfil", () => {
  it("compra nós em ordem e cobra notas", () => {
    const p = newProfile();
    p.notes = 1000;
    expect(buyNode(p, "m_dmg")).toBe(false);
    expect(buyNode(p, "root")).toBe(true);
    expect(buyNode(p, "m_dmg")).toBe(true);
    expect(p.notes).toBe(1000 - nodeCost("root", 0) - nodeCost("m_dmg", 0));
  });
  it("nós de partitura e de tonalidade", () => {
    const p = newProfile();
    p.notes = 9999;
    p.nodes = { root: 1, h_dmg: 1, h_radius: 1, h_coral: 1 };
    expect(buyNode(p, "h_v7")).toBe(false); // exige Sol maior
    p.keyUnlocked = 1;
    expect(buyNode(p, "h_v7")).toBe(false); // exige partituras
    p.scores = 5;
    expect(buyNode(p, "h_v7")).toBe(true);
    expect(computeStats(p).chords.some((c) => c.id === "V7")).toBe(true);
  });
  it("carrega saves inválidos", () => {
    expect(loadProfile("{lixo").notes).toBe(0);
    const p = loadProfile(JSON.stringify({ notes: 30, nodes: { root: 9, nada: 1 }, keyUnlocked: 99 }));
    expect(p.nodes.root).toBe(1);
    expect(p.nodes.nada).toBeUndefined();
    expect(p.keyUnlocked).toBe(KEYS.length - 1);
  });
});
