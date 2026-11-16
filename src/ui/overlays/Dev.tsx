import { useState } from 'preact/hooks';
import { commit, rev, store } from '../../state/app';
import { resetRatings, resetShadow, simulateNow } from '../../state/flows';
import { closeOverlay } from '../../state/overlays';

export function Dev() {
  rev.value;
  const p = store.profile;
  const [msg, setMsg] = useState('');
  const [armed, setArmed] = useState(false);
  return (
    <div class="ov" style={{ zIndex: 55 }}>
      <div class="abs center lbl" style={{ top: '180px', fontSize: '16px', letterSpacing: '.28em' }}>DEVELOPER</div>
      <div class="abs d-list">
        <button onClick={() => { if (!simulateNow(5)) setMsg('NO SHADOW IS ACTIVE YET. PLAY MORE, OR TURN ON IGNORE SHADOW GATE.'); }}>
          SIMULATE 5 AWAY MATCHES
        </button>
        <button onClick={() => { p.ignoreGate = !p.ignoreGate; commit(); }}>
          IGNORE SHADOW GATE: {p.ignoreGate ? 'ON' : 'OFF'}
        </button>
        <button onClick={() => { resetRatings(); setMsg('RATINGS AND RIVAL POOL RESET'); }}>RESET RATINGS</button>
        <button style={armed ? { color: 'var(--orange)' } : undefined} onClick={() => {
          if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
          setArmed(false); void resetShadow(); setMsg('SHADOW ERASED IN ALL MODES');
        }}>{armed ? 'TAP AGAIN TO ERASE YOUR SHADOW' : 'RESET SHADOW (ALL MODES)'}</button>
      </div>
      <div class="abs d-msg">{msg}</div>
      <button class="tbtn" style={{ bottom: '110px' }} onClick={closeOverlay}>CLOSE</button>
    </div>
  );
}
