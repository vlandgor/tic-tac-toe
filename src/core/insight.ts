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
