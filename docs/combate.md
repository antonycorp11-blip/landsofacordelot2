# Combate entre grupos

O combate é um sistema de campanha persistente. O mapa determina o terreno; o motor calcula a rodada; a arena 32-bit representa esse resultado. Recarregar a página mantém a batalha, as baixas e o único dado disponível para negociação.

## Fluxo jogável

1. Um bando, uma emboscada de missão ou um cerco inicia o confronto.
2. Antes de lutar, o jogador vê a composição estimada e o terreno.
3. Na arena, escolhe uma ordem por rodada. Cada botão informa ataque, exposição e modificador do terreno.
4. Moral e baixas atualizam as formações visíveis. Uma linha pode quebrar antes de todos morrerem.
5. Vitória, derrota, retirada forçada ou acordo voltam para a campanha uma única vez.

## Ordens

| Ordem | Uso |
| --- | --- |
| Infantaria: avançar | Pressão alta com maior exposição. |
| Infantaria: segurar | Defesa e recuperação de moral. |
| Arqueiros: saraivada | Usa a proporção de arqueiros e o campo de tiro. Só aparece utilizável quando há arqueiros. |
| Cavalaria: flanquear | Usa a proporção montada e sofre muito em mata, montanha, lama e travessia. |
| Manter reserva | Reduz dano causado, protege unidades especiais e recompõe moral. |
| Romper contato | Tenta retirar à força usando velocidade, Logística Militar e terreno. |

O inimigo também lê a própria composição: arqueiros abrem com saraivadas, cavalaria tenta flanco onde há espaço e uma linha abalada passa a segurar.

## Terrenos

Campo aberto, colina, mata, montanha, pântano, costa e travessia possuem defesa, alcance, cavalaria e retirada próprios. A batalha herda o tipo diretamente da aresta onde o encontro ocorreu. A arena desenha uma paisagem diferente para cada um sem alterar o mapa estratégico de 24.000 × 16.000.

## Baixas e recuperação

Uma baixa de rodada pode virar morte ou ferimento. Gestão e Logística Militar aumentam a parcela de feridos. Mortos saem do grupo; feridos ficam fora da linha, continuam consumindo manutenção e retornam gradualmente nos dias em que há comida.

Baixas pequenas usam a pressão e o dado da rodada em vez de arredondar sempre para zero. Fadiga cresce depois das primeiras rodadas para impedir confrontos infinitos entre grupos pequenos.

## Rendição e prisioneiros

Cada batalha permite uma tentativa de conversa:

- **Exigir rendição** aparece quando a moral inimiga está baixa ou sua força é claramente maior. Diplomacia, Persuasão, proporção de forças e moral definem a chance.
- **Negociar passagem** tenta salvar tropa, feridos e carga pagando tributo.

Falhar fortalece a moral inimiga e reduz a sua. O dado é criado no começo da batalha e persistido, então fechar a tela não oferece outra tentativa.

Inimigos rendidos viram prisioneiros. Eles ocupam carga, consomem provisões em grupo e podem ser resgatados nos mercados por um valor que depende do grau da tropa.

## Próximo avanço

O próximo estágio militar é fazer bandos, patrulhas e exércitos persistirem como grupos do mundo: perseguir, bloquear estradas, carregar prisioneiros e alterar segurança e estoque ao serem derrotados. Depois entram equipamento individual, cercos por etapas e campanhas entre Casas.
