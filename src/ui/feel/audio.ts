/**
 * Tiny Web Audio synth. Every sound in the game is generated here — no files.
 * Browsers only allow audio after a user gesture, so unlock() runs on first touch.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function unlockAudio(): void {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

export interface Tone {
  f: number;            // start frequency (Hz)
  to?: number;          // glide to (Hz)
  dur: number;          // seconds
  at?: number;          // start offset (s)
  type?: OscillatorType;
  gain?: number;        // peak
  cutoff?: number;      // optional low-pass (Hz) to tame square waves
}

export function play(tones: Tone[]): void {
  if (!ctx || !master || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + 0.005;
  for (const t of tones) {
    const s = t0 + (t.at ?? 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = t.type ?? 'sine';
    o.frequency.setValueAtTime(t.f, s);
    if (t.to) o.frequency.exponentialRampToValueAtTime(t.to, s + t.dur);
    const peak = t.gain ?? 0.08;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(peak, s + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, s + t.dur);
    let node: AudioNode = o;
    if (t.cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = t.cutoff;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(master);
    o.start(s);
    o.stop(s + t.dur + 0.03);
  }
}
