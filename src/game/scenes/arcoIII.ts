/**
 * ARCO III — O SELO QUE FOI VENDIDO.
 *
 * O selo de Elmwood saiu da Casa há quatro gerações e o rastro é de papel:
 * um penhor, um credor morto, um leiloeiro, um livro-caixa queimado pela
 * metade e uma viúva que se lembra de tudo e mente sobre metade.
 *
 * No fim dele está uma família que não faz ideia do que tem — e que perde
 * tudo no dia em que o jogador bate na porta. É por isso que este é o arco
 * que abre o segundo lado da Balança: ele vê o preço de perto pela primeira
 * vez, e ninguém precisa explicar nada.
 *
 * E é onde Ilyra Veyr aparece. Ela chega antes. Sempre.
 */
import type { Cinematic } from "../cinematics";
import { REVEAL_FLAG } from "../balance";

/* ------------------------------ Tomas Elmwood --------------------------- */
export const tomasScene: Cinematic = {
  id: "arco3_tomas",
  noEscape: true,
  first: "salao",
  beats: {
    salao: {
      id: "salao",
      place: "Castelo de Campo Alto",
      speaker: {
        name: "Lorde Tomas Elmwood", role: "Senhor dos Campos Verdes",
        portraitKey: "portrait_tomas_elmwood", expression: "attentive",
      },
      text: [
        "Ele recebe de botas sujas, com terra de verdade nelas, e serve cerveja em vez de vinho.",
        "Fica cordial até você dizer a palavra «selo». Aí ele manda o criado sair.",
        "«Quem lhe disse que a minha Casa teve um desses?»",
      ],
      choices: [
        {
          id: "mostrar",
          label: "Mostrar o seu.",
          hint: "Ele vai entender sozinho.",
          outcome: {
            text:
              "Ele não toca. Olha de longe, e o rosto dele fica mais velho.\n\n«O meu bisavô penhorou o nosso numa seca. Trinta e quatro moedas.» Ele ri com nojo. «Trinta e quatro. A Casa inteira ficou sem nada por trinta e quatro moedas, e o homem morreu achando que ia resgatar no ano seguinte.»\n\n«O credor era um tal Wexley, do Mercado de Grãos. Morreu também. O que sobrou dele virou leilão.»",
            facts: [
              "A Casa Elmwood penhorou o próprio selo há quatro gerações, por trinta e quatro moedas.",
              "O credor era Wexley, do Mercado de Grãos. O espólio dele foi a leilão.",
            ],
            questions: ["Quem comprou o lote de Wexley no leilão?"],
            flags: ["sabe_do_penhor"],
            reward: { xp: 150, influence: 6 },
            end: true,
          },
        },
        {
          id: "perguntar",
          label: "«Ninguém. Por isso eu vim perguntar.»",
          check: { attribute: "diplomacy", skills: ["etiqueta", "persuasao"], label: "Diplomacia / Etiqueta" },
          outcome: {
            text:
              "Ele bebe devagar e decide alguma coisa.\n\n«Meu bisavô penhorou o nosso numa seca. Trinta e quatro moedas.» Ele põe a caneca na mesa com força demais. «A minha Casa é celeiro de Valdória e eu não tenho voz numa mesa porque um homem com fome fez uma conta errada em mil setecentos e noventa.»\n\n«Credor chamado Wexley, do Mercado de Grãos. O espólio dele foi a leilão, e é tudo o que eu sei, e eu já procurei.»",
            facts: [
              "A Casa Elmwood penhorou o próprio selo há quatro gerações, por trinta e quatro moedas.",
              "O credor era Wexley, do Mercado de Grãos. O espólio dele foi a leilão.",
            ],
            questions: ["Quem comprou o lote de Wexley no leilão?"],
            flags: ["sabe_do_penhor"],
            reward: { xp: 170, influence: 8 },
            end: true,
          },
          failure: {
            text:
              "«Então não perguntou a ninguém e veio ao meu salão adivinhar.»\n\nEle se levanta, e a cordialidade de lavrador some por inteiro.\n\n«A porta é por ali. E se eu ouvir esse assunto na boca de um criado meu, eu vou saber de onde saiu.»",
            flags: ["tomas_te_expulsou"],
            reward: { xp: 40 },
            end: true,
          },
        },
      ],
    },
  },
};

