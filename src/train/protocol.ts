import type { NetWeights } from '../core/nn/mlp';
import type { Sample, TrainParams } from '../core/nn/train';

export interface TrainRequest {
  id: number;
  weights: NetWeights;
  samples: Sample[];
  prior: Sample[];
  params: TrainParams;
}

export type TrainMessage =
  | { id: number; type: 'progress'; epoch: number; epochs: number; loss: number }
  | { id: number; type: 'done'; weights: NetWeights; loss: number }
  | { id: number; type: 'error'; message: string };
