import { pick } from './heuristic';
import { stateKey } from './rules/board';
import { other, type ModeId, type Player, type RuleSet, type State } from './rules/types';
import { tactics } from './tactics';
import type { Shadow } from './shadow/shadow';

/* ------------------------------------------------------------------
   "Can it read you?" — the spirit guesses your move before you make it.

   Honest by construction:
   - positions are ordinary ones from plausible games, not hand-picked to
     be hard (coaching picks the spirit's weakest spots; this does not);
   - forced moves (a win or block anyone would play) are excluded, so a
     hit means it knew *you*, not the rules;
   - the guess is taken before you answer — your answer only teaches it
     afterwards.
   ------------------------------------------------------------------ */

export const READ_ROUND = 5;
/** how many past results each mode remembers */
export const READ_HISTORY = 8;

export interface ReadItem {
  s: State;
  /** the spirit's sealed guess, made before the player answers */
  guess: number;
}

/** READ_ROUND distinct choice positions, player to move as X, each with the spirit's guess */
export function pickReads(shadow: Shadow, rules: RuleSet, n = READ_ROUND, rnd = Math.random): ReadItem[] {
  const seen = new Set<string>();
  const cands: State[] = [];
  for (let g = 0; g < 60 && cands.length < n * 6; g++) {
    let s = rules.start();
    let p: Player = rnd() < 0.5 ? 'X' : 'O';
    let guard = 0;
    while (!rules.terminal(s).over && guard++ < 40) {
      if (p === 'X') {
        const key = stateKey(s);
        if (!seen.has(key)) {
          seen.add(key);
          const tac = tactics(rules, s, 'X');
          if (!tac.forced && tac.legal.length >= 2) cands.push(s);
        }
      }
      // plausible play on both sides: mostly the spirit's own style, with some noise
      const mv = rnd() < 0.3 ? pick(rules.legal(s), rnd) : shadow.sample(rules, s, p, 1, 1.2);
      s = rules.apply(s, mv, p);
      p = other(p);
    }
  }
  // a fair sample of those, not the hardest ones
  for (let i = cands.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }
  return cands.slice(0, n).map((s) => ({ s, guess: shadow.info(rules, s, 'X', 1).best }));
}

/** what the score says, in the spirit's terms */
export function readVerdict(hits: number, n = READ_ROUND): string {
  const r = hits / n;
  if (r >= 1) return 'IT READ YOU PERFECTLY';
  if (r >= 0.8) return 'IT KNOWS YOU WELL';
  if (r >= 0.6) return "IT'S GETTING THERE";
  if (r >= 0.4) return 'STILL LEARNING YOU';
  return 'YOU KEPT IT GUESSING';
}

/** record a finished round; returns the previous score for comparison, if any */
export function recordRead(reads: Partial<Record<ModeId, number[]>>, mode: ModeId, hits: number): number | null {
  const list = reads[mode] ?? (reads[mode] = []);
  const prev = list.length ? list[list.length - 1] : null;
  list.push(hits);
  if (list.length > READ_HISTORY) list.splice(0, list.length - READ_HISTORY);
  return prev;
}
