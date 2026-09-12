# Biomas de Valdória — terreno, vegetação e produção de assets

Referência para produzir a arte definitiva do mapa. O que está descrito aqui já
está **codificado** em [`src/world/nature.ts`](../src/world/nature.ts) — as
densidades e os `assetKey` citados são os que o mapa realmente espalha hoje.

Valdória é **um reino** dividido em sete senhorios. As "regiões" abaixo são
esses senhorios.

---

## 1. As sete regiões

### Coração de Valdória — vale temperado fértil
Centro político e populacional, a única região que faz fronteira com todas as outras.

- **Terreno:** colinas suaves, várzeas do Rio Serpente, terra organizada e cultivada.
- **Vegetação:** bosques pequenos e esparsos, carvalhos isolados nas estradas, campos lavrados entre eles.
- **Cor base:** `#cfc79a` — pergaminho quente.
- **Assets:** `hill` · `forest_cluster` · `oak_tree` (2×) e `pine_tree` (1×) · `field`

É a região mais "arrumada" do mapa: pouca mata, muita cerca, muita estrada.

### Bosque de Elmwood — floresta temperada densa
- **Terreno:** relevo baixo e ondulado, quase todo coberto.
- **Vegetação:** a mais densa do reino — 96 manchas de floresta por légua² contra 20 do Coração. Pinheiro dominante, carvalho como contraponto.
- **Cor base:** `#b9c39a` — verde-acinzentado.
- **Assets:** `forest_cluster` (denso, escala até 1.6×) · `hill` (pouco) · `pine_tree` (2×) e `oak_tree` (1×)

### Passo de Pedra Cinza — alpino / mineral
- **Terreno:** cadeias de montanha com pico nevado, contrafortes, rocha exposta.
- **Vegetação:** rala e só conífera, agarrada às encostas baixas.
- **Cor base:** `#c2bdb2` — cinza frio.
- **Assets:** `mountain_large` (até 1.8×) · `mountain_small` · `pine_tree` apenas

É o único bioma sem folhagem larga — é o que faz a região ler como fria.

### Marchas de Karneth — estepe semiárida de fronteira
- **Terreno:** colinas secas de solo avermelhado, sem água.
- **Vegetação:** mato baixo e árvores retorcidas, nada fechado.
- **Cor base:** `#cbab84` — ocre terroso.
- **Assets:** `dry_hill` (a mais densa de todas as colinas) · `scrub_cluster` · `dry_tree`

Paleta e formas exclusivas — nenhum asset é compartilhado com outra região.

### Vale Sagrado — vale fértil e cultivado
- **Terreno:** colinas mansas fechando um vale, águas limpas.
- **Vegetação:** carvalho **e cipreste** (o cipreste é a assinatura visual da região), vinhedos em socalcos.
- **Cor base:** `#c9cd9e` — verde-oliva claro.
- **Assets:** `hill` · `forest_cluster` · `vineyard` · `oak_tree` + `cypress_tree`

### Campos Verdes — planície agrícola
- **Terreno:** quase plano de ponta a ponta.
- **Vegetação:** lavoura em vez de mata — searas de trigo cobrindo tudo, matas minúsculas e raras (densidade 9, a menor do mapa).
- **Cor base:** `#d6cf8f` — dourado-palha.
- **Assets:** `field` (2×) e `wheat_field` (1×) · `forest_cluster` raro · `oak_tree`

### Costa Dourada — litoral
- **Terreno:** falésias sobre o mar, baías, foz do Rio Serpente.
- **Vegetação:** pinheiro-do-mar e palmeira, salinas entre a praia e o interior.
- **Cor base:** `#d9cb96` — areia dourada.
- **Assets:** `cliff` · `forest_cluster` · `salt_pan` · `pine_tree` + `palm_tree`

As falésias só nascem a até 210 unidades da linha de costa — não aparecem terra adentro.

---

## 2. Lista de produção — 17 assets de natureza

