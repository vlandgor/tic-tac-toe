import { useEffect, useRef, useState } from 'preact/hooks';
import { other, type Player, type RuleSet, type State, type Terminal } from '../../core/rules/types';
import { commit, screen, shadow, store } from '../../state/app';
import { Board } from './Board';
import { COLORS } from './Glyph';
import { feel } from '../feel';

/**
 * Casual endless games vs your spirit on the menu. Inference only: never records, never trains.
 * The spirit always opens, playing X or O at random; you take the other symbol. Colour follows
 * the player, not the symbol — orange is always you, blue is always your spirit.
 */
export function MiniBoard({ rules, top = 212, cell = 62 }: { rules: RuleSet; top?: number; cell?: number }) {
  const [s, setS] = useState<State>(() => rules.start());
  const [turn, setTurn] = useState<Player>('X');
  const [term, setTerm] = useState<Terminal | null>(null);
  const [last, setLast] = useState(-1);
  const [spiritP, setSpiritP] = useState<Player>('X');
  const me = other(spiritP);
  // the current game's spirit symbol, readable from timeouts
  const spiritRef = useRef<Player>(spiritP); spiritRef.current = spiritP;
  const alive = useRef(true);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const newGame = () => {
    const sp: Player = Math.random() < 0.5 ? 'X' : 'O';
    setSpiritP(sp);
    setS(rules.start()); setTurn(sp); setTerm(null); setLast(-1); // the spirit moves first
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
      const sp = spiritRef.current;
      setTimeout(() => (!t.winner ? feel.draw(true) : t.winner === sp ? feel.lose(true) : feel.win(true)), 150);
      const sc = store.profile.mini;
      if (!t.winner) sc.d++; else if (t.winner === spiritRef.current) sc.l++; else sc.w++;
      commit();
      later(() => alive.current && newGame(), 1300);
    } else setTurn(other(p));
  };

  // the spirit's move — waits while the menu isn't visible. Its timer belongs to this exact
  // position: if the game resets or moves on first, the pending move is cancelled, never replayed.
  useEffect(() => {
    if (turn !== spiritP || term) return;
    let t = 0;
    const go = () => {
      if (!alive.current) return;
      if (screen.value !== 'menu') { t = window.setTimeout(go, 400); return; }
      const mv = shadow.sample(rules, s, spiritP, 1, 0.8);
      if (mv >= 0) place(s, mv, spiritP);
    };
    t = window.setTimeout(go, 380 + Math.random() * 420);
    return () => clearTimeout(t);
  }, [turn, term, s, spiritP]);

  const tap = (i: number) => { if (!term && turn === me && !s.cells[i]) place(s, i, me); };
  const tint = { [me]: COLORS.X, [spiritP]: COLORS.O } as Record<Player, string>;

  return (
    <Board rules={rules} s={s} cell={cell} mark={cell * 0.55} overhang={cell * 0.1} left={210 - (cell * 3) / 2} top={top}
           lineColor="rgba(255,255,255,.32)" lineWidth={1} newIdx={last} terminal={term} fadeLosers onTap={tap} tint={tint} />
  );
}