/* ------------------------------ o leiloeiro ----------------------------- */
/** Ilyra Veyr chegou primeiro. Ela vai chegar primeiro o arco inteiro. */
export const auctionScene: Cinematic = {
  id: "arco3_leiloeiro",
  noEscape: true,
  first: "tenda",
  beats: {
    tenda: {
      id: "tenda",
      place: "Mercado de Grãos",
      speaker: { name: "Lady Ilyra Veyr", role: "Casa Veyr", seed: "ilyra_veyr", age: 0.45, female: true, portraitKey: "portrait_ilyra_veyr", expression: "amused" },
      text: [
        "O livro de leilões de Wexley está aberto sobre um caixote, com metade das páginas queimadas e a outra metade molhada.",
        "Há uma mulher lendo o livro. Ela não levanta os olhos quando você chega, e não parece surpresa.",
        "«Lote quarenta e um. Ourivesaria antiga, peso e não peça. É esse que você quer.»",
      ],
      choices: [
        {
          id: "quem",
          label: "«Quem é você?»",
          outcome: {
            text:
              "«Alguém que lê depressa.» Ela vira a página com as pontas dos dedos, porque o papel queimado se desfaz.\n\n«O lote quarenta e um foi comprado por uma casa de penhores de Cidade Alta que fechou em vinte anos. O acervo dela foi vendido a peso para um ourives, e o ourives morreu, e a mulher dele está viva.»\n\nSó então ela olha para você.\n\n«Ela está no Pouso dos Mercadores, e mente. Não sobre tudo — sobre metade. Descobrir qual metade é o seu problema.»",
            facts: [
              "O lote 41 do leilão de Wexley foi comprado por uma casa de penhores de Cidade Alta.",
              "O acervo dessa casa foi vendido a peso para um ourives, cuja viúva está no Pouso dos Mercadores.",
            ],
            questions: ["Por que Ilyra Veyr está procurando a mesma coisa que eu?"],
            flags: ["conheceu_ilyra"],
            reward: { xp: 160, influence: 5 },
            next: "porque",
          },
        },
        {
          id: "arrancar",
          label: "Puxar o livro para o seu lado.",
          hint: "Ler você mesmo.",
          check: { attribute: "stewardship", skills: ["avaliacao", "comercio"], label: "Administração / Avaliação" },
          outcome: {
            text:
              "Ela solta o livro sem resistência nenhuma, o que devia ter avisado você.\n\nO lote quarenta e um está lá: ourivesaria antiga, peso e não peça, vendida a uma casa de penhores de Cidade Alta. A página seguinte, que diria o resto, virou cinza.\n\n«Fechou em vinte anos», diz ela, sem se mexer. «O acervo foi a peso para um ourives, o ourives morreu, e a viúva está no Pouso dos Mercadores.»\n\nEla estende a mão para o livro de volta. «Eu li isso antes de você chegar. Levar o livro não leva o que estava dentro dele.»",
            facts: [
              "O lote 41 do leilão de Wexley foi comprado por uma casa de penhores de Cidade Alta.",
              "O acervo dessa casa foi vendido a peso para um ourives, cuja viúva está no Pouso dos Mercadores.",
            ],
            questions: ["Por que Ilyra Veyr está procurando a mesma coisa que eu?"],
            flags: ["conheceu_ilyra", "arrancou_o_livro"],
            reward: { xp: 140, skillXp: { avaliacao: 4 } },
            next: "porque",
          },
          failure: {
            text:
              "O papel queimado se desfaz entre os seus dedos e metade do lote quarenta e um vira pó no caixote.\n\nEla olha aquilo por um segundo longo.\n\n«Casa de penhores de Cidade Alta. Fechou em vinte anos, acervo a peso para um ourives, ourives morto, viúva no Pouso dos Mercadores.» Ela sacode as mãos. «Eu já tinha lido. Você acabou de destruir a cópia de quem vier depois de nós.»",
            facts: [
              "O lote 41 do leilão de Wexley foi comprado por uma casa de penhores de Cidade Alta.",
              "O acervo dessa casa foi vendido a peso para um ourives, cuja viúva está no Pouso dos Mercadores.",
            ],
            questions: ["Por que Ilyra Veyr está procurando a mesma coisa que eu?"],
            flags: ["conheceu_ilyra", "queimou_o_livro"],
            reward: { xp: 110 },
            next: "porque",
          },
        },
      ],
    },

    porque: {
      id: "porque",
      place: "Mercado de Grãos",
      speaker: { name: "Lady Ilyra Veyr", role: "Casa Veyr", seed: "ilyra_veyr", age: 0.45, female: true, portraitKey: "portrait_ilyra_veyr", expressionSequence: ["neutral", "attentive"] },
      text: [
        "«Você vai perguntar por que eu estou ajudando.»",
        "«Não estou. Estou vendo o que você faz quando chegar lá, porque isso me diz mais sobre você do que qualquer coisa que você me conte.»",
      ],
      choices: [
        {
          id: "aceitar",
          label: "«Então venha ver.»",
          outcome: {
            text:
              "Ela fecha o livro queimado e devolve ao caixote, exatamente no lugar onde estava.\n\n«Uma coisa de graça, porque me custa nada: a Casa Veyr não tem terra e não tem selo. O que a gente tem é saber onde as coisas estão antes dos outros.»\n\nEla já está indo quando diz a última parte, e não se vira.\n\n«Quatro pessoas no reino sabem o que você carrega. Você conhece duas.»",
            facts: ["A Casa Veyr não tem terra nem selo: tem informação."],
            questions: ["Quem são as quatro pessoas que sabem o que eu carrego?"],
            flags: ["ilyra_te_observa"],
            reward: { xp: 90, influence: 4 },
            end: true,
          },
        },
      ],
    },
  },
};

