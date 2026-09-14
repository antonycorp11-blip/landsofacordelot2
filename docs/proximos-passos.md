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

A fila, em ordem de valor:

1. **Encargo que nasce de pessoa com nome**, em vez de gerado. Os quatro de
   Elmwood provaram a forma; o resto do reino ainda não tem.
2. **Cerco ofensivo como o Arco IV promete.** A guerra contra Karneth hoje se
   resolve em mesa; a alternativa armada está escrita e não construída.
3. **A Balança lida de volta** (abaixo).
4. **O segundo estágio** — o continente, os outros reinos
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
