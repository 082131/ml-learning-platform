import type { EmbeddingResult, EmbeddingState } from '@/lib/deep/embeddings';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { MatrixGrid } from '../MatrixGrid/MatrixGrid';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './EmbeddingPlane.module.css';

/**
 * A token ID as a one-hot row times the embedding table E: every 0 cancels a row, so the product
 * is row `a` of E. Use inside an embeddingExperiment.
 */
export function EmbeddingLookup() {
  const { state, result } = useExperimentContext<EmbeddingState, EmbeddingResult>('EmbeddingLookup');
  const { tokens, E, a } = state;
  const n = tokens.length;
  const terms = (j: number) => E.map((row, k) => `${result.oneHot[k]}·${formatNumber(row[j]!)}`).join(' + ');

  return (
    <VizFrame
      title="Embedding lookup"
      table={
        <VizTable
          caption="The product one_hot @ E, column by column"
          columns={['Column', 'Sum of products', 'Value']}
          rows={[0, 1].map((j) => [j, terms(j), formatNumber(result.lookup[j]!)])}
        />
      }
      caption={`Token “${tokens[a]}” has ID ${a}. Its one-hot vector (shape (${n},)) times E (shape (${n}, 2)) gives row ${a} of E: (${result.lookup.map(formatNumber).join(', ')}).`}
    >
      <div className={s.equation} data-lookup={a}>
        <MatrixGrid
          name="one_hot"
          values={[result.oneHot]}
          highlightCols={[a]}
          caption={`shape (${n},), a 1 at ID ${a}`}
        />
        <span className={s.op} aria-hidden="true">
          @
        </span>
        <MatrixGrid name="E" values={E} highlightRows={[a]} caption={`shape (${n}, 2)`} />
        <span className={s.op} aria-hidden="true">
          =
        </span>
        <MatrixGrid name={`E[${a}]`} values={[result.lookup]} caption="shape (2,)" />
      </div>
      <p className={s.legend}>Token IDs: {tokens.map((t, i) => `${i} ${t}`).join(' · ')}</p>
      <p className={s.legend}>
        Column 0: {terms(0)} = {formatNumber(result.lookup[0]!)}
      </p>
    </VizFrame>
  );
}
