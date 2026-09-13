/**
 * Validação dos critérios de aceitação do mapa.
 *
 * Roda apenas em desenvolvimento e imprime uma tabela no console. Serve para
 * garantir que a massa territorial continue íntegra conforme a geografia for
 * ajustada — é barato e evita regressões silenciosas (buracos, sobreposições,
 * POIs na região errada, regiões sem estrada).
 */
import { bounds, distanceToPolyline, makeRng, pointInPolygon } from "./geo";
import { adjacency, findPath } from "./navgraph";
import { valdoria, allPois, regions, routeNodes, regionById } from "./valdoria";
import { formatDuration } from "./time";
import { houses, houseById } from "../data/houses";
import { characters, characterById } from "../data/characters";
import { controllerOf, setController, territoryColor } from "../data/territories";
import { holdingFor } from "../data/holdings";
import { crestUrl } from "../data/houseAssets";
import { heroes, ATTRIBUTE_MAX, ATTRIBUTE_MIN } from "../data/heroes";
import { skills as allSkills, SKILL_MAX } from "../data/skills";
import { troops as troopTypes, troopTotal } from "../data/troops";
import { MISSING_HERO_PORTRAITS, heroPortraitUrl } from "../data/heroAssets";
import { getState } from "../game/store";
import { xpToNextLevel, maxTroops, MAX_LEVEL } from "../game/progression";
import { derivedInput } from "../game/experience";
import { rankIndex, RANK_THRESHOLDS } from "../game/careers";
import { partyOf, wanderers } from "./wanderers";
import { foreignRealms } from "./foreignRealms";
import { fiefs, fiefsOfRegion } from "./fiefs";

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

  /* ------------------------- personagem e grupo ------------------------- */

  add("quatro inícios existem", heroes.length === 4, heroes.map((h) => h.name).join(", "));

  const g = getState();
  add(
    "no máximo um deles é o jogador",
    !g.started || (!!g.heroId && !g.companions[g.heroId]),
    g.started ? `jogador: ${g.heroId} · companheiros: ${Object.keys(g.companions).length}` : "campanha não iniciada",
  );
  add(
    "os outros três continuam no mundo",
    !g.started || Object.keys(g.companions).length === heroes.length - 1,
    Object.values(g.companions).map((c) => c.id).join(", ") || "—",
  );

  add("nível nunca abaixo de 1", g.level >= 1 && g.level <= MAX_LEVEL, `nível ${g.level}`);

  const attrOk = Object.values(g.attributes).every((v) => v >= ATTRIBUTE_MIN && v <= ATTRIBUTE_MAX);
  add("atributos entre 1 e 10", attrOk, Object.values(g.attributes).join(" / "));

  const badSkill = allSkills.find((sk) => {
    const v = g.skills[sk.id] ?? 0;
    return v < 0 || v > SKILL_MAX;
  });
  add("habilidades entre 0 e 100", !badSkill, badSkill?.name ?? `${allSkills.length} habilidades`);

  /* A curva de nível precisa crescer sempre: uma inversão faria um nível
     custar menos que o anterior e quebraria a progressão em silêncio. */
  let curveOk = true;
  for (let l = 1; l < MAX_LEVEL - 1; l++) if (xpToNextLevel(l + 1) <= xpToNextLevel(l)) curveOk = false;
  add(
    "curva de nível sempre crescente",
    curveOk,
    `1→2: ${xpToNextLevel(1)} · 2→3: ${xpToNextLevel(2)} · 10→11: ${xpToNextLevel(10)} · 29→30: ${xpToNextLevel(29)}`,
  );

  let rankOk = true;
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) if (rankIndex(RANK_THRESHOLDS[i]) !== i) rankOk = false;
  add("postos de carreira em ordem", rankOk, RANK_THRESHOLDS.join(" · "));

  add(
    "contingente respeita o limite de comando",
    troopTotal(g.troops) <= maxTroops(derivedInput(g)),
    `${troopTotal(g.troops)} / ${maxTroops(derivedInput(g))}`,
  );

  /* Cada agente do mapa precisa de contingente, senão o crachá some e a
     leitura estratégica deixa de existir para aquele grupo. */
  const noParty = wanderers.filter((w) => troopTotal(partyOf(w)) <= 0);
  add(
    "todo agente do mapa tem contingente",
    noParty.length === 0,
    noParty.map((w) => w.name).join(", ") ||
      wanderers.map((w) => `${w.name}:${troopTotal(partyOf(w))}`).slice(0, 4).join(" · ") + " …",
  );

  add(
    "toda tropa tem custo e força",
    troopTypes.every((t) => t.recruitCost > 0 && t.strength > 0 && t.dailyWage > 0),
    troopTypes.map((t) => `${t.name} ${t.recruitCost}/${t.strength}`).join(" · "),
  );

  const missingPortraits = MISSING_HERO_PORTRAITS.filter((k) => !heroPortraitUrl(k));
  add(
    "retratos dos quatro inícios",
    missingPortraits.length === 0,
    missingPortraits.length ? `faltam: ${missingPortraits.join(", ")}` : "4 retratos",
  );

  /* --------------------------- fronteira -------------------------------- */

  /*
   * O limite do mundo é GEOGRÁFICO, não uma parede: se um único nó de rota
   * caísse fora do contorno, o viajante poderia sair do reino. Esta é a
   * verificação que garante que a escuridão da borda não precisa segurar nada.
   */
  const outside = routeNodes.filter((n) => !pointInPolygon({ x: n.x, y: n.y }, valdoria.outline));
  add(
    "nenhum nó de rota fora do reino",
    outside.length === 0,
    outside.map((n) => n.id).join(", ") || `${routeNodes.length} nós dentro`,
  );

  add(
    "reinos vizinhos existem como dado",
    foreignRealms.length >= 4 && foreignRealms.every((r) => r.rumor.length > 0),
    foreignRealms.map((r) => `${r.name} (${r.status})`).join(" · "),
  );

  /* --------------------------- senhorios -------------------------------- */

  add(
    "cada região dividida em senhorios",
    regions.every((r) => fiefsOfRegion(r.id).length >= 4),
    regions.map((r) => `${r.name}: ${fiefsOfRegion(r.id).length}`).join(" · "),
  );

  add(
    "todo senhorio tem polígono",
    fiefs.every((f) => f.polygon.length >= 3),
    `${fiefs.length} senhorios`,
  );

  /*
   * Um senhorio não pode vazar para a região vizinha: o Voronoi é recortado no
   * polígono da região, e a ondulação da divisa devolve para dentro qualquer
   * ponto que saia. Os vértices que estão EXATAMENTE sobre a borda são da
   * própria região, e por isso a tolerância.
   */
  let leaked = 0;
  for (const f of fiefs) {
    const region = regionById.get(f.regionId);
    if (!region) continue;
    for (const p of f.polygon) {
      if (!pointInPolygon(p, region.polygon) && distanceToPolyline(p, region.polygon) > 1) leaked++;
    }
  }
  add("nenhum senhorio vaza da sua região", leaked === 0, `${leaked} pontos fora`);

  /* Terra dentro do domínio alheio é o caso que prova Casa ≠ região. */
  const foreign = fiefs.filter((f) => f.ownerHouseId !== regionById.get(f.regionId)?.houseId);
  add(
    "Casas possuem senhorios em região alheia",
    foreign.length >= 8,
    `${foreign.length} de ${fiefs.length}`,
  );

  add(
    "todo senhorio tem lorde, renda e preço",
    fiefs.every((f) => f.lordId && f.income > 0 && f.value > 0),
    `preço médio ${Math.round(fiefs.reduce((a, f) => a + f.value, 0) / fiefs.length)} moedas`,
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
