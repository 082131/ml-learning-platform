import {
  chainGraph,
  describeGradient,
  type ChainResult,
  type ChainState,
  type NodeId,
} from '@/lib/calculus/chainRule';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { FlowDiagram } from '../FlowDiagram/FlowDiagram';
import s from './ChainRuleGraph.module.css';

const NODE_W = 150;

/**
 * The computation graph of L = (w·x + b − y)²: forward values and ∂L/∂node on the nodes, local
 * derivatives on the edges. Selecting a node writes out its chain-rule product and highlights its path
 * to L. Use inside an Experiment made with chainRuleExperiment.
 */
export function ChainRuleGraph() {
  const { state, result, update } = useExperimentContext<ChainState, ChainResult>('ChainRuleGraph');
  const { nodes, edges } = chainGraph(result, state.selected);
  return (
    <div className={s.wrap}>
      <FlowDiagram
        title="Computation graph"
        nodes={nodes.map((n) => ({ ...n, w: NODE_W }))}
        edges={edges}
        selected={state.selected}
        onSelect={(id) => update((st) => ({ ...st, selected: id as NodeId }))}
        caption="Forward: values flow left to right (the data x and y appear in the labels that use them). Backward: each node's gradient is the gradient to its right times the local derivative on the edge between them. Select a node."
      />
      <p className={s.formula} aria-live="polite" data-gradient-of={state.selected}>
        {describeGradient(result, state.selected)}
      </p>
    </div>
  );
}
