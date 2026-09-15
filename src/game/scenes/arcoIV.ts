/**
 * ARCO IV — KARNETH NÃO ESCONDE.
 *
 * Garrick diz na cara que é dele e manda vir buscar. Não vende, não troca, e
 * tem a melhor tropa do reino — então os dois caminhos custam caro: guerra,
 * que exige Casas dispostas a olhar para o outro lado, ou a necessidade dele,
 * que é o problema interno que ele não pode admitir.
 *
 * E é aqui que o jogador funda a própria Casa, porque ninguém faz aliança com
 * um homem sem nome.
 */
import type { Cinematic } from "../cinematics";

export const garrickScene: Cinematic = {
  id: "arco4_garrick",
  noEscape: true,
  first: "patio",
  beats: {
    patio: {
      id: "patio",
      place: "Castelo Karneth",
      speaker: {
        name: "Lorde Garrick Karneth", role: "Senhor das Marchas",
        portraitKey: "portrait_garrick_karneth", expression: "hard",
      },
      text: [
        "Ele recebe no pátio de treino, de manga arregaçada, e não manda ninguém parar de treinar enquanto fala com você.",
        "«Sei o que você quer. Metade do reino já sabe, e a outra metade é surda.»",
        "Ele tira o selo de dentro da camisa, pendurado num cordão, como quem mostra uma cicatriz.",
        "«É meu. Está aqui. Venha buscar.»",
      ],
      choices: [
        {
          id: "comprar",
          label: "Oferecer o que você tem.",
          hint: "Ouro, terra, o que for.",
          outcome: {
            text:
              "Ele deixa você terminar, o que é generoso da parte dele.\n\n«Você ofereceu ouro a um homem que tem quatro mil lanças.» Ele guarda o selo dentro da camisa. «Eu não sou pobre e não sou burro, e você acaba de me dizer que acha que eu sou um dos dois.»\n\nEle volta a olhar o treino.\n\n«Duas saídas. Você vem com exército, e eu respeito. Ou você descobre o que é que eu preciso, e aí a gente conversa. Não há terceira.»",
            facts: ["Garrick Karneth não vende o selo. Ou exército, ou algo que ele precise."],
            questions: ["Do que Garrick Karneth precisa e não pode pedir?"],
            reward: { xp: 120 },
            next: "primo",
          },
        },
        {
          id: "ameacar",
          label: "«Então eu venho buscar.»",
          hint: "Ele respeita isso mais do que gostaria.",
          outcome: {
            text:
              "Pela primeira vez a cicatriz que puxa a boca dele para cima combina com o resto da cara.\n\n«Olha só.» Ele bate no peito, onde o selo está. «Traga exército, então. Eu recebo exército desde os dezesseis.»\n\nEle vira para ir e diz o resto de costas, e é aí que a voz muda.\n\n«E traga depressa. Porque se você demorar, quem vai estar sentado nesta cadeira quando você chegar não sou eu.»",
            facts: [
              "Garrick Karneth não vende o selo.",
              "Ele espera perder a cadeira para alguém, e sabe para quem.",
            ],
            questions: ["Quem vai tomar a cadeira de Garrick Karneth?"],
            flags: ["garrick_te_respeita"],
            reward: { xp: 150, influence: 6 },
            next: "primo",
          },
        },
      ],
    },

    primo: {
      id: "primo",
      place: "Baradra",
      speaker: { name: "Sargento Uhl Marren", role: "Trinta anos nas Marchas", seed: "uhl_marren", age: 0.6 },
      text: [
        "Na taberna de Baradra ninguém fala do lorde. Falam do primo dele, e falam bem.",
        "O velho sargento que aceita a sua cerveja explica sem ser perguntado, que é o jeito de quem já decidiu de que lado está.",
        "«Metade das lanças jurou a Rodric, não a Garrick. Rodric paga em dia e Garrick paga quando dá. Um dia dessa conta fecha.»",
      ],
      choices: [
        {
          id: "rodric",
          label: "Procurar Rodric antes de Garrick saber.",
          hint: "Ouvir os dois antes de escolher.",
          check: { attribute: "diplomacy", skills: ["intriga", "persuasao"], label: "Diplomacia / Intriga" },
          outcome: {
            text:
              "Rodric Karneth recebe no Forte Avançado e não esconde nada, porque acha que já ganhou.\n\n«Eu não quero a Casa. Quero o soldo dos homens em dia e o meu primo longe da fronteira, onde ele já se meteu em três guerras que a Casa pagou.»\n\nEle olha você com clareza.\n\n«Você quer aquele pedaço de ouro. Eu quero a tesouraria. Não somos concorrentes.»",
            facts: [
              "Metade das lanças de Karneth jurou a Rodric, primo de Garrick.",
              "Rodric não quer a Casa: quer a tesouraria e o primo longe da fronteira.",
            ],
            flags: ["conheceu_rodric"],
            reward: { xp: 180, influence: 6 },
            next: "escolha",
          },
          failure: {
            text:
              "Você chega ao Forte Avançado e Garrick chegou primeiro — não com exército, com um escrivão e um contrato.\n\nRodric assina o que lhe põem na frente, de cara fechada, e não olha para você uma vez sequer.\n\nO problema interno de Karneth acaba de ser resolvido sem você. Sobra a outra saída.",
            facts: ["Garrick resolveu o problema com o primo antes de você. Resta o exército."],
            flags: ["perdeu_rodric"],
            reward: { xp: 70 },
            next: "escolha",
          },
        },
        {
          id: "direto",
          label: "Levar isso a Garrick.",
          hint: "Ele não pode admitir que sabe. Você pode dizer.",
          outcome: {
            text:
              "Você diz o nome Rodric no pátio de treino e o barulho do pátio inteiro some por um segundo.\n\nGarrick não nega. Não é homem de negar.\n\n«Trinta e um anos.» Ele olha as próprias mãos. «Meu pai me deu as Marchas e deu a tesouraria ao irmão dele, e eu passei a vida defendendo fronteira com o dinheiro de outro homem.»\n\nEle olha para você.\n\n«Você quer o selo. Resolva isso, e a gente conversa.»",
            facts: [
              "Metade das lanças de Karneth jurou a Rodric, primo de Garrick.",
              "A tesouraria de Karneth nunca esteve com o senhor das Marchas.",
            ],
            flags: ["garrick_admitiu"],
            reward: { xp: 160, influence: 8 },
            next: "escolha",
          },
        },
      ],
    },

    escolha: {
      id: "escolha",
      place: "Marchas de Karneth",
      text: [
        "Duas saídas, e as duas custam mais do que você tem hoje.",
        "Um acordo entre Garrick e o primo precisa de alguém de fora que os dois aceitem — e ninguém aceita um forasteiro sem nome.",
        "Uma guerra precisa de exército, e exército precisa de bandeira.",
      ],
      choices: [
        {
          id: "fundar",
          label: "Fundar a sua Casa, e ir à mesa.",
          hint: "Nome próprio, bandeira própria. É o que faltava para ser gente de mesa.",
          outcome: {
            text:
              "Você manda lavrar em Pedra Alta, porque é o escrivão mais perto e porque cobra pouco.\n\nUm nome, um brasão feito às pressas e uma linha dizendo que esta Casa não deve juramento a ninguém.\n\nNa primeira vez que alguém diz o nome em voz alta numa sala, você entende por que os nobres gastam tanto com isso.",
            facts: ["Você fundou a sua própria Casa. Ela não deve juramento a ninguém."],
            flags: ["fundou_a_casa"],
            foundHouse: true,
            reward: { xp: 300, influence: 25 },
            balance: 5,
            balanceReason: "Fundou a própria Casa",
            next: "acordo",
          },
        },
        {
          id: "guerra",
          label: "Fundar a sua Casa, e ir buscar.",
          hint: "Ele disse para vir com exército. Ele vai respeitar, e vai matar você por isso.",
          outcome: {
            text:
              "O nome é lavrado em Pedra Alta no mesmo dia, porque bandeira é o que falta para juntar homem pago.\n\nA carta de guerra sai na manhã seguinte e não é respondida, o que nas Marchas quer dizer que foi lida.\n\nMarcha Alta tem muralha de pedra viva e uma guarnição que treina todo dia à vista de quem chega. Não se toma aquilo com pressa nem com fome: toma-se com acampamento, com aríete e com paciência — e com gente disposta a subir.",
            facts: [
              "Você fundou a sua própria Casa. Ela não deve juramento a ninguém.",
              "Você está em guerra com a Casa Karneth. O selo está atrás da muralha de Marcha Alta.",
            ],
            questions: ["Como tomar o Castelo Karneth?"],
            flags: ["fundou_a_casa", "arco4_guerra"],
            foundHouse: true,
            declareWarOn: "house_karneth",
            reward: { xp: 320, influence: 25 },
            balance: 9,
            balanceReason: "Foi buscar com exército",
            end: true,
          },
        },
      ],
    },

    acordo: {
      id: "acordo",
      place: "Castelo Karneth",
      time: "Mesa redonda, sem criados",
      speaker: {
        name: "Lorde Garrick Karneth", role: "Senhor das Marchas",
        portraitKey: "portrait_garrick_karneth", expressionSequence: ["hard", "attentive"],
      },
      text: [
        "Os dois primos aceitam uma mesa porque a mesa tem um terceiro nome nela, e o terceiro nome é o seu.",
        "Rodric quer a tesouraria por escrito. Garrick quer que ninguém saiba que precisou.",
        "«Escreva você», diz Garrick. «Se sair dos seus dedos, não saiu dos meus.»",
      ],
      choices: [
        {
          id: "justo",
          label: "Escrever o acordo que serve aos dois.",
          hint: "Tesouraria a Rodric, fronteira a Garrick, e nenhum dos dois humilhado.",
          check: { attribute: "stewardship", skills: ["negociacao", "diplomacia"], label: "Administração / Negociação" },
          outcome: {
            text:
              "Leva quatro horas e três versões.\n\nRodric assina primeiro. Garrick assina depois e fica olhando a própria assinatura por um tempo longo demais.\n\nDepois tira o cordão do pescoço e põe o selo em cima do papel, sem cerimônia nenhuma.\n\n«Trezentos anos a minha Casa guardou isso e eu nunca soube por quê. Hoje eu sei o que vale: vale a minha fronteira paga em dia.»\n\nE, na porta: «Se vierem tomar de você, mande recado. Eu venho.»",
            facts: ["O selo de Karneth é seu. Garrick Karneth prometeu vir se chamarem."],
            evidence: ["selo_karneth"],
            flags: ["tem_selo_karneth", "karneth_aliado"],
            reward: { xp: 420, influence: 22 },
            end: true,
          },
          failure: {
            text:
              "A sua versão favorece um dos dois e os dois percebem na mesma linha.\n\nGarrick levanta primeiro. «Eu disse para escrever, não para escolher.»\n\nO acordo sai assim mesmo — pior, mais caro, e com Rodric levando a tesouraria e o pátio de treino junto.\n\nGarrick põe o selo na sua mão sem olhar para você. «Está pago. Agora saia das minhas Marchas.»",
            facts: ["O selo de Karneth é seu. Garrick não quer você por perto."],
            evidence: ["selo_karneth"],
            flags: ["tem_selo_karneth", "karneth_ressentido"],
            reward: { xp: 300, influence: 8 },
            end: true,
          },
        },
        {
          id: "seu_lado",
          label: "Escrever o acordo que serve a você.",
          hint: "Os dois precisam de você mais do que um do outro.",
          outcome: {
            text:
              "Você escreve uma cláusula a mais, no meio, onde cláusula a mais não chama atenção: as Marchas devem apoio militar ao portador deste acordo por sete anos.\n\nRodric assina sem ler direito. Garrick lê, para na cláusula, e olha para você por cima do papel.\n\nEle assina assim mesmo.\n\n«Você vai longe», ele diz, e não é elogio. Põe o selo na mesa e empurra com o dedo. «Gente que vai longe costuma ir sozinha.»",
            facts: ["O selo de Karneth é seu, e as Marchas devem apoio militar ao portador do acordo por sete anos."],
            evidence: ["selo_karneth"],
            flags: ["tem_selo_karneth", "karneth_obrigado"],
            reward: { xp: 400, influence: 18 },
            balance: 8,
            balanceReason: "Escreveu a si mesmo no acordo",
            end: true,
          },
        },
      ],
    },
  },
};

