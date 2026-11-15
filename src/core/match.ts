import { other, type Player, type RuleSet, type State, type Terminal } from './rules/types';

export const MATCH = { target: 3, maxRounds: 7, turnSeconds: 15 } as const;

/**
 * Pure match state: first to `target` rounds, capped at `maxRounds`.
 * The human is always X. Timers and agents are driven by the UI layer.
 */
export interface MatchState {
  rules: RuleSet;
  s: State;
  turn: Player;
  starter: Player;
  score: Record<Player, number>;
  round: number;
  locked: boolean;
  lastMove: number;
  terminal: Terminal | null;
}

export function newMatch(rules: RuleSet): MatchState {
  const m: MatchState = { rules, s: rules.start(), turn: 'X', starter: 'O', score: { X: 0, O: 0 },
                          round: 0, locked: true, lastMove: -1, terminal: null };
  return startRound(m);
}

export function startRound(m: MatchState): MatchState {
  const starter = other(m.starter);
  return { ...m, s: m.rules.start(), starter, turn: starter, round: m.score.X + m.score.O + 1,
           locked: false, lastMove: -1, terminal: null };
}

export function play(m: MatchState, i: number): MatchState {
  if (m.locked || m.s.cells[i]) return m;
  const s = m.rules.apply(m.s, i, m.turn);
  const t = m.rules.terminal(s);
  if (t.over) {
    const score = { ...m.score };
    if (t.winner) score[t.winner]++;
    return { ...m, s, score, locked: true, lastMove: i, terminal: t };
  }
  return { ...m, s, turn: other(m.turn), lastMove: i };
}

export const matchOver = (m: MatchState) =>
  m.score.X >= MATCH.target || m.score.O >= MATCH.target || m.round >= MATCH.maxRounds;

export const matchScore = (m: MatchState) => (m.score.X > m.score.O ? 1 : m.score.X < m.score.O ? 0 : 0.5);
