import type { ComponentChildren } from 'preact';

/** the shared bars this region sits between — keep in step with .topbar and .nav */
export const TOPBAR_H = 64;
export const NAV_H = 84;

/**
 * A vertical scroll region for tab screens, between the top bar and the nav.
 *
 * Screens are authored in absolute frame coordinates (top: 0 is the top of
 * the stage), so the inner box is shifted up by the bar's height: children
 * keep their existing `top` values and land exactly where they did before.
 * `height` is the frame y where the content ends; anything past the nav
 * becomes scrollable, anything shorter simply doesn't scroll.
 */
export function Scroll({ height, children }: { height: number; children: ComponentChildren }) {
  return (
    <div class="scroll" style={{ top: TOPBAR_H + 'px', bottom: NAV_H + 'px' }}>
      <div class="scroll-inner" style={{ height: height + 'px', marginTop: -TOPBAR_H + 'px' }}>
        {children}
      </div>
    </div>
  );
}
