import { WorldMap } from "./map/WorldMap";
import { HeroSelect } from "./ui/hero/HeroSelect";
import { useGame } from "./game/store";

/**
 * Antes de escolher personagem não existe campanha — e o mapa depende de quem
 * é o jogador para saber onde a viagem começa. Por isso a escolha vem antes de
 * montar o mundo, e não como uma camada por cima dele.
 */
export default function App() {
  const game = useGame();
  return game.started && game.heroId ? <WorldMap /> : <HeroSelect />;
}
