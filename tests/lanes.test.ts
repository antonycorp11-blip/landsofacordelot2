import { describe, expect, it } from "vitest";
import { planLanes, planTurn } from "../src/systems/LanePlanner";
import { FieldGrid, ST, applyWork } from "../src/systems/FieldSystem";

describe("planejamento de faixas", () => {
  const poly = [
    { x: 0, y: 0 },
    { x: 60, y: 2 },
    { x: 58, y: 40 },
    { x: 1, y: 38 },
  ];
  it("faixas cobrem todo o campo com a largura de trabalho", () => {
    const f = new FieldGrid({ id: 1, name: "T", poly, owner: "player", price: 0, gate: { x: 0, y: 0 } });
    f.fill(ST.Stubble);
    const W = 3;
    const plan = planLanes(poly, { width: W, workOffset: 0 });
    expect(plan.lanes.length).toBeGreaterThanOrEqual(Math.ceil(38 / W));
    for (const l of plan.lanes) {
      const dx = Math.cos(l.heading);
      const dy = Math.sin(l.heading);
      const nx = -dy * (W / 2);
      const ny = dx * (W / 2);
      applyWork(f, "cultivate", [
        { x: l.start.x + nx, y: l.start.y + ny },
        { x: l.start.x - nx, y: l.start.y - ny },
        { x: l.end.x - nx, y: l.end.y - ny },
        { x: l.end.x + nx, y: l.end.y + ny },
      ], { heading: l.heading });
    }
    expect(f.counts[ST.Cultivated] / f.maskCount).toBeGreaterThan(0.99);
  });
  it("faixas alternam o sentido (boustrofédon)", () => {
    const plan = planLanes(poly, { width: 3, workOffset: 0 });
    expect(Math.abs(Math.cos(plan.lanes[0].heading - plan.lanes[1].heading) + 1)).toBeLessThan(1e-6);
  });
  it("manobra liga o fim de uma faixa ao início da próxima", () => {
    const pts = planTurn({ x: 50, y: 10 }, 0, { x: 50, y: 13 }, 4);
    const last = pts[pts.length - 1];
    expect(Math.hypot(last.x - 50, last.y - 13)).toBeLessThan(1);
    // manobra em ômega sai além da borda, nunca atravessa para trás
    expect(Math.max(...pts.map((p) => p.x))).toBeGreaterThan(54);
  });
});
