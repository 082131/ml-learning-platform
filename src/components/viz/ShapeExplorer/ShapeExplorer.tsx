import {
  arrayText,
  indexText,
  tupleText,
  type IndexResult,
  type IndexState,
} from '@/lib/foundations/arrayIndexing';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { cx } from '@/components/ui';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './ShapeExplorer.module.css';

/**
 * a = np.arange(12) in the chosen shape, with the cells an index picks marked (border, weight and a
 * dot, not color alone). Below it, the same 12 numbers in memory order, which reshape never changes.
 * Use inside an Experiment made with indexExperiment.
 */
export function ShapeExplorer() {
  const { state, result } = useExperimentContext<IndexState, IndexResult>('ShapeExplorer');
  const { grid, shape } = result;
  const is2D = shape.length === 2;
  const picked = new Set(result.cells.map(([r, c]) => r * grid[0]!.length + c));
  const expr = indexText(state.kind, state.i, state.j);
  const where = (v: number) => (is2D ? `a[${Math.floor(v / shape[1]!)}, ${v % shape[1]!}]` : `a[${v}]`);

  return (
    <VizFrame
      title="Array shape and indexing"
      table={
        <VizTable
          caption={`Every element of a = ${arrayText(state.shape)}`}
          columns={['Element', 'Value', `Picked by ${expr}`]}
          rows={grid.flat().map((v) => [where(v), v, picked.has(v) ? 'yes' : 'no'])}
        />
      }
      caption={
        result.ok
          ? `a has shape ${tupleText(shape)}: ${is2D ? `${shape[0]} rows (axis 0) and ${shape[1]} columns (axis 1)` : '12 positions along axis 0'}. ${expr} picks ${result.cells.length} number${result.cells.length === 1 ? '' : 's'} and has shape ${tupleText(result.outShape)}.`
          : `a has shape ${tupleText(shape)}, so ${expr} fails: ${result.error}`
      }
    >
      <div className={s.wrap}>
        <table className={s.grid} data-shape={tupleText(shape)}>
          <caption className={s.label}>
            a = {arrayText(state.shape)} · shape {tupleText(shape)}
          </caption>
          {is2D && (
            <thead>
              <tr>
                <td className={s.axis}>axis 1 →</td>
                {grid[0]!.map((_, c) => (
                  <th key={c} scope="col" className={s.index}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {grid.map((row, r) => (
              <tr key={r}>
                {is2D && (
                  <th scope="row" className={s.index}>
                    {r}
                  </th>
                )}
                {row.map((v) => (
                  <td
                    key={v}
                    className={cx(s.cell, picked.has(v) && s.picked)}
                    data-value={v}
                    data-picked={picked.has(v) || undefined}
                  >
                    {!is2D && <span className={s.position}>{v}</span>}
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {is2D && <p className={s.axisDown}>↓ axis 0 (rows)</p>}

        <p className={s.result} aria-live="polite" data-index-result>
          {result.ok ? (
            <>
              <span className={s.muted}>{expr} =</span> {result.printed}
              <span className={s.muted}> · shape {tupleText(result.outShape)}</span>
            </>
          ) : (
            <span className={s.error}>{result.error}</span>
          )}
        </p>

        <div>
          <p className={s.label}>The same 12 numbers in memory, in the order reshape reads them</p>
          <ol className={s.memory} aria-label="a in memory order">
            {grid.flat().map((v) => (
              <li key={v} className={cx(s.slot, picked.has(v) && s.picked)}>
                {v}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </VizFrame>
  );
}
