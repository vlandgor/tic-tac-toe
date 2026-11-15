import { argmax, entropy, MLP, sampleFrom } from '../nn/mlp';
import { fit, type Sample } from '../nn/train';
import { corpus, GENERIC_CFG } from '../heuristic';
import { isCorner, stateKey } from '../rules/board';
import { MODES } from '../rules/modes';
import type { ModeId, Player, RuleSet, State } from '../rules/types';
import { tactics } from '../tactics';

export type Ratio = [hits: number, total: number];
export interface Traits { centerOpen: Ratio; corner: Ratio; block: Ratio; finish: Ratio; }
export const newTraits = (): Traits => ({ centerOpen: [0, 0], corner: [0, 0], block: [0, 0], finish: [0, 0] });

/** One learned policy per game mode. */
export interface Head {
  id: ModeId;
  net: MLP;
  samples: Sample[];
  prior: Sample[];
  moves: number;
  /** prequential hits on CHOICE moves only (forced moves excluded) */
  recent: number[];
  traits: Traits;
  coached: number;
  coachedKeys: string[];
}

export const SHADOW_LIMITS = {
  samples: 400,
  recentWindow: 40,
  latency: 30,
  coachedKeys: 300,
  gateMoves: 60,
  gateStyle: 10,
} as const;

export function newHead(rules: RuleSet): Head {
  return { id: rules.id, net: new MLP(rules.encodeLen, 64, 64, rules.actions), samples: [], prior: [],
           moves: 0, recent: [], traits: newTraits(), coached: 0, coachedKeys: [] };
}

export interface MoveInfo { best: number; p: Float32Array; entropy: number; }

/**
 * The player's shadow: shared core (tempo, games) + one head per mode.
 * Pure model — persistence and training scheduling live elsewhere.
 */
export class Shadow {
  games = 0;
  latency: number[] = [];
  heads = new Map<ModeId, Head>();

  head(rules: RuleSet): Head {
    let h = this.heads.get(rules.id);
    if (!h) {
      h = newHead(rules);
      h.prior = corpus(rules, GENERIC_CFG, 60, 360);
      fit(h.net, h.prior, 10, 0.05);
      this.heads.set(rules.id, h);
    } else if (!h.prior.length) {
      h.prior = corpus(rules, GENERIC_CFG, 60, 360);
    }
    return h;
  }

  peek(id: ModeId): Head | undefined { return this.heads.get(id); }

  priorWeight(h: Head): number { return 0.5 * Math.exp(-h.moves / 90); }

  fidelity(id: ModeId): number | null {
    const h = this.heads.get(id);
    if (!h || h.recent.length < 4) return null;
    return Math.round((h.recent.reduce((a, b) => a + b, 0) / h.recent.length) * 100);
  }

  /** has it learned enough in this mode to represent the player in matchmaking? */
  eligible(id: ModeId): boolean {
    const h = this.heads.get(id);
    return !!h && h.moves >= SHADOW_LIMITS.gateMoves && h.recent.length >= SHADOW_LIMITS.gateStyle;
  }

  tempo(): number | null {
    if (!this.latency.length) return null;
    return this.latency.reduce((a, b) => a + b, 0) / this.latency.length / 1000;
  }

  thinkMs(): number {
    const l = this.latency;
    return l.length ? l[(Math.random() * l.length) | 0] * (0.8 + Math.random() * 0.4) : 700;
  }

  info(rules: RuleSet, s: State, me: Player, t: number): MoveInfo {
    const legal = rules.legal(s);
    const p = this.head(rules).net.policy(rules.encode(s, me, t), legal, 1);
    return { best: argmax(p, legal), p, entropy: entropy(p, legal) };
  }

  sample(rules: RuleSet, s: State, me: Player, t: number, temp = 0.85): number {
    const legal = rules.legal(s);
    if (!legal.length) return -1;
    return sampleFrom(this.head(rules).net.policy(rules.encode(s, me, t), legal, temp), legal);
  }

  /** A real player move: predict first (honest fidelity), then store as training data. */
  record(rules: RuleSet, s: State, me: Player, t: number, chosen: number, thinkMs?: number) {
    const h = this.head(rules);
    const inf = this.info(rules, s, me, t);
    const tac = tactics(rules, s, me);
    const hit = inf.best === chosen ? 1 : 0;
    if (!tac.forced) {
      h.recent.push(hit);
      if (h.recent.length > SHADOW_LIMITS.recentWindow) h.recent.shift();
    }
    h.samples.push({ x: rules.encode(s, me, t), y: chosen, legal: tac.legal, age: this.games, w: 1 });
    if (h.samples.length > SHADOW_LIMITS.samples) h.samples.shift();
    h.moves++;
    if (thinkMs) {
      this.latency.push(Math.max(200, Math.min(4000, thinkMs)));
      if (this.latency.length > SHADOW_LIMITS.latency) this.latency.shift();
    }
    const T = h.traits;
    if (s.ply === 0) { T.centerOpen[1]++; if (chosen === 4) T.centerOpen[0]++; }
    T.corner[1]++; if (isCorner(chosen)) T.corner[0]++;
    if (tac.wins.length) { T.finish[1]++; if (tac.wins.includes(chosen)) T.finish[0]++; }
    else if (tac.blocks.length) { T.block[1]++; if (tac.blocks.includes(chosen)) T.block[0]++; }
    return { hit, forced: tac.forced };
  }

  /** a coaching answer: labelled data, weighted higher, never asked twice */
  coach(rules: RuleSet, s: State, chosen: number): void {
    const h = this.head(rules);
    h.samples.push({ x: rules.encode(s, 'X', 1), y: chosen, legal: rules.legal(s), age: this.games, w: 1.6 });
    if (h.samples.length > SHADOW_LIMITS.samples) h.samples.shift();
    h.coached++;
    h.coachedKeys.push(stateKey(s));
    if (h.coachedKeys.length > SHADOW_LIMITS.coachedKeys) h.coachedKeys.shift();
  }

  reset(): void { this.games = 0; this.latency = []; this.heads.clear(); }

  activeModes(): RuleSet[] { return MODES.filter((m) => this.eligible(m.id)); }
}

export const pct = (r: Ratio): number | null => (r[1] >= 3 ? Math.round((r[0] / r[1]) * 100) : null);
