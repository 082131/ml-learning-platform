import { NOISES, SIZES, type DataCentricResult, type DataCentricState } from '@/lib/dataops/dataCentric';
import { pyFixed } from '@/lib/practice/pyFormat';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame } from '../VizFrame/VizFrame';
import t from '../SqlQueryTable/DataTable.module.css';
import s from './DataOps.module.css';

/** Accuracy below this is shaded as white; 1.0 is full accent. */
const SHADE_FLOOR = 0.5;
const pct = (noise: number) => `${Math.round(noise * 100)}%`;

/**
 * Test accuracy for every training size and label-noise level at the chosen k, with the current setting
 * outlined and the two neighbouring fixes (more data, cleaner labels) marked. Use inside a dataCentricExperiment.
 */
export function AccuracyGrid() {
  const { state, result } = useExperimentContext<DataCentricState, DataCentricResult>('AccuracyGrid');
  const { current, moreData, cleaner } = result;
  return (
    <VizFrame
      title="Test accuracy: training size × wrong labels"
      caption={
        <>
          Every cell trains a {state.k}-nearest-neighbour model and scores it on 400 clean test points. The
          outlined cell is {pyFixed(current.accuracy, 3)}.
          {moreData && <> Doubling the data gives {pyFixed(moreData.accuracy, 3)}.</>}
          {cleaner && <> Fixing 10 points of label noise gives {pyFixed(cleaner.accuracy, 3)}.</>}
        </>
      }
    >
      <div className={t.scroll} tabIndex={0} role="region" aria-label="Accuracy grid">
        <table className={t.table} data-accuracy-grid>
          <caption>Rows: share of wrong training labels. Columns: training examples.</caption>
          <thead>
            <tr>
              <th scope="col">Wrong labels</th>
              {SIZES.map((n) => (
                <th key={n} scope="col" className={t.num}>
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.grid.map((row, ni) => (
              <tr key={NOISES[ni]}>
                <th scope="row">{pct(NOISES[ni]!)}</th>
                {row.map((c) => {
                  const isCurrent = c === current;
                  const mark = c === moreData ? '→ more data' : c === cleaner ? '↑ cleaner' : undefined;
                  const heat = Math.max(0, (c.accuracy - SHADE_FLOOR) / (1 - SHADE_FLOOR)) * 45;
                  return (
                    <td
                      key={c.n}
                      className={cx(s.heat, isCurrent && s.current)}
                      style={{ ['--heat' as string]: heat.toFixed(1) }}
                      data-cell={`${c.n},${c.noise}`}
                      data-current={isCurrent || undefined}
                      aria-current={isCurrent || undefined}
                    >
                      {pyFixed(c.accuracy, 3)}
                      {mark && <span className={s.marker}>{mark}</span>}
                      {isCurrent && <span className="visually-hidden"> (current setting)</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VizFrame>
  );
}
