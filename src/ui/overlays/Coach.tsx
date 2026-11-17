import { useState } from 'preact/hooks';
import type { CoachItem } from '../../core/shadow/coach';
import type { RuleSet } from '../../core/rules/types';
import { shadow } from '../../state/app';
import type { CoachResult } from '../../state/overlays';
import { Board } from '../components/Board';
import { COLORS } from '../components/Glyph';
import { feel } from '../feel';

/** One tap per position. Answers are labelled training data, weighted higher. */
export function Coach({ items, resolve }: { items: CoachItem[]; resolve: (r: CoachResult) => void }) {
  const [k, setK] = useState(0);
  const [answer, setAnswer] = useState(-1);
  const [answered, setAnswered] = useState(0);
  const [touched] = useState(() => new Map<string, RuleSet>());
  const it = items[k];

  const finish = (n = answered) => resolve({ answered: n, touched: [...touched.values()] });

  const tap = (i: number) => {
    if (answer >= 0 || it.s.cells[i]) return;
    shadow.coach(it.rules, it.s, i);
    it.onAnswer?.();
    touched.set(it.rules.id, it.rules);
    const n = answered + 1;
    setAnswered(n);
    setAnswer(i);
    feel.place('X');
    setTimeout(() => (i === it.ref ? feel.predicted() : feel.miss()), 140);
    setTimeout(() => {
      if (k + 1 < items.length) { setK(k + 1); setAnswer(-1); } else finish(n);
    }, 1300);
  };

  const same = answer === it.ref;
  const shown = answer >= 0 ? it.rules.apply(it.s, answer, 'X') : it.s;
  const fb = answer < 0 ? '' : it.kind === 'loss'
    ? (same ? 'SAME MOVE AS YOUR SPIRIT' : 'YOUR SPIRIT PLAYED HERE')
    : (same ? 'YOUR SPIRIT GUESSED IT' : 'YOUR SPIRIT EXPECTED THIS');
  const fbColor = same ? (it.kind === 'loss' ? '#fff' : COLORS.X) : COLORS.O;

  return (
    <div class="ov" style={{ zIndex: 45 }}>
      <div class="abs center c-top">{it.kind === 'loss' ? 'YOUR SPIRIT LOST FROM HERE' : it.kind === 'daily' ? 'DAILY PUZZLE' : 'COACH YOUR SPIRIT'}</div>
      <div class="abs center c-q">WHAT WOULD YOU PLAY?</div>
      <div class="abs center c-count lbl2">{it.rules.name}&nbsp;&nbsp;·&nbsp;&nbsp;{k + 1} / {items.length}</div>
      <Board key={k} rules={it.rules} s={shown} cell={90} mark={52} overhang={7}
             left={75} top={262} newIdx={answer} onTap={tap}
             decorate={(i) => (answer >= 0 && !same && i === it.ref ? <i class="guess" /> : null)} />
      <div class="abs center c-fb swap" key={answer + '-' + k} style={{ color: fbColor }}>{fb}</div>
      <div class="abs c-why">
        {it.kind === 'loss' ? 'IT WAS PLAYING AS YOU AND LOST THE ROUND'
          : it.kind === 'daily' ? 'ONE POSITION A DAY · IT TRAINS YOUR SPIRIT'
          : 'YOUR SPIRIT IS UNSURE ABOUT YOU HERE'}
        <br />YOU ARE ORANGE · YOUR MOVE
      </div>
      <button class="tbtn" style={{ bottom: '110px', fontSize: '14px' }} onClick={() => finish()}>SKIP</button>
    </div>
  );
}
