import { useState } from 'preact/hooks';
import { MODES } from '../../core/rules/modes';
import { standings } from '../../core/rating';
import type { ModeId } from '../../core/rules/types';
import { mode, rev, store } from '../../state/app';
import { COLORS } from '../components/Glyph';

/** Per-mode leaderboard. Today: you + the rival pool. With a backend: real players. */
export function Ranks() {
  rev.value;
  const p = store.profile;
  const [view, setView] = useState<ModeId>(mode.value);
  const r = MODES.find((m) => m.id === view)!;
  const cycle = (d: number) => setView(MODES[(MODES.indexOf(r) + d + MODES.length) % MODES.length].id);
  const list = standings(p.rivals, view, { name: p.name, rating: p.rating[view] });

  return (
    <div class="screen">
      <div class="abs center p-head">RANKS</div>
      <div class="abs selrow" style={{ top: '82px' }}>
        <button class="arr" aria-label="Previous mode" onClick={() => cycle(-1)}>
          <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="#fff" stroke-width="1.6"><path d="M10 2 2 10l8 8" /></svg>
        </button>
        <div class="mid">{r.name}</div>
        <button class="arr" aria-label="Next mode" onClick={() => cycle(1)}>
          <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="#fff" stroke-width="1.6"><path d="M2 2l8 8-8 8" /></svg>
        </button>
      </div>
      <div class="abs rk-head lbl2" style={{ top: '150px', fontSize: '11px' }}>
        <div>#</div><div>SPIRIT</div><div style={{ textAlign: 'right' }}>RATING</div>
      </div>
      <div class="abs rk" style={{ top: '172px' }} key={view}>
        {list.map((s, i) => (
          <div class={'r stg' + (s.you ? ' you' : '')} key={s.name} style={{ '--i': i * 0.4 } as any}>
            <div class="num" style={s.you ? { color: COLORS.X } : undefined}>{i + 1}</div>
            <div>
              <div class="n" style={s.you ? { color: COLORS.X } : undefined}>{s.name}</div>
              <div class="t">{s.tag}</div>
            </div>
            <div class="rt" style={s.you ? { color: COLORS.X } : undefined}>{s.rating}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