/**
 * DEPOIS DA MURALHA.
 *
 * Só acontece por este caminho: o jogador tomou Marcha Alta com cerco de
 * verdade, com acampamento, aríete e assalto. A cena não resolve a guerra —
 * ela chega quando a guerra já foi resolvida pelo jogador.
 */
export const karnethTakenScene: Cinematic = {
  id: "arco4_tomada",
  noEscape: true,
  first: "muralha",
  beats: {
    muralha: {
      id: "muralha",
      place: "Castelo Karneth",
      time: "Com o portão aberto",
      speaker: {
        name: "Lorde Garrick Karneth", role: "Senhor das Marchas",
        portraitKey: "portrait_garrick_karneth", expressionSequence: ["exhausted", "amused"],
      },
      text: [
        "Ele não está no salão. Está na muralha, sentado no parapeito, olhando o próprio pátio de treino cheio dos seus homens.",
        "Não foi desarmado. Ninguém teve coragem de pedir.",
        "«Quanto tempo?» Ele mesmo responde. «Vinte e um dias. Meu pai segurou trinta contra o dobro disso. Mas meu pai tinha a tesouraria.»",
      ],
      choices: [
        {
          id: "cobrar",
          label: "«O selo.»",
          outcome: {
            text:
              "Ele tira o cordão do pescoço e joga por cima do ombro, sem olhar, e você tem de pegar no ar.\n\n«Está aí. Eu disse para vir buscar e o senhor veio buscar. Não me arrependo de ter dito.»\n\nEle olha o pátio de novo.\n\n«O que eu queria mesmo era ter perdido para alguém que não precisasse de vinte e um dias.»",
            facts: ["O selo de Karneth é seu, tomado com cerco."],
            evidence: ["selo_karneth"],
            flags: ["tem_selo_karneth", "karneth_tomado", "karneth_ressentido"],
            reward: { xp: 420, influence: 16 },
            end: true,
          },
        },
        {
          id: "oferecer",
          label: "«Fique com as Marchas. Eu quero só a peça.»",
          hint: "Ele perdeu a muralha. Não precisa perder a fronteira.",
          check: { attribute: "diplomacy", skills: ["lideranca", "diplomacia"], label: "Diplomacia / Liderança" },
          outcome: {
            text:
              "Ele demora tanto para responder que você começa a achar que não vai responder.\n\n«O senhor tomou a minha casa em vinte e um dias e agora está me devolvendo a fronteira.» Ele tira o cordão e entrega na mão, não pelo ar. «Isso ou é burrice ou é a coisa mais esperta que alguém já fez comigo.»\n\nEle levanta do parapeito.\n\n«Os tarasques do norte não sabem que eu perdi. Vão continuar não sabendo. E quando vierem tomar isso de você, eu venho.»",
            facts: [
              "O selo de Karneth é seu, e Garrick ficou com as Marchas.",
              "Garrick Karneth prometeu vir se vierem tomar o que é seu.",
            ],
            evidence: ["selo_karneth"],
            flags: ["tem_selo_karneth", "karneth_tomado", "karneth_aliado"],
            reward: { xp: 480, influence: 26 },
            balance: -6,
            balanceReason: "Devolveu o que tinha tomado",
            end: true,
          },
          failure: {
            text:
              "«Não.» Ele nem deixa terminar. «O senhor entrou pela minha muralha. Não venha agora querer também que eu goste.»\n\nJoga o cordão por cima do ombro e desce da muralha sem olhar para trás.",
            facts: ["O selo de Karneth é seu, tomado com cerco."],
            evidence: ["selo_karneth"],
            flags: ["tem_selo_karneth", "karneth_tomado", "karneth_ressentido"],
            reward: { xp: 400, influence: 12 },
            end: true,
          },
        },
      ],
    },
  },
};
