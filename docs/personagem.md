# Personagem, progressão e grupo

A camada de RPG do jogador. O mapa, as Casas e os agentes não mudaram — o que
entrou é **quem** anda por ali.

---

## Começar

`App.tsx` mostra a escolha de personagem enquanto `game.started` for falso. Não
é uma camada por cima do mapa: o mapa depende de quem é o jogador para saber
onde a viagem começa, então a escolha vem antes de montar o mundo.

Escolher **não** apaga os outros três. Eles viram companheiros em potencial, com
nível, atributos, habilidades e paradeiro próprios, e continuam onde a história
os deixou.

Para recomeçar do zero: `resetCampaign()` em `game/store.ts`, ou apagar a chave
`acordelot.campanha.v1` do `localStorage`.

---

## Três moedas que não se convertem

| | o que é | como muda |
|---|---|---|
| **XP** | crescimento pessoal | sobe, vira nível |
| **XP de carreira** | reconhecimento numa trilha | sobe, vira posto |
| **Influência** | peso social e político | sobe **e desce** |

Confundir as três é o erro que estraga um sistema de progressão, então cada uma
tem a sua porta de entrada em `game/experience.ts`:

```ts
grantXp(120, "missao");
grantCareerXp("MILITARY", 15);
grantInfluence(2);        // aceita negativo
gainSkill("negociacao", 1);
```

O formato de recompensa de missão e evento — `Reward` — já existe, vazio de
conteúdo, para que quando esses sistemas chegarem não inventem um formato
próprio nem mexam no estado por fora.

---

## Atributos e habilidades

**Atributos** (1–10) são talento: mudam pouco e valem muito. Um ponto a cada
dois níveis, e subir Comando de 5 para 6 é um evento.

**Habilidades** (0–100) são conhecimento: sobem com o uso, e é onde ficam os
ganhos pequenos e frequentes. Vinte delas, cinco por família. Em 25, 50, 75 e
100 liberam perks com nome.

Cada atributo e cada habilidade declara na tela o que faz — o que existe para
impedir que virem número decorativo.

**Todas as fórmulas derivadas vivem em `game/progression.ts`.** Limite de
tropas, moral, carga, custo diário, velocidade, margem de negociação, bônus de
audiência. Espalhar `comando * 3` por seis componentes é como se perde o
controle de um sistema de RPG; aqui quem precisa de um número chama a função.

---

## Grupo

```
limite = 5 + Comando×3 + Liderança/20 + posto militar + perks
```

Pouco de propósito: com Comando 2 são onze homens. É o **posto militar** que
leva o número às dezenas — comandar oitenta homens tem de ser um cargo, não um
atributo alto.

**Companheiro é gente; tropa é unidade.** Vivem em campos separados do estado e
nunca se somam: um miliciano não tem nome nem relação com você, e um companheiro
não é substituível.

`strength` **não é dano**. É estimativa estratégica, e serve para comparar dois
grupos antes de um confronto.

---

## Recrutamento

Cada estrutura tem o seu poço de recrutas, **derivado** do que ela é — tipo,
população, segurança e lealdade — com semente estável por lugar. Cinquenta e
duas tabelas escritas à mão seriam cinquenta e duas oportunidades de esquecer
uma.

O poço diminui quando você recruta e repõe sozinho a cada seis dias do mundo,
calculado na hora de abrir o painel: não há laço rodando por trás para lugares
que o jogador talvez nunca visite.

Ouro e limite de comando são conferidos em `game/recruitment.ts`, não na
interface — para que missão e evento que recrutarem no futuro passem pelas
mesmas regras.

---

## O número sobre o agente

Todo agente que representa um grupo mostra o contingente acima do sprite. É a
leitura estratégica do mapa: olhar e saber se ali vão dois mensageiros ou
sessenta homens, **sem abrir menu nenhum**.

Clicar num agente não mostra a ficha dele — mostra o que **você** consegue ler
dali. Com Tática 0, "um grupo considerável"; com Tática 60 ou o perk Leitura de
Campo, o número exato, a composição e um veredito. É o que faz a habilidade
valer pontos.

---

## Arte que falta

Os quatro retratos. Solte os arquivos em `src/assets/heroes/` e acrescente um
`import` por linha em `src/data/heroAssets.ts`:

```
kael_arven.webp · lyra_venn.webp · edrian_vale.webp · serah_elynn.webp
```

Sem eles a tela mostra a inicial na cor do arquétipo e o autoteste acusa —
nunca um retrato inventado em CSS.
