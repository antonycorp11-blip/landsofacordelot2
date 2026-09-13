# Combate entre grupos — desenho para a próxima etapa

Proposta baseada no pedido de exército contra exército, nas tropas e atributos já existentes. **Combate ainda não está implementado nesta entrega.** Os contratos e encontros desta versão fornecem o crescimento e os recursos que prepararão essa etapa.

## Escala e adversários

Começar com 3–12 combatentes por lado e grupos controlados pelo jogo. O mesmo modelo deve comportar 20, 50 ou mais unidades depois. Uma partida solo funciona mesmo sem outros jogadores conectados; multiplayer exigirá, em outra fase, um servidor que controle o estado da batalha.

O herói e cada companheiro participam como personagens; tropas continuam sendo unidades. Evitar um único cálculo de força que simplesmente faça o maior número vencer. A leitura atual de força e risco em `game/estimate.ts` pode servir à preparação, mas não resolve baixas nem resultado.

## Ciclo da batalha

1. **Contato no mapa.** Aproximação real de um grupo hostil; distância e capacidade de agir verificadas pela simulação. Tocar num agente distante apenas mostra informações.
2. **Preparação.** Exibir terreno, composição conhecida, moral, condição do grupo e possibilidade de retirada. Tática determina a precisão da informação, conforme o sistema atual.
3. **Ordens.** Avançar, defender ou recuar. Em seguida, adicionar flanquear quando houver cavalaria e manter distância quando houver arqueiros. Cada ordem mostra o benefício, o risco e os atributos envolvidos.
4. **Rodadas curtas.** Uma pequena arena 2D em pixel art ilustra o confronto. Um motor de regras separado da animação processa alcance, pressão, baixas e moral; a animação comunica o que foi decidido pelo motor.
5. **Desfecho.** Vitória, retirada, rendição ou derrota. Relatório de sobreviventes, feridos, mortos, prisioneiros e recursos obtidos ou perdidos. Aplicar o resultado à campanha uma única vez.

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

## Primeiro marco de combate

Um bando hostil contra o pequeno grupo do jogador, três ordens, dois terrenos contrastantes, feridos e retirada. Concluir ou perder o encontro precisa alterar a campanha e o grupo inimigo no mapa. Depois ampliar formações, prisioneiros, cercos e batalhas entre Casas.

Antes de multiplayer, retirar do cliente a autoridade sobre estado e recompensas, criar contas e sincronização no servidor. Isso é uma etapa própria; não é requisito para experimentar batalhas contra NPCs.
