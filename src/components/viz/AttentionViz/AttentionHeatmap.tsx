import type { AttentionResult } from '@/lib/deep/attention';
import type { AttentionState } from '@/lib/deep/attentionExperiment';
import { formatNumber } from '@/lib/trace/values';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './Attention.module.css';

/** Side of the square drawn for a weight of 1, in px. Area is proportional to the weight. */
const MAX_SIDE = 26;
const DECIMALS = 2;

/**
 * The attention weights as a (seq, seq) grid: one row per query token, one column per key token.
 * Each cell shows its weight as a number and as a square whose area is proportional to it.
 * Selecting a row's token makes it the query explained elsewhere. Use inside an attentionExperiment.
 */
export function AttentionHeatmap() {
  const { state, result, update } = useExperimentContext<AttentionState, AttentionResult>('AttentionHeatmap');
  const { tokens, row } = state;
  const n = tokens.length;
  const fmt = (w: number) => w.toFixed(DECIMALS);

  return (
    <VizFrame
      title="Attention weights"
      table={
        <VizTable
          caption="Attention weights, rows are queries and columns are keys"
          columns={['Query', ...tokens]}
          rows={result.weights.map((r, i) => [tokens[i]!, ...r.map(formatNumber)])}
        />
      }
      caption={`Row ${row} ("${tokens[row]}") spreads its attention as ${result.weights[row]!.map((w, j) => `${tokens[j]} ${fmt(w)}`).join(', ')}. Every row adds up to 1.${state.causal ? ' Causal mask on: cells above the diagonal are masked.' : ''}`}
    >
      <table className={s.grid} data-heatmap>
        <caption className="visually-hidden">
          Attention weights; select a query token to explain its row
        </caption>
        <thead>
          <tr>
            <th scope="col">query ↓ key →</th>
            {tokens.map((t, j) => (
              <th key={j} scope="col">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.weights.map((r, i) => (
            <tr key={i} className={cx(i === row && s.selectedRow)} data-row={i}>
              <th scope="row">
                <button
                  type="button"
                  className={s.rowButton}
                  aria-pressed={i === row}
                  onClick={() => update((st) => ({ ...st, row: i }))}
                >
                  {i === row ? '▸ ' : ''}
                  {tokens[i]}
                </button>
              </th>
              {r.map((w, j) => {
                const masked = result.masked[i]![j] === -Infinity;
                const side = MAX_SIDE * Math.sqrt(w);
                return (
                  <td key={j} className={cx(s.cell, masked && s.masked)} data-cell={`${i},${j}`}>
                    {!masked && (
                      <span className={s.square} style={{ width: side, height: side }} aria-hidden="true" />
                    )}
                    <span className={s.value}>{masked ? 'masked' : fmt(w)}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={s.note}>
        Shape ({n}, {n}). Weights are rounded to {DECIMALS} decimals here; the table view and the step-through
        show 4.
      </p>
    </VizFrame>
  );
}
