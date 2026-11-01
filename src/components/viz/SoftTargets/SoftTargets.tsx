import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { DigitsModel } from '@/lib/inference/digitsModel';
import type { TempResult, TempState } from '@/lib/inference/prune';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SoftTargets.module.css';

/** One test image and the teacher's probabilities at T = 1 and at the chosen temperature. */
export function SoftTargets({ model }: { model: DigitsModel }) {
  const { state, result: r } = useExperimentContext<TempState, TempResult>('SoftTargets');
  const pixels = model.test.X[state.image]!;
  const pct = (p: number) => `${(100 * p).toFixed(1)}%`;
  return (
    <VizFrame
      title={`Teacher outputs for test image ${state.image}`}
      badge={<Badge tone="neutral">Computed in your browser</Badge>}
      caption={`True digit ${r.label}. At T = 1 the teacher puts ${pct(r.hardProbs[r.predicted]!)} on ${r.predicted}; at T = ${state.temperature}, ${pct(r.probs[r.predicted]!)}. The softened outputs show which other digits the teacher finds similar, which a one-hot label cannot.`}
      table={
        <VizTable
          caption="Probabilities by digit"
          columns={['Digit', 'T = 1', `T = ${state.temperature}`]}
          rows={r.probs.map((p, d) => [d, r.hardProbs[d]!.toFixed(3), p.toFixed(3)])}
        />
      }
    >
      <div className={s.layout} data-soft-top={r.probs[r.predicted]!.toFixed(3)}>
        <svg className={s.image} viewBox="0 0 8 8" role="img" aria-label={`8 by 8 image of the digit ${r.label}`}>
          {pixels.map((p, k) => (
            <rect key={k} x={k % 8} y={Math.floor(k / 8)} width={1} height={1} className={s.px} style={{ fillOpacity: p / 16 }} />
          ))}
        </svg>
        <ol className={s.bars} aria-label="Probability per digit">
          {r.probs.map((p, d) => (
            <li key={d}>
              <span className={s.digit}>{d}</span>
              <span className={s.track} aria-hidden="true">
                <span className={s.hard} style={{ width: pct(r.hardProbs[d]!) }} />
                <span className={s.soft} style={{ width: pct(p) }} />
              </span>
              <span className={s.value}>{p.toFixed(3)}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className={s.legend}>
        <span className={s.keyHard} aria-hidden="true" /> T = 1 <span className={s.keySoft} aria-hidden="true" /> T ={' '}
        {state.temperature} (the number shown)
      </p>
    </VizFrame>
  );
}
