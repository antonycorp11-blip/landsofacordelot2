/**
 * ARCO VII — A COROA, E O PONTO DE DECISÃO.
 *
 * Ela tem dois. Ele tem cinco. Não há investigação que resolva isto: é guerra
 * aberta, e ele só a vence se as outras Casas decidirem que uma Coroa com dois
 * selos é pior que um plebeu com cinco.
 *
 * A chancelaria do Castelo Real é o fim do fio do herdeiro — o único lugar do
 * reino que registrou as duas trocas de nome, porque foi a Coroa que assinou
 * as duas.
 *
 * E no fim a Balança é lida em voz alta.
 */
import type { Cinematic } from "../cinematics";

/* ------------------------------ o conselho ------------------------------ */
export const councilScene: Cinematic = {
  id: "arco7_conselho",
  noEscape: true,
  first: "mesa",
  beats: {
    mesa: {
      id: "mesa",
      place: "Conselho Real",
      speaker: {
        name: "Princesa Elira Valdória", role: "Casa Valdória",
        portraitKey: "portrait_elira_valdoria", expressionSequence: ["attentive", "hard"],
      },
      text: [
        "As Casas vêm porque um plebeu com cinco selos é um assunto, e assunto se resolve em mesa antes de se resolver em campo.",
        "Quem abre a sessão não é o Protetor. É a filha dele, com um livro na mão que ninguém pediu.",
        "«Antes de qualquer voto: eu li o texto original da lei do rei Antônios. Eu sou a única pessoa nesta sala que leu, e vou dizer o que está escrito.»",
      ],
      choices: [
        {
          id: "deixar",
          label: "Deixar ela falar.",
          outcome: {
            text:
              "«Está escrito que as Casas entregam os selos POR CONSENSO. Não diz que quem junta reina. Diz que quem RECEBE reina.»\n\nO salão começa a falar ao mesmo tempo.\n\n«Meu pai tem dois porque comprou um e herdou outro. Este homem tem cinco porque foi buscar. Nenhum dos dois recebeu nada de ninguém.» Ela fecha o livro. «Pela lei, os dois são usurpadores. A diferença é que um de vocês está pedindo o voto e o outro está contando com ele.»",
            facts: ["A lei de Antônios exige que os selos sejam ENTREGUES por consenso, não juntados."],
            questions: ["As Casas vão entregar por consenso, ou vai ser guerra?"],
            flags: ["elira_falou"],
            reward: { xp: 300, influence: 15 },
            next: "voto",
          },
        },
        {
          id: "cortar",
          label: "Cortar e falar primeiro.",
          hint: "O que está na mesa é o que você fez, não o que está no livro.",
          check: { attribute: "conviction", skills: ["persuasao", "lideranca"], label: "Convicção / Liderança" },
          outcome: {
            text:
              "Você fala antes dela e fala de outra coisa: das aldeias, dos impostos, dos que pagaram por cada um dos cinco.\n\nQuando termina, é Elira quem responde, e ela responde a favor.\n\n«A lei diz que os selos devem ser ENTREGUES por consenso. Nenhum dos dois recebeu nada.» Ela olha para o pai. «Mas só um dos dois veio a esta sala dizer o nome de quem pagou.»",
            facts: ["A lei de Antônios exige que os selos sejam ENTREGUES por consenso, não juntados."],
            flags: ["elira_falou", "falou_do_povo"],
            reward: { xp: 340, influence: 22 },
            balance: -5,
            balanceReason: "Falou em nome de quem pagou",
            next: "voto",
          },
          failure: {
            text:
              "Você corta a princesa no Conselho Real, diante de nove Casas.\n\nO silêncio que vem depois é o pior que você já ouviu, e ela senta sem terminar o que ia dizer.\n\nO que ficaria a seu favor não é dito. O voto vai ser mais caro agora.",
            flags: ["ofendeu_elira"],
            reward: { xp: 90 },
            next: "voto",
          },
        },
      ],
    },

    voto: {
      id: "voto",
      place: "Conselho Real",
      speaker: {
        name: "Príncipe Caelan Valdória", role: "Herdeiro do Protetor",
        portraitKey: "portrait_caelan_valdoria", expression: "neutral",
      },
      text: [
        "O filho do Protetor fala por último, e fala bem, e é a melhor pessoa da sala até a terceira frase.",
        "«Ninguém aqui quer guerra. Eu proponho o simples: os cinco vêm para o Castelo Real, o portador recebe terra e título, e o reino segue.»",
        "«E antes que perguntem: sim, o meu pai junta os sete. Alguém vai juntar. Prefiram quem já governa.»",
      ],
      choices: [
        {
          id: "recusar",
          label: "«Não.»",
          hint: "E deixar a sala inteira ouvir.",
          outcome: {
            text:
              "«Então é guerra», diz Caelan, e diz com pena de verdade, que é o que assusta.\n\nAs Casas votam com os pés: metade sai pela porta do sul, que é o caminho das Marchas, e metade fica.\n\nNa escada do Conselho, Cassian Caelmont passa por você e diz sem parar de andar: «O Vale não entra. Mas o Vale também não avisa ninguém.»",
            facts: ["As Casas se dividiram. É guerra."],
            flags: ["guerra_com_a_coroa"],
            reward: { xp: 380, influence: 20 },
            next: "chancelaria",
          },
        },
        {
          id: "aceitar",
          label: "«Aceito. Com uma condição.»",
          hint: "Que o Protetor mostre os dois dele, agora, diante das Casas.",
          check: { attribute: "diplomacy", skills: ["intriga", "etiqueta"], label: "Diplomacia / Intriga" },
          outcome: {
            text:
              "Aldren Valdória não se move. Caelan olha para o pai e o pai não se move.\n\nO Conselho inteiro entende ao mesmo tempo.\n\n«Um deles foi comprado de um herdeiro endividado», diz Elira, no silêncio, sem levantar a voz. «E o recibo está na chancelaria, porque o meu avô era organizado.»\n\nA sessão acaba sem voto. Mas nenhuma Casa vai marchar pela Coroa agora, e todo mundo naquela sala sabe disso.",
            facts: ["A Coroa não mostrou os dois selos ao Conselho. Nenhuma Casa marchará por ela."],
            flags: ["guerra_com_a_coroa", "coroa_desmoralizada"],
            reward: { xp: 460, influence: 32 },
            next: "chancelaria",
          },
          failure: {
            text:
              "«Condição», repete Caelan, e sorri com os olhos junto. «O senhor traz cinco peças de ouro a uma sala de nove Casas e chama isso de posição de negociar.»\n\nA sala ri. É uma risada curta e educada, e é pior que vaia.\n\nA sessão acaba sem voto, e a guerra vem de qualquer jeito — só que sem a metade que teria ficado.",
            facts: ["O Conselho terminou sem voto. É guerra, e com menos Casas do seu lado."],
            flags: ["guerra_com_a_coroa", "conselho_riu_de_voce"],
            reward: { xp: 240, influence: 6 },
            next: "chancelaria",
          },
        },
      ],
    },

    /* ---------------------- o fim do fio do herdeiro ---------------------- */
    chancelaria: {
      id: "chancelaria",
      place: "Chancelaria do Castelo Real",
      time: "Enquanto o reino se move",
      text: [
        "A chancelaria é uma sala comprida com trezentos anos de registro e dois escrivães velhos que não perguntam nada a quem tem escolta.",
        "É o único lugar do reino que registrou as duas trocas de nome, porque foi a Coroa que assinou as duas.",
        "Se você trouxe as outras marcas, a última cabe numa linha.",
      ],
      choices: [
        {
          id: "procurar",
          label: "Procurar a segunda troca de nome.",
          hint: "Ofício de escrivão, linhagem sem interrupção, há cerca de cem anos.",
          needsFlag: {
            flag: "tem_a_marca_do_oficio",
            blocked: "Trezentos anos de registro, e você não sabe que ofício procurar. O arquivo do Vale sabia.",
          },
          check: { attribute: "stewardship", skills: ["avaliacao", "logistica"], label: "Administração / Paciência" },
          outcome: {
            text:
              "O registro está lá, assinado por um chanceler morto há noventa anos, e é banal: uma família de escrivães de aldeia trocou de sobrenome depois de uma dívida, como mil outras.\n\nO sobrenome novo é Vern.\n\nVocê fica muito tempo olhando a linha antes de aceitar o que ela diz.\n\nMestre Aled Vern, escrivão de Folhaterra. O homem que leu a sua marca de chancelaria na primeira semana. O que assinou a sua carta e fechou o nome com um laço, sem pensar, do jeito que faria um ponto final.",
            facts: [
              "A segunda troca de nome da linhagem: a família passou a se chamar Vern.",
              "O herdeiro de Antônios é Mestre Aled Vern, escrivão de Folhaterra.",
            ],
            questions: ["O que fazer com um homem que tem mais direito que você e não quer nada?"],
            evidence: ["linhagem_vern"],
            flags: ["sabe_quem_e_o_herdeiro"],
            reward: { xp: 500, influence: 10 },
            end: true,
          },
          failure: {
            text:
              "Três dias de registro e nada. Ou a linha não está aqui, ou está e você passou por cima dela.\n\nVocê sai da chancelaria com o reino em guerra e uma pergunta que não fechou.",
            questions: ["Quem é o herdeiro de Antônios?"],
            reward: { xp: 120,
            },
            end: true,
          },
        },
        {
          id: "ignorar",
          label: "Há uma guerra. Isso pode esperar.",
          outcome: {
            text: "Você passa pela porta da chancelaria e segue. Trezentos anos de registro continuam ali, e continuam calados.",
            reward: { xp: 60 },
            end: true,
          },
        },
      ],
    },
  },
};


