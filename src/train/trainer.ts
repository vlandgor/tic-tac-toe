import { DEFAULT_TRAIN, runEpoch, type TrainParams } from '../core/nn/train';
import type { Head, Shadow } from '../core/shadow/shadow';
import type { TrainMessage, TrainRequest } from './protocol';

export interface Progress { epoch: number; epochs: number; loss: number; }

let worker: Worker | null = null;
let workerBroken = false;
let nextId = 1;

function getWorker(): Worker | null {
  if (workerBroken) return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./train.worker.ts', import.meta.url), { type: 'module' });
      worker.onerror = () => { workerBroken = true; worker = null; };
    } catch { workerBroken = true; return null; }
  }
  return worker;
}

/** main-thread fallback, chunked one epoch per frame */
function trainInline(h: Head, params: TrainParams, onProgress: (p: Progress) => void): Promise<void> {
  return new Promise((resolve) => {
    let ep = 0;
    const tick = () => {
      const loss = runEpoch(h.net, h.samples, h.prior, params);
      ep++;
      onProgress({ epoch: ep, epochs: params.epochs, loss });
      if (ep < params.epochs) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function trainInWorker(w: Worker, h: Head, params: TrainParams, onProgress: (p: Progress) => void): Promise<void> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    // a worker that can't load (CSP, hosting) never answers — don't hang, fall back
    let timer = setTimeout(() => fail('worker timeout'), 4000);
    const cleanup = () => {
      clearTimeout(timer);
      w.removeEventListener('message', onMsg);
      w.removeEventListener('error', onErr);
    };
    const fail = (msg: string) => { cleanup(); reject(new Error(msg)); };
    const onErr = () => fail('worker error');
    const onMsg = (e: MessageEvent<TrainMessage>) => {
      const m = e.data;
      if (m.id !== id) return;
      clearTimeout(timer);
      timer = setTimeout(() => fail('worker stalled'), 4000);
      if (m.type === 'progress') onProgress(m);
      else if (m.type === 'done') { cleanup(); h.net.setWeights(m.weights); resolve(); }
      else fail(m.message);
    };
    w.addEventListener('message', onMsg);
    w.addEventListener('error', onErr);
    const req: TrainRequest = { id, weights: h.net.weights(), samples: h.samples, prior: h.prior, params };
    w.postMessage(req);
  });
}

/** Train one mode's head. Worker if available, inline otherwise. */
export async function trainHead(shadow: Shadow, h: Head, onProgress: (p: Progress) => void): Promise<void> {
  const params: TrainParams = { ...DEFAULT_TRAIN, games: shadow.games, priorWeight: shadow.priorWeight(h) };
  const w = getWorker();
  if (w) {
    try { await trainInWorker(w, h, params, onProgress); return; }
    catch { workerBroken = true; try { worker?.terminate(); } catch { /* ignore */ } worker = null; }
  }
  await trainInline(h, params, onProgress);
}
