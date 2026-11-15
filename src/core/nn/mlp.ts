/**
 * Tiny 2-hidden-layer MLP with masked softmax over legal actions.
 * Plain TypeScript, no deps. Swap for TF.js / ONNX later behind the same surface.
 */
export interface NetWeights {
  nin: number; h1: number; h2: number; nout: number;
  W1: Float32Array; b1: Float32Array;
  W2: Float32Array; b2: Float32Array;
  W3: Float32Array; b3: Float32Array;
}

export interface NetJSON {
  nin: number; h1: number; h2: number; nout: number;
  W1: number[]; b1: number[]; W2: number[]; b2: number[]; W3: number[]; b3: number[];
}

function he(n: number, fan: number): Float32Array {
  const a = new Float32Array(n), s = Math.sqrt(2 / fan);
  for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * s;
  return a;
}

export class MLP {
  readonly nin: number; readonly h1: number; readonly h2: number; readonly nout: number;
  W1: Float32Array; b1: Float32Array; W2: Float32Array; b2: Float32Array; W3: Float32Array; b3: Float32Array;
  // momentum + grad buffers
  private mW1: Float32Array; private mb1: Float32Array; private mW2: Float32Array;
  private mb2: Float32Array; private mW3: Float32Array; private mb3: Float32Array;
  private gW1: Float32Array; private gb1: Float32Array; private gW2: Float32Array;
  private gb2: Float32Array; private gW3: Float32Array; private gb3: Float32Array;
  private a1: Float32Array; private a2: Float32Array; private z: Float32Array;

  constructor(nin: number, h1 = 64, h2 = 64, nout = 9) {
    this.nin = nin; this.h1 = h1; this.h2 = h2; this.nout = nout;
    this.W1 = he(h1 * nin, nin); this.b1 = new Float32Array(h1);
    this.W2 = he(h2 * h1, h1); this.b2 = new Float32Array(h2);
    this.W3 = he(nout * h2, h2); this.b3 = new Float32Array(nout);
    this.mW1 = new Float32Array(h1 * nin); this.mb1 = new Float32Array(h1);
    this.mW2 = new Float32Array(h2 * h1); this.mb2 = new Float32Array(h2);
    this.mW3 = new Float32Array(nout * h2); this.mb3 = new Float32Array(nout);
    this.gW1 = new Float32Array(h1 * nin); this.gb1 = new Float32Array(h1);
    this.gW2 = new Float32Array(h2 * h1); this.gb2 = new Float32Array(h2);
    this.gW3 = new Float32Array(nout * h2); this.gb3 = new Float32Array(nout);
    this.a1 = new Float32Array(h1); this.a2 = new Float32Array(h2); this.z = new Float32Array(nout);
  }

  private forward(x: Float32Array): Float32Array {
    const { nin, h1, h2, nout } = this;
    for (let i = 0; i < h1; i++) {
      let s = this.b1[i]; const o = i * nin;
      for (let j = 0; j < nin; j++) s += this.W1[o + j] * x[j];
      this.a1[i] = s > 0 ? s : 0;
    }
    for (let i = 0; i < h2; i++) {
      let s = this.b2[i]; const o = i * h1;
      for (let j = 0; j < h1; j++) s += this.W2[o + j] * this.a1[j];
      this.a2[i] = s > 0 ? s : 0;
    }
    for (let i = 0; i < nout; i++) {
      let s = this.b3[i]; const o = i * h2;
      for (let j = 0; j < h2; j++) s += this.W3[o + j] * this.a2[j];
      this.z[i] = s;
    }
    return this.z;
  }

  /** probability over actions; illegal actions get 0 */
  policy(x: Float32Array, legal: number[], temp = 1): Float32Array {
    this.forward(x);
    const p = new Float32Array(this.nout);
    let mx = -1e9, sum = 0;
    for (const i of legal) if (this.z[i] > mx) mx = this.z[i];
    for (const i of legal) { p[i] = Math.exp((this.z[i] - mx) / temp); sum += p[i]; }
    for (const i of legal) p[i] /= sum;
    return p;
  }

