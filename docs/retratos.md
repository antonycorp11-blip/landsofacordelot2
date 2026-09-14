# Retratos — referência para gerar as faces

Para gerar retratos com várias expressões e usar nos diálogos.

**Prioridade 1** é quem fala na campanha principal. **Prioridade 2** são
lordes que aparecem em audiências e contratos. Se for gerar só uma parte,
gere a prioridade 1 inteira antes de começar a 2.

---

## 1. Como gerar

### Âncora de estilo — cole no fim de TODO prompt

> Retrato de busto, três quartos de perfil, olhando para quem vê. Pintura
> digital a óleo, pincelada visível, luz lateral quente vinda da esquerda e
> sombra fria à direita. Fundo liso verde-escuro acinzentado, sem cenário e
> sem objetos. Realismo medieval sóbrio: sem brilho, sem fantasia, sem armadura
> polida, sem maquiagem moderna, sem dentes perfeitos. Pele com textura, poros,
> rugas e imperfeições reais. Enquadramento cabeça e ombros, cabeça ocupando
> cerca de 60% da altura, olhos na linha do terço superior. Proporção 1:1.

### A ordem importa

1. Gere primeiro a **expressão neutra**. Repita até a cara ser a cara.
2. Use essa imagem como **referência** (image-to-image / character reference)
   para todas as outras expressões da mesma pessoa. Sem isso, cada expressão
   vira uma pessoa diferente, e o diálogo fica com cinco atores no papel de um.
3. Mantenha **a mesma semente** quando a ferramenta permitir.
4. Mude **só** a linha de expressão entre uma geração e outra. Não mexa em
   cabelo, roupa, luz nem enquadramento.

### As seis expressões

| # | Linha para colar no prompt |
| --- | --- |
| 1 | **Neutra** — expressão neutra, boca fechada e relaxada, olhando para quem vê |
| 2 | **Atenta** — sobrancelhas levemente juntas, queixo um pouco abaixado, avaliando quem está à frente |
| 3 | **Dura** — mandíbula travada, olhar fixo e frio, boca numa linha reta |
| 4 | **Abalada** — olhos arregalados, sobrancelhas erguidas por dentro, lábios entreabertos, o sangue saindo do rosto |
| 5 | **Divertida** — canto da boca erguido só de um lado, olhos semicerrados de quem achou graça sem rir |
| 6 | **Exausta** — pálpebras pesadas, olhar baixo e desfocado, ombros caídos, rosto sem tensão nenhuma |

Seis por pessoa dá conta de quase toda cena escrita. Onde faz falta uma
sétima, ela está anotada no personagem.

### Formato de entrega

`1024×1024` é suficiente: no diálogo a face aparece pequena, ao lado da fala.
Salve como `<id>_<expressao>.png`, e teste cada uma **a 64 pixels** — se duas
pessoas ficam parecidas nesse tamanho, o problema é o desenho e não o arquivo.
É por isso que quase todo mundo aqui tem uma marca de silhueta: barba em
ponta, touca, careca, coque, orelha faltando.

---

## 2. Prioridade 1 — a campanha principal

