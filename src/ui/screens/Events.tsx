import { useEffect, useState } from 'preact/hooks';
import { challengeBoard, dailyMode, dayKey, featuredMode, msUntilNextDay, msUntilNextWeek, weekKey, yesterday } from '../../core/events';
import { spiritStage } from '../../core/insight';
import { isActive, rev, screen, setMode, shadow, startSession, store } from '../../state/app';
import { dailyDone, enterGauntlet, solveDaily } from '../../state/flows';
import { COLORS } from '../components/Glyph';
import { Scroll } from '../components/Scroll';
import { feel } from '../feel';

export function fmtLeft(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d ? `${d}D ${h}H` : `${h}H ${m % 60}M`;
}
const PLACE = { 1: 'CHAMPION', 2: 'RUNNER-UP', 3: 'KNOCKED OUT' } as const;

/** the board challenge is the last card: two subtitle lines above its PLAY link need 150px */
const CHALLENGE_TOP = 694, CHALLENGE_H = 150;
const EVENTS_END = CHALLENGE_TOP + CHALLENGE_H + 24;

export function Events() {
  rev.value;
  const p = store.profile, day = dayKey(), week = weekKey();
  const dMode = dailyMode(day), fMode = featuredMode(week), cBoard = challengeBoard(week);
  const ch = p.challenge?.week === week && p.challenge.mode === cBoard.id ? p.challenge : null;
  const done = dailyDone();
  const g = p.gauntlet?.week === week ? p.gauntlet : null;
  const canEnter = isActive(fMode);
  const [running, setRunning] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(iv); }, []);

  const enter = () => {
    if (g || !canEnter || running) return;
    setRunning(true);
    setTimeout(() => {
      const res = enterGauntlet();
      setRunning(false);
      if (res) setTimeout(() => (res.placement === 1 ? feel.trophy() : res.placement === 2 ? feel.draw() : feel.lose()), 200);
    }, 1100); // let the moment land
  };

  return (
    <div class="screen">
      <Scroll height={EVENTS_END}>
      <div class="abs center p-sub lbl2">NEW PUZZLE DAILY · NEW GAUNTLET WEEKLY</div>

      {/* daily coach puzzle */}
      <button class={'card stg' + (!done ? ' sel' : '')} style={{ top: '116px', height: '160px', '--i': 0 } as any} onClick={() => !done && void solveDaily()}>
        <div class="ct">DAILY PUZZLE</div>
        <div class="cr"><span class="o">STREAK {p.daily.last === day || p.daily.last === yesterday(day) ? p.daily.streak : 0}</span><br /><span style={{ color: 'var(--ink2)', fontSize: '11px' }}>BEST {p.daily.best}</span></div>
        <div class="cs">{dMode.name} · WHAT WOULD YOU PLAY?</div>
        <div class="cs" style={{ top: '80px' }}>IT TRAINS YOUR SPIRIT</div>
        <div class="cx" style={{ color: done ? 'var(--ink)' : COLORS.X }}>
          {done ? `SOLVED · NEXT IN ${fmtLeft(msUntilNextDay())}` : 'SOLVE ›'}
        </div>
      </button>

      {/* weekly shadow gauntlet */}
      <button class={'card stg' + (!g && canEnter ? ' sel' : '')} style={{ top: '292px', height: '250px', '--i': 1 } as any} onClick={enter}>
        <div class="ct">SPIRIT GAUNTLET</div>
        <div class="cr">WEEK {week.slice(-2)}<br /><span style={{ color: 'var(--ink2)', fontSize: '11px' }}>TROPHIES {p.trophies}</span></div>
        <div class="cs">{fMode.name} · 4-SPIRIT KNOCKOUT</div>
        {g ? (
          <div style={{ position: 'absolute', left: '20px', right: '20px', top: '92px' }}>
            <div class="pop" style={{ fontSize: '24px', letterSpacing: '.16em', marginBottom: '14px', color: g.placement === 1 ? COLORS.X : g.placement === 2 ? '#fff' : 'var(--ink)' }}>
              {PLACE[g.placement]}
            </div>
            {g.matches.map((m) => (
              <div class="row stg" key={m.stage} style={{ '--i': m.stage === 'FINAL' ? 2 : 1 } as any}>
                <div class="m">{m.stage}</div>
                <div style={{ color: m.won ? COLORS.X : COLORS.O }}>{m.won ? 'W' : 'L'} {m.score}</div>
                <div>{m.rival}</div>
              </div>
            ))}
          </div>
        ) : (
          <div class="cs" style={{ top: '92px', width: '320px', lineHeight: '20px' }}>
            YOUR SPIRIT PLAYS IT FOR YOU<br />UNRATED · LOSSES BECOME COACHING
          </div>
        )}
        <div class="cx" style={{ color: g ? 'var(--ink)' : running ? '#fff' : canEnter ? COLORS.X : 'var(--ink2)' }}>
          {g ? `NEXT GAUNTLET IN ${fmtLeft(msUntilNextWeek())}`
            : running ? 'YOUR SPIRIT IS PLAYING…'
            : canEnter ? 'ENTER YOUR SPIRIT ›'
            : `${spiritStage(shadow.peek(fMode.id)).name} · WAKE IT TO ENTER`}
        </div>
      </button>

      {/* weekly board challenge — the only place the big boards are played */}
      <button class="card stg" style={{ top: CHALLENGE_TOP + 'px', height: CHALLENGE_H + 'px', '--i': 3 } as any}
              onClick={() => startSession('challenge', undefined, cBoard.id)}>
        <div class="ct">BOARD CHALLENGE</div>
        <div class="cr">{cBoard.n}×{cBoard.n}<br /><span style={{ color: 'var(--ink2)', fontSize: '11px' }}>{cBoard.k} IN A ROW</span></div>
        <div class="cs">{cBoard.name} · UNRATED</div>
        <div class="cs" style={{ top: '80px' }}>YOUR SPIRIT SITS THIS ONE OUT</div>
        <div class="cx o">
          {ch ? `${ch.w}W ${ch.l}L ${ch.d}D · PLAY AGAIN ›` : 'PLAY ›'}
        </div>
      </button>

      {/* featured mode */}
      <button class="card stg" style={{ top: '558px', height: '120px', '--i': 2 } as any}
              onClick={() => { setMode(fMode.id); screen.value = 'search'; }}>
        <div class="ct">FEATURED MODE</div>
        <div class="cr">{fmtLeft(msUntilNextWeek())}<br /><span style={{ color: 'var(--ink2)', fontSize: '11px' }}>LEFT</span></div>
        <div class="cs">THIS WEEK · {fMode.name}</div>
        <div class="cx o">PLAY RANKED ›</div>
      </button>
      </Scroll>
    </div>
  );
}
