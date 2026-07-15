import { useState, useLayoutEffect, useCallback } from 'react';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function useTargetPosition(selector: string): TargetRect | null {
  const [rect, setRect] = useState<TargetRect | null>(null);

  const measure = useCallback(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-coach-mark="${selector}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      bottom: r.bottom,
      right: r.right,
    });
  }, [selector]);

  useLayoutEffect(() => {
    // Measuring an element's layout geometry into state is an inherent
    // read-from-the-DOM synchronization: we must measure once on mount to
    // position the coach mark. This is the sanctioned useLayoutEffect
    // measurement pattern, which the set-state-in-effect heuristic can't model.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  return rect;
}
