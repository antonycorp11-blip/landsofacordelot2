# Poço Gravitacional

Tower defense incremental em que **você é um buraco negro**. O buraco segue o mouse (ou o dedo) e puxa as naves inimigas com a gravidade. O objetivo é arremessá-las umas contra as outras, contra asteroides e contra os satélites que orbitam o planeta-núcleo.

## Como jogar

| Ação | Computador | Celular |
| --- | --- | --- |
| Mover o buraco negro | mover o mouse | arrastar o dedo em qualquer lugar |
| Gravidade forte (gasta energia) | segurar o clique / Shift | segurar **Gravidade** ou encostar um 2º dedo |
| Pulso de repulsão | clique direito / Espaço | botão **Pulso** |
| Modo construção (para o tempo) | B ou **Construir** | **Construir** |
| Girar o anel escolhido | Q / E (1, 2, 3 escolhem o anel) | ⟲ ⟳ |
| Pausa | Esc / P | ❚❚ |

### Dano e recompensas

- **Impactos:** colisões em alta velocidade causam dano proporcional à velocidade e à massa do outro corpo. Inimigos esmagados valem 1,5× fragmentos.
- **Horizonte de eventos:** inimigos dentro dele se desfazem aos poucos.
- **Fragmentos ◆** compram e melhoram satélites durante a partida. Abates em sequência formam combo, até ×5.
- **Matéria escura** fica de uma partida para a outra e é gasta na árvore de **Evolução**, que tem três ramos: Singularidade, Órbita e Núcleo.

### Satélites

- **Laser:** dispara um raio contínuo.
- **Mina orbital:** explode quando algo passa perto e se rearma sozinha.
- **Canhão de massa:** os projéteis fazem curva na gravidade do buraco.
- **Defletor:** rebate inimigos e causa dano de impacto.
- **Estase:** deixa os inimigos lentos.
- **Coletor:** gera fragmentos.

### Inimigos

- Errante
- Enxame
- Couraçado (pesado)
- Cometa (rápido)
- Fissor (se divide)
- Antimatéria (é repelida pelo buraco)
- Leviatã (chefe a cada 10 ondas)

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:5180
npm test           # física, economia, perfil e bot de equilíbrio
npm run typecheck
npm run build      # gera dist/
```

O projeto usa TypeScript, Vite e Canvas 2D, sem nenhuma imagem: todo o visual é gerado por código. Isso inclui a nebulosa, a lente gravitacional, a grade do espaço-tempo, o planeta projetado numa esfera, os asteroides e o disco de acreção.

- `src/game/sim.ts`: simulação em passo fixo, sem DOM.
- `src/render/`: desenho da partida.
- `src/ui/`: HUD, tutorial e menu.
