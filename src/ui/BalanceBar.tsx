import { useEffect, useState } from "react";
import { leaningLabel, type BalanceState } from "../game/balance";

/**
 * A BALANÇA, NO ALTO DA TELA.
 *
 * Fina de propósito: fica visível a campanha inteira e não pode roubar mapa.
 * Uma agulha entre dois polos e UMA linha de texto — que mostra o que a
 * Balança lê hoje e, por alguns segundos depois de uma decisão, o que a
 * moveu. É a mesma fatia de largura nos dois casos, para a faixa não pular
 * de tamanho no meio de uma partida.
 *
 * Antes de o jogo revelar que existe um segundo caminho, ela é uma barra de
 * um lado só. Ele ainda não imaginou destruir nada.
 */
export function BalanceBar({ balance }: { balance: BalanceState }) {
  const [nudge, setNudge] = useState<{ amount: number; reason: string } | null>(null);

  useEffect(() => {
    if (!balance.last) return;
    setNudge({ amount: balance.last.amount, reason: balance.last.reason });
    const t = setTimeout(() => setNudge(null), 4200);
    return () => clearTimeout(t);
  }, [balance.last?.at]);

  // −100..100 vira 0..100 de largura. Antes da revelação só existe a metade
  // direita, então o zero da barra é o zero da Balança.
  const pos = balance.revealed ? (balance.tilt + 100) / 2 : Math.max(0, balance.tilt);
  const read = leaningLabel(balance);

  return (
    <div className={`balance ${balance.revealed ? "two" : "one"}`} title={read}>
      {balance.revealed && <span className="balance-pole left">Cinzas</span>}
      <span className="balance-track">
        <i className="balance-fill" style={{ width: `${pos}%` }} />
        {balance.revealed && <i className="balance-mid" />}
        <i className="balance-needle" style={{ left: `${pos}%` }} />
      </span>
      <span className="balance-pole right">Coroa</span>
      <span className={`balance-status ${nudge ? (nudge.amount > 0 ? "up" : "down") : ""}`}>
        {nudge ? `${nudge.amount > 0 ? "▸" : "◂"} ${nudge.reason}` : read}
      </span>
    </div>
  );
}
