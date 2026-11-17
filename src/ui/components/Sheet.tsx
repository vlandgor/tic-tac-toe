import type { ComponentChildren } from 'preact';
import { closeOverlay } from '../../state/overlays';

/**
 * Bottom sheet: a scrim you can tap to dismiss, and a panel that rises from the
 * bottom edge. Used for the spirit picker, mode select and custom game.
 */
export function Sheet({ title, sub, children }: { title: string; sub?: string; children: ComponentChildren }) {
  return (
    <div class="sheet-wrap">
      <div class="sheet-scrim" onClick={closeOverlay} />
      <div class="sheet in-up">
        <div class="sheet-grab" />
        <div class="sheet-title">{title}</div>
        {sub && <div class="sheet-sub lbl2">{sub}</div>}
        {children}
      </div>
    </div>
  );
}
