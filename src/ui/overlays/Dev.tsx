import { useState } from 'preact/hooks';
import { commit, rev, screen, store } from '../../state/app';
import { resetRatings, resetShadow, simulateNow } from '../../state/flows';
import { closeOverlay } from '../../state/overlays';
import { feel } from '../feel';

/** Settings (sound, vibration) + developer tools. */
export function Dev() {
  rev.value;
  const p = store.profile;
  const [msg, setMsg] = useState('');
  const [armed, setArmed] = useState(false);
  const toggle = (k: 'sound' | 'haptics') => {
    p.settings = { ...p.settings, [k]: !p.settings[k] };
    commit();
    if (k === 'sound' && p.settings.sound) feel.place('X');
    if (k === 'haptics' && p.settings.haptics) { try { navigator.vibrate?.(20); } catch { /* ignore */ } }
  };
  const onOff = (v: boolean) => <span style={{ color: v ? 'var(--orange)' : 'var(--ink2)' }}>{v ? 'ON' : 'OFF'}</span>;

  return (
    <div class="ov" style={{ zIndex: 55 }}>
      <div class="abs center lbl" style={{ top: '110px', fontSize: '16px', letterSpacing: '.28em' }}>SETTINGS</div>
      <div class="abs d-list" style={{ top: '160px' }}>
        <button class="d-row" onClick={() => toggle('sound')}><span>SOUND</span>{onOff(p.settings.sound)}</button>
        <button class="d-row" onClick={() => toggle('haptics')}><span>VIBRATION</span>{onOff(p.settings.haptics)}</button>
      </div>

      <div class="abs lbl2" style={{ left: '36px', top: '308px', fontSize: '11px' }}>DEVELOPER</div>
      <div class="abs d-list" style={{ top: '330px' }}>
        <button onClick={() => { if (!simulateNow(5)) setMsg('NO SHADOW IS ACTIVE YET. PLAY MORE, OR TURN ON IGNORE SHADOW GATE.'); }}>
          SIMULATE 5 AWAY MATCHES
        </button>
        <button class="d-row" onClick={() => { p.ignoreGate = !p.ignoreGate; commit(); }}>
          <span>IGNORE SHADOW GATE</span>{onOff(p.ignoreGate)}
        </button>
        <button onClick={() => { resetRatings(); setMsg('RATINGS AND RIVAL POOL RESET'); }}>RESET RATINGS</button>
        <button onClick={() => { closeOverlay(); screen.value = 'onboarding'; }}>REPLAY ONBOARDING</button>
        <button style={armed ? { color: 'var(--orange)' } : undefined} onClick={() => {
          if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
          setArmed(false); void resetShadow(); setMsg('SHADOW ERASED IN ALL MODES');
        }}>{armed ? 'TAP AGAIN TO ERASE YOUR SHADOW' : 'RESET SHADOW (ALL MODES)'}</button>
      </div>
      <div class="abs d-msg" style={{ top: '650px' }}>{msg}</div>
      <button class="tbtn" style={{ bottom: '96px' }} onClick={closeOverlay}>CLOSE</button>
    </div>
  );
}
