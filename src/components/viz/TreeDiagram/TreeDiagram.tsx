import { SPECIES } from '@/lib/classical/penguins';
import { treeLayout } from '@/lib/classical/treeLayout';
import { TREE_FEATURES, type SplitResult, type SplitState } from '@/lib/classical/treesExperiments';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { FlowDiagram } from '../FlowDiagram/FlowDiagram';

/** The greedy tree grown on the toy penguins to the experiment's max_depth (use with splitExperiment). */
export function TreeDiagram() {
  const { state, result } = useExperimentContext<SplitState, SplitResult>('TreeDiagram');
  const { nodes, edges } = treeLayout(result.tree, TREE_FEATURES, SPECIES);
  const leaves = nodes.filter((n) => n.label.startsWith('leaf')).length;
  const right = Math.round(result.trainAccuracy * 14);
  return (
    <FlowDiagram
      title={`Tree grown with max_depth=${state.depth}`}
      nodes={nodes}
      edges={edges}
      caption={`${leaves} leaves. Counts are [Adelie, Chinstrap, Gentoo]; "yes" means the test is true. It classifies ${right} of the 14 training penguins correctly (${formatNumber(Math.round(result.trainAccuracy * 1000) / 10)} %).`}
    />
  );
}
