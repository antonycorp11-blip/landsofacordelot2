/** História: "A Última Nota". Falas com retrato; Clara é a irmã presa na batuta (você). */

export type Speaker = "tito" | "fermata" | "tritono" | "clara" | "narrador" | "diario";

export interface Line {
  who: Speaker;
  text: string;
}

export const SPEAKERS: Record<Speaker, { name: string; color: string }> = {
  tito: { name: "TITO", color: "#ffd27a" },
  fermata: { name: "DONA FERMATA", color: "#c8a0ff" },
  tritono: { name: "MAESTRO TRÍTONO", color: "#ff5a6a" },
  clara: { name: "CLARA", color: "#b0e0ff" },
  narrador: { name: "", color: "#e8e2d4" },
  diario: { name: "DIÁRIO DE TEODORO", color: "#5a3a20" },
};

const L = (who: Speaker, text: string): Line => ({ who, text });

export const PROLOGUE: Line[] = [
  L("narrador", "A cidade de Harmonia sempre amanheceu cantando. Até a noite do Grande Concerto."),
  L("narrador", "No meio da apresentação da jovem regente Clara, o Maestro Trítono invadiu o palco. Rasgou a Partitura Primordial em cinco páginas… e levou a Clara presa numa gaiola feita de pautas."),
  L("narrador", "As notas que se soltaram da Partitura azedaram. Viraram Dissonâncias: notas vivas que odeiam qualquer som afinado."),
  L("fermata", "Tito. Acorda, menino. O teatro está vazio. Levaram a sua irmã."),
  L("tito", "Eu vi tudo, Dona Fermata! Antes de sumir, a Clara jogou a batuta pra mim."),
  L("fermata", "Ela não jogou só a batuta. Olhe como brilha. A Clara colocou a própria alma aí dentro, para não ser levada inteira."),
  L("clara", "Tito… consegue me ouvir? O meu corpo está com ele, mas eu estou aqui. Na batuta. Do seu lado."),
  L("tito", "CLARA! Para onde ele te levou?!"),
  L("clara", "Eu sinto o meu corpo longe… num lugar de madeira velha e cortinas. Ele quer me obrigar a reger a sinfonia desafinada dele."),
  L("fermata", "Escutem bem. O tambor do Tito é o último som afinado desta cidade. É por isso que as Dissonâncias vão atrás dele."),
  L("fermata", "E você, Clara: quando corta uma Dissonância com a batuta, você a rege de volta à afinação. Ela vira uma nota limpa. Juntem essas notas e tragam para mim: com elas eu ensino lições novas."),
  L("fermata", "Cada página da Partitura que vocês recuperarem enfraquece o Trítono. Mas cuidado: sem as páginas, ele se agarra aos instrumentos de cada lugar e muda de forma."),
  L("tito", "Então é assim: eu ando e bato o tambor, você corta e quebra tudo pelo caminho. Aguenta firme, mana. Eu vou te buscar."),
];

export interface DungeonStory {
  intro: Line[];
  mid: Line[];
  boss: Line[];
  bossAgain: Line[];
  win: Line[];
  after: Line[];
  memories: string[];
}

