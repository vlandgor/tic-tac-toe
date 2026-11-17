import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import type { CoachItem } from '../core/shadow/coach';
import type { AwayResult } from '../core/profile';
import type { RuleSet } from '../core/rules/types';
import { trainHead } from '../train/trainer';
import { commit, shadow, store } from './app';
import { detectDiscoveries, type FoundDiscovery } from '../core/discoveries';
import { pickReads, recordRead, type ReadItem } from '../core/reads';

export interface SummaryRow { k: string; v: ComponentChildren; }
export interface SummaryData {
  title: string;
  color: string;
  sub: string;
  rows: SummaryRow[];
  learned: string;
  primary: { label: string; run: () => void };
  secondary: { label: string; run: () => void };
}
export interface CoachResult { answered: number; touched: RuleSet[]; }

export type Overlay =
  | { kind: 'coach'; items: CoachItem[]; resolve: (r: CoachResult) => void }
  | { kind: 'train'; rules: RuleSet; epoch: number; epochs: number; loss: number }
  | { kind: 'summary'; data: SummaryData }
  | { kind: 'away'; results: AwayResult[] }
  | { kind: 'spirit' }
  | { kind: 'read'; rules: RuleSet; items: ReadItem[]; resolve: (answers: number[]) => void }
  | { kind: 'modeSelect' }
  | { kind: 'custom' }
  | { kind: 'dev' };

export const overlay = signal<Overlay | null>(null);
export const closeOverlay = () => { overlay.value = null; };

/** shows the coaching overlay; resolves when the player finishes or skips */
export function runCoach(items: CoachItem[]): Promise<CoachResult> {
  if (!items.length) return Promise.resolve({ answered: 0, touched: [] });
  return new Promise((resolve) => {
    overlay.value = { kind: 'coach', items, resolve: (r) => { overlay.value = null; resolve(r); } };
  });
}

/** visible training beat — learning you can't see isn't a feature */
export async function runTraining(rules: RuleSet): Promise<void> {
  const head = shadow.head(rules);
  const started = performance.now();
  overlay.value = { kind: 'train', rules, epoch: 0, epochs: 16, loss: 0 };
  await trainHead(shadow, head, (p) => { overlay.value = { kind: 'train', rules, ...p }; });
  const left = 900 - (performance.now() - started);
  if (left > 0) await new Promise((r) => setTimeout(r, left));
  overlay.value = null;
  // every way the spirit learns ends here, so this is the one place to notice new habits
  const found = detectDiscoveries(shadow, store.profile);
  if (found.length) lastFound.push(...found);
  commit();
}

/** discoveries found since the last time a screen claimed them — the match summary announces these */
const lastFound: FoundDiscovery[] = [];
export const takeFound = (): FoundDiscovery[] => lastFound.splice(0, lastFound.length);

/**
 * "Can it read you?": the spirit seals a guess for each position, you answer,
 * and your answers then teach it. Resolves with the number it read correctly.
 */
export async function runRead(rules: RuleSet): Promise<{ hits: number; answered: number }> {
  const items = pickReads(shadow, rules);
  if (!items.length) return { hits: 0, answered: 0 };
  const answers = await new Promise<number[]>((resolve) => {
    overlay.value = { kind: 'read', rules, items, resolve: (a) => { overlay.value = null; resolve(a); } };
  });
  // learn from the answers only now — every guess above was already sealed
  answers.forEach((mv, i) => { if (mv >= 0) shadow.coach(rules, items[i].s, mv); });
  const answered = answers.filter((a) => a >= 0).length;
  const hits = answers.filter((a, i) => a >= 0 && a === items[i].guess).length;
  // only a full round goes on the record, so quitting early can't skew the history
  if (answered === items.length) recordRead(store.profile.reads, rules.id, hits);
  commit();
  if (answered) await runTraining(rules);
  return { hits, answered };
}

export async function runTrainingMany(list: RuleSet[]): Promise<void> {
  for (const r of list) await runTraining(r);
}
