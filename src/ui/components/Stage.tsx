import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

export const FRAME = { w: 420, h: 910 } as const;

/**
 * Everything is authored at 420x910 and uniformly scaled — sizes and gaps never
 * reflow.
 *
 * The frame is fitted to the *safe* area, not the raw viewport: `.stage-wrap`
 * is padded by the safe-area insets (notch, status bar, home indicator) and the
 * scale is measured from the inner box. Nothing is drawn in the inset strips,
 * and since the page is black throughout they simply read as black bezel.
 */
export function Stage({ children }: { children: ComponentChildren }) {
  const [scale, setScale] = useState(1);
  const safe = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fit = () => {
      const el = safe.current;
      const w = el?.clientWidth || innerWidth;
      const h = el?.clientHeight || innerHeight;
      setScale(Math.min(w / FRAME.w, h / FRAME.h));
    };
    fit();
    // the insets themselves change on rotation and when browser chrome slides away
    const ro = safe.current ? new ResizeObserver(fit) : null;
    if (ro && safe.current) ro.observe(safe.current);
    addEventListener('resize', fit);
    addEventListener('orientationchange', fit);
    window.visualViewport?.addEventListener('resize', fit);
    return () => {
      ro?.disconnect();
      removeEventListener('resize', fit);
      removeEventListener('orientationchange', fit);
      window.visualViewport?.removeEventListener('resize', fit);
    };
  }, []);

  return (
    <div class="stage-wrap">
      <div class="stage-safe" ref={safe}>
        <div class="stage" style={{ transform: `scale(${scale})` }}>{children}</div>
      </div>
    </div>
  );
}
