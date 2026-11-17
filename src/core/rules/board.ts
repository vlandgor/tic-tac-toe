import { other, type Cell, type Player, type State } from './types';

/* ------------------------------------------------------------------
   Board geometry for any N×N board with K-in-a-row. Cells are indexed
   row-major (i = row * n + col). Everything is computed once per (n, k)
   and cached, so the hot paths only ever read arrays.
   ------------------------------------------------------------------ */

export interface Geometry {
  n: number;
  k: number;
  /** n * n */
  size: number;
  /** every k-length line on the board */
  lines: readonly (readonly number[])[];
  /** lines through each cell — lets win checks look at one cell's lines only */
  linesAt: readonly (readonly (readonly number[])[])[];
  corners: readonly number[];
  edges: readonly number[];
  /** the single middle cell on odd boards (all our sizes are odd) */
  center: number;
  isCorner(i: number): boolean;
  isEdge(i: number): boolean;
  /** cells within one step, used to keep play local on big boards */
  neighbours: readonly (readonly number[])[];
}

const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
const cache = new Map<string, Geometry>();

export function geometry(n: number, k: number): Geometry {
  const key = n + ':' + k;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = n * n;
  const lines: number[][] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      for (const [dr, dc] of DIRS) {
        const er = r + dr * (k - 1), ec = c + dc * (k - 1);
        if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
        const line: number[] = [];
        for (let s = 0; s < k; s++) line.push((r + dr * s) * n + (c + dc * s));
        lines.push(line);
      }
    }
  }

  const linesAt: number[][][] = Array.from({ length: size }, () => []);
  for (const l of lines) for (const i of l) linesAt[i].push(l);

  const corners = [0, n - 1, size - n, size - 1];
  const edges: number[] = [];
  for (let i = 0; i < size; i++) {
    const r = (i / n) | 0, c = i % n;
    const onRim = r === 0 || c === 0 || r === n - 1 || c === n - 1;
    if (onRim && !corners.includes(i)) edges.push(i);
  }

  const neighbours: number[][] = Array.from({ length: size }, (_, i) => {
    const r = (i / n) | 0, c = i % n, out: number[] = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) out.push(rr * n + cc);
    }
    return out;
  });

  const cornerSet = new Set(corners), edgeSet = new Set(edges);
  const g: Geometry = {
    n, k, size, lines, linesAt, corners, edges,
    center: ((n - 1) / 2 | 0) * n + ((n - 1) / 2 | 0),
    isCorner: (i) => cornerSet.has(i),
    isEdge: (i) => edgeSet.has(i),
    neighbours,
  };
  cache.set(key, g);
  return g;
}

/** the 3x3 geometry, which regular play always uses */
export const G3 = geometry(3, 3);

/** win length by board size: 3 in a row on 3x3, 4 on 5x5, 5 on 7x7 */
export const winLength = (n: number): number => (n === 3 ? 3 : n === 5 ? 4 : 5);

/** a state knows its own board from the length of its cell array */
export const geomOf = (s: State, k?: number): Geometry => {
  const n = Math.round(Math.sqrt(s.cells.length));
  return geometry(n, k ?? winLength(n));
};

export function lineWinner(c: Cell[], g: Geometry): { p: Player; line: number[] } | null {
  for (const w of g.lines) {
    const a = c[w[0]];
    if (!a) continue;
    let all = true;
    for (let s = 1; s < w.length; s++) if (c[w[s]] !== a) { all = false; break; }
    if (all) return { p: a, line: [...w] };
  }
  return null;
}

export const freshState = (g: Geometry): State =>
  ({ cells: new Array<Cell>(g.size).fill(null), q: { X: [], O: [] }, ply: 0 });

export const cloneState = (s: State): State => ({
  cells: s.cells.slice(),
  q: { X: s.q.X.slice(), O: s.q.O.slice() },
  ply: s.ply,
});

export function empties(s: State): number[] {
  const r: number[] = [];
  for (let i = 0; i < s.cells.length; i++) if (!s.cells[i]) r.push(i);
  return r;
}

export function placeSimple(s: State, i: number, p: Player): State {
  const n = cloneState(s);
  n.cells[i] = p;
  n.q[p].push(i);
  n.ply++;
  return n;
}

/** writes mine / theirs / empty planes (3 * size values) from `me`'s point of view */
export function writePlanes(s: State, me: Player, v: Float32Array): void {
  const opp = other(me), size = s.cells.length;
  for (let i = 0; i < size; i++) {
    const c = s.cells[i];
    if (c === me) v[i] = 1;
    else if (c === opp) v[size + i] = 1;
    else v[size * 2 + i] = 1;
  }
}

/** plain encoder: three planes, then time-left and how far through the board we are */
export function encodePlain(s: State, me: Player, t: number): Float32Array {
  const size = s.cells.length;
  const v = new Float32Array(size * 3 + 2);
  writePlanes(s, me, v);
  v[size * 3] = t;
  v[size * 3 + 1] = s.ply / size;
  return v;
}

export const stateKey = (s: State): string =>
  s.cells.map((c) => c || '-').join('') + '|' + s.q.X.join(',') + '|' + s.q.O.join(',');
