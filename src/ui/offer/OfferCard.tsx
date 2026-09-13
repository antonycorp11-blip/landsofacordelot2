import { useState } from "react";
import { useGame } from "../../game/store";
import { answerOffer } from "../../game/adventure";
import { OFFER_LABEL, hoursLeft } from "../../game/offers";
import { poiById } from "../../world/valdoria";
import { formatDuration } from "../../world/time";
import { DialogueScreen } from "../dialogue/DialogueScreen";
import "./offer.css";
import { wandererById } from "../../game/worldForces";

/**
 * O CHAMADO NA TELA.
 *
 * Um cartão pequeno com o relógio correndo, fora do caminho do polegar. Ele
 * não trava nada: você pode ignorá-lo até o prazo acabar, e é justamente isso
 * que faz ele pesar — o jogo segue, e a oportunidade some.
 *
 * Tocar abre quem trouxe o recado, porque uma oferta que aparece do nada é
 * exatamente o que estávamos tentando não fazer.
 */
export function OfferCard({ onTravel }: { onTravel: (poiId: string) => void }) {
  const game = useGame();
  const [open, setOpen] = useState(false);
  const offer = game.adventure.offer;
  const escort=game.adventure.escort;
  if (!offer&&escort) {
    const caravan=wandererById.get(escort.forceId);
    return <button className="offer-card caravana" onClick={()=>onTravel(escort.destinationId)}>
      <small>Escolta em andamento</small>
      <strong>{caravan?.name??"Caravana"}</strong>
      <span>Destino: {poiById.get(escort.destinationId)?.name} · mantenha-se por perto</span>
    </button>;
  }
  if (!offer) return null;

  const hours = game.journey?.hours ?? 0;
  const left = hoursLeft(offer, hours);
  const place = poiById.get(offer.poiId);

  if (open) {
    return (
      <DialogueScreen
        scene={{
          narration: true,
          speakerName: offer.title,
          speakerRole: `${OFFER_LABEL[offer.kind]} · resta ${formatDuration(left)}`,
          placeName: place?.name,
          accent: offer.kind === "cerco" ? "#b4614e" : "#c8a96a",
          text: offer.text,
          options: [
            {
              id: "aceitar",
              label: offer.accepted ? `Partir para ${place?.name}.` : "Eu vou.",
              hint: `${place?.name} · resta ${formatDuration(left)}`,
              onPick: () => { answerOffer(true); setOpen(false); onTravel(offer.poiId); },
            },
            {
              id: "depois",
              label: "Guardar o recado.",
              hint: "O prazo continua correndo",
              onPick: () => { answerOffer(true); setOpen(false); },
            },
            {
              id: "nao",
              label: "Não é assunto meu.",
              hint: "O chamado se perde",
              onPick: () => { answerOffer(false); setOpen(false); },
            },
          ],
        }}
        onClose={() => setOpen(false)}
      />
    );
  }

  return (
    <button className={`offer-card ${offer.kind}`} onClick={() => setOpen(true)}>
      <small>{OFFER_LABEL[offer.kind]} · {formatDuration(left)}</small>
      <strong>{offer.title}</strong>
      <span>{offer.accepted ? `A caminho de ${place?.name}` : "Toque para ouvir o recado"}</span>
    </button>
  );
}
