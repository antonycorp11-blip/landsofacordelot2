# Estado do jogo e próximo marco

**Atualização:** o ciclo de contratos, tutorial e encontros foi implementado após este diagnóstico. Consulte [Primeira jornada jogável](jornada.md) para o estado atual e [Combate](combate.md) para a próxima etapa. O texto abaixo preserva o diagnóstico anterior.

Revisão de 12/09/2026, com base na conversa **Lands Of Acordelot**, na fase de personagem pedida ao Claude e no código atual. Esta revisão entrega arte e interface; os sistemas abaixo são planejamento, não funcionalidades adicionadas nesta entrega.

## O que já está construído

- Mapa de Valdória, sete regiões, estradas, viagem, agentes circulando e iluminação durante a viagem.
- Casas, brasões, líderes, estruturas e leitura política dos territórios. A atualização de fronteiras acrescenta informações sobre reinos vizinhos.
- Quatro origens com retratos: Kael, Lyra, Edrian e Serah. A origem não impede seguir outras carreiras.
- Estado de personagem, atributos, habilidades, níveis, carreiras, influência, companheiros potenciais e grupo militar.
- Recrutamento que desconta ouro, controla vagas e adiciona tropas; persistência local de parte da campanha.

## O que ainda impede uma partida com progressão

| Lacuna | Evidência no código | Consequência |
| --- | --- | --- |
| Atividades com recompensa | `src/game/experience.ts` oferece funções de ganho e o tipo `Reward`; os eventos de `WorldMap.tsx` apenas escrevem no diário. | Viajar ainda não gera objetivos, escolhas e recompensas que alimentem a progressão. |
| Conversas e missões | `SettlementActions.tsx` mantém audiência, conversa, mercado e outras ações desativadas. | A maioria dos lugares serve para consulta e recrutamento. |
| Acesso aos companheiros | Começam com relação zero; a ficha exige relação mínima, e não há atividade que conceda essa relação. | A estrutura existe, mas falta o caminho jogável para conquistar confiança. |
| Provisões e economia diária | A campanha não possui comida. Salários e influência diária têm fórmulas exibidas na ficha, sem processamento diário. | O grupo ainda não exige abastecimento nem manutenção efetiva. |
| Continuidade da viagem | `useTravel.ts` inicia o relógio em zero e a posição no ponto inicial; esses dados não fazem parte do save de campanha. | Reabrir o jogo não retoma o estado completo da jornada. |
| Presença para agir | Tocar numa estrutura abre seu painel e inicia a viagem; `recruit()` não verifica a localização do jogador. | É necessário validar chegada antes de permitir ações locais. |

Há também uma inconsistência de recrutamento a revisar: `offersAt()` pode anunciar disponibilidade com bônus, enquanto `recruit()` valida o estoque sem esse bônus.

## Próximo passo recomendado: uma primeira jornada completa

Criar um ciclo de **15–20 minutos**: chegar a uma localidade → conversar → aceitar um contrato → viajar → decidir num evento → entregar → receber recompensas → melhorar o personagem ou conquistar um companheiro. Esse marco conecta o mapa vivo e as quatro carreiras descritos nas conversas.

1. **Garantir continuidade e presença.** Persistir relógio, posição e progresso da rota com migração do save existente. Centralizar a validação de chegada para recrutamento e futuras ações locais.
2. **Criar um sistema compartilhado de contratos e recompensas.** Estados oferecido/aceito/concluído/falhou; objetivo, prazo e registro. Aplicar XP, ouro, influência, carreira e relações uma única vez por conclusão.
3. **Entregar quatro contratos pequenos usando esse sistema.** Militar: acompanhar uma patrulha; comércio: entregar uma encomenda; política: levar uma mensagem; religião: acompanhar peregrinos. Qualquer origem pode aceitar qualquer carreira. Um evento de estrada deve oferecer escolhas com consequências claras.
4. **Tornar a progressão visível.** Aviso de recompensa e nível, objetivo ativo no diário, relação que aumente por ações concretas e encontro que permita recrutar o primeiro companheiro.
5. **Acrescentar abastecimento básico depois do ciclo funcionar.** Estoque de comida, compra num mercado, consumo por tamanho do grupo e salários por dia transcorrido. Nesse momento, ligar o valor real ao ícone de comida do HUD.

Critério de conclusão: iniciar com qualquer uma das quatro origens, terminar um contrato sem ferramentas de desenvolvimento, receber a recompensa uma vez, continuar após recarregar e conseguir avançar na relação com um companheiro. Só então ampliar combate, conquista e administração territorial.

## Interface entregue nesta revisão

Seleção inicial, ficha, habilidades, companheiros, grupo, estruturas, agentes e legenda política compartilham superfícies verde-escuras, ouro envelhecido e tipografia mais legível. Retratos e nomes nas faixas foram preservados. Há ajustes para telas estreitas e áreas seguras do celular.

Os ícones próprios em `src/assets/ui/` representam moedas, um selo de influência e pão com trigo. São SVGs leves, reutilizados por `ResourceIcon.tsx`. Ouro e influência leem a campanha; comida mostra **—** enquanto não existir estoque. Não foi inventado um saldo de provisões.

Validação: build TypeScript/Vite aprovado; 32 verificações existentes do mundo e dos dados aprovadas; renderização de componentes em Node conferiu as quatro origens/fichas, os três ícones, números em português e a distinção entre comida ausente e estoque zero. Ícones inspecionados em 28 e 64 px. O navegador integrado estava indisponível: a revisão visual final em aparelho real permanece pendente.
