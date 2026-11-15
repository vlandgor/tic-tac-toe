import { MODES } from './rules/modes';
import type { ModeId, State } from './rules/types';
import { makeRivals, START_RATING } from './rating';
import type { RivalProfile } from './agents';

export interface LossPosition { s: State; mv: number; }

export interface AwayResult {
  mode: ModeId;
  rival: string;
  res: 'W' | 'L' | 'D';
  score: string;
  delta: number;
  ts: number;
}

export interface MiniScore { w: number; l: number; d: number; }

/** Everything about the player that isn't the shadow model itself. */
export interface Profile {
  name: string;
  mode: ModeId;
  /** one rating per mode — you and your shadow share it */
  rating: Record<ModeId, number>;
  rivals: RivalProfile[];
  lastRival: string | null;
  lastSeen: number;
  away: AwayResult[];
  lossQ: Record<ModeId, LossPosition[]>;
  mini: MiniScore;
  ignoreGate: boolean;
}

export function defaultProfile(): Profile {
  const rating = {} as Record<ModeId, number>;
  const lossQ = {} as Record<ModeId, LossPosition[]>;
  for (const m of MODES) { rating[m.id] = START_RATING; lossQ[m.id] = []; }
  return { name: 'VLAD', mode: 'classic', rating, rivals: makeRivals(), lastRival: null, lastSeen: 0,
           away: [], lossQ, mini: { w: 0, l: 0, d: 0 }, ignoreGate: false };
}

/** fill gaps after loading an older save */
export function normalizeProfile(p: Partial<Profile>): Profile {
  const d = defaultProfile();
  const out: Profile = { ...d, ...p } as Profile;
  for (const m of MODES) {
    if (out.rating[m.id] == null) out.rating[m.id] = START_RATING;
    if (!out.lossQ[m.id]) out.lossQ[m.id] = [];
  }
  if (!out.rivals?.length) out.rivals = d.rivals;
  return out;
}

export const lossCount = (p: Profile) => MODES.reduce((n, m) => n + p.lossQ[m.id].length, 0);
