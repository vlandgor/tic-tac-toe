import { MODES } from '../../core/rules/modes';
import { gateProgress } from '../../core/insight';
import { isActive, rev, rules, screen, setMode, shadow, startSession, store } from '../../state/app';
import { overlay } from '../../state/overlays';
import { MiniBoard } from '../components/MiniBoard';

const stroke = 'rgba(255,255,255,.3)';

export function Menu() {
  rev.value; // re-render on model/profile changes
  const r = rules.value, p = store.profile;
  const h = shadow.peek(r.id), fid = shadow.fidelity(r.id), active = isActive(r);
  const gate = gateProgress(h);
  const cycle = (d: number) => setMode(MODES[(MODES.indexOf(r) + d + MODES.length) % MODES.length].id);

  return (
    <div class="screen">
      <div class="abs m-name">{p.name}</div>
      <div class="abs m-status lbl2" style={active ? { color: 'var(--orange)' } : undefined}>
        {active ? `SHADOW ACTIVE · ${r.name}` : `SHADOW LOCKED · ${gate.moves}/${gate.need}`}
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
        &nbsp;&nbsp;·&nbsp;&nbsp;<span class="n">{p.mini.l}</span> <span class="b">SHADOW</span>
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
        <div class="mid"><div class="nm">{r.name}</div><div class="bl">{r.blurb}</div></div>
        <button class="arr" aria-label="Next mode" onClick={() => cycle(1)}>
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="#fff" stroke-width="1.6"><path d="M2 2l8 8-8 8" /></svg>
        </button>
      </div>

      <button class="abs m-play" onClick={() => (screen.value = 'search')}><span>PLAY</span></button>
      <div class="abs m-sub">
        <button onClick={() => startSession('mirror')}>MIRROR MATCH</button>
        <div class="sep" />
        <button onClick={() => (screen.value = 'shadow')}>MY SHADOW</button>
      </div>

      <div class="nav">
        <button class="tab" aria-label="Shop"><svg viewBox="0 0 24 24" fill="none" stroke={stroke} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h2.2l2.4 11.2a1.8 1.8 0 0 0 1.8 1.4h8.4a1.8 1.8 0 0 0 1.8-1.4L21 6.5H6" /><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></svg></button>
        <button class="tab" aria-label="Friends"><svg viewBox="0 0 24 24" fill="none" stroke={stroke} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.3 2.9-5.2 6.5-5.2s6.5 1.9 6.5 5.2" /><path d="M17 11.5a3 3 0 0 0 0-6M18.5 20c0-2.4-1-4-2.6-4.8" /></svg></button>
        <button class="tab act" aria-label="Play"><svg viewBox="0 0 24 24" fill="none" stroke="#FF5A1E" stroke-width="1.6"><path d="M9 2v20M15 2v20M2 9h20M2 15h20" /></svg></button>
        <button class="tab" aria-label="Ranks"><svg viewBox="0 0 24 24" fill="none" stroke={stroke} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10v6a5 5 0 0 1-10 0V3zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 14v4M8.5 21h7" /></svg></button>
        <button class="tab" aria-label="Clubs"><svg viewBox="0 0 24 24" fill="none" stroke={stroke} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3.5v5c0 4.3-3.4 8.2-8 9.5-4.6-1.3-8-5.2-8-9.5v-5L12 3z" /></svg></button>
      </div>
    </div>
  );
}
