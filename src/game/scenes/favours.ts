/**
 * AS QUATRO ENTREGAS.
 *
 * Um favor cumprido não pode ser um recibo. Cada um destes devolve uma coisa
 * que o jogador não foi buscar: a serraria explica de quem é a mão que aperta
 * Elmwood, o correio diz quantas cartas daquela estrada ninguém reclama, e o
 * desertor viu a emboscada.
 *
 * Regra da camada, de novo: ninguém explica o mundo. Falam do que é deles.
 */
import type { Cinematic } from "../cinematics";

/* ------------------------------ Dona Halka ------------------------------ */
export const halkaScene: Cinematic = {
  id: "favor_halka",
  first: "escritorio",
  beats: {
    escritorio: {
      id: "escritorio",
      place: "Serenvale",
      speaker: { name: "Dona Halka", role: "Contratos de madeira da Casa", seed: "dona_halka", age: 0.66, female: true },
      text: [
        "Ela não levanta os olhos do livro-caixa quando você entra, e não levanta quando você fala.",
        "Levanta quando vê o papel.",
        "«Quem escreveu isto?»",
      ],
      choices: [
        {
          id: "aled",
          label: "«O escrivão de Folhaterra.»",
          outcome: {
            text:
              "Ela passa o polegar por baixo da assinatura, onde está o laço, e faz um som curto pelo nariz.\n\n«O jeito dele. Trinta anos e continua fechando nome como se alguém fosse acrescentar linha.»\n\nDobra a carta, guarda no livro, e finalmente olha para você.\n\n«O intendente recebe quem eu digo que ele recebe. Vou dizer o seu nome. Não me faça arrepender.»",
            facts: ["Dona Halka decide quem o intendente do Castelo Verde recebe. Ela disse o seu nome."],
            flags: ["halka_fala_por_voce", "favor_halka_feito"],
            reward: { xp: 120, influence: 8 },
            end: true,
          },
        },
        {
          id: "negocio",
          label: "«Alguém que acha que você me deve atenção.»",
          hint: "Entrar por cima.",
          check: { attribute: "diplomacy", skills: ["etiqueta", "persuasao"], label: "Diplomacia / Etiqueta" },
          outcome: {
            text:
              "Ela ri uma vez, seca, e o riso é de aprovação.\n\n«Devo. Ele me tirou de uma fraude de contrato quando eu era moça e burra.»\n\nPassa o polegar pelo laço embaixo da assinatura, dobra a carta e guarda no livro.\n\n«O intendente recebe quem eu digo. Vou dizer o seu nome — e vou dizer que você tem lábia, o que não é elogio aqui dentro.»",
            facts: ["Dona Halka decide quem o intendente do Castelo Verde recebe. Ela disse o seu nome."],
            flags: ["halka_fala_por_voce", "halka_te_achou_atrevido", "favor_halka_feito"],
            reward: { xp: 130, influence: 10 },
            end: true,
          },
          failure: {
            text:
              "Ela olha por cima do papel o tempo suficiente para você ouvir a própria frase de novo.\n\n«Eu devo atenção ao homem que escreveu. A você eu devo a porta.»\n\nMas guarda a carta no livro. «Volte na semana que vem. Ou não volte.»",
            facts: ["Dona Halka ficou com a carta. Ela não gostou de você."],
            flags: ["halka_fala_por_voce", "halka_te_achou_atrevido", "favor_halka_feito"],
            reward: { xp: 90, influence: 4 },
            end: true,
          },
        },
      ],
    },
  },
};

