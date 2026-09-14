# Lands of Acordelot — Mapa de Valdória

Campanha jogável em Valdória: mapa estratégico 32-bit, viagem livre por estrada
e terreno, personagens e diálogos, política territorial, contratos, economia
diária, mercados regionais e arena tática para combate entre grupos.

## Antes de mexer na história, leia nesta ordem

1. [`docs/narrativa.md`](docs/narrativa.md) — **a história inteira**: a premissa,
   os sete selos, a Balança, os sete arcos e os dois finais. É a fonte da
   verdade sobre enredo. **Contém spoiler do jogo inteiro.**
2. [`docs/campanha.md`](docs/campanha.md) — como o motor de capítulos funciona e
   onde o enredo entra no código.
3. [`docs/retratos.md`](docs/retratos.md) — as faces, para quem for gerar arte.
4. [`docs/proximos-passos.md`](docs/proximos-passos.md) — o que está pronto e o
   que vem em seguida.

Três fatos que contradizem qualquer texto antigo que sobrar em algum canto:
**não existe rei** (Valdória governa como Casa mais forte, e o chefe dela é o
*Protetor do Reino*), a Coroa tem **dois** selos, e o array `chapters` de
`story.ts` está **vazio** de propósito.

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
   instalação `npm ci --include=dev`, build `npm run build` e saída `dist`.

   O `--include=dev` não é decoração: se o projeto tiver `NODE_ENV=production`
   nas variáveis de ambiente, `npm ci` pula as devDependencies e o build morre
   em `tsc: command not found` — o TypeScript e o Vite vivem lá. Com a opção, a
   instalação passa a não depender do `NODE_ENV`.
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
  render/agents/
    agentSheets.ts        folhas direcionais + direção pelo vetor de movimento
    MapAgentSprite.tsx    figura de um agente do mapa (folha, direção, animação)
  world/
    wanderers.ts          escalação de quem circula o reino + próximo destino
  travel/
    useTravel.ts          pathfinding, animação, tempo do mundo, event hooks
```

## Agentes do mapa

Um **agente** é qualquer figura que anda pelas estradas: o viajante do jogador
e mais vinte e três que circulam sozinhos — patrulhas, caravanas, mensageiros,
peregrinos, bandos, cortejos e as sete hostes das Casas territoriais. O componente não sabe de nenhum deles:
recebe uma folha de sprites, um rumo e se está andando. Lordes, mensageiros,
caravanas, patrulhas e exércitos pequenos usam o mesmo componente com outra
folha e outras cores.

A folha tem uma linha por direção (`NW`, `NE`, `SW`, `SE`) e uma coluna por
quadro da cavalgada. A direção sai do vetor entre a posição atual e a anterior
na rota, com o rumo filtrado: as estradas são sinuosas de propósito, e seguir
cada serpenteado faria a figura alternar entre "de costas" e "de frente" o
tempo todo.

### Preparar uma folha nova

O gerador entrega os quadros soltos: cada um numa posição diferente dentro da
sua célula, com a bandeira puxando o recorte para um lado e os cascos em
alturas diferentes. Desenhado assim, o agente escorrega de lado e sobe e desce
a cada quadro.

```bash
python3 tools/pack-agent-sheet.py entrada.png src/assets/agents/nome.png --scale 0.5
```

A ferramenta acha cada sprite pelo alfa, mede onde ficam os **cascos** e
reempacota numa grade regular com o ponto de apoio sempre no mesmo lugar da
célula. Depois disso a âncora é (0.5, 1.0) e o agente pisa certo na estrada. A
arte original fica em `src/assets/source-art/`, intocada.

Registre o resultado em `agentSheets.ts` com o tamanho da célula que a
ferramenta imprimiu.

### Tamanho na tela

A figura é medida em **pixels de tela**, não em unidades de mundo. Em unidades,
o mesmo zoom daria um cavaleiro de 30 px no desktop e de 11 px no celular,
porque a tela estreita mostra o reino numa escala bem menor. Na vista do reino
ele fica pequeno mas legível (e ganha um anel), e cresce devagar até um teto.

### Cores da Casa

`AgentColors` (`primary`, `secondary`, `bannerColor`, `houseStyle`) já atravessa
o componente, e `primary` já pinta o anel no mapa. Recolorir **estandarte e
traje separadamente** exige que a arte venha com máscaras por parte, e esta
folha é uma imagem achatada — quando a arte tiver as máscaras, só a pintura
muda.

## HUD

O HUD mantém o mapa como tela principal e mostra o estado persistente da campanha.

Tudo encostado no topo, em painéis translúcidos e pequenos. O mapa é a tela do
jogo; o HUD é só a moldura. No estado parado ocupa cerca de 9% da altura de um
celular; com viagem em curso, região tocada e diário aberto, 27%.

- **Lugar** (topo, esquerda): região atual, dia e hora do mundo, estado. Em
  viagem abre destino, duração e barra de progresso; tocar numa região do mapa
  acrescenta os dados dela.
- **Recursos** (topo): ouro, influência e comida usam os saldos reais da campanha.
- **Ficha**: o retrato do herói abre atributos, habilidades, grupo e progressão; o anel em volta mostra o XP do nível.
- **Doca**: pausa, 1× / 2× / 4×, seguir o viajante, enquadrar o reino, diário,
  luz e depuração. No celular ganha a segunda linha inteira.
- **Diário de viagem**: histórico do caminho — partida, marcos, travessias de
  fronteira, entrada em região, encontros e chegada. Cada entrada já guarda
  tipo e hora do mundo, que é o formato de que um registro de verdade vai
  precisar quando existirem emboscadas e pedágios.

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
alimentam os mercados regionais. Cada senhorio também tem de 5 a 7
assentamentos secundários que existem **apenas em dados**, para uma futura tela
de "Assentamentos da Região" — o mapa principal não é poluído com eles.


## Jornada, tutorial e contratos

A campanha agora oferece um guia opcional, quatro carreiras de contratos e seis
tipos de encontros de estrada. As decisões mostram custos, atributos, chances e
recompensas. Ouro, influência, comida, experiência, relações e o progresso da viagem
ficam salvos localmente. O mapa abre perto do viajante; seu retrato com XP circular
abre a ficha.

Veja [como jogar e as regras atuais](docs/jornada.md) e a
[combate entre grupos](docs/combate.md) e [economia regional](docs/economia.md).
Provisões, salários, mercado, carga e combate já alteram o estado persistente da campanha. Os grupos que circulam também persistem: podem ser perseguidos, interceptados, abordados e atacados, com efeitos sobre influência, segurança, emboscadas e preços regionais.