| assetKey | O que é | Usado por |
| --- | --- | --- |
| `hill` | colina verde suave | Coração, Elmwood, Vale Sagrado |
| `dry_hill` | colina seca avermelhada | Karneth |
| `cliff` | falésia costeira | Costa Dourada |
| `mountain_large` | montanha grande com neve | Pedra Cinza |
| `mountain_small` | montanha menor | Pedra Cinza |
| `forest_cluster` | mancha de floresta | 5 regiões |
| `scrub_cluster` | moita de mato seco | Karneth |
| `oak_tree` | carvalho | Coração, Elmwood, Vale, Campos |
| `pine_tree` | pinheiro | Coração, Elmwood, Pedra Cinza, Costa |
| `dry_tree` | árvore retorcida e seca | Karneth |
| `cypress_tree` | cipreste | Vale Sagrado |
| `palm_tree` | palmeira | Costa Dourada |
| `field` | campo lavrado | Coração, Campos Verdes |
| `wheat_field` | seara de trigo | Campos Verdes |
| `vineyard` | vinhedo | Vale Sagrado |
| `salt_pan` | salina | Costa Dourada |
| `lake` | lago (POI do Lago Verde) | Elmwood |

> **`forest_cluster` é usado por cinco regiões com a mesma arte.** Se quiser que
> Elmwood não pareça o bosquezinho dos Campos Verdes, crie variantes
> (`forest_cluster_pine`, `forest_cluster_oak`) — é trocar uma string no
> `assetKeys` da camada, nada mais muda.

**Segundo lote (edifícios, 35 chaves):** castelos, cidades, templos, minas,
portos, pontes etc. Ainda não têm prompt escrito — peça quando quiser atacar.

---

## 3. Especificação dos arquivos

O código não precisa de ajuste nenhum se os arquivos seguirem isto:

| | |
| --- | --- |
| **Nome do arquivo** | exatamente o `assetKey` — `pine_tree.webp`, `mountain_large.webp` |
| **Formato** | WebP ou PNG, **fundo transparente** |
| **Canvas** | **quadrado** (o código assume proporção 1:1) |
| **Enquadramento** | objeto centrado na horizontal, preenchendo o quadro, com a **base apoiada a ~92% da altura** (uma folga de ~8% embaixo) |
| **Resolução** | 1024×1024 direto do gerador está ótimo; eu converto e otimizo |
| **Sombra** | uma sombra de contato suave por baixo ajuda — o código não desenha nenhuma |

**Você não precisa se preocupar com o tamanho relativo entre os assets.** Cada
um preenche o próprio quadro; a proporção entre montanha e carvalho é feita pelo
`size` do registro em [`mapAssets.ts`](../src/render/mapAssets.ts).

Os assets de **chão** (`field`, `wheat_field`, `vineyard`, `salt_pan`, `lake`)
são a exceção do enquadramento: são vistos de cima em perspectiva e ficam
**centrados no quadro**, sem base apoiada.

### Como aplicar

Solte os arquivos em **`src/assets/map/`**. Eles são detectados pelo nome e
substituem o placeholder automaticamente — sem editar código, sem registrar
nada. Se um nome não bater com nenhum `assetKey`, o console avisa em
desenvolvimento.

---

## 4. Prompts

Os prompts estão **em inglês** de propósito: os geradores de imagem respondem
bastante melhor assim, mesmo conversando em português com eles.

### 4.0 A tensão de estilo, resolvida

Duas coisas ditam a arte e puxam para lados diferentes:

- **pixel art medieval 32 bits** — estética de jogo;
- **"sensação de mapa de verdade"** — cartografia ilustrada.

Elas convivem numa única direção: **símbolo cartográfico em pixel art**. Não é a
árvore que você vê andando por baixo dela; é a árvore DESENHADA NUM MAPA — vista
de lado e de cima, estilizada, legível em tamanho pequeno, como nos mapas de
campanha dos jogos de estratégia da era 16/32 bits.

Isso decide três coisas nos prompts:

1. **Vista em elevação três-quartos**, nunca de cima puro. Mapa ilustrado mostra
   a árvore de perfil, plantada no chão.
2. **Silhueta acima de detalhe.** O elemento é pequeno na tela; o que identifica
   um pinheiro é o contorno triangular, não a textura da casca.
3. **Paleta curta e contorno definido.** É o que faz vários elementos diferentes
   parecerem do mesmo mundo.

### 4.1 O problema do gerador — e como contornar

**Gerador de imagem não faz pixel art de verdade.** Ele imita: a grade sai
irregular, a paleta escapa para centenas de cores, as bordas saem borradas. Sai
uma *ilustração com cara de pixel*, não pixel art.

A saída é gerar **grande e limpar depois**. Peça 1024×1024, e eu converto para
pixel art real com `tools/pixelize.py`, que faz o que o gerador não faz:

