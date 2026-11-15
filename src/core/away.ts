import { pick } from './heuristic';
import { MODES } from './rules/modes';
import { other, type Player, type RuleSet, type State } from './rules/types';
import { tactics } from './tactics';
import { eloDelta, matchmake } from './rating';
import { RivalAgent, ShadowAgent, type RivalModels } from './agents';
import type { Shadow } from './shadow/shadow';
import type { AwayResult, LossPosition, Profile } from './profile';
import { MATCH } from './match';

/**
 * Your shadow represents you while you're away.
 * Results move YOUR rating. The shadow learns nothing here —
 * the last real decision of each lost round becomes a coaching position.
 */
function simRound(rules: RuleSet, me: ShadowAgent, opp: RivalAgent) {
  let s: State = rules.start();
  let p: Player = Math.random() < .5 ? 'X' : 'O';
  let last: LossPosition | null = null;
  let t = rules.terminal(s);
  let guard = 0;
  while (!t.over && guard++ < 60) {
    let mv: number;
    if (p === 'X') {
      const forced = tactics(rules, s, 'X').forced;
      mv = me.pick(rules, s, 'X', 1);
      if (!forced) last = { s, mv };
    } else {
      mv = opp.pick(rules, s, 'O');
    }
    s = rules.apply(s, mv, p);
    p = other(p);
    t = rules.terminal(s);
  }
  return { winner: t.winner, last };
}

export function simulateAway(
  n: number, shadow: Shadow, profile: Profile, models: RivalModels, isActive: (r: RuleSet) => boolean,
): AwayResult[] {
  const modes = MODES.filter(isActive);
  if (!modes.length) return [];
  const me = new ShadowAgent(shadow, 'SHADOW', 0.8);
  const results: AwayResult[] = [];
  for (let k = 0; k < n; k++) {
    const rules = pick(modes);
    const rv = matchmake(profile.rivals, rules.id, profile.rating[rules.id], profile.lastRival);
    profile.lastRival = rv.name;
    const opp = new RivalAgent(rv, models);
    shadow.head(rules);
    let Y = 0, R = 0, rounds = 0;
    const lost: LossPosition[] = [];
    while (Y < MATCH.target && R < MATCH.target && rounds < MATCH.maxRounds) {
      const r = simRound(rules, me, opp);
      rounds++;
      if (r.winner === 'X') Y++;
      else if (r.winner === 'O') { R++; if (r.last) lost.push(r.last); }
    }
    const score = Y > R ? 1 : Y < R ? 0 : 0.5;
    const d = eloDelta(profile.rating[rules.id], rv.rating[rules.id], score);
    profile.rating[rules.id] += d;
    rv.rating[rules.id] -= d;
    const q = profile.lossQ[rules.id];
    q.push(...lost.slice(-2));
    while (q.length > 8) q.shift();
    results.push({ mode: rules.id, rival: rv.name, res: score === 1 ? 'W' : score === 0 ? 'L' : 'D',
                   score: `${Y}–${R}`, delta: d, ts: Date.now() });
  }
  profile.away = [...results, ...profile.away].slice(0, 40);
  return results;
}

/** ~2 matches per hour away, capped per visit */
export function awayMatchesFor(minutesAway: number): number {
  return minutesAway >= 30 ? Math.min(6, Math.floor(minutesAway / 30)) : 0;
}
