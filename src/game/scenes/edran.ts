/**
 * A AUDIÊNCIA COM EDRAN SILVARDEN.
 *
 * O fecho do Arco I, e a primeira vez que o jogo diz em voz alta o que está
 * em jogo. Tudo até aqui foi um homem carregando uma joia que ninguém sabia
 * ler; daqui em diante ele sabe que existem sete, e sabe o que sete valem.
 *
 * REGRA DA CENA: Edran não é professor. Ele conta a história porque está
 * apavorado e porque precisa que o forasteiro entenda o tamanho do que tem na
 * mão antes de fazer o pedido. Cada coisa que ele explica, explica por
 * interesse próprio.
 *
 * E o pedido é de verdade: aquele selo É da Casa dele, e ele tem razão. As
 * três saídas cobram coisas diferentes e nenhuma é limpa.
 */
import type { Cinematic } from "../cinematics";

export const edranScene: Cinematic = {
  id: "audiencia_edran",
  noEscape: true,
  first: "antessala",
  beats: {
    antessala: {
      id: "antessala",
      place: "Castelo Verde",
      time: "Terça, pelo portão lateral",
      text: [
        "O intendente confere o seu nome numa lista curta e devolve a lista para o bolso sem comentar como ele foi parar ali.",
        "A sala do lorde cheira a lenha e a papel velho. Há mapas de talhões de madeira abertos sobre a mesa, com pesos de chumbo nos cantos.",
        "Edran Silvarden não levanta a cabeça. «Diga o que quer e diga rápido. Eu tenho três aldeias sem grão e dois meses até a neve.»",
      ],
      choices: [
        {
          id: "mostrar",
          label: "Pôr a peça sobre o mapa.",
          hint: "Sem preâmbulo.",
          outcome: { text: "", next: "reconhece" },
        },
        {
          id: "contar",
          label: "Contar primeiro da carruagem.",
          hint: "Quatro mortos e um homem que pediu uma coisa.",
          outcome: {
            text:
              "Ele escuta com meia atenção até você chegar na caixa. Aí a mão dele para em cima do mapa.\n\n«Uma caixa lacrada. Do tamanho de um punho.»\n\nVocê não tinha dito o tamanho.",
            facts: ["Edran Silvarden sabia o tamanho da caixa antes de você dizer."],
            questions: ["Como Edran sabia o que estava sendo transportado?"],
            reward: { xp: 60 },
            next: "reconhece",
          },
        },
      ],
    },

    reconhece: {
      id: "reconhece",
      place: "Castelo Verde",
      speaker: {
        name: "Lorde Edran Silvarden", role: "Senhor de Elmwood",
        portraitKey: "portrait_edran_silvarden", expressionSequence: ["attentive", "shaken"],
      },
      art: "royal_seal",
      text: [
        "Ele vê a peça e a cor sai do rosto dele de cima para baixo, como água descendo.",
        "Empurra a cadeira para trás e vai até a porta. Passa a tranca. Um lorde trancando a própria porta por dentro.",
        "«Onde é que você achou isto.»",
      ],
      choices: [
        {
          id: "verdade",
          label: "A verdade inteira.",
          outcome: {
            text:
              "Ele ouve de pé, com as costas na porta, e quando você termina fica muito tempo sem dizer nada.\n\n«Então eles chegaram a tirar do cofre.» Ele fala para o chão. «Eu achei que fosse boato.»\n\nDepois olha para você com uma coisa nova na cara, que não é gratidão.\n\n«Você faz ideia do que está carregando?»",
            reward: { xp: 70 },
            next: "historia",
          },
        },
        {
          id: "sonegar",
          label: "«Achei. É o que importa.»",
          check: { attribute: "conviction", skills: ["intriga", "persuasao"], label: "Convicção / Intriga" },
          outcome: {
            text:
              "Ele aceita a mentira porque quer aceitar.\n\n«Achou.» Repete a palavra como quem experimenta o peso dela. «Tudo bem. Achou.»\n\nVolta para a mesa e serve dois copos, e a mão dele treme o suficiente para o vinho bater na borda.\n\n«Você faz ideia do que está carregando?»",
            flags: ["escondeu_de_edran"],
            reward: { xp: 80 },
            next: "historia",
          },
          failure: {
            text:
              "«Não minta para mim dentro da minha casa.»\n\nEle não levanta a voz e é pior assim. Você conta o resto, e conta pior do que teria contado de graça.\n\n«Você faz ideia do que está carregando?»",
            flags: ["edran_te_pegou_mentindo"],
            reward: { xp: 30 },
            next: "historia",
          },
        },
      ],
    },

    historia: {
      id: "historia",
      place: "Castelo Verde",
      speaker: {
        name: "Lorde Edran Silvarden", role: "Senhor de Elmwood",
        portraitKey: "portrait_edran_silvarden", expression: "attentive",
      },
      text: [
        "«Há trezentos anos havia sete reinos e um rei sobre todos. Antônios. Morreu sem filho, e a guerra pela cadeira dele começou antes de o corpo esfriar.»",
        "«Então ele fez a única coisa que ainda podia: desfez a própria monarquia. Mandou lavrar sete peças como essa, uma para cada grande Casa, e devolveu a cada reino o seu governo.»",
        "«E deixou escrito que, se um dia as Casas entendessem que o tempo pedia um rei só, entregassem os sete a uma pessoa. Quem tiver os sete deve reinar.»",
      ],
      choices: [
        {
          id: "sete",
          label: "«E onde estão os outros seis?»",
          outcome: {
            text:
              "«Escondidos. Vendidos. Perdidos com as famílias que morreram.» Ele ri sem vontade. «Ninguém fala disso há gerações, e isso não é esquecimento: é prudência. Quem se sabe dono de um é alvo de quem quer juntá-los.»\n\nEle olha a peça de novo.\n\n«E alguém está juntando. Há três gerações. Comprando, confiscando, tomando de linhagem extinta. E não é uma Casa qualquer.»",
            facts: [
              "Existem sete selos. Quem tiver os sete deve reinar, pela lei do rei Antônios.",
              "Alguém vem recolhendo os selos em segredo há três gerações.",
            ],
            questions: ["Quem está recolhendo os selos?", "Onde estão os outros seis?"],
            flags: ["sabe_dos_sete"],
            reward: { xp: 140, influence: 6 },
            next: "pedido",
          },
        },
        {
          id: "coroa",
          label: "«Quem está juntando?»",
          outcome: {
            text:
              "Ele não responde com a boca. Aponta com o queixo para a bandeira azul enrolada num canto da sala, a que se pendura quando vem visita da capital.\n\n«O Protetor do Reino não é rei. É a cabeça da Casa mais forte, com um título provisório que já dura trezentos anos.» Pausa. «Um Protetor que junte os sete deixa de ser provisório.»\n\nEle empurra o copo para longe sem beber.\n\n«Eles têm dois. Que eu saiba.»",
            facts: [
              "Existem sete selos. Quem tiver os sete deve reinar, pela lei do rei Antônios.",
              "A Casa Valdória vem recolhendo os selos em segredo, e tem dois.",
              "O Protetor do Reino não é rei: é a cabeça da Casa mais forte.",
            ],
            questions: ["Onde estão os outros quatro?"],
            flags: ["sabe_dos_sete", "sabe_da_coroa_colecionadora"],
            reward: { xp: 170, influence: 8 },
            next: "pedido",
          },
        },
      ],
    },

    pedido: {
      id: "pedido",
      place: "Castelo Verde",
      speaker: {
        name: "Lorde Edran Silvarden", role: "Senhor de Elmwood",
        portraitKey: "portrait_edran_silvarden", expressionSequence: ["attentive", "hard"],
      },
      art: "royal_seal",
      text: [
        "«Agora a parte que eu preferia não dizer. Essa peça é da minha Casa. Meu pai a vendeu numa colheita ruim, para pagar homens, e morreu deixando que a família fingisse que isso nunca aconteceu.»",
        "«Estava voltando para cá. Eu paguei três anos e uma fortuna por ela, e paguei a quem não devia ter pagado. Foi por isso que mataram o seu mensageiro.»",
        "«Devolva. Eu lhe dou terra em Elmwood, homens para guardá-la, e a minha palavra pelo resto da sua vida. É mais do que um forasteiro tira daqui em dez anos.»",
      ],
      choices: [
        {
          id: "devolver",
          label: "Empurrar a peça sobre a mesa.",
          hint: "É dele por direito. E ele está pagando caro.",
          outcome: {
            text:
              "Ele fecha a mão sobre a peça e fica assim um tempo, com os olhos fechados, respirando como quem largou um peso.\n\nA terra é escriturada na mesma tarde. Você dorme numa cama pela primeira vez em semanas.\n\nAntes do amanhecer o castelo acorda gritando.\n\nEncontraram Edran Silvarden na sala dos mapas, com a porta trancada por dentro. A peça não está com ele. Não está em lugar nenhum.\n\nVocê fica com a terra, com os homens, e com a certeza de que a Coroa nunca perde duas vezes.",
            facts: ["Edran Silvarden foi morto na mesma noite em que recebeu o selo. O selo desapareceu."],
            questions: ["Quem entrou numa sala trancada por dentro?"],
            flags: ["devolveu_o_selo", "edran_morto"],
            removeEvidence: ["royal_seal"],
            grantFief: "f_texugo",
            reward: { xp: 260, gold: 300, influence: 20 },
            balance: -6,
            balanceReason: "Devolveu o que não era seu",
            next: "depois_devolver",
          },
        },
        {
          id: "ficar",
          label: "«Não.»",
          hint: "Sem explicação. Ele que explique para si mesmo.",
          outcome: {
            text:
              "A cara dele muda devagar, e o que fica no lugar do medo é uma coisa muito mais velha e muito mais fria.\n\n«Você entrou na minha casa com o meu nome na boca.»\n\nEle destranca a porta e chama o intendente sem tirar os olhos de você.\n\n«Deixe o homem sair. Quero que ele chegue até a estrada.» E para você, baixo: «Eu não vou mandar matar você aqui dentro. Vou mandar depois.»\n\nVocê chega à estrada. A Guarda de Elmwood monta atrás de você antes do meio-dia — e um correio já saiu para a capital.",
            facts: ["Silvarden e a Coroa sabem seu nome e sabem o que você carrega."],
            flags: ["ficou_com_o_selo", "silvarden_inimigo", "coroa_sabe"],
            reward: { xp: 300, influence: 12 },
            balance: 10,
            balanceReason: "Ficou com o que abre a cadeira",
            hunt: ["patrulha_elmwood", "patrulha_coracao"],
            next: "depois_ficar",
          },
        },
        {
          id: "negociar",
          label: "«Fico com ela. E o senhor ganha comigo.»",
          hint: "A Casa dele já perdeu o selo uma vez. Perder para a Coroa é pior.",
          check: { attribute: "diplomacy", skills: ["persuasao", "diplomacia", "etiqueta"], label: "Diplomacia / Persuasão" },
          outcome: {
            text:
              "«Explique isso em uma frase, e a frase é a sua vida.»\n\nVocê diz que na mão dele a peça volta para o cofre de onde já foi roubada uma vez, e que na sua ela anda.\n\nEle fica tanto tempo em silêncio que o fogo estala duas vezes.\n\n«Trezentos anos guardando, e foi guardar que nos custou.» Ele empurra a peça de volta para você com dois dedos. «Leve. E ouça: se você um dia tiver mais de um, eu quero saber antes da Coroa.»\n\nNa porta, sem se virar: «Eles vêm atrás de você de qualquer jeito. A diferença é que agora tem uma casa em Elmwood onde você pode bater.»",
            facts: [
              "Silvarden e a Coroa sabem seu nome e sabem o que você carrega.",
              "Edran Silvarden deixou o selo com você, e quer saber antes da Coroa se você juntar mais de um.",
            ],
            flags: ["ficou_com_o_selo", "edran_aliado", "coroa_sabe"],
            reward: { xp: 340, influence: 20 },
            balance: 4,
            balanceReason: "Convenceu um lorde a apostar em você",
            hunt: ["patrulha_coracao"],
            next: "depois_ficar",
          },
          failure: {
            text:
              "«Uma frase», ele repete, e você gasta a frase errada.\n\nEle destranca a porta e chama o intendente sem tirar os olhos de você.\n\n«Deixe o homem sair. Quero que ele chegue até a estrada.» E baixo, só para você: «Eu não vou mandar matar você aqui dentro.»\n\nVocê chega à estrada. A Guarda de Elmwood monta atrás de você antes do meio-dia.",
            facts: ["Silvarden e a Coroa sabem seu nome e sabem o que você carrega."],
            flags: ["ficou_com_o_selo", "silvarden_inimigo", "coroa_sabe"],
            reward: { xp: 240, influence: 8 },
            balance: 10,
            balanceReason: "Ficou com o que abre a cadeira",
            hunt: ["patrulha_elmwood", "patrulha_coracao"],
            next: "depois_ficar",
          },
        },
      ],
    },

    /* --------------------------- o que vem agora --------------------------- */

    depois_ficar: {
      id: "depois_ficar",
      place: "Estrada de Elmwood",
      time: "Meio-dia",
      text: [
        "Você tem uma peça de ouro no bolso, o nome numa lista, e a certeza de que existem mais seis em algum lugar do reino.",
        "A lei que um rei morto deixou escrita diz que quem tiver os sete deve reinar. Ela não diz que precisa ser nobre.",
        "Atrás de você, na curva da estrada, há poeira de cavalo. À sua frente há reino demais para um homem sozinho.",
      ],
      choices: [
        {
          id: "seguir",
          label: "Sair da estrada.",
          hint: "Quem anda na estrada é visto de longe.",
          outcome: {
            text:
              "Você corta para dentro do mato, onde árvore é parede e ninguém cavalga depressa.\n\nAgora é fugir, é ter onde dormir, e é ter homens pagos — porque um homem sozinho com isso no bolso não passa do inverno.",
            questions: ["Onde conseguir teto e homens antes que eles me alcancem?"],
            flags: ["arco_ii_aberto"],
            reward: { xp: 60 },
            end: true,
          },
        },
      ],
    },

    depois_devolver: {
      id: "depois_devolver",
      place: "Elmwood",
      time: "Amanhecer",
      text: [
        "Você fica com a terra. Fica com os homens. E fica sabendo de sete peças que decidem quem manda no reino, sem ter nenhuma delas.",
        "Em algum lugar, alguém guarda agora três.",
      ],
      choices: [
        {
          id: "seguir",
          label: "Olhar a terra que é sua.",
          hint: "Por enquanto.",
          outcome: {
            text:
              "O sol sobe sobre um punhado de casas que agora respondem a você.\n\nÉ mais do que você tinha ontem. É muito menos do que teve na mão por uma noite.",
            questions: ["Onde estão os outros seis selos?"],
            flags: ["arco_i_encerrado"],
            reward: { xp: 60 },
            end: true,
          },
        },
      ],
    },
  },
};
