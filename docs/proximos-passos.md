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

## O que está escrito e ainda não existe em código

Isto é a fila, e está em ordem.

1. **Arco I** — os quatro que reconhecem o selo (mercador, escrivão, sacerdote,
   guarda) hoje aparecem como pistas no quadro e não fazem nada. São a próxima
   coisa a construir, e o escrivão é **Mestre Aled Vern**, que importa muito
   mais do que parece.
2. ~~Os quatro dando serviço~~ — **feito.** Cada um deixa um pedido em
   `src/data/favours.ts`, com cena de entrega em `scenes/favours.ts`. Três
   cumpridos abrem o Castelo Verde.
   **A audiência com Edran Silvarden** — o fim do Arco I, onde o jogador ouve
   "Antônios" e "quem tiver os sete deve reinar" pela primeira vez, e escolhe
   devolver o selo ou ficar com ele.
   *(Com a carta de Aled na mão: ela não abre porta de lorde, abre porta de
   quem abre porta de lorde.)*
3. ~~A audiência com Edran~~ e ~~a localidade como cena~~ — **feitos.** O Arco I
   está jogável do começo ao fim: abertura, carruagem, os quatro de Elmwood,
   quatro favores, audiência e as duas saídas.
4. ~~O Arco II~~ e ~~capítulos em `story.ts`~~ — **feitos.** O Capítulo II está
   em `story.ts` com gatilhos novos (`flag`, `unhunted`, `garrison`,
   `prosperity`) e cenas do sistema novo via `StoryStep.cinematic`.
5. **O ARCO III — o selo que foi vendido.** Rastro de papel, uma viúva que
   mente sobre metade, e uma corrida contra a fundição. É onde Ilyra Veyr
   entra pela primeira vez, e onde a Balança ganha o segundo polo para o fio longo dos Arcos, já que o array está
   vazio.

## O que a Balança ainda não faz

Ela mede e aparece. O que falta é ela **ser lida de volta**: cenas que mudam de
texto conforme a inclinação, gente que comenta o que ele vem fazendo, e o
ponto de decisão final com o custo de contrariar a própria Balança
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
