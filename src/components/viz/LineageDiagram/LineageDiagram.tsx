import { changed, lineage, type VersioningResult, type VersioningState } from '@/lib/practice/versioning';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { FlowDiagram } from '../FlowDiagram/FlowDiagram';

const NAMES = { data: 'data', config: 'config', run: 'run', model: 'model' } as const;

/**
 * The versioning lesson's lineage: every artifact labeled with its content hash, marked ✓ when it
 * matches the registered v1 and ! when it changed. Use inside an Experiment made with versioningExperiment.
 */
export function LineageDiagram() {
  const { result } = useExperimentContext<VersioningState, VersioningResult>('LineageDiagram');
  const { nodes, edges } = lineage(result);
  const moved = (Object.keys(NAMES) as (keyof typeof NAMES)[]).filter((k) => changed(result, k));
  return (
    <FlowDiagram
      title="Lineage of model.json"
      nodes={nodes}
      edges={edges}
      caption={
        !result.now.fit.ok
          ? 'The run fails before producing a model: fewer than two different distances are left after cleaning.'
          : moved.length === 0
            ? 'Every hash matches the registered v1 (✓): this is the same model, trained the same way on the same data.'
            : `Changed since v1 (!): ${moved.join(', ')}. Unchanged artifacts keep their hash (✓). The code node is pinned by its git commit, outside this experiment.`
      }
    />
  );
}