/* -------------------------------- a viúva ------------------------------- */
export const goldsmithWidowScene: Cinematic = {
  id: "arco3_viuva_ourives",
  noEscape: true,
  first: "pouso",
  beats: {
    pouso: {
      id: "pouso",
      place: "Pouso dos Mercadores",
      speaker: { name: "Madame Orfa Quill", role: "Viúva do ourives", seed: "orfa_quill", age: 0.74, female: true },
      text: [
        "Ela está na melhor mesa do pouso, com um xale bom e sapatos ruins, e conta uma história para dois caixeiros que já ouviram.",
        "Quando você diz «ourivesaria antiga», a história para no meio.",
        "«Meu marido fundiu tudo. Tudo. Não sobrou peça nenhuma daquele acervo, e eu já disse isso a muita gente.»",
      ],
      choices: [
        {
          id: "aceitar",
          label: "Aceitar a resposta e ir embora.",
          hint: "É o que ela quer.",
          outcome: {
            text:
              "Você agradece e levanta. Ela relaxa cedo demais — solta o ar, pega a caneca — e é isso que estraga a mentira dela.\n\nNa porta você para.\n\n«Ourives não funde tudo. Ourives guarda o que é bonito demais para virar peso.»\n\nEla fica muito quieta.",
            reward: { xp: 70 },
            next: "verdade",
          },
        },
        {
          id: "pressionar",
          label: "«A senhora está mentindo sobre metade.»",
          check: { attribute: "conviction", skills: ["intriga", "persuasao"], label: "Convicção / Intriga" },
          outcome: {
            text:
              "Os dois caixeiros descobrem assunto em outra mesa.\n\n«Sobre metade», ela repete, e não é concordância, é admiração. «Você andou falando com aquela mulher de Veyr.»\n\nEla empurra a caneca para o lado.",
            flags: ["nao_caiu_na_mentira"],
            reward: { xp: 120, skillXp: { intriga: 3 } },
            next: "verdade",
          },
          failure: {
            text:
              "«Mentindo!» Ela levanta a voz o bastante para o pouso inteiro ouvir, e o pouso inteiro decide que você é o problema.\n\nVocê sai. E volta na manhã seguinte, quando ela está sozinha e de ressaca, e aí ela fala — mas fala menos.",
            flags: ["ofendeu_a_viuva"],
            reward: { xp: 60 },
            next: "verdade",
          },
        },
      ],
    },

    verdade: {
      id: "verdade",
      place: "Pouso dos Mercadores",
      speaker: { name: "Madame Orfa Quill", role: "Viúva do ourives", seed: "orfa_quill", age: 0.74, female: true },
      text: [
        "«Ele fundiu quase tudo. Quase.»",
        "«Sobrou uma peça que ele não teve coragem de derreter, e ele não sabia dizer por quê — dizia só que era trabalho de gente melhor do que ele.»",
        "«Quando ele morreu eu paguei o enterro com ela. Vendi por peso de ouro a um moleiro dos Grandes Moinhos, que queria fazer aliança para a filha.»",
      ],
      choices: [
        {
          id: "nome",
          label: "«O nome do moleiro.»",
          outcome: {
            text:
              "«Barrow. Família Barrow, dos Grandes Moinhos.»\n\nEla mexe o resto da caneca sem beber.\n\n«E se você é o terceiro a me perguntar isso este mês, moço, então eu enterrei meu marido com uma coisa que vai enterrar outra gente.»",
            facts: [
              "A peça foi vendida por peso à família Barrow, dos Grandes Moinhos, para virar aliança de casamento.",
              "Você é a terceira pessoa este mês a perguntar por ela.",
            ],
            questions: ["Quem mais perguntou pelos Barrow este mês?"],
            flags: ["sabe_dos_barrow"],
            reward: { xp: 180, influence: 5 },
            end: true,
          },
        },
      ],
    },
  },
};

