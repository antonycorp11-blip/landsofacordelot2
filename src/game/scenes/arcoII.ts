/**
 * ARCO II — ALGUÉM SABE QUE VOCÊ TEM.
 *
 * O jogador sai do Castelo Verde com duas forças no encalço e uma joia no
 * bolso. Este arco é a fuga e a construção do primeiro chão, e todo sistema
 * que ele ensina é ensinado por necessidade: teto porque dormir na estrada
 * deixou de ser possível, renda porque homem pago come, guarnição porque os
 * caçadores vêm mesmo.
 *
 * Termina quando eles chegam à porta dele — e encontram tropa em vez de um
 * viajante.
 */
import type { Cinematic } from "../cinematics";

/* -------------------------------- o fôlego ------------------------------ */
export const breathScene: Cinematic = {
  id: "arco2_folego",
  noEscape: true,
  first: "mato",
  beats: {
    mato: {
      id: "mato",
      place: "Em algum lugar do bosque",
      text: [
        "Você para porque o cavalo parou, e escuta por muito tempo antes de aceitar que não há nada para escutar.",
        "Perdeu-os. Por enquanto.",
        "Faça a conta, então: doze moedas de comida na bolsa, nenhuma cama, nenhum homem, e uma coisa no bolso pela qual duas Casas mandariam matar.",
      ],
      choices: [
        {
          id: "contar",
          label: "Contar o que você precisa.",
          hint: "Em voz alta, porque não tem mais ninguém para contar.",
          outcome: {
            text:
              "Teto, para não ser achado dormindo.\n\nRenda, porque homem pago come todo dia e você não vai ter como pagar sem terra.\n\nHomens, porque uma porta só é porta se alguém estiver atrás dela.\n\nNada disso existe em Elmwood: aqui você tem nome, e o nome está numa lista. Ao norte, o Passo de Pedra Cinza — terra de Dravenor, que não abre a fortaleza nem para a Coroa e não vai abrir uma carta sobre você.",
            facts: ["A Casa Dravenor não responde a cartas da Coroa há três anos."],
            questions: ["Onde conseguir teto, renda e homens antes que me alcancem?"],
            flags: ["sabe_para_onde_ir"],
            reward: { xp: 80 },
            end: true,
          },
        },
      ],
    },
  },
};

/* ------------------------------- a viúva -------------------------------- */
/**
 * A primeira terra não é comprada nem conquistada: é herdada de alguém que
 * não aguenta mais. Sera Corvin tem cento e cinquenta pessoas, nenhum homem
 * armado e uma dívida que vence antes da neve.
 */
