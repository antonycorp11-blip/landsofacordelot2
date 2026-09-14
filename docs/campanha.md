# A campanha principal

Duas coisas diferentes convivem no jogo:

- **Encargos** — os trabalhos que se pegam falando com quem manda numa
  localidade. São gerados, acabam, aparecem outros. São a vida do dia a dia.
- **Campanha** — a linha que atravessa a partida inteira, em capítulos,
  sempre visível na aba *Campanha* do registro. É o que responde "por que eu
  estou jogando".

O motor está em `src/game/story.ts` e não sabe nada de enredo: ele abre um
passo, espera um gatilho, mostra uma cena e segue. **Trocar o enredo é trocar
dados, não código.**

## A forma de um capítulo

```ts
{
  number: 3,
  title: "O título do capítulo",
  blurb: "Duas linhas dizendo do que este capítulo trata.",
  steps: [ /* … */ ]
}
```

## A forma de um passo

```ts
{
  id: "c3_algo",                    // único, começa com o capítulo
  objective: "Uma linha no imperativo",   // é o que o guia mostra no mapa
  detail: "Uma frase de contexto para o diário.",
  trigger: { kind: "visit", poiId: "castelo_real" },
  scene: { /* opcional */ },
  reward: { xp: 100, influence: 5 },
}
```

### Gatilhos disponíveis

| Gatilho | Completa quando |
| --- | --- |
| `{ kind: "visit", poiId }` | o jogador está NAQUELE lugar, parado |
| `{ kind: "contracts", count }` | cumpriu N encargos, de qualquer tipo |
| `{ kind: "battles", count }` | venceu N batalhas |
| `{ kind: "level", level }` | alcançou o nível |
| `{ kind: "influence", amount }` | juntou a influência |
| `{ kind: "fief" }` | possui ao menos um senhorio |
| `{ kind: "scene" }` | nada — a cena acontece e o passo passa |

Um gatilho que exige capacidade (nível, influência, terra) **dá ritmo à
campanha**: ele obriga o jogador a ir viver a vida do dia a dia antes do
próximo capítulo, que é como Mount & Blade usa o nível de clã.

### A forma de uma cena

```ts
scene: {
  speakerId: "aldren_valdoria",   // opcional; usa o retrato do personagem
  poiId: "castelo_real",          // opcional; aparece no cabeçalho
  text: "O que a pessoa diz, ou a narração quando não há ninguém falando.",
  options: [
    {
      id: "aceitar",
      label: "O que o jogador responde.",
      hint: "linha de apoio: o que isso custa ou dá",
      result: "O que acontece depois dessa resposta.",
      reward: { xp: 140, influence: 10, houseRelation: { houseId: "house_valdoria", amount: 12 } },
      flag: "servico_da_coroa",   // marca permanente; passos futuros podem ler
    },
  ],
}
```

**Sem `speakerId` a cena narra** — sai o retrato e fica o capítulo. É o modo
certo para passagens de tempo e para momentos em que o mundo muda sozinho.

### Marcas (`flag`)

Uma escolha pode deixar uma marca permanente em `story.flags`. Capítulos
seguintes leem essas marcas para mudar texto e opções — foi assim que o
Capítulo I faz: quem leu a carta encontra um destinatário diferente de quem
entregou lacrado.

## O que já existe do mundo, e pode ser usado sem inventar nada

- **Protetor Aldren Valdória**, no `castelo_real`, com retrato. Não é rei:
  ver [`narrativa.md`](narrativa.md) §2.
- **Dez Casas** com líderes, brasões e relação inicial com o jogador — e
  Karneth já começa hostil (−18), o que é material de enredo pronto.
- **Sete regiões**, trinta e cinco senhorios com dono, renda e preço.
- **Cinco reinos vizinhos** (Tharn, Ermos de Kelvhar, Solmônia, Cidades Livres
  de Mareth, Ávrenne), hoje com a fronteira fechada e um rumor cada. São a
  reserva natural para os capítulos finais.

## A história

O arco completo — a premissa, os sete selos, os atos, os personagens e o que o
jogador nunca pode saber cedo — está em [`narrativa.md`](narrativa.md).

**Aquele documento contém spoilers do jogo inteiro.**

## O que falta e é escrita, não código

**O array `chapters` em `story.ts` está vazio.** A campanha antiga saiu de
propósito — era um roteiro de serviço genérico e disputava atenção com a
abertura nova. O motor ficou inteiro: gatilhos, cenas, marcas, concessão de
terra.

Os Arcos I a VII de [`narrativa.md`](narrativa.md) entram **acrescentando
capítulos a esse array**. Nada mais precisa mudar.

Uma parte da história não passa por aqui: a abertura acontece no mundo, em
`worldEvents` e `scenes/`, e é uma cena de `cinematics.ts`, não um capítulo.
As duas camadas convivem — capítulo para o fio longo, cena para o momento.
