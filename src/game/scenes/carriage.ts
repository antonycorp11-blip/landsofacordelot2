import type { Cinematic } from "../cinematics";

/**
 * A CARRUAGEM.
 *
 * A primeira coisa que acontece com o jogador, e o teste de toda a direção
 * desta fase: nenhuma pergunta é respondida aqui. Ele sai sabendo MENOS do que
 * gostaria e querendo saber mais.
 *
 * As quatro saídas levam a informações diferentes de propósito:
 *
 *   OBSERVAR   vê como os homens se movem — e é o único jeito de saber que
 *              são soldados antes de falar com eles;
 *   FALAR      arranca um nome e uma mentira, mas eles ficam sabendo do seu
 *              rosto;
 *   ATACAR     dá a prova no corpo, e garante que venham atrás;
 *   IR EMBORA  é permitido, e custa exatamente o que você não viu.
 *
 * Ninguém explica o que é "o sétimo". O moribundo morre antes.
 */
export const carriageScene: Cinematic = {
  id: "wrecked_carriage",
  first: "chegada",
  beats: {
    chegada: {
      id: "chegada",
      place: "Bosque de Elmwood",
      time: "Manhã",
      text: [
        "Uma carruagem atravessada entre as árvores. Dois cavalos mortos, ainda arreados.",
        "Três homens vasculham a carga com pressa. Um quarto se mexe debaixo da carroça.",
        "Nenhum deles viu você.",
      ],
      choices: [
        {
          id: "observar",
          label: "Observar entre as árvores.",
          hint: "Ficar escondido e olhar como eles trabalham",
          check: { attribute: "command", skills: ["tatica", "intriga"], label: "Tática / Intriga" },
          outcome: {
            text:
              "Eles não vasculham como ladrões. Cobrem um ao outro, revezam a vigia da estrada, e um deles usa botas de cano militar sob a capa. " +
              "Passam por uma bolsa de moedas sem abrir. O que procuram tem tamanho certo, e ainda não acharam.",
            facts: [
              "Os homens da carruagem não procuravam dinheiro.",
              "Ao menos um deles carregava equipamento militar escondido.",
            ],
            questions: ["O que eles procuravam na carruagem?"],
            flags: ["viu_soldados"],
            reward: { xp: 90, skillXp: { tatica: 3 } },
            next: "escondido",
          },
          failure: {
            text:
              "Um galho seco cede sob a sua bota. Os três se viram ao mesmo tempo — rápido demais, e todos para o mesmo lado. Gente treinada.",
            facts: ["Os homens da carruagem reagiram como soldados, não como ladrões."],
            flags: ["foi_visto"],
            reward: { xp: 30 },
            next: "avistado",
          },
        },
        {
          id: "falar",
          label: "Aproximar-se abertamente.",
          hint: "Deixar-se ver e puxar conversa",
          check: { attribute: "diplomacy", skills: ["persuasao", "etiqueta"], label: "Diplomacia" },
          outcome: {
            text:
              "«Bandidos», diz o mais velho, apontando a estrada com o queixo. «Chegamos depois. Estamos vendo se sobrou alguém.» " +
              "Ele diz que se chama Harn. Enquanto fala, o mais novo empurra alguma coisa para trás da bota com o pé.",
            facts: ["Um dos homens deu o nome de Harn e disse que chegaram depois do ataque."],
            questions: ["Quem era Harn de verdade?"],
            flags: ["falou_com_eles", "foi_visto"],
            reward: { xp: 80, influence: 2, skillXp: { persuasao: 3 } },
            next: "conversa",
          },
          failure: {
            text:
              "«Você está longe de casa.» O mais velho não responde nada do que você perguntou, e os outros dois já se abriram para os lados. Ninguém está mais olhando a carga.",
            flags: ["falou_com_eles", "foi_visto", "desconfiaram"],
            reward: { xp: 25 },
            next: "avistado",
          },
        },
        {
          id: "atacar",
          label: "Atacar de surpresa.",
          hint: "Eles ainda não viram você",
          outcome: {
            text: "Você esporeia antes que o primeiro grite.",
            flags: ["atacou_primeiro"],
            battle: { name: "Homens da carruagem", band: { milicianos: 2, infantaria: 2 } },
          },
        },
        {
          id: "embora",
          label: "Contornar e seguir viagem.",
          hint: "Não é briga sua",
          outcome: {
            text:
              "Você abre um arco largo entre as árvores e deixa a carroça para trás. Às suas costas, alguém ainda se mexe debaixo dela por algum tempo.",
            facts: ["Houve uma emboscada a uma carruagem no Bosque de Elmwood."],
            questions: ["Quem foi atacado naquela estrada?"],
            flags: ["ignorou_carruagem"],
            reward: { xp: 30 },
            eventState: "looted",
            end: true,
          },
        },
      ],
    },

    /* --------------------------- depois de ver --------------------------- */
    escondido: {
      id: "escondido",
      place: "Bosque de Elmwood",
      text: [
        "Um deles chuta a lona e diz alguma coisa curta. Os três montam sem discutir e saem pela estrada, para o norte.",
        "O homem debaixo da carroça ainda respira.",
      ],
      choices: [
        {
          id: "socorrer",
          label: "Tirar o homem de baixo da carroça.",
          outcome: { text: "", next: "sobrevivente" },
        },
        {
          id: "seguir",
          label: "Seguir os três a distância.",
          hint: "Deixar o ferido e ver aonde eles vão",
          outcome: {
            text:
              "Você os acompanha por meia hora até a estrada se abrir. Eles não seguem para vila nenhuma: entram por um caminho de serviço, do tipo que só usa quem já esteve ali antes. " +
              "Quando você volta, o homem debaixo da carroça já não respira. A mão dele está fechada sobre nada.",
            facts: ["Os atacantes conheciam um caminho de serviço fora da estrada real."],
            questions: ["Alguém os estava esperando?"],
            flags: ["seguiu_atacantes", "perdeu_o_selo"],
            reward: { xp: 110, skillXp: { intriga: 3 } },
            eventState: "looted",
            end: true,
          },
        },
      ],
    },

    conversa: {
      id: "conversa",
      place: "Bosque de Elmwood",
      speaker: { name: "Harn", role: "Diz-se um viajante", seed: "harn_carriage", age: 0.55 },
      text: [
        "«Siga o seu caminho. Isto aqui já está resolvido.»",
        "Ele não se mexe do lugar onde está. Atrás dele, os outros dois esperam que você decida alguma coisa.",
      ],
      choices: [
        {
          id: "insistir",
          label: "«Ainda tem um homem vivo debaixo da carroça.»",
          check: { attribute: "conviction", skills: ["persuasao", "mediacao"], label: "Convicção" },
          outcome: {
            text:
              "Harn olha a carroça por tempo demais. «Então tire.» Ele faz sinal aos outros e os três montam sem pressa, o que é pior do que pressa. " +
              "Saem pela estrada olhando para trás.",
            facts: ["Harn sabia que havia um sobrevivente e o deixou ali."],
            reward: { xp: 100, influence: 3 },
            next: "sobrevivente",
          },
          failure: {
            text: "«Não tem, não.» Harn diz isso sem olhar. A mão dele já desceu para o cinto.",
            flags: ["desconfiaram"],
            battle: { name: "Homens de Harn", band: { milicianos: 2, infantaria: 2 } },
          },
        },
        {
          id: "recuar",
          label: "Recuar e ir embora.",
          outcome: {
            text:
              "Você vira o cavalo devagar, do jeito que se vira diante de cão estranho. Eles ficam olhando até as árvores fecharem atrás de você.",
            flags: ["ignorou_carruagem"],
            reward: { xp: 40 },
            eventState: "looted",
            end: true,
          },
        },
      ],
    },

    avistado: {
      id: "avistado",
      place: "Bosque de Elmwood",
      text: [
        "Os três se espalham sem uma palavra. Um contorna pela direita. Ninguém pergunta quem você é.",
      ],
      choices: [
        {
          id: "enfrentar",
          label: "Enfrentar.",
          outcome: { text: "", battle: { name: "Homens da carruagem", band: { milicianos: 3, infantaria: 2 } } },
        },
        {
          id: "correr",
          label: "Virar o cavalo e correr.",
          hint: "Eles conhecem o seu rosto a partir de agora",
          outcome: {
            text:
              "Você cruza o bosque sem olhar para trás. Ninguém o alcança — hoje. Mas três homens viram a sua cara com clareza.",
            facts: ["Três homens armados viram o seu rosto no Bosque de Elmwood."],
            flags: ["fugiu_da_carruagem", "conhecem_seu_rosto"],
            reward: { xp: 45 },
            eventState: "looted",
            end: true,
          },
        },
      ],
    },

    /* ---------------------------- o moribundo ---------------------------- */
    /**
     * POR QUE ELE NÃO VENDE.
     *
     * Tem de ficar resolvido aqui, no primeiro quarto de hora, e não numa
     * revelação tardia: um plebeu com uma joia de ouro no bolso e nenhuma
     * explicação faz o que qualquer um faria — vai vender. Se o jogo não
     * responde por que ele não vendeu, o jogador não acredita em mais nada
     * depois.
     *
     * A resposta é a conta que ele faz sozinho: vender uma coisa que ele não
     * entende é ser roubado com as próprias mãos, porque quem compra sabe o
     * que é. E as três escolhas guardam O MOTIVO — todas ficam com o selo, e
     * é o motivo que inclina a Balança pela primeira vez.
     */
    decisao: {
      id: "decisao",
      place: "Bosque de Elmwood",
      time: "Pouco depois",
      text: [
        "Você fica sozinho com um homem morto e uma caixa aberta na mão.",
        "A coisa sensata é óbvia: descer até o primeiro mercador, vender depressa e sumir antes que alguém venha procurar. Ouro assim paga três anos de vida.",
        "Só que quem comprar vai saber o que está comprando. E você não sabe. Vender o que você não entende é ser roubado com a própria mão.",
      ],
      choices: [
        {
          id: "entender",
          label: "«Primeiro eu entendo o que é isto.»",
          hint: "Guardar. Perguntar. Vender só depois de saber o preço de verdade.",
          outcome: {
            text:
              "Você fecha a caixa e a enfia por dentro da roupa, contra as costelas, onde ninguém esbarra sem querer.\n\nNão é um plano. É só a primeira coisa em muito tempo que depende de você.",
            questions: ["Quanto vale, de verdade, o que eu estou carregando?"],
            flags: ["guardou_para_entender"],
            balance: 2,
            balanceReason: "Guardou para entender",
          },
        },
        {
          id: "lorde",
          label: "«Um lorde mandou matar por isto.»",
          hint: "Nunca teve nada que gente grande quisesse. Agora tem.",
          outcome: {
            text:
              "Homens armados vieram ao bosque por esta caixa. Homens que respondem a alguém com anel no dedo.\n\nA vida inteira você foi coisa que se empurra de um lado para o outro. Pela primeira vez você está com a única coisa da estrada que alguém importante quer — e ela cabe no seu punho.",
            facts: ["Alguém com poder mandou matar por este selo. Eu estou com ele."],
            flags: ["guardou_por_ambicao"],
            balance: 8,
            balanceReason: "Entendeu o que tem na mão",
          },
        },
        {
          id: "promessa",
          label: "«Ele morreu me pedindo uma coisa.»",
          hint: "Um homem qualquer, debaixo de uma carruagem, e um pedido.",
          outcome: {
            text:
              "Ele não era ninguém. Levava a caixa de outro, ganhava por trajeto, e morreu numa estrada de terra sem ninguém saber o nome dele.\n\nVocê conhece essa morte. Metade da gente que você conhece vai ter essa morte.\n\nVocê cava o que dá para cavar e segue com a caixa.",
            facts: ["O mensageiro morreu sem nome numa estrada, levando coisa de outro."],
            flags: ["guardou_pela_promessa"],
            balance: -4,
            balanceReason: "Enterrou um homem que ninguém ia enterrar",
          },
        },
      ],
    },
    sobrevivente: {
      id: "sobrevivente",
      place: "Bosque de Elmwood",
      speaker: { name: "Um homem ferido", role: "Sob a carruagem", seed: "dying_courier", age: 0.5 },
      text: [
        "O eixo saiu de cima dele e não adiantou nada. Ele procura o seu braço sem enxergar direito.",
        "Põe na sua mão uma caixa pequena, lacrada, do tamanho de um punho.",
        "«Não entregue à Coroa.»",
      ],
      choices: [
        {
          id: "quem",
          label: "«Quem fez isso com você?»",
          outcome: {
            text:
              "Ele não responde. A mão aperta a sua com uma força que não devia ter sobrado.\n\n«Não deixe que encontrem o sétimo.»\n\nDepois disso ele não diz mais nada.",
            facts: [
              "O homem da carruagem carregava um selo autêntico da Coroa.",
              "As últimas palavras dele foram: não deixe que encontrem o sétimo.",
            ],
            questions: [
              "O que é «o sétimo»?",
              "Por que alguém com um selo Real pediria para não confiar na Coroa?",
            ],
            evidence: ["royal_seal"],
            flags: ["tem_selo", "ouviu_o_setimo"],
            reward: { xp: 140, influence: 4 },
            eventState: "looted",
            next: "decisao",
          },
        },
        {
          id: "coroa",
          label: "«Por que não à Coroa?»",
          outcome: {
            text:
              "Ele ri uma vez, e a risada vira outra coisa.\n\n«Porque foi de lá que...»\n\nA frase não termina. A mão dele abre.\n\nDentro da caixa há um selo. Autêntico, com a marca da chancelaria Real.",
            facts: [
              "O homem da carruagem carregava um selo autêntico da Coroa.",
              "Ele começou a dizer que a ordem partira da própria Coroa, e morreu antes de terminar.",
            ],
            questions: [
              "Quem na Coroa mandou atacar a carruagem?",
              "O que é «o sétimo»?",
            ],
            evidence: ["royal_seal"],
            flags: ["tem_selo", "suspeita_da_coroa"],
            reward: { xp: 140, influence: 4 },
            eventState: "looted",
            next: "decisao",
          },
        },
      ],
    },
  },
};
