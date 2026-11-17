import { dailyMode, dayKey, msUntilNextDay, yesterday } from '../../core/events';
import { AWAKE_STAGE, spiritStage } from '../../core/insight';
import { isActive, rev, rules, screen, shadow, store } from '../../state/app';
import { dailyDone, solveDaily } from '../../state/flows';
import { overlay } from '../../state/overlays';
import { MiniBoard } from '../components/MiniBoard';
import { StagePips } from '../components/StagePips';
import { fmtLeft } from './Events';

/**
 * Play, as three blocks:
 *   1. today's puzzle
 *   2. the selected mode — its name, a warm-up board against your spirit, its stats
 *   3. play — custom game, PLAY, select mode
 * then one quiet line about where your spirit stands.
 */
export function Menu() {
  rev.value; // re-render on model/profile changes
  const r = rules.value, p = store.profile;
  const h = shadow.peek(r.id), fid = shadow.fidelity(r.id);
  const active = isActive(r), stage = spiritStage(h);

  const day = dayKey(), done = dailyDone(), dMode = dailyMode(day);
  const streak = p.daily.last === day || p.daily.last === yesterday(day) ? p.daily.streak : 0;

  return (
    <div class="screen">

      {/* 1 — daily puzzle */}
      <button class={'abs pb pb-daily' + (done ? '' : ' hot')} onClick={() => !done && void solveDaily()}>
        <div class="pd-title">DAILY PUZZLE</div>
        <div class="pd-sub">{dMode.name} · WHAT WOULD YOU PLAY?</div>
        <div class="pd-state" style={{ color: done ? 'var(--ink2)' : 'var(--orange)' }}>
          {done ? `NEXT IN ${fmtLeft(msUntilNextDay())}` : 'SOLVE ›'}
        </div>
        <div class="pd-streak">STREAK <span>{streak}</span></div>
      </button>

      {/* 2 — selected mode: name, warm-up board, stats */}
      <div class="abs pb pb-mode" />
      <button class="abs center pm-name" onClick={() => (screen.value = 'modes')}>{r.name}</button>
      <div class="abs center pm-blurb">{r.blurb}</div>
      <div class="abs center pm-score">
        <span class="o">YOU</span> <span class="n">{p.mini.w}</span>&nbsp;&nbsp;·&nbsp;&nbsp;DRAW <span class="n">{p.mini.d}</span>
        &nbsp;&nbsp;·&nbsp;&nbsp;<span class="n">{p.mini.l}</span> <span class="b">SPIRIT</span>
      </div>
      <MiniBoard rules={r} top={294} cell={66} />
      <div class="hair" style={{ left: '44px', top: '520px', width: '332px' }} />
      <div class="abs pm-stats">
        <div class="st"><div class="v">{p.rating[r.id]}</div><div class="lbl2">RATING</div></div>
        <div class="st">
          <div class="v stage-v" style={{ color: stage.idx >= AWAKE_STAGE ? 'var(--orange)' : '#fff' }}>{stage.name}</div>
          <StagePips stage={stage} width={78} />
        </div>
        <div class="st"><div class="v o">{fid === null ? '—' : fid + '%'}</div><div class="lbl2">FIDELITY</div></div>
      </div>

      {/* 3 — play */}
      <div class="abs m-playrow">
        <button class="m-sq" aria-label="Custom game" onClick={() => (overlay.value = { kind: 'custom' })}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2.1" /><circle cx="10" cy="17" r="2.1" />
          </svg>
        </button>
        <button class="m-play" onClick={() => (screen.value = 'search')}><span>PLAY</span></button>
        <button class="m-sq" aria-label="Select mode" onClick={() => (overlay.value = { kind: 'modeSelect' })}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round">
            <path d="M12 3.4 21 8l-9 4.6L3 8z" /><path d="M3 12.4 12 17l9-4.6M3 16.6 12 21l9-4.4" />
          </svg>
        </button>
      </div>

      {/* quiet footer */}
      <div class="abs center pf-note" style={active ? { color: 'var(--orange)' } : undefined}>
        {active ? `YOUR SPIRIT PLAYS RANKED ${r.name} AS YOU` : stage.line}
      </div>
    </div>
  );
}
