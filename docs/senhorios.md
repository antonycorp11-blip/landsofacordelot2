# Senhorios

A divisão que importa para a posse da terra.

**Região** e **senhorio** são coisas diferentes, e a confusão entre as duas
custa caro depois:

| | quantos | o que muda de dono | como muda |
|---|---|---|---|
| **Região** | 7 | o *controlador* | guerra, rebelião, tratado |
| **Senhorio** | 35 | o *dono* | compra, herança, dote, confisco, tomada |

Tomar uma região é uma campanha militar. Comprar um senhorio é uma transação —
e é o primeiro jeito de um viajante sem nome deixar de ser só um viajante.

---

## Como a divisa nasce

Cada senhorio tem uma **sede**, e a divisa é o **Voronoi dessas sedes recortado
no polígono da região**. Por construção não há buraco nem sobreposição, e
nenhum senhorio escapa da sua região.

Voronoi puro, porém, dá linha reta — e este mapa nunca foi um tabuleiro. Então
cada divisa **interna** é reamostrada e deslocada por um campo de ruído que
depende só da **posição**: os dois vizinhos calculam exatamente o mesmo
deslocamento para o mesmo ponto, e a divisa continua fechada dos dois lados.

Duas regras guardam o resto:

- pontos encostados na borda da região **não se mexem** — essa fronteira é da
  região, não do senhorio;
- ponto que sairia da região volta para onde estava.

O autoteste confere que nenhum senhorio vaza: 0 pontos fora, com tolerância
apenas para os vértices que estão exatamente *sobre* a borda, que são da
própria região.

---

## Nobres e menores

As Casas maiores ficam com os senhorios **nobres** do próprio domínio. Os
**menores** vão para Morvath, Veyr, Rosethorne e para vizinhos — que é como uma
Casa acaba com terra dentro da região de outra. Hoje são **15 de 35** nessa
situação: o caso que o sistema político já previa e que só agora tem geografia.

Senhorio nobre **não está à venda**. É a base do poder de uma Casa, não se
passa a um estranho por moedas. Os menores, sim — por dinheiro e com a Casa de
bom humor (relação 10 ou melhor).

---

## As sedes não precisam de estrada

Castelos, solares, fortes e torres de senhorio são **posse, não destino**.
Muitos não têm estrada até eles, e isso é deliberado: a malha viária liga o que
importa para viajar, não tudo que existe. Tocar numa sede abre a ficha do
senhorio; não inicia viagem.

---

## O jogador como dono

`FiefOwner` é `HouseId | "player"`. O jogador entra aí **sem Casa**: comprar
terra não faz de ninguém um nobre, e a arquitetura precisa aguentar um viajante
dono de um feudo muito antes de existir uma Casa dele.

```ts
buyBlocker(fiefId)   // "none" | "gold" | "relation" | "not_for_sale"
buyFief(fiefId)      // tira o ouro, troca o dono
setOwner(id, dono)   // conquista, dote, confisco
```

Os trinta e cinco **lordes são gerados**, não escritos à mão: nome sorteado de
forma estável pelo id do senhorio, sobrenome da Casa dona. Escrever trinta e
cinco biografias agora seria inventar texto que a primeira missão reescreve — o
que precisa existir já é a pessoa. Eles usam o mesmo tipo dos líderes de Casa:
para o painel e para uma audiência, um lorde de aldeia e o Rei são a mesma
coisa com números diferentes.
