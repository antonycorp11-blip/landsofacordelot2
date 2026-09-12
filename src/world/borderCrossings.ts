/**
 * Pontos de passagem obrigatórios entre regiões.
 *
 * Cada travessia fica exatamente SOBRE a polilinha de fronteira compartilhada,
 * porque é amostrada a partir dela. Isso as torna candidatas naturais a pedágio,
 * emboscada, bloqueio de guerra e controle territorial no futuro.
 */
import { RING_ORDER, SECTOR_INDEX, onInnerArc, onSpoke } from "./layout";
import type { BorderCrossing, BorderCrossingType, HouseId, RegionId } from "./types";

type HeartSpec = [
  id: string,
  name: string,
  type: BorderCrossingType,
  region: RegionId,
  s: number,
  assetKey: string,
  controlledBy: HouseId,
  tollable: boolean,
];

/** Travessias entre o Coração e cada uma das seis regiões externas. */
const HEART_CROSSINGS: HeartSpec[] = [
  ["bc_ponte_do_bosque", "Ponte do Bosque", "bridge", "elmwood", 0.45, "bridge_stone", "house_valdoria", true],
  ["bc_portao_de_pedra", "Portão de Pedra", "gate", "greystone", 0.5, "gate", "house_valdoria", true],
  ["bc_vau_de_karneth", "Vau de Karneth", "ford", "karneth", 0.5, "ford", "house_karneth", true],
  ["bc_ponte_dos_peregrinos", "Ponte dos Peregrinos", "bridge", "sacred_vale", 0.55, "bridge_stone", "house_caelmont", false],
  ["bc_ponte_do_serpente", "Ponte do Serpente", "bridge", "golden_coast", 0.5, "bridge_stone", "house_valdoria", true],
  ["bc_marco_dos_graos", "Marco dos Grãos", "road", "greenfields", 0.5, "road_marker", "house_elmwood", true],
];

type RingSpec = [
  id: string,
  name: string,
  type: BorderCrossingType,
  spokeIndex: number,
  s: number,
  assetKey: string,
  controlledBy: HouseId,
  tollable: boolean,
];

/**
 * Travessias do anel externo. O índice do raio `i` separa a região RING_ORDER[i-1]
 * da região RING_ORDER[i].
 */
const RING_CROSSINGS: RingSpec[] = [
  ["bc_vau_do_oeste", "Vau do Oeste", "ford", 0, 0.45, "ford", "house_silvarden", false],
  ["bc_trilha_das_faias", "Trilha das Faias", "forest_path", 1, 0.45, "forest_path", "house_silvarden", false],
  ["bc_passagem_do_norte", "Passagem do Norte", "mountain_pass", 2, 0.55, "mountain_pass", "house_dravenor", true],
  ["bc_passo_da_vigilia", "Passo da Vigília", "gate", 3, 0.5, "gate", "house_karneth", true],
  ["bc_ponte_das_aguas", "Ponte das Águas", "bridge", 4, 0.6, "bridge_wood", "house_caelmont", false],
  ["bc_estrada_costeira", "Estrada Costeira", "road", 5, 0.62, "road_marker", "house_aurenna", true],
];

export const borderCrossings: BorderCrossing[] = [
  ...HEART_CROSSINGS.map(([id, name, type, region, s, assetKey, controlledBy, tollable]) => {
    const p = onInnerArc(SECTOR_INDEX[region], s);
    return {
      id,
      name,
      type,
      x: p.x,
      y: p.y,
      connects: ["heart_of_valdoria", region] as [RegionId, RegionId],
      assetKey,
      controlledBy,
      tollable,
    };
  }),
  ...RING_CROSSINGS.map(([id, name, type, spokeIndex, s, assetKey, controlledBy, tollable]) => {
    const p = onSpoke(spokeIndex, s);
    const a = RING_ORDER[(spokeIndex + 5) % 6];
    const b = RING_ORDER[spokeIndex];
    return {
      id,
      name,
      type,
      x: p.x,
      y: p.y,
      connects: [a, b] as [RegionId, RegionId],
      assetKey,
      controlledBy,
      tollable,
    };
  }),
];

export const borderCrossingById = new Map(borderCrossings.map((c) => [c.id, c]));
