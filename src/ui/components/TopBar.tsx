import { gateProgress } from '../../core/insight';
import { isActive, rev, rules, shadow, store } from '../../state/app';
import { overlay } from '../../state/overlays';
import { SpiritIcon } from './SpiritIcon';

/**
 * The personal bar shared by every tab screen: your spirit, your name, how far
 * it is from matchmaking, and settings. Mirrors the bottom nav — fixed height,
 * full-width hairline on the edge that faces the content.
 */
export function TopBar() {
  rev.value;
  const p = store.profile, r = rules.value;
  const active = isActive(r), gate = gateProgress(shadow.peek(r.id));

  return (
    <div class="topbar">
      <button class="av" aria-label="Change your spirit" onClick={() => (overlay.value = { kind: 'spirit' })}>
        <SpiritIcon id={p.spirit} size={32} color={active ? 'var(--orange)' : 'var(--blue)'} />
      </button>
      <div class="nm">{p.name}</div>
      <div class="st" style={active ? { color: 'var(--orange)' } : undefined}>
        {active ? `SPIRIT ACTIVE · ${r.name}` : `SPIRIT LOCKED · ${gate.moves}/${gate.need}`}
      </div>
      <button class="gear" aria-label="Settings" onClick={() => (overlay.value = { kind: 'dev' })}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.4">
          <circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
        </svg>
      </button>
    </div>
  );
}
