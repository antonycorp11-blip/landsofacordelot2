# Casas, territórios e estruturas

A camada política do mundo. O mapa continua sendo o mapa: geografia, estradas e
viagem não mudaram. O que entrou é **quem é dono do quê**.

---

## O princípio

**Casa não é região.** São entidades independentes, e o código nunca acopla as
duas:

- uma Casa pode controlar várias regiões, ou nenhuma;
- pode continuar existindo depois de perder o território;
- pode possuir estruturas dentro do domínio de outra Casa.

Três das dez Casas já nascem sem senhorio próprio — Morvath, Veyr e
Rosethorne — justamente para que esse caso esteja exercitado desde o começo.

**A região não tem cor.** Ela tem um *controlador*, e a cor vem da Casa que a
controla:

```
region → controllerOf(region) → house.color
```

Nenhum componente de renderização tem cor de Casa escrita dentro. É por isso
que conquistar uma região repinta o mapa, troca a borda e muda o brasão das
estruturas sem tocar em React:

```ts
setController("elmwood", "house_karneth");
```

O self-test faz exatamente isso a cada carga em desenvolvimento, confere que a
cor mudou e devolve. Se alguém escrever uma cor fixa num componente, a
verificação passa a falhar.

---

## Onde está cada coisa

| arquivo | o quê |
|---|---|
| `src/data/houses.ts` | as 10 Casas: cor, brasão, líder, classe, sede |
| `src/data/characters.ts` | os líderes como personagens de verdade |
| `src/data/territories.ts` | quem controla cada senhorio; conquista passa por aqui |
| `src/data/holdings.ts` | a ficha política de cada estrutura |
| `src/data/player.ts` | Casa do jogador, relações e influência local |
| `src/data/houseAssets.ts` · `characterAssets.ts` | registries de arte |
| `src/render/layers/PoliticalLayer.tsx` | o verniz de cor por cima do mapa |
| `src/render/houses/HouseCrest.tsx` | brasão, com escudo provisório se faltar arte |
| `src/ui/settlement/` | o painel contextual |

---

## Dono e controlador

`ownerHouseId` e `controllerHouseId` são campos distintos de propósito. Hoje
coincidem em tudo. Quando Karneth ocupar militarmente uma vila de Elmwood:

```ts
ownerHouseId = "house_elmwood"       // posse de direito
controllerHouseId = "house_karneth"  // quem manda de fato
```

O painel passa a mostrar as duas coisas sozinho, e o mapa segue o controlador.

O controlador de uma estrutura **não é armazenado**: é lido do território a
cada consulta. Conquistar uma região troca o controlador de tudo que está
dentro dela sem reescrever uma linha de dados.

---

## Relação × influência

Dois números diferentes, e o painel os mantém separados de propósito:

- **Relação com a Casa** (−100 a +100) — o que a instituição pensa de você, em
  todo o reino.
- **Influência local** (0 a 100) — o seu peso *naquele lugar*, um por
  estrutura.

Dá para ser bem-visto pela Casa Aurenna e não valer nada num porto dela.

---

## Os números das estruturas

Nem toda estrutura tem ficha escrita à mão — seriam noventa fichas de números
inventados que a economia vai reescrever. Os lugares com peso narrativo estão
em `OVERRIDES`; o resto é **derivado** do tipo e do id, de forma estável, para
que toda estrutura tenha painel e nenhuma mude de valor entre partidas.

Cada categoria mostra só o que faz sentido nela: uma mina não tem guarnição, um
templo não tem volume comercial.

---

## Ações

Quase tudo ainda não existe como sistema. Os botões correspondentes ficam
**desabilitados** em vez de ausentes: é o mapa do que vem, e evita que o painel
mude de forma a cada sistema novo.

As ações de administração — Gerir, Leis, Impostos, Guarnição — só aparecem
quando `ownerHouseId === player.houseId`. Como o jogador ainda não tem Casa
(`houseId: null`), hoje nunca aparecem. A lógica de permissão já está no lugar.

---

## Arte que falta

- **Retrato do Lorde-Príncipe Cassian Caelmont.** O Vale Sagrado veio com a
  Arcebispa Yseld, que é a figura religiosa; o líder político da Casa ainda não
  tem retrato. O painel mostra o nome sem retrato, sem quebrar.
- **Retrato do líder de Rosethorne.** A arte entregue é de uma mulher; o
  briefing nomeia *Lorde Edric Rosethorne*. Não troquei o nome nem forcei o
  retrato — o arquivo está em `src/assets/characters/rosethorne_leader.webp`,
  fora do registro, esperando você decidir se o líder passa a ser uma Lady.
- **Ícones de classe avulsos** (MILITARY, TRADE, POLITICS, RELIGION). Aparecem
  dentro dos cards, mas não como arquivos próprios; o painel usa um glifo
  provisório.
