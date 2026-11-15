import { pick } from '../heuristic';
import { stateKey } from '../rules/board';
import { other, type Player, type RuleSet, type State } from '../rules/types';
import { tactics } from '../tactics';
import type { Shadow } from './shadow';

export interface CoachItem {
  rules: RuleSet;
  s: State;
  /** the cell to reveal after answering: shadow's guess, or what it actually played */
  ref: number;
  kind: 'unsure' | 'loss';
  onAnswer?: () => void;
}

/** positions (player to move as X) where the shadow is least certain about you */
export function pickUnsure(shadow: Shadow, rules: RuleSet, n: number): CoachItem[] {
  const h = shadow.head(rules);
  const seen = new Set<string>();
  const cands: { s: State; ent: number; guess: number }[] = [];
  for (let g = 0; g < 36; g++) {
    let s = rules.start();
    let p: Player = Math.random() < .5 ? 'X' : 'O';
    let guard = 0;
    while (!rules.terminal(s).over && guard++ < 40) {
      if (p === 'X' && s.ply > 0) {
        const key = stateKey(s);
        if (!seen.has(key) && !h.coachedKeys.includes(key)) {
          seen.add(key);
          const tac = tactics(rules, s, 'X');
          if (!tac.forced && tac.legal.length >= 2) {
            const inf = shadow.info(rules, s, 'X', 1);
            cands.push({ s, ent: inf.entropy, guess: inf.best });
          }
        }
      }
      const mv = Math.random() < .3 ? pick(rules.legal(s)) : shadow.sample(rules, s, p, 1, 1.2);
      s = rules.apply(s, mv, p);
      p = other(p);
    }
  }
  cands.sort((a, b) => b.ent - a.ent);
  return cands.slice(0, n).map((c) => ({ rules, s: c.s, ref: c.guess, kind: 'unsure' as const }));
}
