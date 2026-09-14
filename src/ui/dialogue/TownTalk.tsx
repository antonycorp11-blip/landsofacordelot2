import { useState } from "react";
import { DialogueScreen, type DialogueOption, type DialogueScene } from "./DialogueScreen";
import { faceKindOf, greetingOf, notablesAt, type Notable } from "../../data/notables";
import { charactersAt } from "../../data/characters";
import { storyPeopleAt } from "../../data/storyPeople";
import { openScene } from "../../game/sceneRunner";
import { portraitUrl } from "../../data/characterAssets";
import { holdingFor } from "../../data/holdings";
import { houseById } from "../../data/houses";
import { poiById } from "../../world/valdoria";
import { formatDuration } from "../../world/time";
import { issueOf, issuesAt, type Issue } from "../../game/issues";
import { acceptContract, completeContract, openClosing, rewardSummary } from "../../game/adventure";
import { isPresent } from "../../game/presence";
import { useGame } from "../../game/store";
import type { PointOfInterest } from "../../world/types";
import { goodById } from "../../data/goods";

/**
 * A CONVERSA DE UMA LOCALIDADE.
 *
 * É daqui que sai trabalho, e trabalho aqui é um PEDIDO DE ALGUÉM. Você chega,
 * escolhe com quem falar, ouve o que a pessoa tem — duas ou três falas, um
 * motivo, gente com nome que você nunca vai ver — e só então o serviço é
 * oferecido, com destino, prazo e paga ditos em voz alta.
 *
 * Quem está de fato presente (um lorde em casa, um líder de Casa) fala antes
 * dos figurantes; e quando o lugar tem duas pessoas que recebem, escolher com
 * qual falar é escolher que tipo de serviço você quer.
 */
type Node =
  | { at: "who" }
  | { at: "talk"; person: string }
  | { at: "story"; person: string; issue: string; beat: number }
  | { at: "offer"; person: string; issue: string }
  | { at: "taken"; issue: string }
  | { at: "about"; person: string }
  | { at: "none"; person: string };

