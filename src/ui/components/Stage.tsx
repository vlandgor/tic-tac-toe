import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export const FRAME = { w: 420, h: 910 } as const;

/** Everything is authored at 420x910 and uniformly scaled — sizes and gaps never reflow. */
export function Stage({ children }: { children: ComponentChildren }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(innerWidth / FRAME.w, innerHeight / FRAME.h));
    fit();
    addEventListener('resize', fit);
    addEventListener('orientationchange', fit);
    window.visualViewport?.addEventListener('resize', fit);
    return () => {
      removeEventListener('resize', fit);
      removeEventListener('orientationchange', fit);
      window.visualViewport?.removeEventListener('resize', fit);
    };
  }, []);
  return (
    <div class="stage-wrap">
      <div class="stage" style={{ transform: `scale(${scale})` }}>{children}</div>
    </div>
  );
}
