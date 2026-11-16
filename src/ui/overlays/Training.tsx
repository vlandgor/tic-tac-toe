import { useEffect } from 'preact/hooks';
import type { RuleSet } from '../../core/rules/types';
import { feel } from '../feel';

export function Training({ rules, epoch, epochs, loss }: { rules: RuleSet; epoch: number; epochs: number; loss: number }) {
  useEffect(() => {
    if (epoch <= 0) return;
    if (epoch >= epochs) feel.trainDone(); else feel.trainTick(epoch, epochs);
  }, [epoch]);
  return (
    <div class="ov" style={{ zIndex: 50 }}>
      <div class="abs center t-title">TRAINING SHADOW</div>
      <div class="hair" style={{ left: '50px', top: '446px', width: '320px', height: '2px' }} />
      <div class="abs t-bar" style={{ width: (320 * epoch) / epochs + 'px' }} />
      <div class="abs center t-meta">
        {rules.name} MODEL&nbsp;&nbsp;·&nbsp;&nbsp;EPOCH {epoch}/{epochs}&nbsp;&nbsp;·&nbsp;&nbsp;LOSS {loss.toFixed(3)}
      </div>
    </div>
  );
}
