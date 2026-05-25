import { useCallback, useRef, type TouchEvent } from "react";

const SWIPE_THRESHOLD_PX = 48;

type SwipeOptions = {
  enabled?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSwipeStart?: () => void;
};

/** 主图区域左右滑动切换（移动端）；垂直滑动仍交给页面滚动。 */
export function useSwipeCarousel({
  enabled = true,
  onPrev,
  onNext,
  onSwipeStart,
}: SwipeOptions) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      onSwipeStart?.();
      const t = e.touches[0];
      if (!t) return;
      startRef.current = { x: t.clientX, y: t.clientY };
    },
    [enabled, onSwipeStart],
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !startRef.current) return;
      const t = e.changedTouches[0];
      if (!t) {
        startRef.current = null;
        return;
      }

      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;
      startRef.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.2) return;

      if (dx < 0) onNext();
      else onPrev();
    },
    [enabled, onNext, onPrev],
  );

  return { onTouchStart, onTouchEnd };
}
