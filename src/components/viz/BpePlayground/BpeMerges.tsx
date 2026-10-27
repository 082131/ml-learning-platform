import type { BpeMerge, WordState } from '@/lib/deep/bpe';
import { topPairs, type BpeResult, type BpeState } from '@/lib/deep/bpeExperiment';
import { Button, cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './Bpe.module.css';

/**
 * The merge loop of byte-pair encoding, one merge at a time: the pair counts of that iteration
 * (computed), the winning pair, and every word before and after the merge. Use inside an
 * Experiment made with bpeExperiment.
 */
export function BpeMerges() {
  const { state, result, update } = useExperimentContext<BpeState, BpeResult>('BpeMerges');
  const { merges } = result.model;
  const index = Math.min(state.selected, merges.length - 1);
  const merge = merges[index];
  const select = (i: number) => update((st) => ({ ...st, selected: i }));

  return (
    <VizFrame
      title="BPE merges"
      table={
        <VizTable
          caption="Every merge learned, in order"
          columns={['Merge', 'Pair', 'Count', 'New token', 'ID']}
          rows={merges.map((m) => [m.step, `${m.pair[0]} + ${m.pair[1]}`, m.count, m.token, m.id])}
        />
      }
      caption={
        merges.length === 0
          ? 'No merges yet: every token is a single character.'
          : `${merges.length} merges learned. Merge ${merge!.step} joins ${merge!.pair[0]} + ${merge!.pair[1]}, the most frequent pair with count ${merge!.count}.`
      }
    >
      {merge ? (
        <>
          <div className={s.nav}>
            <Button size="sm" disabled={index === 0} onClick={() => select(index - 1)}>
              Previous merge
            </Button>
            <span aria-live="polite" data-merge-index={index}>
              Merge {merge.step} of {merges.length}
            </span>
            <Button size="sm" disabled={index === merges.length - 1} onClick={() => select(index + 1)}>
              Next merge
            </Button>
          </div>
          <ol className={s.mergeList} aria-label="Learned merges">
            {merges.map((m, i) => (
              <li key={m.step}>
                <button
                  type="button"
                  className={s.mergeButton}
                  aria-pressed={i === index}
                  onClick={() => select(i)}
                >
                  {m.step}. {m.pair[0]} + {m.pair[1]} → {m.token}
                </button>
              </li>
            ))}
          </ol>
          <MergeDetail merge={merge} />
        </>
      ) : (
        <p className={s.note}>Raise the number of merges to start learning tokens.</p>
      )}
    </VizFrame>
  );
}

function MergeDetail({ merge }: { merge: BpeMerge }) {
  const top = topPairs(merge);
  const rest = merge.pairCounts.length - top.length;
  return (
    <div className={s.panel} data-merge={merge.step}>
      <div>
        <h3 className={s.heading}>Pair counts before merge {merge.step}</h3>
        <table className={s.table}>
          <caption className="visually-hidden">Most frequent adjacent pairs</caption>
          <thead>
            <tr>
              <th scope="col">Pair</th>
              <th scope="col">Count</th>
              <th scope="col">
                <span className="visually-hidden">Chosen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {top.map((p) => {
              const chosen = p.pair[0] === merge.pair[0] && p.pair[1] === merge.pair[1];
              return (
                <tr key={`${p.pair[0]}\u0000${p.pair[1]}`} className={cx(chosen && s.chosen)}>
                  <th scope="row">
                    {p.pair[0]} + {p.pair[1]}
                  </th>
                  <td className={s.num}>{p.count}</td>
                  <td>{chosen ? '✓ chosen' : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rest > 0 && <p className={s.note}>and {rest} more pairs with lower or equal counts.</p>}
        <p className={s.note}>
          Each count adds up the frequency of every word the pair appears in. New token: “{merge.token}”, ID{' '}
          {merge.id}.
        </p>
      </div>
      <div>
        <h3 className={s.heading}>Words before → after</h3>
        <ul className={s.words}>
          {merge.before.map((w, i) => (
            <WordRow key={w.word} before={w} after={merge.after[i]!} token={merge.token} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function WordRow({ before, after, token }: { before: WordState; after: WordState; token: string }) {
  const changed = before.symbols.length !== after.symbols.length;
  return (
    <li
      className={s.word}
      aria-label={`${before.word}, ${before.count} times: ${before.symbols.join(' ')} becomes ${after.symbols.join(' ')}`}
    >
      <span className={s.wordName}>
        {before.word} ×{before.count}
      </span>
      <Symbols symbols={before.symbols} />
      <span className={s.arrow} aria-hidden="true">
        →
      </span>
      <Symbols symbols={after.symbols} mark={changed ? token : undefined} />
    </li>
  );
}

function Symbols({ symbols, mark }: { symbols: string[]; mark?: string }) {
  return (
    <span className={s.chips} aria-hidden="true">
      {symbols.map((sym, i) => (
        <span key={i} className={cx(s.chip, sym === mark && s.new)}>
          {sym}
        </span>
      ))}
    </span>
  );
}
