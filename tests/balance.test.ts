import { describe, expect, it } from "vitest";
import { BOARD } from "../src/data/content";
import { computeStats, newProfile, type Profile } from "../src/game/profile";
import { collectAt, newRun, place, slash, step, type RunState } from "../src/game/run";

/** Jogador simples: geradores atrás, blasters, barreiras; opcionalmente corta o alienígena mais avançado. */
function play(sector: number, p: Profile, slashing: boolean): RunState {
  const r = newRun(sector, computeStats(p), p.loadout);
  const idx = (id: string) => r.cards.findIndex((c) => c.id === id);
  for (let i = 0; i < 60 * 900 && r.status === "playing"; i++) {
    step(r, 1 / 60);
    if (i % 30 === 0) {
      for (const o of r.orbs) collectAt(r, o.x, o.y);
      const gens = r.grid.flat().filter((u) => u?.def.id === "generator").length;
      const threatened = new Set(r.aliens.map((a) => a.row));
      for (let row = 0; row < BOARD.rows; row++) if (threatened.has(row) && !r.grid[row].some((u) => u?.def.id === "blaster")) place(r, idx("blaster"), row, 1);
      for (let row = 0; row < BOARD.rows; row++) {
        if (gens < 6 && !r.grid[row][0]) place(r, idx("generator"), row, 0);
        else if (!r.grid[row][1]) place(r, idx("blaster"), row, 1);
        else if (!r.grid[row][2]) place(r, idx("blaster"), row, 2);
        else if (!r.grid[row][6]) place(r, idx("wall"), row, 6);
        else if (!r.grid[row][3]) place(r, idx("blaster"), row, 3);
      }
    }
    if (slashing && i % 12 === 0) {
      const a = r.aliens.filter((x) => x.x < 1000).sort((q, w) => q.x - w.x)[0];
      if (a) slash(r, a.x - 40, a.y - 60, a.x + 40, a.y);
    }
  }
  return r;
}

describe("curva de dificuldade", () => {
  it("o setor 1 é vencível só posicionando unidades", () => {
    expect(play(1, newProfile(), false).status).toBe("won");
  }, 30000);
  it("o setor 3 exige o corte; o setor 5 exige evoluir na árvore", () => {
    expect(play(3, newProfile(), false).status).toBe("lost");
    expect(play(3, newProfile(), true).status).toBe("won");
    expect(play(5, newProfile(), true).status).toBe("lost");
    const p = newProfile();
    p.nodes = { core: 1, b_dmg: 4, e_dmg: 5, e_hp: 3, c_scrap: 4, c_energy: 3, u_mine: 1, u_double: 1 };
    p.loadout = ["generator", "blaster", "wall", "double"];
    expect(play(5, p, true).status).toBe("won");
  }, 60000);
});
