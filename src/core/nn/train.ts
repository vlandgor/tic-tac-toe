import { MLP } from './mlp';

export interface Sample {
  x: Float32Array;
  y: number;
  legal: number[];
  /** Shadow.games at the time it was recorded — drives recency weighting */
  age: number;
  /** base weight (coaching answers count more) */
  w: number;
}

export interface TrainParams {
  epochs: number;
  lr: number;
  /** current Shadow.games, for recency decay */
  games: number;
  /** weight of the cold-start prior this pass (decays with experience) */
  priorWeight: number;
  recency: number;
}

export const DEFAULT_TRAIN: Omit<TrainParams, 'games' | 'priorWeight'> = { epochs: 16, lr: 0.045, recency: 0.97 };

/** One full-batch epoch over player data + (decaying) prior. Shared by worker and fallback. */
export function runEpoch(net: MLP, samples: Sample[], prior: Sample[], p: TrainParams): number {
  let loss = 0, n = 0;
  for (const s of samples) {
    loss += net.accum(s.x, s.y, s.legal, s.w * Math.pow(p.recency, p.games - s.age));
    n++;
  }
  if (p.priorWeight > 0.02) {
    for (let i = 0; i < prior.length; i += 2) {
      const s = prior[i];
      loss += net.accum(s.x, s.y, s.legal, p.priorWeight);
      n++;
    }
  }
  net.step(p.lr / Math.max(1, n / 64));
  return loss / Math.max(1, n);
}

/** plain supervised fit, used for priors and rival models */
export function fit(net: MLP, data: Sample[], epochs: number, lr = 0.05): void {
  for (let ep = 0; ep < epochs; ep++) {
    for (const s of data) net.accum(s.x, s.y, s.legal, 1);
    net.step(lr / Math.max(1, data.length / 64));
  }
}
