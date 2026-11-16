import { useEffect, useRef, useState } from 'preact/hooks';

export const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** animates a number toward `target` whenever it changes (from `from` on first mount) */
export function useCountUp(target: number, ms = 700, from = 0): number {
  const [v, setV] = useState(reducedMotion() ? target : from);
  const cur = useRef(reducedMotion() ? target : from);
  useEffect(() => {
    if (reducedMotion()) { cur.current = target; setV(target); return; }
    const a = cur.current, b = target;
    if (a === b) { setV(b); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const val = Math.round(a + (b - a) * easeOut(k));
      cur.current = val;
      setV(val);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

/** false on the first frame, true after — lets CSS transitions animate from an initial state on mount */
export function useMounted(delay = 30): boolean {
  const [m, setM] = useState(false);
  useEffect(() => { const t = setTimeout(() => setM(true), delay); return () => clearTimeout(t); }, []);
  return m;
}

export function CountUp({ to, from = 0, ms, signed }: { to: number; from?: number; ms?: number; signed?: boolean }) {
  const v = useCountUp(to, ms, from);
  if (!signed) return <>{v}</>;
  return <>{v > 0 ? '+' : v < 0 ? '−' : '±'}{Math.abs(v)}</>;
}
