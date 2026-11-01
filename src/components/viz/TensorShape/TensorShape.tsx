import { OPS, type TensorResult, type TensorState } from '@/lib/linalg/tensor';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { MatrixGrid } from '../MatrixGrid/MatrixGrid';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './TensorShape.module.css';

const tuple = (shape: readonly number[]) => `(${shape.join(', ')})`;

/**
 * A 3-D tensor x drawn as one grid per batch item, and the result y of reshaping or transposing it.
 * Selecting an entry of x highlights where it lands in y. Use inside an Experiment made with tensorExperiment.
 */
export function TensorShape() {
  const { state, result, update } = useExperimentContext<TensorState, TensorResult>('TensorShape');
  const { shape, focus, op } = state;
  const [fi, fj, fk] = focus;
  const yIs3D = result.outShape.length === 3;
  const select = (i: number) => (j: number, k: number) => update((st) => ({ ...st, focus: [i, j, k] }));
  const rows = result.x.flatMap((m, i) =>
    m.flatMap((row, j) =>
      row.map((v, k) => [`x[${i}, ${j}, ${k}]`, v, `y[${result.destOf(i, j, k).join(', ')}]`]),
    ),
  );

  return (
    <VizFrame
      title="Tensor shapes"
      table={
        <VizTable
          caption="Where every entry of x goes"
          columns={['Entry of x', 'Value', 'In y']}
          rows={rows}
        />
      }
      caption={`x has shape ${tuple(shape)} and y = ${OPS[op].code(shape)} has shape ${tuple(result.outShape)}. Both hold the same ${result.x.flat(2).length} numbers.`}
    >
      <div className={s.layout}>
        <div className={s.side}>
          <p className={s.label}>
            x · shape {tuple(shape)} · {shape[0]} item{shape[0] === 1 ? '' : 's'} along axis 0
          </p>
          <div className={s.stack}>
            {result.x.map((m, i) => (
              <MatrixGrid
                key={i}
                name={`x[${i}]`}
                values={m}
                selected={i === fi ? [fj!, fk!] : undefined}
                onSelect={select(i)}
                caption={`shape ${tuple([shape[1], shape[2]])}`}
              />
            ))}
          </div>
        </div>
        <div className={s.side}>
          <p className={s.label}>
            y = {OPS[op].code(shape)} · shape {tuple(result.outShape)}
          </p>
          <div className={s.stack}>
            {yIs3D ? (
              (result.y as number[][][]).map((m, i) => (
                <MatrixGrid
                  key={i}
                  name={`y[${i}]`}
                  values={m}
                  highlightCells={i === result.dest[0] ? [[result.dest[1]!, result.dest[2]!]] : []}
                  caption={`shape ${tuple([m.length, m[0]!.length])}`}
                />
              ))
            ) : (
              <MatrixGrid
                name="y"
                values={result.y as number[][]}
                highlightCells={[[result.dest[0]!, result.dest[1]!]]}
              />
            )}
          </div>
        </div>
      </div>
      <p className={s.note} aria-live="polite" data-tensor-entry={focus.join(',')}>
        x[{focus.join(', ')}] = {result.x[fi!]![fj!]![fk!]} lands at y[{result.dest.join(', ')}]
        (highlighted).
      </p>
    </VizFrame>
  );
}
