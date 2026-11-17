/**
 * Spirit avatars. The player picks an animal at first run; it stands for their
 * trained model everywhere it appears (nav tab, Spirit screen, match headers).
 *
 * Purely cosmetic — the avatar never touches the model, its training or ratings.
 */

export type SpiritId = 'rabbit' | 'owl' | 'fox' | 'wolf' | 'cat' | 'bear' | 'raven' | 'viper';

export interface SpiritDef {
  id: SpiritId;
  /** shown under the icon when choosing, and beside the player's name */
  name: string;
  /** one line of flavour on the pick screen — no gameplay meaning */
  trait: string;
}

export const SPIRITS: SpiritDef[] = [
  { id: 'rabbit', name: 'RABBIT', trait: 'QUICK TO READ A BOARD' },
  { id: 'owl',    name: 'OWL',    trait: 'WATCHES BEFORE IT MOVES' },
  { id: 'fox',    name: 'FOX',    trait: 'LEARNS THE ODD ANGLE' },
  { id: 'wolf',   name: 'WOLF',   trait: 'PRESSES AN OPENING' },
  { id: 'cat',    name: 'CAT',    trait: 'PATIENT, THEN SUDDEN' },
  { id: 'bear',   name: 'BEAR',   trait: 'HOLDS THE CENTRE' },
  { id: 'raven',  name: 'RAVEN',  trait: 'REMEMBERS YOUR HABITS' },
  { id: 'viper',  name: 'VIPER',  trait: 'STRIKES AT A MISTAKE' },
];

export const DEFAULT_SPIRIT: SpiritId = 'rabbit';

export const spiritDef = (id: SpiritId | undefined): SpiritDef =>
  SPIRITS.find((s) => s.id === id) ?? SPIRITS[0];

export const spiritName = (id: SpiritId | undefined): string => spiritDef(id).name;
