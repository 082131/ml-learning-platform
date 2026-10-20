import { CANDIDATES, type RagResult, type RagState } from '@/lib/ai/ragExperiment';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge, cx } from '@/components/ui';
import { VizFrame } from '../VizFrame/VizFrame';
import s from './RagPipeline.module.css';

/** The first-stage candidates with their cosine, keyword and combined scores, in reranked order. */
export function RagRetrieval() {
  const { state, result } = useExperimentContext<RagState, RagResult>('RagRetrieval');
  return (
    <VizFrame
      title={`Retrieved and reranked (top ${CANDIDATES} of ${result.chunks.length} chunks)`}
      badge={<Badge tone="ok">Computed in your browser</Badge>}
      caption={`Score = ${(1 - state.keywordWeight).toFixed(1)} · cosine + ${state.keywordWeight.toFixed(1)} · keyword. The top ${state.k} go into the prompt.`}
    >
      <table className={s.table}>
        <caption className="visually-hidden">Candidate chunks in reranked order</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Cosine rank</th>
            <th scope="col">Cosine</th>
            <th scope="col">Keyword</th>
            <th scope="col">Score</th>
            <th scope="col">Chunk</th>
          </tr>
        </thead>
        <tbody>
          {result.candidates.map((c) => {
            const inPrompt = c.rank <= state.k;
            return (
              <tr key={c.chunk.id} className={cx(inPrompt && s.inPrompt)} data-chunk={c.chunk.id}>
                <th scope="row">{c.rank}</th>
                <td>{c.cosineRank}</td>
                <td>{c.cosine.toFixed(3)}</td>
                <td>{c.keyword.toFixed(2)}</td>
                <td>{c.score.toFixed(3)}</td>
                <td className={s.chunkCell}>
                  <span className={s.tags}>
                    <code>{c.chunk.id}</code>
                    {inPrompt && <span className={s.tag}>in prompt as [{c.rank}]</span>}
                    {c.hasAnswer && <span className={cx(s.tag, s.answer)}>contains the answer</span>}
                  </span>
                  <span className={s.snippet}>{c.chunk.text}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </VizFrame>
  );
}
