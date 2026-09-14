/**
 * ARCO VI — O SELO QUE VIROU RELÍQUIA.
 *
 * O selo de Caelmont não foi vendido nem roubado: foi refundido. Há duzentos
 * anos a peça está sobre um altar, e gente reza de joelhos diante dela.
 *
 * Provar isso é destruir uma fé. E é aqui que o fio do herdeiro ganha a
 * segunda marca — nos livros de batismo e ofício do templo, que ninguém nunca
 * teve motivo para cruzar.
 */
import type { Cinematic } from "../cinematics";

export const relicScene: Cinematic = {
  id: "arco6_reliquia",
  first: "catedral",
  beats: {
    catedral: {
      id: "catedral",
      place: "Catedral de Luminária",
      speaker: { name: "Irmã Venna", role: "Quarenta anos diante do altar", portraitKey: "portrait_venna", expression: "neutral" },
      text: [
        "A Lâmpada do Vale fica atrás de um vidro, sobre o altar, e é feia: ouro grosso, trabalho apressado, sem nenhuma graça.",
        "A velha que cuida dela limpa o vidro com um pano, duas vezes por dia, há quarenta anos.",
        "«Bonita ela não é. Mas é a nossa.»",
      ],
      choices: [
        {
          id: "olhar",
          label: "Olhar de perto o pé da peça.",
          check: { attribute: "stewardship", skills: ["avaliacao"], label: "Administração / Avaliação" },
          outcome: {
            text:
              "Ouro grosso por cima, trabalho de duzentos anos atrás. Mas na base, onde a solda fechou mal, aparece outro ouro por baixo — mais fino, mais claro, e com um pedaço de traço que não pertence a lâmpada nenhuma.\n\nÉ um canto de sete pontas.\n\nA peça não é uma lâmpada com um defeito. É um selo com uma lâmpada em volta.",
            facts: ["A Lâmpada do Vale é o selo de Caelmont, refundido dentro de outra peça há duzentos anos."],
            questions: ["Quem refundiu o selo de Caelmont, e por quê?"],
            flags: ["viu_o_selo_na_lampada"],
            reward: { xp: 240, skillXp: { avaliacao: 6 } },
            next: "venna",
          },
          failure: {
            text:
              "Ouro grosso e mal acabado, e nada além disso — pelo menos não daqui, e não com o vidro no meio.\n\nA irmã Venna repara que você está olhando o pé da peça e não o corpo dela.\n\n«O senhor é o segundo este ano a olhar por baixo.»",
            facts: ["Você não é o primeiro a examinar a base da Lâmpada do Vale este ano."],
            questions: ["Quem mais veio olhar a Lâmpada por baixo?"],
            reward: { xp: 110 },
            next: "venna",
          },
        },
      ],
    },

    venna: {
      id: "venna",
      place: "Catedral de Luminária",
      speaker: { name: "Irmã Venna", role: "Quarenta anos diante do altar", portraitKey: "portrait_venna", expressionSequence: ["neutral", "attentive"] },
      text: [
        "Ela guarda o pano e senta no primeiro banco, e faz sinal para você sentar também.",
        "«Eu sei o que o senhor veio buscar. Sabe há quanto tempo eu limpo aquele vidro?»",
        "«Quarenta anos. Se o senhor me disser que aquilo ali não é o que eu rezei a vida inteira, eu vou ter de decidir uma coisa na minha idade, e eu não quero.»",
      ],
      choices: [
        {
          id: "verdade",
          label: "Contar o que há debaixo do ouro.",
          hint: "A verdade inteira a uma mulher de sessenta e seis anos.",
          check: { attribute: "conviction", skills: ["teologia", "pregacao"], label: "Convicção / Teologia" },
          outcome: {
            text:
              "Ela ouve inteiro. Depois fica muito tempo olhando o altar.\n\n«Então alguém escondeu uma coisa perigosa dentro de uma coisa sagrada, e a gente rezou para a casca.» Ela ri, e a risada dela é boa, o que é pior. «Isso é mais parecido com o Vale do que qualquer sermão que eu já ouvi.»\n\nEla levanta e vai buscar a chave do vidro.\n\n«A Arcebispa vai perguntar quem abriu. Eu vou dizer que fui eu, porque fui.»",
            facts: ["Irmã Venna abriu o vidro do altar por vontade própria."],
            evidence: ["selo_caelmont"],
            flags: ["tem_selo_caelmont", "venna_te_ajudou"],
            reward: { xp: 460, influence: 20 },
            balance: -6,
            balanceReason: "Disse a verdade a quem ia perder com ela",
            next: "arquivo",
          },
          failure: {
            text:
              "No meio da sua explicação ela levanta a mão e você vê que ela está chorando sem fazer barulho.\n\n«Chega. Por favor.»\n\nEla vai embora pelo corredor lateral. Naquela noite você abre o vidro sozinho, com uma faca fina, e a peça sai fácil demais.\n\nDe manhã encontram o vidro aberto. Ninguém encontra a irmã Venna em lugar nenhum durante três dias.",
            facts: ["O vidro do altar foi arrombado, e a irmã Venna sumiu por três dias."],
            evidence: ["selo_caelmont"],
            flags: ["tem_selo_caelmont", "magoou_venna"],
            reward: { xp: 380, influence: -12 },
            balance: 9,
            balanceReason: "Tirou o altar de baixo de uma velha",
            next: "arquivo",
          },
        },
        {
          id: "roubar",
          label: "Não contar. Voltar à noite.",
          hint: "Ela não precisa decidir nada.",
          outcome: {
            text:
              "Você sai da catedral como quem sai de uma visita, e volta às três da manhã com uma faca fina.\n\nA peça sai fácil demais, e essa é a parte que fica.\n\nDe manhã o Vale Sagrado inteiro sabe que a Lâmpada foi roubada. A Arcebispa Yseld fala na missa do meio-dia, sem levantar a voz, e metade do reino ouve pelo púlpito no domingo seguinte.\n\nA irmã Venna limpa o vidro vazio duas vezes por dia, do mesmo jeito.",
            facts: ["A Lâmpada do Vale foi roubada. Caelmont fala contra você no púlpito."],
            evidence: ["selo_caelmont"],
            flags: ["tem_selo_caelmont", "roubou_a_lampada", "caelmont_inimigo"],
            reward: { xp: 400, influence: -20 },
            balance: 11,
            balanceReason: "Roubou de quem rezava",
            next: "arquivo",
          },
        },
      ],
    },

    /* ------------------------ a marca do ofício ------------------------ */
    arquivo: {
      id: "arquivo",
      place: "Arquivo do Vale",
      time: "Antes de sair",
      text: [
        "O templo guarda três séculos de batismo e de ofício, em duas séries de livros que ficam em salas diferentes.",
        "Ninguém nunca teve motivo para cruzar as duas.",
        "Você tem: procura o ofício humilde que um rei escolheria para esconder um filho, e o segue geração por geração.",
      ],
      choices: [
        {
          id: "cruzar",
          label: "Cruzar batismo com ofício.",
          hint: "Três marcas. Você tem uma.",
          check: { attribute: "stewardship", skills: ["avaliacao", "logistica"], label: "Administração / Paciência" },
          outcome: {
            text:
              "Leva quatro dias e acaba numa linha só.\n\nO ofício é escrivão. De pai para filho, sem interrupção, desde um menino batizado sem nome de pai no ano em que Antônios morreu.\n\nA série de ofício segue limpa até cerca de cem anos atrás, e aí o sobrenome muda no meio de uma geração, sem morte e sem casamento que explique.\n\nSão duas marcas. Falta a última troca de nome — e quem registrou as duas foi a chancelaria da Coroa, porque foi a Coroa que assinou.",
            facts: [
              "O ofício da linhagem de Antônios é escrivão, de pai para filho.",
              "O sobrenome mudou pela segunda vez há cerca de cem anos, sem morte nem casamento que explique.",
            ],
            questions: ["Qual é o sobrenome de hoje?"],
            flags: ["tem_a_marca_do_oficio"],
            reward: { xp: 320, influence: 8 },
            end: true,
          },
          failure: {
            text:
              "Quatro dias, e você sai com meia dúzia de ofícios possíveis e nenhuma linha limpa.\n\nA série de batismo é boa. A de ofício tem um buraco de quarenta anos, no meio, que ninguém explica.\n\nVocê sai de Luminária com o selo e sem o nome.",
            questions: ["Qual é o ofício da linhagem de Antônios?"],
            reward: { xp: 140 },
            end: true,
          },
        },
        {
          id: "sair",
          label: "Não é hora disso. Sair.",
          hint: "Três séculos de livro e quatro dias parado.",
          outcome: {
            text: "Você sai de Luminária com o selo e com a sensação de ter deixado alguma coisa para trás numa sala com cheiro de pó.",
            reward: { xp: 60 },
            end: true,
          },
        },
      ],
    },
  },
};