export const widowScene: Cinematic = {
  id: "arco2_viuva",
  noEscape: true,
  first: "portao",
  beats: {
    portao: {
      id: "portao",
      place: "Passagem do Norte",
      time: "Primeira neve fina",
      speaker: { name: "Sera Corvin", role: "Viúva de Ninho do Corvo", seed: "sera_corvin", age: 0.6, female: true },
      text: [
        "Ninho do Corvo é meia dúzia de telhados encostados numa encosta de pedra, e metade deles está sem fumaça.",
        "A mulher que responde por aquilo está consertando uma cerca sozinha, de mãos vermelhas de frio.",
        "«Se você veio cobrar, entre na fila. Se veio comprar, também.»",
      ],
      choices: [
        {
          id: "ouvir",
          label: "«O que é que o senhorio deve?»",
          outcome: {
            text:
              "«Sessenta e dois ao mercado de Pedra Alta, vencendo antes da neve fechar o passo. Meu marido morreu devendo e eu não sei fazer mais do que ele fazia.»\n\nEla larga o martelo.\n\n«Eu tenho cento e cinquenta pessoas aqui e nenhum homem com lança. Se vier alguém com lança, eu entrego tudo. É só isso que eu tenho para negociar.»",
            facts: ["Ninho do Corvo deve sessenta e duas moedas ao mercado de Pedra Alta."],
            reward: { xp: 60 },
            next: "oferta",
          },
        },
      ],
    },

    oferta: {
      id: "oferta",
      place: "Passagem do Norte",
      speaker: { name: "Sera Corvin", role: "Viúva de Ninho do Corvo", seed: "sera_corvin", age: 0.6, female: true },
      text: [
        "«Fica com o senhorio. Paga a dívida, põe homem na cerca, e eu fico com a minha casa e com o meu nome.»",
        "«Eu não estou sendo generosa. Estou sendo velha e com medo.»",
      ],
      choices: [
        {
          id: "pagar",
          label: "Pagar a dívida inteira.",
          hint: "Sessenta e duas moedas, agora.",
          outcome: {
            text:
              "Você conta as moedas na mão dela e ela conta de novo, porque não acredita.\n\nO papel é lavrado no mesmo dia por um escrivão que cobra três moedas e escreve torto.\n\nNinho do Corvo é seu: cento e cinquenta pessoas, uma cerca ruim e uma encosta de pedra. E um teto.",
            facts: ["Ninho do Corvo, no Passo de Pedra Cinza, é seu."],
            questions: ["Como fazer uma terra pobre render antes do inverno?"],
            flags: ["tem_ninho_do_corvo", "pagou_a_divida"],
            grantFief: "f_ninho_corvo",
            reward: { xp: 180, gold: -62, influence: 10 },
            balance: -4,
            balanceReason: "Pagou a dívida de outro",
            end: true,
          },
        },
        {
          id: "prometer",
          label: "«Eu ponho os homens. A dívida é minha a partir de hoje.»",
          hint: "Sem pagar nada hoje. O credor vem depois.",
          check: { attribute: "diplomacy", skills: ["persuasao", "negociacao"], label: "Diplomacia / Persuasão" },
          outcome: {
            text:
              "Ela olha você de cima a baixo, e o que ela está medindo não é a sua bolsa.\n\n«Você não tem sessenta e dois.» Não é pergunta. «Mas você tem cara de quem vai voltar.»\n\nO papel é lavrado. A dívida passa para o seu nome, e o mercado de Pedra Alta vai cobrar de você antes da neve.",
            facts: ["Ninho do Corvo, no Passo de Pedra Cinza, é seu.", "A dívida de sessenta e duas moedas agora é sua."],
            questions: ["Como fazer uma terra pobre render antes do inverno?"],
            flags: ["tem_ninho_do_corvo", "herdou_a_divida"],
            grantFief: "f_ninho_corvo",
            reward: { xp: 210, influence: 6 },
            end: true,
          },
          failure: {
            text:
              "«Cara de quem promete eu já enterrei uma.»\n\nEla volta para a cerca. Você espera, e depois paga — porque não há outro senhorio a três dias daqui e a neve está começando.",
            facts: ["Ninho do Corvo, no Passo de Pedra Cinza, é seu."],
            flags: ["tem_ninho_do_corvo", "pagou_a_divida"],
            grantFief: "f_ninho_corvo",
            reward: { xp: 140, gold: -62 },
            end: true,
          },
        },
        {
          id: "tomar",
          label: "«Fico com o senhorio. A sua casa também é do senhorio.»",
          hint: "Ela não tem um homem com lança.",
          outcome: {
            text:
              "Ela fica muito quieta, e depois assina.\n\n«Meu marido dizia que a diferença entre um senhor e um ladrão é um papel.» Ela empurra o papel. «Aqui está o papel.»\n\nNaquela noite três famílias descem a encosta com o que cabe nas costas. Você fica com cento e vinte pessoas, uma cerca ruim e um nome que já chegou antes de você em toda a vizinhança.",
            facts: ["Ninho do Corvo, no Passo de Pedra Cinza, é seu.", "Três famílias foram embora no dia em que você chegou."],
            flags: ["tem_ninho_do_corvo", "tomou_de_sera"],
            grantFief: "f_ninho_corvo",
            reward: { xp: 180, influence: -6 },
            balance: 9,
            balanceReason: "Tomou de quem não podia recusar",
            end: true,
          },
        },
      ],
    },
  },
};

