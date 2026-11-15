import { MLP, sampleFrom } from './nn/mlp';
import { fit } from './nn/train';
import { ARCHETYPES, corpus, type StyleCfg } from './heuristic';
import type { Player, RuleSet, State } from './rules/types';
import type { Shadow } from './shadow/shadow';

/**
 * Anything that can sit across the board: your shadow, a rival's shadow,
 * and later a remote player. Matches only ever talk to Agents.
 */
export interface Agent {
  readonly name: string;
  pick(rules: RuleSet, s: State, me: Player, timeNorm: number): number;
  thinkMs(): number;
}

/** the player's own shadow (mirror match, menu board, away matches) */
export class ShadowAgent implements Agent {
  readonly name: string;
  constructor(private shadow: Shadow, name = 'SHADOW', private temp = 0.8) { this.name = name; }
  pick(rules: RuleSet, s: State, me: Player, t: number) { return this.shadow.sample(rules, s, me, t, this.temp); }
  thinkMs() { return this.shadow.thinkMs(); }
}

/* ------------------------------------------------------------------ */

export interface RivalProfile {
  name: string;
  arch: number;
  cfg: StyleCfg;
  rating: Record<string, number>;
}

/** Rival shadows: real nets, trained once per mode on their own style. They don't learn afterwards. */
export class RivalModels {
  private cache = new Map<string, MLP>();
  net(rv: RivalProfile, rules: RuleSet): MLP {
    const key = rv.name + '/' + rules.id;
    let n = this.cache.get(key);
    if (!n) {
      n = new MLP(rules.encodeLen, 48, 48, rules.actions);
      fit(n, corpus(rules, rv.cfg, 40, 300), 10, 0.05);
      this.cache.set(key, n);
    }
    return n;
  }
  clear() { this.cache.clear(); }
}

export class RivalAgent implements Agent {
  readonly name: string;
  constructor(private rv: RivalProfile, private models: RivalModels) { this.name = rv.name; }
  pick(rules: RuleSet, s: State, me: Player) {
    const legal = rules.legal(s);
    if (!legal.length) return -1;
    return sampleFrom(this.models.net(this.rv, rules).policy(rules.encode(s, me, 1), legal, 0.7), legal);
  }
  thinkMs() {
    const [a, b] = ARCHETYPES[this.rv.arch].latency;
    return a + Math.random() * (b - a);
  }
}

export const rivalTag = (rv: RivalProfile) => ARCHETYPES[rv.arch].tag;
