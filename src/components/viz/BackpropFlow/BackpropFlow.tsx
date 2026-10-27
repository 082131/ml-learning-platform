import {
  buildStages,
  diagramAt,
  PARAM_LIMITS,
  setBackpropParam,
  type BackpropParam,
  type BackpropResult,
  type BackpropState,
} from '@/lib/deep/backprop';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Button } from '@/components/ui';
import f from '@/components/ui/Field.module.css';
import { MatrixGrid } from '../MatrixGrid/MatrixGrid';
import { NetworkDiagram } from '../NetworkDiagram/NetworkDiagram';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './BackpropFlow.module.css';

const PHASE_LABEL = { forward: 'Forward pass', backward: 'Backward pass', update: 'Update' } as const;

/**
 * The 2-2-1 network, walked through one computation at a time: the forward pass fills in the values,
 * the backward pass carries gradients (g) from the loss back to every weight, then one update step.
 */
export function BackpropFlow() {
  const { state, result, update } = useExperimentContext<BackpropState, BackpropResult>('BackpropFlow');
  const stages = buildStages(state, result);
  const k = Math.min(state.stage, stages.length - 1);
  const stage = stages[k]!;
  const d = diagramAt(state, result, stages, k);
  const go = (i: number) => update((st) => ({ ...st, stage: Math.max(0, Math.min(i, stages.length - 1)) }));
  const edit = (name: BackpropParam) => (i: number, j: number, v: number) =>
    update((st) => setBackpropParam(st, name, i, j, v));

  return (
    <div className={s.layout} data-backprop-stage={stage.id} data-backprop-phase={stage.phase}>
      <div className={s.stepper} role="group" aria-label="Walk-through step">
        <Button size="sm" onClick={() => go(k - 1)} disabled={k === 0}>
          ◀ Previous
        </Button>
        <Button size="sm" variant="primary" onClick={() => go(k + 1)} disabled={k === stages.length - 1}>
          Next ▶
        </Button>
        <label className={`${f.field} ${s.jump}`}>
          <span className={f.label}>
            Step {k + 1} of {stages.length}
          </span>
          <select className={f.input} value={k} onChange={(e) => go(Number(e.target.value))}>
            {stages.map((st, i) => (
              <option key={st.id} value={i}>
                {i + 1}. {PHASE_LABEL[st.phase]}: {st.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <VizFrame
        title={`${PHASE_LABEL[stage.phase]}: ${stage.title}`}
        table={
          <VizTable
            caption="Values and gradients known at this step"
            columns={['Unit', 'Value', 'Gradient g = ∂L/∂z']}
            rows={d.layers.flatMap((ly) => ly.units.map((u) => [u.label, u.value ?? '', u.sub ?? '']))}
          />
        }
        caption={
          stage.phase === 'backward'
            ? 'Arrows point backwards: each gradient is built from the one to its right. g under a unit is ∂L/∂z for that unit; g on an edge is ∂L/∂w for that weight.'
            : 'Arrows point forwards: values not computed yet show "?". Edge labels show weights (w) or, after the update, their new values (→).'
        }
      >
        <NetworkDiagram
          layers={d.layers}
          edges={d.edges}
          activeUnits={stage.units}
          flow={d.flow}
          label={`2-2-1 network at step ${k + 1}: ${stage.title}`}
        />
      </VizFrame>
      <div className={s.arithmetic} aria-live="polite" data-backprop-arithmetic>
        <span className={s.label}>
          Line {stage.line} · {stage.title}
        </span>
        <span className={s.formula}>{stage.formula}</span>
        {stage.arithmetic.map((line) => (
          <span key={line} className={s.math}>
            {line}
          </span>
        ))}
      </div>
      <div className={s.weights} role="group" aria-label="Weights and biases (editable)">
        <MatrixGrid name="W1" values={state.W1} limits={PARAM_LIMITS} onChange={edit('W1')} />
        <MatrixGrid
          name="b1"
          values={[state.b1]}
          limits={PARAM_LIMITS}
          onChange={edit('b1')}
          caption="shape (2,)"
        />
        <MatrixGrid name="W2" values={state.W2} limits={PARAM_LIMITS} onChange={edit('W2')} />
        <MatrixGrid
          name="b2"
          values={[state.b2]}
          limits={PARAM_LIMITS}
          onChange={edit('b2')}
          caption="shape (1,)"
        />
      </div>
    </div>
  );
}
