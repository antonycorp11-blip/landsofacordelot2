import { describe, expect, it } from "vitest";
import { MONSTERS } from "../src/data/content";
import { computeStats, newProfile, type Profile } from "../src/game/profile";
import { Run, isoU, isoV } from "../src/game/sim";

/** jogador automático: risca o cursor pelo monstro mais perto do Tito, descansa quando cansa */
export function bot(p: Profile, dIdx: number, seed: number, skill = 0.6) {
  const r = new Run(computeStats(p), dIdx, seed);
  let ph = 0;
  let rest = 0;
  for (let i = 0; i < 60 * 60 * 12 && r.phase !== "won" && r.phase !== "over"; i++) {
    if (r.tired || r.vigor < 8) rest = 0.7;
    rest -= 1 / 60;
    const T = r.tito;
    let t = null as null | (typeof r.monsters)[0];
    let bd = 1e9;
    for (const m of r.monsters) {
      const d = Math.hypot(m.x - T.x, m.y - T.y);
      if (d < bd) {
        bd = d;
        t = m;
      }
    }
    if (t && rest <= 0 && Math.random() < skill) {
      ph += 0.5;
      const u = isoU(t.x, t.y);
      const v = isoV(t.x, t.y) - MONSTERS[t.type].body * 0.6;
      r.setCursor(u + Math.sin(ph) * 32, v + Math.cos(ph * 1.3) * 14, true);
    } else if (rest > 0) r.setCursor(r.cursor.u, r.cursor.v, false);
    r.step(1 / 60);
    r.events.length = 0;
  }
  return { room: r.roomI, won: r.phase === "won", notas: Math.round(r.notas), cristais: r.cristais, exp: Math.round(r.exp), kills: r.kills, min: +(r.t / 60).toFixed(1) };
}

describe("equilíbrio", () => {
  it("primeira masmorra: o novato chega a algumas salas mas não vence", () => {
    const rs = [1, 2, 3, 4].map((s) => bot(newProfile(), 0, s));
    console.log("novato", rs);
    expect(rs.reduce((a, b) => a + b.room, 0) / rs.length).toBeGreaterThanOrEqual(1);
    expect(rs.filter((x) => x.won).length).toBeLessThanOrEqual(1);
  });
  it("com melhorias, vence o Porão do Teatro", () => {
    const p = newProfile();
    p.nodes = { corte: 1, fio: 8, vigor: 4, folego: 3, tambor: 5, tempo: 3, acorde: 2, quebra: 3, gorjeta: 2 };
    const rs = [1, 2, 3].map((s) => bot(p, 0, s));
    console.log("veterano", rs);
    expect(rs.filter((x) => x.won).length).toBeGreaterThanOrEqual(2);
  });
});
