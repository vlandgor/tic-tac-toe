import { lossCount, type AwayResult } from '../../core/profile';
import { modeById } from '../../core/rules/modes';
import { store } from '../../state/app';
import { coachLosses } from '../../state/flows';
import { closeOverlay } from '../../state/overlays';
import { COLORS } from '../components/Glyph';

const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
const resColor = (r: AwayResult['res']) => (r === 'W' ? COLORS.X : r === 'L' ? COLORS.O : '#fff');

/** your shadow played as you — here's what it did to your rating */
export function Away({ results }: { results: AwayResult[] }) {
  const p = store.profile;
  const total = results.reduce((a, r) => a + r.delta, 0);
  const w = results.filter((r) => r.res === 'W').length, l = results.filter((r) => r.res === 'L').length;
  const modes = [...new Set(results.map((r) => r.mode))];
  const losses = lossCount(p);

  return (
    <div class="ov" style={{ zIndex: 42 }}>
      <div class="abs center a-title">WHILE YOU WERE AWAY</div>
      <div class="abs center a-sub">YOUR SHADOW PLAYED {results.length} MATCH{results.length > 1 ? 'ES' : ''}&nbsp;&nbsp;·&nbsp;&nbsp;{w}W {l}L</div>
      <div class="abs center a-delta" style={{ color: total > 0 ? COLORS.X : total < 0 ? COLORS.O : '#fff' }}>{signed(total)}</div>
      <div class="abs center a-rating lbl">{modes.map((id) => `${modeById(id).name} ${p.rating[id]}`).join('   ·   ')}</div>
      <div class="abs rows" style={{ top: '340px' }}>
        {results.slice(0, 6).map((r, i) => (
          <div class="arow" key={i}>
            <div class="m">{modeById(r.mode).name}</div>
            <div style={{ color: resColor(r.res) }}>{r.res} {r.score}</div>
            <div>{r.rival}</div>
            <div class="d" style={{ color: resColor(r.res) }}>{signed(r.delta)}</div>
          </div>
        ))}
      </div>
      <div class="acts small" style={{ top: '716px' }}>
        {losses ? <>
          <button class="primary" onClick={() => { closeOverlay(); void coachLosses(); }}>COACH LOSSES · {Math.min(losses, 4)}</button>
          <div class="sep" />
          <button onClick={closeOverlay}>LATER</button>
        </> : <button class="primary" onClick={closeOverlay}>CONTINUE</button>}
      </div>
    </div>
  );
}
