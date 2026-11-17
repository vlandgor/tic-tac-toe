import { AWAKE_STAGE, STAGES, type Stage } from '../../core/insight';
import { useMounted } from '../feel/motion';

/**
 * The spirit's growth as a row of segments — one per step between stages.
 * Passed steps are full, the current one fills with progress, the rest wait.
 * Blue while it's waking, orange once it's awake and playing as you.
 */
export function StagePips({ stage, width = 72, height = 3 }: { stage: Stage; width?: number; height?: number }) {
  const steps = STAGES.length - 1;
  const mounted = useMounted(120);
  const color = stage.idx >= AWAKE_STAGE ? 'var(--orange)' : 'var(--blue)';

  return (
    <div class="pips-row" style={{ width: width + 'px', height: height + 'px' }}>
      {Array.from({ length: steps }, (_, i) => {
        const fill = stage.final || i < stage.idx ? 1 : i === stage.idx ? stage.progress : 0;
        return (
          <i key={i}>
            <b style={{ width: (mounted ? fill * 100 : 0) + '%', background: color }} />
          </i>
        );
      })}
    </div>
  );
}
