import { ready, screen, session } from '../state/app';
import { overlay } from '../state/overlays';
import { Stage } from './components/Stage';
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
    case 'dev': return <Dev />;
  }
}

export function App() {
  return (
    <Stage>
      {ready.value ? <><Screen /><Overlay /></> : null}
    </Stage>
  );
}
