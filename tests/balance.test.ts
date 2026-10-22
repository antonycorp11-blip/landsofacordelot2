import { describe, expect, it } from "vitest";
import { computeStats, newProfile, type Profile } from "../src/game/profile";
import { Run } from "../src/game/sim";

/** maestro automático: varre a batuta pela nota mais perto da Lyra, respeitando o fôlego */
export function bot(p: Profile, keyIdx: number, seed: number, skill = 1) {
  const r = new Run(computeStats(p), keyIdx, seed, false);
  r.setView(480, 300);
  let phase = 0;
  let rest = 0;
  for (let i = 0; i < 60 * 60 * 15 && r.phase !== "over" && r.phase !== "won"; i++) {
    if (r.pendingLevels) {
      const o = r.openOffer();
      if (o.length) r.choose(o[0]);
      else r.pendingLevels = 0;
    }
    // humano imperfeito: reage em intervalos e descansa quando cansado
    if (r.tired || r.stamina < 12) rest = 0.6;
    rest -= 1 / 60;
    let t = null as null | { x: number; y: number };
    let bd = 1e9;
    for (const e of r.enemies) {
      const d = Math.hypot(e.x, e.y);
      if (d < bd) {
        bd = d;
        t = e;
      }
    }
    const boss = r.enemies.find((e) => e.type === "tritono");
    if (boss && bd > 110) t = boss;
    if (t && rest <= 0 && i % Math.round(3 / skill) === 0) {
      phase += 0.9 * skill;
      r.setCursor(t.x + Math.sin(phase) * 40, t.y + Math.cos(phase * 0.7) * 40, true);
    } else if (rest > 0) r.setCursor(0, -250, false);
    r.step(1 / 60);
    r.events.length = 0;
  }
  return { room: r.room, won: r.phase === "won", notes: Math.round(r.notes), kills: r.kills, chords: r.chords, min: +(r.t / 60).toFixed(1) };
}

describe("equilíbrio", () => {
  it("primeiro concerto: chega a alguns movimentos mas não vence", () => {
    const rs = [1, 2, 3, 4].map((s) => bot(newProfile(), 0, s, 0.6));
    console.log("novato", rs);
    const avg = rs.reduce((a, b) => a + b.room, 0) / rs.length;
    expect(avg).toBeGreaterThanOrEqual(2);
    expect(rs.filter((x) => x.won).length).toBeLessThan(3);
  });
  it("com evolução, vence Dó maior", () => {
    const p = newProfile();
    p.nodes = { root: 1, m_dmg: 8, f_max: 4, f_regen: 3, r_mul: 3, h_dmg: 3, l_hp: 5, p_notes: 3 };
    const rs = [1, 2, 3].map((s) => bot(p, 0, s, 0.6));
    console.log("veterano", rs);
    expect(rs.filter((x) => x.won).length).toBeGreaterThanOrEqual(2);
  });
});
