import { rev, rules, screen, shadow, startSession, store } from '../../state/app';
import { overlay } from '../../state/overlays';
import { MiniBoard } from '../components/MiniBoard';
import { dailyDone, solveDaily } from '../../state/flows';

export function Menu() {
  rev.value; // re-render on model/profile changes
  const r = rules.value, p = store.profile;
  const h = shadow.peek(r.id), fid = shadow.fidelity(r.id);

  return (
    <div class="screen">
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

      <button class="abs m-mode" onClick={() => (screen.value = 'modes')}>
        <div class="nm">{r.name}</div>
        <div class="bl">{r.blurb}</div>
      </button>

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
