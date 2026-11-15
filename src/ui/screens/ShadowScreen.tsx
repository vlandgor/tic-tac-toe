import { useState } from 'preact/hooks';
import { gateProgress } from '../../core/insight';
import { lossCount } from '../../core/profile';
import { pct, type Ratio } from '../../core/shadow/shadow';
import { isActive, rev, rules, screen, shadow, store } from '../../state/app';
import { coachLosses, resetShadow } from '../../state/flows';

function Trait({ k, r }: { k: string; r: Ratio }) {
  const v = pct(r);
  return (
    <div class="trait">
      <div class="top"><div class="k">{k}</div>
        <div class="v">{v === null ? <span style={{ color: 'var(--ink2)' }}>NO DATA</span> : v + '%'}</div></div>
      <div class="track"><div class="fill" style={{ width: (v ?? 0) + '%' }} /></div>
    </div>
  );
}

export function ShadowScreen() {
  rev.value;
  const r = rules.value, p = store.profile;
  const h = shadow.head(r), fid = shadow.fidelity(r.id), tempo = shadow.tempo();
  const active = isActive(r), gate = gateProgress(h), losses = lossCount(p);
  const [armed, setArmed] = useState(false);

  const reset = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
    setArmed(false);
    void resetShadow();
  };

  return (
    <div class="screen">
      <div class="abs center h-gate" style={{ color: active ? 'var(--orange)' : 'var(--ink)' }}>
        {active ? 'IN MATCHMAKING · PLAYING AS YOU' : `LOCKED · ${gate.moves} / ${gate.need} MOVES`}
      </div>
      <div class="abs center h-title">YOUR SHADOW</div>
      <div class="abs center h-fid">{fid === null ? '—' : fid + '%'}</div>
      <div class="abs center h-fidl lbl">STYLE FIDELITY · {r.name}</div>
      <div class="abs center h-note">CHOICE MOVES ONLY · FORCED MOVES EXCLUDED</div>
      <div class="abs h-traits">
        <Trait k="OPENS CENTER" r={h.traits.centerOpen} />
        <Trait k="PLAYS CORNERS" r={h.traits.corner} />
        <Trait k="BLOCKS THREATS" r={h.traits.block} />
        <Trait k="TAKES THE WIN" r={h.traits.finish} />
      </div>
      <div class="abs h-stats">
        <div class="st"><div class="v">{p.rating[r.id]}</div><div class="lbl2">RATING</div></div>
        <div class="st"><div class="v">{h.moves}</div><div class="lbl2">MOVES</div></div>
        <div class="st"><div class="v">{h.coached}</div><div class="lbl2">COACHED</div></div>
        <div class="st"><div class="v">{tempo ? tempo.toFixed(1) + 's' : '—'}</div><div class="lbl2">TEMPO</div></div>
      </div>
      {losses > 0 && (
        <button class="tbtn" style={{ top: '664px', color: 'var(--orange)', letterSpacing: '.16em' }} onClick={coachLosses}>
          COACH FROM LOSSES · {Math.min(losses, 4)}
        </button>
      )}
      <button class="tbtn" style={{ bottom: '118px' }} onClick={() => (screen.value = 'menu')}>BACK</button>
      <button class="tbtn" style={{ bottom: '64px', height: '44px', fontSize: '12px', color: armed ? 'var(--orange)' : 'var(--ink2)' }}
              onClick={reset}>{armed ? 'TAP AGAIN TO ERASE ALL MODES' : 'RESET SHADOW'}</button>
    </div>
  );
}
