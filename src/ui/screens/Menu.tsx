import { MODES } from '../../core/rules/modes';
import { gateProgress } from '../../core/insight';
import { isActive, rev, rules, screen, setMode, shadow, startSession, store } from '../../state/app';
import { overlay } from '../../state/overlays';
import { MiniBoard } from '../components/MiniBoard';
import { SpiritIcon } from '../components/SpiritIcon';
import { dailyDone, solveDaily } from '../../state/flows';

export function Menu() {
  rev.value; // re-render on model/profile changes
  const r = rules.value, p = store.profile;
  const h = shadow.peek(r.id), fid = shadow.fidelity(r.id), active = isActive(r);
  const gate = gateProgress(h);
  const cycle = (d: number) => setMode(MODES[(MODES.indexOf(r) + d + MODES.length) % MODES.length].id);

  return (
    <div class="screen">
      <button class="abs m-avatar" aria-label="Change your spirit" onClick={() => (overlay.value = { kind: 'spirit' })}>
        <SpiritIcon id={p.spirit} size={34} color={active ? 'var(--orange)' : 'var(--blue)'} />
      </button>
      <div class="abs m-name">{p.name}</div>
      <div class="abs m-status lbl2" style={active ? { color: 'var(--orange)' } : undefined}>
        {active ? `SPIRIT ACTIVE · ${r.name}` : `SPIRIT LOCKED · ${gate.moves}/${gate.need}`}
      </div>
      <button class="abs m-gear" aria-label="Developer" onClick={() => (overlay.value = { kind: 'dev' })}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.4">
          <circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
        </svg>
      </button>

      <div class="abs center m-title"><span class="o">TIC</span> <span class="b">TAC</span> <span class="o">TOE</span></div>
      <div class="hair m-rule" />
      <div class="abs center m-score">
        <span class="o">YOU</span> <span class="n">{p.mini.w}</span>&nbsp;&nbsp;·&nbsp;&nbsp;DRAW <span class="n">{p.mini.d}</span>
        &nbsp;&nbsp;·&nbsp;&nbsp;<span class="n">{p.mini.l}</span> <span class="b">SPIRIT</span>
      </div>
      <MiniBoard rules={r} />

      <div class="hair" style={{ left: '36px', top: '474px', width: '348px' }} />
      <div class="abs m-stats">
        <div class="st"><div class="v">{p.rating[r.id]}</div><div class="lbl2">RATING</div></div>
        <div class="st"><div class="v">{h?.moves ?? 0}</div><div class="lbl2">MOVES</div></div>
        <div class="st"><div class="v o">{fid === null ? '—' : fid + '%'}</div><div class="lbl2">FIDELITY</div></div>
      </div>
      <div class="hair" style={{ left: '36px', top: '554px', width: '348px' }} />

      <div class="abs m-mode">
        <button class="arr" aria-label="Previous mode" onClick={() => cycle(-1)}>
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="#fff" stroke-width="1.6"><path d="M10 2 2 10l8 8" /></svg>
        </button>
        <button class="mid" onClick={() => (screen.value = 'modes')}><div class="nm">{r.name}</div><div class="bl">{r.blurb}</div></button>
        <button class="arr" aria-label="Next mode" onClick={() => cycle(1)}>
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="#fff" stroke-width="1.6"><path d="M2 2l8 8-8 8" /></svg>
        </button>
      </div>

      <button class="abs m-play" onClick={() => (screen.value = 'search')}><span>PLAY</span></button>
      <div class="abs m-sub">
        <button onClick={() => startSession('mirror')}>MIRROR MATCH</button>
        <div class="sep" />
        <button onClick={() => void solveDaily()} style={!dailyDone() ? { color: 'var(--orange)' } : undefined}>
          {dailyDone() ? 'PUZZLE SOLVED' : 'DAILY PUZZLE'}
        </button>
      </div>

    </div>
  );
}
