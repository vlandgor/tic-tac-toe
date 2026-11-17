import type { Player } from '../../core/rules/types';
import { store } from '../../state/app';
import { play, unlockAudio, type Tone } from './audio';

/**
 * The game's sound + haptic vocabulary. Screens say *what happened*
 * (feel.place, feel.win); this file decides how it sounds and buzzes.
 */
const soundOn = () => store.profile.settings?.sound !== false;
const buzz = (pattern: number | number[]) => {
  if (store.profile.settings?.haptics === false) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported (iOS) */ }
};
const sfx = (tones: Tone[], k = 1) => {
  if (!soundOn()) return;
  play(k === 1 ? tones : tones.map((t) => ({ ...t, gain: (t.gain ?? 0.08) * k })));
};
const arp = (notes: number[], step: number, dur: number, gain: number, type: OscillatorType = 'triangle'): Tone[] =>
  notes.map((f, i) => ({ f, dur, at: i * step, gain, type }));

export const feel = {
  unlock: unlockAudio,

  /** any button */
  tap() { sfx([{ f: 1250, dur: 0.03, gain: 0.022 }]); buzz(4); },

  /** a mark lands. X is brighter, O rounder. */
  place(p: Player, soft = false) {
    const k = soft ? 0.5 : 1;
    sfx(p === 'X'
      ? [{ f: 940, to: 620, dur: 0.075, type: 'triangle', gain: 0.13 }, { f: 1880, dur: 0.02, gain: 0.025, type: 'square', cutoff: 4000 }]
      : [{ f: 560, to: 420, dur: 0.09, type: 'triangle', gain: 0.12 }], k);
    buzz(soft ? 4 : 9);
  },

  /** the shadow called your move before you made it */
  predicted() { sfx([{ f: 1320, dur: 0.05, gain: 0.05 }, { f: 1980, dur: 0.08, gain: 0.045, at: 0.055 }]); buzz([5, 30, 5]); },
  miss() { sfx([{ f: 360, dur: 0.06, type: 'triangle', gain: 0.045 }]); },

  win(soft = false) { sfx(arp([523, 659, 784, 1047], 0.07, 0.14, 0.09), soft ? 0.5 : 1); buzz(soft ? 10 : [18, 40, 28]); },
  lose(soft = false) { sfx(arp([440, 349, 262], 0.09, 0.16, 0.08), soft ? 0.5 : 1); buzz(soft ? 10 : 36); },
  draw(soft = false) { sfx([{ f: 587, dur: 0.09, gain: 0.06 }, { f: 587, dur: 0.12, gain: 0.05, at: 0.11 }], soft ? 0.5 : 1); },

  /** last seconds on the clock */
  warn() { sfx([{ f: 1040, dur: 0.025, gain: 0.03 }]); buzz(4); },

  /** training: a rising tick per epoch, then a sweep */
  trainTick(epoch: number, epochs: number) { sfx([{ f: 320 + (epoch / epochs) * 760, dur: 0.02, gain: 0.016 }]); },
  trainDone() { sfx([{ f: 420, to: 1260, dur: 0.24, gain: 0.05 }]); buzz([6, 40, 6]); },

  /** a result reveal (away report, gauntlet) */
  reveal(good: boolean | null) { if (good === true) feel.win(); else if (good === false) feel.lose(); else feel.draw(); },
  trophy() { sfx([...arp([523, 659, 784, 1047, 1319], 0.08, 0.18, 0.09), { f: 1568, dur: 0.4, gain: 0.05, at: 0.42 }]); buzz([20, 50, 20, 50, 40]); },
};

/** one global listener: unlock audio on first touch, tap sound for every button not marked silent */
export function installGlobalFeel(): void {
  const sounds = (b: Element | null | undefined): b is Element =>
    !!b && !b.hasAttribute('data-silent') && !b.hasAttribute('disabled');

  // most buttons click the instant they're touched — that's what makes them feel quick
  document.addEventListener('pointerdown', (e) => {
    feel.unlock();
    const b = (e.target as Element | null)?.closest?.('button');
    if (sounds(b) && !b.closest('.scroll')) feel.tap();
  }, { capture: true });

  // but inside a scroll region a touch may be the start of a scroll, so those wait for a real click
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest?.('button');
    if (sounds(b) && b.closest('.scroll')) feel.tap();
  }, { capture: true });
}
