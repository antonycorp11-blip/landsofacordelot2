import { FacePortrait } from "../render/portraits/FacePortrait";

/** Folha de contato: só para olhar muitos rostos de uma vez durante o ajuste. */
const ACCENTS = ["#8c4b3f", "#4f7a63", "#3f5f86", "#8a6f3c", "#6a4a72", "#7a5a44"];
const KINDS = ["povo", "militar", "corte", "clero"] as const;

export function FaceSheet() {
  const cells = [];
  for (let i = 0; i < 18; i++) {
    cells.push({
      seed: `pessoa-${i}`,
      female: i % 3 === 1,
      age: [0.25, 0.4, 0.55, 0.75][i % 4],
      accent: ACCENTS[i % ACCENTS.length],
      kind: KINDS[i % KINDS.length],
    });
  }
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "auto", background: "#0f1a1d", padding: 16, zIndex: 999 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
        {cells.map((c) => (
          <div key={c.seed} style={{ display: "grid", placeItems: "center", gap: 4 }}>
            <FacePortrait {...c} size={124} className="face" />
            <FacePortrait {...c} size={44} className="face" />
          </div>
        ))}
      </div>
    </div>
  );
}
