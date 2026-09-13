import { useState } from "react";
import { DialogueScreen, type DialogueOption, type DialogueScene } from "./DialogueScreen";
import { notableFor } from "./notables";
import { charactersAt } from "../../data/characters";
import { portraitUrl } from "../../data/characterAssets";
import { holdingFor, KIND_LABEL } from "../../data/holdings";
import { houseById } from "../../data/houses";
import { heroById } from "../../data/heroes";
import { poiById } from "../../world/valdoria";
import { tutorialFlag } from "../../game/adventure";
import { useGame } from "../../game/store";
import { locationId } from "../../game/presence";

/**
 * A PRIMEIRA CONVERSA.
 *
 * O jogo se ensina falando. Quem recebe o recém-chegado na localidade inicial
 * explica o essencial — o mapa, o relógio, de onde vem trabalho — em falas
 * curtas, com o jogador escolhendo a resposta a cada passo. Nada de lista
 * numerada de tarefas nem de tela de manual: aqui é gente conversando.
 *
 * Pode ser abandonada a qualquer momento: quem já sabe jogar diz que já sabe,
 * e a conversa acaba.
 */
type Step = {
  text: string;
  /** A resposta que leva adiante. */
  next: string;
  /** Linha de apoio da resposta, quando ajuda. */
  hint?: string;
};

export function MentorTalk({ onDone }: { onDone: (poiId: string) => void }) {
  const game = useGame();
  const [step, setStep] = useState(0);

  const placeId = locationId(game);
  const poi = poiById.get(placeId);
  const holding = poi ? holdingFor(poi) : null;
  const house = holding ? houseById.get(holding.controllerHouseId) : undefined;
  const resident = charactersAt(placeId)[0];
  const notable = holding ? notableFor(placeId, holding.kind) : null;
  const hero = heroById.get(game.heroId ?? "");

  const speakerName = resident ? resident.name : notable?.name ?? "Um desconhecido";
  const speakerRole = resident ? resident.title : notable?.role ?? "";
  const portrait = resident ? portraitUrl(resident.portraitAssetKey) : undefined;

  const place = poi?.name ?? "Valdória";
  const kind = holding ? KIND_LABEL[holding.kind].toLowerCase() : "lugar";
  const first = hero?.name.split(" ")[0] ?? "forasteiro";

  const STEPS: Step[] = [
    {
      text: `Você é novo em ${place}. Dá para ver pela poeira das botas. Aqui é ${kind} de ${house?.name ?? "ninguém que se declare"}, e quem chega sem nome costuma precisar de duas coisas: trabalho e uma boa razão para voltar vivo.`,
      next: "Preciso das duas. Por onde começo?",
    },
    {
      text: `Pelo mapa. Arraste com o dedo para olhar em volta e junte dois dedos para aproximar. Cada castelo, vila e mercado que você vir é um lugar a que se pode ir — toque num deles e ele lhe diz o que é, de quem é e o que se faz lá dentro.`,
      next: "E para sair daqui?",
      hint: "Tocar num lugar abre o menu dele — não parte sozinho",
    },
    {
      text: `No menu do lugar, "Viajar até aqui". A estrada faz o resto. Enquanto anda, o relógio corre depressa; parado numa praça ele corre devagar, mas corre — dia vira noite, prazo vence, e ninguém espera por você. No alto da tela dá para pausar e apressar o tempo.`,
      next: "E o trabalho, onde se arranja?",
      hint: "Pausa e 1× 2× 4× ficam na barra do topo",
    },
    {
      text: `Comigo, ou com quem estiver no meu lugar em outra praça. Ninguém prega serviço em mural: você chega, procura quem manda, e pergunta. Eu lhe digo o destino, o prazo e a paga antes de você dizer sim — e depois disso o combinado é combinado.`,
      next: "E o que ganho com isso, além de moeda?",
    },
    {
      text: `Nome. Cada encargo cumprido rende ouro, comida e influência, e ensina alguma coisa a você. Seu retrato lá em cima tem um anel: é o quanto falta para o próximo degrau. Toque nele quando quiser ver do que você é feito, ${first}.`,
      next: "Então vamos ao que interessa.",
      hint: "O retrato no canto abre sua ficha",
    },
  ];

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const finish = () => {
    tutorialFlag("introSeen");
    onDone(placeId);
  };

  const options: DialogueOption[] = [
    { id: "next", label: current.next, hint: current.hint, onPick: () => (last ? finish() : setStep(step + 1)) },
    ...(last ? [] : [{ id: "skip", label: "Já sei me virar. Obrigado.", hint: "Encerrar a conversa", onPick: finish }]),
  ];

  const scene: DialogueScene = {
    speakerName,
    speakerRole,
    portraitUrl: portrait,
    accent: house?.color,
    placeName: place,
    text: current.text,
    options,
  };

  return <DialogueScreen scene={scene} onClose={finish} />;
}
