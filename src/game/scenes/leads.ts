/**
 * OS QUATRO DE ELMWOOD.
 *
 * As cenas das quatro pessoas que olham o selo. Regra desta camada, repetida
 * porque é a que mais se perde: **ninguém explica o mundo ao jogador.** Cada
 * um responde pelo próprio interesse e pela própria posição, e cada um sabe um
 * pedaço que os outros não sabem.
 *
 * As quatro juntas não fecham a resposta. Fecham a pergunta — e apontam para a
 * única pessoa da região que teria a história inteira.
 */
import type { Cinematic } from "../cinematics";

/* ------------------------------ o escrivão ------------------------------ */
/**
 * A cena mais importante das quatro, e o jogador não tem como saber disso.
 *
 * Aled fecha o que escreve com um laço. É mostrado e NÃO é comentado: nenhum
 * personagem aponta, nenhuma linha chama atenção. Vinte e cinco horas depois,
 * a confissão de Antônios em Pedra Cinza tem o mesmo laço embaixo da
 * assinatura, e quem reparar vai reparar sozinho.
 */
export const scribeScene: Cinematic = {
  id: "lead_escrivao",
  first: "mesa",
  beats: {
    mesa: {
      id: "mesa",
      place: "Folhaterra",
      speaker: {
        name: "Mestre Aled Vern", role: "Escrivão", portraitKey: "portrait_aled_vern",
        expression: "attentive",
      },
      text: [
        "A sala cheira a tinta velha e lenha molhada. Ele copia um inventário de gado sem levantar a cabeça.",
        "«Se é carta, dez moedas. Se é contrato, vinte e volta amanhã.»",
      ],
      choices: [
        {
          id: "mostrar",
          label: "Pôr a peça sobre a mesa.",
          hint: "Ele lida com marcas o dia inteiro.",
          outcome: {
            text:
              "A pena para no meio de uma palavra.\n\nEle aproxima a peça da vela, vira, aproxima mais. Fica assim tempo demais.\n\n«Onde é que você achou isto.»\n\nNão é pergunta. Ele responde sozinho: «Esta marca é de chancelaria. Real. Eu sei porque meu pai me ensinou a copiar, e ele aprendeu com o dele, e ninguém usa isso há trezentos anos.»",
            facts: [
              "A marca do selo é de chancelaria Real, fora de uso há trezentos anos.",
              "Aled Vern, escrivão de Folhaterra, aprendeu a reconhecê-la com o pai.",
            ],
            questions: ["Por que a chancelaria Real parou de usar essa marca?"],
            reward: { xp: 60 },
            next: "carta",
          },
        },
        {
          id: "descrever",
          label: "Descrever a marca sem tirá-la do bolso.",
          hint: "Saber sem mostrar.",
          check: { attribute: "diplomacy", skills: ["persuasao", "etiqueta"], label: "Diplomacia / Persuasão" },
          outcome: {
            text:
              "Ele escuta com os olhos no papel e responde como quem fala de tempo.\n\n«Marca dessas é de chancelaria antiga. Documento assim não existe mais em circulação — o que existe é falsificação, e falsificação dá corda.»\n\nE volta a copiar o inventário. Não pergunta o que você tem.",
            facts: ["A marca do selo é de chancelaria Real, fora de uso há muito tempo."],
            questions: ["Por que a chancelaria Real parou de usar essa marca?"],
            reward: { xp: 45 },
            next: "carta",
          },
          failure: {
            text:
              "Ele ouve até o fim e larga a pena.\n\n«Ou você põe na mesa, ou eu tenho trabalho.»\n\nVocê não põe. Ele volta ao inventário e não olha mais para você.",
            reward: { xp: 15 },
            flags: ["escrivao_desconfiou"],
            end: true,
          },
        },
        {
          id: "sair",
          label: "Isto foi um erro. Sair.",
          outcome: {
            text: "Você sai antes de dizer a que veio. Ele nem percebe.",
            end: true,
          },
        },
      ],
    },

    carta: {
      id: "carta",
      place: "Folhaterra",
      speaker: {
        name: "Mestre Aled Vern", role: "Escrivão", portraitKey: "portrait_aled_vern",
        expressionSequence: ["attentive", "neutral"],
      },
      text: [
        "«Eu não sei mais do que isso, e não quero saber. Mas quem saberia é quem manda aqui, e a Casa Silvarden não recebe quem chega da estrada.»",
        "Ele puxa uma folha limpa e começa a escrever sem perguntar se você quer.",
        "«Isto diz que você me procurou por assunto de escrita e que eu respondi por você. Não abre porta de lorde. Abre porta de quem abre porta de lorde.»",
      ],
      choices: [
        {
          id: "pegar",
          label: "Pegar a carta.",
          outcome: {
            text:
              "Ele assina, e embaixo da última linha faz um laço pequeno e apertado, sem pensar, do mesmo jeito que faria um ponto final.\n\nSopra a tinta e entrega.\n\n«Vá por Serenvale. E não mostre essa peça para quem usa farda.»",
            facts: ["Quem teria a história inteira é a Casa que manda em Elmwood: Silvarden."],
            questions: ["Como chegar perto de Lorde Edran Silvarden?"],
            evidence: ["carta_do_escrivao"],
            reward: { xp: 70, influence: 3 },
            flags: ["tem_carta_do_escrivao", "viu_o_laco"],
            end: true,
          },
        },
        {
          id: "pagar",
          label: "Deixar moedas na mesa.",
          hint: "Ele não pediu.",
          outcome: {
            text:
              "Ele olha as moedas, olha você, e empurra metade de volta.\n\n«Carta é dez.»\n\nAssina, e embaixo da última linha faz um laço pequeno e apertado, sem pensar, do mesmo jeito que faria um ponto final. Sopra a tinta e entrega.\n\n«Vá por Serenvale. E não mostre isso para quem usa farda.»",
            facts: ["Quem teria a história inteira é a Casa que manda em Elmwood: Silvarden."],
            questions: ["Como chegar perto de Lorde Edran Silvarden?"],
            evidence: ["carta_do_escrivao"],
            reward: { xp: 70, influence: 5, gold: -10 },
            flags: ["tem_carta_do_escrivao", "viu_o_laco", "pagou_o_escrivao"],
            balance: -1,
            balanceReason: "Pagou quem não cobrou",
            end: true,
          },
        },
      ],
    },
  },
};

