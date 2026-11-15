import { other, type Cell, type Player, type State } from './types';

export const LINES: readonly (readonly number[])[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function lineWinner(c: Cell[]): { p: Player; line: number[] } | null {
  for (const w of LINES) {
    const a = c[w[0]];
    if (a && a === c[w[1]] && a === c[w[2]]) return { p: a, line: [...w] };
  }
  return null;
}

export const freshState = (): State => ({ cells: new Array<Cell>(9).fill(null), q: { X: [], O: [] }, ply: 0 });

export const cloneState = (s: State): State => ({
  cells: s.cells.slice(),
  q: { X: s.q.X.slice(), O: s.q.O.slice() },
  ply: s.ply,
});

export function empties(s: State): number[] {
  const r: number[] = [];
  for (let i = 0; i < 9; i++) if (!s.cells[i]) r.push(i);
  return r;
}

export function placeSimple(s: State, i: number, p: Player): State {
  const n = cloneState(s);
  n.cells[i] = p;
  n.q[p].push(i);
  n.ply++;
  return n;
}

/** writes mine / theirs / empty planes (27 values) from `me`'s point of view */
export function writePlanes(s: State, me: Player, v: Float32Array): void {
  const opp = other(me);
  for (let i = 0; i < 9; i++) {
    const c = s.cells[i];
    if (c === me) v[i] = 1;
    else if (c === opp) v[9 + i] = 1;
    else v[18 + i] = 1;
  }
}

export function encode29(s: State, me: Player, t: number): Float32Array {
  const v = new Float32Array(29);
  writePlanes(s, me, v);
  v[27] = t;
  v[28] = s.ply / 9;
  return v;
}

export const stateKey = (s: State): string =>
  s.cells.map((c) => c || '-').join('') + '|' + s.q.X.join(',') + '|' + s.q.O.join(',');

export const isCorner = (i: number) => i === 0 || i === 2 || i === 6 || i === 8;
export const isEdge = (i: number) => i === 1 || i === 3 || i === 5 || i === 7;
