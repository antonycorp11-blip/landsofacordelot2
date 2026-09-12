/**
 * Hidrografia de Valdória.
 *
 * O Rio Serpente é o principal elemento de orientação do mapa: nasce nas
 * montanhas de Pedra Cinza, atravessa o Coração e desagua no oceano da
 * Costa Dourada. Os cursos são escritos em coordenadas polares para
 * acompanharem a geografia mesmo se o relevo for reajustado.
 */
import { heartPoint, ringPoint } from "./layout";
import type { River } from "./types";

const r = (a: number, t: number) => ringPoint(a, t);
const h = (a: number, t: number) => heartPoint(a, t);

export const rivers: River[] = [
  {
    id: "rio_serpente",
    name: "Rio Serpente",
    widthStart: 5,
    widthEnd: 30,
    regionIds: ["greystone", "heart_of_valdoria", "golden_coast"],
    points: [
      r(101, 0.82),
      r(99, 0.7),
      r(94, 0.6),
      r(96, 0.48),
      r(90, 0.38),
      r(87, 0.26),
      r(86, 0.12),
      h(84, 0.94),
      h(76, 0.72),
      h(58, 0.5),
      h(28, 0.34),
      h(-14, 0.3),
      h(-48, 0.44),
      h(-72, 0.68),
      h(-89, 0.93),
      r(-90, 0.1),
      r(-93, 0.26),
      r(-90, 0.44),
      r(-94, 0.6),
      r(-96, 0.76),
      r(-97, 0.9),
      r(-97, 1.03),
      r(-98, 1.14),
    ],
  },
  {
    id: "rio_folharcana",
    name: "Rio Folharcana",
    widthStart: 4,
    widthEnd: 14,
    regionIds: ["elmwood", "heart_of_valdoria"],
    tributaryOf: "rio_serpente",
    points: [
      r(159, 0.79),
      r(153, 0.68),
      r(145, 0.62),
      r(141, 0.5),
      r(148, 0.38),
      r(146, 0.24),
      r(146, 0.1),
      h(146, 0.94),
      h(132, 0.79),
      h(112, 0.66),
      h(94, 0.6),
      h(80, 0.63),
      h(76, 0.72),
    ],
  },
  {
    id: "rio_claro",
    name: "Rio Claro",
    widthStart: 3,
    widthEnd: 12,
    regionIds: ["sacred_vale", "heart_of_valdoria"],
    tributaryOf: "rio_serpente",
    points: [
      r(-45, 0.82),
      r(-42, 0.66),
      r(-37, 0.52),
      r(-34, 0.36),
      r(-36, 0.2),
      r(-36, 0.08),
      h(-36, 0.94),
      h(-44, 0.72),
      h(-50, 0.54),
      h(-52, 0.46),
      h(-48, 0.44),
    ],
  },
  {
    id: "ribeira_de_ferro",
    name: "Ribeira de Ferro",
    widthStart: 2,
    widthEnd: 7,
    regionIds: ["greystone"],
    tributaryOf: "rio_serpente",
    points: [r(69, 0.6), r(74, 0.5), r(79, 0.42), r(84, 0.34), r(87, 0.26)],
  },
];

export const riverById = new Map(rivers.map((x) => [x.id, x]));
