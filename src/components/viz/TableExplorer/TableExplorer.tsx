import {
  filterText,
  formatValue,
  summaryText,
  type TableResult,
  type TableState,
} from '@/lib/foundations/penguinTable';
import { floatRepr } from '@/lib/foundations/pyValues';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './TableExplorer.module.css';

const HEAD = 5;
const cell = (v: string | number | null) => (v === null ? 'NaN' : typeof v === 'number' ? floatRepr(v) : v);

/**
 * The penguins DataFrame after a filter (its first rows, as df.head() shows them, with pandas' row labels)
 * and the grouped summary, each value with a bar whose length is proportional to it (the number is always
 * printed). Use inside an Experiment made with tableExperiment.
 */
export function TableExplorer() {
  const { state, result } = useExperimentContext<TableState, TableResult>('TableExplorer');
  const { rows, groups } = result;
  const values = groups.map((g) => g.value ?? 0);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const filter = filterText(state);
  const summary = summaryText(state);
  const shown = (v: number | null) => formatValue(v, state.stat);
  const describe =
    groups.length === 0
      ? 'no groups, because no rows are left'
      : groups.map((g) => `${g.key ?? 'all rows'} ${shown(g.value)}`).join(', ');

  return (
    <VizFrame
      title="Penguins table explorer"
      table={
        <VizTable
          caption={summary}
          columns={[
            state.by === 'none' ? 'Rows' : state.by,
            'Rows in group',
            `${state.stat} of ${state.column}`,
          ]}
          rows={groups.map((g) => [g.key ?? 'all rows', g.rows, shown(g.value)])}
        />
      }
      caption={`df keeps ${rows.length} of 344 penguins. ${summary}: ${describe}.${result.droppedKeys ? ` ${result.droppedKeys} rows with a missing ${state.by} are left out of the groups.` : ''}`}
    >
      <div className={s.wrap}>
        <p className={s.code}>
          <span className={s.muted}>df =</span> {filter}
          <br />
          <span className={s.muted}>len(df) =</span> <strong data-row-count>{rows.length}</strong>
        </p>

        <div className={s.scroll}>
          <table className={s.table}>
            <caption className={s.label}>
              df.head({HEAD}){rows.length > HEAD ? `, ${rows.length - HEAD} more rows not shown` : ''}
            </caption>
            <thead>
              <tr>
                <td />
                <th scope="col">species</th>
                <th scope="col">island</th>
                {state.by === 'sex' && <th scope="col">sex</th>}
                <th scope="col">{state.column}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, HEAD).map((r) => (
                <tr key={r.row}>
                  <th scope="row" className={s.muted}>
                    {r.row}
                  </th>
                  <td>{r.species}</td>
                  <td>{r.island}</td>
                  {state.by === 'sex' && <td>{cell(r.sex)}</td>}
                  <td className={s.num}>{cell(r[state.column])}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={state.by === 'sex' ? 5 : 4}>Empty DataFrame: no rows match the filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <p className={s.label}>{summary}</p>
          <ul className={s.bars} aria-live="polite" data-summary>
            {groups.map((g, i) => (
              <li key={g.key ?? 'all'} className={s.bar} data-group={g.key ?? 'all'}>
                <span className={s.key}>{g.key ?? 'all rows'}</span>
                <span className={s.track} aria-hidden>
                  <span
                    className={s.fill}
                    style={{ width: `${(((values[i] ?? 0) - Math.min(min, 0)) / span) * 100}%` }}
                  />
                </span>
                <span className={s.value}>{shown(g.value)}</span>
                <span className={s.muted}>n={g.rows}</span>
              </li>
            ))}
            {groups.length === 0 && <li className={s.muted}>No groups: the filter left no rows.</li>}
          </ul>
          {result.droppedKeys > 0 && (
            <p className={s.note}>
              {result.droppedKeys} row{result.droppedKeys === 1 ? ' has' : 's have'} no {state.by} (NaN) and{' '}
              {result.droppedKeys === 1 ? 'is' : 'are'} left out by groupby.
            </p>
          )}
        </div>
      </div>
    </VizFrame>
  );
}
