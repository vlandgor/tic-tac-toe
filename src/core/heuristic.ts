import { isCorner, isEdge } from './rules/board';
import { other, type Player, type RuleSet } from './rules/types';
import { tactics } from './tactics';
import type { Sample } from './nn/train';

export interface StyleCfg {
  finish: number;  // takes an available win
  block: number;   // blocks an immediate threat
  center: number;  // prefers the centre
  corner: number;  // prefers corners
  noise: number;   // plays randomly
}

export interface Archetype { tag: string; cfg: StyleCfg; latency: [number, number]; }

export const ARCHETYPES: readonly Archetype[] = [
  { tag: 'AGGRESSOR',   cfg: { finish: .98, block: .45, center: .35, corner: .85, noise: .08 }, latency: [300, 900] },
  { tag: 'DEFENDER',    cfg: { finish: .85, block: .97, center: .8,  corner: .5,  noise: .05 }, latency: [700, 1800] },
  { tag: 'IMPROVISER',  cfg: { finish: .7,  block: .55, center: .4,  corner: .5,  noise: .38 }, latency: [250, 700] },
  { tag: 'METHODICAL',  cfg: { finish: .95, block: .9,  center: .9,  corner: .7,  noise: .03 }, latency: [900, 2200] },
  { tag: 'EDGE RUNNER', cfg: { finish: .8,  block: .6,  center: .15, corner: .25, noise: .2 },  latency: [350, 1100] },
];

/** generic human-ish policy used for the shadow's cold-start prior */
export const GENERIC_CFG: StyleCfg = { finish: .85, block: .8, center: .6, corner: .6, noise: .15 };

export const pick = <T>(a: readonly T[]): T => a[(Math.random() * a.length) | 0];

export function heuristicMove(rules: RuleSet, s: Parameters<RuleSet['legal']>[0], me: Player, cfg: StyleCfg): number {
  const legal = rules.legal(s);
  if (!legal.length) return -1;
  if (Math.random() < cfg.noise) return pick(legal);
  const t = tactics(rules, s, me);
  if (t.wins.length && Math.random() < cfg.finish) return pick(t.wins);
  if (t.blocks.length && Math.random() < cfg.block) return pick(t.blocks);
  const pool = t.safe.length && Math.random() < cfg.finish ? t.safe : legal;
  if (pool.includes(4) && Math.random() < cfg.center) return 4;
  const corners = pool.filter(isCorner), edges = pool.filter(isEdge);
  if (corners.length && Math.random() < cfg.corner) return pick(corners);
  if (edges.length && Math.random() < 0.75) return pick(edges);
  return pick(pool);
}

/** self-play games of a style, recorded from both sides' point of view */
export function corpus(rules: RuleSet, cfg: StyleCfg, games: number, cap: number): Sample[] {
  const out: Sample[] = [];
  for (let g = 0; g < games && out.length < cap; g++) {
    let s = rules.start();
    let p: Player = Math.random() < .5 ? 'X' : 'O';
    while (!rules.terminal(s).over) {
      const mv = heuristicMove(rules, s, p, cfg);
      out.push({ x: rules.encode(s, p, 1), y: mv, legal: rules.legal(s), age: 0, w: 1 });
      s = rules.apply(s, mv, p);
      p = other(p);
    }
  }
  return out;
}