/* -------------------------------- a guerra ------------------------------ */
/**
 * O QUE FALTAVA.
 *
 * O Conselho terminava em «é guerra» e a cena seguinte já dizia «o Castelo
 * Real é seu, sete peças numa mesa» — o jogador nunca tomava os dois selos da
 * Coroa, e o final inteiro ficava sem ser ganho. Isto é a guerra.
 */
export const warScene: Cinematic = {
  id: "arco7_guerra",
  noEscape: true,
  first: "campo",
  beats: {
    campo: {
      id: "campo",
      place: "Diante do Castelo Real",
      time: "Quarto dia de cerco",
      text: [
        "O Castelo Real nunca foi tomado. Também nunca foi cercado por gente que não queria saque: quem vem aqui vem por um trono, e trono não se rompe com fome.",
        "As Casas que vieram estão à sua direita e à sua esquerda, e vieram por coisas que você fez, uma por uma.",
        "No quarto dia o portão do lado norte abre por dentro, e ninguém do lado de fora mandou abrir.",
      ],
      choices: [
        {
          id: "entrar",
          label: "Entrar pelo portão que abriram.",
          hint: "Alguém lá dentro decidiu por você.",
          outcome: {
            text:
              "A guarda do portão norte está de joelhos no chão do próprio posto, com as armas encostadas na parede, e é a princesa que está de pé no meio deles.\n\n«Eu li a lei. Nenhum dos dois tem direito.» Elira não sai do caminho. «Mas um de vocês vai queimar a cidade para entrar, e o outro já mandou queimar o celeiro para que ela passasse fome.»\n\nAí ela sai.\n\n«Meu pai está no salão. Meu irmão não vai estar.»",
            facts: ["Elira Valdória abriu o portão norte do Castelo Real."],
            flags: ["elira_abriu_o_portao"],
            reward: { xp: 300, influence: 20 },
            next: "salao",
          },
        },
        {
          id: "romper",
          label: "Não confiar. Romper pela muralha oeste.",
          hint: "Portão que abre sozinho costuma ser boca de armadilha.",
          outcome: {
            text:
              "Você manda a coluna para o oeste, onde a pedra é velha, e paga o preço de uma muralha em homens.\n\nO portão norte estava aberto de verdade. A princesa esperou ali a manhã inteira, e depois mandou fechar.",
            flags: ["recusou_o_portao"],
            battle: { name: "Guarda Real de Valdória", band: { infantaria: 14, arqueiros: 8, cavaleiros: 6 }, resume: "salao" },
          },
        },
      ],
    },

    salao: {
      id: "salao",
      place: "Salão do Castelo Real",
      speaker: {
        name: "Protetor Aldren Valdória", role: "Protetor do Reino",
        portraitKey: "portrait_aldren_valdoria", expressionSequence: ["exhausted", "shaken"],
      },
      text: [
        "Ele está sentado, sozinho, num salão feito para duzentas pessoas. Não há guarda. Não há filho.",
        "Sobre a mesa, diante dele, há duas peças de ouro e um pano dobrado ao lado, como quem já tinha embrulhado para entregar.",
        "«Três gerações.» A voz dele está seca. «Meu avô começou, meu pai continuou, e eu nunca tive coragem de parar nem de terminar.»",
      ],
      choices: [
        {
          id: "perguntar",
          label: "«Por que não terminou?»",
          outcome: {
            text:
              "«Porque eu sabia o que faltava e sabia o que custava.» Ele empurra as duas peças pela mesa sem levantar. «Aurenna foi comprada de um herdeiro endividado por um sexto do que valia. A nossa foi herdada de um ramo que nunca teve direito a nada. Trezentos anos chamando isso de provisório.»\n\nEle olha para você pela primeira vez.\n\n«Meu filho teria terminado. E teria achado que estava salvando o reino, que é a parte que me tira o sono.»",
            facts: [
              "Os dois selos da Coroa: um comprado de um herdeiro endividado, outro herdado por um ramo sem direito.",
              "Aldren Valdória entregou os dois em vez de terminar o plano de três gerações.",
            ],
            evidence: ["selo_valdoria", "selo_aurenna"],
            flags: ["tem_os_sete", "aldren_entregou"],
            reward: { xp: 700, influence: 40 },
            balance: -4,
            balanceReason: "Recebeu em vez de tomar",
            next: "caelan",
          },
        },
        {
          id: "pegar",
          label: "Pegar as duas e não dizer nada.",
          hint: "Ele não vai reagir. E é isso que faz ser pior.",
          outcome: {
            text:
              "Você recolhe as duas peças da mesa e ele não move um músculo.\n\nNa porta, ele fala com as suas costas, sem levantar a voz:\n\n«Eu também não disse nada quando as recebi. Foi assim que começou.»",
            facts: ["Os dois selos da Coroa são seus."],
            evidence: ["selo_valdoria", "selo_aurenna"],
            flags: ["tem_os_sete", "tomou_de_aldren"],
            reward: { xp: 650, influence: 30 },
            balance: 6,
            balanceReason: "Tomou de um homem que não reagiu",
            next: "caelan",
          },
        },
      ],
    },

    caelan: {
      id: "caelan",
      place: "Pátio interno",
      speaker: {
        name: "Príncipe Caelan Valdória", role: "Herdeiro do Protetor",
        portraitKey: "portrait_caelan_valdoria", expressionSequence: ["neutral", "hard"],
      },
      text: [
        "Ele está no pátio com trinta homens que ainda respondem a ele, e não parece derrotado. Parece contrariado, que é outra coisa.",
        "«O senhor entende que isto não acaba com o meu pai entregando ouro numa mesa.»",
        "«Eu ia unir sete reinos. O senhor vai fazer o quê com eles?»",
      ],
      choices: [
        {
          id: "responder",
          label: "Responder.",
          hint: "Ele fez uma pergunta de verdade.",
          check: { attribute: "conviction", skills: ["persuasao", "lideranca"], label: "Convicção / Liderança" },
          outcome: {
            text:
              "O que você diz não convence os trinta homens. Convence Caelan, que é pior para ele.\n\nEle olha o próprio punho fechado por um tempo longo.\n\n«Então o senhor pensou nisso.» Ele manda os trinta baixarem as armas com um gesto curto. «Eu passei a vida achando que era o único que tinha pensado.»\n\nSai pelo portão sul a pé, sem escolta, e ninguém o vê de novo enquanto esta história durar.",
            facts: ["Caelan Valdória deixou o Castelo Real a pé, sem escolta."],
            flags: ["caelan_se_foi"],
            reward: { xp: 400, influence: 20 },
            balance: -3,
            balanceReason: "Respondeu em vez de mandar",
            next: "fim_da_guerra",
          },
          failure: {
            text:
              "Você diz o que diria a uma sala de Casas, e ele não é uma sala de Casas.\n\n«Eu esperava melhor.» Ele desembainha sem pressa nenhuma. «É uma pena. O senhor teria sido um rei suportável.»",
            flags: ["caelan_lutou"],
            battle: { name: "Príncipe Caelan e os trinta", band: { infantaria: 12, cavaleiros: 8, arqueiros: 6 }, resume: "fim_da_guerra" },
          },
        },
        {
          id: "acabar",
          label: "Não há o que responder.",
          hint: "Trinta homens contra tudo o que você trouxe.",
          outcome: {
            text: "Ele faz que sim com a cabeça, como quem confirma uma suspeita antiga, e desembainha.",
            flags: ["caelan_lutou"],
            battle: { name: "Príncipe Caelan e os trinta", band: { infantaria: 12, cavaleiros: 8, arqueiros: 6 }, resume: "fim_da_guerra" },
          },
        },
      ],
    },

    fim_da_guerra: {
      id: "fim_da_guerra",
      place: "Castelo Real",
      time: "Acabou",
      text: [
        "O Castelo Real é seu, e é um prédio grande e frio onde todo mundo agora espera que você diga alguma coisa.",
        "Sete peças. A lei de um rei morto há trezentos anos diz o que fazer com elas.",
        "Falta você decidir se acredita nessa lei.",
      ],
      choices: [
        {
          id: "subir",
          label: "Subir ao salão.",
          outcome: {
            text: "",
            flags: ["guerra_vencida"],
            reward: { xp: 500, influence: 30 },
            end: true,
          },
        },
      ],
    },
  },
};


