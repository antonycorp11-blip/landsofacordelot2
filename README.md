# Dissonância

Roguelike incremental com tema de teoria musical. Você é a **batuta do maestro**. Notas-monstro desafinadas avançam de todos os lados no ritmo da música para calar a **Lyra**, a cantora no centro do palco. Corte as notas passando o mouse ou arrastando o dedo por cima delas.

## Como jogar

- **Cortar:** passe o mouse ou arraste o dedo sobre as notas. Cada corte toca a nota do monstro e gasta **fôlego**.
- **No tempo:** golpes na batida do metrônomo causam mais dano. A batida aparece no anel dourado e nos pontos da HUD.
- **Acordes:** corte as 3 notas de um acorde num traço só (por exemplo Dó, Mi e Sol para o acorde I) e solte uma explosão harmônica.
- **Escala:** 3 notas seguidas em ordem (Dó, Ré, Mi…) devolvem fôlego.
- **Concerto:** são 5 movimentos. O último traz o chefe **Trítono**.
- **Motivos:** cortar notas enche a inspiração. A cada nível você escolhe 1 de 3 motivos, melhorias que valem só para aquele concerto.
- **Evolução:** as notas ♪ ficam com você para a árvore, que tem 6 ramos: Melodia, Fôlego, Ritmo, Harmonia, Lyra e Partitura. A árvore libera novos acordes (ii, vi, iii, V7) e coloca novos motivos no sorteio.
- **Ciclo das quintas:** vencer um concerto libera a próxima tonalidade (Dó → Sol → Ré…). Cada uma é mais difícil e mais rica. Os chefes dão **partituras**, que pagam os nós especiais da árvore.

### Inimigos

- **Semínima**, **Colcheia**, **Mínima** e **Semibreve:** as figuras musicais.
- **Pausa:** só pode ser cortada entre os tempos.
- **Sustenido:** nota fora da tonalidade, que não forma acordes.
- **Bemol:** fica longe e atira notas desafinadas na Lyra.
- **Trítono:** o chefe.

Todo o visual é desenhado por código e todo o som é sintetizado na hora com WebAudio, sem imagens nem arquivos de áudio.

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:5180
npm test           # regras, teoria, perfil e bot de equilíbrio
npm run build
```

- `src/game/sim.ts`: simulação em passo fixo, sem DOM.
- `src/audio/synth.ts`: sintetizador.
- `src/render/scene.ts`: desenho.
- `src/ui/`: HUD, tutorial, motivos e camarim (menu).