/* ------------------------------- a renda -------------------------------- */
export const incomeScene: Cinematic = {
  id: "arco2_renda",
  noEscape: true,
  first: "livro",
  beats: {
    livro: {
      id: "livro",
      place: "Ninho do Corvo",
      speaker: { name: "Ordo Hesk", role: "Escreve as contas do senhorio", seed: "ordo_hesk", age: 0.68 },
      text: [
        "O velho que conta os sacos de Ninho do Corvo põe o livro na sua frente sem cerimônia.",
        "«Agora entra mais do que sai. Isso não é riqueza, é o começo dela — mas é a primeira vez em quatro anos.»",
        "«E vai começar a chamar atenção. Terra que rende, alguém quer.»",
      ],
      choices: [
        {
          id: "ouvir",
          label: "«O que é que eu faço com o que sobra?»",
          outcome: {
            text:
              "«Três coisas, e as três brigam entre si.»\n\n«Baixa o imposto e o povo fica, e chega gente de fora, e daqui a um ano rende o dobro. Aumenta e você tem ouro agora e uma revolta depois.»\n\n«Põe obra e a terra sobe sozinha, mas obra é ouro que sai hoje para voltar em meses.»\n\n«E põe homem na cerca. Isso não rende nada. Isso só decide se você continua dono.»",
            facts: ["Imposto, obras e guarnição são as três alavancas de uma terra, e as três brigam entre si."],
            questions: ["Quantos homens seguram Ninho do Corvo?"],
            flags: ["aprendeu_a_administrar"],
            reward: { xp: 120, influence: 4 },
            end: true,
          },
        },
      ],
    },
  },
};

/* ----------------------------- a guarnição ------------------------------ */
export const garrisonScene: Cinematic = {
  id: "arco2_guarnicao",
  noEscape: true,
  first: "cerca",
  beats: {
    cerca: {
      id: "cerca",
      place: "Ninho do Corvo",
      speaker: { name: "Halvar Stenn", role: "Comanda a cerca", seed: "halvar_stenn", age: 0.44 },
      text: [
        "A cerca deixou de ser uma cerca ruim. Há homens em cima dela, e os homens são seus porque você os paga.",
        "O que comanda a coisa cospe no chão antes de falar, que é o jeito dele de dizer bom dia.",
        "«Isto aqui não segura um exército. Segura um bando, e segura um dia. Um dia é bastante para gente como nós.»",
      ],
      choices: [
        {
          id: "perguntar",
          label: "«E se vier gente de Casa?»",
          outcome: {
            text:
              "Ele olha para a estrada do sul antes de responder, o que já é a resposta.\n\n«Passou correio de Elmwood no passo há dois dias, e correio de Elmwood não sobe até aqui por engano.»\n\nEle volta a olhar para você.\n\n«Eu não pergunto o que o senhor fez. Pergunto se o senhor vai estar na cerca quando eles chegarem.»",
            facts: ["Um correio de Elmwood atravessou o Passo há dois dias."],
            questions: ["Quando eles chegam?"],
            flags: ["a_cerca_esta_de_pe"],
            reward: { xp: 140, influence: 6 },
            end: true,
          },
        },
      ],
    },
  },
};

/* -------------------------------- o cerco ------------------------------- */
/**
 * O fecho do arco. Eles vêm, e o jogo esperou de propósito até ele poder
 * ganhar: tudo o que este arco cobrou — terra, renda, homens — é exatamente o
 * que está na cerca agora.
 */
