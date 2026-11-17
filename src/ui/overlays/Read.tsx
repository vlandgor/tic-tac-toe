import { useState } from 'preact/hooks';
import { READ_ROUND, readVerdict, type ReadItem } from '../../core/reads';
import type { RuleSet } from '../../core/rules/types';
import { store } from '../../state/app';
import { Board } from '../components/Board';
import { COLORS } from '../components/Glyph';
import { SpiritIcon } from '../components/SpiritIcon';
import { feel } from '../feel';
import { CountUp } from '../feel/motion';

/** recent scores as a row of bars; the newest can be highlighted */
export function ReadHistory({ list, width = 200, height = 36, highlightLast = false }:
  { list: number[]; width?: number; height?: number; highlightLast?: boolean }) {
  if (!list.length) return null;
  const gap = 4, w = Math.min(18, (width - gap * (list.length - 1)) / list.length);
  return (
    <div class="rh" style={{ width: width + 'px', height: height + 'px' }}>
      {list.map((v, i) => {
        const last = highlightLast && i === list.length - 1;
        return (
          <i key={i} style={{ width: w + 'px', height: Math.max(2, (v / READ_ROUND) * height) + 'px',
                               background: last ? COLORS.O : 'rgba(46, 155, 255, .35)' }} />
        );
      })}
    </div>
  );
}

/**
 * "Can it read you?" — five positions. For each, the spirit's guess is
 * already sealed; you play your move and it is revealed. Your answers are
 * returned so they can teach it afterwards.
 */
export function Read({ rules, items, resolve }: { rules: RuleSet; items: ReadItem[]; resolve: (a: number[]) => void }) {
  const [k, setK] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => items.map(() => -1));
  const [done, setDone] = useState(false);
  const p = store.profile;
  const it = items[k], answer = answers[k];
  const hits = answers.filter((a, i) => a >= 0 && a === items[i].guess).length;

  const tap = (i: number) => {
    if (done || answer >= 0 || it.s.cells[i]) return;
    const next = answers.slice(); next[k] = i;
    setAnswers(next);
    feel.place('X');
    const hit = i === it.guess;
    setTimeout(() => (hit ? feel.predicted() : feel.miss()), 140);
    setTimeout(() => {
      if (k + 1 < items.length) setK(k + 1);
      else {
        setDone(true);
        const final = next.filter((a, j) => a === items[j].guess).length;
        setTimeout(() => (final >= 4 ? feel.win(true) : feel.draw(true)), 300);
      }
    }, 1300);
  };

  /* ---------------- the result ---------------- */
  if (done) {
    const past = p.reads[rules.id] ?? [];
    const prev = past.length ? past[past.length - 1] : null;
    const cmp = prev === null ? 'YOUR FIRST READING'
      : hits > prev ? 'IT READS YOU BETTER THAN LAST TIME'
      : hits === prev ? 'SAME AS LAST TIME'
      : 'YOU SURPRISED IT MORE THAN LAST TIME';
    return (
      <div class="ov" style={{ zIndex: 45 }}>
        <div class="abs center c-top">CAN IT READ YOU?</div>
        <div class="abs" style={{ left: '186px', top: '160px' }}><SpiritIcon id={p.spirit} size={48} color={COLORS.O} /></div>
        <div class="abs center rd-score pop"><CountUp to={hits} ms={700} /><span> / {items.length}</span></div>
        <div class="abs center rd-verdict">{readVerdict(hits, items.length)}</div>
        <div class="abs center lbl2" style={{ top: '400px', fontSize: '11px', color: prev !== null && hits > prev ? COLORS.X : undefined }}>{cmp}</div>
        <div class="abs" style={{ left: '110px', top: '446px' }}>
          <ReadHistory list={[...past, hits].slice(-8)} width={200} height={44} highlightLast />
        </div>
        <div class="abs center lbl2" style={{ top: '512px', fontSize: '10px' }}>RECENT READINGS · {rules.name}</div>
        <div class="abs c-why" style={{ top: '600px' }}>YOUR ANSWERS TEACH IT<br />IT TRAINS ON THEM NEXT</div>
        <button class="abs ob-btn" onClick={() => resolve(answers)}><span>CONTINUE</span></button>
      </div>
    );
  }

  /* ---------------- a position ---------------- */
  const hit = answer >= 0 && answer === it.guess;
  const shown = answer >= 0 ? rules.apply(it.s, answer, 'X') : it.s;
  const fb = answer < 0 ? 'ITS GUESS IS SEALED · YOUR MOVE' : hit ? 'IT SAW THAT COMING' : 'IT EXPECTED THIS';

  return (
    <div class="ov" style={{ zIndex: 45 }}>
      <div class="abs center c-top">CAN IT READ YOU?</div>
      <div class="abs center c-q">WHAT WOULD YOU PLAY?</div>
      <div class="abs rd-pips">
        {items.map((x, i) => {
          const a = answers[i], read = a >= 0 && a === x.guess;
          const cls = a < 0 ? (i === k ? 'cur' : '') : read ? 'hit' : 'miss';
          return <i key={i} class={cls} />;
        })}
      </div>
      <Board key={k} rules={rules} s={shown} cell={90} mark={52} overhang={7}
             left={75} top={262} newIdx={answer} onTap={tap}
             decorate={(i) => (answer >= 0 && i === it.guess ? <i class={'guess' + (hit ? ' hit' : '')} /> : null)} />
      <div class="abs center c-fb swap" key={answer + '-' + k} style={{ color: answer < 0 ? 'var(--ink)' : hit ? COLORS.O : '#fff' }}>{fb}</div>
      <div class="abs c-why">
        {rules.name}&nbsp;&nbsp;·&nbsp;&nbsp;{k + 1} / {items.length}
        <br />YOU ARE ORANGE · BLUE MARKS ITS GUESS
      </div>
      <button class="tbtn" style={{ bottom: '110px', fontSize: '14px' }} onClick={() => resolve(answers)}>STOP</button>
    </div>
  );
}
