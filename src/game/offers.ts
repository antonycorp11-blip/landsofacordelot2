/**
 * O QUE VEM ATRÁS DE VOCÊ.
 *
 * Depois de entregar um encargo o jogador ficava parado olhando o mapa,
 * decidindo o que fazer. Esse silêncio é onde a pessoa fecha o jogo.
 *
 * Um CHAMADO é uma oferta com prazo que aparece sozinha: um lorde manda
 * buscá-lo, uma aldeia está cercada e some em dois dias se ninguém for, uma
 * caravana precisa de escolta agora. Tem lugar, tem relógio e some quando o
 * relógio acaba — e é isso que troca "o que eu faço agora" por "não dá tempo
 * de fazer tudo".
 */
import { allPois, poiById } from "../world/valdoria";
import { holdingFor } from "../data/holdings";
import { houseById } from "../data/houses";
import { bystanderName, hashText } from "../data/notables";
import type { TroopCount } from "../data/troops";
import type { Reward } from "./experience";
import type { RoadStop } from "../world/roadStops";

export type OfferKind = "convocacao" | "cerco" | "caravana";

export type Offer = {
  id: string;
  kind: OfferKind;
  title: string;
  /** O que o mensageiro diz. */
  text: string;
  poiId: string;
  /** Hora do mundo em que deixa de valer. */
  expiresAt: number;
  reward: Reward;
  /** Só no cerco: quem está cercando. */
  band?: TroopCount;
  accepted: boolean;
};

/** Lugares habitados a uma distância que dá para alcançar no prazo. */
function nearbyPlaces(from: RoadStop): { id: string; name: string; distance: number }[] {
  return allPois
    .filter((p) => p.routeNode && holdingFor(p).kind !== "site")
    .map((p) => ({ id: p.id, name: p.name, distance: Math.hypot(p.x - from.x, p.y - from.y) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(1, 7);
}

export function makeOffer(from: RoadStop, hours: number): Offer | null {
    const places = nearbyPlaces(from);
  if (!places.length) return null;
  const h = hashText(`${Math.floor(hours)}:${from.x.toFixed(0)}`);
  const place = places[h % places.length];
  const poi = poiById.get(place.id);
  if (!poi) return null;
  const holding = holdingFor(poi);
  const house = houseById.get(holding.controllerHouseId);
  const who = bystanderName(`offer:${h}`);
  const kind: OfferKind = (["convocacao", "cerco", "caravana"] as const)[(h >>> 7) % 3];

  if (kind === "cerco") {
    return {
      id: `offer-${h}`,
      kind,
      title: `${poi.name} está cercada`,
      text:
        `Um rapaz chega correndo pela estrada, sem fôlego e sem sandália. Um bando fechou os caminhos de ${poi.name} e ` +
        `já levou o gado de fora. «Eles vão embora em dois dias, com tudo. Não sobra ninguém para contar, mas também não sobra nada.» ` +
        `Quem chegar a tempo enfrenta o bando; quem não chegar não vai saber o que perdeu.`,
      poiId: poi.id,
      expiresAt: hours + 52,
      band: { camponeses: 4, milicianos: 4, infantaria: 2 },
      reward: { gold: 140, influence: 9, xp: 120, careerXp: { MILITARY: 80 }, houseRelation: { houseId: holding.controllerHouseId, amount: 10 } },
      accepted: false,
    };
  }

  if (kind === "convocacao") {
    return {
      id: `offer-${h}`,
      kind,
      title: `Mandam chamá-lo em ${poi.name}`,
      text:
        `Um cavaleiro de libré o alcança na estrada e não desmonta. «${who} me manda dizer que ${house?.name ?? "a Casa"} quer falar com você ` +
        `em ${poi.name}, e quer falar esta semana.» Ele não diz sobre o quê, o que geralmente significa que é sobre alguma coisa.`,
      poiId: poi.id,
      expiresAt: hours + 70,
      reward: { gold: 60, influence: 12, xp: 90, houseRelation: { houseId: holding.controllerHouseId, amount: 8 } },
      accepted: false,
    };
  }

  return {
    id: `offer-${h}`,
    kind,
    title: `Escolta até ${poi.name}`,
    text:
      `Uma caravana parada na beira da estrada, com o carroceiro contando moedas em voz alta para quem quiser ouvir. ` +
      `«Perdi dois homens de escolta em Pedra Cinza e não saio daqui sozinho. Ande comigo até ${poi.name} e o dinheiro é seu ao chegar.»`,
    poiId: poi.id,
    expiresAt: hours + 60,
    reward: { gold: 130, food: 8, influence: 4, xp: 80, careerXp: { TRADE: 70 } },
    accepted: false,
  };
}

export function hoursLeft(offer: Offer, hours: number): number {
  return Math.max(0, offer.expiresAt - hours);
}

export const OFFER_LABEL: Record<OfferKind, string> = {
  convocacao: "Convocação",
  cerco: "Cerco",
  caravana: "Escolta",
};
