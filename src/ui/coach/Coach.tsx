import { useGame } from "../../game/store";
import { locationId, isPresent } from "../../game/presence";
import { poiById, allPois } from "../../world/valdoria";
import { holdingFor } from "../../data/holdings";
import { tutorialFlag } from "../../game/adventure";
import { troopTotal } from "../../data/troops";
import { chapterOfStep, currentStep } from "../../game/story";
import type { RoadStop } from "../../world/roadStops";
import { amountOwned } from "../../game/economy";
import { goodById } from "../../data/goods";
import "./coach.css";

/**
 * O JOGO SE ENSINA FAZENDO.
 *
 * Nada de manual: uma linha por vez, dizendo a PRÓXIMA ação, e ela some
 * sozinha quando a ação acontece. O jogador começa perdido numa estrada de
 * floresta e a primeira coisa que aprende é andar — porque é a primeira coisa
 * que ele precisa fazer.
 *
 * A ordem das lições segue a ordem em que as coisas passam a importar: andar,
 * chegar, conversar, cumprir, RECEBER, gastar, crescer, e só então olhar o
 * tabuleiro político. Dinheiro e influência não são notas de rodapé — são dois
 * passos com nome próprio, porque são o motor de tudo que vem depois.
 *
 * Cada passo é lido do estado do jogo, não de um contador próprio: quem
 * descobrir sozinho e pular etapas vê o guia pular junto.
 */
type Step = { id: string; title: string; body: string };