  /** accumulate cross-entropy gradient for one example; returns weighted loss */
  accum(x: Float32Array, target: number, legal: number[], w: number): number {
    const p = this.policy(x, legal, 1);
    const { nin, h1, h2, nout } = this;
    const dz = new Float32Array(nout);
    for (const i of legal) dz[i] = (p[i] - (i === target ? 1 : 0)) * w;
    const d2 = new Float32Array(h2);
    for (let i = 0; i < nout; i++) {
      if (dz[i] === 0) continue;
      const o = i * h2; this.gb3[i] += dz[i];
      for (let j = 0; j < h2; j++) { this.gW3[o + j] += dz[i] * this.a2[j]; d2[j] += this.W3[o + j] * dz[i]; }
    }
    const d1 = new Float32Array(h1);
    for (let i = 0; i < h2; i++) {
      if (this.a2[i] <= 0) continue;
      const o = i * h1; this.gb2[i] += d2[i];
      for (let j = 0; j < h1; j++) { this.gW2[o + j] += d2[i] * this.a1[j]; d1[j] += this.W2[o + j] * d2[i]; }
    }
    for (let i = 0; i < h1; i++) {
      if (this.a1[i] <= 0) continue;
      const o = i * nin; this.gb1[i] += d1[i];
      for (let j = 0; j < nin; j++) this.gW1[o + j] += d1[i] * x[j];
    }
    return -Math.log(Math.max(p[target], 1e-7)) * w;
  }

  /** SGD + momentum + L2, then zero grads */
  step(lr: number, mom = 0.9, l2 = 2e-4): void {
    const upd = (W: Float32Array, g: Float32Array, m: Float32Array, decay: boolean) => {
      for (let i = 0; i < W.length; i++) {
        const gr = g[i] + (decay ? l2 * W[i] : 0);
        m[i] = mom * m[i] - lr * gr; W[i] += m[i]; g[i] = 0;
      }
    };
    upd(this.W1, this.gW1, this.mW1, true); upd(this.b1, this.gb1, this.mb1, false);
    upd(this.W2, this.gW2, this.mW2, true); upd(this.b2, this.gb2, this.mb2, false);
    upd(this.W3, this.gW3, this.mW3, true); upd(this.b3, this.gb3, this.mb3, false);
  }

  weights(): NetWeights {
    const { nin, h1, h2, nout } = this;
    return { nin, h1, h2, nout, W1: this.W1.slice(), b1: this.b1.slice(), W2: this.W2.slice(),
             b2: this.b2.slice(), W3: this.W3.slice(), b3: this.b3.slice() };
  }

  setWeights(w: NetWeights): void {
    this.W1.set(w.W1); this.b1.set(w.b1); this.W2.set(w.W2);
    this.b2.set(w.b2); this.W3.set(w.W3); this.b3.set(w.b3);
  }

  static fromWeights(w: NetWeights): MLP {
    const n = new MLP(w.nin, w.h1, w.h2, w.nout);
    n.setWeights(w);
    return n;
  }

  toJSON(): NetJSON {
    const { nin, h1, h2, nout } = this;
    return { nin, h1, h2, nout, W1: Array.from(this.W1), b1: Array.from(this.b1), W2: Array.from(this.W2),
             b2: Array.from(this.b2), W3: Array.from(this.W3), b3: Array.from(this.b3) };
  }

  static fromJSON(o: NetJSON, ninFallback?: number): MLP {
    const n = new MLP(o.nin ?? ninFallback!, o.h1 ?? 64, o.h2 ?? 64, o.nout ?? 9);
    n.W1.set(o.W1); n.b1.set(o.b1); n.W2.set(o.W2); n.b2.set(o.b2); n.W3.set(o.W3); n.b3.set(o.b3);
    return n;
  }
}

export function sampleFrom(p: Float32Array, legal: number[]): number {
  const r = Math.random();
  let acc = 0;
  for (const i of legal) { acc += p[i]; if (r <= acc) return i; }
  return legal[legal.length - 1];
}

export function argmax(p: Float32Array, legal: number[]): number {
  let best = legal[0];
  for (const i of legal) if (p[i] > p[best]) best = i;
  return best;
}

export function entropy(p: Float32Array, legal: number[]): number {
  let e = 0;
  for (const i of legal) if (p[i] > 0) e -= p[i] * Math.log(p[i]);
  return e;
}
