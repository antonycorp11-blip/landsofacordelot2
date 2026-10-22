/** Sintetizador procedural (WebAudio): cada golpe toca a nota do inimigo. */
export function midiHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export class Synth {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private wet: GainNode | null = null;
  private dry: GainNode | null = null;
  private voices = 0;
  private droneNodes: { o: OscillatorNode[]; g: GainNode } | null = null;
  muted = false;

  /** precisa ser chamado num gesto do usuário */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    const out = ctx.createGain();
    out.gain.value = this.muted ? 0 : 0.7;
    out.connect(comp);
    this.out = out;
    this.dry = ctx.createGain();
    this.dry.gain.value = 0.8;
    this.dry.connect(out);
    // reverb de sala de concerto: resposta ao impulso gerada com ruído decaindo
    const len = Math.floor(ctx.sampleRate * 2.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.32;
    this.wet.connect(conv);
    conv.connect(out);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.05);
  }

  private bus(g: AudioNode): void {
    g.connect(this.dry!);
    g.connect(this.wet!);
  }

  /** nota dedilhada (harpa/celesta) */
  pluck(midi: number, vel = 0.5, bright = 1, dur = 0.9): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || this.voices > 28) return;
    const t = ctx.currentTime;
    const f = midiHz(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(12000, f * (4 + 6 * bright)), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.5), t + dur);
    lp.connect(g);
    this.bus(g);
    const o1 = ctx.createOscillator();
    o1.type = "triangle";
    o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = f * 2.001;
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    o1.connect(lp);
    o2.connect(g2);
    g2.connect(lp);
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
    this.voices++;
    o1.onended = () => this.voices--;
  }

  /** acorde: notas quase juntas, como um arpejo rápido */
  chord(midis: number[], vel = 0.6): void {
    midis.forEach((m, i) => setTimeout(() => this.pluck(m, vel, 1.2, 1.6), i * 35));
    midis.forEach((m) => this.pad(m - 12, 1.4, 0.12));
  }

  pad(midi: number, dur: number, vel: number): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this.bus(g);
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = midiHz(midi);
      o.detune.value = det;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      o.connect(lp);
      lp.connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  /** clique do metrônomo */
  tick(accent: boolean): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = accent ? 1760 : 1320;
    const g = ctx.createGain();
    g.gain.setValueAtTime(accent ? 0.07 : 0.035, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g);
    g.connect(this.dry!);
    o.start(t);
    o.stop(t + 0.06);
  }

  /** bumbo suave para marcar o tempo forte */
  kick(): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g);
    g.connect(this.dry!);
    o.start(t);
    o.stop(t + 0.3);
  }

  /** som desafinado (Lyra atingida, choque do trítono) */
  sour(midi: number, vel = 0.4): void {
    this.pluck(midi, vel, 0.4, 0.5);
    this.pluck(midi + 1, vel, 0.4, 0.5);
    this.pluck(midi + 6, vel * 0.6, 0.4, 0.5);
  }

  /** bordão grave da tonalidade (tônica + quinta) */
  drone(root: number | null): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (this.droneNodes) {
      const d = this.droneNodes;
      d.g.gain.setTargetAtTime(0.0001, t, 0.4);
      d.o.forEach((o) => o.stop(t + 2));
      this.droneNodes = null;
    }
    if (root === null) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.setTargetAtTime(0.05, t, 1.2);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500;
    lp.connect(g);
    this.bus(g);
    const os: OscillatorNode[] = [];
    for (const [m, det] of [
      [root - 24, -4],
      [root - 24, 4],
      [root - 17, 0],
      [root - 12, 3],
    ]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = midiHz(m);
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      os.push(o);
    }
    this.droneNodes = { o: os, g };
  }
}
