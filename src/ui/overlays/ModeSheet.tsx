import { MODES } from '../../core/rules/modes';
import type { ModeId } from '../../core/rules/types';
import { mode, rev, screen, setMode, startSession } from '../../state/app';
import { closeOverlay } from '../../state/overlays';
import { Sheet } from '../components/Sheet';

function ModeRows({ current, onPick }: { current: ModeId | null; onPick: (id: ModeId) => void }) {
  return (
    <div class="sheet-rows">
      {MODES.map((m) => (
        <button key={m.id} class={'sheet-row' + (current === m.id ? ' on' : '')} onClick={() => onPick(m.id)}>
          <div>
            <div class="nm">{m.name}</div>
            <div class="bl">{m.blurb}</div>
          </div>
          {current === m.id && <div class="tick">●</div>}
        </button>
      ))}
    </div>
  );
}

/** Right-hand button on Play: choose the mode your ranked games use. */
export function ModeSheet() {
  rev.value;
  return (
    <Sheet title="SELECT MODE" sub="RANKED · YOUR SPIRIT LEARNS EACH MODE SEPARATELY">
      <ModeRows current={mode.value} onPick={(id) => { setMode(id); closeOverlay(); }} />
      <button class="sheet-more lbl2" onClick={() => { closeOverlay(); screen.value = 'modes'; }}>
        FULL MODE DETAILS ›
      </button>
    </Sheet>
  );
}

/** Left-hand button on Play: a one-off unrated game against your own spirit. */
export function CustomSheet() {
  rev.value;
  return (
    <Sheet title="CUSTOM GAME" sub="UNRATED · AGAINST YOUR OWN SPIRIT · NOTHING AT STAKE">
      <ModeRows current={null} onPick={(id) => { setMode(id); closeOverlay(); startSession('mirror'); }} />
    </Sheet>
  );
}
