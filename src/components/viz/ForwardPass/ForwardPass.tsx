import {
  describeUnit,
  forwardShapes,
  LAYER_NAMES,
  selectUnit,
  setParam,
  SIZES,
  unitName,
  VALUE_LIMITS,
  type ForwardResult,
  type ForwardState,
  type ParamName,
} from '@/lib/deep/forwardPass';
import { formatNumber as n } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { MatrixGrid } from '../MatrixGrid/MatrixGrid';
import { Choice, NetworkDiagram, type DiagramEdge } from '../NetworkDiagram/NetworkDiagram';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './ForwardPass.module.css';

/**
 * The 2-3-1 network for one example of the batch. Select a layer and a unit to see its arithmetic,
 * its incoming weights and, in a LayerCode block, its code lines. Use with forwardExperiment.
 */
export function ForwardPass() {
  const { state, result, update } = useExperimentContext<ForwardState, ForwardResult>('ForwardPass');
  const { layer, unit, example: e } = state;
  const Ws = [state.W1, state.W2];
  const edges: DiagramEdge[] = Ws.flatMap((W, k) =>
    W.flatMap((row, i) =>
      row.map((w, j) => {
        const into = layer === k + 1 && unit === j;
        return {
          layer: k + 1,
          from: i,
          to: j,
          weight: w,
          active: into,
          label: into ? `w=${n(w)}` : undefined,
        };
      }),
    ),
  );
  const layers = SIZES.map((size, l) => ({
    name: LAYER_NAMES[l]!,
    units: Array.from({ length: size }, (_, i) => ({
      label: unitName(l, i),
      value: n(result.A[l]![e]![i]!),
    })),
  }));
  const d = describeUnit(state, result, layer, unit, e);
  const edit = (name: ParamName) => (i: number, j: number, v: number) =>
    update((st) => setParam(st, name, i, j, v));

  return (
    <div className={s.layout} data-forward-layer={layer} data-forward-unit={unit} data-forward-example={e}>
      <div className={s.pickers}>
        <Choice
          label="Layer"
          value={layer}
          options={LAYER_NAMES.map((name, l) => ({ value: l, label: `${name} (${SIZES[l]})` }))}
          onChange={(l) => update((st) => selectUnit(st, l, st.unit))}
        />
        <Choice
          label="Unit"
          value={unit}
          options={Array.from({ length: SIZES[layer]! }, (_, i) => ({ value: i, label: unitName(layer, i) }))}
          onChange={(i) => update((st) => selectUnit(st, st.layer, i))}
        />
        <Choice
          label="Example"
          value={e}
          options={Array.from({ length: state.batch }, (_, i) => ({ value: i, label: `row ${i}` }))}
          onChange={(i) => update((st) => ({ ...st, example: i }))}
        />
      </div>
      <VizFrame
        title={`Forward pass, example row ${e}`}
        table={
          <VizTable
            caption="Every unit's value for this example"
            columns={['Unit', 'Layer', 'Value']}
            rows={layers.flatMap((ly) => ly.units.map((u) => [u.label, ly.name, u.value]))}
          />
        }
        caption={`Values for row ${e} of X. Thicker lines are larger weights; dashed lines are negative. The selected unit's incoming weights are labeled.`}
      >
        <NetworkDiagram
          layers={layers}
          edges={edges}
          selected={{ layer, unit }}
          flow="forward"
          label={`2-3-1 network for example ${e}: inputs ${layers[0]!.units.map((u) => u.value).join(', ')}; output ${layers[2]!.units[0]!.value}`}
        />
      </VizFrame>
      <p className={s.arithmetic} aria-live="polite" data-forward-arithmetic>
        <span className={s.label}>
          {LAYER_NAMES[layer]}, {unitName(layer, unit)}, example row {e}
        </span>
        <span className={s.math}>{d.sum}</span>
        {d.act && <span className={s.math}>{d.act}</span>}
      </p>
      <ol className={s.shapes} aria-label="Shapes at every stage" data-forward-shapes>
        {forwardShapes(state.batch).map((st) => (
          <li key={st.name} data-selected={st.layer === layer || undefined}>
            <span className={s.marker} aria-hidden="true">
              {st.layer === layer ? '▸' : ''}
            </span>
            <code>
              {st.name} = {st.expr}
              {st.layer === layer && <span className="visually-hidden"> (selected layer)</span>}
            </code>
            <span className={s.shape}>
              {st.shapes} → <strong>{st.result}</strong>
            </span>
          </li>
        ))}
      </ol>
      <div className={s.weights} role="group" aria-label="Weights and biases (editable)">
        <MatrixGrid
          name="W1"
          values={state.W1}
          limits={VALUE_LIMITS}
          onChange={edit('W1')}
          highlightCols={layer === 1 ? [unit] : []}
        />
        <MatrixGrid
          name="b1"
          values={[state.b1]}
          limits={VALUE_LIMITS}
          onChange={edit('b1')}
          caption="shape (3,)"
          highlightCols={layer === 1 ? [unit] : []}
        />
        <MatrixGrid
          name="W2"
          values={state.W2}
          limits={VALUE_LIMITS}
          onChange={edit('W2')}
          highlightCols={layer === 2 ? [0] : []}
        />
        <MatrixGrid
          name="b2"
          values={[state.b2]}
          limits={VALUE_LIMITS}
          onChange={edit('b2')}
          caption="shape (1,)"
          highlightCols={layer === 2 ? [0] : []}
        />
      </div>
    </div>
  );
}
