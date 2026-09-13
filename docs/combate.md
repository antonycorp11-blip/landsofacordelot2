# Combate entre grupos

O primeiro combate entre grupos já está jogável em emboscadas de missão e bandos de estrada. Ele resolve uma ordem por rodada, aplica baixas permanentes, acompanha moral, paga saque uma única vez e permite retirada. Esta página separa o que funciona agora do próximo avanço.

## Escala e adversários

Começar com 3–12 combatentes por lado e grupos controlados pelo jogo. O mesmo modelo deve comportar 20, 50 ou mais unidades depois. Uma partida solo funciona mesmo sem outros jogadores conectados; multiplayer exigirá, em outra fase, um servidor que controle o estado da batalha.

O herói e cada companheiro participam como personagens; tropas continuam sendo unidades. Evitar um único cálculo de força que simplesmente faça o maior número vencer. A leitura atual de força e risco em `game/estimate.ts` pode servir à preparação, mas não resolve baixas nem resultado.

## Ciclo atual da batalha

1. **Contato.** Um bando intercepta a viagem ou uma missão arma uma emboscada. A leitura de força depende de Tática.
2. **Decisão.** O jogador luta, tenta fugir ou paga quando há pedágio.
3. **Ordens.** Avançar, segurar, flanquear e recuar mostram antes o modificador de ataque, a exposição ou a chance de saída. Flanquear sem cavalaria expõe o grupo.
4. **Rodadas.** Força, Tática, Comando, moral, composição e ordem determinam baixas. Moral pode quebrar uma linha antes do extermínio.
5. **Desfecho.** Sobreviventes, mortos e saque voltam para a campanha. Derrota pode encerrar o encargo e tirar ouro; vitória alimenta experiência militar e a história principal.

Para poucos soldados, mostrar cada unidade individualmente. Em exércitos maiores, representar formações mantendo a contagem real nos dados. O mapa estratégico conserva suas dimensões.

## O que pesa nas decisões

| Elemento | Papel na primeira versão |
| --- | --- |
| Comando + Liderança | Eficiência das ordens e resistência à quebra de moral. |
| Tática | Leitura do inimigo, posicionamento e aproveitamento do terreno. |
| Gestão + Logística Militar | Preparação, custo do grupo e recuperação entre batalhas. |
| Convicção + Inspiração | Reação a perdas e manutenção da coesão. |
| Infantaria | Sustenta posição e protege arqueiros. |
| Arqueiros | Pressionam à distância, com desvantagem quando alcançados. |
| Cavalaria | Mobilidade e flancos em terreno aberto; perde eficiência em floresta, encosta e travessia. |
| Terreno | Cobertura, espaço de manobra e vantagem defensiva. |
| Comida e moral | Condição de preparação e recuperação; definir consumo e penalidades antes de ativá-los. |

Os primeiros encontros devem permitir que uma boa ordem reduza perdas mesmo quando a vitória já é provável. Uma opção de recuo deve existir antes de comprometer tropas, e seu risco precisa ser apresentado ao jogador.

## Estrutura recomendada

- `BattleState`: ID persistente, origem do encontro, terreno, rodada, tropas por lado, condições, ordem atual, estado do gerador aleatório e resultado.
- `BattleUnit`/`Formation`: tipo, quantidade, saudáveis, feridos, moral, posição e alvo.
- `resolveRound(state, order)`: função determinística, independente de React e da velocidade da animação.
- `BattleScreen`: apresentação em canvas com controles de toque para ordens e pausa.
- `settleBattle(id)`: transação que atualiza tropas, personagens, recompensas, relações e grupo inimigo, bloqueando pagamento duplicado.

Salvar a batalha pendente e a semente/estado aleatório. Recarregar não deve restaurar tropas perdidas, repetir saque nem sortear outro resultado para a mesma rodada.

## Próximo marco de combate

Adicionar terreno ao estado da batalha, posição de infantaria, arqueiros e cavalaria, feridos recuperáveis, prisioneiros e rendição negociada. A apresentação seguinte deve ser uma arena 32-bit curta que represente as formações sem mudar o resultado calculado pelo motor. Depois entram cercos, exércitos das Casas e campanhas militares com objetivos no mapa.

Antes de multiplayer, retirar do cliente a autoridade sobre estado e recompensas, criar contas e sincronização no servidor. Isso é uma etapa própria; não é requisito para experimentar batalhas contra NPCs.
