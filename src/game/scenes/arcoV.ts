/**
 * ARCO V — PEDRA CINZA.
 *
 * O arco mais longo, e o que vira o jogo do avesso. O que ele acha lá dentro
 * não é o selo: é a confissão de Antônios.
 *
 * E o arco NÃO termina num nome. Termina numa conversa com o homem que passou
 * três anos trancado com aquilo na mão, e que é a primeira pessoa do jogo a
 * fazer ao jogador a pergunta que o jogo vai fazer no fim.
 */
import type { Cinematic } from "../cinematics";

export const gateScene: Cinematic = {
  id: "arco5_portao",
  first: "muralha",
  beats: {
    muralha: {
      id: "muralha",
      place: "Fortaleza de Pedra Cinza",
      text: [
        "Três anos de portão fechado deixam marca: a estrada até ele está tomada de mato, e o mato não foi pisado.",
        "Há fumaça nas chaminés. Há gente lá dentro. Ninguém responde de cima.",
        "Um cerco levaria meses que você não tem, e romperia com a única Casa que não conta nada à Coroa.",
      ],
      choices: [
        {
          id: "arquivista",
          label: "Procurar o arquivista que saiu.",
          hint: "Alguém saiu de lá. Alguém sempre sai.",
          outcome: {
            text:
              "Ele mora em Pedra Alta, num quarto alugado, e bebe de dia.\n\nQuando você diz Pedra Cinza ele põe as duas mãos na mesa para elas pararem.\n\n«Eu achei uma coisa no cofre e mostrei ao meu senhor, e no dia seguinte ele fechou o portão e me mandou embora com dinheiro para nunca mais voltar.» Ele ri, e o riso é feio. «Eu nem li direito. Só vi a assinatura.»\n\n«Tem um escoadouro na face norte, para a água da mina. Cabe um homem magro e sem pressa.»",
            facts: [
              "O arquivista de Pedra Cinza achou algo no cofre e foi mandado embora no dia seguinte.",
              "Há um escoadouro de água na face norte da fortaleza.",
            ],
            questions: ["O que há no cofre de Pedra Cinza?"],
            flags: ["sabe_do_escoadouro"],
            reward: { xp: 200, influence: 5 },
            next: "dentro",
          },
        },
        {
          id: "irmao",
          label: "Procurar o irmão de Boran.",
          hint: "Nem para ele o portão abre. Isso é informação.",
          check: { attribute: "diplomacy", skills: ["etiqueta", "persuasao"], label: "Diplomacia / Etiqueta" },
          outcome: {
            text:
              "Ele recebe na Fundição, cercado de barulho, e fala alto porque ali todo mundo fala alto.\n\n«Meu irmão não ficou louco. Eu conheço louco, o nosso pai foi um.» Ele bate com o martelo uma vez, sem necessidade. «Boran ficou COM MEDO. São coisas diferentes e ninguém aqui sabe a diferença.»\n\nEle escreve um bilhete de três palavras e dobra.\n\n«O escoadouro da face norte. Dê isto a quem estiver do outro lado. Se for o Halgar, ele deixa passar. Se não for o Halgar, corra.»",
            facts: [
              "Boran Dravenor não enlouqueceu: fechou a fortaleza com medo.",
              "Há um escoadouro de água na face norte da fortaleza.",
            ],
            questions: ["Do que Boran Dravenor tem medo?"],
            flags: ["sabe_do_escoadouro", "tem_bilhete_do_irmao"],
            reward: { xp: 230, influence: 8 },
            next: "dentro",
          },
          failure: {
            text:
              "«Meu irmão é assunto meu.» O martelo não para uma vez sequer.\n\nVocê sai da Fundição com uma coisa só, ouvida de um aprendiz no portão: há um escoadouro de água na face norte, e um homem magro passa.",
            facts: ["Há um escoadouro de água na face norte da fortaleza."],
            flags: ["sabe_do_escoadouro"],
            reward: { xp: 120 },
            next: "dentro",
          },
        },
      ],
    },

    dentro: {
      id: "dentro",
      place: "Pedra Cinza, por dentro",
      time: "Noite",
      text: [
        "O escoadouro despeja num pátio de serviço, e o pátio de serviço está limpo. Gente varre aquilo todo dia.",
        "Não há guarda nenhum. Não é uma fortaleza cercada: é uma fortaleza trancada por dentro, e a diferença está em todo lugar.",
        "A porta do cofre está aberta. Há uma vela acesa lá dentro, e ela não está acesa por sua causa.",
      ],
      choices: [
        {
          id: "entrar",
          label: "Entrar no cofre.",
          outcome: { text: "", next: "cofre" },
        },
      ],
    },

    cofre: {
      id: "cofre",
      place: "Cofre de Pedra Cinza",
      speaker: {
        name: "Lorde Boran Dravenor", role: "Senhor do Passo",
        portraitKey: "portrait_boran_dravenor", expressionSequence: ["exhausted", "attentive"],
      },
      text: [
        "Ele está sentado no chão do próprio cofre, com papéis em volta e uma vela quase no fim, e não se assusta.",
        "«Pelo escoadouro.» Ele nem levanta a cabeça. «Foi por onde eu disse ao meu irmão que alguém viria.»",
        "Ele empurra uma folha pelo chão até o seu pé. É velha, é pesada, e embaixo da assinatura há um laço pequeno e apertado.",
      ],
      choices: [
        {
          id: "ler",
          label: "Ler.",
          outcome: {
            text:
              "É do próprio punho de Antônios, datada de poucos meses antes de ele desfazer a monarquia.\n\nEle reconhece um filho. Nascido fora do casamento, de uma mulher do povo. Diz que o mandou embora com dinheiro e com silêncio, e que não teve coragem de fazer diferente.\n\nVocê lê duas vezes antes de a conta fechar na sua cabeça.\n\nEle não morreu sem herdeiro. Desfazer a monarquia foi ESCOLHA. E sangue vivo do rei vale mais do que qualquer ajuntamento de selos.",
            facts: [
              "Antônios teve um filho de uma mulher do povo, e o confessou por escrito antes de desfazer a monarquia.",
              "Se a linhagem existe, os sete selos não valem nada diante dela.",
            ],
            questions: ["A linhagem de Antônios ainda existe?"],
            evidence: ["confissao_antonios"],
            flags: ["leu_a_confissao"],
            reward: { xp: 400, influence: 10 },
            next: "boran",
          },
        },
      ],
    },

    boran: {
      id: "boran",
      place: "Cofre de Pedra Cinza",
      speaker: {
        name: "Lorde Boran Dravenor", role: "Senhor do Passo",
        portraitKey: "portrait_boran_dravenor", expression: "attentive",
      },
      text: [
        "«Eu segui. Três anos.» Ele bate no monte de papéis ao lado dele. «Cheguei perto e parei, e parei de propósito, e é a única coisa inteligente que eu fiz na vida.»",
        "«Tenho três marcas e nenhum nome. O nome trocou duas vezes, e eu só achei a primeira troca. O ofício foi escolhido pelo rei, humilde de propósito. E a terceira é essa aí.»",
        "Ele aponta o laço embaixo da assinatura, com o dedo, e não diz mais nada sobre ele.",
      ],
      choices: [
        {
          id: "porque",
          label: "«Por que parou?»",
          outcome: {
            text:
              "«Porque no dia em que alguém souber o nome, ou a Coroa mata aquela gente, ou coroa um deles de boneco. Eu não consegui pensar numa terceira coisa.»\n\nEle levanta pela primeira vez, e é mais alto do que parecia sentado.\n\n«Agora a pergunta é sua. E se existir alguém com mais direito que você? Você quer mesmo saber quem é?»",
            facts: [
              "As três marcas da linhagem: um nome trocado duas vezes, um ofício humilde escolhido pelo rei, e um laço embaixo da assinatura.",
            ],
            questions: ["Quem é o herdeiro de Antônios?"],
            flags: ["tem_as_tres_marcas"],
            reward: { xp: 250 },
            next: "saidas",
          },
        },
      ],
    },

    saidas: {
      id: "saidas",
      place: "Cofre de Pedra Cinza",
      text: [
        "Ele põe o selo de Dravenor em cima da confissão e empurra os dois pelo chão até o seu pé.",
        "«Leve os dois ou leve um. Eu não abro este portão de novo de qualquer jeito.»",
      ],
      choices: [
        {
          id: "queimar",
          label: "Queimar a confissão.",
          hint: "Sem ela, os selos voltam a significar alguma coisa — inclusive os seus.",
          outcome: {
            text:
              "A vela está bem ali e o papel é velho. Acaba depressa.\n\nBoran vê e não impede. Quando acaba, ele solta o ar como quem tira um peso, e você entende que ele queria isso e não conseguia fazer.\n\n«Trezentos anos de nada, e eu passei três deles sem dormir.»\n\nO fio morre aqui. E os sete voltam a valer tudo.",
            facts: ["A confissão de Antônios foi queimada."],
            evidence: ["selo_dravenor"],
            flags: ["tem_selo_dravenor", "queimou_a_confissao"],
            reward: { xp: 420, influence: 12 },
            balance: 12,
            balanceReason: "Queimou o que valia mais que os selos",
            end: true,
          },
        },
        {
          id: "guardar",
          label: "Guardar em segredo.",
          hint: "A arma fica na sua mão, e só na sua.",
          outcome: {
            text:
              "Você dobra a confissão em quatro e guarda junto do resto.\n\nBoran olha aquilo entrar no seu gibão e faz que sim devagar, como quem entrega um cachorro doente a um estranho.\n\n«Então agora é você que não vai dormir.»",
            evidence: ["selo_dravenor", "confissao_antonios"],
            flags: ["tem_selo_dravenor", "guardou_a_confissao"],
            reward: { xp: 440, influence: 14 },
            balance: 4,
            balanceReason: "Guardou a arma para si",
            end: true,
          },
        },
        {
          id: "publicar",
          label: "Publicar.",
          hint: "O direito de toda Casa desaba junto — a sua inclusive.",
          outcome: {
            text:
              "Você manda copiar em Pedra Alta, e depois em Trigal, e depois em Cidade Alta, onde há prensa e onde há gente que não pergunta o que está copiando.\n\nEm duas semanas a confissão de Antônios está pregada em porta de igreja em três regiões.\n\nNinguém acredita no começo. Depois um escrivão velho reconhece a mão do rei, e aí ninguém consegue mais não acreditar.\n\nO reino inteiro passa a saber que toda Casa que governa, governa sobre uma mentira. A sua inclusive.",
            facts: ["A confissão de Antônios foi publicada. Todo o reino sabe."],
            evidence: ["selo_dravenor", "confissao_antonios"],
            flags: ["tem_selo_dravenor", "publicou_a_confissao"],
            reward: { xp: 460, influence: 30 },
            balance: -14,
            balanceReason: "Derrubou o direito de todos, o seu junto",
            end: true,
          },
        },
      ],
    },
  },
};
