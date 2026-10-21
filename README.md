# TERRA FIRME

Simulação agrícola 2D vista de cima para navegador. Você dirige as máquinas,
contrata operadores que trabalham sozinhos e faz a empresa crescer num mundo
que continua funcionando mesmo onde a câmera não está.

Feito com **TypeScript + Vite + Canvas 2D**, com HUD e menus em HTML/CSS. Todos
os gráficos (terreno, lavouras, máquinas, construções, árvores, pessoas,
partículas, clima e luz) são **desenhados por código**: o repositório não tem
nenhuma imagem, spritesheet ou asset externo.

## Como executar

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # typecheck + build de produção em dist/
npm run preview    # serve o build
npm test           # testes de lógica (Vitest)
npm run typecheck
```

O `vercel.json` já vem configurado para Vite (`npm ci --include=dev`,
`npm run build`, saída `dist`). Depois de carregado, o jogo roda offline. O
salvamento fica no `localStorage` do navegador.

## Controles

| Ação | Teclado | Celular |
| --- | --- | --- |
| Andar / acelerar / ré / esterçar | WASD ou setas | joystick (toque na metade esquerda) |
| Freio · correr a pé | Espaço · Shift | — |
| Entrar/sair, assumir máquina de operador | E | botão contextual |
| Ligar/desligar motor | I (W liga automaticamente) | botão |
| Engatar/desengatar | Q | botão |
| Baixar/levantar implemento ou plataforma | V | botão |
| Tubo da colheitadeira / bascular caçamba | G | botão |
| Carregar do silo · diesel · sementes · trocar cultura · reparar | L · R · T · C · F | botões |
| Operador (atribuir / devolver controle) | H | botão |
| Mapa · zoom | M ou Tab · roda do mouse ou + − | toque no minimapa · pinça |

Só aparecem botões das ações possíveis naquele momento e lugar.

## O que funciona (primeiro marco)

O roteiro “Primeiro marco” no canto da tela acompanha o progresso pelo estado
real do mundo:

1. **A pé e dirigindo.** Entrar e sair de veículos; aceleração, frenagem, ré,
   esterçamento gradual com raio de giro (modelo de bicicleta), velocidade
   máxima, limite de velocidade com implemento, terreno molhado e carga;
   consumo de diesel e desgaste; colisões simplificadas com construções,
   árvores, cercas, lagoa e outras máquinas.
2. **Engate articulado.** Dê ré até o ponto de engate (com alinhamento,
   compatibilidade e potência verificados). Implementos de três pontos ficam
   rígidos com braços visíveis; os de barra de tração seguem como reboque
   (tractrix) e dobram nas curvas.
3. **Solo célula a célula.** Cada campo é um polígono com células de 1 m² que
   guardam preparo, cultura, crescimento, umidade, fertilidade, ervas, saúde e
   a direção da passada. A barra de trabalho do implemento (largura real) varre
   um quadrilátero entre um passo e outro e altera exatamente as células
   cobertas. A textura muda no lugar: restolho vira solo sulcado, sementes
   formam fileiras na direção do plantio, plantas crescem em fases, a lavoura
   madura fica densa e a colheitadeira deixa restolho na largura da
   plataforma. O HUD mostra a porcentagem concluída.
4. **Culturas.** Trigo, soja e milho com dados declarativos (semente/ha,
   produtividade, dias de ciclo, crescimento por estação, cores). O
   crescimento depende do tempo, umidade (chuva e evaporação), temperatura,
   fertilidade e ervas. Colheita atrasada perde produtividade e acaba se
   perdendo.
5. **Colheita e logística.** Colheitadeira alugada (taxa de retirada + valor por hora de motor) ou comprada corta,
   enche o tanque e descarrega pelo tubo animado numa carreta ou caminhão
   posicionado embaixo da saída. A carreta transporta a carga, bascula na
   moega da cooperativa (venda pelo preço do dia) ou no silo da sede, e pode
   ser recarregada no silo para vender depois.
6. **Operadores autônomos.** Contrate candidatos (salário, eficiência,
   especialidade), escolha máquina, campo e operação e monte uma fila. O
   operador vai a pé até a máquina, segue o grafo de estradas (A*), aproxima-se
   alinhado, trabalha em faixas paralelas (boustrofédon) com manobras de
   cabeceira em meia-volta ou ômega conforme o raio de giro, pula faixas já
   feitas, busca sementes/adubo e diesel na sede quando acabam, espera carreta
   quando o tanque enche e volta para a sede ao terminar. Você pode entrar na
   máquina em uso a qualquer momento (o operador fica pausado na cabine) e
   devolver o controle — ele replaneja a partir da posição atual.
7. **Economia.** Preços que variam por dia, estação e eventos de mercado; dois
   compradores físicos (a cooperativa e um moinho distante que paga mais por
   trigo e milho); diesel, sementes, adubo, salários, manutenção, aluguel,
   juros e cheque especial automático. Concessionária com novos, usados do dia,
   aluguel e financiamento; compra, venda e arrendamento de terras; livro-caixa.
8. **Vizinhos.** Três fazendas (Bertolini, Três Irmãos, Sanches) com caixa,
   objetivos, campos, frota e funcionários reais que usam a mesma IA: cultivam,
   plantam, colhem e levam a colheita até a moega. Com caixa sobrando, compram
   terras à venda (valorizando as demais) e máquinas.
9. **Mundo vivo.** Mapa contínuo de 1,4 × 1 km gerado por semente: estrada
   asfaltada, estradas de terra, trilhas até os portões, cooperativa,
   concessionária, posto, moinho, quatro sedes, lagoa, cercas, bosques e
   quebra-ventos. Ciclo dia/noite com faróis, estações que mudam a vegetação,
   chuva com lama, previsão do tempo, sombras de nuvens e alertas que levam a
   decisões (“Ver campo”, “Ver mercado”).
10. **Salvamento versionado** (`terrafirme.save`, versão 1) com migração prevista:
    campos (RLE compacto), máquinas, combustível, cargas, posições,
    funcionários e filas, vizinhos, economia, silos e relógio. Salva sozinho a
    cada 45 s e ao sair da aba.

## Desempenho

- Simulação em passo fixo de 60 Hz, renderização desacoplada.
- Terreno em chunks de 48 m gerados sob demanda em canvas offscreen (cache LRU) e
  mapa reduzido para zoom afastado e minimapa.
- Texturas de campo por pixel, redesenhando só as células cuja chave visual
  mudou, com orçamento de pixels por frame.
- Corpos de máquinas, construções e árvores em cache; animação por
  transformações (rodas, garras, molinete, tubo, balanço das árvores).
- Pool de partículas sem alocação; marcas de pneu em anel.
- Máquinas fora da câmera integram a 20 Hz; partículas não são emitidas fora da
  tela. No celular a resolução das texturas e a quantidade de partículas caem.

## Arquitetura

```
src/
  config/balance.ts      ajustes de ritmo, custos e progressão
  core/                  matemática, RNG/ruído determinístico, GameLoop
  data/                  culturas, máquinas, implementos e construções (declarativos)
  world/                 World (estado), MapGen, Roads, tipos e entidades
  systems/               FieldSystem, CropSystem, VehicleSystem, ImplementSystem,
                         WorkerAI, LanePlanner, Pathfinding, Economy, Storage,
                         Weather, TimeSystem, Collision, NpcFarms, geometry
  render/                Renderer, Camera, Ground, FieldRenderer, Machines,
                         Structures, Particles
  input/Input.ts         teclado, mouse, joystick virtual e pinça
  ui/                    HUD, menus, minimapa e ícones vetoriais
  save/SaveSystem.ts     serialização versionada
  game/                  Game (orquestração), Interactions, Objectives, NewGame
