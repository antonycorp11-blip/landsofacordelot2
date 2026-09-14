# Coisas que estão no mundo

Um encontro não precisa ser uma janela que aparece do nada. Ele pode ser um
**objeto no mapa**: uma carruagem tombada entre as árvores, que você vê de
longe e decide se vai olhar.

É a diferença entre *"bandidos apareceram"* e *"há uma carroça quebrada ali
adiante, e alguma coisa se mexe debaixo dela"*.

## O evento

`WorldEventInstance` fica em `worldEvents` no save: tipo, posição, região,
estado próprio, visível, descoberto, resolvido.

Ele é **persistente**. Carroça saqueada continua sendo uma carroça saqueada no
meio do bosque depois que a cena acabou.

## Como se interage

Aproximar-se **é** a interação. A checagem roda no quadro da viagem — a posição
é escrita imperativamente, sem re-render — mas com folga de meio segundo por
dentro: bastante para um cavalo, e sessenta vezes por segundo seria desperdício.

Raio de percepção: 520 unidades. O nome só aparece depois de descoberto; antes
é uma forma estranha no meio das árvores.

## Desenho

`WorldEventLayer` usa o conjunto 32-bit em `src/assets/story/carriage/`. A carruagem é um corpo
inclinado, uma roda ainda no eixo, outra solta ao lado, o varal partido
apontando para cima e dois volumes de carga caídos.

Pequena de propósito: um ícone gigante com exclamação transformaria descoberta
em lista de tarefas.

## Cenas

`CinematicScene` não é um painel. O mapa continua atrás, escurecido com
vinheta — o jogo não trocou de tela, ele parou por um momento.

- local e hora em versalete pequeno no alto;
- uma a três linhas de serifa, nunca uma página;
- até quatro escolhas, com o teste e a chance **ditos antes**;
- o resultado da escolha aparece numa pausa, antes de seguir.

Sem "missão aceita", sem recompensa em destaque, sem moldura.

> Uma armadilha que custou um bug: a escolha que **encerra** a cena limpa o
> estado na hora, e o componente retornava `null` antes de mostrar o texto. A
> última fala — justamente a que entrega o mistério — sumia sem aparecer. O
> resultado passou a ser renderizado antes de qualquer outra coisa, inclusive
> depois de a cena ter acabado.

## Conhecimento

O que o jogador aprende não é um contador de progresso. São três listas em
`knowledge`:

- **facts** — o que ele sabe;
- **questions** — o que ele ainda não entendeu;
- **evidence** — o que ele tem na mão para provar.

Mais `storyFlags`, as marcas permanentes que cenas futuras vão ler.

A ordem em que isso chega não importa, e é esse o ponto.