/* ------------------------------ o mercador ------------------------------ */
/** Ele vê preço. E o preço que ele oferece é a informação. */
export const merchantScene: Cinematic = {
  id: "lead_mercador",
  first: "balcao",
  beats: {
    balcao: {
      id: "balcao",
      place: "Serenvale",
      speaker: { name: "Ovid Marsh", role: "Compra metal velho", seed: "ovid_marsh", age: 0.62 },
      text: [
        "O balcão é uma tábua sobre dois barris e atrás dele há mais balança do que mercadoria.",
        "Ele pesa a peça na mão antes de olhar para ela. Depois olha, e a mão para de se mexer.",
        "«Quarenta.» Pausa. «Sessenta. Sessenta e é bom para você.»",
      ],
      choices: [
        {
          id: "insistir",
          label: "«Sessenta por ouro velho? Diga o preço de verdade.»",
          check: { attribute: "stewardship", skills: ["avaliacao", "negociacao"], label: "Administração / Avaliação" },
          outcome: {
            text:
              "Ele ri sem vontade nenhuma.\n\n«O preço de verdade eu não sei. Sei que tem um homem da capital passando nas praças há três anos comprando ouro antigo por peso e pagando acima. Não pergunta de onde veio. Não pechincha.»\n\nEle empurra a peça de volta pelo balcão, com dois dedos, como quem devolve carvão quente.\n\n«Eu compro pelo peso. Isso aí não é peso.»",
            facts: [
              "Há três anos um comprador da capital paga acima do peso por ouro antigo, sem perguntar a origem.",
            ],
            questions: ["Quem na capital está comprando ouro antigo, e por quê?"],
            reward: { xp: 65, careerXp: { TRADE: 25 } },
            flags: ["sabe_do_comprador_da_capital"],
            end: true,
          },
          failure: {
            text:
              "«O preço de verdade é o que eu falei.» Ele já está guardando a balança.\n\n«Sessenta hoje. Amanhã eu não lembro de você.»\n\nE não lembra mesmo.",
            reward: { xp: 20 },
            end: true,
          },
        },
        {
          id: "vender",
          label: "«Fechado. Sessenta.»",
          hint: "Dinheiro agora.",
          outcome: {
            text:
              "Ele conta as moedas devagar e para na trigésima.\n\n«Volta amanhã que eu completo.»\n\nÉ mentira, e vocês dois sabem. O que ele quer é uma noite com a peça na mão para mostrar a alguém — e você acaba de descobrir, pela cara dele, que sessenta moedas era pouco demais para ele ter oferecido tão rápido.\n\nVocê recolhe a peça e sai. Ele não tenta segurar.",
            facts: ["O mercador ofereceu rápido demais. Quem oferece assim já sabe para quem revender."],
            questions: ["Quanto vale, de verdade, o que eu estou carregando?"],
            reward: { xp: 45 },
            end: true,
          },
        },
        {
          id: "guardar",
          label: "Guardar a peça e ir embora.",
          outcome: {
            text:
              "Você fecha a mão e vai. Ele fala com as suas costas:\n\n«Se mudar de ideia, eu pago mais que qualquer um daqui. Muito mais.»\n\nEle não precisava ter dito a última parte.",
            facts: ["O mercador de Serenvale pagaria muito acima do que a peça parece valer."],
            reward: { xp: 35 },
            end: true,
          },
        },
      ],
    },
  },
};