### Protetor Aldren Valdória
*Protetor do Reino · Casa Valdória (azul #2457A6) · 68 anos*
**Quem é:** herdou um plano de três gerações e não tem coragem de pará-lo nem
de terminá-lo. Não é vilão. É um homem cansado.

> Homem de 68 anos, alto e magro demais para as próprias roupas, ombros caídos
> para dentro. Rosto comprido, maçãs afundadas, bolsas escuras sob os olhos.
> Cabelo branco fino puxado para trás com entradas fundas; barba curta branca
> mal aparada. Olhos cinzentos de pálpebras pesadas. Gola alta de veludo
> azul-escuro, corrente de ouro fina, nenhuma joia grande e nenhuma coroa — o
> homem evita de propósito parecer rei. Cara de quem não dorme há anos.

**Sétima:** *"culpa"* — olhar desviado para baixo e para o lado, mão perto da
boca, rosto de quem vai dizer uma coisa e desiste.

---

### Lorde Edran Silvarden
*Senhor de Elmwood · Casa Silvarden (verde #356A46) · 52 anos*
**Quem é:** o homem que conta a história ao jogador no Arco I, e o primeiro
que ele trai ou poupa. O selo é da Casa dele.

> Homem de 52 anos, corpo pesado de quem já foi forte, pescoço largo. Rosto
> quadrado de queixo grande, pele avermelhada de vento e de vinho. Cabelo
> castanho grisalho curto e repartido, costeletas espessas. Sobrancelhas
> grossas sobre olhos castanho-escuros pequenos e muito atentos. Cicatriz
> velha e fina cortando a sobrancelha esquerda. Gibão verde-musgo com bordado
> de folha de carvalho, gola de pele de raposa. Um homem acostumado a ser
> obedecido.

**A expressão 4 é a dele.** É o rosto que perde a cor quando vê a joia, e é
uma das imagens mais importantes do jogo. Gere essa várias vezes.

---

### Lorde Garrick Karneth
*Senhor das Marchas · Casa Karneth (vermelho #8D2635) · 45 anos*
**Quem é:** odeia o jogador desde o primeiro dia e é o único que diz a verdade
na cara. *"É meu. Venha buscar."*

> Homem de 45 anos, tronco largo e pescoço de lutador. Rosto anguloso, nariz
> quebrado duas vezes e mal endireitado, mandíbula pesada. Cabelo preto
> curtíssimo, raspado nas laterais, grisalho nas têmporas; barba por fazer de
> três dias. Olhos verde-acinzentados muito diretos, que quase não piscam.
> Cicatriz atravessando a bochecha direita até o lábio, puxando aquele canto
> da boca um pouco para cima — **parece um meio sorriso mesmo quando não é**.
> Cota de malha sob sobreveste vermelho-escuro sem enfeite nenhum.

---

### Lorde Boran Dravenor
*Senhor do Passo · Casa Dravenor (cinza #4D5661) · 58 anos*
**Quem é:** três anos trancado em Pedra Cinza com a confissão de Antônios na
mão. Chegou perto do nome do herdeiro e parou de propósito.

> Homem de 58 anos que foi grande e encolheu: roupa boa sobrando no corpo.
> Pele muito pálida de quem não vê sol há três anos. Rosto ossudo de têmporas
> fundas. Cabelo grisalho até o ombro, sem corte há muito tempo, preso atrás
> com um cordão; barba cinzenta desigual. Olhos azul-claros, arregalados de
> quem lê à luz de vela, olheiras roxas. Unhas com tinta preta. Capa
> cinza-ardósia gasta nos cotovelos, gola de lã.

**Sétima:** *"e se existir alguém com mais direito que você?"* — olhar direto
e muito quieto, cabeça levemente inclinada, sem hostilidade nenhuma. É a
pergunta que o jogo faz no fim, e ele é o primeiro a fazê-la.

---

### Mestre Aled Vern
*Escrivão de Elmwood · sem Casa · 41 anos*
**Quem é:** **o herdeiro de Antônios, e não sabe.** Um dos quatro que olham o
selo na primeira hora de jogo. O jogador só descobre quem ele é vinte e cinco
horas depois.

> Homem de 41 anos, magro, ombros estreitos e curvados de mesa. **Rosto comum
> — o tipo de rosto que ninguém descreve depois.** Pele clara amarelada de
> quem trabalha dentro de casa, barba rala castanha aparada sem cuidado.
> Cabelo castanho ralo no alto e um pouco comprido atrás. Olhos castanhos de
> míope, apertados para focar, com um vinco fundo entre as sobrancelhas de
> tanto forçar a vista. Dedos manchados de tinta preta, calo no dedo médio da
> mão direita. Lã marrom sem cor de Casa nenhuma, punhos puídos.

**Regra de desenho:** nada nele pode sugerir realeza. Sem queixo nobre, sem
porte, sem olhar. Se a imagem ficar bonita, refaça. **Ele tem de ser o menos
memorável da galeria** — é isso que faz a revelação funcionar.

**Sétima:** *"não"* — sorriso pequeno e triste, cabeça balançando de leve, uma
recusa gentil e definitiva.

---

### Lady Ilyra Veyr
*Senhora de Veyr · Casa Veyr (azul-petróleo #317A82) · 35 anos*
**Quem é:** nunca responde o que foi perguntado. Chega antes.

> Mulher de 35 anos, alta, de postura muito reta, magra de andar muito. Rosto
> estreito de maçãs altas e queixo fino, pele morena clara. Cabelo preto liso
> num coque baixo apertado, sem um fio solto. Olhos castanho-escuros, muito
> quietos, que param na pessoa um segundo a mais do que o confortável. Boca
> pequena que quase não se mexe. Casaco de viagem azul-petróleo de colarinho
> alto fechado até o pescoço, luvas de couro fino, um brinco simples.

**Sétima:** *"eu já sabia"* — sobrancelha erguida, boca imóvel, olhar de
paciência. Ela usa muito.

---

### Príncipe Caelan Valdória
*Herdeiro do Protetor · Casa Valdória · 29 anos*
**Quem é:** terminaria o plano do pai, e acha que estaria salvando o reino.

> Homem de 29 anos, bonito de um jeito limpo e sem graça, porte atlético de
> treino e não de guerra. Rosto simétrico de mandíbula definida, pele clara bem
> cuidada, barba feita. Cabelo castanho-escuro ondulado, curto, sempre em
> ordem. **Olhos azul-claros abertos e francos, que olham nos olhos e não
> desviam.** Sorri com facilidade, e o sorriso chega aos olhos. Gibão azul bem
> talhado, gola branca impecável.

**Regra de desenho:** ele deve parecer a melhor pessoa da sala. Nada de olhar
de esguelha, sombra no rosto ou sorriso torto. **Um vilão óbvio estraga o
personagem.** Use a expressão 5 com generosidade e a 3 quase nunca.

---

### Princesa Elira Valdória
*Casa Valdória · 24 anos*
**Quem é:** a única da corte que leu o texto original da lei de Antônios. Não
contou a ninguém.

> Mulher de 24 anos, baixa e miúda, de ombros pequenos. Rosto redondo e jovem
> demais para o que ela sabe, pele clara com sardas no nariz. Cabelo
> castanho-claro cacheado, preso pela metade e sempre escapando. Olhos
> castanho-esverdeados, rápidos, que percorrem a sala antes de pousar.
> Sobrancelhas muito expressivas. Vestido azul simples, sem a ostentação da
> corte, com uma mancha de tinta na barra da manga.

---

### Arcebispa Yseld Caelmont
*Arcebispa de Luminária · Casa Caelmont (dourado #E1C86E) · 60 anos*
**Quem é:** o muro do Arco VI. Convencê-la é destruir uma fé.

> Mulher de 60 anos, alta, de costas retas, imponente sem esforço nenhum.
> Rosto largo de maçãs fortes e boca firme numa linha reta. Pele morena com
> manchas de idade. Cabelo branco inteiramente coberto pela touca
> eclesiástica, de modo que só as sobrancelhas escuras aparecem e contrastam.
> Olhos castanho-escuros, calmos, que julgam devagar. Rugas fundas nas
> laterais da boca, de anos falando em público. Manto creme e dourado, estola
> bordada, anel grande de ofício.

**Regra de desenho:** ela nunca levanta a voz. A expressão 3 dela é fria e
parada, nunca furiosa.

---

### Irmã Venna
*Templo de Luminária · sem Casa · 66 anos*
**Quem é:** reza há quarenta anos diante de uma peça de ouro sem saber que é
um selo real.

> Mulher de 66 anos, pequena e encurvada, com mãos grandes demais para o
> corpo, deformadas de artrite e de frio. Rosto enrugado e doce, bochechas
> caídas, sorriso fácil que mostra dentes faltando. Pele clara curtida. Cabelo
> branco fino sob véu de linho cru. Olhos azul-claros aguados, com catarata
> começando num deles. Hábito de lã crua sem enfeite, cordão simples.

**Regra de desenho:** ela tem de ser alguém que o jogador não quer magoar.
Isso é a metade do peso do Arco VI.

---

### O mensageiro
*A carruagem, primeira hora · sem brasão · 30 anos*
**Quem é:** morre nos primeiros minutos e entrega o selo. **Precisa de três
imagens, não seis.**

> Homem de 30 anos, magro e marcado de estrada. Rosto sujo de terra e sangue,
> lábio partido, suor frio. Cabelo castanho molhado colado na testa, barba de
> dias. Olhos castanhos que já não focam direito. Couro de mensageiro **sem
> brasão nenhum, de propósito.** Pele acinzentada.

**As três:** *consciente e urgente* · *estendendo a caixa* · *indo* (olhar
perdendo o foco, boca entreaberta, rosto relaxando).

---

## 3. Prioridade 2 — os outros lordes

### Lady Seraphine Aurenna
*Senhora da Costa Dourada · Casa Aurenna (ouro #C89C32) · 44 anos*

> Mulher de 44 anos, cheia de corpo, ombros largos de gente que trabalha,
> postura confortável. Rosto redondo de nariz forte e boca grande que sorri com
> facilidade e não necessariamente com simpatia. Pele morena queimada de sol e
> de sal. Cabelo castanho-avermelhado num rolo prático, com fios clareados
> pelo sol. Olhos cor de mel, espertos. Brincos de ouro pesados e anéis em
> quase todos os dedos — riqueza que se vê. Casaco dourado-âmbar com fecho de
> âncora, mangas arregaçadas.

---

### Lorde Tomas Elmwood
*Senhor dos Campos Verdes · Casa Elmwood (verde-oliva #6B8B43) · 50 anos*
Foi a Casa dele que vendeu um selo há gerações. A família finge que não.

> Homem de 50 anos, alto e desengonçado, de mãos enormes e calejadas. Rosto
> comprido e simpático, orelhas grandes, pele avermelhada de campo. Cabelo
> louro-escuro grisalho, ralo no alto, aparado por alguém da casa e não por
> barbeiro; bigode espesso. Olhos azuis pequenos e amistosos, com pés-de-galinha
> fundos. Verde-oliva bom mas amassado, botas de montar sujas de terra.

**A ideia:** um senhor de terra que se parece com os lavradores dele — e é
exatamente isso que a família dele odeia.

---

### Lorde-Príncipe Cassian Caelmont
*Lorde-Príncipe do Vale Sagrado · Casa Caelmont · 38 anos*

> Homem de 38 anos, esbelto, de movimentos contidos, elegante de um jeito
> frio. Rosto estreito e pálido, nariz afilado, lábios finos, pele lisa sem
> barba. Cabelo castanho-claro liso na altura do queixo, repartido ao meio,
> sempre impecável. Olhos cinza-esverdeados de pálpebras baixas, com ar de
> tédio. Creme e ouro com bordado religioso pesado, mais rico que o de
> qualquer sacerdote, e uma cruz do vale no peito.

---

### Lorde Vaelor Morvath
*Senhor de Morvath · Casa Morvath (roxo #65458D) · 47 anos*
Morvath saiu da própria Valdória. A Casa mais perigosa do tabuleiro.

> Homem de 47 anos, de altura média e corpo compacto, muito quieto no corpo.
> Rosto duro de ossos fortes, pele clara acinzentada. Cabelo preto liso puxado
> para trás com óleo, grisalho nas têmporas, preso num rabo curto na nuca.
> Barba preta cerrada aparada em ponta. Olhos escuros e fundos sob a testa,
> difíceis de ler. **A ponta de uma orelha faltando.** Roxo-escuro de corte
> valdoriano mas sem os dourados — a família copia o que perdeu.

**Regra de desenho:** o **nariz e a testa dele têm de lembrar os de Aldren
Valdória**, e isso é para ser notado. São a mesma família.

---

### Lorde Edric Rosethorne
*Senhor de Rosethorne · Casa Rosethorne (vinho-rosado #87455E) · 55 anos*
Vende selos falsos com certificado de autenticidade carimbado por ele mesmo.

> Homem de 55 anos, baixo e roliço, de rosto rosado e alegre. Bochechas
> redondas, nariz de batata com veias aparentes. Careca no alto, com cabelo
> branco encaracolado nas laterais; bigode branco cuidado e encerado. Olhos
> azuis pequenos que desaparecem quando ele ri, e ele ri muito. Mãos pequenas
> e limpas de unhas feitas. Vinho-rosado com bordado exagerado, anéis demais,
> corrente de relógio.

**Sétima:** *"ofendido"* — sobrancelhas erguidas, mão no peito, indignação
absolutamente sincera. Ele nunca mentiu na vida, na opinião dele.

---

## 4. Os quatro jogáveis

Já têm retrato no jogo. Se forem refeitos, o enquadramento é o mesmo e a
idade é a que está nos dados — todos são jovens, e é isso que os separa da
galeria de lordes.

**Kael Arven**, 23, guerreiro de fronteira — ombros largos, cabelo escuro
cortado à faca, cicatriz de treino no antebraço, couro surrado sem brasão,
queimado de sol.

**Lyra Venn**, 22, filha de comerciantes — trança prática, olhos vivos que
avaliam preço, capa de viagem com muitos bolsos, mãos limpas mas nada macias.

**Edrian Vale**, 24, criado entre escribas — magro, roupa boa de segunda mão,
cabelo bem penteado, olhar que lê a sala antes de falar nela.

**Serah Elynn**, 21, devota sem posição — cabelo preso simples, lã crua, rosto
aberto e firme, sem nenhum ornamento religioso caro.

---

## 5. Ficando com a cara certa

- **Todo mundo tem uma marca de silhueta** — barba em ponta, touca, careca,
  coque apertado, orelha faltando, ombros caídos. A 64 pixels é só isso que
  sobra.
- **Ninguém sorri com os dentes**, exceto Rosethorne e Irmã Venna. É uma corte,
  não uma foto.
- **Idade é o que mais separa esta galeria.** Os lordes têm de 35 a 68 anos; os
  jogáveis, de 21 a 24. Se um lorde sair com cara de trinta, refaça.
- **Cor de Casa só na roupa**, nunca no fundo — o fundo é sempre o mesmo, ou os
  balões de fala ficam com dez cores brigando.
- **Nenhum capacete e nenhuma arma.** É retrato de conversa.
