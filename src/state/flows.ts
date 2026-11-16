import { awayMatchesFor, simulateAway } from '../core/away';
import { completeDaily, dailyPuzzle, dayKey, featuredMode, runGauntlet, weekKey } from '../core/events';
import type { GauntletResult } from '../core/profile';
import { MODES } from '../core/rules/modes';
import { makeRivals, START_RATING } from '../core/rating';
import type { CoachItem } from '../core/shadow/coach';
import { loadAll, wipeShadow } from '../storage/persist';
import { commit, isActive, mode, ready, rivalModels, screen, shadow, store } from './app';
import { overlay, runCoach, runTraining, runTrainingMany } from './overlays';

/* ---------- boot ---------- */
export async function boot(): Promise<void> {
  store.profile = await loadAll(shadow);
  mode.value = store.profile.mode;
  shadow.head(MODES.find((m) => m.id === mode.value)!);
  // first run: brand-new players go through onboarding; anyone with history skips it
  const hasHistory = [...shadow.heads.values()].some((h) => h.moves > 0);
  if (!store.profile.onboarded && hasHistory) store.profile.onboarded = true;
  if (!store.profile.onboarded) screen.value = 'onboarding';
  ready.value = true;
  commit();
  if (store.profile.onboarded) checkAway();
  setInterval(touchSeen, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) touchSeen();
    else checkAway();
  });
}

function touchSeen() { store.profile.lastSeen = Date.now(); commit(); }

/** your shadow played while you were gone — show what happened */
export function checkAway(): void {
  if (screen.value === 'onboarding') return;
  const p = store.profile, now = Date.now();
  const mins = p.lastSeen ? (now - p.lastSeen) / 60000 : 0;
  p.lastSeen = now;
  const n = awayMatchesFor(mins);
  if (n && !overlay.value) {
    const res = simulateAway(n, shadow, p, rivalModels, isActive);
    if (res.length) overlay.value = { kind: 'away', results: res };
  }
  commit();
}

export function simulateNow(n: number): boolean {
  const res = simulateAway(n, shadow, store.profile, rivalModels, isActive);
  commit();
  if (!res.length) return false;
  overlay.value = { kind: 'away', results: res };
  return true;
}

/* ---------- coaching from the shadow's losses ---------- */
export function lossItems(max = 4): CoachItem[] {
  const items: CoachItem[] = [];
  for (const m of MODES) {
    const q = store.profile.lossQ[m.id];
    for (const L of q.slice(-2)) {
      items.push({ rules: m, s: L.s, ref: L.mv, kind: 'loss', onAnswer: () => {
        const i = q.indexOf(L);
        if (i >= 0) q.splice(i, 1);
      } });
    }
  }
  return items.slice(0, max);
}

export async function coachLosses(): Promise<void> {
  const r = await runCoach(lossItems());
  commit();
  await runTrainingMany(r.touched);
  screen.value = 'menu';
}

/* ---------- destructive ---------- */
export async function resetShadow(): Promise<void> {
  await wipeShadow(shadow);
  for (const m of MODES) store.profile.lossQ[m.id] = [];
  shadow.head(MODES.find((m) => m.id === mode.value)!);
  commit();
}

export function resetRatings(): void {
  for (const m of MODES) store.profile.rating[m.id] = START_RATING;
  store.profile.rivals = makeRivals();
  store.profile.away = [];
  rivalModels.clear();
  commit();
}

/* ---------- events ---------- */
export const dailyDone = () => store.profile.daily.last === dayKey();

/** one position a day — answering trains your shadow and keeps the streak */
export async function solveDaily(): Promise<void> {
  const day = dayKey();
  if (store.profile.daily.last === day) return;
  const pz = dailyPuzzle(day);
  const guess = shadow.info(pz.rules, pz.s, 'X', 1).best;
  const r = await runCoach([{ rules: pz.rules, s: pz.s, ref: guess, kind: 'daily',
    onAnswer: () => completeDaily(store.profile, day) }]);
  commit();
  if (r.answered) await runTraining(pz.rules);
}

/** null if your shadow isn't active in this week's mode yet */
export function enterGauntlet(): GauntletResult | null {
  const week = weekKey(), p = store.profile;
  if (p.gauntlet?.week === week) return p.gauntlet;
  if (!isActive(featuredMode(week))) return null;
  const res = runGauntlet(shadow, p, rivalModels, week);
  commit();
  return res;
}
