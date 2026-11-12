import { ITEMS, type LabelErrorResult, type LabelErrorState } from '@/lib/dataops/labelErrors';
import { pyFixed } from '@/lib/practice/pyFormat';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './DataOps.module.css';

const pct = (x: number) => `${x * 100}%`;

/** For each given label, the range of P(dog) in which an item gets flagged under the chosen method. */
function flagZone(state: LabelErrorState, r: LabelErrorResult, given: number): [number, number] {
  if (r.thresholds) {
    const [tCat, tDog] = r.thresholds;
    return given === 0 ? [tDog, 1] : [0, 1 - tCat];
  }
  const c = Number(state.method);
  return given === 0 ? [1 - c, 1] : [0, c];
}

/**
 * Two strips of out-of-fold P(dog): items labeled cat and items labeled dog. The shaded zone is where the method
 * flags an item; red rings mark the labels an expert found wrong. Use inside a labelErrorsExperiment.
 */
export function LabelErrorStrips() {
  const { state, result: r } = useExperimentContext<LabelErrorState, LabelErrorResult>('LabelErrorStrips');
  const flagged = new Set(r.flags.map((f) => f.index));
  const wasted = r.flags.filter((f) => !f.reallyWrong).length;
  return (
    <VizFrame
      title="Where the audit looks"
      table={
        <VizTable
          caption="Items, probabilities and flags"
          columns={['Item', 'Labeled', 'P(dog)', 'Flagged', 'Expert review']}
          rows={ITEMS.map(([g, p, t], i) => [
            i,
            g ? 'dog' : 'cat',
            pyFixed(p, 2),
            flagged.has(i) ? 'yes' : 'no',
            g === t ? 'label right' : 'label wrong',
          ])}
        />
      }
      caption={
        <>
          {r.flags.length} items flagged, {r.flags.length - wasted} of them really mislabeled (precision{' '}
          {pyFixed(r.precision, 2)}); {Math.round(r.recall * r.knownErrors)} of the {r.knownErrors} known errors
          found (recall {pyFixed(r.recall, 2)}).
          {r.thresholds &&
            ` Thresholds: cat ${pyFixed(r.thresholds[0], 3)}, dog ${pyFixed(r.thresholds[1], 3)}.`}
        </>
      }
    >
      <ul className={s.strips}>
        {[0, 1].map((given) => {
          const [lo, hi] = flagZone(state, r, given);
          return (
            <li key={given}>
              <span className={s.stripLabel}>Labeled {given ? 'dog' : 'cat'}: position = model’s P(dog)</span>
              <div className={s.strip}>
                <span className={s.zone} style={{ left: pct(lo), width: pct(hi - lo) }} aria-hidden="true" />
                {ITEMS.map(([g, p, t], i) =>
                  g !== given ? null : (
                    <span
                      key={i}
                      className={s.dot}
                      style={{ left: pct(p), top: `${6 + (i % 3) * 10}px` }}
                      data-item={i}
                      data-flagged={flagged.has(i)}
                      data-wrong={g !== t}
                      title={`item ${i}: P(dog) ${pyFixed(p, 2)}${flagged.has(i) ? ', flagged' : ''}${g !== t ? ', label wrong' : ''}`}
                    />
                  ),
                )}
              </div>
              <div className={s.axis} aria-hidden="true">
                <span>0</span>
                <span>0.5</span>
                <span>1</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className={s.legendRow}>
        <span>
          <span className={`${s.key} ${s.keyFlag}`} />
          flagged
        </span>
        <span>
          <span className={`${s.key} ${s.keyWrong}`} />
          label wrong (expert)
        </span>
        <span>shaded: flag zone</span>
      </p>
    </VizFrame>
  );
}
