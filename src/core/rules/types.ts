export type Player = 'X' | 'O';
export type Cell = Player | null;
export type ModeId = 'classic' | 'vanish' | 'reverse';

/** Board state shared by every 3x3 ruleset. `q` keeps placement order per player. */
export interface State {
  cells: Cell[];
  q: Record<Player, number[]>;
  ply: number;
}

export interface Terminal {
  over: boolean;
  winner: Player | null;
  line: number[] | null;
  /** who physically completed the line (differs from winner in Reverse) */
  maker?: Player;
}

/**
 * The seam. Agents and the shadow only ever talk to a RuleSet —
 * they never know which variant they are playing.
 */
export interface RuleSet {
  id: ModeId;
  name: string;
  blurb: string;
  /** length of the tensor produced by encode() */
  encodeLen: number;
  /** number of discrete actions */
  actions: number;
  start(): State;
  legal(s: State): number[];
  apply(s: State, i: number, p: Player): State;
  terminal(s: State): Terminal;
  /** state -> fixed-length input, always from the mover's point of view */
  encode(s: State, me: Player, timeNorm: number): Float32Array;
  /** index of p's mark that disappears on p's next placement, or -1 */
  doomed(s: State, p: Player): number;
}

export const other = (p: Player): Player => (p === 'X' ? 'O' : 'X');