export const STORY: DungeonStory[] = [
  {
    intro: [
      L("tito", "O Porão do Teatro… tem marcas de rodinha no chão. Ele passou por aqui arrastando a gaiola!"),
      L("clara", "Eu sinto o meu corpo perto, Tito. Lá no fundo. Vá andando, eu quebro tudo que estiver no caminho."),
      L("tito", "E se aparecer Dissonância, você corta. Se cortar junto com a batida do meu tambor, dói mais!"),
      L("clara", "E se eu cortar Dó, Mi e Sol de uma vez só… vira um acorde. Igual a mamãe ensinou."),
    ],
    mid: [
      L("tito", "Olha, um pedaço da sua fita de cabelo, Clara! Estamos no caminho certo."),
      L("clara", "Ele está nervoso. Ouço ele ensaiando lá no fundo… e errando todas as notas."),
    ],
    boss: [
      L("narrador", "No palco do porão, ao lado de uma gaiola de pautas onde Clara dorme, um homem alto de máscara branca ergue a batuta."),
      L("tritono", "Um menino com um tamborzinho e uma batuta falante. Que dueto patético."),
      L("tito", "Solta a minha irmã!"),
      L("tritono", "A sua irmã rege bonito demais para uma cidade que não merece. Ela vai reger para MIM. Venham, vamos ver se vocês sabem afinar."),
    ],
    bossAgain: [L("tritono", "De volta? A gaiola continua trancada, crianças.")],
    win: [
      L("narrador", "O Trítono cai de joelhos. A primeira página dourada escapa do casaco dele."),
      L("tritono", "Uma página… Não importa! Eu ainda tenho a regente!"),
      L("narrador", "Num redemoinho de notas tortas, ele some levando a gaiola."),
      L("tito", "NÃO! Ele fugiu com você, Clara!"),
      L("clara", "Calma, Tito. Eu ouvi para onde ele foi: o Conservatório. Ele quer o piano velho de lá."),
    ],
    after: [
      L("fermata", "A primeira página. Dó maior, sem sustenido nem bemol: o começo de tudo."),
      L("fermata", "Se ele foi para o Conservatório, vai se agarrar ao grande piano de cauda. Ele vai mudar de forma, Tito. Esteja pronto."),
      L("tito", "O Conservatório… onde a Clara estudou. Ela conhece cada corredor de lá."),
    ],
    memories: [
      "Eu lembro desse porão. Eu me escondia aqui antes de cada concerto, morrendo de medo.",
      "Você vinha atrás de mim batendo nesse tambor velho, Tito. Dizia que era pra espantar o medo.",
      "Foi aqui que eu regi pela primeira vez. Só você na plateia, de pijama.",
      "Esse cheiro de madeira e poeira… é o cheiro de antes de tudo dar errado.",
    ],
  },
  {
    intro: [
      L("clara", "O Conservatório… Os pianos estão tocando sozinhos, todos meio tom abaixo. Ele passou por aqui."),
      L("tito", "Clara, olha! Rodinhas de novo. E pegadas enormes, como se ele tivesse crescido."),
      L("clara", "Aqui as notas têm um sustenido: o Fá virou Fá sustenido. Presta atenção nos nomes."),
    ],
    mid: [
      L("tito", "Esse corredor tem o seu nome na parede! 'Clara, turma de regência'."),
      L("clara", "E logo ao lado… 'Trítono, turma de piano'. Ele estudou aqui também, Tito."),
    ],
    boss: [
      L("narrador", "No salão de concertos, o Trítono se fundiu ao piano de cauda. Teclas de ébano cobrem o corpo dele como uma armadura."),
      L("tritono", "Sol maior. Um sustenido só e vocês já tropeçam. Ouçam o meu novo instrumento!"),
      L("clara", "Você estudou aqui. Eu vi o seu nome no corredor."),
      L("tritono", "Eu fui o melhor aluno deste salão! E sabe o que recebi? Silêncio. Cuidado com as teclas, menino!"),
    ],
    bossAgain: [L("tritono", "As teclas lembram dos seus passos, menino. Pule se puder!")],
    win: [
      L("narrador", "As teclas se partem. A segunda página dourada voa do peito do Trítono."),
      L("tritono", "Mais uma… Vocês vão pagar por cada nota!"),
      L("narrador", "Ele arrasta a gaiola por uma janela e some na noite, rumo aos sinos da catedral."),
      L("clara", "Tito… ele estudou com a Dona Fermata. Ela nunca contou isso pra gente."),
      L("tito", "Então a gente pergunta. Hoje mesmo."),
    ],
    after: [
      L("fermata", "Vocês descobriram. Sim, o Trítono foi meu aluno. O mais talentoso que eu já tive."),
      L("fermata", "Mas ele queria aplausos mais do que queria música. Quando não vieram, ele azedou por dentro."),
      L("fermata", "Na Catedral ele vai se fundir ao grande órgão. Três páginas para ele perder… Ré maior, dois sustenidos: Fá e Dó."),
    ],
    memories: [
      "Foi nesse corredor que eu reprovei na primeira prova de regência. Chorei na escada.",
      "A Dona Fermata me achou chorando e disse: 'até o silêncio faz parte da música'.",
      "Eu lembro de um rapaz que tocava piano sozinho até de madrugada. Nunca soube o nome dele.",
      "Tito, você me trouxe pão de queijo aqui uma vez, escondido do porteiro. Lembra?",
    ],
  },
  {
    intro: [
      L("tito", "Uau… olha o tamanho desse órgão. Cada cano é maior que a nossa casa!"),
      L("clara", "O meu corpo está perto. Eu sinto o frio da gaiola. Corre, Tito!"),
    ],
    mid: [
      L("clara", "Tito… às vezes eu esqueço como é ter mãos. Só lembro do som."),
      L("tito", "Então eu lembro por você. Você coça o nariz quando fica nervosa, e rege com a língua pra fora."),
      L("clara", "Eu NÃO rejo com a língua pra fora!"),
    ],
    boss: [
      L("narrador", "Os tubos do órgão saem das costas do Trítono como asas de metal. A gaiola balança no alto, presa a um sino."),
      L("tritono", "Bem-vindos à minha catedral. Cada nota que vocês tocam aqui volta três vezes mais desafinada!"),
      L("tito", "A Dona Fermata contou tudo. Você só queria ser ouvido."),
      L("tritono", "…Não fale do que você não entende. TOQUEM!"),
    ],
    bossAgain: [L("tritono", "O eco ainda guarda os gritos da última vez. Querem mais?")],
    win: [
      L("narrador", "O órgão solta um acorde maior tão forte que os vitrais se acendem em sete cores. A terceira página cai aos pés do Tito."),
      L("clara", "Tito! Eu… eu senti o vento. A gaiola está enfraquecendo!"),
      L("narrador", "Ferido, o Trítono foge com a gaiola para a velha Ópera."),
    ],
    after: [
      L("fermata", "Três páginas. A batuta está quente, Tito. A Clara está voltando pouco a pouco."),
      L("fermata", "A Ópera… Foi lá que o Trítono fez o último concerto antes de sumir. Ninguém foi assistir."),
    ],
    memories: [
      "A mamãe cantava aqui no coral. Eu ficava sentada no último banco, contando os tubos do órgão.",
      "Cento e vinte e oito tubos. Eu contei três vezes para ter certeza.",
      "Foi aqui que eu decidi ser regente: quando vi o órgão fazer o chão inteiro tremer.",
      "Os vitrais… cada cor é uma nota. A mamãe dizia que o Dó era vermelho.",
    ],
  },
  {
    intro: [
      L("tito", "A Ópera… tudo dourado e quebrado. Parece que ninguém limpa isso há cem anos."),
      L("clara", "Olha os camarotes vazios. Foi para eles que ele tocou, e ninguém apareceu."),
    ],
    mid: [
      L("tito", "Clara, achei um cartaz rasgado: 'Estreia do jovem maestro. Ingressos esgotados'."),
      L("clara", "Esgotados… Ele mentiu para si mesmo. Que coisa triste."),
    ],
    boss: [
      L("narrador", "Envolto numa capa vermelha, com metade do rosto escondida, o Trítono flutua sob um lustre gigante."),
      L("tritono", "Este era o meu palco. Eu toquei a noite inteira para cadeiras vazias."),
      L("clara", "Eu teria vindo. Eu teria aplaudido de pé."),
      L("tritono", "MENTIRA! Ninguém nunca vem! Cuidado com o lustre, menino…"),
    ],
    bossAgain: [L("tritono", "A plateia vazia de novo… e só vocês dois na primeira fila.")],
    win: [
      L("narrador", "As cortinas rasgadas tremem. Nas cadeiras vazias, por um instante, parece haver gente aplaudindo."),
      L("tritono", "Vocês… ouviram até o fim. Por quê?"),
      L("tito", "Porque música é feita pra ser ouvida junto. Até a sua. Agora devolve a minha irmã!"),
      L("narrador", "Ele hesita. Depois foge, levando a gaiola para o Coliseu dos Ecos."),
    ],
    after: [
      L("fermata", "A última página está no Coliseu dos Ecos, em Mi maior. Quatro sustenidos."),
      L("fermata", "Lá ele vai usar tudo o que tem. Mas lembrem: um trítono só soa feio quando não resolve."),
    ],
    memories: [
      "A primeira ópera que eu vi foi aqui. Eu tinha seis anos e dormi no segundo ato.",
      "Você acordou todo mundo batendo palma no lugar errado, Tito. Que vergonha!",
      "Tem um camarote com o nome do papai riscado na madeira. Ele trabalhava aqui.",
      "Eu queria reger aqui um dia. Com a casa cheia. Com você na primeira fila.",
    ],
  },
  {
    intro: [
      L("clara", "O Coliseu dos Ecos. Cada passo que você dá volta mil vezes."),
      L("tito", "Então todo mundo vai ouvir a gente chegando. Ótimo. Hoje eu te levo pra casa."),
    ],
    mid: [
      L("clara", "Tito, quando eu voltar… você me ensina a tocar tambor?"),
      L("tito", "Se você voltar eu te ensino até a fazer café. Mas primeiro, corta esses bichos!"),
    ],
    boss: [
      L("narrador", "No centro da arena, o Trítono se fundiu a todos os instrumentos que roubou. Ele já não parece um homem."),
      L("tritono", "A última página. Se vocês a levarem, eu volto a ser só um maestro esquecido."),
      L("clara", "Você nunca foi esquecido. A Dona Fermata guarda o seu retrato até hoje."),
      L("tritono", "…Então provem. Provem que alguém ainda me escuta!"),
    ],
    bossAgain: [L("tritono", "O eco não esquece nada. Nem as derrotas de vocês.")],
    win: [
      L("narrador", "O trítono final se resolve num acorde maior. O som atravessa o Coliseu, a cidade, o céu."),
      L("narrador", "A gaiola de pautas se desfaz em notas douradas. A luz da batuta voa até o corpo adormecido da Clara."),
      L("clara", "…Oi, maninho. Você cresceu, ou fui eu que encolhi?"),
      L("tito", "CLARA!!!"),
      L("tritono", "…Bravo. Bravo, de verdade. Desculpem."),
      L("narrador", "Harmonia volta a amanhecer cantando. Mas as Dissonâncias ainda ecoam nos lugares antigos, e os irmãos continuam os ensaios."),
    ],
    after: [
      L("fermata", "As cinco páginas estão juntas. A Partitura Primordial está inteira de novo."),
      L("clara", "E o Trítono pediu para voltar a estudar. Aqui, com a senhora."),
      L("fermata", "Todo aluno merece uma segunda chance. Até os desafinados. Agora vão: os lugares ainda guardam ecos para vocês afinarem."),
    ],
    memories: [
      "Eu nunca vim aqui… mas sinto que já ouvi esse eco em algum sonho.",
      "Tito, se der errado, eu quero que você saiba: o seu tambor sempre me trouxe de volta.",
      "Eu ouço o Trítono chorando lá no fundo. Ele está tão sozinho quanto eu estava.",
      "Falta pouco. Eu já quase sinto as minhas mãos.",
    ],
  },
];

