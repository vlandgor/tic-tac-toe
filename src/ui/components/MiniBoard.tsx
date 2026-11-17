import { useEffect, useRef, useState } from 'preact/hooks';
import { other, type Player, type RuleSet, type State, type Terminal } from '../../core/rules/types';
import { commit, screen, shadow, store } from '../../state/app';
import { Board } from './Board';
import { feel } from '../feel';

/** Casual endless games vs your spirit on the menu. Inference only: never records, never trains. */
export function MiniBoard({ rules, top = 212, cell = 62 }: { rules: RuleSet; top?: number; cell?: number }) {
  const [s, setS] = useState<State>(() => rules.start());
  const [turn, setTurn] = useState<Player>('X');
  const [term, setTerm] = useState<Terminal | null>(null);
  const [last, setLast] = useState(-1);
  const starter = useRef<Player>('O');
  const alive = useRef(true);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const newGame = () => {
    starter.current = other(starter.current);
    setS(rules.start()); setTurn(starter.current); setTerm(null); setLast(-1);
  };

  useEffect(() => {
    alive.current = true;
    newGame();
    return () => { alive.current = false; timers.current.forEach(clearTimeout); timers.current = []; };
  }, [rules.id]);

  const place = (cur: State, i: number, p: Player) => {
    const n = rules.apply(cur, i, p);
    const t = rules.terminal(n);
    setS(n); setLast(i);
    feel.place(p, true);
    if (t.over) {
      setTerm(t);
      setTimeout(() => (t.winner === 'X' ? feel.win(true) : t.winner === 'O' ? feel.lose(true) : feel.draw(true)), 150);
      const sc = store.profile.mini;
      if (t.winner === 'X') sc.w++; else if (t.winner === 'O') sc.l++; else sc.d++;
      commit();
      later(() => alive.current && newGame(), 1300);
    } else setTurn(other(p));
  };

  // shadow's move — waits while the menu isn't visible
  useEffect(() => {
    if (turn !== 'O' || term) return;
    const go = () => {
      if (!alive.current) return;
      if (screen.value !== 'menu') return later(go, 400);
      const mv = shadow.sample(rules, s, 'O', 1, 0.8);
      if (mv >= 0) place(s, mv, 'O');
    };
    later(go, 380 + Math.random() * 420);
  }, [turn, term, s]);

  const tap = (i: number) => { if (!term && turn === 'X' && !s.cells[i]) place(s, i, 'X'); };

  return (
    <Board rules={rules} s={s} cell={cell} mark={cell * 0.55} overhang={cell * 0.1} left={210 - (cell * 3) / 2} top={top}
           lineColor="rgba(255,255,255,.32)" lineWidth={1} newIdx={last} terminal={term} fadeLosers onTap={tap} />
  );
}
