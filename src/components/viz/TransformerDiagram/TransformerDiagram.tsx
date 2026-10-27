import { EDGES, shapeText, stagePosition, thousands } from '@/lib/deep/transformer';
import type { TransformerResult, TransformerState } from '@/lib/deep/transformerExperiment';
import type { FlowNode } from '@/lib/viz/flow';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { FlowDiagram } from '../FlowDiagram/FlowDiagram';
import s from './TransformerDiagram.module.css';

/**
 * A GPT-2-style (pre-LayerNorm) transformer as a flow diagram, with the output shape of every stage
 * computed from the experiment's sizes. Selecting a stage shows its operation, shape and parameter
 * count below. Use inside a transformerExperiment.
 */
export function TransformerDiagram() {
  const { state, result, update } = useExperimentContext<TransformerState, TransformerResult>(
    'TransformerDiagram',
  );
  const { stages, error } = result;
  const splitStages = new Set(['split', 'scores', 'mix']);
  const nodes: FlowNode[] = stages.map((st) => ({
    id: st.id,
    label: st.label,
    detail: error && splitStages.has(st.id) ? 'invalid split' : shapeText(st.shape),
    status: error && splitStages.has(st.id) ? 'error' : st.id === state.selected ? 'active' : 'idle',
    ...stagePosition(st),
  }));
  const stage = stages.find((st) => st.id === state.selected) ?? stages[0]!;

  return (
    <>
      {error && (
        <p className={s.error} role="status">
          <strong>Invalid head count:</strong> {error}
        </p>
      )}
      <FlowDiagram
        title={`Transformer ${state.kind}, ${state.layers} block${state.layers > 1 ? 's' : ''}`}
        nodes={nodes}
        edges={EDGES}
        selected={state.selected}
        onSelect={(id) => update((st) => ({ ...st, selected: id }))}
        caption={`Output shape of every stage for B = ${state.batch}, T = ${state.seq}, d_model = ${state.dModel}, ${state.heads} heads, d_ff = ${state.dFf}, V = ${thousands(state.vocab)}. The stages from LayerNorm 1 to the second + residual form one block, repeated ${state.layers} times. Select a stage for details.`}
      />
      <section className={s.detail} aria-live="polite" aria-label="Selected stage" data-stage={stage.id}>
        <h3 className={s.title}>
          {stage.label}
          {stage.inBlock ? ` (in each of the ${state.layers} blocks)` : ''}
        </h3>
        <dl className={s.row}>
          <dt>Computes</dt>
          <dd>{stage.op}</dd>
          <dt>Output</dt>
          <dd>
            {stage.symbols} = {error && splitStages.has(stage.id) ? 'not defined' : shapeText(stage.shape)}
          </dd>
          <dt>Parameters</dt>
          <dd>{stage.params ? `${stage.paramFormula} = ${thousands(stage.params)}` : stage.paramFormula}</dd>
          <dt>Why</dt>
          <dd>{stage.note}</dd>
        </dl>
      </section>
    </>
  );
}
