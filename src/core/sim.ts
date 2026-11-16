import { other, type Player, type RuleSet, type State } from './rules/types';
import { tactics } from './tactics';
import { MATCH } from './match';
import type { Agent } from './agents';
import type { LossPosition } from './profile';

export interface SimResult {
  x: number;
  o: number;
  /** 1 = X won the match, 0 = O won, 0.5 = drawn */
  score: number;
  /** the last real (non-forced) decision X made in each round X lost */
  lostX: LossPosition[];
}

function simRound(rules: RuleSet, xa: Agent, oa: Agent) {
  let s: State = rules.start();
  let p: Player = Math.random() < .5 ? 'X' : 'O';
  let last: LossPosition | null = null;
  let t = rules.terminal(s);
  let guard = 0;
  while (!t.over && guard++ < 60) {
    let mv: number;
    if (p === 'X') {
      const forced = tactics(rules, s, 'X').forced;
      mv = xa.pick(rules, s, 'X', 1);
      if (!forced) last = { s, mv };
    } else {
      mv = oa.pick(rules, s, 'O', 1);
    }
    s = rules.apply(s, mv, p);
    p = other(p);
    t = rules.terminal(s);
  }
  return { winner: t.winner, last };
}

/** a full first-to-3 match between two agents, played instantly */
export function simMatch(rules: RuleSet, xa: Agent, oa: Agent): SimResult {
  let x = 0, o = 0, rounds = 0;
  const lostX: LossPosition[] = [];
  while (x < MATCH.target && o < MATCH.target && rounds < MATCH.maxRounds) {
    const r = simRound(rules, xa, oa);
    rounds++;
    if (r.winner === 'X') x++;
    else if (r.winner === 'O') { o++; if (r.last) lostX.push(r.last); }
  }
  return { x, o, score: x > o ? 1 : x < o ? 0 : 0.5, lostX };
}
