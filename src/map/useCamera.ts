/**
 * Câmera do mapa: pan, zoom suave, roda do mouse, arrastar, pinch-to-zoom,
 * limites e centralização automática.
 *
 * A transformação é aplicada IMPERATIVAMENTE ao <g> raiz. Assim arrastar o mapa
 * não re-renderiza as milhares de formas do mundo. O React só é notificado
 * quando o nível de zoom muda o suficiente para afetar o LOD.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Point } from "../world/types";

export type CameraLimits = {
  world: { x: number; y: number; width: number; height: number };
  /** Retângulo que o enquadramento inicial deve mostrar (a massa territorial). */
  focus: { minX: number; minY: number; maxX: number; maxY: number };
  maxZoom: number;
  initialCenter?: Point;
  initialScale?: number;
};

type Cam = { cx: number; cy: number; zoom: number };

/** Estado da câmera entregue aos assinantes a cada frame. */
export type CameraView = Cam & {
  /** Pixels por unidade de mundo. */
  scale: number;
  width: number;
  height: number;
};

export function useCamera({ world, focus, maxZoom, initialCenter, initialScale }: CameraLimits) {
  const focusCenter = { x: (focus.minX + focus.maxX) / 2, y: (focus.minY + focus.maxY) / 2 };
  const initialView = useRef({ center: initialCenter, scale: initialScale });
  const initialized = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<SVGGElement | null>(null);
  const cam = useRef<Cam>({ cx: focusCenter.x, cy: focusCenter.y, zoom: 1 });
  const target = useRef<Cam>({ ...cam.current });
  const viewport = useRef({ w: 1, h: 1 });
  const raf = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  /** Incrementa quando a câmera para de se mover — dispara o culling por viewport. */
  const [settle, setSettle] = useState(0);

  /** Escala em px por unidade de mundo quando zoom = 1 (reino inteiro visível). */
  const baseScale = useCallback(() => {
    const { w, h } = viewport.current;
    return Math.min(w / world.width, h / world.height);
  }, [world.width, world.height]);

  /** Zoom em que a massa territorial cabe inteira na tela. */
  const containZoom = useCallback(() => {
    const { w, h } = viewport.current;
    const fw = focus.maxX - focus.minX;
    const fh = focus.maxY - focus.minY;
    return Math.min(w / fw, h / fh) / baseScale();
  }, [baseScale, focus]);

  /**
   * Zoom em que a massa territorial preenche a tela. Em telas verticais é o
   * enquadramento inicial certo: o reino ocupa a altura e o jogador navega
   * arrastando, em vez de ver um mapa minúsculo cercado de vazio.
   */
  const coverZoom = useCallback(() => {
    const { w, h } = viewport.current;
    const fw = focus.maxX - focus.minX;
    const fh = focus.maxY - focus.minY;
    return Math.max(w / fw, h / fh) / baseScale();
  }, [baseScale, focus]);

  const minZoom = useCallback(() => containZoom() * 0.88, [containZoom]);

  const clamp = useCallback(
    (c: Cam): Cam => {
      const zoomC = Math.max(minZoom(), Math.min(maxZoom, c.zoom));
      const s = baseScale() * zoomC;
      const halfW = viewport.current.w / 2 / s;
      const halfH = viewport.current.h / 2 / s;
      // Margem: o mundo pode respirar um pouco além da borda, sem se perder.
      const padX = world.width * 0.04;
      const padY = world.height * 0.04;
      const minX = world.x - padX + halfW;
      const maxX = world.x + world.width + padX - halfW;
      const minY = world.y - padY + halfH;
      const maxY = world.y + world.height + padY - halfH;
      return {
        zoom: zoomC,
        cx: minX > maxX ? world.x + world.width / 2 : Math.max(minX, Math.min(maxX, c.cx)),
        cy: minY > maxY ? world.y + world.height / 2 : Math.max(minY, Math.min(maxY, c.cy)),
      };
    },
    [baseScale, maxZoom, minZoom, world],
  );

  /**
   * Assinantes da transformação — usados por camadas que não são SVG (o chão
   * ladrilhado em canvas) e precisam se redesenhar no mesmo frame do pan.
   */
  const subscribers = useRef(new Set<(view: CameraView) => void>());

  const subscribe = useCallback((fn: (view: CameraView) => void) => {
    subscribers.current.add(fn);
    return () => subscribers.current.delete(fn);
  }, []);

  /**
   * Um `pointermove` pode chegar 120 vezes por segundo em telas ProMotion.
   * Redesenhar os canvas do chão e do cenário a cada evento é o que travava o
   * mapa no celular: o trabalho é feito várias vezes para o mesmo frame. Aqui
   * os eventos são agrupados e a transformação é aplicada uma vez por frame.
   */
  const applyPending = useRef(0);
  const applyNow = useCallback(() => {
    if (applyPending.current) {
      cancelAnimationFrame(applyPending.current);
      applyPending.current = 0;
    }
    const { w, h } = viewport.current;
    const s = baseScale() * cam.current.zoom;
    const g = layerRef.current;
    if (g) {
      g.setAttribute(
        "transform",
        `translate(${w / 2} ${h / 2}) scale(${s}) translate(${-cam.current.cx} ${-cam.current.cy})`,
      );
    }
    if (subscribers.current.size) {
      const view: CameraView = { ...cam.current, scale: s, width: w, height: h };
      for (const fn of subscribers.current) fn(view);
    }
  }, [baseScale]);

  /** Versão agrupada por frame — usada pelo pan, que vem de eventos de ponteiro. */
  const apply = useCallback(() => {
    if (applyPending.current) return;
    applyPending.current = requestAnimationFrame(() => {
      applyPending.current = 0;
      applyNow();
    });
  }, [applyNow]);

  /** Loop de suavização: a câmera persegue o alvo, dando inércia ao zoom. */
  const tick = useCallback(() => {
    const c = cam.current;
    const t = target.current;
    const k = 0.22;
    const dz = t.zoom - c.zoom;
    const dx = t.cx - c.cx;
    const dy = t.cy - c.cy;
    const settled = Math.abs(dz) < 1e-4 && Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2;
    if (settled) {
      cam.current = { ...t };
      applyNow();
      raf.current = 0;
      setZoom((z) => (Math.abs(z - t.zoom) > 0.01 ? t.zoom : z));
      setSettle((s) => s + 1);
      return;
    }
    cam.current = { cx: c.cx + dx * k, cy: c.cy + dy * k, zoom: c.zoom + dz * k };
    applyNow();
    setZoom((z) => (Math.abs(z - cam.current.zoom) > 0.05 ? cam.current.zoom : z));
    raf.current = requestAnimationFrame(tick);
  }, [applyNow]);

  const kick = useCallback(() => {
    // Sempre reagenda: guardar só o id deixaria o loop preso se o frame tivesse
    // sido cancelado por fora (é o que o StrictMode faz na montagem dupla).
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  }, [tick]);

  const setTarget = useCallback(
    (next: Partial<Cam>, immediate = false) => {
      target.current = clamp({ ...target.current, ...next });
      if (immediate) {
        cam.current = { ...target.current };
        apply();
        setZoom(target.current.zoom);
      } else kick();
    },
    [apply, clamp, kick],
  );

  /* ------------------------------ viewport ----------------------------- */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      viewport.current = { w: r.width, h: r.height };
      if (!initialized.current) {
        initialized.current = true;
        // Paisagem: mostra o reino inteiro. Retrato: preenche a altura.
        const portrait = r.width / r.height < 0.95;
        const z = initialView.current.scale ? initialView.current.scale / baseScale() : portrait ? Math.min(coverZoom(), 3.2) : containZoom();
        const center = initialView.current.center ?? focusCenter;
        target.current = { cx: center.x, cy: center.y, zoom: z };
        cam.current = { ...target.current };
      }
      target.current = clamp(target.current);
      cam.current = clamp(cam.current);
      applyNow();
      setZoom(cam.current.zoom);
      setReady(true);
      setSettle((s) => s + 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyNow, baseScale, clamp, containZoom, coverZoom, focusCenter.x, focusCenter.y]);

  /* ------------------------- conversões de espaço ---------------------- */

  const screenToWorld = useCallback(
    (sx: number, sy: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const s = baseScale() * cam.current.zoom;
      return {
        x: cam.current.cx + (sx - rect.left - rect.width / 2) / s,
        y: cam.current.cy + (sy - rect.top - rect.height / 2) / s,
      };
    },
    [baseScale],
  );

  /** Zoom preservando o ponto do mundo sob o cursor/dedo. */
  const zoomAt = useCallback(
    (factor: number, screenX: number, screenY: number) => {
      const before = screenToWorld(screenX, screenY);
      const nextZoom = Math.max(minZoom(), Math.min(maxZoom, target.current.zoom * factor));
      const s = baseScale() * nextZoom;
      const rect = containerRef.current!.getBoundingClientRect();
      setTarget({
        zoom: nextZoom,
        cx: before.x - (screenX - rect.left - rect.width / 2) / s,
        cy: before.y - (screenY - rect.top - rect.height / 2) / s,
      });
    },
    [baseScale, maxZoom, minZoom, screenToWorld, setTarget],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      zoomAt(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [zoomAt],
  );

  const centerOn = useCallback(
    (p: Point, zoomLevel?: number, immediate = false) => {
      setTarget({ cx: p.x, cy: p.y, ...(zoomLevel ? { zoom: zoomLevel } : {}) }, immediate);
    },
    [setTarget],
  );

  const fitWorld = useCallback(() => {
    setTarget({ cx: focusCenter.x, cy: focusCenter.y, zoom: containZoom() });
  }, [containZoom, focusCenter.x, focusCenter.y, setTarget]);

  /* --------------------------- gestos (pointer) ------------------------ */

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; mid: Point } | null>(null);
  const dragged = useRef(0);
  /**
   * Distância LÍQUIDA do dedo até onde ele encostou, e não o comprimento do
   * caminho percorrido. No celular um toque parado ainda emite vários
   * `pointermove` de um pixel, e somar esses pixels fazia qualquer toque
   * passar do limiar — o mapa entendia arrasto e o castelo nunca abria.
   */
  const origin = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(0);
  const pinched = useRef(false);

  /**
   * Os gestos NÃO usam setPointerCapture: capturar o ponteiro faria o evento de
   * clique ser entregue ao <svg> em vez do POI clicado. Em vez disso o arrasto
   * é acompanhado por listeners na janela, o que também mantém o pan vivo
   * quando o dedo/cursor sai da área do mapa.
   */
  const moveRef = useRef<(e: PointerEvent) => void>();
  const upRef = useRef<(e: PointerEvent) => void>();
  // Referências estáveis: são exatamente as mesmas funções no add e no remove.
  const onWindowMove = useRef((e: PointerEvent) => moveRef.current?.(e)).current;
  const onWindowUp = useRef((e: PointerEvent) => upRef.current?.(e)).current;

  const handleMove = useCallback(
    (e: PointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 2 && pinch.current) {
        const [a, b] = [...pointers.current.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (pinch.current.dist > 0) zoomAt(d / pinch.current.dist, mid.x, mid.y);
        pinch.current = { dist: d, mid };
        dragged.current += 10;
        pinched.current = true;
        return;
      }

      const s = baseScale() * cam.current.zoom;
      const dx = (e.clientX - prev.x) / s;
      const dy = (e.clientY - prev.y) / s;
      dragged.current += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
      if (origin.current) {
        moved.current = Math.max(
          moved.current,
          Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y),
        );
      }
      // Pan é imediato: arrastar precisa colar no dedo, sem suavização.
      setTarget({ cx: target.current.cx - dx, cy: target.current.cy - dy }, true);
    },
    [baseScale, setTarget, zoomAt],
  );

  const handleUp = useCallback(
    (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);
      if (dragged.current > 2) setSettle((s) => s + 1);
    }
    },
    [onWindowMove, onWindowUp],
  );

  moveRef.current = handleMove;
  upRef.current = handleUp;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const first = pointers.current.size === 0;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = 0;
    if (first) {
      origin.current = { x: e.clientX, y: e.clientY };
      moved.current = 0;
      pinched.current = false;
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
    if (first) {
      window.addEventListener("pointermove", onWindowMove);
      window.addEventListener("pointerup", onWindowUp);
      window.addEventListener("pointercancel", onWindowUp);
    }
  }, [onWindowMove, onWindowUp]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
      zoomAt(factor, e.clientX, e.clientY);
    },
    [zoomAt],
  );

  /** `true` se o gesto atual foi um arrasto (para não disparar clique). */
  /**
   * Um toque com o dedo vale como toque até 12 px de desvio — abaixo disso é
   * tremor de mão, não intenção de arrastar. Pinça sempre cancela o clique.
   */
  const wasDragged = useCallback(() => pinched.current || moved.current > 12, []);

  /** Retângulo do mundo visível agora, com margem para o culling. */
  const getVisibleRect = useCallback(
    (margin = 0.25) => {
      const s = baseScale() * cam.current.zoom;
      const w = viewport.current.w / s;
      const h = viewport.current.h / s;
      return {
        minX: cam.current.cx - w / 2 - w * margin,
        maxX: cam.current.cx + w / 2 + w * margin,
        minY: cam.current.cy - h / 2 - h * margin,
        maxY: cam.current.cy + h / 2 + h * margin,
      };
    },
    [baseScale],
  );

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      cancelAnimationFrame(applyPending.current);
      raf.current = 0;
      applyPending.current = 0;
    },
    [],
  );

  return {
    settle,
    subscribe,
    /** Pixels de tela por unidade de mundo quando zoom = 1. */
    baseScale,
    getVisibleRect,
    containerRef,
    layerRef,
    zoom,
    ready,
    camRef: cam,
    screenToWorld,
    centerOn,
    fitWorld,
    zoomBy,
    wasDragged,
    handlers: { onPointerDown, onWheel },
  };
}
