/**
 * Validação dos critérios de aceitação do mapa.
 *
 * Roda apenas em desenvolvimento e imprime uma tabela no console. Serve para
 * garantir que a massa territorial continue íntegra conforme a geografia for
 * ajustada — é barato e evita regressões silenciosas (buracos, sobreposições,
 * POIs na região errada, regiões sem estrada).
 */
import { bounds, makeRng, pointInPolygon } from "./geo";
import { adjacency, findPath } from "./navgraph";
import { valdoria, allPois, regions, routeNodes, regionById } from "./valdoria";
import { formatDuration } from "./time";
import { houses, houseById } from "../data/houses";
import { characters, characterById } from "../data/characters";
import { controllerOf, setController, territoryColor } from "../data/territories";
import { holdingFor } from "../data/holdings";
import { crestUrl } from "../data/houseAssets";

export type Check = { name: string; ok: boolean; detail: string };

export function runSelfTest(): Check[] {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail = "") => checks.push({ name, ok, detail });

  add("7 regiões", regions.length === 7, `${regions.length}`);

  /* Sobreposição: nenhum ponto pode pertencer a duas regiões. */
  const rng = makeRng("selftest");
  const b = valdoria.bounds;
  let overlaps = 0;
  let insideAny = 0;
  const samples = 20000;
  for (let i = 0; i < samples; i++) {
    const p = { x: b.x + rng() * b.width, y: b.y + rng() * b.height };
    const hits = regions.filter((r) => pointInPolygon(p, r.polygon));
    if (hits.length > 1) overlaps++;
    if (hits.length === 1) insideAny++;
  }
  add("sem sobreposição entre regiões", overlaps === 0, `${overlaps} amostras em 2+ regiões`);

  /* Buracos: pontos dentro do contorno do reino devem cair em alguma região. */
  let holes = 0;
  const rng2 = makeRng("selftest-holes");
  for (let i = 0; i < samples; i++) {
    const p = { x: b.x + rng2() * b.width, y: b.y + rng2() * b.height };
    if (!pointInPolygon(p, valdoria.outline)) continue;
    if (!regions.some((r) => pointInPolygon(p, r.polygon))) holes++;
  }
  add("sem buracos na massa territorial", holes === 0, `${holes} amostras órfãs (de ${insideAny} em terra)`);

  /* O Coração precisa ser central e fazer fronteira com todas as outras. */
  const heart = regionById.get("heart_of_valdoria")!;
  const hb = bounds(heart.polygon);
  const centerish =
    Math.abs((hb.minX + hb.maxX) / 2 - (b.x + b.width / 2)) < b.width * 0.08 &&
    Math.abs((hb.minY + hb.maxY) / 2 - (b.y + b.height / 2)) < b.height * 0.08;
  add("Coração no centro", centerish);
  add("Coração faz fronteira com as 6", heart.adjacentRegions.length === 6, heart.adjacentRegions.join(", "));

  /* Anel externo fechado: cada região externa tem 3 vizinhas. */
  const ringOk = regions
    .filter((r) => r.id !== "heart_of_valdoria")
    .every((r) => r.adjacentRegions.length === 3 && r.adjacentRegions.includes("heart_of_valdoria"));
  add("anel externo conectado", ringOk);

  /* Todo POI dentro do próprio polígono. */
  const strays = allPois.filter((p) => !pointInPolygon(p, regionById.get(p.regionId)!.polygon));
  add("POIs dentro da própria região", strays.length === 0, strays.map((s) => s.id).join(", "));

  /* Grafo: tudo alcançável a partir do Castelo Real. */
  const seen = new Set<string>(["castelo_real"]);
  const stack = ["castelo_real"];
  while (stack.length) {
    for (const { other } of adjacency.get(stack.pop()!) ?? []) {
      if (!seen.has(other)) {
        seen.add(other);
        stack.push(other);
      }
    }
  }
  const unreachable = routeNodes.filter((n) => !seen.has(n.id));
  add("malha de estradas conectada", unreachable.length === 0, unreachable.map((n) => n.id).join(", "));

  /* Cada senhorio ligado à capital por estrada. */
  const seatsOk = regions
    .filter((r) => r.id !== "heart_of_valdoria")
    .map((r) => ({ r, path: findPath("castelo_real", r.seatPoiId) }));
  add(
    "toda região acessível por estrada",
    seatsOk.every((s) => s.path),
    seatsOk.map((s) => `${s.r.id}:${s.path ? formatDuration(s.path.travelHours) : "SEM ROTA"}`).join(" · "),
  );

  /* Rotas alternativas: existe caminho Elmwood→Karneth pelo norte sem o centro. */
  const direct = findPath("serenvale", "castelo_karneth");
  const viaCenter = direct?.nodeIds.includes("castelo_real");
  const northPath = findPath("folhaterra", "portao_rubro");
  add(
    "existem rotas alternativas",
    Boolean(direct && northPath),
    `Elmwood→Karneth ${direct ? formatDuration(direct.travelHours) : "—"}${viaCenter ? " (pelo centro)" : ""}; rota norte ${northPath ? formatDuration(northPath.travelHours) : "—"}`,
  );

  /* Escala: viagens curtas, médias e longas precisam ser distinguíveis. */
  const short = findPath("castelo_real", "cidade_alta");
  const medium = findPath("castelo_real", "castelo_verde");
  const long = findPath("castelo_real", "grande_porto");
  add(
    "distância importa (curta < média < longa)",
    Boolean(short && medium && long && short.travelHours < medium.travelHours && medium.travelHours < long.travelHours),
    `curta ${formatDuration(short?.travelHours ?? 0)} · média ${formatDuration(medium?.travelHours ?? 0)} · longa ${formatDuration(long?.travelHours ?? 0)}`,
  );

  /* ---------------------- camada política ------------------------------ */

  add("10 Casas", houses.length === 10, `${houses.length}`);

  const leadersOk = houses.every((h) => characterById.has(h.leaderId));
  add(
    "toda Casa tem líder registrado",
    leadersOk,
    houses.filter((h) => !characterById.has(h.leaderId)).map((h) => h.name).join(", ") || `${characters.length} personagens`,
  );

  add(
    "as 7 regiões têm controlador",
    regions.every((r) => houseById.has(controllerOf(r.id))),
    regions.map((r) => `${r.name}→${houseById.get(controllerOf(r.id))?.shortName}`).join(" · "),
  );

  /*
   * A cor tem de vir do CONTROLADOR, não da região. Este teste conquista
   * Elmwood com Karneth, confere que a cor mudou, e devolve — se alguém
   * escrever uma cor fixa num componente, isto passa a falhar.
   */
  const victim = "elmwood" as const;
  const before = territoryColor(victim);
  const original = controllerOf(victim);
  setController(victim, "house_karneth");
  const after = territoryColor(victim);
  setController(victim, original);
  add(
    "cor do território vem da Casa que controla",
    before !== after && after === houseById.get("house_karneth")?.color && territoryColor(victim) === before,
    `${before} → ${after} → ${territoryColor(victim)}`,
  );

  const missingCrest = houses.filter((h) => !crestUrl(h.crestAssetKey));
  add(
    "toda Casa tem brasão",
    missingCrest.length === 0,
    missingCrest.map((h) => h.name).join(", ") || `${houses.length} brasões`,
  );

  const badHoldings = allPois.filter((p) => {
    const h = holdingFor(p);
    return !houseById.has(h.ownerHouseId) || !houseById.has(h.controllerHouseId);
  });
  add(
    "toda estrutura tem dono e controlador",
    badHoldings.length === 0,
    badHoldings.map((p) => p.name).join(", ") || `${allPois.length} estruturas`,
  );

  const minorHoldings = allPois.filter((p) =>
    ["house_morvath", "house_veyr", "house_rosethorne"].includes(holdingFor(p).ownerHouseId),
  );
  add(
    "Casas menores possuem estruturas em domínio alheio",
    minorHoldings.length >= 3,
    minorHoldings.map((p) => `${p.name} (${houseById.get(holdingFor(p).ownerHouseId)?.shortName})`).join(" · "),
  );

  return checks;
}

if (import.meta.env.DEV) {
  const results = runSelfTest();
  const failed = results.filter((c) => !c.ok);
  console.groupCollapsed(
    `%c[Valdória] ${results.length - failed.length}/${results.length} verificações OK`,
    `color:${failed.length ? "#c0392b" : "#2e7d32"};font-weight:bold`,
  );
  for (const c of results) console.log(`${c.ok ? "✅" : "❌"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  console.groupEnd();
}
