/** Entrada unificada: teclado, mouse/roda, toque com joystick virtual e pinça. */
export class Input {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  /** Eixos analógicos do joystick virtual (-1..1). */
  joy = { x: 0, y: 0, active: false };
  zoomDelta = 0;
  touchMode = false;
  private joyId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private pinch: { id1: number; id2: number; d: number } | null = null;
  private touches = new Map<number, { x: number; y: number }>();
  onTap: ((x: number, y: number) => void) | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private joyBase: HTMLElement,
    private joyKnob: HTMLElement,
  ) {
    window.addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "tab"].includes(k)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.zoomDelta += -Math.sign(e.deltaY) * Math.min(1, Math.abs(e.deltaY) / 100);
      },
      { passive: false },
    );
    canvas.addEventListener("click", (e) => {
      if (!this.touchMode) this.onTap?.(e.offsetX, e.offsetY);
    });
    const opts = { passive: false } as AddEventListenerOptions;
    canvas.addEventListener("touchstart", (e) => this.touchStart(e), opts);
    canvas.addEventListener("touchmove", (e) => this.touchMove(e), opts);
    canvas.addEventListener("touchend", (e) => this.touchEnd(e), opts);
    canvas.addEventListener("touchcancel", (e) => this.touchEnd(e), opts);
  }

  private touchStart(e: TouchEvent): void {
    e.preventDefault();
    this.touchMode = true;
    document.body.classList.add("touch");
    for (const t of Array.from(e.changedTouches)) {
      this.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      if (this.joyId === null && t.clientX < window.innerWidth * 0.45) {
        this.joyId = t.identifier;
        this.joyOrigin = { x: t.clientX, y: t.clientY };
        this.joy.active = true;
        this.joyBase.style.left = `${t.clientX}px`;
        this.joyBase.style.top = `${t.clientY}px`;
        this.joyBase.classList.add("on");
        this.joyKnob.style.transform = "translate(-50%,-50%)";
      }
    }
    const others = [...this.touches.keys()].filter((id) => id !== this.joyId);
    if (others.length >= 2 && !this.pinch) {
      const a = this.touches.get(others[0])!;
      const b = this.touches.get(others[1])!;
      this.pinch = { id1: others[0], id2: others[1], d: Math.hypot(a.x - b.x, a.y - b.y) };
    }
  }

  private touchMove(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      this.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      if (t.identifier === this.joyId) {
        const dx = t.clientX - this.joyOrigin.x;
        const dy = t.clientY - this.joyOrigin.y;
        const R = 55;
        const d = Math.hypot(dx, dy);
        const k = d > R ? R / d : 1;
        this.joy.x = (dx * k) / R;
        this.joy.y = (dy * k) / R;
        this.joyKnob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
      }
    }
    if (this.pinch) {
      const a = this.touches.get(this.pinch.id1);
      const b = this.touches.get(this.pinch.id2);
      if (a && b) {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinch.d > 0) this.zoomDelta += Math.log(d / this.pinch.d) * 3;
        this.pinch.d = d;
      }
    }
  }

  private touchEnd(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const start = this.touches.get(t.identifier);
      this.touches.delete(t.identifier);
      if (t.identifier === this.joyId) {
        this.joyId = null;
        this.joy = { x: 0, y: 0, active: false };
        this.joyBase.classList.remove("on");
      } else if (start && !this.pinch && Math.hypot(start.x - t.clientX, start.y - t.clientY) < 10) {
        const r = this.canvas.getBoundingClientRect();
        this.onTap?.(t.clientX - r.left, t.clientY - r.top);
      }
      if (this.pinch && (t.identifier === this.pinch.id1 || t.identifier === this.pinch.id2)) this.pinch = null;
    }
  }

  down(...k: string[]): boolean {
    return k.some((x) => this.keys.has(x));
  }

  /** Verdadeiro uma única vez por pressionamento. */
  hit(k: string): boolean {
    if (this.pressed.has(k)) {
      this.pressed.delete(k);
      return true;
    }
    return false;
  }

  endFrame(): void {
    this.pressed.clear();
    this.zoomDelta = 0;
  }

  /** Eixos combinados: x = direção (+direita), y = aceleração (+frente). */
  axes(): { x: number; y: number; brake: boolean; run: boolean } {
    let x = 0;
    let y = 0;
    if (this.down("a", "arrowleft")) x -= 1;
    if (this.down("d", "arrowright")) x += 1;
    if (this.down("w", "arrowup")) y += 1;
    if (this.down("s", "arrowdown")) y -= 1;
    if (this.joy.active) {
      x += this.joy.x;
      y += -this.joy.y;
    }
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), brake: this.down(" "), run: this.down("shift") };
  }
}
