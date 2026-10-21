export type ZoneType = "sell" | "silo" | "seed" | "fuel" | "workshop" | "home" | "dealer";

export interface ZoneTemplate {
  type: ZoneType;
  /** Retângulo em coordenadas locais da construção (centro + tamanho). */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export type BuildingKind =
  | "farmhouse"
  | "shed"
  | "silo"
  | "fuelTank"
  | "seedPallets"
  | "warehouse"
  | "showroom"
  | "gasStation"
  | "mill"
  | "grainPit"
  | "office"
  | "barn";

export interface BuildingDef {
  id: string;
  name: string;
  kind: BuildingKind;
  w: number;
  h: number;
  collide: boolean;
  roof: string;
  wall: string;
  zones?: ZoneTemplate[];
  /** Capacidade de armazenamento adicionada ao silo da fazenda. */
  storageKg?: number;
}

export const BUILDINGS: Record<string, BuildingDef> = {
  farmhouse: { id: "farmhouse", name: "Casa da sede", kind: "farmhouse", w: 13, h: 10, collide: true, roof: "#b5553a", wall: "#efe2c8", zones: [{ type: "home", x: 0, y: 7.5, w: 6, h: 4, label: "Casa — dormir" }] },
  shed: { id: "shed", name: "Galpão de máquinas", kind: "shed", w: 22, h: 14, collide: true, roof: "#8d97a0", wall: "#c9c2b4", zones: [{ type: "workshop", x: 0, y: 11, w: 14, h: 8, label: "Oficina" }] },
  barn: { id: "barn", name: "Galpão", kind: "barn", w: 18, h: 12, collide: true, roof: "#9c3b2e", wall: "#d8c9ad" },
  siloSmall: { id: "siloSmall", name: "Silo", kind: "silo", w: 7, h: 7, collide: true, roof: "#c7ccd1", wall: "#aab1b8", storageKg: 30000 },
  siloBig: { id: "siloBig", name: "Silo grande", kind: "silo", w: 12, h: 12, collide: true, roof: "#c7ccd1", wall: "#aab1b8" },
  grainPitFarm: { id: "grainPitFarm", name: "Moega da fazenda", kind: "grainPit", w: 8, h: 6, collide: false, roof: "#555", wall: "#777", zones: [{ type: "silo", x: 0, y: 0, w: 10, h: 9, label: "Moega do silo" }] },
  fuelTank: { id: "fuelTank", name: "Tanque de diesel", kind: "fuelTank", w: 6, h: 3, collide: true, roof: "#d8d4c6", wall: "#888", zones: [{ type: "fuel", x: 0, y: 5, w: 9, h: 7, label: "Diesel" }] },
  seedPallets: { id: "seedPallets", name: "Depósito de insumos", kind: "seedPallets", w: 8, h: 5, collide: true, roof: "#e0d6bc", wall: "#888", zones: [{ type: "seed", x: 0, y: 6.5, w: 12, h: 8, label: "Sementes e adubo" }] },
  warehouse: { id: "warehouse", name: "Armazém", kind: "warehouse", w: 34, h: 20, collide: true, roof: "#a5adb3", wall: "#ccc" },
  coopPit: { id: "coopPit", name: "Moega", kind: "grainPit", w: 10, h: 7, collide: false, roof: "#555", wall: "#777", zones: [{ type: "sell", x: 0, y: 0, w: 13, h: 11, label: "Venda" }] },
  showroom: { id: "showroom", name: "Concessionária", kind: "showroom", w: 26, h: 16, collide: true, roof: "#d8dde2", wall: "#fff", zones: [{ type: "dealer", x: 0, y: 14, w: 24, h: 10, label: "Pátio da concessionária" }] },
  gasStation: { id: "gasStation", name: "Posto", kind: "gasStation", w: 20, h: 12, collide: false, roof: "#e9e4d6", wall: "#c33b2c", zones: [{ type: "fuel", x: 0, y: 0, w: 22, h: 14, label: "Posto de combustível" }] },
  mill: { id: "mill", name: "Moinho", kind: "mill", w: 30, h: 22, collide: true, roof: "#b9b3a6", wall: "#ddd" },
  office: { id: "office", name: "Escritório", kind: "office", w: 12, h: 9, collide: true, roof: "#6f7b83", wall: "#e8e2d4" },
};
