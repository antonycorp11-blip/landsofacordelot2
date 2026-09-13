/** Mercadorias físicas. Provisões usam `GameState.food`; as demais, o inventário. */
export type GoodId =
  | "provisions" | "grain" | "wood" | "iron" | "salt"
  | "wool" | "wine" | "herbs" | "tools";

export type TradeGood = {
  id: GoodId;
  name: string;
  singular: string;
  basePrice: number;
  weight: number;
  mark: string;
  description: string;
};

export const tradeGoods: TradeGood[] = [
  { id:"provisions", name:"Provisões", singular:"provisão", basePrice:8, weight:1, mark:"P", description:"Pão seco, queijo e carne salgada. O grupo consome todos os dias." },
  { id:"grain", name:"Grãos", singular:"saca de grão", basePrice:14, weight:2, mark:"G", description:"Trigo, cevada e aveia. Abundantes nas planícies, valiosos onde a terra é dura." },
  { id:"wood", name:"Madeira", singular:"feixe de madeira", basePrice:22, weight:3, mark:"M", description:"Tábuas e vigas de Elmwood. Castelos, minas e portos nunca têm o bastante." },
  { id:"iron", name:"Ferro", singular:"lingote de ferro", basePrice:42, weight:3, mark:"F", description:"Minério limpo e lingotes. Barato junto às montanhas, caro no litoral." },
  { id:"salt", name:"Sal", singular:"saco de sal", basePrice:28, weight:2, mark:"S", description:"Conserva alimento e sustenta viagens longas. Vem da Costa Dourada." },
  { id:"wool", name:"Lã", singular:"fardo de lã", basePrice:20, weight:2, mark:"L", description:"Lã lavada das marchas e fazendas. Oficinas urbanas pagam bem." },
  { id:"wine", name:"Vinho", singular:"ânfora de vinho", basePrice:36, weight:2, mark:"V", description:"Vinho dos vales sagrados, procurado em salões e portos." },
  { id:"herbs", name:"Ervas", singular:"cesto de ervas", basePrice:30, weight:1, mark:"E", description:"Remédios, tinturas e incensos colhidos em bosques e mosteiros." },
  { id:"tools", name:"Ferramentas", singular:"caixa de ferramentas", basePrice:48, weight:3, mark:"T", description:"Pregos, enxadas e lâminas. Cidades produzem; aldeias e minas consomem." },
];

export const goodById = new Map(tradeGoods.map((good) => [good.id, good]));

