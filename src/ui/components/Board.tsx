import type { ComponentChildren } from 'preact';
import type { Player, RuleSet, State, Terminal } from '../../core/rules/types';
import { COLORS, Glyph } from './Glyph';

interface Props {
  rules: RuleSet;
  s: State;
  /** cell size, mark size, line overhang (px) */
  cell: number; mark: number; overhang: number;
  left: number; top: number;
  lineColor?: string; lineWidth?: number;
  newIdx?: number;
  hint?: Player | null;
  terminal?: Terminal | null;
  /** dim everything except the winning line */
  fadeLosers?: boolean;
  showWinLine?: boolean;
  onTap?: (i: number) => void;
  decorate?: (i: number) => ComponentChildren;
}

/** Any 3x3 board, any ruleset. Marks that fade on their owner's next move are dimmed. */
export function Board(p: Props) {
  const final = !!p.terminal?.over;
  const dX = final ? -1 : p.rules.doomed(p.s, 'X');
  const dO = final ? -1 : p.rules.doomed(p.s, 'O');
  const line = p.terminal?.line ?? null;
  const c = p.cell;
  const center = (i: number) => [(i % 3) * c + c / 2, ((i / 3) | 0) * c + c / 2];
  let win: { x1: number; y1: number; x2: number; y2: number; color: string } | null = null;
  if (p.showWinLine && line && p.terminal?.maker) {
    const [x1, y1] = center(line[0]), [x2, y2] = center(line[2]);
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, e = c * 0.31;
    win = { x1: x1 - (dx / L) * e, y1: y1 - (dy / L) * e, x2: x2 + (dx / L) * e, y2: y2 + (dy / L) * e,
            color: COLORS[p.terminal.maker] };
  }
  const style = {
    left: p.left + 'px', top: p.top + 'px', '--c': c + 'px', '--m': p.mark + 'px', '--ov': p.overhang + 'px',
    ...(p.lineColor ? { '--line': p.lineColor } : {}), ...(p.lineWidth ? { '--lw': p.lineWidth + 'px' } : {}),
  } as any;

  return (
    <div class="board" style={style}>
      <div class="ln v" style={{ left: c + 'px' }} /><div class="ln v" style={{ left: 2 * c + 'px' }} />
      <div class="ln h" style={{ top: c + 'px' }} /><div class="ln h" style={{ top: 2 * c + 'px' }} />
      <div class="cells">
        {p.s.cells.map((v, i) => (
          <button key={i} class={'cell' + (p.fadeLosers && final && (!line || !line.includes(i)) ? ' fade' : '')}
                  onClick={() => p.onTap?.(i)}>
            {p.decorate?.(i)}
            {v ? <Glyph p={v} anim={i === p.newIdx} doom={i === dX || i === dO} />
               : p.hint ? <Glyph p={p.hint} hint /> : null}
          </button>
        ))}
      </div>
      {win && (
        <svg class="winline" viewBox={`0 0 ${3 * c} ${3 * c}`} key={line!.join()}>
          <line x1={win.x1} y1={win.y1} x2={win.x2} y2={win.y2} style={{ stroke: win.color }} />
        </svg>
      )}
    </div>
  );
}
