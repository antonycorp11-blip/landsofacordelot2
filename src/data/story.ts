/** História: "A Última Nota". Falas com retrato; Clara é a irmã presa na batuta (você). */

export type Speaker = "tito" | "fermata" | "tritono" | "clara" | "narrador";

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
};

const L = (who: Speaker, text: string): Line => ({ who, text });

export const PROLOGUE: Line[] = [
  L("narrador", "A cidade de Harmonia sempre amanheceu cantando. Até a noite em que o Maestro Trítono subiu ao palco do Grande Teatro."),
  L("narrador", "Ele rasgou a Partitura Primordial em cinco páginas. A música sumiu, e no lugar dela nasceram as Dissonâncias."),
  L("fermata", "Acorda, menino. Faz três dias que ninguém nesta cidade consegue cantarolar uma nota sequer."),
  L("tito", "Dona Fermata… a Clara não voltou do concerto. Só achei isso no palco. A batuta dela."),
  L("fermata", "Olha como ela brilha, Tito. A sua irmã não sumiu. A alma dela ficou presa na batuta, junto com a última nota que ela regeu."),
  L("clara", "…Tito? Tá escuro aqui. Mas eu ouço o seu tambor."),
  L("tito", "CLARA! É você?! Eu… eu vou te tirar daí, juro!"),
  L("fermata", "Para libertá-la, vocês precisam juntar as cinco páginas da Partitura. Cada uma está escondida num lugar, numa tonalidade."),
  L("fermata", "Ela corta as Dissonâncias, você marca o ritmo. Volte aqui na minha oficina sempre que precisar. Eu ensino o que sei."),
  L("tito", "Então é um dueto. Bora, mana. Primeiro, o Porão do Teatro."),
];

export interface DungeonStory {
  intro: Line[];
  mid: Line[];
  boss: Line[];
  bossAgain: Line[];
  win: Line[];
  after: Line[];
}

