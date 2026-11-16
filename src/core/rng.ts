/**
 * Seeded randomness. Anything that must be reproducible — daily puzzles today,
 * server-side replay verification later — draws from an Rng instead of Math.random.
 */
export type Rng = () => number;

/** mulberry32: tiny, fast, good enough for games */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** stable 32-bit hash of a string (FNV-1a) */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const seeded = (key: string): Rng => mulberry32(hashString(key));
