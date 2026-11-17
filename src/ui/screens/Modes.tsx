import { MODES, Classic, Reverse, Vanish } from '../../core/rules/modes';
import { AWAKE_STAGE, spiritStage } from '../../core/insight';
import type { ModeId, Player, RuleSet, State } from '../../core/rules/types';
import { isActive, mode, rev, screen, setMode, shadow, store } from '../../state/app';
import { Board } from '../components/Board';
import { Scroll } from '../components/Scroll';

/** card layout: first card's top, card height, distance between card tops */
const CARD_TOP = 120, CARD_H = 180, CARD_STEP = 196;

/** a tiny frozen board that shows each rule at a glance */
function demo(rules: RuleSet, moves: [number, Player][]): State {
  let s = rules.start();
  for (const [i, p] of moves) s = rules.apply(s, i, p);
  return s;
}
const DEMOS: Partial<Record<ModeId, State>> = {
  classic: demo(Classic, [[0, 'X'], [2, 'O'], [4, 'X'], [6, 'O'], [8, 'X']]),
  vanish: demo(Vanish, [[2, 'X'], [0, 'O'], [4, 'X'], [8, 'O'], [7, 'X'], [6, 'O']]),
  reverse: demo(Reverse, [[4, 'X'], [0, 'O'], [8, 'X'], [1, 'O'], [6, 'X'], [2, 'O']]),
};

export function Modes() {
  rev.value;
  const p = store.profile;
  return (
    <div class="screen">
      <Scroll height={CARD_TOP + MODES.length * CARD_STEP - (CARD_STEP - CARD_H) + 24}>
      <div class="abs center p-sub lbl2">YOUR SPIRIT LEARNS EACH ONE SEPARATELY</div>

      {MODES.map((r, idx) => {
        const h = shadow.peek(r.id), fid = shadow.fidelity(r.id), st = spiritStage(h), act = isActive(r);
        const s = DEMOS[r.id] ?? r.start(), t = r.terminal(s);
        return (
          <button key={r.id} class={'card stg' + (mode.value === r.id ? ' sel' : '')}
                  style={{ top: CARD_TOP + idx * CARD_STEP + 'px', height: CARD_H + 'px', '--i': idx } as any}
                  onClick={() => { setMode(r.id); screen.value = 'menu'; }}>
            <div class="ct">{r.name}</div>
            <div class="cs" style={{ width: '220px', lineHeight: '18px' }}>{r.blurb}</div>
            {mode.value === r.id && <div class="cs" style={{ top: '98px', color: 'var(--orange)' }}>SELECTED</div>}
            <Board rules={r} s={s} cell={30} mark={20} overhang={3} left={252} top={18}
                   lineColor="rgba(255,255,255,.3)" lineWidth={1} terminal={t.over ? t : null} showWinLine />
            <div class="stats3">
              <div><div class="v">{p.rating[r.id]}</div><div class="lbl2">RATING</div></div>
              <div><div class="v stage-v" style={{ color: act || st.idx >= AWAKE_STAGE ? 'var(--orange)' : '#fff' }}>{st.name}</div><div class="lbl2">SPIRIT</div></div>
              <div><div class="v">{fid === null ? '—' : fid + '%'}</div><div class="lbl2">FIDELITY</div></div>
            </div>
          </button>
        );
      })}
      </Scroll>
    </div>
  );
}
