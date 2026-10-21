# Última Linha

Defesa de fileiras sci-fi com progressão incremental, no espírito de
*Plants vs. Zombies* + *Outliers: Incrementum*.

Alienígenas atravessam cinco fileiras em direção à base. Você **posiciona
unidades** nas casas (geradores, blasters, barreiras, minas…) e também **corta os
alienígenas com o dedo** (ou com o mouse pressionado). Ganhando ou perdendo, leva
**sucata** para a **árvore de habilidades** e volta mais forte.

Tudo é desenhado por código em Canvas 2D — sem imagens.

## Como executar

```bash
npm install
npm run dev     # http://localhost:5180
npm test        # regras do jogo + curva de dificuldade
npm run build
```

A Vercel publica o branch `main` (`vercel.json`). O progresso fica salvo no
navegador. No celular, jogue com o aparelho deitado.

## Como se joga

- **Energia:** geradores e o céu soltam células amarelas. Toque nelas (ou passe o
  dedo por cima) para coletar.
- **Cartas:** toque numa carta e depois numa casa. Cada carta tem custo e tempo de
  recarga. *Remover* libera uma casa. Atalhos no teclado: 1–8.
- **Corte:** arraste sobre os alienígenas. Cada golpe aquece a lâmina; se
  superaquecer, ela para até esfriar.
- **Drones:** cada fileira tem um drone que varre tudo uma vez quando um
  alienígena chega à base. Depois disso, a invasão tira integridade.
- **Missão:** 8 ondas, com um Colosso na última. "Chamar onda" adianta a próxima.

### Unidades
Gerador · Blaster · Barreira · Mina · Criotorre (desacelera) · Blaster Duplo ·
Canhão Laser (atravessa a fileira) · Bobina Tesla (raio em cadeia) · Lança-mísseis
(área 3×3).

### Alienígenas
Rastejante · Corredor · Blindado (carapaça) · Enxame · Saltador (pula a primeira
defesa) · Cuspidor (ataca de longe) · Colosso (chefe).

### Progressão
- **Setores:** cada vitória libera um setor novo, com alienígenas mais fortes e
  tipos novos.
- **Árvore** com três ramos:
  - **Lâmina:** dano, largura, resfriamento, crítico, ímã de energia, arco
    voltaico, queimadura.
  - **Engenharia:** dano e vida das unidades, geradores, recarga, custo e as
    cartas novas.
  - **Comando:** sucata, energia inicial, baias extras no arsenal, integridade
    da base, energia por abate, drones que voltam.
- **Arsenal:** escolha quais cartas levar (4 baias no começo).

## Estrutura

```
src/data/content.ts    unidades, alienígenas, setores e árvore (declarativos)
src/game/run.ts        simulação da missão: ondas, unidades, projéteis, drones, corte
src/game/profile.ts    progresso permanente, atributos da árvore, arsenal, save
src/render/sprites.ts  unidades, alienígenas, células e drones desenhados por código
src/render/board.ts    campo de batalha, efeitos, rastro do corte
src/ui/runhud.ts       bandeja de cartas, ondas, calor da lâmina, resultado
src/ui/hub.ts          base: missões, árvore de habilidades, arsenal
tests/                 regras e curva de dificuldade
```

O teste de curva simula um jogador simples. O setor 1 é vencível só
posicionando unidades; o setor 3 exige o corte; o setor 5 exige evoluir na árvore.
