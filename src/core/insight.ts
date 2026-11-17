import { pct, SHADOW_LIMITS, type Head } from './shadow/shadow';
import type { RuleSet } from './rules/types';

/** one human-readable line about what the shadow has picked up */
export function insight(h: Head, rules: RuleSet): string {
  const T = h.traits, out: string[] = [];
  const c = pct(T.centerOpen), k = pct(T.corner), bl = pct(T.block), f = pct(T.finish);
  if (c !== null) out.push(c >= 60 ? `OPENS CENTER ${c}%` : 'AVOIDS THE CENTER OPENING');
  if (k !== null && k >= 45) out.push(`FAVOURS CORNERS ${k}%`);
  if (bl !== null) out.push(bl >= 80 ? `BLOCKS THREATS ${bl}%` : `MISSES BLOCKS ${100 - bl}%`);
  if (f !== null && f < 90) out.push('LEAVES WINS ON THE BOARD');
  if (!out.length) return `YOUR ${rules.name} SPIRIT NEEDS MORE GAMES`;
  return 'LEARNED — ' + out.slice(0, 2).join('  ·  ');
}

export function gateProgress(h: Head | undefined) {
  const moves = h?.moves ?? 0, style = h?.recent.length ?? 0;
  return { moves: Math.min(moves, SHADOW_LIMITS.gateMoves), need: SHADOW_LIMITS.gateMoves,
           needsStyle: moves >= SHADOW_LIMITS.gateMoves && style < SHADOW_LIMITS.gateStyle };
}

/* ------------------------------------------------------------------
   Growth stages. The raw move count is training data, not something a
   player should have to read — so the spirit grows through named stages
   instead, with a bar to the next one. AWAKE sits exactly on the
   matchmaking gate, so the rules are unchanged; only the telling is.
   ------------------------------------------------------------------ */

export interface StageDef { name: string; line: string; at: number; }

export const STAGES: readonly StageDef[] = [
  { name: 'SLEEPING', line: 'PLAY A GAME TO WAKE IT',        at: 0 },
  { name: 'STIRRING', line: "IT'S STARTING TO NOTICE YOU",    at: 1 },
  { name: 'WAKING',   line: 'ALMOST READY TO PLAY AS YOU',    at: SHADOW_LIMITS.gateMoves / 2 },
  { name: 'AWAKE',    line: 'IT PLAYS RANKED AS YOU',         at: SHADOW_LIMITS.gateMoves },
  { name: 'ATTUNED',  line: 'IT KNOWS YOUR HABITS',           at: 150 },
  { name: 'KINDRED',  line: 'IT THINKS THE WAY YOU DO',       at: 300 },
  { name: 'MIRROR',   line: 'HARD TO TELL YOU APART',         at: 600 },
];

/** the stage at which a spirit joins matchmaking */
export const AWAKE_STAGE = 3;

export interface Stage {
  idx: number;
  name: string;
  line: string;
  /** 0..1 through the current stage toward the next; 1 at the final stage */
  progress: number;
  final: boolean;
}

export function spiritStage(h: Head | undefined): Stage {
  const moves = h?.moves ?? 0;
  let idx = 0;
  for (let i = STAGES.length - 1; i >= 0; i--) if (moves >= STAGES[i].at) { idx = i; break; }

  // enough moves but too few real choices: it can't wake yet, so hold it at the threshold
  const stalled = idx >= AWAKE_STAGE && (h?.recent.length ?? 0) < SHADOW_LIMITS.gateStyle;
  if (stalled) {
    const s = STAGES[AWAKE_STAGE - 1];
    return { idx: AWAKE_STAGE - 1, name: s.name, line: 'NEEDS A FEW REAL CHOICES FROM YOU', progress: 1, final: false };
  }

  const cur = STAGES[idx], next = STAGES[idx + 1];
  const progress = next ? Math.min(1, (moves - cur.at) / (next.at - cur.at)) : 1;
  return { idx, name: cur.name, line: cur.line, progress, final: !next };
}
