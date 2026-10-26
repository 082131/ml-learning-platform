import {
  tupleText,
  valuesOf,
  type BroadcastResult,
  type BroadcastState,
} from '@/lib/foundations/broadcasting';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { cx } from '@/components/ui';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './BroadcastViz.module.css';

const RULE_TEXT = {
  equal: 'equal',
  'stretch A': 'A stretched',
  'stretch B': 'B stretched',
  mismatch: '✗ mismatch',
} as const;

const sizeNote = (from: number[], to: number[]) =>
  tupleText(from) === tupleText(to) ? tupleText(to) : `${tupleText(from)} stretched to ${tupleText(to)}`;

function Grid(props: { name: string; values: number[][]; copy?: boolean[][]; shape: string }) {
  return (
    <div className={s.block}>
      <p className={s.name}>
        {props.name} <span className={s.muted}>{props.shape}</span>
      </p>
      <table className={s.grid} data-grid={props.name}>
        <tbody>
          {props.values.map((row, r) => (
            <tr key={r}>
              {row.map((v, c) => {
                const copy = props.copy?.[r]?.[c];
                return (
                  <td key={c} className={cx(s.cell, copy && s.copy)} data-copy={copy || undefined}>
                    {v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * C = A + B with NumPy's broadcasting: shapes are lined up from the right and every axis must be equal or
 * have size 1. Values copied by stretching are drawn dashed and lighter (and listed in the table view).
 * Use inside an Experiment made with broadcastExperiment.
 */
export function BroadcastViz() {
  const { state, result } = useExperimentContext<BroadcastState, BroadcastResult>('BroadcastViz');
  const n = result.axes.length;
  const plain = state.b === '';
  const bName = plain ? 'B = 10' : 'B';

  const tableRows = result.ok
    ? result.cGrid.flatMap((row, r) =>
        row.map((v, c) => [
          result.shape.length === 2 ? `C[${r}, ${c}]` : `C[${c}]`,
          `${result.aGrid[r]![c]}${result.aCopy[r]![c] ? ' (copy)' : ''}`,
          `${result.bGrid[r]![c]}${result.bCopy[r]![c] ? ' (copy)' : ''}`,
          v,
        ]),
      )
    : [];

  return (
    <VizFrame
      title="Broadcasting A + B"
      table={
        result.ok ? (
          <VizTable
            caption="Every element of C = A + B"
            columns={['Element', 'From A', 'From B', 'Sum']}
            rows={tableRows}
          />
        ) : (
          <VizTable
            caption="Shapes lined up from the right"
            columns={['Axis (from the right)', 'A', 'B', 'Rule']}
            rows={result.axes.map((ax, k) => [n - k, ax.a ?? '-', ax.b ?? '-', RULE_TEXT[ax.rule]])}
          />
        )
      }
      caption={
        result.ok
          ? `A has shape ${tupleText(result.aShape)} and B ${plain ? 'is a single number' : `has shape ${tupleText(result.bShape)}`}. Every axis matches or has size 1, so NumPy stretches the size-1 axes and C has shape ${tupleText(result.shape)}. Dashed values are copies; NumPy reuses them without copying memory.`
          : `A has shape ${tupleText(result.aShape)} and B has shape ${tupleText(result.bShape)}. Lined up from the right, one axis has two different sizes and neither is 1, so NumPy raises an error.`
      }
    >
      <div className={s.wrap}>
        <table className={s.align} aria-label="Shapes lined up from the right">
          <thead>
            <tr>
              <td />
              {result.axes.map((_, k) => (
                <th key={k} scope="col">
                  axis −{n - k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">A</th>
              {result.axes.map((ax, k) => (
                <td key={k}>{ax.a ?? '·'}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">B</th>
              {result.axes.map((ax, k) => (
                <td key={k}>{ax.b ?? '·'}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">rule</th>
              {result.axes.map((ax, k) => (
                <td key={k} className={cx(ax.rule === 'mismatch' && s.bad)} data-rule={ax.rule}>
                  {RULE_TEXT[ax.rule]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {result.ok ? (
          <div className={s.sum}>
            <Grid
              name="A"
              values={result.aGrid}
              copy={result.aCopy}
              shape={sizeNote(result.aShape, result.shape)}
            />
            <span className={s.op} aria-hidden>
              +
            </span>
            <Grid
              name={bName}
              values={result.bGrid}
              copy={result.bCopy}
              shape={sizeNote(result.bShape, result.shape)}
            />
            <span className={s.op} aria-hidden>
              =
            </span>
            <Grid name="C" values={result.cGrid} shape={tupleText(result.shape)} />
          </div>
        ) : (
          <div className={s.sum}>
            <Grid name="A" values={valuesOf(result.aShape, 0, 1)} shape={tupleText(result.aShape)} />
            <Grid name="B" values={valuesOf(result.bShape, 10, 10)} shape={tupleText(result.bShape)} />
          </div>
        )}

        <p className={s.result} aria-live="polite" data-broadcast-result>
          {result.ok ? (
            `C.shape = ${tupleText(result.shape)}`
          ) : (
            <span className={s.error}>{result.error}</span>
          )}
        </p>
      </div>
    </VizFrame>
  );
}
