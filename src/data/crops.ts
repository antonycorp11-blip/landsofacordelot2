export type CropId = "wheat" | "soy" | "corn";

export interface CropDef {
  id: CropId;
  /** Índice gravado na célula (0 = sem cultura). */
  index: number;
  name: string;
  seedKgPerHa: number;
  seedPricePerKg: number;
  yieldKgPerHa: number;
  basePricePerKg: number;
  /** Dias de jogo até maturar em condições ideais. */
  growthDays: number;
  /** Espaçamento visual das fileiras (m). */
  rowSpacing: number;
  /** Multiplicador de crescimento por estação (primavera, verão, outono, inverno). */
  seasonGrowth: [number, number, number, number];
  colors: {
    sprout: [number, number, number];
    young: [number, number, number];
    tall: [number, number, number];
    mature: [number, number, number];
    matureDark: [number, number, number];
    stubble: [number, number, number];
    grain: string;
  };
}

export const CROPS: Record<CropId, CropDef> = {
  wheat: {
    id: "wheat",
    index: 1,
    name: "Trigo",
    seedKgPerHa: 150,
    seedPricePerKg: 2.9,
    yieldKgPerHa: 7200,
    basePricePerKg: 1.42,
    growthDays: 2.6,
    rowSpacing: 0.34,
    seasonGrowth: [1.0, 0.85, 1.05, 0.55],
    colors: {
      sprout: [118, 168, 70],
      young: [96, 160, 62],
      tall: [126, 168, 66],
      mature: [222, 186, 92],
      matureDark: [186, 146, 66],
      stubble: [206, 182, 122],
      grain: "#e2bf6a",
    },
  },
  soy: {
    id: "soy",
    index: 2,
    name: "Soja",
    seedKgPerHa: 60,
    seedPricePerKg: 8.2,
    yieldKgPerHa: 3600,
    basePricePerKg: 2.75,
    growthDays: 3.0,
    rowSpacing: 0.5,
    seasonGrowth: [1.0, 1.15, 0.8, 0.25],
    colors: {
      sprout: [98, 160, 70],
      young: [70, 142, 58],
      tall: [58, 124, 48],
      mature: [176, 140, 74],
      matureDark: [132, 100, 52],
      stubble: [168, 146, 104],
      grain: "#d8c27a",
    },
  },
  corn: {
    id: "corn",
    index: 3,
    name: "Milho",
    seedKgPerHa: 22,
    seedPricePerKg: 26,
    yieldKgPerHa: 9800,
    basePricePerKg: 1.05,
    growthDays: 3.5,
    rowSpacing: 0.75,
    seasonGrowth: [0.95, 1.2, 0.85, 0.2],
    colors: {
      sprout: [104, 170, 74],
      young: [82, 156, 62],
      tall: [66, 140, 56],
      mature: [196, 172, 96],
      matureDark: [150, 124, 64],
      stubble: [186, 164, 112],
      grain: "#f0b83a",
    },
  },
};

export const CROP_LIST: CropDef[] = Object.values(CROPS).sort((a, b) => a.index - b.index);

export function cropByIndex(i: number): CropDef | undefined {
  return CROP_LIST[i - 1];
}
