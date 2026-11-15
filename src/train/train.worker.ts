/// <reference lib="webworker" />
import { MLP } from '../core/nn/mlp';
import { runEpoch } from '../core/nn/train';
import type { TrainMessage, TrainRequest } from './protocol';

// Training runs here so the UI never stutters, even on long buffers.
self.onmessage = (e: MessageEvent<TrainRequest>) => {
  const { id, weights, samples, prior, params } = e.data;
  const post = (m: TrainMessage) => (self as unknown as Worker).postMessage(m);
  try {
    const net = MLP.fromWeights(weights);
    let loss = 0;
    for (let ep = 1; ep <= params.epochs; ep++) {
      loss = runEpoch(net, samples, prior, params);
      post({ id, type: 'progress', epoch: ep, epochs: params.epochs, loss });
    }
    post({ id, type: 'done', weights: net.weights(), loss });
  } catch (err) {
    post({ id, type: 'error', message: String(err) });
  }
};
