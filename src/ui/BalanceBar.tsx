import { useEffect, useState } from "react";
import { leaningLabel, type BalanceState } from "../game/balance";

/**
 * A BALANÇA, NO ALTO DA TELA.
 *
 * Fina de propósito: ela fica visível a campanha inteira e não pode roubar
 * mapa. Uma agulha que anda entre dois polos, o rótulo do que ela lê hoje, e
 * um aviso curto quando alguma coisa a move — sem o aviso, o jogador vê a
 * agulha mudar de lugar e não faz ideia do que a empurrou.
 *
 * Antes de o jogo revelar que existe um segundo caminho, ela é uma barra de
 * um lado só, marcada COROA. Ele ainda não imaginou destruir nada.
 */
export function BalanceBar({ balance }: { balance: BalanceState }) {
  const [nudge, setNudge] = useState<{ amount: number; reason: string } | null>(null);

  useEffect(() => {
    if (!balance.last) return;
    setNudge({ amount: balance.last.amount, reason: balance.last.reason });
    const t = setTimeout(() => setNudge(null), 3800);
    return () => clearTimeout(t);
  }, [balance.last?.at]);

  // −100..100 vira 0..100 de largura. Antes da revelação só a metade direita
  // existe, então o zero da barra é o zero da Balança.
  const pos = balance.revealed
    ? (balance.tilt + 100) / 2
    : Math.max(0, balance.tilt);

  return (
    <div className={`balance ${balance.revealed ? "two" : "one"}`} title={leaningLabel(balance)}>
      <span className="balance-pole left">{balance.revealed ? "Cinzas" : ""}</span>
      <span className="balance-track">
        <i className="balance-fill" style={{ width: `${pos}%` }} />
        {balance.revealed && <i className="balance-mid" />}
        <i className="balance-needle" style={{ left: `${pos}%` }} />
      </span>
      <span className="balance-pole right">Coroa</span>
      <span className="balance-read">{leaningLabel(balance)}</span>
      {nudge && (
        <span className={`balance-nudge ${nudge.amount > 0 ? "up" : "down"}`}>
          {nudge.amount > 0 ? "▸" : "◂"} {nudge.reason}
        </span>
      )}
    </div>
  );
}