/* ------------------------------ o sacerdote ----------------------------- */
/** Ele vê símbolo. E o que ele sabe está num livro que ele não devia ter lido. */
export const priestScene: Cinematic = {
  id: "lead_sacerdote",
  first: "clareira",
  beats: {
    clareira: {
      id: "clareira",
      place: "Bosque Sagrado",
      speaker: { name: "Irmão Bramm", role: "Guardião do bosque", seed: "irmao_bramm", age: 0.7 },
      text: [
        "O velho está ajoelhado tirando musgo de uma pedra que não tem nada escrito.",
        "Ele olha a peça de longe, sem tocar. Depois se levanta mais rápido do que a idade permite.",
        "«Guarde isso. Guarde agora.»",
      ],
      choices: [
        {
          id: "insistir",
          label: "«O senhor sabe o que é.»",
          check: { attribute: "conviction", skills: ["teologia", "pregacao"], label: "Convicção / Teologia" },
          outcome: {
            text:
              "Ele olha para os lados de um jeito ridículo num lugar onde não há ninguém em três léguas.\n\n«Eu vi um desenho disso uma vez. Num livro que foi tirado da biblioteca de Luminária no ano em que eu entrei, e eu era menino e li o que não devia.»\n\nEle fecha os olhos para lembrar direito.\n\n«Eram sete. Sete desenhos iguais e diferentes. E embaixo tinha uma frase que eu nunca entendi: quem os tiver deve reinar.»",
            facts: [
              "Existiam sete peças como esta, desenhadas juntas num livro retirado de circulação.",
              "A frase que acompanhava os sete desenhos: quem os tiver deve reinar.",
            ],
            questions: ["Onde estão as outras seis?", "Que livro foi tirado da biblioteca de Luminária, e por quê?"],
            reward: { xp: 85, influence: 3 },
            flags: ["ouviu_os_sete"],
            end: true,
          },
          failure: {
            text:
              "«Eu sei que não é coisa de se andar com ela.» Ele volta ao musgo e não se levanta mais.\n\n«Vá para casa, filho. Se você tiver uma.»",
            reward: { xp: 25 },
            end: true,
          },
        },
        {
          id: "confessar",
          label: "Contar da carruagem.",
          hint: "A verdade inteira, para um homem que reza.",
          outcome: {
            text:
              "Ele escuta até o fim sem interromper, e quando você termina ele faz o sinal do vale sobre você, não sobre a peça.\n\n«Então um homem morreu para que isso chegasse à sua mão, e você é a última coisa que ele viu.»\n\nEle segura o seu pulso com força.\n\n«Eram sete. Eu vi num livro que tiraram de Luminária quando eu era menino. Sete, e uma frase: quem os tiver deve reinar. Eu rezo para você não ser o sétimo homem a carregar essa.»",
            facts: [
              "Existiam sete peças como esta, desenhadas juntas num livro retirado de circulação.",
              "A frase que acompanhava os sete desenhos: quem os tiver deve reinar.",
            ],
            questions: ["Onde estão as outras seis?"],
            reward: { xp: 90, influence: 5 },
            flags: ["ouviu_os_sete", "contou_ao_sacerdote"],
            balance: -3,
            balanceReason: "Contou a verdade sem ganhar nada",
            end: true,
          },
        },
        {
          id: "sair",
          label: "Guardar e ir.",
          outcome: {
            text: "Você guarda. Ele volta para a pedra e para o musgo, e fica visivelmente aliviado.",
            reward: { xp: 15 },
            end: true,
          },
        },
      ],
    },
  },
};

