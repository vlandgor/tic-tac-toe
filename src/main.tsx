import { render } from 'preact';
import { App } from './ui/App';
import { boot } from './state/flows';
import { installGlobalFeel } from './ui/feel';
import './ui/styles/global.css';

render(<App />, document.getElementById('root')!);
void boot();
installGlobalFeel();

// installable + offline. Fails silently where service workers aren't allowed.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
