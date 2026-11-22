import { useRef, useState } from "react";

export function clampMapCenter(center: number[], zoom: number): [number, number] {
  return [
    Math.max(290 / zoom, Math.min(580 - 290 / zoom, center[0])),
    Math.max(280 / zoom, Math.min(560 - 280 / zoom, center[1])),
  ];
}
export function useMapViewport() {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<number[]>([290, 280]);
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    center: number[];
    matrix: DOMMatrix | null;
  } | null>(null);
  const width = 580 / zoom,
    height = 560 / zoom;
  function changeZoom(next: number, focus?: number[]) {
    const value = Math.max(1, Math.min(6, next));
    setCenter(clampMapCenter(zoom === 1 && focus ? focus : center, value));
    setZoom(value);
  }
  function reset() {
    setZoom(1);
    setCenter([290, 280]);
  }
  function down(event: React.PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    moved.current = false;
    if (zoom === 1) return;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      center,
      matrix: event.currentTarget.getScreenCTM()?.inverse() ?? null,
    };
  }
  function move(event: React.PointerEvent<SVGSVGElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x,
      dy = event.clientY - start.y;
    if (!moved.current && Math.hypot(dx, dy) < 6) return;
    if (!moved.current) event.currentTarget.setPointerCapture(event.pointerId);
    moved.current = true;
    setDragging(true);
    const matrix = start.matrix;
    if (matrix)
      setCenter(
        clampMapCenter(
          [
            start.center[0] - (matrix.a * dx + matrix.c * dy),
            start.center[1] - (matrix.b * dx + matrix.d * dy),
          ],
          zoom,
        ),
      );
  }
  function end(event: React.PointerEvent<SVGSVGElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return {
    zoom,
    dragging,
    changeZoom,
    reset,
    viewBox: `${center[0] - width / 2} ${center[1] - height / 2} ${width} ${height}`,
    handlers: {
      onPointerDown: down,
      onPointerMove: move,
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
      onClickCapture(event: React.MouseEvent<SVGSVGElement>) {
        if (moved.current && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
    },
  };
}