/** falas soltas do Tito durante a luta (balão sobre a cabeça, sem pausar) */
export const BARKS = {
  skill: { rufar: "Rufaaar!", forte: "FORTÍSSIMO!", pancada: "Toma essa pancada!", metro: "Mais devagar… um… dois…" } as Record<string, string>,
  breakIt: ["Quebra isso, Clara!", "Tem coisa brilhando ali dentro!", "Ó, um baú!"],
  chestOk: ["Acorde certo! O baú abriu!", "Uau, quanta coisa!"],
  door: ["A porta abriu! Vamos atrás dela.", "Por aqui, Clara!", "Ela tá mais perto, eu sinto."],
  fled: ["Ele fugiu com ela de novo!"],
  start: ["Bora, mana! Um, dois, três, quatro!", "Ouvi um coral desafinado lá na frente.", "Segura o tempo comigo!", "Hoje a gente afina tudo!", "Clara, tá pronta?"],
  clear: ["Mais uma sala afinada!", "Ouviu esse silêncio bonito?", "Próxima!", "Isso, Clara!", "Tá ficando bom!"],
  chord: ["Que acorde lindo!", "Harmonia!", "Isso soou incrível!", "A mamãe ia adorar esse acorde!"],
  hurt: ["Ai! Clara, me ajuda!", "Tão me mordendo o tornozelo!", "Tá doendo, tá doendo!", "Cuidado comigo aqui!"],
  tired: ["Respira, Clara!", "Calma, recupera o fôlego!"],
  broken: ["Quebrou a armadura!", "Agora ele tá aberto!"],
  marked: ["Pegou o marcado!", "Esse valia muito!"],
  execute: ["Executado!", "No tempo certo!"],
  armor: ["Esse aí é um metrônomo blindado! Corta até quebrar!"],
  markedFirst: ["Viu o losango roxo? Derruba esse que vale mais!"],
  lose: ["Ai… não deu. Desculpa, Clara.", "A gente volta mais forte.", "Eu… preciso treinar mais o tambor."],
};

