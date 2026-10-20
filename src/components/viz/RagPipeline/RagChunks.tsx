import type { RagResult, RagState } from '@/lib/ai/ragExperiment';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './RagPipeline.module.css';

/** The chunks of the document that answers the question (or of the best match), with the overlap marked. */
export function RagChunks() {
  const { state, result } = useExperimentContext<RagState, RagResult>('RagChunks');
  const answerDoc = result.candidates.find((c) => c.hasAnswer)?.chunk.doc ?? result.candidates[0]!.chunk.doc;
  const chunks = result.chunks.filter((c) => c.doc === answerDoc);
  const stride = state.size - state.overlap;
  return (
    <VizFrame
      title={`Chunks of “${chunks[0]!.title}”`}
      table={
        <VizTable
          caption="Chunks of the document"
          columns={['Chunk', 'Words', 'Text']}
          rows={chunks.map((c) => [
            c.id,
            `${c.index * stride}–${c.index * stride + c.text.split(' ').length - 1}`,
            c.text,
          ])}
        />
      }
      caption={`${chunks.length} chunks of up to ${state.size} words. Underlined words at the start of a chunk repeat the end of the previous one (overlap ${state.overlap}).`}
    >
      <ol className={s.chunks}>
        {chunks.map((c) => {
          const words = c.text.split(' ');
          const shared = c.index > 0 ? state.overlap : 0;
          return (
            <li
              key={c.id}
              className={s.chunk}
              data-has-answer={c.text.includes(result.query.answer) || undefined}
            >
              <code className={s.chunkId}>{c.id}</code>{' '}
              {c.text.includes(result.query.answer) && <span className={s.tag}>contains the answer </span>}
              {shared > 0 && <span className={s.overlap}>{words.slice(0, shared).join(' ')}</span>}{' '}
              {words.slice(shared).join(' ')}
            </li>
          );
        })}
      </ol>
    </VizFrame>
  );
}