- reduz por **vizinho mais próximo** para a grade alvo (nada de borrão);
- **quantiza a paleta** para um número fixo de cores;
- limpa o **alpha** (sem franja semitransparente na borda).

Você gera e me manda como vier; a parte chata é minha.

### 4.2 Preâmbulo de estilo (cole antes de TODO prompt)

O maior risco num lote é a deriva de estilo. Mantenha este bloco fixo e troque
só a linha `Subject:`.

```
Pixel art sprite for the campaign map of a medieval-fantasy strategy game,
in the style of 16/32-bit era map symbols.
Three-quarter elevation view: the object is seen from the side and slightly
above, standing upright on the ground, the way a map illustration shows it —
NOT a top-down view.
Bold readable silhouette, strong dark outline, limited palette of about
16 colors, flat shading with a little dithering, light source from the
upper left.
Single isolated object, horizontally centered, filling the frame,
with a small dark contact shadow at its base.
Fully transparent background. Square image.
No ground, no terrain, no grass base, no text, no border, no frame,
no UI, no other objects.
Must stay recognizable when shrunk to 64 pixels.

Subject: <...>
```

### 4.3 Base e Coração de Valdória

```
Subject: a low rounded grassy hill, soft green slopes, a few grass tufts, gentle and welcoming.
Subject: a small cluster of four rounded broadleaf trees with full green canopies, forming one compact grove.
Subject: a single broad oak tree with a wide rounded canopy and a sturdy brown trunk.
Subject: a single tall conifer with layered dark-green branches and a narrow pointed top.
```

E o campo lavrado — este **é** visto de cima, então troque a linha de
enquadramento do preâmbulo por `Top-down view in slight perspective, flat
parcel, centered`:

```
Subject: a plowed farmland parcel, a rectangular plot seen in slight perspective, neat green-and-yellow crop rows, low earth border.
```

### 4.4 Bosque de Elmwood

```
Subject: a dense cluster of five tall dark-green pine trees packed tightly together, deep forest shadow between the trunks.
Subject: a single tall conifer with layered dark-green branches, slightly weathered, forest species.
```

### 4.5 Passo de Pedra Cinza

```
Subject: a tall rocky mountain peak with a snow-capped summit, sharp grey stone faces, steep cliffs, cold blue-grey shadows.
Subject: a smaller rocky mountain, bare grey stone with scree slopes, no snow, cold blue-grey shadows.
```

### 4.6 Marchas de Karneth

```
Subject: a dry hill of cracked reddish-ochre earth, bare and sun-baked, a few tufts of dead yellow grass.
Subject: a cluster of low dry shrubs, thorny and sparse, dusty olive and brown tones.
Subject: a single gnarled leafless tree with a twisted dark trunk and bare branches, dry and windbeaten.
```

### 4.7 Vale Sagrado

```
Subject: a single tall narrow cypress tree, dark green, slender and vertical, serene.
```

E o vinhedo — **visto de cima** (mesma troca de enquadramento do campo lavrado):

```
Subject: a vineyard parcel on a terraced slope, neat rows of grapevines on low wooden trellises, purple-green foliage.
```

### 4.8 Campos Verdes

Visto de cima:

```
Subject: a golden wheat field parcel, ripe wheat in neat rows, warm straw-yellow tones, low earth border.
```

### 4.9 Costa Dourada

```
Subject: a coastal cliff, a sandy-ochre rock face with visible strata and a grassy green top edge, sea-worn.
Subject: a single maritime pine with a windswept asymmetric canopy leaning inland.
```

Visto de cima:

```
Subject: a salt evaporation pond, shallow rectangular basins of pale water with white salt crusts along the low dividing walls.
```

---

## 5. Texturas de terreno — o segundo lote

Terreno, mar e rios **não são objetos contáveis**: são geometria contínua
calculada em tempo de execução. O Rio Serpente é uma polilinha cuja largura
varia ao longo do curso; as fronteiras são polígonos gerados por ruído e
precisam continuar polígonos para a conquista funcionar. Um PNG não representa
nada disso. Eles recebem **material**, não sprite.

| Elemento | Estratégia |
| --- | --- |
| Fill das regiões | textura seamless por bioma em `<pattern>` — 7 ladrilhos |
| Mar e rios | uma textura de água seamless — 1 ladrilho |
| Estradas e fronteiras | continuam vetoriais — são traçado, não superfície |
| Relevo | **procedural**, sem asset (ver §6) |

