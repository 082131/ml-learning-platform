import { describeRow, type AttentionResult } from '@/lib/deep/attention';
import type { AttentionState } from '@/lib/deep/attentionExperiment';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { MatrixGrid } from '../MatrixGrid/MatrixGrid';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './Attention.module.css';

/**
 * Q, K, V and the scores with the selected query row marked, then that row's arithmetic: scores,
 * softmax and the weighted sum of values. Use inside an attentionExperiment.
 */
export function AttentionRow() {
  const { state, result } = useExperimentContext<AttentionState, AttentionResult>('AttentionRow');
  const { tokens, row: i } = state;
  const n = tokens.length;
  const d = describeRow(result, i, tokens);
  const dv = result.V[0]!.length;

  return (
    <VizFrame
      title={`Row ${i}: how "${tokens[i]}" attends`}
      table={
        <VizTable
          caption={`Each step for query row ${i}`}
          columns={['Key', 'Score', 'Weight']}
          rows={tokens.map((t, j) => [
            t,
            result.masked[i]![j] === -Infinity ? 'masked' : result.scores[i]![j]!.toFixed(4),
            result.weights[i]![j]!.toFixed(4),
          ])}
        />
      }
      caption={`Output for "${tokens[i]}": ${d.outVector}, a weighted mix of the ${n} value vectors.`}
    >
      <div className={s.matrices}>
        <MatrixGrid
          name="Q"
          values={result.Q}
          highlightRows={[i]}
          caption={`shape (${n}, ${result.dk}) = X @ W_q`}
        />
        <MatrixGrid name="K" values={result.K} caption={`shape (${n}, ${result.dk}) = X @ W_k`} />
        <MatrixGrid name="V" values={result.V} caption={`shape (${n}, ${dv}) = X @ W_v`} />
        <MatrixGrid
          name="scores"
          values={result.scores}
          highlightRows={[i]}
          caption={`shape (${n}, ${n}) = Q @ K.T / √${result.dk}`}
        />
      </div>
      <ol className={s.steps} aria-live="polite" data-row-math={i}>
        <li className={s.step}>
          <span className={s.stepTitle}>1. Scores: q{i} · each key, divided by √d_k</span>
          {d.scores.map((line) => (
            <span key={line} className={s.line}>
              {line}
            </span>
          ))}
        </li>
        <li className={s.step}>
          <span className={s.stepTitle}>2. Softmax, part 1: exp(score − row max)</span>
          {d.exps.map((line) => (
            <span key={line} className={s.line}>
              {line}
            </span>
          ))}
          <span className={s.line}>{d.sum}</span>
        </li>
        <li className={s.step}>
          <span className={s.stepTitle}>3. Softmax, part 2: divide by the sum (weights add up to 1)</span>
          {d.weights.map((line) => (
            <span key={line} className={s.line}>
              {line}
            </span>
          ))}
        </li>
        <li className={s.step}>
          <span className={s.stepTitle}>4. Output: weights · V, shape ({dv},)</span>
          {d.out.map((line) => (
            <span key={line} className={s.line}>
              {line}
            </span>
          ))}
          <span className={s.total}>
            out[{i}] = {d.outVector}
          </span>
        </li>
      </ol>
    </VizFrame>
  );
}