/* -------------------------------- o guarda ------------------------------ */
/**
 * Ele vê problema.
 *
 * É a única das quatro que cobra depois. Mostrar rende acesso de verdade — e
 * põe o seu rosto num relatório que sai de Elmwood na mesma semana.
 */
export const guardScene: Cinematic = {
  id: "lead_guarda",
  first: "portao",
  beats: {
    portao: {
      id: "portao",
      place: "Castelo Verde",
      speaker: { name: "Sargento Teln", role: "Guarda do portão", seed: "sargento_teln", age: 0.45 },
      text: [
        "Ele já viu você de longe e já decidiu o que você é.",
        "«Petição é terça. Trabalho é na serraria. Esmola não tem.»",
      ],
      choices: [
        {
          id: "mostrar",
          label: "Mostrar a peça.",
          hint: "Ele tem acesso. E tem superior.",
          outcome: {
            text:
              "Ele olha, e o corpo dele muda antes da cara.\n\n«Espere aqui.» Não espera. Chama outro, fala baixo, volta.\n\n«O intendente recebe petição de quem tem assunto. Você tem assunto. Terça, portão do lado, diga o meu nome.»\n\nVocê agradece. Ele já está falando com o outro de novo, e o outro está escrevendo.",
            facts: ["O intendente do Castelo Verde recebe petições às terças, pelo portão lateral."],
            questions: ["Para quem o Castelo Verde manda relatório?"],
            reward: { xp: 80, influence: 6 },
            flags: ["acesso_ao_intendente", "coroa_sabe", "conhecem_seu_rosto"],
            balance: 2,
            balanceReason: "Usou o selo para abrir porta",
            end: true,
          },
        },
        {
          id: "sondar",
          label: "Perguntar por ouro antigo, sem mostrar nada.",
          check: { attribute: "diplomacy", skills: ["intriga", "persuasao"], label: "Diplomacia / Intriga" },
          outcome: {
            text:
              "Ele cospe de lado.\n\n«Ouro antigo. Todo mês aparece um.» Ele mede você outra vez, agora com menos desprezo. «Passou dois homens da capital aqui na primavera perguntando o mesmo. Não eram mercadores. Mercador não anda com escolta de quatro.»\n\nE fecha: «Petição é terça.»",
            facts: ["Dois homens da capital, com escolta de quatro, passaram por Elmwood perguntando por ouro antigo."],
            questions: ["Quem na capital está procurando isto?"],
            reward: { xp: 70 },
            flags: ["sabe_dos_homens_da_capital"],
            end: true,
          },
          failure: {
            text:
              "«Por que é que você quer saber?»\n\nA pergunta fica no ar tempo demais, e a mão dele já está no cinto quando você decide ir embora.\n\nEle vê você ir. E lembra.",
            reward: { xp: 20 },
            flags: ["conhecem_seu_rosto"],
            end: true,
          },
        },
        {
          id: "sair",
          label: "Dar meia-volta.",
          outcome: {
            text: "Você vira antes que ele tenha um motivo para olhar duas vezes.",
            end: true,
          },
        },
      ],
    },
  },
};
