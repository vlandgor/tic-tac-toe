import { computed, signal } from '@preact/signals';
import { Shadow } from '../core/shadow/shadow';
import { RivalModels, type RivalProfile } from '../core/agents';
import { defaultProfile, type Profile } from '../core/profile';
import { modeById } from '../core/rules/modes';
import type { ModeId, RuleSet } from '../core/rules/types';
import { saveAll } from '../storage/persist';

/**
 * App-wide state. The shadow and profile are plain mutable objects (the core
 * mutates them); `rev` is bumped after every mutation so views re-render.
 */
export const shadow = new Shadow();
export const rivalModels = new RivalModels();
export const store: { profile: Profile } = { profile: defaultProfile() };

export const rev = signal(0);
export const ready = signal(false);

export type Screen = 'onboarding' | 'menu' | 'modes' | 'events' | 'shadow' | 'ranks' | 'search' | 'game';
export const TAB_SCREENS: Screen[] = ['modes', 'events', 'menu', 'shadow', 'ranks'];
export const screen = signal<Screen>('menu');

export interface Session { id: number; kind: 'rival' | 'mirror'; rival?: RivalProfile; }
export const session = signal<Session | null>(null);

export const mode = signal<ModeId>('classic');
export const rules = computed<RuleSet>(() => modeById(mode.value));

/** shadow represents the player in this mode (dev flag can bypass the gate) */
export const isActive = (r: RuleSet) => store.profile.ignoreGate || shadow.eligible(r.id);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function commit(): void {
  rev.value++;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void saveAll(shadow, store.profile); }, 250);
}

export function setMode(id: ModeId): void {
  mode.value = id;
  store.profile.mode = id;
  shadow.head(modeById(id));
  commit();
}

let sessionSeq = 1;
export function startSession(kind: Session['kind'], rival?: RivalProfile): void {
  session.value = { id: sessionSeq++, kind, rival };
  screen.value = 'game';
}
