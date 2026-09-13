/**
 * A BALANÇA.
 *
 * O jogador fica com o selo antes de saber o que é, e a primeira coisa que
 * quer com ele é o óbvio: reinar. Um plebeu com um selo está a seis de tudo.
 *
 * A Balança mede o que ele faz DEPOIS disso. Não é moral e não é karma: é a
 * leitura de como ele vem usando poder. Quem cobra imposto pesado, aceita
 * título, toma juramento de lorde vencido e vende cativo está construindo um
 * trono e vai querer sentar nele. Quem baixa imposto, solta prisioneiro,
 * recusa senhor e dissolve Casa em vez de vassalizá-la está, sem dizer em voz
 * alta, concluindo que o problema nunca foi quem estava sentado — é a cadeira.
 *
 * Ela NÃO tranca a escolha final. No fim, com o reino todo na mão, ele decide
 * o que quiser. A Balança decide se o reino ACREDITA nele: quem passou vinte
 * horas sendo senhor e no último minuto quebra os selos em nome do povo é
 * abandonado por metade dos seus, e quem passou vinte horas soltando cativo e
 * no último minuto põe a coroa na cabeça governa sobre gente que se lembra.
 *
 * Fica visível o tempo todo, no alto da tela, porque uma medida escondida não
 * muda decisão nenhuma — e o ponto dela é ser lembrada na hora de cobrar um
 * imposto, não na hora do final.
 */
import { getState, update } from "./store";

/** −100 é CINZAS (quebrar os selos), +100 é COROA (usá-los). */
export type BalanceState = {
  tilt: number;
  /**
   * O segundo polo não existe no começo. Ele só quer reinar — destruir os
   * selos não lhe passou pela cabeça, e uma barra com dois lados entregaria
   * um final que ele ainda não tem motivo para imaginar. Quando o jogo lhe
   * mostra pela primeira vez o preço de um selo, a barra ganha o outro lado.
   */
  revealed: boolean;
  /** Último empurrão, para o aviso flutuante. */
  last: { amount: number; reason: string; at: number } | null;
};

/** A marca que abre o segundo polo. Vem de uma cena, não de um número. */
export const REVEAL_FLAG = "balanca_cinzas";

export function freshBalance(): BalanceState {
  // Começa inclinado para a Coroa: é o que ele quer antes de saber de nada.
  return { tilt: 14, revealed: false, last: null };
}

/** Pesos. Ação de rotina move pouco; decisão que marca gente move muito. */
export const TILT = {
  /** Imposto: a alavanca que ele mexe mais vezes na campanha inteira. */
  taxPesado: 3,
  taxJusto: 0,
  taxBaixo: -3,
  /** Obra paga do bolso dele, que rende para quem mora lá. */
  investir: -1,
  /** Cativo vendido por moeda. */
  resgate: 1,
  /** Cativo solto sem cobrar nada. */
  soltar: -2,
  /** Ajoelhar para uma Casa é aceitar a escada. */
  juramento: 3,
  /** Quebrar juramento é dizer que a escada não vale. */
  quebrarJuramento: -2,
  /** Erguer a própria Casa é querer o topo da escada. */
  independencia: 5,
} as const;

/**
 * Move a Balança.
 *
 * `reason` é o que aparece ao lado da barra por alguns segundos. Sem isso o
 * jogador vê um número mexer e não sabe o que o mexeu, que é o mesmo que não
 * mostrar nada.
 */
export function tilt(amount: number, reason: string) {
  if (!amount) return;
  update((s) => ({
    ...s,
    balance: {
      ...s.balance,
      tilt: Math.max(-100, Math.min(100, s.balance.tilt + amount)),
      last: { amount, reason, at: Date.now() },
    },
  }));
}

/** Abre o segundo polo. Idempotente: a cena pode disparar duas vezes. */
export function revealCinzas() {
  if (getState().balance.revealed) return;
  update((s) => ({ ...s, balance: { ...s.balance, revealed: true } }));
}

export type Leaning = "coroa" | "cinzas" | "dividido";

export function leaning(b: BalanceState): Leaning {
  if (b.tilt >= 20) return "coroa";
  if (b.tilt <= -20) return "cinzas";
  return "dividido";
}

/**
 * Como o reino leria esse homem hoje. Sai no HUD e, no fim, define quem fica
 * do lado dele quando ele decidir.
 */
export function leaningLabel(b: BalanceState): string {
  if (!b.revealed) return "Quer a coroa";
  const t = b.tilt;
  if (t >= 70) return "Nasceu para a coroa";
  if (t >= 30) return "Constrói um trono";
  if (t >= 10) return "Inclinado à coroa";
  if (t > -10) return "Ainda não decidiu";
  if (t > -30) return "Inclinado às cinzas";
  if (t > -70) return "Desconfia de tronos";
  return "Quer acabar com aquilo";
}
