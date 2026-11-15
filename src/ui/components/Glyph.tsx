import type { Player } from '../../core/rules/types';

export const COLORS = { X: '#FF5A1E', O: '#2E9BFF' } as const;
const O_LEN = (2 * Math.PI * 32).toFixed(1);

interface Props { p: Player; anim?: boolean; doom?: boolean; hint?: boolean; stroke?: number; }

/** X / O mark. `anim` draws it in like a vector cabinet. */
export function Glyph({ p, anim, doom, hint, stroke = 9 }: Props) {
  const cls = [anim && 'draw', doom && 'doom', hint && 'hint'].filter(Boolean).join(' ');
  if (p === 'X') {
    return (
      <svg viewBox="0 0 100 100" class={cls} style={{ '--len': '105' } as any}>
        <path d="M18 18 82 82" stroke={COLORS.X} stroke-width={stroke} fill="none" />
        <path d="M82 18 18 82" stroke={COLORS.X} stroke-width={stroke} fill="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" class={cls} style={{ '--len': O_LEN } as any}>
      <circle cx="50" cy="50" r="32" stroke={COLORS.O} stroke-width={stroke} fill="none" />
    </svg>
  );
}
