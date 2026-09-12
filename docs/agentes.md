# Agentes do mapa — como gerar e aplicar

Um **agente** é qualquer figura que anda pelas estradas de Valdória: o viajante
do jogador, lordes, mensageiros, caravanas, patrulhas, exércitos pequenos.
Todos usam o mesmo componente (`src/render/agents/MapAgentSprite.tsx`) — o que
muda é a folha de sprites.

---

## 1. O prompt

Cole exatamente como está, trocando **só o bloco `SUBJECT`**. Está em inglês de
propósito: os geradores seguem instruções de layout bem melhor em inglês, e o
layout é a parte que não pode falhar.

```
Character spritesheet for a top-down strategy map game, 3/4 view.

LAYOUT — follow exactly:
- ONE image, square canvas, 2048x2048, TRANSPARENT background (PNG with alpha).
- Exactly 16 figures in a strict 4x4 grid: 4 rows, 4 columns.
- Every figure fully inside its own cell with clear empty space on all four
  sides. No figure may touch, overlap or bleed into a neighbour — not even a
  banner, spear, tail, cloak or hoof. The gaps between rows and between columns
  must be completely empty across the whole width and height of the image.
- No background, no ground, no grass, no cast shadow, no drop shadow, no boxes,
  no frames, no grid lines, no text, no labels, no numbers, no watermark.

ROWS ARE DIRECTIONS — the same character seen from four angles:
- Row 1 (top): moving AWAY from the viewer toward the UPPER-LEFT. We see the
  character's back; head points left, body recedes to the lower right.
- Row 2: moving AWAY from the viewer toward the UPPER-RIGHT. We see the back;
  head points right, body recedes to the lower left.
- Row 3: moving TOWARD the viewer toward the LOWER-LEFT. We see the front;
  head and chest point left.
- Row 4 (bottom): moving TOWARD the viewer toward the LOWER-RIGHT. We see the
  front; head and chest point right.

COLUMNS ARE THE WALK CYCLE — the 4 columns of a row are 4 frames of one
looping walk cycle, in order, legs clearly in different positions, frame 4
looping cleanly back into frame 1.

CONSISTENCY — the same character in all 16 frames:
- identical costume, colours, proportions and equipment;
- identical size and identical eye level in every cell — never zoom in or out
  between frames;
- feet or hooves resting at the same height inside each cell;
- the same light in all 16: soft light from the upper left.

STYLE:
- 32-bit era pixel art, medieval European, readable as a small map token.
- Limited palette, clean silhouette, crisp edges, no blurry halo.
- Muted, neutral colours — this unit gets recoloured per House later, so avoid
  strong saturated identity colours.

SUBJECT:
<descreva aqui o personagem, em inglês, 1 a 3 linhas>
```

### Exemplos de `SUBJECT`

| agente | linha |
|---|---|
| viajante | `A mounted knight on a brown horse, mail hauberk, conical nasal helm, pale cloak, kite shield, carrying a plain banner on a pole.` |
| mensageiro | `A light rider on a fast grey horse, no armour, short travelling cloak, leather satchel at the hip, no banner.` |
| caravana | `A merchant with a loaded pack mule, hooded wool robe, crates and bundles roped to the animal.` |
| patrulha | `Two footmen walking side by side, padded gambeson, round shields, spears held upright.` |
| lorde | `A nobleman on a caparisoned warhorse, polished plate over a surcoat, open bascinet, fur-lined mantle.` |

---

## 2. O que quebra o processo

Estas três, na prática, são as únicas que dão trabalho:

- **Figuras encostando umas nas outras.** A ferramenta separa os sprites pelo
  alfa; se a bandeira de um invade a célula do outro, os dezesseis viram menos
  do que dezesseis e ela recusa a folha. É a falha mais comum.
- **Sombra no chão.** Vem colada no sprite e acompanha a figura voando sobre o
  mapa. A sombra é desenhada pelo jogo.
- **Tamanho variando entre quadros.** O gerador adora aproximar num quadro e
  afastar no outro. A ferramenta alinha o ponto de apoio, mas não conserta
  escala: o agente fica "pulsando".

Se vier errado, gere de novo — sai mais rápido que consertar.

---

## 3. Aplicar

Um comando:

```bash
python3 tools/pack-agent-sheet.py entrada.png src/assets/agents/nome.png --pixel 64 --colors 32
```

Ele acha cada sprite pelo alfa, mede onde ficam os **pés** e reempacota numa
grade regular com o ponto de apoio sempre no mesmo lugar da célula — é isso que
faz o agente pisar na estrada em vez de escorregar de lado a cada quadro.
Depois converte em pixel art de verdade: redução por média de área, paleta
reduzida e alfa binário.

O `--pixel` existe porque os geradores entregam arte **pintada** mesmo quando o
prompt pede pixel art. Para manter a arte como veio, é só omitir a opção.

A ferramenta imprime o tamanho da célula. Registre em
`src/render/agents/agentSheets.ts`:

```ts
mensageiro: {
  url: mensageiro,
  rows: 4,
  cols: 4,
  cellWidth: 64,     // o que a ferramenta imprimiu
  cellHeight: 64,
  fps: 8,
  shadowWidth: 0.34,
  pixelArt: true,
},
```

A arte original vai para `src/assets/source-art/`, intocada.

---

## 4. Ordem das linhas

`NW, NE, SW, SE` — de cima para baixo, como o prompt pede. Se uma folha vier
fora de ordem, não mexa na arte: reordene em `AGENT_DIRECTIONS`, que é de onde
o componente tira a linha de cada direção.
