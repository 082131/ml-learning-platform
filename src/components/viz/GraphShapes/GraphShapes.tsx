import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { shapeText, type GraphResult, type GraphState, type GraphStep } from '@/lib/inference/tensorGraph';
import type { FlowEdge, FlowNode } from '@/lib/viz/flow';
import { FlowDiagram } from '../FlowDiagram/FlowDiagram';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './GraphShapes.module.css';

/** Two columns, read as a snake: down the left, across, down the right. Fits a 360px screen. */
const POS: Record<GraphStep['id'], [number, number]> = {
  input: [0, 0],
  prep: [0, 90],
  dense1: [0, 180],
  relu: [200, 180],
  dense2: [200, 90],
  argmax: [200, 0],
};

function node(st: GraphStep, reached: boolean): FlowNode {
  const [x, y] = POS[st.id];
  return {
    id: st.id,
    label: st.label,
    detail: st.error ? 'error' : st.shape ? shapeText(st.shape) : 'not reached',
    x,
    y,
    w: 160,
    status: st.error ? 'error' : st.shape ? 'ok' : reached ? 'idle' : 'unknown',
  };
}

const EDGES: FlowEdge[] = [
  { from: 'input', to: 'prep' },
  { from: 'prep', to: 'dense1' },
  { from: 'dense1', to: 'relu' },
  { from: 'relu', to: 'dense2' },
  { from: 'dense2', to: 'argmax' },
];

/** The digits classifier's graph with the shape after each step and the step that fails. */
export function GraphShapes() {
  const { state, result: r } = useExperimentContext<GraphState, GraphResult>('GraphShapes');
  const failed = r.steps.find((x) => x.error);
  const shown = Math.min(state.batch, 12);
  return (
    <div className={s.layout} data-graph-error={failed ? failed.id : 'none'} data-graph-correct={r.correct ?? ''}>
      <FlowDiagram
        title="The forward pass as a graph"
        badge={<Badge tone="neutral">Computed in your browser</Badge>}
        nodes={r.steps.map((st) => node(st, !failed))}
        edges={EDGES}
        caption={
          failed
            ? `Stops at ${failed.label}: ${failed.error}`
            : `Every step accepts the shape the previous one produced. ${state.batch} image${state.batch === 1 ? '' : 's'} in, ${state.batch} label${state.batch === 1 ? '' : 's'} out.`
        }
      />
      <VizFrame
        title="Predictions"
        caption={
          r.labels
            ? `${r.correct} of ${state.batch} correct${state.prep === 'scale255' ? ': no error was raised, but inputs 16 times too small change the answers' : ''}.`
            : 'No predictions: the graph raised an error before the last step.'
        }
        table={
          <VizTable
            caption="First predictions"
            columns={['Image', 'True', 'Predicted']}
            rows={r.truth.slice(0, shown).map((t, i) => [i, t, r.labels?.[i] ?? '—'])}
          />
        }
      >
        <ol className={s.preds} aria-label={`First ${shown} predictions`}>
          {r.truth.slice(0, shown).map((t, i) => {
            const p = r.labels?.[i];
            const ok = p === t;
            return (
              <li key={i} data-ok={p === undefined ? 'none' : ok}>
                <span className={s.true}>{t}</span>
                <span className={s.pred}>
                  {p === undefined ? '—' : p} {p === undefined ? '' : ok ? '✓' : '✗'}
                </span>
              </li>
            );
          })}
        </ol>
        <p className={s.legend}>Top: true digit. Bottom: prediction, ✓ right, ✗ wrong.</p>
      </VizFrame>
    </div>
  );
}