/* ----------------------------- A serraria ------------------------------- */
export const sawmillScene: Cinematic = {
  id: "favor_serraria",
  first: "patio",
  beats: {
    patio: {
      id: "patio",
      place: "Grande Serraria",
      speaker: { name: "Feitor Bram Orsk", role: "Grande Serraria", seed: "feitor_orsk", age: 0.55 },
      text: [
        "A carga de Ovid está encostada no galpão, coberta de lona e de onze dias de poeira.",
        "O feitor ouve o nome do mercador e olha para os lados antes de responder.",
        "«Eu não estou segurando nada. Estou esperando ordem que não vem.»",
      ],
      choices: [
        {
          id: "pressionar",
          label: "«Esperando ordem de quem?»",
          check: { attribute: "conviction", skills: ["intriga", "lideranca"], label: "Convicção / Intriga" },
          outcome: {
            text:
              "Ele baixa a voz sem baixar a cabeça, o que é pior.\n\n«Veio recado do Castelo Verde: nada sai de Elmwood sem nota carimbada, e as notas pararam de ser carimbadas no mês passado.»\n\nEle cospe.\n\n«E não foi a Casa que pediu isso. Foi gente de fora que agora escreve cartas em nome da Casa. Eu obedeço o papel, não obedeço o homem.»",
            facts: [
              "Cartas assinadas em nome da Casa Silvarden estão saindo de mãos que não são da Casa.",
              "Nada sai de Elmwood sem nota carimbada, e as notas pararam no mês passado.",
            ],
            questions: ["Quem está escrevendo em nome da Casa Silvarden?"],
            flags: ["sabe_do_bloqueio", "favor_serraria_feito"],
            reward: { xp: 110, gold: 45, influence: 5 },
            end: true,
          },
          failure: {
            text:
              "«De quem manda.» É tudo o que ele diz, e diz três vezes de três jeitos.\n\nNa quarta você desiste. Ele libera a carga para calar você, e isso pelo menos resolve o pedido de Ovid.",
            flags: ["favor_serraria_feito"],
            reward: { xp: 70, gold: 45 },
            end: true,
          },
        },
        {
          id: "comprar",
          label: "Pagar a taxa que ninguém pediu.",
          hint: "Sai do seu bolso e resolve hoje.",
          outcome: {
            text:
              "Você põe moedas na mão dele. Ele não conta, o que quer dizer que já sabia o valor.\n\nA carga sai naquela tarde.\n\nNa saída, um carroceiro murmura sem olhar para você: «Foi assim com a minha também. E com a do meu irmão. Tudo desde que as notas pararam.»",
            facts: ["A carga de Elmwood só anda com propina desde que as notas pararam de ser carimbadas."],
            questions: ["Por que as notas de Elmwood pararam de ser carimbadas?"],
            flags: ["favor_serraria_feito", "pagou_propina"],
            reward: { xp: 80, gold: -35, influence: 3 },
            balance: 3,
            balanceReason: "Resolveu com dinheiro",
            end: true,
          },
        },
      ],
    },
  },
};

