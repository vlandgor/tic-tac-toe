import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import type { CoachItem } from '../core/shadow/coach';
import type { AwayResult } from '../core/profile';
import type { RuleSet } from '../core/rules/types';
import { trainHead } from '../train/trainer';
import { commit, shadow } from './app';

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
  commit();
}

export async function runTrainingMany(list: RuleSet[]): Promise<void> {
  for (const r of list) await runTraining(r);
}
