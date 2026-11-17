import { MODES } from './rules/modes';
import type { ModeId } from './rules/types';
import { pct, type Head, type Ratio, type Shadow } from './shadow/shadow';
import type { Profile } from './profile';

/* ------------------------------------------------------------------
   Discoveries: habits your spirit has noticed about you.

   Every one is a true statement about how you play, unlocked only once
   there is enough evidence for it — never flavour text. Once found it
   stays in your collection, like a Pokédex entry, even if you later
   change your style. Some come in opposite pairs (CORNER HUNTER /
   EDGE WALKER), so no single player finds them all: the collection is
   a portrait of you, not a checklist.
   ------------------------------------------------------------------ */

export interface DiscoveryCtx {
  h: Head | undefined;
  /** prediction accuracy on choice moves, 0..100 */
  fid: number | null;
  /** average think time in seconds, across all modes */
  tempo: number | null;
  /** how many think-time samples tempo is based on */
  tempoN: number;
}

export interface DiscoveryDef {
  id: string;
  /** 'mode' discoveries are found separately in each mode; 'global' ones once */
  scope: 'mode' | 'global';
  name: string;
  /** what the spirit noticed, said to you */
  line: string;
  test(c: DiscoveryCtx): boolean;
}

/** a ratio says something once it has at least `n` observations */
const rate = (r: Ratio, n: number): number | null => (r[1] >= n ? pct(r) : null);
const atLeast = (v: number | null, x: number) => v !== null && v >= x;
const atMost = (v: number | null, x: number) => v !== null && v <= x;
/** fidelity needs a fuller window than the in-game number does before it's a trait */
const steadyFid = (c: DiscoveryCtx) => ((c.h?.recent.length ?? 0) >= 20 ? c.fid : null);

export const DISCOVERIES: readonly DiscoveryDef[] = [
  { id: 'centre',   scope: 'mode', name: 'CENTRE FIRST',  line: 'YOU OPEN IN THE MIDDLE',
    test: (c) => !!c.h && atLeast(rate(c.h.traits.centerOpen, 5), 70) },
  { id: 'offcentre', scope: 'mode', name: 'OFF-CENTRE',   line: 'YOU AVOID OPENING IN THE MIDDLE',
    test: (c) => !!c.h && atMost(rate(c.h.traits.centerOpen, 5), 25) },
  { id: 'corners',  scope: 'mode', name: 'CORNER HUNTER', line: 'YOU GO FOR THE CORNERS',
    test: (c) => !!c.h && atLeast(rate(c.h.traits.corner, 15), 55) },
  { id: 'edges',    scope: 'mode', name: 'EDGE WALKER',   line: 'YOU WORK THE EDGES',
    test: (c) => !!c.h && atMost(rate(c.h.traits.corner, 15), 20) },
  { id: 'wall',     scope: 'mode', name: 'THE WALL',      line: 'YOU NEVER MISS A BLOCK',
    test: (c) => !!c.h && atLeast(rate(c.h.traits.block, 6), 90) },
  { id: 'highwire', scope: 'mode', name: 'HIGH WIRE',     line: 'YOU LET THREATS SLIDE',
    test: (c) => !!c.h && atMost(rate(c.h.traits.block, 6), 50) },
  { id: 'closer',   scope: 'mode', name: 'THE CLOSER',    line: 'YOU ALWAYS TAKE THE WIN',
    test: (c) => !!c.h && atLeast(rate(c.h.traits.finish, 5), 95) },
  { id: 'dreamer',  scope: 'mode', name: 'DAYDREAMER',    line: 'YOU LEAVE WINS ON THE BOARD',
    test: (c) => !!c.h && atMost(rate(c.h.traits.finish, 5), 60) },
  { id: 'openbook', scope: 'mode', name: 'OPEN BOOK',     line: 'IT CAN READ YOUR NEXT MOVE',
    test: (c) => atLeast(steadyFid(c), 70) },
  { id: 'wildcard', scope: 'mode', name: 'WILDCARD',      line: 'YOU KEEP IT GUESSING',
    test: (c) => atMost(steadyFid(c), 35) },
  { id: 'teacher',  scope: 'mode', name: 'TEACHER',       line: "YOU'VE TAUGHT IT DIRECTLY",
    test: (c) => (c.h?.coached ?? 0) >= 8 },
  { id: 'quick',    scope: 'global', name: 'QUICK HAND',  line: 'YOU MOVE FAST',
    test: (c) => c.tempoN >= 20 && atMost(c.tempo, 1.2) },
  { id: 'slowburn', scope: 'global', name: 'SLOW BURN',   line: 'YOU TAKE YOUR TIME',
    test: (c) => c.tempoN >= 20 && atLeast(c.tempo, 4) },
];

export interface Found { at: number; seen: boolean; }
export interface FoundDiscovery { def: DiscoveryDef; mode: ModeId | null; key: string; at: number; seen: boolean; }

/** storage key: mode discoveries per mode, global ones under '*' */
export const discoveryKey = (d: DiscoveryDef, mode: ModeId | null) => (d.scope === 'global' ? '*' : mode) + ':' + d.id;

function ctxFor(shadow: Shadow, mode: ModeId): DiscoveryCtx {
  return { h: shadow.peek(mode), fid: shadow.fidelity(mode), tempo: shadow.tempo(), tempoN: shadow.latency.length };
}

/**
 * Check every regular mode for newly earned discoveries, record them on the
 * profile, and return just the new ones (oldest first) so the caller can
 * announce them.
 */
export function detectDiscoveries(shadow: Shadow, profile: Profile, now = Date.now()): FoundDiscovery[] {
  const out: FoundDiscovery[] = [];
  for (const m of MODES) {
    const c = ctxFor(shadow, m.id);
    for (const d of DISCOVERIES) {
      const key = discoveryKey(d, m.id);
      if (profile.discoveries[key] || !d.test(c)) continue;
      profile.discoveries[key] = { at: now, seen: false };
      out.push({ def: d, mode: d.scope === 'global' ? null : m.id, key, at: now, seen: false });
    }
  }
  return out;
}

/** what's been found that belongs on a given mode's page: its own, plus the global ones */
export function foundFor(profile: Profile, mode: ModeId): FoundDiscovery[] {
  const out: FoundDiscovery[] = [];
  for (const d of DISCOVERIES) {
    const m = d.scope === 'global' ? null : mode;
    const key = discoveryKey(d, m);
    const f = profile.discoveries[key];
    if (f) out.push({ def: d, mode: m, key, at: f.at, seen: f.seen });
  }
  return out.sort((a, b) => b.at - a.at);
}
