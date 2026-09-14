# Arte da história — atlas expressivos e objetos

Entrega gerada com a ferramenta ImageGen integrada e aplicada ao jogo em
14/09/2026. A direção do elenco vem de [`retratos.md`](retratos.md), adaptada
à estética **32-bit pixel art** que já orienta o mapa.

## O que entrou

- Dezesseis atlas de personagem com seis quadros: neutro, atento, duro,
  abalado, divertido e exausto.
- Um atlas do mensageiro em três quadros: urgente, entregando a caixa e indo.
- Carruagem sem brasão em três estados: intacta, tombada e saqueada.
- Selo Real em quatro estados: caixa fechada, caixa aberta, selo isolado e
  selo quebrado.

Os atlas finais ficam em `src/assets/story/`. Cada quadro de retrato mede
256 × 256; os seis quadros formam uma grade 3 × 2. O componente
`ExpressionPortrait` escolhe o quadro pela emoção declarada nos dados da cena.
Uma sequência curta permite que a expressão mude enquanto a fala está aberta.

## Conjunto de prompts

Todos os personagens reutilizaram a descrição individual de `retratos.md` e a
seguinte âncora:

> Production-ready expression sheet in exactly 3 columns × 2 rows. Grounded
> medieval 32-bit era pixel art, crisp deliberate pixels, limited natural
> palette, no antialiasing, no text, no decorative frame, no weapon or crown.
> Same person, same three-quarter bust, camera, warm left light / cool right
> shadow, clothing, and plain dark desaturated green background in every equal
> square panel. Expressions in reading order: neutral; attentive; hard;
> shaken; subtly amused without teeth; exhausted. Facial emotion readable at
> 64px. Sheet only.

Retratos antigos foram fornecidos como referência de identidade quando já
existiam. Aled, Caelan, Elira, Venna, Harn e o mensageiro foram gerados a
partir do brief escrito.

A carruagem foi pedida como uma folha horizontal com três estados do mesmo
veículo, em vista ortográfica três-quartos, madeira escura, lona azul-petróleo,
ferragens, cavalos e nenhuma heráldica. O selo foi pedido como folha horizontal
com quatro estados do mesmo objeto, ouro envelhecido, sete pontas, balança e o
laço de chancelaria descrito na história.

## Uso nas cenas

`portraitKey`, `expression` e `expressionSequence` pertencem ao falante de um
`SceneBeat`. `art` pertence ao momento ou ao resultado. A cena da carruagem já
serve de referência completa: Harn usa duas emoções, o mensageiro usa três
estados, e caixa e selo entram exatamente quando são vistos.

As cenas futuras da campanha podem usar os mesmos atlas passando o
`portraitAssetKey` do personagem para `DialogueScreen`. Os líderes de Casa já
estão ligados aos novos atlas por esse caminho.