tests/                   solo, limites de campo, faixas, estoque, troca de
                         controle, economia, vizinhos e salvamento
```

A lógica (`systems/`, `world/`, `save/`) não depende do DOM e é testada em Node.
A renderização só lê o estado; efeitos visuais chegam por uma interface
(`FxSink`) que a simulação chama sem saber se algo será desenhado.

## O que falta

- **Contratos** de preparo, plantio, colheita e transporte em terras alheias
  (os vizinhos já existem com campos, caixa e frota para oferecê-los).
- **Construção** na sede (galpões, silos, oficina, tanques, estradas internas) com
  prévia translúcida e grade — os dados de construções já são declarativos e
  as funções (silo, diesel, oficina, insumos) já existem como zonas.
- Transporte automatizado por operadores (carreta acompanhando a colheitadeira,
  levar grãos ao comprador) e caminhão na fila de tarefas.
- Concorrência mais profunda: vizinhos disputando contratos, preço de terra
  reagindo à produção, ofertas de compra de terras do jogador.
- O pulverizador aduba (fertilidade) sem marca visual própria no solo; faltam
  plataformas removíveis da colheitadeira e mais culturas.
- Som.

## Próximo passo técnico

1. **Sistema de contratos** (`systems/Contracts.ts`): ofertas geradas pelos
   vizinhos e por eventos, com campo, operação, prazo e pagamento; permissão de
   trabalho por contrato em `canWorkField`; tarefas de operador sobre campos
   contratados; avaliação de conclusão por `opProgress`.
2. **Tarefa de transporte** na IA: perna “acompanhar colheitadeira” (posição
   relativa ao tubo) e perna “entregar” até a moega escolhida.
3. **Construção** com colisão incremental (`StaticCollision.add` público),
   prévia e validação de espaço, gerando zonas pelas `ZoneTemplate` dos dados.
