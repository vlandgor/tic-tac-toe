import { useEffect, useState } from 'preact/hooks';
import { matchmake } from '../../core/rating';
import { rivalTag, type RivalProfile } from '../../core/agents';
import { commit, rivalModels, rules, screen, startSession, store } from '../../state/app';

export function Search() {
  const r = rules.value, p = store.profile;
  const [found, setFound] = useState<RivalProfile | null>(null);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const iv = setInterval(() => setDots((d) => (d % 3) + 1), 260);
    const timers: number[] = [];
    timers.push(window.setTimeout(() => {
      clearInterval(iv);
      const rv = matchmake(p.rivals, r.id, p.rating[r.id], p.lastRival);
      p.lastRival = rv.name;
      commit();
      rivalModels.net(rv, r); // warm their model during the reveal
      setFound(rv);
      timers.push(window.setTimeout(() => startSession('rival', rv), 1300));
    }, 1300 + Math.random() * 700));
    return () => { clearInterval(iv); timers.forEach(clearTimeout); };
  }, []);

  return (
    <div class="screen">
      <div class="abs center s-mode lbl">{r.name}&nbsp;&nbsp;·&nbsp;&nbsp;YOUR RATING {p.rating[r.id]}</div>
      <div class="abs center s-title">{found ? 'SHADOW FOUND' : 'SEARCHING FOR SHADOWS'}</div>
      <div class="abs center s-dots">{found ? '· · ·' : '·  '.repeat(dots)}</div>
      <div class={'abs s-card' + (found ? ' on' : '')}>
        {found && <>
          <div class="nm">{found.name}</div>
          <div class="arch">{rivalTag(found)}</div>
          <div class="meta">RATING {found.rating[r.id]}</div>
        </>}
      </div>
      <button class="tbtn" style={{ bottom: '110px' }} onClick={() => (screen.value = 'menu')}>CANCEL</button>
    </div>
  );
}
