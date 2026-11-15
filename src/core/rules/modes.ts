import { cloneState, empties, encode29, freshState, lineWinner, placeSimple, writePlanes } from './board';
import { other, type ModeId, type RuleSet, type State, type Terminal } from './types';

const fullDraw = (s: State): Terminal =>
  s.cells.every(Boolean) ? { over: true, winner: null, line: null } : { over: false, winner: null, line: null };

export const Classic: RuleSet = {
  id: 'classic',
  name: 'CLASSIC',
  blurb: 'THREE IN A ROW WINS',
  encodeLen: 29,
  actions: 9,
  start: freshState,
  legal: empties,
  apply: placeSimple,
  encode: encode29,
  doomed: () => -1,
  terminal(s) {
    const w = lineWinner(s.cells);
    return w ? { over: true, winner: w.p, line: w.line, maker: w.p } : fullDraw(s);
  },
};

export const Reverse: RuleSet = {
  ...Classic,
  id: 'reverse',
  name: 'REVERSE',
  blurb: 'THREE IN A ROW LOSES',
  terminal(s) {
    const w = lineWinner(s.cells);
    return w ? { over: true, winner: other(w.p), line: w.line, maker: w.p } : fullDraw(s);
  },
};

export const VANISH_MAX_PLY = 40;

export const Vanish: RuleSet = {
  id: 'vanish',
  name: 'VANISH',
  blurb: '3 MARKS EACH · YOUR OLDEST FADES',
  encodeLen: 47,
  actions: 9,
  start: freshState,
  legal: empties,
  apply(s, i, p) {
    const n = cloneState(s);
    if (n.q[p].length >= 3) {
      const old = n.q[p].shift()!;
      n.cells[old] = null;
    }
    n.cells[i] = p;
    n.q[p].push(i);
    n.ply++;
    return n;
  },
  terminal(s) {
    const w = lineWinner(s.cells);
    if (w) return { over: true, winner: w.p, line: w.line, maker: w.p };
    return s.ply >= VANISH_MAX_PLY ? { over: true, winner: null, line: null } : { over: false, winner: null, line: null };
  },
  encode(s, me, t) {
    const v = new Float32Array(47);
    const opp = other(me);
    writePlanes(s, me, v);
    if (s.q[me].length >= 3) v[27 + s.q[me][0]] = 1; // my mark that fades next
    if (s.q[opp].length >= 3) v[36 + s.q[opp][0]] = 1; // theirs
    v[45] = t;
    v[46] = Math.min(1, s.ply / VANISH_MAX_PLY);
    return v;
  },
  doomed: (s, p) => (s.q[p].length >= 3 ? s.q[p][0] : -1),
};

export const MODES: readonly RuleSet[] = [Classic, Vanish, Reverse];

export const modeById = (id: string): RuleSet => MODES.find((m) => m.id === id) ?? Classic;
export const isModeId = (id: string): id is ModeId => MODES.some((m) => m.id === id);