### A regra que não pode ser quebrada

**A textura carrega só o DETALHE, em tons quase neutros. A cor vem do polígono
por baixo** (`region.palette.land`), e o ladrilho entra por cima em `multiply`.

Isso não é preciosismo: o briefing prevê uma Casa conquistar território e a
região mudar de cor. Se o verde do Bosque de Elmwood estiver assado no ladrilho,
não há o que recolorir. Mantendo a cor no polígono, conquista, feudo dentro de
região alheia e divisão de território continuam sendo troca de uma cor.

O **contraste baixo** serve a isso e, de quebra, esconde emenda mal resolvida.

### Arquivos

| | |
| --- | --- |
| **Nome** | exatamente a chave — `terrain_plains.webp`, `water.webp` |
| **Pasta** | `src/assets/textures/` (detecção automática, sem editar código) |
| **Formato** | WebP ou PNG, **opaco** (textura não precisa de transparência) |
| **Resolução** | 1024×1024, quadrado |
| **Requisito** | **seamless** — as quatro bordas têm de casar |

As oito chaves: `terrain_temperate_valley` · `terrain_dense_forest` ·
`terrain_alpine` · `terrain_steppe_march` · `terrain_sacred_valley` ·
`terrain_plains` · `terrain_coastal` · `water`

O tamanho do ladrilho em unidades do mundo e a opacidade de cada um ficam em
[`mapTextures.ts`](../src/render/mapTextures.ts) — dá para afinar depois sem
tocar na arte.

### Preâmbulo de textura (fixo, cole antes de todo prompt)

```
Seamless tileable pixel art ground texture for the campaign map of a
medieval-fantasy strategy game, in the style of 16/32-bit era maps.
Top-down flat view. Perfectly flat and even lighting: no shadows,
no highlights, no vignette, no sense of depth.
Limited palette of about 8 colors, subtle dithering for shading.
Near-neutral desaturated tones — the engine tints this texture,
so stay close to grey-beige with only a hint of its own hue.
Low contrast.
Ground surface detail ONLY: no trees, no rocks, no buildings, no objects,
no text, no border, no frame.
Must tile perfectly: all four edges wrap seamlessly, no visible seam,
and no strong distinctive feature that would read as repeating wallpaper.
Square image, 1024x1024.

Subject: <...>
```

> Textura também passa pelo `tools/pixelize.py`, mas com `--grid 64
> --colors 8` e **sem** reemoldurar — ladrilho não tem base apoiada.

### Os oito `Subject:`

```
terrain_temperate_valley
Subject: short cropped meadow grass with faint plough furrows and patches of bare warm earth, cultivated and gentle.

terrain_dense_forest
Subject: forest floor of deep moss and fallen pine needles, dense fine organic texture, faint leaf litter.

terrain_alpine
Subject: bare cold stone ground, cracked rock with fine gravel and scree, a sparse dusting of frost.

terrain_steppe_march
Subject: dry cracked earth with coarse sand and sparse brittle grass stubble, wind-swept and sun-baked.

terrain_sacred_valley
Subject: soft tended meadow with fine grass and faint terraced contour lines, calm and orderly.

terrain_plains
Subject: wide open farmland soil with long parallel plough furrows and short crop stubble.

terrain_coastal
Subject: coarse sand mixed with fine shell grit and sparse dune grass, faint wind ripples.

water
Subject: calm water surface with fine painterly ripples and subtle current streaks.
```

> O `water` é a **exceção do preâmbulo**: pode manter o próprio azul, porque é
> um material único e não é tingido por região.

> Gerador de imagem é ruim em seamless. Peça, mas **verifique montando o tile
> 2×2** antes de gerar os oito. Comece pelo `terrain_plains`, que é o mais
> exposto no mapa.

---

## 6. Chão ladrilhado (autotile dual-grid)

Além do `<pattern>` da seção anterior, o chão pode ser desenhado como **tilemap
com autotile**, que é o que dá transição de verdade entre biomas.

**Dual-grid:** a grade de desenho fica deslocada meia célula, então cada tile
olha só os 4 cantos que o cercam — 16 combinações, 15 peças úteis. Um autotile
clássico olharia os 8 vizinhos e exigiria 47 peças.

    bit 8 = sup. esquerdo    bit 4 = sup. direito
    bit 2 = inf. esquerdo    bit 1 = inf. direito

