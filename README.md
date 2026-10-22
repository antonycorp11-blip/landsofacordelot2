# Dissonância

Roguelike incremental em pixel art, visto de cima em isométrico, com tema de teoria musical. A jogabilidade segue a do *Outliers: Incrementum*.

**Você é o cursor**, a batuta do maestro. O seu irmão **Tito** segue pela masmorra tocando tambor, e os monstros desafinados querem calá-lo. Corte os monstros passando o mouse rápido ou arrastando o dedo por cima deles.

## Na masmorra

- **Corte:** cada acerto gasta **vigor**, o orbe amarelo. Sem vigor, a batuta não corta.
- **Combos:** acertar vários monstros no mesmo traço mostra **N Acertos!**.
- **Armadura:** monstros com armadura precisam ser **quebrados** antes de perder vida. Com a melhoria certa, monstros quase mortos são **executados**.
- **Marcados ◆:** dão cristais e vigor.
- **Teoria musical:**
  - Cada monstro carrega uma nota.
  - Cortar as 3 notas de um **acorde** num traço só (por exemplo Dó, Mi e Sol) causa uma explosão.
  - Cortar no ritmo do tambor do Tito causa dano extra (**No tempo!**).
  - Três notas seguidas em ordem formam uma **escala**.
- **Salas:** são várias salas em sequência. A câmera segue o Tito de uma sala para a outra, e o minimapa mostra o caminho. No fim fica o chefe **Maestro Trítono**.

## Entre as masmorras

- **HABILIDADES:** uma árvore que vai se revelando. Os nós `?` aparecem quando você compra um vizinho. Ela é paga com notas ♪, cristais ◆ e partituras ▤. Dá para liberar acordes menores, o V7, o golpe **Ciclo das Quintas** (desenhar um círculo em volta dos monstros), execução, Estado de Fluxo e outros.
- **MAPA:** vencer o chefe libera o próximo lugar, numa tonalidade nova do ciclo das quintas:
  - Porão do Teatro (Dó)
  - Conservatório (Sol)
  - Catedral do Órgão (Ré)
  - Ópera em Ruínas (Lá)
  - Coliseu dos Ecos (Mi)

Todo o visual é desenhado por código (sprites em texto) e todo o som é sintetizado em WebAudio: cada corte toca a nota do monstro.

## Desenvolvimento

```bash
npm install
npm run dev
npm test
npm run build
```
