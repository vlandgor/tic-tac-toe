import { useState } from 'preact/hooks';
import { gateProgress } from '../../core/insight';
import { lossCount } from '../../core/profile';
import { MODES, modeById } from '../../core/rules/modes';
import type { ModeId } from '../../core/rules/types';
import { pct, type Ratio } from '../../core/shadow/shadow';
import { isActive, mode, rev, shadow, store } from '../../state/app';
import { coachLosses } from '../../state/flows';
import { COLORS } from '../components/Glyph';
import { CountUp, useMounted } from '../feel/motion';

const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

function Trait({ k, r }: { k: string; r: Ratio }) {
  const v = pct(r);
  const mounted = useMounted(120);
  return (
    <div class="trait">
      <div class="top"><div class="k">{k}</div>
        <div class="v">{v === null ? <span style={{ color: 'var(--ink2)' }}>NO DATA</span> : v + '%'}</div></div>
      <div class="track"><div class="fill" style={{ width: (mounted ? v ?? 0 : 0) + '%' }} /></div>
    </div>
  );
}

/** Your shadow, one mode at a time: how well it knows you, and what it did while you were away. */
export function ShadowScreen() {
  rev.value;
  const p = store.profile;
  const [view, setView] = useState<ModeId>(mode.value);
  const r = MODES.find((m) => m.id === view)!;
  const cycle = (d: number) => setView(MODES[(MODES.indexOf(r) + d + MODES.length) % MODES.length].id);
  const h = shadow.head(r), fid = shadow.fidelity(r.id), tempo = shadow.tempo();
  const active = isActive(r), gate = gateProgress(h), losses = lossCount(p);
  const log = p.away.slice(0, 3);

  return (
    <div class="screen">
      <div class="abs selrow" style={{ top: '30px' }}>
        <button class="arr" aria-label="Previous mode" onClick={() => cycle(-1)}>
          <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="#fff" stroke-width="1.6"><path d="M10 2 2 10l8 8" /></svg>
        </button>
        <div class="mid">{r.name}</div>
        <button class="arr" aria-label="Next mode" onClick={() => cycle(1)}>
          <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="#fff" stroke-width="1.6"><path d="M2 2l8 8-8 8" /></svg>
        </button>
      </div>
      <div class="abs center" style={{ top: '90px', fontSize: '13px', letterSpacing: '.18em', color: active ? COLORS.X : 'var(--ink)' }}>
        {active ? 'IN MATCHMAKING · PLAYING AS YOU' : `LOCKED · ${gate.moves} / ${gate.need} MOVES${gate.needsStyle ? ' · NEEDS CHOICE MOVES' : ''}`}
      </div>
      <div class="abs center h-fid" style={{ top: '118px' }} key={r.id}>{fid === null ? '—' : <><CountUp to={fid} ms={800} />%</>}</div>
      <div class="abs center lbl" style={{ top: '214px' }}>STYLE FIDELITY</div>
      <div class="abs center h-note" style={{ top: '236px' }}>CHOICE MOVES ONLY · FORCED MOVES EXCLUDED</div>

      <div class="abs h-traits" style={{ top: '274px' }}>
        <Trait key={r.id + 'c'} k="OPENS CENTER" r={h.traits.centerOpen} />
        <Trait key={r.id + 'k'} k="PLAYS CORNERS" r={h.traits.corner} />
        <Trait key={r.id + 'b'} k="BLOCKS THREATS" r={h.traits.block} />
        <Trait key={r.id + 'f'} k="TAKES THE WIN" r={h.traits.finish} />
      </div>
      <div class="abs h-stats" style={{ top: '488px' }}>
        <div class="st"><div class="v">{p.rating[r.id]}</div><div class="lbl2">RATING</div></div>
        <div class="st"><div class="v">{h.moves}</div><div class="lbl2">MOVES</div></div>
        <div class="st"><div class="v">{h.coached}</div><div class="lbl2">COACHED</div></div>
        <div class="st"><div class="v">{tempo ? tempo.toFixed(1) + 's' : '—'}</div><div class="lbl2">TEMPO</div></div>
      </div>
      {losses > 0 && (
        <button class="tbtn" style={{ top: '558px', height: '44px', color: COLORS.X, letterSpacing: '.16em' }} onClick={coachLosses}>
          COACH FROM LOSSES · {Math.min(losses, 4)}
        </button>
      )}

      <div class="abs lbl2" style={{ left: '36px', top: '618px', fontSize: '11px' }}>PLAYED AS YOU</div>
      <div class="abs rows" style={{ top: '640px' }}>
        {log.length ? log.map((a, i) => {
          const c = a.res === 'W' ? COLORS.X : a.res === 'L' ? COLORS.O : '#fff';
          return (
            <div class="arow stg" key={i} style={{ height: '44px', '--i': i } as any}>
              <div class="m">{modeById(a.mode).name}</div>
              <div style={{ color: c }}>{a.res} {a.score}</div>
              <div>{a.rival}</div>
              <div class="d" style={{ color: c }}>{signed(a.delta)}</div>
            </div>
          );
        }) : (
          <div class="lbl2" style={{ fontSize: '11px', lineHeight: '20px', marginTop: '8px' }}>
            NOTHING YET<br />YOUR SPIRIT PLAYS WHILE YOU'RE AWAY
          </div>
        )}
      </div>
    </div>
  );
}
