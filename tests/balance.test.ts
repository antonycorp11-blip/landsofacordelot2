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
    if (r.phase === "explore" || r.phase === "transit") {
      const d = r.exitDoor();
      if (d) r.moveTo(d.x, d.y);
      r.step(1 / 60);
      r.events.length = 0;
      continue;
    }
    for (const k of r.st.skills) if (r.monsters.length > 3) r.useSkill(k);
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
  return { room: r.fightNo, won: r.phase === "won", notas: Math.round(r.notas), cristais: r.cristais, exp: Math.round(r.exp), kills: r.kills, min: +(r.t / 60).toFixed(1) };
}

describe("equilíbrio", () => {
  it("primeira masmorra: o novato chega a algumas salas mas não vence", () => {
    const rs = [1, 2, 3, 4].map((s) => bot(newProfile(), 0, s));
    console.log("novato", rs);
    expect(rs.reduce((a, b) => a + b.room, 0) / rs.length).toBeGreaterThanOrEqual(1.5);
    expect(rs.filter((x) => x.won).length).toBe(0);
  });
  it("segunda masmorra exige bem mais evolução", () => {
    const p = newProfile();
    p.nodes = { corte: 1, fio: 12, vigor: 6, folego: 5, tambor: 7, tempo: 5, acorde: 4, quebra: 5, gorjeta: 3, rastro: 4, rufar2: 2 };
    const rs = [1, 2, 3].map((s) => bot(p, 1, s));
    console.log("sol maior", rs);
    expect(rs.filter((x) => x.won).length).toBe(0);
  });
  it("com melhorias, vence o Porão do Teatro", () => {
    const p = newProfile();
    p.nodes = { corte: 1, fio: 12, vigor: 6, folego: 5, tambor: 7, tempo: 5, acorde: 4, quebra: 5, gorjeta: 3, rastro: 4, rufar2: 2 };
    const rs = [1, 2, 3].map((s) => bot(p, 0, s));
    console.log("veterano", rs);
    expect(rs.filter((x) => x.won).length).toBeGreaterThanOrEqual(2);
  });
});
