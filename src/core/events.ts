import { GENERIC_CFG, heuristicMove } from './heuristic';
import { MODES } from './rules/modes';
import { other, type Player, type RuleSet, type State } from './rules/types';
import { tactics } from './tactics';
import { hashString, seeded } from './rng';
import { RivalAgent, ShadowAgent, type Agent, type RivalModels } from './agents';
import { simMatch, type SimResult } from './sim';
import { queueLosses } from './away';
import type { Shadow } from './shadow/shadow';
import type { GauntletMatch, GauntletResult, Profile } from './profile';

/* ---------------- calendar (local time) ---------------- */
const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO week, e.g. 2026-W46 */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad(wk)}`;
}

/** time until the next local midnight / next Monday, for countdowns */
export function msUntilNextDay(d = new Date()): number {
  const n = new Date(d); n.setHours(24, 0, 0, 0); return n.getTime() - d.getTime();
}
export function msUntilNextWeek(d = new Date()): number {
  const n = new Date(d); n.setHours(0, 0, 0, 0);
  const add = ((8 - (n.getDay() || 7)) % 7) || 7;
  n.setDate(n.getDate() + add);
  return n.getTime() - d.getTime();
}

export const dailyMode = (day: string): RuleSet => MODES[hashString('daily:' + day) % MODES.length];
/** the week's featured mode — the Gauntlet is played in it */
export const featuredMode = (week: string): RuleSet => MODES[hashString('week:' + week) % MODES.length];

/* ---------------- daily coach puzzle ---------------- */
export interface Puzzle { day: string; rules: RuleSet; s: State; }

/**
 * Same position for everyone on a given day (seeded): a real choice,
 * never a forced move, player to move as X.
 */
export function dailyPuzzle(day: string): Puzzle {
  const rules = dailyMode(day);
  const rnd = seeded('puzzle:' + day);
  const maxPlies = rules.id === 'vanish' ? 9 : 5;
  for (let attempt = 0; attempt < 300; attempt++) {
    let s = rules.start();
    let p: Player = rnd() < .5 ? 'X' : 'O';
    const plies = 2 + Math.floor(rnd() * (maxPlies - 1));
    let ok = true;
    for (let i = 0; i < plies; i++) {
      s = rules.apply(s, heuristicMove(rules, s, p, GENERIC_CFG, rnd), p);
      p = other(p);
      if (rules.terminal(s).over) { ok = false; break; }
    }
    if (!ok || p !== 'X') continue;
    const t = tactics(rules, s, 'X');
    if (!t.forced && t.legal.length >= 3) return { day, rules, s };
  }
  return { day, rules, s: rules.start() };
}

export function yesterday(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

export function completeDaily(profile: Profile, day: string): void {
  const D = profile.daily;
  if (D.last === day) return;
  D.streak = D.last === yesterday(day) ? D.streak + 1 : 1;
  D.best = Math.max(D.best, D.streak);
  D.last = day;
}

/* ---------------- weekly shadow gauntlet ---------------- */
/** knockouts can't end level: replay a drawn match, X loses if it stays level */
function decisive(rules: RuleSet, a: Agent, b: Agent): SimResult {
  let r = simMatch(rules, a, b);
  for (let i = 0; i < 2 && r.score === 0.5; i++) r = simMatch(rules, a, b);
  return r;
}

/**
 * Four-shadow knockout in the week's featured mode: your shadow plus the
 * three rivals nearest your rating. Unrated; losses still come back as coaching.
 */
export function runGauntlet(shadow: Shadow, profile: Profile, models: RivalModels, week: string): GauntletResult {
  const rules = featuredMode(week);
  const my = profile.rating[rules.id];
  const [r0, r1, r2] = [...profile.rivals]
    .sort((a, b) => Math.abs(a.rating[rules.id] - my) - Math.abs(b.rating[rules.id] - my))
    .slice(0, 3);
  shadow.head(rules);
  const me = new ShadowAgent(shadow, 'SHADOW', 0.8);
  const matches: GauntletMatch[] = [];

  const semi = decisive(rules, me, new RivalAgent(r0, models));
  queueLosses(profile, rules, semi.lostX);
  const semiWon = semi.score === 1;
  matches.push({ stage: 'SEMIFINAL', rival: r0.name, score: `${semi.x}–${semi.o}`, won: semiWon });

  let placement: 1 | 2 | 3 = 3;
  if (semiWon) {
    const other = decisive(rules, new RivalAgent(r1, models), new RivalAgent(r2, models));
    const finalist = other.score === 1 ? r1 : r2;
    const fin = decisive(rules, me, new RivalAgent(finalist, models));
    queueLosses(profile, rules, fin.lostX);
    const won = fin.score === 1;
    matches.push({ stage: 'FINAL', rival: finalist.name, score: `${fin.x}–${fin.o}`, won });
    placement = won ? 1 : 2;
    if (won) profile.trophies++;
  }
  const result: GauntletResult = { week, mode: rules.id, placement, matches };
  profile.gauntlet = result;
  return result;
}
