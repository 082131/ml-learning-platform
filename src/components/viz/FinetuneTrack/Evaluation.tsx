import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { GateResult, GateState, WinResult, WinState } from '@/lib/finetune/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './FinetuneTrack.module.css';

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** The win rate as a point with its 95% interval, against the 50% line. */
export function WinRateView() {
  const { state, result: r } = useExperimentContext<WinState, WinResult>('WinRateView');
  return (
    <VizFrame
      title="Win rate against the base model"
      caption={`${state.wins} wins, ${state.losses} losses, ${state.ties} ties: ${pct(r.rate)}, 95% interval ${pct(r.low)} to ${pct(r.high)}. ${r.verdict === 'better' ? 'The whole interval is above 50%.' : r.verdict === 'worse' ? 'The whole interval is below 50%.' : 'The interval includes 50%, so this could be a coin flip.'} About ${r.neededFor5} comparisons give ±5 points.`}
      table={<VizTable caption="Win rate" columns={['n', 'win rate', 'low', 'high']} rows={[[r.n, pct(r.rate), pct(r.low), pct(r.high)]]} />}
    >
      <div className={s.panel} data-verdict={r.verdict} data-low={r.low.toFixed(3)}>
        <p className={s.verdict} data-ok={r.verdict === 'better'}>
          {r.verdict === 'better' ? 'Better than the base model' : r.verdict === 'worse' ? 'Worse than the base model' : 'Not distinguishable from 50%'}
        </p>
        <div className={s.barTrack} style={{ height: 26 }} aria-hidden="true">
          <span className={s.barFill} data-tone="muted" style={{ left: `${r.low * 100}%`, width: `${(r.high - r.low) * 100}%` }} />
          <span className={s.barMarker} style={{ left: '50%' }} />
          <span className={s.barMarker} style={{ left: `${r.rate * 100}%`, width: 4, background: 'var(--accent)' }} />
        </div>
        <p className={s.muted}>0% to 100%. Grey: 95% interval. Blue: the measured win rate. Dark: 50%.</p>
      </div>
    </VizFrame>
  );
}

/** Each benchmark's change and whether it passes its tolerance. */
export function GateView() {
  const { result: r } = useExperimentContext<GateState, GateResult>('GateView');
  return (
    <VizFrame
      title="Release gate"
      caption={`${r.pass ? 'Every row passes.' : `Fails on ${r.rows.filter((x) => !x.pass).length} rows.`}${r.suspicious ? ' The target task jumped by 20 points or more: check the training data for test items before trusting it.' : ''}`}
      table={<VizTable caption="Benchmarks" columns={['benchmark', 'base', 'candidate', 'change', 'rule', 'result']} rows={r.rows.map((x) => [x.label, x.base, x.candidate, x.delta, x.tolerance < 0 ? `gain ≥ ${-x.tolerance}` : `drop ≤ ${x.tolerance}`, x.pass ? 'pass' : 'fail'])} />}
    >
      <ul className={s.list} data-pass={r.pass} data-suspicious={r.suspicious}>
        {r.rows.map((x) => (
          <li key={x.id} className={s.row}>
            <span>
              {x.label}{' '}
              <span className={s.muted}>
                {x.base} → {x.candidate} ({x.delta > 0 ? '+' : ''}
                {x.delta}; {x.tolerance < 0 ? `needs +${-x.tolerance}` : `may drop ${x.tolerance}`})
              </span>
            </span>
            <span className={s.tag} data-tone={x.pass ? 'ok' : 'err'}>
              {x.pass ? 'pass' : 'fail'}
            </span>
          </li>
        ))}
      </ul>
      {r.suspicious && (
        <p className={s.verdict} data-ok="false">
          Too good to be true: check for contamination.
        </p>
      )}
    </VizFrame>
  );
}