/* ------------------------------- os Barrow ------------------------------ */
/**
 * O FIM DO RASTRO, e o lugar onde este arco cobra.
 *
 * Os Barrow não são um obstáculo: são um moleiro, a mulher dele e uma moça
 * que casa no domingo. A peça está na bancada do ourives da vila para virar
 * aliança, e vai para o fogo pela manhã.
 *
 * As três saídas custam coisas diferentes, e nenhuma sai barato para eles.
 */
export const barrowScene: Cinematic = {
  id: "arco3_barrow",
  noEscape: true,
  first: "moinho",
  beats: {
    moinho: {
      id: "moinho",
      place: "Grandes Moinhos",
      time: "Sábado, fim de tarde",
      speaker: { name: "Denrick Barrow", role: "Moleiro", seed: "denrick_barrow", age: 0.52 },
      text: [
        "O moinho está limpo e enfeitado, e há mesas montadas no pátio para o dia seguinte.",
        "O moleiro está de bom humor como poucos homens ficam: a filha casa amanhã, e ele pagou tudo.",
        "«Ouro velho? Comprei sim, faz onze anos, para este dia. Está com o ourives da vila desde ontem. Segunda-feira vira aliança.»",
      ],
      choices: [
        {
          id: "comprar",
          label: "Oferecer o triplo do peso, em moeda, agora.",
          hint: "Sai caro e resolve hoje.",
          outcome: {
            text:
              "Ele conta o ouro duas vezes, e na segunda as mãos dele estão firmes de novo.\n\n«Dá para comprar a peça de novo e ainda sobra para o telhado.» Ele sorri, e o sorriso é verdadeiro. «A minha filha nem vai saber.»\n\nNo dia seguinte ela casa com uma aliança comprada às pressas em Trigal, que não serve direito, e passa a festa inteira ajeitando o anel no dedo sem entender por quê.",
            facts: ["O selo de Elmwood estava com a família Barrow, dos Grandes Moinhos, prestes a virar aliança."],
            evidence: ["selo_elmwood"],
            flags: ["tem_selo_elmwood", "comprou_dos_barrow"],
            reward: { xp: 320, gold: -240, influence: 8 },
            balance: 4,
            balanceReason: "Comprou o que não estava à venda",
            next: "cinzas",
          },
        },
        {
          id: "contar",
          label: "Contar a ele o que é a peça.",
          hint: "A verdade inteira, para um homem que vai casar a filha.",
          check: { attribute: "conviction", skills: ["persuasao", "mediacao"], label: "Convicção / Persuasão" },
          outcome: {
            text:
              "Ele ouve sentado, e quando você termina fica olhando as mesas montadas no pátio.\n\n«Então tem gente com lança atrás dessa coisa.» Ele não pergunta se é verdade. «E ela ia estar no dedo da minha filha amanhã.»\n\nEle mesmo vai buscar a peça na casa do ourives, e entrega sem pedir nada.\n\n«Leve longe. E se um dia alguém perguntar de onde veio, o senhor não sabe o nome desta família.»",
            facts: [
              "O selo de Elmwood estava com a família Barrow, prestes a virar aliança.",
              "Denrick Barrow entregou a peça de graça para tirar o perigo de perto da filha.",
            ],
            evidence: ["selo_elmwood"],
            flags: ["tem_selo_elmwood", "os_barrow_te_ajudaram"],
            reward: { xp: 380, influence: 16 },
            balance: -5,
            balanceReason: "Disse a verdade a quem ia pagar por ela",
            next: "cinzas",
          },
          failure: {
            text:
              "Ele ouve até o meio e levanta a mão.\n\n«O senhor está me dizendo que o ouro do enxoval da minha filha é roubado e quer que eu entregue de graça na véspera do casamento.»\n\nEle chama dois sobrinhos com a cabeça, e você sai do pátio andando de costas.\n\nNaquela noite você entra na casa do ourives da vila pela janela dos fundos.",
            flags: ["os_barrow_te_odeiam"],
            reward: { xp: 90 },
            next: "janela",
          },
        },
        {
          id: "roubar",
          label: "Esperar a noite e ir à casa do ourives.",
          hint: "Ninguém precisa saber.",
          outcome: { text: "", next: "janela" },
        },
      ],
    },

    janela: {
      id: "janela",
      place: "Grandes Moinhos",
      time: "Madrugada de domingo",
      text: [
        "A oficina do ourives da vila é uma sala com uma bancada, uma forja fria e um cofre que é um baú com cadeado de aldeia.",
        "A peça está num pano, separada, com o formato do anel já riscado a giz ao lado.",
        "Você troca por uma moeda de peso parecido, que não engana ninguém por mais de um dia.",
      ],
      choices: [
        {
          id: "levar",
          label: "Levar e sumir.",
          outcome: {
            text:
              "Na manhã de domingo o ourives descobre a troca e chama a guarda da vila antes da missa.\n\nO casamento acontece. A noiva casa com o dedo vazio, e a festa passa a tarde inteira falando de outra coisa.\n\nNa segunda-feira o moleiro Denrick Barrow é levado a Trigal para responder por uma dívida que ele pensava ter pago onze anos atrás, porque a peça que quitava a dívida não existe mais.",
            facts: [
              "O selo de Elmwood estava com a família Barrow, prestes a virar aliança.",
              "Denrick Barrow responde em Trigal por uma dívida que a peça quitava.",
            ],
            evidence: ["selo_elmwood"],
            flags: ["tem_selo_elmwood", "roubou_dos_barrow"],
            reward: { xp: 300, influence: -10 },
            balance: 12,
            balanceReason: "Levou e deixou a conta",
            next: "cinzas",
          },
        },
        {
          id: "deixar_ouro",
          label: "Deixar ouro no pano, no lugar dela.",
          hint: "Tudo o que você tem no bolso.",
          outcome: {
            text:
              "Você esvazia a bolsa em cima do pano e sai pela mesma janela.\n\nO ourives não entende, o moleiro não entende, e a noiva casa com uma aliança comprada às pressas em Trigal.\n\nMas ninguém é levado a lugar nenhum, e daqui a dez anos a família Barrow ainda vai estar contando a história do ouro que apareceu na bancada.",
            facts: ["O selo de Elmwood estava com a família Barrow, prestes a virar aliança."],
            evidence: ["selo_elmwood"],
            flags: ["tem_selo_elmwood", "pagou_no_escuro"],
            reward: { xp: 330, gold: -180 },
            balance: -3,
            balanceReason: "Pagou sem ninguém ver",
            next: "cinzas",
          },
        },
      ],
    },

    /* ------------------------- o segundo lado ------------------------- */
    /**
     * A REVELAÇÃO DO SEGUNDO POLO.
     *
     * Ninguém explica. Ele fica com dois selos na mão, olha para trás e vê o
     * preço — e a barra no alto da tela ganha outro lado no meio da cena.
     */
    cinzas: {
      id: "cinzas",
      place: "Estrada dos Grandes Moinhos",
      time: "Domingo, ao longe",
      text: [
        "Você está longe o bastante para não ouvir a música e perto o bastante para ver as luzes do pátio.",
        "Dois na mão. Faltam cinco.",
        "E é a primeira vez que você faz a conta do outro lado: para juntar sete, sete pessoas como aquelas lá embaixo vão pagar por isso, uma de cada vez, e nenhuma delas vai saber por quê.",
      ],
      choices: [
        {
          id: "vale",
          label: "«Vale a pena. Alguém tem que juntar.»",
          hint: "E é melhor que seja você do que a Coroa.",
          outcome: {
            text:
              "Você guarda as duas peças no mesmo bolso e desce para a estrada.\n\nA conta continua sendo a conta. Mas agora ela tem dois lados, e você acabou de escolher um — por enquanto.",
            facts: ["Reunir os sete selos custa alguma coisa a alguém, sete vezes."],
            questions: ["Vale a pena juntar os sete?"],
            flags: ["tem_dois_selos", REVEAL_FLAG],
            reward: { xp: 200, influence: 6 },
            balance: 6,
            balanceReason: "Aceitou o preço",
            end: true,
          },
        },
        {
          id: "duvida",
          label: "«E se o certo fosse acabar com eles?»",
          hint: "Sem selos não há lei. Sem lei não há rei.",
          outcome: {
            text:
              "Sete peças de ouro decidem quem manda num reino de um milhão de pessoas, e nenhuma dessas pessoas foi consultada.\n\nO velho rei fez sete para que não houvesse um. Trezentos anos depois todo mundo quer juntá-las de novo, inclusive você.\n\nVocê desce para a estrada sem ter respondido nada. Mas a pergunta agora existe.",
            facts: ["Reunir os sete selos custa alguma coisa a alguém, sete vezes."],
            questions: ["Vale a pena juntar os sete — ou seria melhor que não existissem?"],
            flags: ["tem_dois_selos", REVEAL_FLAG],
            reward: { xp: 200, influence: 6 },
            balance: -10,
            balanceReason: "Duvidou da própria busca",
            end: true,
          },
        },
      ],
    },
  },
};
