import { useEffect, useState } from 'preact/hooks';
import { foundFor } from '../../core/discoveries';
import { AWAKE_STAGE, spiritStage } from '../../core/insight';
import { lossCount } from '../../core/profile';
import { MODES, modeById } from '../../core/rules/modes';
import type { ModeId } from '../../core/rules/types';
import { commit, isActive, mode, rev, shadow, store } from '../../state/app';
import { coachLosses } from '../../state/flows';
import { runRead } from '../../state/overlays';
import { READ_ROUND } from '../../core/reads';
import { ReadHistory } from '../overlays/Read';
import { COLORS } from '../components/Glyph';
import { Scroll } from '../components/Scroll';
import { StagePips } from '../components/StagePips';
import { CountUp } from '../feel/motion';

const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

/* vertical rhythm, in frame px */
const READ_TOP = 166;   // "can it read you?" block
const DISC_TOP = 330;   // "DISCOVERIES" header
const DISC_ROW = 58;    // one discovery
const AWAY_ROW = 44;    // one away-match row

/**
 * Your spirit, one mode at a time: how well it reads you, the habits it has
 * noticed (discoveries), and what it did while you were away.
 */
export function ShadowScreen() {
  rev.value;
  const p = store.profile;
  const [view, setView] = useState<ModeId>(mode.value);
  const r = MODES.find((m) => m.id === view)!;
  const cycle = (d: number) => setView(MODES[(MODES.indexOf(r) + d + MODES.length) % MODES.length].id);
  const h = shadow.head(r), fid = shadow.fidelity(r.id);
  const active = isActive(r), stage = spiritStage(h), losses = lossCount(p);
  const log = p.away.slice(0, 3);

  const reads = p.reads[r.id] ?? [];
  const found = foundFor(p, r.id);
  // keep a hint of what's left to find: a fuller row of locks when nothing is found yet
  const locked = found.length ? 1 : 3;

  // NEW stays lit while you're looking; leaving the mode (or the tab) marks it seen
  useEffect(() => () => {
    let changed = false;
    for (const f of foundFor(store.profile, view)) {
      const d = store.profile.discoveries[f.key];
      if (d && !d.seen) { d.seen = true; changed = true; }
    }
    if (changed) commit();
  }, [view]);

  // everything below the discoveries flows from how many there are
  const listTop = DISC_TOP + 30;
  const listEnd = listTop + (found.length + locked) * DISC_ROW;
  const statsTop = listEnd + 24;
  const coachTop = statsTop + 70;
  const awayTop = coachTop + (losses > 0 ? 60 : 0);
  const end = awayTop + 22 + Math.max(1, log.length) * AWAY_ROW + 24;

  return (
    <div class="screen">
      <Scroll height={end}>
        <div class="abs selrow" style={{ top: '70px' }}>
          <button class="arr" aria-label="Previous mode" onClick={() => cycle(-1)}>
            <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="#fff" stroke-width="1.6"><path d="M10 2 2 10l8 8" /></svg>
          </button>
          <div class="mid">{r.name}</div>
          <button class="arr" aria-label="Next mode" onClick={() => cycle(1)}>
            <svg width="11" height="18" viewBox="0 0 12 20" fill="none" stroke="#fff" stroke-width="1.6"><path d="M2 2l8 8-8 8" /></svg>
          </button>
        </div>
        <div class="abs center" style={{ top: '130px', fontSize: '13px', letterSpacing: '.18em', color: active ? COLORS.X : 'var(--ink)' }}>
          {active ? 'IN MATCHMAKING · PLAYING AS YOU' : stage.line}
        </div>

        {/* the game on this screen: can it guess your move before you make it? */}
        <button class="abs rd-card" style={{ top: READ_TOP + 'px' }} onClick={() => void runRead(r)}>
          <div class="t">CAN IT READ YOU?</div>
          <div class="s">IT GUESSES YOUR MOVE · {READ_ROUND} POSITIONS</div>
          <div class="last">{reads.length ? 'LAST' : 'NEVER TRIED'}<b>{reads.length ? `${reads[reads.length - 1]}/${READ_ROUND}` : '—'}</b></div>
          <div class="go">TEST IT ›</div>
          <div class="hist"><ReadHistory list={reads} width={110} height={30} highlightLast /></div>
        </button>

        {/* discoveries — habits it has noticed, newest first */}
        <div class="abs disc-head" style={{ top: DISC_TOP + 'px' }}>
          <span class="lbl2">DISCOVERIES</span>
          <span class="lbl2">{found.length ? `${found.length} FOUND` : 'NONE YET'}</span>
        </div>
        <div class="abs rows" style={{ top: listTop + 'px' }} key={r.id + '-disc'}>
          {found.map((f, i) => (
            <div class={'disc stg' + (f.seen ? '' : ' new')} key={f.key} style={{ height: DISC_ROW + 'px', '--i': i } as any}>
              <div class="tx">
                <div class="nm">{f.def.name}</div>
                <div class="ln">{f.def.line}{f.mode === null ? ' · EVERY MODE' : ''}</div>
              </div>
              {!f.seen && <div class="tag">NEW</div>}
            </div>
          ))}
          {Array.from({ length: locked }, (_, i) => (
            <div class="disc locked stg" key={'lk' + i} style={{ height: DISC_ROW + 'px', '--i': found.length + i } as any}>
              <div class="tx">
                <div class="nm">? ? ?</div>
                <div class="ln">{i === 0 ? "KEEP PLAYING · IT'S STILL WATCHING YOU" : ' '}</div>
              </div>
            </div>
          ))}
        </div>

        <div class="abs h-stats" style={{ top: statsTop + 'px' }}>
          <div class="st"><div class="v">{p.rating[r.id]}</div><div class="lbl2">RATING</div></div>
          <div class="st">
            <div class="v stage-v" style={{ color: stage.idx >= AWAKE_STAGE ? COLORS.X : '#fff' }}>{stage.name}</div>
            <StagePips stage={stage} width={64} />
          </div>
          <div class="st"><div class="v">{fid === null ? '—' : <><CountUp to={fid} ms={800} />%</>}</div><div class="lbl2">FIDELITY</div></div>
          <div class="st"><div class="v">{h.coached}</div><div class="lbl2">COACHED</div></div>
        </div>
        {losses > 0 && (
          <button class="tbtn" style={{ top: coachTop + 'px', height: '44px', color: COLORS.X, letterSpacing: '.16em' }} onClick={coachLosses}>
            COACH FROM LOSSES · {Math.min(losses, 4)}
          </button>
        )}

        <div class="abs lbl2" style={{ left: '36px', top: awayTop + 'px', fontSize: '11px' }}>PLAYED AS YOU</div>
        <div class="abs rows" style={{ top: awayTop + 22 + 'px' }}>
          {log.length ? log.map((a, i) => {
            const c = a.res === 'W' ? COLORS.X : a.res === 'L' ? COLORS.O : '#fff';
            return (
              <div class="arow stg" key={i} style={{ height: AWAY_ROW + 'px', '--i': i } as any}>
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
      </Scroll>
    </div>
  );
}
