# Estado do jogo e próximos passos

> A história está em [`narrativa.md`](narrativa.md) e o motor dela em
> [`campanha.md`](campanha.md). Este documento é só o estado de construção.

## O que já forma uma partida

- Mapa de Valdória em 24.000 × 16.000, **movimento livre por estrada e por
  terreno** com A\* sobre grade de navegação, relevo, vegetação e agentes.
- Quatro protagonistas, ficha, atributos, vinte habilidades, níveis, carreiras,
  companheiros, recrutamento e grupo militar.
- HUD de paisagem sem rolagem em nenhuma tela, com retrato, anel de XP, ouro,
  influência, comida e **a Balança**.
- Conversas locais com pessoas nomeadas; encargos em três atos com atributo,
  habilidade, chance e consequência ditos antes.
- Eventos aleatórios, bandos, chamados com prazo e simulação diária de salário,
  comida, renda, deserção, guerra e conquista.
- Arena tática com terreno, ordens de formação, moral, mortos, feridos
  recuperáveis, prisioneiros, rendição, saque e retirada.
- Mercados regionais com estoque, reposição, preço, oito mercadorias,
  capacidade de carga e contratos que exigem compra e entrega física.
- Forças persistentes no mapa: patrulhas, caravanas, correios, peregrinos,
  cortejos, saqueadores e hostes, que podem ser lidos, perseguidos,
  interceptados, abordados e atacados — e que brigam entre si sem o jogador.
- Terra: imposto, obras, prosperidade, lealdade, guarnição, revolta.
  Juramento a uma Casa, serviço, concessão de senhorio, rompimento e
  **independência** com Casa própria.
- Obras de feudo com madeira e ferramentas físicas, prazo de construção,
  celeiro, feira e muralha que altera a defesa de um cerco. Casamento político
  e tratados com exigências, chance, recusa e prazo; oferta negociada por
  senhorio menor com perda real em caso de fracasso.
- Cerco ofensivo iniciado junto à sede real no mapa: guerra declarada ou
  juramento a uma Casa em guerra, acampamento que consome comida, aríete com
  madeira e ferramentas, rendição com chance persistida, assalto na arena e
  posse transferida somente após vitória. Derrota e retirada levantam o cerco.
- Rota escolhida antes de viajar: estrada rápida e visível, ou terreno mais
  lento que evita estradas e reduz contato com perseguidores. A Crônica mostra
  sempre a próxima pergunta da campanha, e o grupo mostra suprimento e custo.
- Eventos parados no mundo (`worldEvents`) e cenas em conversa com rosto
  gerado (`cinematics.ts` + `sceneRunner.ts`). A abertura é a carruagem.

## A campanha inteira está jogável

Os sete arcos existem em código, do escuro da abertura até a forja do Castelo
Real. `story.ts` tem os Capítulos II a VII; o Arco I acontece fora dele, em
`worldEvents` e nas cenas de Elmwood.

O que falta agora não é enredo — é **densidade**. Cada arco é hoje a sua
espinha: as cenas que decidem. O que cabe entre elas, e que a
[`narrativa.md`](narrativa.md) §9 diz ser onde o jogador passa a maior parte do
tempo, ainda é o sandbox genérico.

### O problema que sobra: ainda parece simulador de mapa

A história tem cena com rosto e a simulação tem profundidade, mas as HORAS
entre uma coisa e outra — que são a maior parte do jogo — eram uma barra de
progresso. O jogador escolhia um destino e olhava um marcador andar, enquanto
comida, feridos e perseguição eram somados em silêncio uma vez por dia.

O acampamento é o primeiro passo para consertar isso: parar vira decisão, e
comida, ferido e caçador passam a existir na frente do jogador. Falta o resto:

- **Encontro espacial em vez de sorteio.** Hoje um bando aparece porque um
  número caiu abaixo de um limite. Devia aparecer porque um marcador vermelho
  chegou até você, visível, com distância e tempo — e fugir, esconder-se ou
  virar e lutar devia ser escolha sua antes do contato.
- **Estar num lugar, não abrir o menu dele.** A chegada já é cena; o que vem
  depois volta a ser lista de abas.
- **O grupo visível.** Você é um marcador com um número ao lado. Os
  companheiros que andam com você não aparecem em lugar nenhum do mapa.

A fila, em ordem de valor:

1. **Encargo que nasce de pessoa com nome**, em vez de gerado. Os quatro de
   Elmwood provaram a forma; o resto do reino ainda não tem.
2. ~~Arco IV com escolha armada ligada à cena~~ — **feito.** «Fundar a sua
   Casa, e ir buscar» declara guerra a Karneth e devolve o jogador ao mapa; a
   tomada de Marcha Alta é jogada com os sistemas de cerco, e Garrick só
   aparece na muralha quando o portão cede.
3. **Política com gente em cena.** Os tratados e casamentos agora têm regras e
   efeitos, mas precisam de negociação presencial com rosto, interesses,
   contrapropostas e memória das Casas depois do acordo.
4. **A Balança lida de volta** (abaixo).
5. **O segundo estágio** — o continente, os outros reinos
   ([`narrativa.md`](narrativa.md) §8). Fora do escopo desta campanha.

## O que a Balança ainda não faz

O segundo polo já abre no fim do Arco III, e as cenas dos três arcos a movem.
O que falta é ela **ser lida de volta**: cenas que mudam de texto conforme a
inclinação, gente que comenta o que ele vem fazendo, e o ponto de decisão
final com o custo de contrariar a própria Balança
([`narrativa.md`](narrativa.md) §8).

## Direção para diálogos e história

Quatro regras que valem para toda conversa nova:

- a pessoa fala pelo interesse e pela posição dela, sem despejar explicação de
  mundo — se a fala parece enciclopédia, está errada;
- uma opção arriscada mostra atributo, habilidade, chance e consequência antes;
- o dado é decidido uma vez e persistido, sem repetição ao reabrir a tela;
- personagens lembram marcas e mudam saudação, preço, acesso e pedidos.

E uma regra de desenho: **nenhuma escolha pode ser falsa**. Observar dá
informação que outro caminho não dá; conversar pode arrancar um nome; atacar
rende prova e cobra perseguição; ir embora é permitido e custa o que não se
viu.

## Critério do próximo marco

Uma sessão de 30 minutos tem de permitir duas trajetórias diferentes:
enriquecer numa rota mercantil protegida, ou montar tropa e limpar a mesma
estrada. As duas alteram preços, relações, a Balança e o que a próxima cena
diz — com perdas e ganhos legíveis antes e depois da decisão.