/* ------------------------------ O correio ------------------------------- */
export const postScene: Cinematic = {
  id: "favor_correio",
  first: "posto",
  beats: {
    posto: {
      id: "posto",
      place: "Posto dos Caçadores",
      speaker: { name: "Velha Nesa", role: "Recebe e despacha o correio", seed: "velha_nesa", age: 0.78, female: true },
      text: [
        "O posto é uma sala com uma estante de escaninhos e um fogo pequeno.",
        "Você diz que veio deixar o nome de um morto da estrada do bosque.",
        "Ela puxa o livro sem perguntar nada, o que já responde muita coisa.",
      ],
      choices: [
        {
          id: "nome",
          label: "Dar o nome e o lugar.",
          outcome: {
            text:
              "Ela escreve devagar, com a letra grande de quem aprendeu tarde.\n\nDepois vira o livro para você ver a página. Há outros sete nomes, do mesmo trecho de estrada, dos últimos dois anos.\n\n«Ninguém vem buscar carta dessa rota faz tempo, filho. Eu escrevo assim mesmo. Um dia alguém vem.»",
            facts: ["Sete outros mortos foram registrados no mesmo trecho de estrada nos últimos dois anos."],
            questions: ["Por que tanta gente morre naquele trecho de estrada?"],
            flags: ["favor_correio_feito", "viu_o_livro_de_nesa"],
            reward: { xp: 100, influence: 10 },
            balance: -3,
            balanceReason: "Fez o que ninguém ia fazer",
            end: true,
          },
        },
        {
          id: "perguntar",
          label: "Perguntar quem mais passou por aqui perguntando isso.",
          check: { attribute: "diplomacy", skills: ["persuasao", "intriga"], label: "Diplomacia / Persuasão" },
          outcome: {
            text:
              "Ela anota o nome primeiro. Só depois responde.\n\n«Dois homens, na primavera. De fora. Quiseram ver o livro e eu deixei, porque eu não sei negar a quem tem escolta.»\n\nEla fecha o livro com as duas mãos.\n\n«Copiaram a página inteira. Nenhum deles perguntou como é que a gente morre aqui.»",
            facts: [
              "Sete outros mortos foram registrados no mesmo trecho de estrada nos últimos dois anos.",
              "Dois homens de fora, com escolta, copiaram o livro de mortos da estrada na primavera.",
            ],
            questions: ["O que dois homens da capital queriam com uma lista de mortos de estrada?"],
            flags: ["favor_correio_feito", "viu_o_livro_de_nesa", "sabe_dos_homens_da_capital"],
            reward: { xp: 125, influence: 10 },
            balance: -3,
            balanceReason: "Fez o que ninguém ia fazer",
            end: true,
          },
          failure: {
            text:
              "«Passa muita gente, filho.» Ela anota o nome e fecha o livro.\n\nÉ o que você veio fazer, e está feito.",
            facts: ["Sete outros mortos foram registrados no mesmo trecho de estrada nos últimos dois anos."],
            flags: ["favor_correio_feito", "viu_o_livro_de_nesa"],
            reward: { xp: 100, influence: 10 },
            balance: -3,
            balanceReason: "Fez o que ninguém ia fazer",
            end: true,
          },
        },
      ],
    },
  },
};

/* ------------------------------ O desertor ------------------------------ */
/**
 * O favor que não é favor: o homem não fugiu por covardia, e o que ele viu é
 * a primeira testemunha da emboscada. As três saídas cobram coisas
 * diferentes, e nenhuma é de graça.
 */
