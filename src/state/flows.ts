import { awayMatchesFor, simulateAway } from '../core/away';
import { MODES } from '../core/rules/modes';
import { makeRivals, START_RATING } from '../core/rating';
import type { CoachItem } from '../core/shadow/coach';
import { loadAll, wipeShadow } from '../storage/persist';
import { commit, isActive, mode, ready, rivalModels, screen, shadow, store } from './app';
import { overlay, runCoach, runTrainingMany } from './overlays';

/* ---------- boot ---------- */
export async function boot(): Promise<void> {
  store.profile = await loadAll(shadow);
  mode.value = store.profile.mode;
  shadow.head(MODES.find((m) => m.id === mode.value)!);
  ready.value = true;
  commit();
  checkAway();
  setInterval(touchSeen, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) touchSeen();
    else checkAway();
  });
}

function touchSeen() { store.profile.lastSeen = Date.now(); commit(); }

/** your shadow played while you were gone — show what happened */
export function checkAway(): void {
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