export const siegeScene: Cinematic = {
  id: "arco2_cerco",
  noEscape: true,
  first: "chegam",
  beats: {
    chegam: {
      id: "chegam",
      place: "Ninho do Corvo",
      time: "Antes do amanhecer",
      speaker: { name: "Halvar Stenn", role: "Comanda a cerca", seed: "halvar_stenn", age: 0.44 },
      text: [
        "Eles não vêm escondidos. Vêm pela estrada, com tocha, do jeito de quem tem ordem escrita e não tem pressa.",
        "«Vinte e poucos. Cores de Elmwood, e dois atrás que não são de Elmwood nenhuma.»",
        "«O senhor manda. Eu abro a cerca e entrego, ou eu toco o sino.»",
      ],
      choices: [
        {
          id: "sino",
          label: "«Toque o sino.»",
          hint: "A guarnição desce para a linha com você.",
          outcome: {
            text:
              "O sino de Ninho do Corvo toca pela primeira vez em quatro anos.\n\nOs homens da cerca descem e formam com você na estrada estreita, onde vinte não valem vinte.",
            flags: ["tocou_o_sino"],
            callGarrison: true,
            battle: { name: "Caçadores de Elmwood", band: { infantaria: 9, arqueiros: 5, cavaleiros: 3 }, resume: "depois_do_cerco" },
          },
        },
        {
          id: "entregar",
          label: "«Abra a cerca.»",
          hint: "Entregar o selo acaba com isto hoje.",
          outcome: {
            text:
              "Você desce sem arma e com a caixa na mão, e por um instante acredita que vai acabar bem.\n\nO homem que não é de Elmwood pega a caixa, abre, confere, e faz que sim com a cabeça para alguém atrás dele.\n\nAí ele manda queimar o senhorio assim mesmo.\n\n«Ordem é não deixar quem viu.» Ele diz isso sem olhar para você, já montando.",
            facts: ["Eles queimaram Ninho do Corvo depois de receber o selo. A ordem era não deixar quem viu."],
            flags: ["entregou_o_selo_no_cerco"],
            reward: { xp: 60 },
            next: "sem_saida",
          },
        },
      ],
    },

    sem_saida: {
      id: "sem_saida",
      place: "Ninho do Corvo",
      text: [
        "Halvar toca o sino sem esperar ordem nenhuma, porque a essa altura não há mais o que entregar.",
        "Os seus homens descem da cerca para a estrada estreita, onde vinte não valem vinte.",
      ],
      choices: [
        {
          id: "lutar",
          label: "Formar na estrada.",
          outcome: {
            text: "Não é mais pelo selo. É pela cerca.",
            callGarrison: true,
            battle: { name: "Caçadores de Elmwood", band: { infantaria: 9, arqueiros: 5, cavaleiros: 3 }, resume: "depois_do_cerco" },
          },
        },
      ],
    },

    depois_do_cerco: {
      id: "depois_do_cerco",
      place: "Ninho do Corvo",
      time: "Amanheceu",
      text: [
        "A estrada estreita fez o trabalho que a cerca não faria sozinha.",
        "Entre os que ficaram há dois que não vestem cor de Casa nenhuma, e um deles carrega uma ordem escrita, dobrada em quatro dentro do gibão.",
        "A ordem não diz o seu nome. Diz «o portador», e manda entregar o que o portador carrega ao Castelo Real, sem escolta e sem registro.",
      ],
      choices: [
        {
          id: "ler",
          label: "Guardar a ordem.",
          outcome: {
            text:
              "Sem escolta e sem registro. Quem escreve assim não quer que a própria chancelaria saiba.\n\nVocê tem terra, tem homens e tem um papel que prova que a Coroa está caçando alguma coisa sem admitir que está.\n\nE tem seis selos em algum lugar do reino.",
            facts: [
              "A Coroa mandou levar o selo ao Castelo Real sem escolta e sem registro.",
              "Quem deu a ordem não quer que a própria chancelaria saiba.",
            ],
            questions: ["Quem na Coroa escreve ordens que a chancelaria não registra?", "Onde estão os outros seis selos?"],
            evidence: ["ordem_sem_registro"],
            flags: ["arco_ii_fechado", "arco_iii_aberto"],
            reward: { xp: 400, influence: 25 },
            end: true,
          },
        },
      ],
    },
  },
};
