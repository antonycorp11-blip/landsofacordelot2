import { describe, expect, it } from "vitest";
import { newRuntime, newState } from "../src/game/state";
import { step } from "../src/game/sim";
import { beamQuote, buildTower, buyBeam, buyProducer, producerQuote, towerQuote, towerUnlocked, upgradeTower } from "../src/game/actions";
import { BEAM_UPGRADES, PRODUCERS, TOWERS, type TowerKind } from "../src/data/content";

/** Jogador guloso: sempre compra a opção mais barata. Garante que o ritmo não trava. */
function playBot(minutes: number) {
  const s = newState(42);
  const rt = newRuntime();
  rt.spawnRadius = 330;
  const plan: TowerKind[] = ["lantern", "harpoon", "harpoon", "net", "lantern", "harpoon", "bell", "harpoon"];
  for (let sec = 0; sec < minutes * 60; sec++) {
    for (let k = 0; k < 10; k++) step(s, rt, 0.1);
    for (let tries = 0; tries < 5; tries++) {
      const opts: { cost: number; buy: () => boolean }[] = [];
      for (const u of BEAM_UPGRADES) {
        const q = beamQuote(s, u.id, 1);
        if (s.beam[u.id] < u.max) opts.push({ cost: q.cost * (u.id === "power" ? 1 : 1.3), buy: () => buyBeam(s, u.id, 1) });
      }
      for (const p of PRODUCERS) opts.push({ cost: producerQuote(s, p.id, 1).cost * 1.5, buy: () => buyProducer(s, p.id, 1) });
      s.towers.forEach((t, i) => {
        if (!t) {
          if (towerUnlocked(s, plan[i])) opts.push({ cost: TOWERS[plan[i]].cost, buy: () => buildTower(s, i, plan[i]) });
        } else opts.push({ cost: towerQuote(s, i, 1).cost * 1.2, buy: () => upgradeTower(s, i, 1) });
      });
      opts.sort((a, b) => a.cost - b.cost);
      if (!opts[0].buy()) break;
    }
  }
  return s;
}

describe("ritmo de progressão", () => {
  it("um jogador simples passa da onda 15 em 20 minutos", () => {
    const s = playBot(20);
    expect(s.maxWave).toBeGreaterThanOrEqual(15);
    expect(s.towers.filter(Boolean).length).toBeGreaterThanOrEqual(4);
  }, 60000);
});