export function TownTalk({
  poi,
  onClose,
  onRecruit,
  onTravel,
}: {
  poi: PointOfInterest;
  onClose: () => void;
  onRecruit: () => void;
  onTravel: (poiId: string) => void;
}) {
  const game = useGame();
  const holding = holdingFor(poi);
  const people = notablesAt(poi.id, holding.kind);
  // Gente da história que está aqui e que o jogador ainda não procurou. Elas
  // não entram no fluxo de encargos: abrem cena, que é outra coisa.
  const leads = storyPeopleAt(poi.id, game.storyFlags, game.knowledge.evidence);
  const [node, setNode] = useState<Node>(() =>
    ({ at: leads.length || people.length > 1 ? "who" : "talk", person: people[0]?.id ?? "" } as Node));

  const house = houseById.get(holding.controllerHouseId);
  const here = isPresent(poi.id, game);
  const contract = game.adventure.contract;
  const offers = here ? issuesAt(poi.id, game) : [];
  // Um nome de verdade morando aqui fala por si; o resto do lugar tem os seus.
  const resident = charactersAt(poi.id)[0];

  const leave: DialogueOption = { id: "leave", label: "Fique bem.", onPick: onClose };
  const person = (id: string): Notable | undefined => people.find((p) => p.id === id);

  function base(speaker: { name: string; role: string; portrait?: string; portraitSet?: string; notable?: Notable }): Omit<DialogueScene, "text" | "options"> {
    const n = speaker.notable;
    return {
      speakerName: speaker.name,
      speakerRole: speaker.role,
      portraitUrl: speaker.portrait,
      portraitSetKey: speaker.portraitSet,
      // Sem arte, o rosto é gerado a partir do id da pessoa — e é sempre o mesmo.
      face: n ? { seed: n.id, female: n.female, age: n.age, accent: house?.color, kind: faceKindOf(n.career) } : undefined,
      accent: house?.color,
      placeName: poi.name,
    };
  }

  /* ----------------------------- as cenas ------------------------------ */

  function scene(): DialogueScene {
    if (!here) {
      return {
        ...base({ name: poi.name, role: "de longe" }),
        text: "Daqui não se conversa com ninguém. Chegue até lá e então se fala.",
        options: [
          { id: "travel", label: "Estou a caminho.", onPick: () => { onTravel(poi.id); onClose(); } },
          leave,
        ],
      };
    }

    // Quem procurar, quando há mais de uma pessoa que recebe.
    if (node.at === "who") {
      return {
        ...base({ name: poi.name, role: `${people.length + leads.length} pessoas atendem aqui` }),
        text: `Você entra em ${poi.name}. Há quem responda por este lugar — e cada um responde por uma parte dele.`,
        options: [
          // Primeiro quem tem a ver com o que você carrega. A cena substitui
          // a conversa: fecha esta tela e abre a outra.
          ...leads.map((p) => ({
            id: p.id,
            label: `Procurar ${p.name}`,
            hint: p.role,
            onPick: () => { onClose(); openScene(p.sceneId); },
          })),
          ...people.map((p) => ({
            id: p.id,
            label: `Procurar ${p.name}`,
            hint: p.role,
            onPick: () => setNode({ at: "talk", person: p.id }),
          })),
          ...(resident ? [{
            id: "resident",
            label: `Pedir audiência a ${resident.name}`,
            hint: "Ainda não disponível",
            disabled: true,
            onPick: () => {},
          }] : []),
          leave,
        ],
      };
    }

    const who = person("person" in node ? node.person : "") ?? people[0];
    const speaker = {
      name: who.name, role: who.role,
      portrait: resident && people.length === 1 ? portraitUrl(resident.portraitAssetKey) : undefined,
      portraitSet: resident && people.length === 1 ? resident.portraitAssetKey : undefined,
      notable: who,
    };

    if (node.at === "story") {
      const issue = offers.find((i) => i.contract.id === node.issue) ?? offers[0];
      if (!issue) return { ...base(speaker), text: greetingOf(who), options: [leave] };
      const last = node.beat >= issue.beats.length - 1;
      return {
        ...base(speaker),
        text: issue.beats[node.beat],
        options: [
          {
            id: "on",
            label: last ? "O que precisa que eu faça?" : "Continue.",
            onPick: () => setNode(last
              ? { at: "offer", person: who.id, issue: issue.contract.id }
              : { at: "story", person: who.id, issue: issue.contract.id, beat: node.beat + 1 }),
          },
          { id: "back", label: "Não é assunto meu.", onPick: () => setNode({ at: "talk", person: who.id }) },
        ],
      };
    }

    if (node.at === "offer") {
      const issue = offers.find((i) => i.contract.id === node.issue);
      if (!issue) return { ...base(speaker), text: greetingOf(who), options: [leave] };
      const c = issue.contract;
      const cargoLine = c.cargo
        ? `\n\nA mercadoria não será entregue a você: compre ${c.cargo.amount} ${goodById.get(c.cargo.goodId)?.name.toLowerCase()} no mercado daqui e leve por sua conta.`
        : "";
      return {
        ...base(speaker),
        text: `${issue.ask}${cargoLine}\n\nPrazo de ${formatDuration(c.deadline - c.acceptedAt)}. A paga: ${rewardSummary(c.reward)}.`,
        options: [
          {
            id: "accept",
            label: "Pode contar comigo.",
            hint: `${poiById.get(c.destinationId)?.name} · ${formatDuration(c.travelHours)}`,
            disabled: !!contract,
            onPick: () => { acceptContract(c.id, poi.id); setNode({ at: "taken", issue: c.id }); },
          },
          { id: "no", label: "Não é para mim.", onPick: () => setNode({ at: "talk", person: who.id }) },
        ],
      };
    }

    if (node.at === "taken") {
      const c = game.adventure.contract;
      return {
        ...base(speaker),
        text: c
          ? `Então está combinado. ${c.cargo ? `Compre primeiro ${c.cargo.amount} ${goodById.get(c.cargo.goodId)?.name.toLowerCase()} no mercado. Depois, ` : ""}${poiById.get(c.destinationId)?.name}, e o prazo começa a correr agora.`
          : "Então está combinado.",
        options: [
          ...(c ? [{
            id: "go",
            label: c.cargo ? "Primeiro vou ao mercado." : "Parto agora mesmo.",
            hint: c.cargo ? `Comprar a encomenda em ${poi.name}` : `Viajar até ${poiById.get(c.destinationId)?.name}`,
            onPick: c.cargo ? onClose : () => { onTravel(c.destinationId); onClose(); },
          }] : []),
          { id: "stay", label: "Antes tenho o que resolver aqui.", onPick: () => setNode({ at: "talk", person: who.id }) },
        ],
      };
    }

    if (node.at === "about") {
      return {
        ...base(speaker),
        text: `${poi.name} responde a ${house?.name ?? "ninguém que se declare"}. Somos ${holding.population.toLocaleString("pt-BR")} almas e a prosperidade anda em ${Math.round(holding.prosperity)}. Já foi melhor. Já foi bem pior.`,
        options: [{ id: "back", label: "Entendo.", onPick: () => setNode({ at: "talk", person: who.id }) }, leave],
      };
    }

    if (node.at === "none") {
      return {
        ...base(speaker),
        text: "Por ora não tenho nada para você. O que havia já tem quem leve. Volte em alguns dias — sempre aparece coisa.",
        options: [{ id: "back", label: "Voltarei.", onPick: () => setNode({ at: "talk", person: who.id }) }, leave],
      };
    }

    /* --------------------------- a conversa --------------------------- */

    const options: DialogueOption[] = [];

    // Entrega: se o encargo em curso termina aqui, é a primeira coisa a dizer.
    if (contract && contract.destinationId === poi.id) {
      const origin = issueOf(contract);
      options.push({
        id: "deliver",
        label: "Trago o que me pediram.",
        hint: rewardSummary(contract.reward),
        // A entrega abre o TERCEIRO ATO: como você se comporta ao entregar
        // muda o que leva e o que pensam de você.
        onPick: () => { if (!openClosing()) completeContract(); onClose(); },
      });
      void origin;
    } else if (contract) {
      options.push({
        id: "busy",
        label: "Já carrego um encargo.",
        hint: `${contract.title} · destino ${poiById.get(contract.destinationId)?.name}`,
        onPick: () => setNode({ at: "none", person: who.id }),
      });
    } else {
      const mine = offers.filter((i) => i.notable.id === who.id);
      if (mine.length) {
        for (const issue of mine) {
          options.push({
            id: issue.contract.id,
            label: "Procuro trabalho.",
            hint: issue.title,
            onPick: () => setNode({ at: "story", person: who.id, issue: issue.contract.id, beat: 0 }),
          });
        }
      } else {
        options.push({ id: "nowork", label: "Há trabalho por aqui?", onPick: () => setNode({ at: "none", person: who.id }) });
      }
    }

    options.push({ id: "recruit", label: "Preciso de homens que saibam marchar.", onPick: onRecruit });
    options.push({ id: "about", label: "Fale-me deste lugar.", onPick: () => setNode({ at: "about", person: who.id }) });
    if (people.length > 1) options.push({ id: "who", label: "Preciso falar com outra pessoa.", onPick: () => setNode({ at: "who" }) });
    options.push(leave);

    return { ...base(speaker), text: greetingOf(who), options };
  }

  return <DialogueScreen scene={scene()} onClose={onClose} />;
}

export type { Issue };
