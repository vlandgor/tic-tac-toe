import { other, type Player, type RuleSet, type State } from './rules/types';

export interface Tactics {
  legal: number[];
  wins: number[];
  blocks: number[];
  safe: number[];
  losing: number[];
  /** any reasonable player would play the same move here — excluded from fidelity */
  forced: boolean;
}

/** Generic, by simulation: works for every ruleset without knowing its rules. */
export function tactics(rules: RuleSet, s: State, me: Player): Tactics {
  const opp = other(me);
  const legal = rules.legal(s);
  const wins: number[] = [], losing: number[] = [], blocks: number[] = [];
  for (const i of legal) {
    const t = rules.terminal(rules.apply(s, i, me));
    if (t.over && t.winner === me) wins.push(i);
    else if (t.over && t.winner === opp) losing.push(i);
  }
  for (const j of legal) {
    const t = rules.terminal(rules.apply(s, j, opp));
    if (t.over && t.winner === opp) blocks.push(j);
  }
  const safe = legal.filter((i) => !losing.includes(i));
  const forced = wins.length > 0 || blocks.length > 0 || (safe.length === 1 && legal.length > 1);
  return { legal, wins, blocks, safe, losing, forced };
}
