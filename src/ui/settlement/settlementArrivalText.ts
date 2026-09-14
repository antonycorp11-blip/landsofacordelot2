import type { Character } from "../../data/characters";
import type { Holding, HoldingKind } from "../../data/holdings";
import { houseById } from "../../data/houses";
import type { HouseId, MapObjectType, PointOfInterest } from "../../world/types";

export type ArrivalKind = "castle" | "city" | "town" | "village" | "sawmill" | "outpost" | "grove" | "lake";

const TYPE_KIND:Partial<Record<MapObjectType,ArrivalKind>>={
  castle:"castle",fortress:"castle",city:"city",town:"town",village:"village",
  sawmill:"sawmill",outpost:"outpost",watchtower:"outpost",fort:"outpost",warcamp:"outpost",
  grove:"grove",temple:"grove",cathedral:"grove",monastery:"grove",shrine:"grove",lake:"lake",
};

const FALLBACK_KIND:Record<HoldingKind,ArrivalKind>={
  castle:"castle",city:"city",town:"town",village:"village",market:"town",mine:"sawmill",
  port:"city",temple:"grove",military:"outpost",estate:"village",site:"lake",
};

const PLACE_LINE:Record<ArrivalKind,string>={
  castle:"A estrada termina diante de pedra alta, ferragens pesadas e guardas que contam cada rosto antes de abrir passagem.",
  city:"Telhados, oficinas e vozes se apertam além dos portões; carroças disputam espaço com gente que já sabe aonde vai.",
  town:"O caminho vira rua entre sobrados baixos, ferrarias e uma praça onde toda chegada é percebida.",
  village:"Aldeões interrompem o trabalho por um instante; há fumaça de lenha, animais nos cercados e barro sob as botas.",
  sawmill:"O golpe ritmado das serras cobre quase toda conversa; madeira recém-cortada e resina dominam o ar.",
  outpost:"A paliçada é pequena, mas os olhos sobre ela não são; cavalos selados e armas ao alcance denunciam prontidão.",
  grove:"A trilha se fecha sob copas antigas; água, folhas e vozes baixas fazem o lugar parecer distante do restante do reino.",
  lake:"A margem abre de repente, fria e luminosa; redes secam em estacas enquanto remos batem devagar contra a água.",
};

const HOUSE_LINE:Record<HouseId,string>={
  house_valdoria:"Azul e ouro marcam os oficiais da Casa Valdória, e até os carregadores abrem caminho para os seus mensageiros.",
  house_silvarden:"O verde de Silvarden aparece em capas e entalhes de folha; aqui a floresta é riqueza, abrigo e aviso.",
  house_dravenor:"As cores de Dravenor dividem espaço com fuligem e ferro; a disciplina do Passo pesa em cada ordem curta.",
  house_karneth:"O vermelho de Karneth tremula sobre couro gasto; ninguém na Marcha parece esquecer de que lado fica a fronteira.",
  house_caelmont:"As cores claras de Caelmont acompanham sinos e pequenos gestos de devoção, mesmo no meio dos negócios.",
  house_elmwood:"Espigas e verde de Elmwood cercam celeiros cheios; toda conversa acaba tocando em colheita, cavalo ou preço.",
  house_aurenna:"O ouro de Aurenna surge em balanças, selos e roupas bem cortadas; riqueza aqui gosta de ser reconhecida.",
  house_morvath:"O violeta de Morvath aparece sem alarde, em lacres e criados atentos a tudo que possa virar vantagem.",
  house_veyr:"As marcas de Veyr são discretas, mas seus agentes conhecem nomes, dívidas e caminhos que outros preferem ocultar.",
  house_rosethorne:"A rosa de Rosethorne enfeita contratos e portas antigas; aparência e valor raramente significam a mesma coisa aqui.",
};

function prosperityLine(value:number):string {
  if(value<30)return "A ruína é visível: telhados cedem, bancas ficam vazias e cada moeda muda de mão com relutância.";
  if(value<50)return "O lugar sobrevive com pouco: há remendos recentes, trabalho demais e mercadoria de menos.";
  if(value<70)return "Há movimento suficiente para sustentar o lugar, embora ninguém confunda estabilidade com abundância.";
  if(value<86)return "O movimento denuncia bons anos: armazéns ocupados, comida nas bancas e trabalhadores difíceis de contratar.";
  return "A riqueza transborda para a rua: pedra limpa, carga abundante e gente pagando para não esperar.";
}

export function arrivalKind(poi:PointOfInterest,holding:Holding):ArrivalKind {
  return TYPE_KIND[poi.type]??FALLBACK_KIND[holding.kind];
}

/** Texto curto e determinístico: lugar, Casa e condição econômica. */
export function arrivalLines(poi:PointOfInterest,holding:Holding,prosperity:number,present:Character[]):string[] {
  const owner=houseById.get(holding.ownerHouseId);
  const names=present.slice(0,2).map((person)=>person.name);
  const attendance=names.length===1
    ? ` ${names[0]} está presente e recebe quem consegue chegar até sua porta.`
    :names.length===2?` ${names[0]} e ${names[1]} estão presentes hoje.`:"";
  return [
    PLACE_LINE[arrivalKind(poi,holding)],
    HOUSE_LINE[holding.ownerHouseId]??`As marcas de ${owner?.name??"quem possui estas terras"} aparecem sobre portas e uniformes.`,
    `${prosperityLine(prosperity)}${attendance}`,
  ];
}