export const CLARA_HINTS = [
  "Tito, eu consigo cortar vários de uma vez se você não sair do lugar.",
  "As notas marcadas brilham mais. Elas guardam cristais.",
  "Quando o tambor bate, eu sinto mais força.",
  "Se eu desenhar um círculo inteiro… acho que consigo envolver todos eles.",
];

/** conselhos da Dona Fermata na oficina */
export const FERMATA_TIPS = [
  "Uma tríade é só empilhar notas pulando uma: primeira, terceira e quinta. Dó, Mi, Sol.",
  "Não corte por cortar, menina. Espere a batida do tambor do Tito e corte junto. A música mora no tempo.",
  "Armadura de metrônomo é dura. Corte, corte, corte… até ouvir ela quebrar.",
  "Os monstros marcados guardam cristais. Com cristais você aprende as técnicas raras da árvore.",
  "As partituras que o Trítono deixa cair valem mais que ouro. Guarde para as lições mais difíceis.",
  "Quando estiver sem fôlego, pare. Até o maior maestro respira entre os compassos.",
  "Cada lugar novo tem um sustenido a mais. Leia o nome das notas antes de cortar.",
];

/** páginas do diário do maestro (Teodoro Valente, o Trítono), espalhadas pelas antessalas */
export const DIARY: string[][] = [
  [
    "Hoje faço nove anos. A Dona Fermata me achou dormindo na escada do teatro, me deu pão e um canto no porão. Ela diz que eu tenho ouvido de lobo.",
    "Descobri um som que ninguém toca: Fá e Si juntos. Treme como um trovão preso numa caixa. A Dona Fermata franziu a testa: 'O trítono, Teodoro. Ele pede para resolver.'",
    "Os meninos do coral me chamam de Desafinado. Só porque eu gosto dos sons de que eles têm medo.",
    "Toquei meu trítono para o porão vazio. Os ratos não fugiram. Pelo menos alguém me escuta.",
  ],
  [
    "Entrei no Conservatório! Turma de piano. A sala tem mais teclas do que eu tenho amigos.",
    "Compus minha primeira peça: 'Noturno para o que Ninguém Ouve'. O professor rasgou na minha frente. 'Harmonia não é lugar para dissonâncias.'",
    "Uma menininha da regência, de laço lilás, entrou escondida e tocou a minha peça inteira. Errou tudo. E sorriu. Ninguém nunca tinha tocado algo meu.",
    "Fui expulso. O Conselho de Harmonia proibiu o trítono em toda a cidade. Chamaram de 'o diabo na música'. Então é isso que eu sou.",
  ],
  [
    "Moro na torre do órgão agora. O sacristão deixa, desde que eu não toque nada triste. Eu toco baixinho, à noite.",
    "Mamãe morreu esta semana. Toquei no enterro e ninguém ouviu: a cidade inteira estava na festa da pequena regente prodígio. A menina do laço lilás.",
    "Não tenho raiva da menina. Tenho raiva de uma cidade que só sabe aplaudir o que é bonito.",
    "Escrevi uma sinfonia inteira feita de trítonos: a 'Sinfonia do Silêncio'. Se a cidade não quer ouvir, vai ouvir à força.",
  ],
  [
    "Aluguei a Ópera com tudo o que eu tinha. Cartazes pela cidade toda: 'Estreia do jovem maestro'.",
    "Ninguém veio. Ninguém. Toquei até o amanhecer para mil cadeiras vazias. O faxineiro me pediu para sair.",
    "Achei uma máscara velha no camarim. Com ela ninguém vê meu rosto chorando. Com ela, sou só o Trítono.",
    "A Partitura Primordial mantém a cidade afinada. Se eu a rasgar, as notas ficam livres. Livres para desafinar comigo.",
  ],
  [
    "Preciso de uma regente. Só uma pessoa já tocou minha música sem medo: a menina do laço lilás. A Clara.",
    "Ela cresceu. Rege como quem abraça. Se ela reger a Sinfonia do Silêncio, a cidade vai finalmente me ouvir.",
    "Eu não queria a gaiola. Mas ela não viria por vontade própria. Ninguém nunca vem por vontade própria.",
    "Se você está lendo isto, menino do tambor… talvez alguém esteja me ouvindo, afinal.",
  ],
];
