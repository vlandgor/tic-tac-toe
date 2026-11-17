import {
  cloneState, empties, encodePlain, freshState, geometry, lineWinner, placeSimple, winLength, writePlanes,
} from './board';
import { other, type ModeId, type RuleSet, type State, type Terminal } from './types';

const suffix = (n: number) => (n === 3 ? '' : String(n));
const sizeTag = (n: number) => (n === 3 ? '' : ` ${n}×${n}`);

const fullDraw = (s: State): Terminal =>
  s.cells.every(Boolean) ? { over: true, winner: null, line: null } : { over: false, winner: null, line: null };

/** Vanish needs a move cap, since marks keep disappearing. It grows with the board. */
export const vanishMaxPly = (n: number): number => (n === 3 ? 40 : n * n * 2);

function makeClassic(n: number): RuleSet {
  const k = winLength(n), g = geometry(n, k);
  return {
    id: ('classic' + suffix(n)) as ModeId,
    variant: 'classic',
    name: 'CLASSIC' + sizeTag(n),
    blurb: `${k} IN A ROW WINS`,
    n, k,
    encodeLen: g.size * 3 + 2,
    actions: g.size,
    start: () => freshState(g),
    legal: empties,
    apply: placeSimple,
    encode: encodePlain,
    doomed: () => -1,
    terminal(s) {
      const w = lineWinner(s.cells, g);
      return w ? { over: true, winner: w.p, line: w.line, maker: w.p } : fullDraw(s);
    },
  };
}

function makeReverse(n: number): RuleSet {
  const base = makeClassic(n), k = base.k, g = geometry(n, k);
  return {
    ...base,
    id: ('reverse' + suffix(n)) as ModeId,
    variant: 'reverse',
    name: 'REVERSE' + sizeTag(n),
    blurb: `${k} IN A ROW LOSES`,
    terminal(s) {
      const w = lineWinner(s.cells, g);
      return w ? { over: true, winner: other(w.p), line: w.line, maker: w.p } : fullDraw(s);
    },
  };
}

function makeVanish(n: number): RuleSet {
  const k = winLength(n), g = geometry(n, k), size = g.size, cap = vanishMaxPly(n);
  // each player keeps as many marks as the win length, so a line is always just reachable
  const keep = k;
  return {
    id: ('vanish' + suffix(n)) as ModeId,
    variant: 'vanish',
    name: 'VANISH' + sizeTag(n),
    blurb: `${keep} MARKS EACH · YOUR OLDEST FADES`,
    n, k,
    encodeLen: size * 5 + 2,
    actions: size,
    start: () => freshState(g),
    legal: empties,
    apply(s, i, p) {
      const st = cloneState(s);
      if (st.q[p].length >= keep) {
        const old = st.q[p].shift()!;
        st.cells[old] = null;
      }
      st.cells[i] = p;
      st.q[p].push(i);
      st.ply++;
      return st;
    },
    terminal(s) {
      const w = lineWinner(s.cells, g);
      if (w) return { over: true, winner: w.p, line: w.line, maker: w.p };
      return s.ply >= cap ? { over: true, winner: null, line: null } : { over: false, winner: null, line: null };
    },
    encode(s, me, t) {
      const v = new Float32Array(size * 5 + 2);
      const opp = other(me);
      writePlanes(s, me, v);
      // which mark fades next, for each side — the thing you plan around
      if (s.q[me].length >= keep) v[size * 3 + s.q[me][0]] = 1;
      if (s.q[opp].length >= keep) v[size * 4 + s.q[opp][0]] = 1;
      v[size * 5] = t;
      v[size * 5 + 1] = Math.min(1, s.ply / cap);
      return v;
    },
    doomed: (s, p) => (s.q[p].length >= keep ? s.q[p][0] : -1),
  };
}

const build = (n: number): RuleSet[] => [makeClassic(n), makeVanish(n), makeReverse(n)];

/** Regular play: 3x3 only. Ratings, spirit heads, ranks and away matches all live here. */
export const MODES: readonly RuleSet[] = build(3);

/** The bigger boards, used only by the weekly Board Challenge. */
export const EVENT_BOARDS: readonly RuleSet[] = [...build(5), ...build(7)];

/** Every ruleset the engine can play. */
export const ALL_MODES: readonly RuleSet[] = [...MODES, ...EVENT_BOARDS];

export const [Classic, Vanish, Reverse] = MODES;

export const modeById = (id: string): RuleSet => ALL_MODES.find((m) => m.id === id) ?? Classic;
export const isModeId = (id: string): id is ModeId => ALL_MODES.some((m) => m.id === id);
/** a save left on a big board comes back to the same variant on 3x3 */
export const toRegular = (id: string): ModeId => (MODES.find((m) => m.variant === modeById(id).variant) ?? Classic).id;
