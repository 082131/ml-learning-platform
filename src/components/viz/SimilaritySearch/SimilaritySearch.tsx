import { TOP_K, type SimilarityResult, type SimilarityState } from '@/lib/ai/similarityExperiment';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge, cx } from '@/components/ui';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SimilaritySearch.module.css';

/**
 * Every sentence ranked by cosine similarity to the query, as bars. Selecting a sentence makes it
 * the query. Use inside an Experiment made with similarityExperiment.
 */
export function SimilaritySearch() {
  const { result, update } = useExperimentContext<SimilarityState, SimilarityResult>('SimilaritySearch');
  const { query, ranked } = result;
  return (
    <VizFrame
      title="Nearest sentences by cosine similarity"
      badge={<Badge tone="ok">Computed in your browser</Badge>}
      table={
        <VizTable
          caption="Sentences ranked by cosine similarity to the query"
          columns={['Rank', 'Cosine', 'Sentence']}
          rows={ranked.map((r) => [r.rank, r.score.toFixed(3), r.item.text])}
        />
      }
      caption={
        <>
          Query: <q>{query.text}</q>. Cosine similarity is between −1 and 1; higher means the two vectors point
          more the same way. Select a sentence to use it as the query.
        </>
      }
    >
      <ol className={s.list} aria-label="Ranked sentences">
        {ranked.map((r) => (
          <li key={r.item.id} className={cx(s.row, r.rank <= TOP_K && s.top)} data-rank={r.rank}>
            <button
              type="button"
              className={s.button}
              aria-label={`Rank ${r.rank}, cosine ${r.score.toFixed(3)}: ${r.item.text} (use as query)`}
              aria-current={r.item.id === query.id || undefined}
              onClick={() => update(() => ({ query: r.item.id }))}
            >
              <span className={s.rank}>#{r.rank}</span>
              <span className={s.text}>
                {r.item.text}
                {r.item.id === query.id && <span className={s.self}> (the query itself)</span>}
              </span>
              <span className={s.score}>{r.score.toFixed(3)}</span>
              <span className={s.track} aria-hidden="true">
                <span className={s.bar} style={{ width: `${Math.max(0, r.score) * 100}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </VizFrame>
  );
}
