# Lands of Acordelot — Mapa de Valdória

Primeira versão jogável do mapa do reino. **Apenas o mapa**: geografia, regiões,
rotas, pontos de interesse e movimentação do personagem. Sem mercado,
inventário, combate, diplomacia, família ou telas de castelo.

```bash
npm install
npm run dev      # http://localhost:5180
npm run build
```

Stack: **Vite + React + TypeScript + SVG + Canvas 2D**. Terreno e cenário denso
são desenhados em canvas; regiões, cidades, rios, estradas e rotas permanecem
interativos em SVG, com o mesmo modelo de navegação.


## Testar no celular pela Vercel

1. Na Vercel, escolha **Add New → Project** e importe `antonycorp11-blip/landsofacordelot2`.
2. Use a branch **main**, diretório raiz **./**. O `vercel.json` já configura Vite,
   instalação `npm ci`, build `npm run build` e saída `dist`.
3. Clique em **Deploy** e abra o endereço HTTPS gerado no celular.

Não são necessárias variáveis de ambiente. [Documentação Vite/Vercel](https://vercel.com/docs/frameworks/frontend/vite).

### Arte e relevo

Sprites próprios, sete solos, água, ciclo visual de dia e noite e iluminação local.
A camada de paisagem acrescenta mais de 7 mil elementos de cenário: pinhais densos,
cadeias montanhosas, colinas, campos, arbustos e vegetação costeira. O relevo do chão
usa a mesma função de elevação que distribui montanhas e encostas. Os novos elementos
não participam da lógica de viagem; estradas, rios e cidades mantêm corredores livres.

A vegetação adicional usa um canvas com descarte fora da tela, imagens reutilizadas
e resolução limitada para reduzir o custo em celulares. As dimensões continuam
**24.000 × 16.000**. Documentação de arte em `docs/direcao-artistica.md`.

---

## Como o mapa é montado

O mundo vive num sistema de coordenadas virtuais independente da resolução. A
câmera converte isso para desktop e mobile.

### Os botões de ajuste

Ficam todos em `world/scale.ts` e `world/navgraph.ts`, e são independentes de
propósito — mexer num não estraga os outros.

| Quero mudar | Onde | Hoje |
| --- | --- | --- |
| Quão **vasto** o reino parece | razão `ASSET_SCALE` / `WORLD_SCALE` | `1.8 / 10` |
| Quanto **tempo** custa viajar | `DAYS_TO_CROSS_KINGDOM` (`world/navgraph.ts`) | `7` dias |
| Quão rápido a viagem **passa na tela** | `WORLD_HOURS_PER_SECOND` (`travel/useTravel.ts`) | `4` h/s |

`WORLD_SCALE` multiplica toda a geometria — o mundo tem hoje `24000 × 16000`.
Aumentá-lo sozinho **não** faz o mapa parecer maior, porque tudo cresceria
junto: a sensação de território vasto vem de ele crescer mais que o
`ASSET_SCALE`, deixando castelos e montanhas pequenos diante da paisagem.

Mudar qualquer uma das duas escalas ajusta sozinho, via `LOD_SCALE`:

- **os limiares de zoom**, para o detalhe aparecer quando ficar legível — mas
  as camadas de identidade do bioma (limiar ≤ 1) são preservadas, senão a vista
  do reino inteiro perderia as montanhas de Pedra Cinza e a mata de Elmwood;
- **a densidade do cenário**, que é por légua e não por contagem total: um reino
  maior tem proporcionalmente mais floresta, não a mesma floresta diluída;
- **a espessura de estradas, rios e fronteiras** (`featureWidth`), que de perto
  acompanham o tamanho dos edifícios e de longe engrossam para não sumirem.

O tempo de viagem é deliberadamente independente do tamanho do mapa:
`DAYS_TO_CROSS_KINGDOM` diz quantos dias custa cruzar Valdória de ponta a ponta
por estrada real, e o resto é derivado. Terreno difícil multiplica esse custo
via `RouteEdge.movementModifier`, e isso freia o marcador na tela também — uma
trilha de montanha avança visivelmente mais devagar que uma estrada real.

Com os valores atuais: capital → cidade vizinha ≈ **9h**; capital → sede de um
senhorio ≈ **2 dias**; Elmwood → Karneth ≈ **4 dias** pelo centro, **5 dias**
pela rota norte.

---

## Estrutura

```
src/
  world/                  ← fonte de verdade; nada aqui sabe desenhar
    types.ts              MapObject, Region, RouteNode/Edge, BorderCrossing…
    geo.ts                ruído determinístico, polilinhas, point-in-polygon
    layout.ts             esqueleto geométrico (hubs, raios, arcos, setores)
    regions/*.ts          7 senhorios: polígono, POIs, estradas, economia…
    rivers.ts             Rio Serpente + afluentes
    roads.ts              Estrada dos Reis (radial) + anel externo
    borderCrossings.ts    pontes, vaus, passos, portões
    nature.ts             cenário procedural por bioma (semente fixa)
    navgraph.ts           grafo de navegação + Dijkstra
    valdoria.ts           montagem do reino e índices
    selftest.ts           critérios de aceitação, validados no console (dev)
  render/
    mapAssets.ts          REGISTRY: assetKey → PNG/WebP ou placeholder
    placeholders.tsx      desenhos vetoriais provisórios (descartáveis)
    MapSymbol.tsx         escolhe imagem × placeholder; o jogo não sabe qual
    layers/*.tsx          Terrain, Rivers, Roads, Nature, Borders, POIs, Debug
  map/
    useCamera.ts          pan, zoom suave, roda, pinch, limites, LOD
    WorldMap.tsx          composição das camadas + ligação com o HUD
  ui/
    Hud.tsx               HUD provisório: lugar, relógio, viagem, tempo
    journal.ts            diário de viagem (tipo, hora do mundo, texto)
  travel/
    useTravel.ts          pathfinding, animação, tempo do mundo, event hooks
```

## HUD provisório

Não é a interface final — é o mínimo que já serve para jogar o mapa, e foi
escrito para ser substituído inteiro sem tocar no jogo: o HUD só lê o que o
mapa e a viagem já sabem.

- **Cartucho** (topo): região atual, dia e hora do mundo, e a viagem em curso
  com destino, duração e barra de progresso. Tocar numa região acrescenta os
  dados dela.
- **Diário de viagem**: histórico do caminho — partida, marcos, travessias de
  fronteira, entrada em região, encontros e chegada. Cada entrada já guarda
  tipo e hora do mundo, que é o formato de que um registro de verdade vai
  precisar quando existirem emboscadas e pedágios. No desktop fica aberto; no
  celular é uma gaveta.
- **Doca** (base): pausa, velocidade 1× / 2× / 4×, seguir o viajante,
  enquadrar o reino, diário, luz e depuração.

Não há botões de zoom: pinça no celular e roda no desktop dão conta, e cada
botão a menos é mais mapa visível. A pausa cancela o rAF da viagem — nada
avança e nada é desenhado enquanto o jogador decide.

---

## Trocando os placeholders por arte real

Este é o único passo. Em `src/render/mapAssets.ts`:

```ts
castle_royal: { size: 124, url: "/assets/map/castle_royal.webp" },
```

ou em tempo de execução:

```ts
setAssetUrl("pine_tree", "/assets/map/pine_tree.webp");
```

A partir daí `MapSymbol` desenha a imagem em vez do vetor. **Posição, colisão,
rotas, tempo de viagem e lógica não mudam** — eles dependem apenas de
`MapObject.x/y` e do grafo, nunca do desenho.

Convenção dos sprites: a âncora padrão é `(0.5, 0.92)`, ou seja, a *base* do
edifício fica sobre a coordenada do mapa. Elementos que devem ficar centrados
(lagos, campos, navios, pontes) já declaram `anchor: { x: 0.5, y: 0.5 }`.

Chaves já previstas: `castle_royal`, `castle_medium`, `fortress`, `city_large`,
`city_small`, `village`, `market_large`, `temple`, `cathedral`, `monastery`,
`shrine`, `watchtower`, `gate`, `fort`, `warcamp`, `mine`, `quarry`, `foundry`,
`sawmill`, `farm`, `mill`, `stud_farm`, `port`, `shipyard`, `lighthouse`,
`ship`, `lake`, `bay`, `mountain_large`, `mountain_small`, `mountain_pass`,
`hill`, `dry_hill`, `cliff`, `forest_cluster`, `pine_tree`, `oak_tree`,
`bridge_stone`, `bridge_wood`, `ford`, `road_marker`, entre outras.

---

## Viagem

O personagem **nunca** anda em linha reta. Ao clicar num destino:

1. `findPath` roda Dijkstra sobre o custo real (`distância × modificador de terreno`);
2. a rota é destacada com a mesma polilinha que será percorrida;
3. o marcador se move suavemente pela estrada;
4. a câmera acompanha (botão *Seguir*);
5. o tempo do mundo avança conforme o terreno de cada trecho.

Cada aresta carrega `distance`, `roadType`, `regionId`, `danger`, `terrain`,
`movementModifier` e `eventChance`. Os hooks já existem e estão ligados no
`WorldMap`, prontos para receber eventos de verdade:

```
onTravelStart · onRouteNodeReached · onRegionEntered
onBorderCrossed · onRandomEventCheck · onDestinationReached
```

Velocidade configurável em 1× / 2× / 4×.

---

## LOD

| Zoom | Aparece |
| --- | --- |
| distante | regiões, fronteiras, grandes castelos, cidades principais, estradas reais, relevo característico do bioma |
| médio | cidades menores, fortalezas, templos, minas, portos, estradas secundárias, travessias |
| próximo | árvores, fazendas, pequenas construções, pontes, trilhas, detalhes ambientais |

O culling combina LOD por zoom com recorte por viewport, e a câmera aplica sua
transformação diretamente no DOM — arrastar o mapa não re-renderiza o mundo.

---

## Debug

O botão **Debug** mostra polígonos e seus vértices, ids das regiões, bounds,
route nodes, arestas do grafo e travessias de fronteira, com cada senhorio numa
cor saturada distinta.

Em desenvolvimento, `world/selftest.ts` valida os critérios de aceitação e
imprime o resultado no console:

```
✅ 7 regiões
✅ sem sobreposição entre regiões
✅ sem buracos na massa territorial
✅ Coração no centro
✅ Coração faz fronteira com as 6
✅ anel externo conectado
✅ POIs dentro da própria região
✅ malha de estradas conectada
✅ toda região acessível por estrada
✅ existem rotas alternativas
✅ distância importa (curta < média < longa)
```

---

## Preparado para o futuro (mas não implementado)

A arquitetura já comporta, sem reescrita: território mudando de dono
(`ownerHouseId`, `House.color`), feudos de uma casa dentro de região alheia,
divisão de territórios, estradas bloqueadas por guerra (`RouteEdge.blocked`),
pontes destruídas (`BorderCrossing.blocked`), pedágio (`tollable`,
`controlledBy`) e fundação de novos assentamentos.

Metadados econômicos por região (`produces` / `consumes` / `tradeActivity`) já
estão nos dados, aguardando o mercado. Cada senhorio também tem de 5 a 7
assentamentos secundários que existem **apenas em dados**, para uma futura tela
de "Assentamentos da Região" — o mapa principal não é poluído com eles.
