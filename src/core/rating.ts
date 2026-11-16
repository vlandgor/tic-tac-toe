import { ARCHETYPES, pick, type StyleCfg } from './heuristic';
import { MODES } from './rules/modes';
import type { ModeId } from './rules/types';
import type { RivalProfile } from './agents';

export const START_RATING = 1100;
export const K_FACTOR = 24;

export function eloDelta(ra: number, rb: number, score: number, k = K_FACTOR): number {
  const expected = 1 / (1 + Math.pow(10, (rb - ra) / 400));
  return Math.round(k * (score - expected));
}

const RIVAL_NAMES: [string, number][] = [
  ['KAZU', 0], ['MIRA', 1], ['NOVA', 2], ['HOLT', 3], ['PIXIE', 4], ['ORIN', 0],
  ['SABLE', 1], ['JUNO', 2], ['BRAM', 3], ['ECHO', 4], ['TALIA', 1], ['REX', 0],
];

function jitter(c: StyleCfg): StyleCfg {
  const o = { ...c };
  (Object.keys(o) as (keyof StyleCfg)[]).forEach((k) => {
    o[k] = Math.max(0, Math.min(1, o[k] + (Math.random() * 0.16 - 0.08)));
  });
  return o;
}

/** rating roughly tracks how sound the style is */
export function makeRivals(): RivalProfile[] {
  return RIVAL_NAMES.map(([name, arch]) => {
    const cfg = jitter(ARCHETYPES[arch].cfg);
    const strength = 0.4 * cfg.finish + 0.4 * cfg.block + 0.2 * (1 - cfg.noise);
    const rating: Record<string, number> = {};
    for (const m of MODES) rating[m.id] = Math.round(600 + strength * 700 + (Math.random() * 80 - 40));
    return { name, arch, cfg, rating };
  });
}

/** closest ratings in this mode; never the same opponent twice in a row */
export function matchmake(rivals: RivalProfile[], mode: ModeId, myRating: number, avoid: string | null): RivalProfile {
  const pool = rivals
    .filter((r) => r.name !== avoid)
    .sort((a, b) => Math.abs(a.rating[mode] - myRating) - Math.abs(b.rating[mode] - myRating));
  return pick(pool.slice(0, 3));
}

export interface Standing { name: string; tag: string; rating: number; you: boolean; }

/** leaderboard for one mode: the player plus the rival pool */
export function standings(rivals: RivalProfile[], mode: ModeId, me: { name: string; rating: number }): Standing[] {
  return [
    { name: me.name, tag: 'YOU', rating: me.rating, you: true },
    ...rivals.map((r) => ({ name: r.name, tag: ARCHETYPES[r.arch].tag, rating: r.rating[mode], you: false })),
  ].sort((a, b) => b.rating - a.rating || (a.you ? -1 : 1));
}
