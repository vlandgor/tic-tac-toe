import { useRef } from 'preact/hooks';
import { ready, screen, session, TAB_SCREENS, type Screen as ScreenId } from '../state/app';
import { overlay } from '../state/overlays';
import { Stage } from './components/Stage';
import { BottomNav } from './components/BottomNav';
import { Menu } from './screens/Menu';
import { Search } from './screens/Search';
import { Game } from './screens/Game';
import { ShadowScreen } from './screens/ShadowScreen';
import { Modes } from './screens/Modes';
import { Events } from './screens/Events';
import { Ranks } from './screens/Ranks';
import { Onboarding } from './screens/Onboarding';
import { Coach } from './overlays/Coach';
import { Training } from './overlays/Training';
import { Summary } from './overlays/Summary';
import { Away } from './overlays/Away';
import { Dev } from './overlays/Dev';
import { SpiritSheet } from './overlays/SpiritSheet';
import { CustomSheet, ModeSheet } from './overlays/ModeSheet';

function Screen() {
  switch (screen.value) {
    case 'search': return <Search />;
    case 'game': return session.value ? <Game key={session.value.id} sess={session.value} /> : <Menu />;
    case 'shadow': return <ShadowScreen />;
    case 'modes': return <Modes />;
    case 'events': return <Events />;
    case 'ranks': return <Ranks />;
    case 'onboarding': return <Onboarding />;
    default: return <Menu />;
  }
}

function Overlay() {
  const o = overlay.value;
  if (!o) return null;
  switch (o.kind) {
    case 'coach': return <Coach items={o.items} resolve={o.resolve} />;
    case 'train': return <Training rules={o.rules} epoch={o.epoch} epochs={o.epochs} loss={o.loss} />;
    case 'summary': return <Summary data={o.data} />;
    case 'away': return <Away results={o.results} />;
    case 'spirit': return <SpiritSheet />;
    case 'modeSelect': return <ModeSheet />;
    case 'custom': return <CustomSheet />;
    case 'dev': return <Dev />;
  }
}

/** tabs slide in the direction you moved; game/search rise; everything else fades */
function direction(from: ScreenId | null, to: ScreenId): string {
  if (!from) return 'in-fade';
  const a = TAB_SCREENS.indexOf(from), b = TAB_SCREENS.indexOf(to);
  if (a >= 0 && b >= 0) return b > a ? 'in-r' : 'in-l';
  if (to === 'game' || to === 'search') return 'in-up';
  return 'in-fade';
}

export function App() {
  const prev = useRef<ScreenId | null>(null);
  const dir = useRef('in-fade');
  const cur = screen.value;
  if (prev.current !== cur) { dir.current = direction(prev.current, cur); prev.current = cur; }
  const key = cur === 'game' ? 'game-' + (session.value?.id ?? 0) : cur;

  return (
    <Stage>
      {ready.value ? <>
        <div class={'scr ' + dir.current} key={key}><Screen /></div>
        {TAB_SCREENS.includes(cur) && <BottomNav />}
        <Overlay />
      </> : null}
    </Stage>
  );
}
