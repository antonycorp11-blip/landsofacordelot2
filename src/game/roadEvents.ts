import type { Attributes } from '../data/heroes';
import type { SkillId } from '../data/skills';
import type { Reward } from './experience';
import type { GameState } from './store';

export type RoadChoice = {
  id: string; label: string; description: string;
  cost?: number;
  check?: { attribute: keyof Attributes; skill: SkillId };
  reward: Reward; failure?: Reward;
  successText: string; failureText?: string;
};
export type RoadEvent = { id: string; title: string; text: string; choices: RoadChoice[] };
const pass: RoadChoice = { id:'pass', label:'Seguir viagem', description:'Você mantém seu caminho. Sem custo nem recompensa.', reward:{}, successText:'Você seguiu em frente sem se envolver.' };
export const roadEvents: RoadEvent[] = [
  {
    id:'broken_wagon', title:'Uma roda no barro',
    text:'Uma carroça bloqueia parte da estrada. A mercadora tenta erguer o eixo enquanto seus ajudantes discutem. Ela promete pagar a quem conseguir colocar a carga de volta no caminho.',
    choices:[
      { id:'organize', label:'Organizar o resgate da carga', description:'Distribua o peso e coordene os ajudantes.', check:{attribute:'stewardship',skill:'logistica'}, reward:{xp:25,gold:25,skillXp:{logistica:2},careerXp:{TRADE:20}}, failure:{xp:5,skillXp:{logistica:1}}, successText:'O eixo se soltou. A mercadora agradece e paga pelo serviço.', failureText:'O eixo cedeu outra vez. Você aprendeu com a tentativa, mas a carga continuará esperando reforços.' },
      { id:'hire', label:'Pagar dois carregadores', description:'Uma solução garantida para liberar a estrada.', cost:10, reward:{xp:15,influence:2,careerXp:{TRADE:10}}, successText:'Com mais braços, a carroça voltou à estrada. A mercadora espalhará seu nome.' }, pass,
    ],
  },
  {
    id:'road_toll', title:'O preço da passagem',
    text:'Homens com uma fita de milícia exigem um pedágio duvidoso. O líder observa suas roupas e pergunta a serviço de quem você viaja.',
    choices:[
      { id:'question', label:'Questionar a ordem de cobrança', description:'Peça o nome da autoridade e conteste o pedágio.', check:{attribute:'diplomacy',skill:'persuasao'}, reward:{xp:25,influence:2,skillXp:{persuasao:2},careerXp:{POLITICS:20}}, failure:{xp:5}, successText:'O líder prefere liberar sua passagem a ter de explicar a cobrança.', failureText:'Eles se recusam a negociar. Você encontra uma passagem pública próxima e segue sem pagar.' },
      { id:'discipline', label:'Exigir respeito à estrada real', description:'Sua postura de comando pode fazer o grupo recuar.', check:{attribute:'command',skill:'lideranca'}, reward:{xp:25,influence:2,skillXp:{lideranca:2},careerXp:{MILITARY:20}}, failure:{xp:5,influence:-1}, successText:'Os homens recolhem a barreira diante de sua firmeza.', failureText:'Sua ameaça não convenceu. Você recua para a passagem pública, sob risadas.' },
      { id:'pay', label:'Pagar e encerrar a discussão', description:'A passagem é garantida, mas você não endossa a cobrança.', cost:8,reward:{xp:5},successText:'O grupo aceita as moedas e deixa você seguir.' },
    ],
  },
  {
    id:'pilgrims', title:'Luzes à beira da estrada',
    text:'Peregrinos se reúnem em torno de uma pequena fogueira. Uma viajante perdeu a coragem de continuar e o grupo está dividido entre seguir e voltar.',
    choices:[
      { id:'inspire',label:'Lembrar o propósito da jornada',description:'Encontre palavras que devolvam esperança ao grupo.',check:{attribute:'conviction',skill:'inspiracao'},reward:{xp:25,influence:3,skillXp:{inspiracao:2},careerXp:{RELIGION:20}},failure:{xp:5,skillXp:{inspiracao:1}},successText:'O grupo retoma a caminhada unido. Seu nome será lembrado nas próximas orações.',failureText:'Eles agradecem a intenção, mas decidem descansar antes de continuar.' },
      { id:'shelter',label:'Custear uma noite de abrigo',description:'Ajude os peregrinos a descansar em segurança.',cost:12,reward:{xp:20,influence:3,skillXp:{caridade:2},careerXp:{RELIGION:15}},successText:'A hospitalidade foi recebida com gratidão. Amanhã eles tentarão novamente.' },pass,
    ],
  },
  {
    id:'scouts',title:'Pegadas fora da trilha',
    text:'Uma sentinela encontra marcas de cavalos junto à estrada. A patrulha precisa saber se são de viajantes ou de um grupo que observa o tráfego.',
    choices:[
      { id:'read',label:'Examinar as pegadas com a patrulha',description:'Interprete posições e sinais sem iniciar um combate.',check:{attribute:'command',skill:'tatica'},reward:{xp:30,gold:18,skillXp:{tatica:2},careerXp:{MILITARY:25}},failure:{xp:5,skillXp:{tatica:1}},successText:'Você identifica um posto de observação abandonado. A patrulha paga pela informação.',failureText:'O terreno está pisoteado demais. A patrulha continua investigando.' },
      { id:'report',label:'Compartilhar o que viu na estrada',description:'Um relato cuidadoso já ajuda as sentinelas.',reward:{xp:10,influence:1,careerXp:{MILITARY:5}},successText:'A sentinela anota seu relato e agradece pela colaboração.' },pass,
    ],
  },
  {
    id:'dispute',title:'Duas versões da mesma dívida',
    text:'Dois negociantes discutem sobre uma entrega incompleta. Nenhum aceita a conta do outro, e ambos pedem a opinião de alguém de fora.',
    choices:[
      { id:'mediate',label:'Propor um acordo justo',description:'Ouça os dois lados e encontre uma saída aceitável.',check:{attribute:'diplomacy',skill:'mediacao'},reward:{xp:25,gold:20,influence:2,skillXp:{mediacao:2},careerXp:{POLITICS:15}},failure:{xp:5},successText:'Ambos aceitam dividir a diferença e lhe oferecem uma gratificação.',failureText:'Nenhum dos dois cede. Você encerra sua participação sem assumir a dívida.' },
      { id:'count',label:'Recontar e avaliar a mercadoria',description:'Use os números para esclarecer o desacordo.',check:{attribute:'stewardship',skill:'avaliacao'},reward:{xp:25,gold:24,skillXp:{avaliacao:2},careerXp:{TRADE:20}},failure:{xp:5,skillXp:{avaliacao:1}},successText:'Uma caixa foi contada duas vezes. A divergência foi resolvida.',failureText:'Os registros estão incompletos. Você recomenda uma conferência no mercado.' },pass,
    ],
  },
  {
    id:'shrine',title:'O pequeno memorial',
    text:'Um memorial de estrada foi derrubado pela chuva. Uma moradora tenta recolocar as pedras e proteger os nomes gravados na madeira.',
    choices:[
      { id:'restore',label:'Ajudar a reerguer o memorial',description:'Um gesto simples, sem teste nem pagamento.',reward:{xp:15,influence:2,skillXp:{caridade:1},careerXp:{RELIGION:10}},successText:'As pedras voltaram ao lugar. A moradora agradece por você ter parado.' },
      { id:'speech',label:'Reunir os viajantes para ajudar',description:'Transforme uma tarefa solitária num esforço coletivo.',check:{attribute:'conviction',skill:'pregacao'},reward:{xp:25,influence:3,skillXp:{pregacao:2},careerXp:{RELIGION:20}},failure:{xp:5},successText:'Outros viajantes se juntam a vocês. O memorial está protegido novamente.',failureText:'Poucos param para ouvir. Você ajuda como pode antes de continuar.' },pass,
    ],
  },
];
export const roadEventById = new Map(roadEvents.map(e=>[e.id,e]));
export function choiceChance(choice: RoadChoice, s: GameState): number {
  if (!choice.check) return 1;
  return Math.min(.95, .40 + s.attributes[choice.check.attribute] * .055 + s.skills[choice.check.skill] * .003);
}
