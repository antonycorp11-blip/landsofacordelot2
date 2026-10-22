import { describe, expect, it } from "vitest";
import type { SatId } from "../src/data/content";
import { computeStats, newProfile, type Profile } from "../src/game/profile";
import { Run } from "../src/game/sim";

const view = { hw: 480, hh: 270 };

/** jogador automático simples: fica entre o núcleo e a ameaça mais próxima, puxa, constrói */
export function bot(p: Profile, seed: number, play = true, maxMin = 25) {
  const r = new Run(computeStats(p), seed, view, false);
  const order: SatId[] = ["laser", "mine", "laser", "cannon", "deflector", "mine", "stasis", "laser", "collector"];
  let k = 0;
  for (let i = 0; i < 60 * 60 * maxMin && !r.over; i++) {
    if (play && i % 6 === 0) {
      let best = null as null | { x: number; y: number };
      let bd = 1e9;
      for (const e of r.enemies) {
        if (e.type === "antimatter") continue;
        const d = Math.hypot(e.x, e.y);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      if (best && bd < 320) {
        r.setTarget(best.x, best.y);
        r.setStrong(r.hole.energy > 25);
      } else {
        r.setTarget(Math.cos(r.t) * 60, -230);
        r.setStrong(false);
      }
      if (best && bd < 90) r.pulse();
      // gasta fragmentos
      const t = order[k % order.length];
      if (r.st.unlocked.includes(t)) {
        let placed = false;
        for (let ri = 0; ri < r.st.rings && !placed; ri++)
          for (let s = 0; s < r.rings[ri].slots.length && !placed; s++)
            if (!r.rings[ri].slots[s] && r.fragments >= r.buyCost(t)) placed = r.buy(ri, s, t);
        if (placed) k++;
        else
          for (let ri = 0; ri < r.st.rings; ri++)
            for (let s = 0; s < r.rings[ri].slots.length; s++) {
              const sat = r.rings[ri].slots[s];
              if (sat && r.fragments > r.upgradeCost(sat) * 1.5) r.upgrade(ri, s);
            }
      } else k++;
    }
    r.step(1 / 60);
    r.events.length = 0;
  }
  return { wave: r.wave, matter: Math.round(r.matter), kills: r.kills, impacts: r.impactKills, min: Math.round(r.t / 60) };
}

describe("equilíbrio", () => {
  it("sem jogar, o núcleo cai cedo", () => {
    const res = bot(newProfile(), 3, false);
    console.log("parado", res);
    expect(res.wave).toBeLessThan(6);
  });
  it("jogando, a primeira partida vai a algumas ondas e rende matéria", () => {
    const rs = [1, 2, 3].map((s) => bot(newProfile(), s));
    console.log("novato", rs);
    const avg = rs.reduce((a, b) => a + b.wave, 0) / rs.length;
    expect(avg).toBeGreaterThan(4);
    expect(avg).toBeLessThan(25);
  });
  it("com evolução, vai mais longe", () => {
    const p = newProfile();
    p.nodes = { root: 1, mass: 5, impact: 5, hp: 5, satDmg: 5, discount: 2, u_cannon: 1, u_deflector: 1, energy: 2, startFrag: 2, fragVal: 3 };
    const rs = [1, 2, 3].map((s) => bot(p, s));
    console.log("veterano", rs);
    const fresh = [1, 2, 3].map((s) => bot(newProfile(), s));
    const a = rs.reduce((x, y) => x + y.wave, 0);
    const b = fresh.reduce((x, y) => x + y.wave, 0);
    expect(a).toBeGreaterThan(b);
  });
});
