import type { CropId } from "../data/crops";
import type { Cargo } from "../world/types";

/** Adiciona carga a um recipiente. Retorna quanto foi aceito (kg). */
export function cargoAdd(c: Cargo, crop: CropId, kg: number): number {
  if (kg <= 0) return 0;
  if (c.kg > 0.01 && c.cropId !== crop) return 0;
  const free = Math.max(0, c.capacity - c.kg);
  const take = Math.min(free, kg);
  if (take <= 0) return 0;
  c.kg += take;
  c.cropId = crop;
  return take;
}

/** Remove até `kg` do recipiente. Retorna o quanto saiu. */
export function cargoRemove(c: Cargo, kg: number): number {
  const take = Math.min(c.kg, Math.max(0, kg));
  c.kg -= take;
  if (c.kg < 0.01) {
    c.kg = 0;
    c.cropId = null;
  }
  return take;
}

export function cargoFree(c: Cargo): number {
  return Math.max(0, c.capacity - c.kg);
}

export function canAccept(c: Cargo, crop: CropId): boolean {
  return cargoFree(c) > 0.5 && (c.kg < 0.01 || c.cropId === crop);
}

/** Armazém da fazenda: múltiplas culturas dividindo uma capacidade total. */
export class FarmStorage {
  stock: Record<CropId, number> = { wheat: 0, soy: 0, corn: 0 };
  constructor(public capacity: number) {}

  total(): number {
    return this.stock.wheat + this.stock.soy + this.stock.corn;
  }

  free(): number {
    return Math.max(0, this.capacity - this.total());
  }

  add(crop: CropId, kg: number): number {
    const take = Math.min(this.free(), Math.max(0, kg));
    this.stock[crop] += take;
    return take;
  }

  remove(crop: CropId, kg: number): number {
    const take = Math.min(this.stock[crop], Math.max(0, kg));
    this.stock[crop] -= take;
    if (this.stock[crop] < 0.01) this.stock[crop] = 0;
    return take;
  }
}
