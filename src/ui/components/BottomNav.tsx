import type { JSX } from 'preact';
import { rev, screen, store, type Screen } from '../../state/app';
import { spiritArt } from './SpiritIcon';

const ink = 'rgba(255,255,255,.42)', hot = '#FF5A1E';
const svg = (c: string, children: JSX.Element) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={c} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{children}</svg>
);

const TABS: { id: Screen; label: string; icon: (c: string) => JSX.Element }[] = [
  { id: 'modes', label: 'MODES', icon: (c) => svg(c, <><rect x="4" y="4" width="6.5" height="6.5" /><rect x="13.5" y="4" width="6.5" height="6.5" /><rect x="4" y="13.5" width="6.5" height="6.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" /></>) },
  { id: 'events', label: 'EVENTS', icon: (c) => svg(c, <><rect x="3.5" y="5" width="17" height="15" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M12 12.6l1.1 2.2 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3z" /></>) },
  { id: 'menu', label: 'PLAY', icon: (c) => svg(c, <path d="M9 2v20M15 2v20M2 9h20M2 15h20" />) },
  { id: 'shadow', label: 'SPIRIT', icon: (c) => svg(c, spiritArt(store.profile.spirit, c)) },
  { id: 'ranks', label: 'RANKS', icon: (c) => svg(c, <path d="M4 20V13h4.5v7M9.75 20V8h4.5v12M15.5 20v-9.5H20V20M3 20h18" />) },
];

export function BottomNav() {
  const cur = screen.value;
  rev.value; // re-render when the player changes their spirit
  return (
    <div class="nav">
      {TABS.map((t) => {
        const act = cur === t.id;
        return (
          <button key={t.id} class={'tab' + (act ? ' act' : '')} aria-label={t.label} onClick={() => (screen.value = t.id)}>
            {t.icon(act ? hot : ink)}
            <span class="tl" style={{ color: act ? hot : ink }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
