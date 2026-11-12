import { psiBand, type DriftResult, type DriftState } from '@/lib/dataops/drift';
import { pyFixed } from '@/lib/practice/pyFormat';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import t from '../SqlQueryTable/DataTable.module.css';
import s from './DataOps.module.css';

/** The largest share in any bin is drawn at this fraction of the track. */
const MAX_SHARE = 0.25;
const width = (share: number) => `${Math.min(1, share / MAX_SHARE) * 100}%`;

/**
 * Baseline and serving shares in each of the 10 equal-count baseline bins, with each bin's PSI term. Use inside a
 * driftExperiment.
 */
export function DriftBars() {
  const { state, result: r } = useExperimentContext<DriftState, DriftResult>('DriftBars');
  const term = (b: { expected: number; actual: number }) => (b.actual - b.expected) * Math.log(b.actual / b.expected);
  return (
    <VizFrame
      title="Baseline against serving, per bin"
      table={
        <VizTable
          caption="Shares per bin"
          columns={['Bin', 'Baseline share', 'Serving share', 'PSI term']}
          rows={r.bins.map((b, i) => [i + 1, pyFixed(b.expected, 3), pyFixed(b.actual, 3), pyFixed(term(b), 4)])}
        />
      }
      caption={
        <>
          Each baseline bin holds 10% of the 1,000 training values. With {state.window.toLocaleString('en-US')}{' '}
          serving values shifted by +{state.shift}, the bins sum to PSI = {pyFixed(r.psi, 3)} ({psiBand(r.psi)}), and
          the KS test gives D = {pyFixed(r.d, 4)}, p {r.p < 0.0001 ? '< 0.0001' : `= ${pyFixed(r.p, 4)}`}.
        </>
      }
    >
      <ul className={s.bars} data-drift-bins data-psi={pyFixed(r.psi, 3)}>
        {r.bins.map((b, i) => (
          <li key={i} className={s.barRow}>
            <span>bin {i + 1}</span>
            <span className={s.barPair}>
              <span className={s.barA} style={{ width: width(b.expected) }} />
              <span className={s.barB} style={{ width: width(b.actual) }} data-bad={term(b) > 0.02} />
            </span>
            <span className={t.num}>{pyFixed(b.actual * 100, 1)}%</span>
          </li>
        ))}
      </ul>
      <p className={s.legendRow}>
        <span>
          <span className={`${s.swatch} ${s.barA}`} /> baseline (training)
        </span>
        <span>
          <span className={`${s.swatch} ${s.barB}`} /> serving window
        </span>
        <span>red: bin adds more than 0.02 to PSI</span>
      </p>
    </VizFrame>
  );
}
