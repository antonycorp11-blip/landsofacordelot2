import { useState } from "react";
import { DialogueScreen, type DialogueOption, type DialogueScene } from "./DialogueScreen";
import { lordGreeting, notableFor } from "./notables";
import { charactersAt, characterById } from "../../data/characters";
import { portraitUrl } from "../../data/characterAssets";
import { holdingFor } from "../../data/holdings";
import { houseById } from "../../data/houses";
import { poiById } from "../../world/valdoria";
import { formatDuration } from "../../world/time";
import { contractsAt } from "../../game/contracts";
import { acceptContract, completeContract, rewardSummary } from "../../game/adventure";
import { CAREER_LABEL } from "../../game/careers";
import { isPresent } from "../../game/presence";
import { useGame } from "../../game/store";
import type { AgentClass, PointOfInterest } from "../../world/types";

/** Como se pede serviço em cada ofício. Quatro pedidos iguais não é conversa. */
const ASK: Record<AgentClass, string> = {
  MILITARY: "Há serviço para quem carrega aço?",
  TRADE: "Tem carga precisando de quem a leve?",
  POLITICS: "Alguma palavra que precise viajar longe?",
  RELIGION: "Posso ser útil aos que peregrinam?",
};

/**
 * A CONVERSA DE UMA LOCALIDADE.
 *
 * É daqui que sai trabalho. Você chega a um lugar, procura quem manda ali, e
 * ouve o que ele tem a oferecer — com prazo, destino e paga ditos na fala,
 * antes de aceitar. Nada de quadro de contratos aberto do meio do nada.
 *
 * Quem fala é o governante do sítio, se ele estiver; senão, quem recebe
 * forasteiros naquele tipo de estrutura.
 */
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
  const [node, setNode] = useState<string>("greet");

  const holding = holdingFor(poi);
  // Quem recebe: a pessoa de nome que está aqui — o lorde do sítio, um líder
  // de Casa em casa — e, na falta dela, quem atende forasteiros neste tipo de
  // estrutura. Nunca um quadro de avisos.
  const lord = charactersAt(poi.id)[0]
    ?? (holding.localLordId ? characterById.get(holding.localLordId) : undefined);
  const notable = notableFor(poi.id, holding.kind);
  const house = houseById.get(holding.controllerHouseId);

  const speakerName = lord ? lord.name : notable.name;
  const speakerRole = lord ? lord.title : notable.role;
  const portrait = lord ? portraitUrl(lord.portraitAssetKey) : undefined;

  const here = isPresent(poi.id, game);
  const contract = game.adventure.contract;
  const offers = contractsAt(poi.id, game);

  const leave: DialogueOption = { id: "leave", label: "Fique bem.", onPick: onClose };

  function greetScene(): DialogueScene {
    const options: DialogueOption[] = [];

    if (contract && contract.destinationId === poi.id && here) {
      options.push({
        id: "deliver",
        label: "Trago o que me pediram.",
        hint: rewardSummary(contract.reward),
        onPick: () => { completeContract(); onClose(); },
      });
    } else if (contract) {
      options.push({
        id: "busy",
        label: "Já carrego um encargo.",
        hint: `${contract.title} · destino ${poiById.get(contract.destinationId)?.name}`,
        onPick: () => setNode("busy"),
      });
    } else if (offers.length) {
      for (const c of offers) {
        options.push({
          id: c.id,
          label: ASK[c.career],
          hint: `${c.title} · até ${poiById.get(c.destinationId)?.name} · ${formatDuration(c.travelHours)}`,
          disabled: !here,
          onPick: () => setNode(`offer:${c.id}`),
        });
      }
    } else {
      options.push({ id: "nowork", label: "Há trabalho por aqui?", onPick: () => setNode("nowork") });
    }

    options.push({
      id: "recruit",
      label: "Preciso de homens que saibam marchar.",
      disabled: !here,
      hint: here ? undefined : "É preciso estar no local.",
      onPick: onRecruit,
    });
    options.push({ id: "about", label: "Fale-me deste lugar.", onPick: () => setNode("about") });
    options.push(leave);

    return {
      speakerName, speakerRole, portraitUrl: portrait, accent: house?.color, placeName: poi.name,
      text: here
        ? (lord ? lordGreeting(lord.primaryClass, lord.relationWithPlayer) : notable.greeting)
        : "Daqui não se conversa. Venha até nós e então falaremos.",
      options: here ? options : [
        { id: "travel", label: "Estou a caminho.", onPick: () => { onTravel(poi.id); onClose(); } },
        leave,
      ],
    };
  }

  function scene(): DialogueScene {
    const base = { speakerName, speakerRole, portraitUrl: portrait, accent: house?.color, placeName: poi.name };

    if (node.startsWith("offer:")) {
      const c = offers.find((o) => o.id === node.slice(6));
      if (!c) return greetScene();
      const destination = poiById.get(c.destinationId)?.name ?? "outro lugar";
      return {
        ...base,
        text: `${CAREER_LABEL[c.career]}. ${c.description} Leve isso a ${destination} — ${formatDuration(c.travelHours)} de estrada, e o prazo é de ${formatDuration(c.deadline - c.acceptedAt)}. A paga: ${rewardSummary(c.reward)}.`,
        options: [
          {
            id: "accept",
            label: "Aceito o encargo.",
            disabled: !here,
            onPick: () => { acceptContract(c.id, poi.id); setNode("accepted"); },
          },
          { id: "back", label: "Deixe-me pensar.", onPick: () => setNode("greet") },
          leave,
        ],
      };
    }

    if (node === "accepted") {
      const c = game.adventure.contract;
      return {
        ...base,
        text: c
          ? `Então está feito. ${poiById.get(c.destinationId)?.name} espera por você, e o prazo corre a partir de agora.`
          : "Está feito.",
        options: [
          ...(c ? [{ id: "go", label: "Parto agora mesmo.", hint: `Viajar até ${poiById.get(c.destinationId)?.name}`, onPick: () => { onTravel(c.destinationId); onClose(); } }] : []),
          { id: "stay", label: "Antes tenho o que resolver aqui.", onPick: () => setNode("greet") },
        ],
      };
    }

    if (node === "busy") {
      return {
        ...base,
        text: "Termine o que começou. Ninguém confia encargo a quem deixa o primeiro pelo caminho.",
        options: [{ id: "back", label: "Tem razão.", onPick: () => setNode("greet") }, leave],
      };
    }

    if (node === "nowork") {
      return {
        ...base,
        text: "Por ora, nada. O que havia já tem quem leve. Procure em outra praça — e volte em alguns dias, sempre aparece coisa nova.",
        options: [{ id: "back", label: "Voltarei.", onPick: () => setNode("greet") }, leave],
      };
    }

    if (node === "about") {
      return {
        ...base,
        text: `${poi.name} responde a ${house?.name ?? "ninguém que se declare"}.${lord ? ` Quem governa é ${lord.name}.` : ""} Somos ${holding.population.toLocaleString("pt-BR")} almas, e a prosperidade anda em ${Math.round(holding.prosperity)}.`,
        options: [{ id: "back", label: "Entendo.", onPick: () => setNode("greet") }, leave],
      };
    }

    return greetScene();
  }

  return <DialogueScreen scene={scene()} onClose={onClose} />;
}