### As peças são geradas, não compradas

Quase nenhum tileset de mercado traz as 15 peças de transição **entre dois
biomas** — eles trazem tiles de preenchimento, caminho e borda de elevação.
Então [`tilesets.ts`](../src/render/tilesets.ts) **constrói** as peças a partir
de um tile cheio: recorta o quadrante de cada canto ligado e aplica **dither
Bayer 4×4** na junta, que é exatamente como a era 16/32 bits fazia transição.

Consequência prática: **qualquer textura de chão decente vira um autotile
completo.** Você compra pelo que gosta, não pelo formato.

### Uma folha serve vários biomas

O `tint` multiplica uma cor sobre o tile, então uma única folha de grama atende
seis biomas. Mesma regra do resto do projeto — a arte carrega o detalhe, a cor
vem dos dados — e é o que mantém a conquista recolorindo território.

### O que colocar em `src/assets/tilesets/`

Arquivos nomeados pela **folha**, não pelo bioma (`grass.png`, `stone.png`).
O mapeamento folha → bioma, recorte e tinta fica em `terrainTilesets`.

### Escala — o ponto que decide a compra

Tileset de RPG top-down é **escala de caminhada**: 32 px ≈ 1 a 2 metros. Num
mapa de reino, esse detalhe some na redução até um zoom alto. Por isso o chão
ladrilhado só entra a partir de `TILES_MIN_ZOOM` e só lê bem de ~5× para cima;
abaixo disso vale mais a cor chapada, com desvanecimento entre os dois.

`TERRAIN_CELL` está calibrado para um castelo ocupar cerca de **duas células** —
a proporção dos mapas de estratégia clássicos, com chão em escala de caminhada e
construções em escala de símbolo.

---

## 7. Cobertura do solo — as massas

O terreno de um mapa ilustrado é feito de MASSAS, não de ícones soltos: a
floresta é uma mancha com silhueta própria, e as árvores desenhadas em cima são
o acabamento dela.

[`landcover.ts`](../src/world/landcover.ts) gera essas manchas por semente fixa
a partir do bioma e do polígono da região — floresta, lavoura, monte e mato.
São dados como todo o resto: a cor sai da paleta da região (uma conquista
repinta a mata junto), e podem ser trocadas por formas autorais depois sem que
nada mude.

O espalhamento de cenário respeita as massas via `within`: a árvore nasce DENTRO
da floresta, o campo dentro da lavoura, a montanha dentro do monte. É isso que
tira o terreno do vazio na aproximação.

---

## 8. Relevo — procedural, sem asset

Não há heightmap autorado. O campo de altura é derivado do **próprio cenário já
espalhado**: onde `nature.ts` colocou montanha ou colina, o terreno é alto
([`relief.ts`](../src/world/relief.ts)).

Duas vantagens sobre desenhar um heightmap à mão: concorda automaticamente com a
geografia — a sombra nasce exatamente onde estão as montanhas de Pedra Cinza — e
acompanha sozinho qualquer mudança de escala, densidade ou bioma.

O campo é grosseiro de propósito. Serve para dar **massa** ao relevo na vista de
longe, onde os sprites de montanha são pequenos demais para ler; de perto, quem
conta a história do relevo são os próprios sprites, e o sombreado recua.

Se um dia quiser relevo pintado à mão, o caminho é substituir `reliefCells` por
um heightmap real — a camada de desenho não muda.

---

## 9. Duas lacunas e uma decisão pendente

**Faltam assets** para coisas que o briefing original pedia e que hoje não
existem no mapa:

- **clareiras** em Elmwood;
- **desfiladeiros e pedreiras** em Pedra Cinza;
- **áreas devastadas pela guerra** em Karneth — hoje a região é só estepe seca,
  sem nenhuma cicatriz de conflito no terreno.

Cada uma é uma camada nova de ~4 linhas em `nature.ts` mais o asset.

**A palmeira da Costa Dourada destoa** do resto, que é todo europeu temperado.
Se a Costa Dourada é mediterrânea, faz sentido; se é um litoral do norte, o
lugar dela é de um salgueiro ou de um pinheiro-marítimo. É trocar uma string em
`nature.ts` — decida antes de gerar a arte.
