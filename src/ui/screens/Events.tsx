import { useEffect, useState } from 'preact/hooks';
import { dailyMode, dayKey, featuredMode, msUntilNextDay, msUntilNextWeek, weekKey, yesterday } from '../../core/events';
import { gateProgress } from '../../core/insight';
import { isActive, rev, screen, setMode, shadow, store } from '../../state/app';
import { dailyDone, enterGauntlet, solveDaily } from '../../state/flows';
import { BottomNav } from '../components/BottomNav';
import { COLORS } from '../components/Glyph';

export function fmtLeft(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d ? `${d}D ${h}H` : `${h}H ${m % 60}M`;
}
const PLACE = { 1: 'CHAMPION', 2: 'RUNNER-UP', 3: 'KNOCKED OUT' } as const;

export function Events() {
  rev.value;
  const p = store.profile, day = dayKey(), week = weekKey();
  const dMode = dailyMode(day), fMode = featuredMode(week);
  const done = dailyDone();
  const g = p.gauntlet?.week === week ? p.gauntlet : null;
  const canEnter = isActive(fMode);
  const [running, setRunning] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(iv); }, []);

  const enter = () => {
    if (g || !canEnter || running) return;
    setRunning(true);
    setTimeout(() => { enterGauntlet(); setRunning(false); }, 1100); // let the moment land
  };

  return (
    <div class="screen">
      <div class="abs center p-head">EVENTS</div>
      <div class="abs center p-sub lbl2">NEW PUZZLE DAILY · NEW GAUNTLET WEEKLY</div>

      {/* daily coach puzzle */}
      <button class={'card' + (!done ? ' sel' : '')} style={{ top: '116px', height: '160px' }} onClick={() => !done && void solveDaily()}>
        <div class="ct">DAILY PUZZLE</div>
        <div class="cr"><span class="o">STREAK {p.daily.last === day || p.daily.last === yesterday(day) ? p.daily.streak : 0}</span><br /><span style={{ color: 'var(--ink2)', fontSize: '11px' }}>BEST {p.daily.best}</span></div>
        <div class="cs">{dMode.name} · WHAT WOULD YOU PLAY?</div>
        <div class="cs" style={{ top: '80px' }}>IT TRAINS YOUR SHADOW</div>
        <div class="cx" style={{ color: done ? 'var(--ink)' : COLORS.X }}>
          {done ? `SOLVED · NEXT IN ${fmtLeft(msUntilNextDay())}` : 'SOLVE ›'}
        </div>
      </button>

      {/* weekly shadow gauntlet */}
      <button class={'card' + (!g && canEnter ? ' sel' : '')} style={{ top: '292px', height: '250px' }} onClick={enter}>
        <div class="ct">SHADOW GAUNTLET</div>
        <div class="cr">WEEK {week.slice(-2)}<br /><span style={{ color: 'var(--ink2)', fontSize: '11px' }}>TROPHIES {p.trophies}</span></div>
        <div class="cs">{fMode.name} · 4-SHADOW KNOCKOUT</div>
        {g ? (
          <div style={{ position: 'absolute', left: '20px', right: '20px', top: '92px' }}>
            <div style={{ fontSize: '24px', letterSpacing: '.16em', marginBottom: '14px', color: g.placement === 1 ? COLORS.X : g.placement === 2 ? '#fff' : 'var(--ink)' }}>
              {PLACE[g.placement]}
            </div>
            {g.matches.map((m) => (
              <div class="row" key={m.stage}>
                <div class="m">{m.stage}</div>
                <div style={{ color: m.won ? COLORS.X : COLORS.O }}>{m.won ? 'W' : 'L'} {m.score}</div>
                <div>{m.rival}</div>
              </div>
            ))}
          </div>
        ) : (
          <div class="cs" style={{ top: '92px', width: '320px', lineHeight: '20px' }}>
            YOUR SHADOW PLAYS IT FOR YOU<br />UNRATED · LOSSES BECOME COACHING
          </div>
        )}
        <div class="cx" style={{ color: g ? 'var(--ink)' : running ? '#fff' : canEnter ? COLORS.X : 'var(--ink2)' }}>
          {g ? `NEXT GAUNTLET IN ${fmtLeft(msUntilNextWeek())}`
            : running ? 'YOUR SHADOW IS PLAYING…'
            : canEnter ? 'ENTER YOUR SHADOW ›'
            : `SHADOW LOCKED IN ${fMode.name} · ${gateProgress(shadow.peek(fMode.id)).moves}/${gateProgress(undefined).need}`}
        </div>
      </button>

      {/* featured mode */}
      <button class="card" style={{ top: '558px', height: '120px' }}
              onClick={() => { setMode(fMode.id); screen.value = 'search'; }}>
        <div class="ct">FEATURED MODE</div>
        <div class="cr">{fmtLeft(msUntilNextWeek())}<br /><span style={{ color: 'var(--ink2)', fontSize: '11px' }}>LEFT</span></div>
        <div class="cs">THIS WEEK · {fMode.name}</div>
        <div class="cx o">PLAY RANKED ›</div>
      </button>

      <BottomNav />
    </div>
  );
}
