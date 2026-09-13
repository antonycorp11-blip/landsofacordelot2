# Valdória — direção de arte em pixel art

Aplicado a partir das três referências anexadas à conversa “Lands Of Acordelot”.
Arquitetura de pedra com telhados azuis e detalhes dourados, vegetação em verdes
musgo, rocha fria e neve no norte, solo ocre nas marchas, campos dourados e costa
em areia clara. A resolução dos sprites é 96 × 96, com amostragem nearest-neighbor.
“32-bit” aqui descreve a estética da era dos jogos, não o tamanho dos tiles.

## Entregas

- `src/assets/map/`: 56 arquivos no registro existente, vindos de 52 desenhos
  originais. Quatro variantes funcionais compartilham ilustração: posto/torre,
  campo de treino/acampamento, criação de cavalos/fazenda e passagem/montanha.
- `src/assets/textures/`: sete solos e água, 128 × 128.
- `src/assets/tilesets/`: sete materiais com autotiles e transições por dither.
- `src/assets/source-art/`: três atlas originais com transparência preservada.
- `src/render/terrainMaterial.ts`: variação determinística de musgo/terra.
- `src/render/vegetation.ts`: detalhes de copa dentro das manchas existentes.
- `src/render/dayNight.ts`: matriz de cor interpolada para cada horário.
- `src/render/layers/AtmosphereLayer.tsx`: luzes de assentamentos e vaga-lumes,
  em passe separado para preservar o brilho e o desempenho ao aproximar.

Imagens geradas pela ferramenta integrada ImageGen; os prompts completos estão em
`spritePrompt.txt`, `terrainPrompt.txt` e `environmentPrompt.txt` nesta pasta.
`tools/prepare-map-art.mjs` separa as células dos atlas, apoia as bases dos sprites
e prepara as resoluções de uso. Requer Sharp (somente na preparação; o jogo não
recebeu novas dependências).

## Dia e noite

“Ciclo da viagem” é o modo padrão. A iluminação lê `travel.worldHours`, que começa
às 00h; o tempo avança quando o personagem viaja, exatamente como antes. Não há
um segundo relógio, nem alterações de velocidade, duração de viagem ou regras.
O amanhecer, o dia, o crepúsculo e a noite interpolam sem salto na meia-noite.
As opções de prévia permitem conferir dia/crepúsculo/noite sem alterar o relógio.

## Preservação e validação

Mundo preservado em **24.000 × 16.000**, WORLD_SCALE **10**, ASSET_SCALE **1,8**.
Todos os arquivos de `src/world/`, `src/travel/useTravel.ts` e `src/map/useCamera.ts`
foram comparados byte a byte com a cópia anterior em `.art-backup/src/`: idênticos.
Posições, geografia, rios, estradas, hitboxes, navegação e tempo não foram editados.
As mudanças em WorldMap ligam apenas as camadas visuais e o seletor de iluminação.

Compilação TypeScript/Vite aprovada. Os 11 testes existentes do mapa passaram.
Iluminação verificada em 4.800 amostras, incluindo ciclo de 24h e extremos dia/noite.
Resultados estruturais: `art-validation.json`.

Verificação no navegador: viagem até Cidade Alta concluída, passagem automática
de noite para amanhecer, prévias de dia/crepúsculo/noite e controles em 390 × 844.
Sem erros ou avisos no console durante a revisão final.

## Revisão da interface — 12/09/2026

O registro acima descreve a primeira entrega do mapa. Desde então, o Claude
adicionou personagens, retratos, política e otimizações para celular.
A revisão atual está concentrada em `src/ui/theme.css`: superfícies verde-escuras,
ouro envelhecido, hierarquia de títulos, retratos inteiros e painéis responsivos.
Os três ícones de recursos em `src/assets/ui/` são SVGs próprios, sem dependências
adicionais. Ouro e influência usam os valores da campanha; comida aguarda estoque.

Build e 32 verificações de dados passaram. Nesta revisão de interface, o navegador
integrado estava indisponível; a validação visual em celular ainda é necessária.
O diagnóstico funcional e o próximo marco estão em [Próximos passos](proximos-passos.md).
