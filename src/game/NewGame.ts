import { generateCandidates } from "../systems/WorkerAI";
import { setupNpcs } from "../systems/NpcFarms";
import { World } from "../world/World";

/** Monta um mundo novo: fazenda pequena, trator usado, cultivador, plantadeira e carreta. */
export function newWorld(seed: number): World {
  const w = new World(seed);
  setupNpcs(w);
  const N = -Math.PI / 2;
  const tractor = w.addVehicle("tr-campeiro-75", "player", 250, 708, N);
  tractor.wear = 0.34;
  tractor.fuel = 72;
  tractor.opHours = 4120;
  // cultivador logo atrás do trator: basta dar ré e engatar
  w.addImplement("cult-3", "player", 250, 711.2, N);
  const seeder = w.addImplement("seed-3", "player", 275, 726, N);
  seeder.seedCrop = "wheat";
  seeder.seedKg = 120;
  seeder.wear = 0.22;
  const trailer = w.addImplement("trailer-8", "player", 232, 726, N);
  trailer.wear = 0.3;
  w.candidates = generateCandidates(seed, 0);
  w.candidatesDay = 0;
  const home = w.farmOf("player");
  w.player.x = home.x - 34;
  w.player.y = home.y - 30;
  w.player.heading = 0;
  return w;
}