export const STORY: DungeonStory[] = [
  {
    intro: [
      L("tito", "O Porão do Teatro… era aqui que a Clara ensaiava antes dos concertos."),
      L("clara", "Eu lembro desse cheiro de madeira velha. Tito, cuidado: as Dissonâncias estão por toda parte."),
      L("tito", "Pode deixar. Eu bato o tambor, você corta. Se cortar junto com a batida, dói mais neles!"),
      L("clara", "E se eu cortar Dó, Mi e Sol de uma vez só… vira um acorde. Igual a mamãe ensinou."),
    ],
    mid: [
      L("tito", "Clara, olha essas folhas no chão. São pedaços de partitura… tudo rabiscado com trítonos."),
      L("clara", "Ele quer que a cidade inteira desafine junto com ele. Vamos mais fundo."),
    ],
    boss: [
      L("tritono", "Ora, ora. Um menino com um tamborzinho e uma batuta falante. Que dueto patético."),
      L("tito", "Devolve a música da cidade! E devolve a minha irmã!"),
      L("tritono", "A sua irmã regia bonito demais. Bonito o bastante para eu querer guardar para mim. Venham, vamos ver se vocês sabem afinar."),
    ],
    bossAgain: [L("tritono", "De volta? Vocês desafinam com tanta persistência que quase me comovem.")],
    win: [
      L("tritono", "Isso… foi só o primeiro movimento. A sinfonia é longa, crianças."),
      L("narrador", "O Maestro se desfaz numa nuvem de notas tortas. No chão, brilha uma página dourada."),
      L("tito", "A primeira página! Clara, você brilhou mais forte agora!"),
      L("clara", "Eu consigo ouvir melhor, Tito. É como se alguém tivesse aberto uma janela."),
    ],
    after: [
      L("fermata", "Dó maior. Nenhum sustenido, nenhum bemol. O começo de tudo, e vocês o recuperaram."),
      L("fermata", "Subindo uma quinta chegamos a Sol maior. Dizem que a segunda página foi levada para o Conservatório abandonado."),
      L("tito", "Onde a Clara estudou! Ela conhece cada corredor de lá."),
    ],
  },
  {
    intro: [
      L("clara", "O Conservatório… Ainda dá para ouvir os pianos tocando sozinhos, todos meio tom abaixo."),
      L("tito", "Eles estão chorando, Clara. Os alunos sumiram, só ficaram os instrumentos."),
      L("clara", "Aqui as notas têm um sustenido: o Fá virou Fá sustenido. Presta atenção nos nomes."),
    ],
    mid: [
      L("tito", "Esse corredor tem o seu nome gravado na parede! 'Clara, turma de regência'."),
      L("clara", "Eu era a pior da turma no primeiro ano, sabia? A Dona Fermata nunca desistiu de mim."),
    ],
    boss: [
      L("tritono", "Sol maior. Um sustenido só e vocês já tropeçam."),
      L("clara", "Por que você está fazendo isso? Você já foi aluno daqui. Eu vi o seu retrato no salão."),
      L("tritono", "Fui o melhor aluno daqui! E sabe o que recebi? Silêncio. Agora todos vão ouvir só a mim."),
    ],
    bossAgain: [L("tritono", "Este salão já me vaiou uma vez. Vocês não vão conseguir o mesmo.")],
    win: [
      L("narrador", "A segunda página se ilumina. Por um instante, todos os pianos do Conservatório tocam o mesmo acorde."),
      L("clara", "Tito… ele estudou com a Dona Fermata. Ela nunca contou isso pra gente."),
      L("tito", "Então a gente pergunta. Hoje mesmo."),
    ],
    after: [
      L("fermata", "Então vocês descobriram. Sim, o Trítono foi meu aluno. O mais talentoso que eu já tive."),
      L("fermata", "Mas ele queria aplausos mais do que queria música. Quando não vieram, ele azedou por dentro."),
      L("fermata", "A terceira página está na Catedral do Órgão, em Ré maior. Dois sustenidos: Fá e Dó. Cuidado, ali o som ecoa muito."),
    ],
  },
  {
    intro: [
      L("tito", "Uau… olha o tamanho desse órgão. Cada cano é maior que a nossa casa!"),
      L("clara", "Quando ele toca, o chão inteiro vibra. As Dissonâncias daqui são mais fortes, Tito."),
    ],
    mid: [
      L("clara", "Tito… às vezes eu esqueço como é ter mãos. Só lembro do som."),
      L("tito", "Então eu lembro por você. Você coça o nariz quando fica nervosa, e rege com a língua pra fora."),
      L("clara", "Eu NÃO rejo com a língua pra fora!"),
    ],
    boss: [
      L("tritono", "Bem-vindos à minha catedral. Aqui cada nota que vocês tocam volta três vezes mais desafinada."),
      L("tito", "A Dona Fermata contou tudo. Você só queria ser ouvido."),
      L("tritono", "…Não fale do que você não entende, menino. TOQUEM!"),
    ],
    bossAgain: [L("tritono", "O eco ainda guarda os gritos da última vez. Querem mais?")],
    win: [
      L("narrador", "O grande órgão solta um acorde maior tão forte que os vitrais se acendem em sete cores."),
      L("clara", "Tito! Eu… eu senti o vento. Por um segundo eu senti o vento no rosto!"),
      L("tito", "Faltam só duas páginas. Aguenta firme, mana."),
    ],
    after: [
      L("fermata", "Três páginas. A batuta está quente, Tito. Ela está voltando, pouco a pouco."),
      L("fermata", "A quarta página está na velha Ópera, em Lá maior. Foi lá que o Trítono fez seu último concerto antes de sumir."),
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
      L("tritono", "Este era o meu palco. Eu toquei a noite inteira para cadeiras vazias."),
      L("clara", "Eu teria vindo. Eu teria aplaudido de pé."),
      L("tritono", "MENTIRA! Ninguém nunca vem. Ninguém nunca escuta!"),
    ],
    bossAgain: [L("tritono", "A plateia vazia de novo… e só vocês dois na primeira fila.")],
    win: [
      L("narrador", "As cortinas rasgadas tremem. Nas cadeiras vazias, por um instante, parece haver gente aplaudindo."),
      L("tritono", "Vocês… ouviram até o fim. Por quê?"),
      L("tito", "Porque música é feita pra ser ouvida junto. Até a sua."),
    ],
    after: [
      L("fermata", "A última página está no Coliseu dos Ecos, em Mi maior. Quatro sustenidos, a tonalidade mais difícil até agora."),
      L("fermata", "Tito, Clara: lá ele vai usar tudo o que tem. Mas lembrem-se: um trítono só é feio quando não resolve."),
    ],
  },
  {
    intro: [
      L("clara", "O Coliseu dos Ecos. Cada passo que você dá volta mil vezes."),
      L("tito", "Então todo mundo vai ouvir a gente chegando. Ótimo."),
    ],
    mid: [
      L("clara", "Tito, se eu voltar… você me ensina a tocar tambor?"),
      L("tito", "Se você voltar eu te ensino até a fazer café. Mas primeiro, corta esses bichos!"),
    ],
    boss: [
      L("tritono", "A última página. Se vocês a levarem, eu volto a ser só um maestro esquecido."),
      L("clara", "Você nunca foi esquecido. A Dona Fermata guarda o seu retrato até hoje."),
      L("tritono", "…Então provem. Provem que alguém ainda me escuta!"),
    ],
    bossAgain: [L("tritono", "O eco não esquece nada. Nem as derrotas de vocês.")],
    win: [
      L("narrador", "O trítono final se resolve num acorde maior. O som atravessa o Coliseu, a cidade, o céu."),
      L("narrador", "A batuta se acende como um sol pequeno. E, de dentro da luz, uma mão segura a do Tito."),
      L("clara", "…Oi, maninho. Você cresceu, ou fui eu que encolhi?"),
      L("tito", "CLARA!!!"),
      L("tritono", "…Bravo. Bravo, de verdade."),
      L("narrador", "Harmonia volta a amanhecer cantando. Mas as Dissonâncias ainda ecoam pelos lugares antigos, e a dupla continua os ensaios."),
    ],
    after: [
      L("fermata", "As cinco páginas estão juntas. A Partitura Primordial está inteira de novo."),
      L("clara", "E o Trítono pediu para voltar a estudar. Aqui, com a senhora."),
      L("fermata", "Todo aluno merece uma segunda chance. Até os desafinados. Agora vão, os lugares ainda guardam ecos para vocês afinarem."),
    ],
  },
];

/** falas soltas do Tito durante a luta (balão sobre a cabeça, sem pausar) */
export const BARKS = {
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
