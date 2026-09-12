/**
 * ESCALAS DO MUNDO — os botões de ajuste ficam todos aqui.
 *
 * 1. `WORLD_SCALE`  — tamanho do território.
 * 2. `ASSET_SCALE`  — tamanho do que é desenhado em cima dele.
 * 3. `LOD_SCALE`    — derivado; mantém o nível de detalhe calibrado sozinho.
 *
 * O que faz o reino PARECER vasto é a razão entre os dois primeiros: quanto
 * maior a distância entre eles, menores ficam castelos e montanhas diante da
 * paisagem. Mexer só no `WORLD_SCALE` aumenta tudo junto e não muda nada.
 *
 * O tempo de viagem é independente destes números — vive em
 * `DAYS_TO_CROSS_KINGDOM` (`world/navgraph.ts`).
 */

/** Multiplica toda a geometria. As constantes do mundo foram escritas para 2400 de largura. */
export const WORLD_SCALE = 10;

/** Multiplica o `size` de cada asset. Menor que `WORLD_SCALE` = mundo mais aberto. */
export const ASSET_SCALE = 1.8;

/**
 * Combinação em que os limiares de LOD e as densidades de cenário foram
 * calibrados à mão. Serve de referência para os dois se ajustarem sozinhos.
 */
export const CALIBRATED_WORLD_SCALE = 5;
const CALIBRATED_AT = { world: CALIBRATED_WORLD_SCALE, asset: 1.8 };

/**
 * Corrige os limiares de LOD quando as escalas mudam.
 *
 * O tamanho de um elemento na tela é proporcional a `zoom × ASSET_SCALE /
 * WORLD_SCALE`. Se o mundo dobra e os assets não, tudo aparece com metade do
 * tamanho — e o detalhe (árvores, fazendas, rótulos secundários) precisa
 * esperar o dobro de zoom para surgir. Este fator faz isso automaticamente,
 * então dá para mexer nas escalas acima sem reajustar dezenas de números.
 */
export const LOD_SCALE =
  WORLD_SCALE / ASSET_SCALE / (CALIBRATED_AT.world / CALIBRATED_AT.asset);

/**
 * Aplica a correção de LOD a um limiar de zoom.
 *
 * Limiares até 1 são preservados: são as camadas de IDENTIDADE do bioma
 * (montanhas de Pedra Cinza, floresta de Elmwood, searas dos Campos Verdes),
 * que precisam ser reconhecíveis já na vista do reino inteiro, por menores que
 * fiquem. Acima de 1 está o DETALHE — árvores, fazendas, rótulos secundários —
 * e esse sim espera mais zoom quando o mundo cresce.
 */
export function lod(threshold: number): number {
  return threshold <= 1 ? threshold : 1 + (threshold - 1) * LOD_SCALE;
}

/**
 * Espessura de traços de TERRENO (estradas, rios, fronteiras), em unidades do
 * mundo.
 *
 * De perto acompanham o tamanho dos edifícios — uma estrada real não pode ser
 * mais larga que um castelo. De longe engrossam, senão sumiriam na vista do
 * reino inteiro, onde justamente precisam desenhar a malha viária.
 *
 * Na escala calibrada (`LOD_SCALE === 1`) devolve exatamente `base *
 * WORLD_SCALE`, que era o comportamento anterior.
 */
export function featureWidth(base: number, zoom: number): number {
  const boost = Math.max(1, Math.min(LOD_SCALE, LOD_SCALE / (zoom / 2)));
  return (base * WORLD_SCALE * boost) / LOD_SCALE;
}
