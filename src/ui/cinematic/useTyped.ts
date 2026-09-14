import { useEffect, useRef, useState } from "react";

/** Um caractere a cada 22ms: perto da velocidade de quem lê em voz alta. */
const MS_PER_CHAR = 22;

export type TypedLine = { text: string; done: boolean };

/**
 * O TEXTO SENDO ESCRITO.
 *
 * Revela caractere a caractere, na ordem das linhas. Devolve só as linhas que
 * já começaram — as que ainda não começaram não existem na tela, e é por isso
 * que a conversa parece ir subindo em vez de aparecer pronta.
 *
 * `skip` completa tudo na hora. É obrigatório: quem já leu, ou quem está
 * rejogando, não pode ser obrigado a esperar a máquina de escrever.
 */
export function useTyped(lines: string[], key: string) {
  const total = lines.reduce((sum, l) => sum + l.length, 0);
  const [chars, setChars] = useState(0);
  const timer = useRef<number>();

  useEffect(() => {
    setChars(0);
  }, [key]);

  useEffect(() => {
    if (chars >= total) return;
    timer.current = window.setTimeout(() => setChars((c) => c + 1), MS_PER_CHAR);
    return () => window.clearTimeout(timer.current);
  }, [chars, total]);

  const shown: TypedLine[] = [];
  let left = chars;
  for (const line of lines) {
    if (left <= 0) break;
    const take = Math.min(line.length, left);
    shown.push({ text: line.slice(0, take), done: take === line.length });
    left -= take;
  }

  return { shown, done: chars >= total, skip: () => setChars(total) };
}
