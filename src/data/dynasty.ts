import type { Character } from "./characters";

/** Pessoas com interesses próprios em casamentos políticos, sem usar líderes como prêmio. */
export const marriageCandidates: Character[] = [
  { id:"alwen_silvarden", name:"Lady Alwen Silvarden", houseId:"house_silvarden", title:"Guardadora das trilhas", primaryClass:"POLITICS", locationPoiId:"castelo_verde", status:"available", relationWithPlayer:5, description:"Quer proteção para as aldeias do bosque, não um título vazio." },
  { id:"rhian_elmwood", name:"Lady Rhian Elmwood", houseId:"house_elmwood", title:"Herdeira das feiras", primaryClass:"TRADE", locationPoiId:"castelo_de_campo_alto", status:"available", relationWithPlayer:8, description:"A família exige uma rota de grão segura e uma bolsa capaz de mantê-la." },
  { id:"gisela_dravenor", name:"Lady Gisela Dravenor", houseId:"house_dravenor", title:"Senhora da forja", primaryClass:"MILITARY", locationPoiId:"fortaleza_pedra_cinza", status:"available", relationWithPlayer:-4, description:"Não se une a quem deixa uma muralha cair sem lutar." },
  { id:"orla_aurenna", name:"Lady Orla Aurenna", houseId:"house_aurenna", title:"Emissária dos portos", primaryClass:"TRADE", locationPoiId:"castelo_de_aurimar", status:"available", relationWithPlayer:12, description:"Prefere um pacto de comércio que beneficie os dois lados." },
];
