import { useEffect, useRef, useState } from 'preact/hooks';
import { other, type Player, type RuleSet, type State, type Terminal } from '../../core/rules/types';
import { commit, screen, shadow, store } from '../../state/app';
import { Board } from './Board';

/** Casual endless games vs your shadow on the menu. Inference only: never records, never trains. */
export function MiniBoard({ rules }: { rules: RuleSet }) {
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
    if (t.over) {
      setTerm(t);
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
    <Board rules={rules} s={s} cell={62} mark={34} overhang={6} left={117} top={272}
           lineColor="rgba(255,255,255,.32)" lineWidth={1} newIdx={last} terminal={term} fadeLosers onTap={tap} />
  );
}