export function Coach({ stop, traveling }: { stop: RoadStop; traveling: boolean }) {
  const game = useGame();
  const tutorial = game.adventure.tutorial;
  if (tutorial.hidden) return null;

  // PRESENÇA, não último nó pisado: passar por uma vila a caminho de outra
  // não é ter chegado, e o guia dizia que sim.
  const here = locationId(game);
  const atPlace = here && isPresent(here, game) ? poiById.get(here) : undefined;
  const contract = game.adventure.contract;
  const troops = troopTotal(game.troops);

  const step = nextStep();
  if (!step) return null;

  function nextStep(): Step | null {
    /* ------------------------------ andar ----------------------------- */
    if (!tutorial.departed) {
      return {
        id: "move",
        title: "Você não sabe onde está",
        body: traveling
          ? "Boa. A estrada leva a algum lugar — sempre leva."
          : "Toque em qualquer ponto da estrada para caminhar até lá.",
      };
    }

    /* ------------------------------ chegar ---------------------------- */
    if (!atPlace && !contract) {
      const target = nearestPlace(stop);
      return {
        id: "reach",
        title: target ? `Há fumaça adiante: ${target.name}` : "Siga a estrada",
        body: target
          ? `Toque em ${target.name}. Um toque num lugar é partir para ele, e o menu abre na chegada.`
          : "Siga a estrada até encontrar gente.",
      };
    }

    /* ----------------------------- conversar -------------------------- */
    if (!contract && !tutorial.accepted) {
      return {
        id: "talk",
        title: `Você chegou a ${atPlace?.name ?? "um lugar"}`,
        body: "Toque em Falar. Ninguém prega serviço em mural: quem manda aqui conta o que precisa, e só então oferece.",
      };
    }

    /* ------------------------------ cumprir --------------------------- */
    if (contract) {
      const target = poiById.get(contract.destinationId);
      if (contract.cargo && amountOwned(game,contract.cargo.goodId)<contract.cargo.amount) {
        const good=goodById.get(contract.cargo.goodId);
        const missing=contract.cargo.amount-amountOwned(game,contract.cargo.goodId);
        const atOrigin=isPresent(contract.sourceId,game);
        return {
          id:"buy-cargo",
          title:`Faltam ${missing} ${good?.name.toLowerCase()}`,
          body:atOrigin
            ? "Abra o menu desta localidade e entre no mercado. A compra sai do seu bolso e precisa caber na carga."
            : `Volte a ${poiById.get(contract.sourceId)?.name ?? "origem"} ou encontre outro mercado com a mercadoria antes de entregar.`,
        };
      }
      if (isPresent(contract.destinationId, game)) {
        return {
          id: "deliver",
          title: "Você chegou ao destino",
          body: "Fale com quem atende e diga que trouxe o que pediram. O pagamento é na conversa — é assim que entra ouro.",
        };
      }
      return {
        id: "carry",
        title: `Leve o encargo a ${target?.name ?? "seu destino"}`,
        body: "Toque no destino no mapa. O prazo corre mesmo com você parado, então não demore.",
      };
    }

    /* ----------------------- fome e soldo ----------------------------- */
    if (game.hardshipDays > 0) {
      return {
        id: "hardship",
        title: game.food <= 0 ? "Seu grupo está sem comida" : "Seus homens não foram pagos",
        body: "Cada dia assim faz gente desertar. Cumpra um encargo por ouro e comida, ou dispense homens que você não sustenta.",
      };
    }

    /* ------------------------------ o ouro ---------------------------- */
    if (tutorial.completed && troops === 0) {
      return {
        id: "gold",
        title: `Você tem ${game.gold} moedas`,
        body: "Ouro vem de encargo cumprido e serve para comprar gente — mas homem custa soldo TODO DIA. Menu de uma cidade: Recrutar tropas.",
      };
    }

    /* ----------------------------- a ficha ---------------------------- */
    if (!tutorial.sheetViewed) {
      return {
        id: "sheet",
        title: "Você aprendeu alguma coisa",
        body: "Toque no seu retrato. O anel em volta é o próximo nível, e cada nível dá um ponto para distribuir.",
      };
    }

    /* ---------------------- forças no mapa -------------------------- */
    if (troops > 0 && !tutorial.agentInspected) {
      return {
        id:"inspect-force",
        title:"A estrada tem outros grupos",
        body:"Toque numa figura que anda pelo mapa. Bandos armados têm um anel vermelho; o número acima mostra quantos homens viajam juntos.",
      };
    }
    if (troops > 0 && !tutorial.pursuitStarted) {
      return {
        id:"pursue-force",
        title:"Eles não vão esperar por você",
        body:"Na leitura do grupo, toque em Perseguir. Sua rota acompanhará o alvo até que os dois grupos estejam perto o bastante.",
      };
    }
    if (game.pursuedForceId) {
      return {
        id:"intercept-force",
        title:"Perseguição em andamento",
        body:"O anel amarelo marca o alvo. A rota se corrige enquanto ele anda; ao alcançar, você decide abordar, atacar ou deixá-lo seguir.",
      };
    }
    if (troops > 0 && !tutorial.forceAttacked) {
      return {
        id:"attack-force",
        title:"O grupo foi interceptado",
        body:"Ataque quando estiver ao alcance. Antes da ordem, a tela mostra risco, recompensa e a perda de influência caso você agrida viajantes ou homens da lei.",
      };
    }
    if (troops > 0 && tutorial.forceAttacked && !tutorial.forceDefeated) {
      return {
        id:"defeat-force",
        title:"A estrada lembra o resultado",
        body:"Vença um bando de anel vermelho. Ele sai do mapa por alguns dias, a segurança sobe e emboscadas e preços da região melhoram.",
      };
    }

    /* -------------------- influência e o tabuleiro -------------------- */
    if (!tutorial.politicsSeen) {
      return {
        id: "influence",
        title: `Influência: ${game.influence.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`,
        body: "Ouro compra homens; influência faz uma Casa ouvir você — e sem ela não se compra terra. Toque no estandarte para ver quem manda em quê.",
      };
    }

    /* --------------------- a campanha principal ----------------------- */
    // Por último e sem condição: quando o básico está aprendido, o que o jogo
    // tem a dizer é a linha da partida — e ela nunca some até acabar.
    const step = currentStep(game.adventure.story);
    if (step) {
      const chapter = chapterOfStep.get(step.id);
      return {
        id: `story-${step.id}`,
        title: `${chapter ? `Capítulo ${chapter.number}` : "Campanha"} · ${step.objective}`,
        body: step.detail,
      };
    }

    return null;
  }

  return (
    <div className="coach" role="status">
      <div className="coach-text">
        <b>{step.title}</b>
        <span>{step.body}</span>
      </div>
      <button className="coach-close" onClick={() => tutorialFlag("hidden")} aria-label="Não mostrar mais dicas">
        ×
      </button>
    </div>
  );
}

/** O lugar habitado mais próximo de onde o viajante está. */
function nearestPlace(stop: RoadStop) {
  let best: { poi: (typeof allPois)[number]; d: number } | null = null;
  for (const poi of allPois) {
    if (!poi.routeNode || holdingFor(poi).kind === "site") continue;
    const d = Math.hypot(poi.x - stop.x, poi.y - stop.y);
    if (!best || d < best.d) best = { poi, d };
  }
  return best?.poi;
}
