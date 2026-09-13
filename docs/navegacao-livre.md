# Navegação livre

A estrada deixou de ser o único chão caminhável. Um toque em qualquer ponto de
terra do reino traça uma rota pelo terreno.

## A grade

O jogo **já** rasteriza o mundo para desenhar o chão (`terrainGrid.ts`), em
células de **100 unidades** — 240 × 160 = 38.400 células. A navegação usa
exatamente essa grade, o que significa zero memória nova de terreno e a
garantia de que o que se vê é o que se anda.

Sobre ela, `navigationGrid.ts` constrói:

- **custo** por célula, vindo do bioma;
- **estrada**, como desconto sobre o chão que ela cruza;
- **bloqueio**: mar, fora do reino, leito de rio largo.

Montagem medida: **246 ms**, uma vez, na primeira necessidade.

> A região de cada célula **não** é pré-calculada. Ela só interessa quando o
> viajante para — algumas vezes por partida — e sete testes de polígono nessas
> horas custam muito menos que rasterizar 38 mil células no carregamento. Essa
> troca sozinha derrubou a montagem de 2,4 s para 246 ms.

## Custos

| Chão | Custo |
| --- | --- |
| plains | 0,95 |
| temperate_valley / sacred_valley | 1,00 |
| steppe_march | 1,10 |
| coastal | 1,20 |
| dense_forest | 1,35 |
| alpine | 1,80 |

Estrada é **desconto**, não chão: real 0,62 · secundária 0,75 · trilha 0,85.
Uma estrada real na montanha continua sendo montanha barata — não vira
planície.

Tudo isto vive em `movementCost.ts`. Não há número de terreno dentro de
componente nenhum.

## Modos

`roads` · `prefer_roads` · `free` · `avoid_roads`

O jogador usa **`prefer_roads`**. Medido entre Baradra e Lago Verde:

| Modo | Tempo | Em estrada | h / 1000 un. |
| --- | --- | --- | --- |
| prefer_roads | 55,9 h | 100% | **4,06** |
| free | 73,5 h | 96% | 5,48 |
| avoid_roads | 104,7 h | 5% | **8,58** |

Cortar por fora é mais **curto** e mais **lento**: em `avoid_roads` a rota tem
12.199 unidades contra 13.590 pela estrada, e ainda assim leva o dobro do
tempo. É essa a troca estratégica.

## Desempenho

A* ponderado (peso 1,3) sobre a grade. Rotas medidas entre **1 ms e 43 ms**.

Duas decisões que fizeram a diferença, ambas descobertas medindo:

1. **Preferência forte por estrada (0,72, não 0,92).** Com preferência fraca o
   campo de custo ficava quase plano, a busca se espalhava por meio mapa e uma
   rota levava **4,2 segundos**. Preferência forte dá rota melhor *e* busca
   mais barata.
2. **Peso 1,3 na heurística.** Abre mão da rota matematicamente ótima por uma
   quase-ótima. Ninguém percebe meia célula; todo mundo percebe quatro
   segundos.

A rota é calculada **só quando há destino novo** — nunca por quadro — e sai
simplificada (colineares colapsados, cantos chanfrados) para não virar uma
polilinha de centenas de micro-segmentos.

## Rios

Rio de largura ≥ 18 é **parede**. Só se atravessa por ponte de estrada ou por
travessia conhecida (`borderCrossings`).

Medido no Rio Serpente: dos 23 pontos do leito, **9 continuam caminháveis** —
exatamente as pontes e vaus. Atravessar perpendicularmente longe de uma
passagem obriga a um desvio de **1,5×**.

## Posição livre no save

`RoadStop` ganhou a variante `free` e continua servindo agentes de estrada,
caravanas, rotas comerciais e travessias — nada do que já funcionava mudou de
forma.

Uma armadilha que custou um bug: numa rota de terreno a parada só é atualizada
na chegada, então gravar `stopRef` no meio da viagem salvava o **ponto de
partida** e recarregar rebobinava o jogador. Durante viagem livre o checkpoint
grava a posição real do marcador.

## O que ainda não usa isto

Os agentes do mundo (caravanas, patrulhas, hostes, bandidos) continuam no
grafo de estradas. A intenção é que bandidos e perseguidores de história
passem a cortar terreno — o planejador já é reutilizável por eles, basta
chamá-lo com o modo adequado.
