/**
 * Loop de simulação com passo fixo e renderização desacoplada.
 * A simulação roda sempre em FIXED_DT; o render recebe o fator de interpolação.
 */
export const FIXED_DT = 1 / 60;

export class GameLoop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  fps = 60;
  private fpsAcc = 0;
  private fpsFrames = 0;

  constructor(
    private readonly step: (dt: number) => void,
    private readonly render: (alpha: number, frameDt: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      let frame = (now - this.last) / 1000;
      this.last = now;
      if (frame > 0.25) frame = 0.25;
      this.acc += frame;
      let steps = 0;
      while (this.acc >= FIXED_DT && steps < 8) {
        this.step(FIXED_DT);
        this.acc -= FIXED_DT;
        steps++;
      }
      if (steps === 8) this.acc = 0;
      this.fpsAcc += frame;
      this.fpsFrames++;
      if (this.fpsAcc >= 0.5) {
        this.fps = this.fpsFrames / this.fpsAcc;
        this.fpsAcc = 0;
        this.fpsFrames = 0;
      }
      this.render(this.acc / FIXED_DT, frame);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
