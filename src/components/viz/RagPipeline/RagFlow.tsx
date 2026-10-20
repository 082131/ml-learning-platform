import type { FlowEdge, FlowNode } from '@/lib/viz/flow';
import { CANDIDATES, type RagResult, type RagState } from '@/lib/ai/ragExperiment';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { FlowDiagram } from '../FlowDiagram/FlowDiagram';

const W = 150;
const GAP = 40;
const at = (i: number) => i * (W + GAP);

/** The pipeline as a diagram whose numbers come from the current run. Use inside a ragExperiment. */
export function RagFlow() {
  const { state, result } = useExperimentContext<RagState, RagResult>('RagFlow');
  const nodes: FlowNode[] = [
    {
      id: 'chunk',
      label: 'Chunk',
      detail: `${result.chunks.length} chunks`,
      x: at(0),
      y: 0,
      w: W,
      status: 'ok',
    },
    {
      id: 'retrieve',
      label: 'Retrieve',
      detail: `top ${CANDIDATES} by cosine`,
      x: at(1),
      y: 0,
      w: W,
      status: 'ok',
    },
    {
      id: 'rerank',
      label: 'Rerank',
      detail:
        state.keywordWeight === 0 ? 'off: cosine order' : `keyword weight ${state.keywordWeight.toFixed(1)}`,
      x: at(2),
      y: 0,
      w: W,
      status: state.keywordWeight === 0 ? 'idle' : 'ok',
    },
    {
      id: 'prompt',
      label: 'Assemble prompt',
      detail: `${state.k} chunks · ${result.promptTokens} tokens`,
      x: at(3),
      y: 0,
      w: W,
      status: 'ok',
    },
    {
      id: 'generate',
      label: 'Generate',
      detail: 'simulated here',
      x: at(4),
      y: 0,
      w: W,
      status: result.response.grounded ? 'ok' : 'warn',
    },
  ];
  const edges: FlowEdge[] = nodes.slice(1).map((n, i) => ({ from: nodes[i]!.id, to: n.id, active: true }));
  return (
    <FlowDiagram
      title="RAG pipeline for this question"
      nodes={nodes}
      edges={edges}
      caption={
        result.response.grounded
          ? 'The chunk that answers the question made it into the prompt.'
          : 'No chunk in the prompt contains the answer, so a grounded model should say it doesn’t know.'
      }
    />
  );
}
