import { SPIRITS, spiritDef } from '../../core/spirits';
import { commit, rev, store } from '../../state/app';
import { closeOverlay } from '../../state/overlays';
import { Sheet } from '../components/Sheet';
import { SpiritIcon } from '../components/SpiritIcon';
import { COLORS } from '../components/Glyph';

/** Change the animal that represents your spirit. Cosmetic — the model is untouched. */
export function SpiritSheet() {
  rev.value;
  const p = store.profile;
  const pick = (id: typeof p.spirit) => { p.spirit = id; commit(); closeOverlay(); };

  return (
    <Sheet title="YOUR SPIRIT" sub={spiritDef(p.spirit).trait + ' · THE MODEL IS UNCHANGED'}>
      <div class="sp-grid-sheet">
        {SPIRITS.map((s) => (
          <button key={s.id} class={'sp-cell' + (p.spirit === s.id ? ' on' : '')} onClick={() => pick(s.id)}>
            <SpiritIcon id={s.id} size={34} color={p.spirit === s.id ? COLORS.X : 'rgba(255,255,255,.55)'} />
            <span style={{ color: p.spirit === s.id ? COLORS.X : 'rgba(255,255,255,.45)' }}>{s.name}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
