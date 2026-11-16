import { pick } from './heuristic';
import { MODES } from './rules/modes';
import type { RuleSet } from './rules/types';
import { eloDelta, matchmake } from './rating';
import { RivalAgent, ShadowAgent, type RivalModels } from './agents';
import type { Shadow } from './shadow/shadow';
import type { AwayResult, LossPosition, Profile } from './profile';
import { simMatch } from './sim';

/** keep the newest loss positions per mode for coaching */
export function queueLosses(profile: Profile, rules: RuleSet, lost: LossPosition[]): void {
  const q = profile.lossQ[rules.id];
  q.push(...lost.slice(-2));
  while (q.length > 8) q.shift();
}

/**
 * Your shadow represents you while you're away.
 * Results move YOUR rating. The shadow learns nothing here —
 * the last real decision of each lost round becomes a coaching position.
 */
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
    shadow.head(rules);
    const r = simMatch(rules, me, new RivalAgent(rv, models));
    const d = eloDelta(profile.rating[rules.id], rv.rating[rules.id], r.score);
    profile.rating[rules.id] += d;
    rv.rating[rules.id] -= d;
    queueLosses(profile, rules, r.lostX);
    results.push({ mode: rules.id, rival: rv.name, res: r.score === 1 ? 'W' : r.score === 0 ? 'L' : 'D',
                   score: `${r.x}–${r.o}`, delta: d, ts: Date.now() });
  }
  profile.away = [...results, ...profile.away].slice(0, 40);
  return results;
}

/** ~2 matches per hour away, capped per visit */
export function awayMatchesFor(minutesAway: number): number {
  return minutesAway >= 30 ? Math.min(6, Math.floor(minutesAway / 30)) : 0;
}
