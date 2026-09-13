import { WorldMap } from "./map/WorldMap";
import { HeroSelect } from "./ui/hero/HeroSelect";
import { RotateNotice, usePortraitPhone } from "./ui/Orientation";
import { useGame } from "./game/store";

/**
 * Antes de escolher personagem não existe campanha — e o mapa depende de quem
 * é o jogador para saber onde a viagem começa. Por isso a escolha vem antes de
 * montar o mundo, e não como uma camada por cima dele.
 *
 * E antes de tudo vem a orientação: o jogo é deitado, e num telefone em pé não
 * há layout que salve — melhor pedir para virar do que entregar uma tela
 * espremida.
 */
export default function App() {
  const game = useGame();
  if (usePortraitPhone()) return <RotateNotice />;
  return game.started && game.heroId ? <WorldMap /> : <HeroSelect />;
}