export const deserterScene: Cinematic = {
  id: "favor_desertor",
  first: "taverna",
  beats: {
    taverna: {
      id: "taverna",
      place: "Folhaterra",
      speaker: { name: "Wil Corry", role: "Guarda do Castelo Verde", seed: "wil_corry", age: 0.32 },
      text: [
        "Ele está sóbrio, o que estraga a história que Teln contou.",
        "Está sentado de costas para a parede e de frente para a porta, e viu você entrar antes de você vê-lo.",
        "«Se ele mandou você, diga que eu não volto.»",
      ],
      choices: [
        {
          id: "porque",
          label: "«Por que não?»",
          outcome: {
            text:
              "«Porque eu estava na ronda da estrada do bosque na noite retrasada.»\n\nEle empurra o copo cheio para o lado, como quem não vai precisar dele.\n\n«Passaram quatro cavaleiros pelo posto. Com carta. A carta tinha selo da Casa e o sargento mandou abrir a cancela. E de manhã tinha uma carruagem virada e gente morta.»\n\nEle olha para você pela primeira vez.\n\n«Eu vi a cara de um deles. Se eu voltar, ele sabe disso antes de mim.»",
            facts: [
              "Quatro cavaleiros passaram a cancela do bosque na noite do ataque, com carta selada pela Casa.",
              "Wil Corry viu o rosto de um deles, e por isso desertou.",
            ],
            questions: ["Quem deu carta selada da Casa a quatro cavaleiros naquela noite?"],
            flags: ["ouviu_o_desertor"],
            reward: { xp: 90 },
            next: "escolha",
          },
        },
        {
          id: "levar",
          label: "«Não me interessa. Levante.»",
          hint: "Teln pediu o homem, não a história.",
          check: { attribute: "command", skills: ["lideranca", "treinamento"], label: "Comando / Liderança" },
          outcome: {
            text:
              "Ele levanta. Não resiste, não discute, e é isso que fica mal no estômago.\n\nNo caminho de volta ele não fala nada até o portão. Ali diz, baixo:\n\n«Eu vi quem passou a cancela naquela noite. Você acaba de me entregar ao sargento que mandou abrir.»\n\nTeln paga o combinado sem olhar para o homem.",
            facts: ["Um guarda desertou porque viu quem passou a cancela na noite do ataque. Você o devolveu."],
            questions: ["Quem deu a ordem de abrir a cancela naquela noite?"],
            flags: ["favor_desertor_feito", "entregou_o_desertor"],
            reward: { xp: 130, gold: 30, influence: 6 },
            balance: 6,
            balanceReason: "Entregou um homem por soldo",
            end: true,
          },
          failure: {
            text:
              "Ele não levanta, e a mesa inteira vira para olhar você.\n\n«Aqui ninguém é do castelo», diz o taverneiro, sem levantar a voz.\n\nVocê sai sozinho.",
            reward: { xp: 30 },
            end: true,
          },
        },
      ],
    },

    escolha: {
      id: "escolha",
      place: "Folhaterra",
      speaker: { name: "Wil Corry", role: "Desertor", seed: "wil_corry", age: 0.32 },
      text: [
        "«Teln é homem correto. Mas quem abriu a cancela foi alguém acima dele, e eu não vou saber quem antes de me acharem.»",
        "Ele espera. É a primeira vez que alguém dá a ele a escolha de esperar.",
      ],
      choices: [
        {
          id: "soltar",
          label: "«Some daqui. Eu digo que não achei você.»",
          hint: "Teln não paga por mentira. E você prometeu não trazer nenhuma.",
          outcome: {
            text:
              "Ele sai pela porta dos fundos e não agradece, porque agradecer seria deixar rastro.\n\nTeln escuta a sua versão de cara fechada.\n\n«Você está mentindo.» Pausa. «Mas está mentindo pelo lado certo, e isso eu respeito mais do que devia.»\n\nEle não paga. Aperta a sua mão, que em Elmwood vale mais.",
            facts: ["Teln sabe que você mentiu por Wil Corry, e preferiu assim."],
            flags: ["favor_desertor_feito", "soltou_o_desertor"],
            reward: { xp: 150, influence: 12 },
            balance: -8,
            balanceReason: "Mentiu para salvar um soldado raso",
            end: true,
          },
        },
        {
          id: "negociar",
          label: "«Volte, e eu digo a Teln o que você viu.»",
          hint: "A verdade inteira, para o homem que abriu a cancela por ordem de alguém.",
          check: { attribute: "diplomacy", skills: ["persuasao", "diplomacia"], label: "Diplomacia / Persuasão" },
          outcome: {
            text:
              "Vocês entram juntos pelo portão, e Wil fala primeiro, o que era o combinado.\n\nTeln ouve até o fim sem interromper. Depois fica muito quieto.\n\n«A ordem de abrir veio por escrito. Eu guardei o papel, porque guardo todos.» Ele olha para Wil, não para você. «E o papel não é da letra do intendente.»",
            facts: [
              "A ordem de abrir a cancela veio por escrito, e Teln guardou o papel.",
              "A letra da ordem não é a do intendente do Castelo Verde.",
            ],
            questions: ["De quem é a letra da ordem que abriu a cancela?"],
            evidence: ["ordem_da_cancela"],
            flags: ["favor_desertor_feito", "teln_e_seu_aliado"],
            reward: { xp: 170, gold: 30, influence: 14 },
            balance: -2,
            balanceReason: "Levou a verdade inteira",
            end: true,
          },
          failure: {
            text:
              "Ele balança a cabeça antes de você terminar.\n\n«Você não conhece castelo. Palavra de forasteiro não protege ninguém lá dentro.»\n\nEle vai embora pela porta dos fundos, e leva o que viu com ele.",
            flags: ["favor_desertor_feito", "perdeu_o_desertor"],
            reward: { xp: 70 },
            end: true,
          },
        },
      ],
    },
  },
};