/* --------------------------- o ponto de decisão -------------------------- */
/**
 * O FIM.
 *
 * O reino inteiro na mão, os sete numa mesa, e a Balança lida em voz alta —
 * porque quem cerca o jogador diz o que espera dele, e o que espera é o que
 * ele vem fazendo há vinte horas.
 */
export const endingScene: Cinematic = {
  id: "arco7_decisao",
  noEscape: true,
  first: "mesa_final",
  beats: {
    mesa_final: {
      id: "mesa_final",
      place: "Castelo Real",
      time: "Depois de tudo",
      art: "royal_seal",
      text: [
        "Sete peças numa mesa. O Castelo Real é seu, as Casas esperam do lado de fora, e ninguém neste reino tem exército para tomar isto de você.",
        "A lei de um rei morto há trezentos anos diz que quem tiver os sete deve reinar. Ela não diz que precisa ser nobre.",
        "Não há mais ninguém para perguntar. Só o que você fez até aqui, que toda gente nesta sala viu.",
      ],
      choices: [
        {
          id: "ouvir",
          label: "Ouvir o que eles esperam de você.",
          outcome: { text: "", next: "leitura" },
        },
      ],
    },

    leitura: {
      id: "leitura",
      place: "Castelo Real",
      text: [
        "Eles dizem, um de cada vez, e ninguém está sendo educado.",
        "O que cada um espera de você é exatamente o que você vem fazendo desde o bosque — os impostos que cobrou, os cativos que soltou ou vendeu, os juramentos que fez e rompeu, a terra que tomou de quem não podia recusar.",
        "A barra que está no alto da sua vista desde o primeiro dia não era enfeite. Era isto, sendo somado.",
      ],
      choices: [
        {
          id: "reinar",
          label: "Reinar.",
          hint: "Um rei que veio do povo. Nenhuma Casa, nenhum sangue, nenhum título herdado.",
          outcome: {
            text:
              "A coroa que eles põem na sua cabeça foi feita às pressas, porque a antiga foi desfeita há trezentos anos e ninguém guardou o molde.\n\nVocê é o primeiro rei de Valdória desde Antônios, e o único da história que nasceu sem nada.\n\nO reino tem um rei outra vez. E a sua primeira ordem, seja ela qual for, vai ser obedecida por um milhão de pessoas que não foram consultadas sobre nada disso.",
            facts: ["Você reina sobre Valdória."],
            flags: ["final_reinou"],
            reward: { xp: 2000, influence: 100 },
            balance: 25,
            balanceReason: "Sentou na cadeira",
            next: "epilogo",
          },
        },
        {
          id: "queimar",
          label: "Destruir os sete.",
          hint: "Sem selos não há lei. Sem lei não há rei. Nunca mais.",
          outcome: {
            text:
              "A forja do Castelo Real leva três horas para chegar ao ponto, e o reino inteiro fica do lado de fora ouvindo o fole.\n\nSete peças entram. Sai um bolo de ouro sem forma nenhuma, do tamanho de um punho, que não vale nada além do peso.\n\nNão há mais lei que diga quem deve reinar. Nenhuma Casa pode dizer outra vez que manda por direito — e isso vale para você também, e é esse o ponto.",
            facts: ["Os sete selos foram destruídos. Não há mais lei que diga quem deve reinar."],
            flags: ["final_queimou"],
            reward: { xp: 2000, influence: 100 },
            balance: -25,
            balanceReason: "Quebrou a cadeira, não só quem sentava",
            next: "epilogo",
          },
        },
      ],
    },

    epilogo: {
      id: "epilogo",
      place: "Valdória",
      time: "Depois",
      text: [
        "Em Folhaterra, um escrivão de quarenta e poucos anos termina um recibo e fecha o nome com um laço pequeno, sem pensar, do jeito que o pai lhe ensinou.",
        "Ele nunca vai saber. Ou soube, e preferiu o recibo.",
        "E ao norte, do outro lado das Marchas, há reinos que agora precisam decidir o que fazer com Valdória.",
      ],
      choices: [
        {
          id: "fim",
          label: "Fim da primeira parte.",
          outcome: {
            text:
              "A Coroa dos Sete Juramentos acaba aqui.\n\nO que vem depois é outro mapa.",
            flags: ["campanha_encerrada"],
            reward: { xp: 500 },
            end: true,
          },
        },
      ],
    },
  },
};
