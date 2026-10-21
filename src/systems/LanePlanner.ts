import { horizontalIntersections, rotate, type Vec2 } from "../core/math";

export interface Lane {
  index: number;
  /** Início/fim do percurso do centro do veículo. */
  start: Vec2;
  end: Vec2;
  heading: number;
  /** Trecho da faixa dentro do campo (para amostrar progresso). */
  edgeStart: Vec2;
  edgeEnd: Vec2;
}

export interface LanePlan {
  angle: number;
  lanes: Lane[];
  spacing: number;
}

export interface LaneOptions {
  width: number;
  /** Distância (com sinal) da linha de trabalho até o centro do veículo: + à frente, - atrás. */
  workOffset: number;
  overlap?: number;
  /** Começa pelo lado oposto do campo. */
  fromEnd?: boolean;
}

/** Direção da maior aresta do polígono: as faixas seguem o lado mais comprido. */
export function dominantAngle(poly: readonly Vec2[]): number {
  let best = 0;
  let angle = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l > best) {
      best = l;
      angle = Math.atan2(b.y - a.y, b.x - a.x);
    }
  }
  return angle;
}

/** Planeja faixas paralelas (boustrofédon) cobrindo o polígono com a largura de trabalho. */
export function planLanes(poly: readonly Vec2[], opt: LaneOptions): LanePlan {
  const angle = dominantAngle(poly);
  const local = poly.map((p) => rotate(p, -angle));
  let ymin = Infinity;
  let ymax = -Infinity;
  for (const p of local) {
    ymin = Math.min(ymin, p.y);
    ymax = Math.max(ymax, p.y);
  }
  const eff = opt.width * (opt.overlap ?? 0.94);
  const n = Math.max(1, Math.ceil((ymax - ymin) / eff));
  const spacing = (ymax - ymin) / n;
  const lanes: Lane[] = [];
  const d = opt.workOffset;
  for (let kk = 0; kk < n; kk++) {
    const k = opt.fromEnd ? n - 1 - kk : kk;
    const y = ymin + spacing * (k + 0.5);
    let x0 = Infinity;
    let x1 = -Infinity;
    for (let t = -1; t <= 1; t += 0.5) {
      const yy = Math.min(ymax - 0.05, Math.max(ymin + 0.05, y + (t * opt.width) / 2));
      const xs = horizontalIntersections(local, yy);
      if (xs.length >= 2) {
        x0 = Math.min(x0, xs[0]);
        x1 = Math.max(x1, xs[xs.length - 1]);
      }
    }
    if (!isFinite(x0)) continue;
    const forward = lanes.length % 2 === 0;
    const eS = forward ? x0 : x1;
    const eE = forward ? x1 : x0;
    const dir = forward ? 1 : -1;
    // posição do centro do veículo para que a linha de trabalho cubra a borda com folga
    const sX = eS - dir * (d + 1.5);
    const eX = eE - dir * (d - 1.5);
    const toWorld = (x: number) => rotate({ x, y }, angle);
    lanes.push({
      index: lanes.length,
      start: toWorld(sX),
      end: toWorld(eX),
      heading: angle + (forward ? 0 : Math.PI),
      edgeStart: toWorld(eS),
      edgeEnd: toWorld(eE),
    });
  }
  return { angle, lanes, spacing };
}

function arc(out: Vec2[], cx: number, cy: number, r: number, a0: number, a1: number, step = 0.7): void {
  const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * r) / step));
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
}

/**
 * Manobra de cabeceira entre o fim de uma faixa e o início da próxima (sentido oposto).
 * Usa meia-volta simples quando o espaçamento permite, ou manobra em "ômega" quando
 * o raio mínimo de giro é maior que meio espaçamento.
 */
export function planTurn(end: Vec2, heading: number, next: Vec2, minRadius: number): Vec2[] {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  const toLocal = (p: Vec2) => ({ x: (p.x - end.x) * c + (p.y - end.y) * s, y: -(p.x - end.x) * s + (p.y - end.y) * c });
  const S = toLocal(next);
  const flip = S.y < 0 ? -1 : 1;
  const lat = Math.abs(S.y);
  const sx = S.x;
  const pts: Vec2[] = [{ x: 0, y: 0 }];
  const cx = Math.max(0, sx);
  if (cx > 0.5) pts.push({ x: cx, y: 0 });
  if (lat / 2 >= minRadius) {
    arc(pts, cx, lat / 2, lat / 2, -Math.PI / 2, Math.PI / 2);
  } else {
    const r = minRadius;
    const xc = Math.sqrt(Math.max(0, 4 * r * r - (lat / 2 + r) ** 2));
    const c1 = { x: cx, y: -r };
    const c2 = { x: cx + xc, y: lat / 2 };
    const c3 = { x: cx, y: lat + r };
    const t1 = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
    const t2 = { x: (c2.x + c3.x) / 2, y: (c2.y + c3.y) / 2 };
    const a1 = Math.atan2(t1.y - c1.y, t1.x - c1.x);
    arc(pts, c1.x, c1.y, r, Math.PI / 2, a1);
    const b0 = Math.atan2(t1.y - c2.y, t1.x - c2.x);
    let b1 = Math.atan2(t2.y - c2.y, t2.x - c2.x);
    if (b1 < b0) b1 += Math.PI * 2;
    arc(pts, c2.x, c2.y, r, b0, b1);
    const g0 = Math.atan2(t2.y - c3.y, t2.x - c3.x);
    arc(pts, c3.x, c3.y, r, g0, -Math.PI / 2);
  }
  pts.push({ x: Math.min(sx, cx - 0.5), y: lat });
  return pts.map((p) => {
    const ly = p.y * flip;
    return { x: end.x + p.x * c - ly * s, y: end.y + p.x * s + ly * c };
  });
}
