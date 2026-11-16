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

export interface Settings { sound: boolean; haptics: boolean; }

export interface DailyState { last: string | null; streak: number; best: number; }

export interface GauntletMatch { stage: 'SEMIFINAL' | 'FINAL'; rival: string; score: string; won: boolean; }
export interface GauntletResult { week: string; mode: ModeId; placement: 1 | 2 | 3; matches: GauntletMatch[]; }

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
  daily: DailyState;
  gauntlet: GauntletResult | null;
  trophies: number;
  /** finished the first-run flow */
  onboarded: boolean;
  settings: Settings;
  ignoreGate: boolean;
}

export function defaultProfile(): Profile {
  const rating = {} as Record<ModeId, number>;
  const lossQ = {} as Record<ModeId, LossPosition[]>;
  for (const m of MODES) { rating[m.id] = START_RATING; lossQ[m.id] = []; }
  return { name: 'PLAYER', mode: 'classic', rating, rivals: makeRivals(), lastRival: null, lastSeen: 0,
           away: [], lossQ, mini: { w: 0, l: 0, d: 0 }, daily: { last: null, streak: 0, best: 0 },
           gauntlet: null, trophies: 0, onboarded: false, settings: { sound: true, haptics: true },
           ignoreGate: false };
}

/** fill gaps after loading an older save */
export function normalizeProfile(p: Partial<Profile>): Profile {
  const d = defaultProfile();
  // saves from before onboarding existed belong to players who already know the game
  if (Object.keys(p).length && p.onboarded === undefined) p = { ...p, onboarded: true };
  const out: Profile = { ...d, ...p } as Profile;
  for (const m of MODES) {
    if (out.rating[m.id] == null) out.rating[m.id] = START_RATING;
    if (!out.lossQ[m.id]) out.lossQ[m.id] = [];
  }
  if (!out.rivals?.length) out.rivals = d.rivals;
  return out;
}

export const lossCount = (p: Profile) => MODES.reduce((n, m) => n + p.lossQ[m.id].length, 0);

/** player names: 2–10 chars, A–Z and 0–9, shown uppercase */
export function cleanName(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}
export const validName = (n: string) => n.length >= 2 && n.length <= 10;
