import { type ProgrammaticResult, type ProgrammaticState } from '@/lib/dataops/programmatic';
import { pyFixed } from '@/lib/practice/pyFormat';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame } from '../VizFrame/VizFrame';
import t from '../SqlQueryTable/DataTable.module.css';
import s from './DataOps.module.css';

const vote = (v: 0 | 1 | null) => (v === null ? '·' : v === 1 ? 'yes' : 'no');

/**
 * The label matrix: one row per ticket, one column per active labeling function, then the majority vote and the
 * gold label. Use inside a programmaticExperiment.
 */
export function LfMatrix() {
  const { result: r } = useExperimentContext<ProgrammaticState, ProgrammaticResult>('LfMatrix');
  const acc = r.labeled ? pyFixed(r.correct / r.labeled, 2) : 'none labeled';
  return (
    <VizFrame
      title="Label matrix: votes per ticket"
      caption={
        <>
          {r.active.length} labeling function{r.active.length === 1 ? '' : 's'} on. {r.labeled} of 16 tickets get
          a weak label ({r.conflicts} with conflicting votes); accuracy on those against the gold labels: {acc}.
          A dot means the function abstained.
        </>
      }
    >
      <div className={t.scroll} tabIndex={0} role="region" aria-label="Label matrix">
        <table className={t.table} data-lf-matrix>
          <caption>“yes” = refund request, “no” = not a refund request, · = abstains</caption>
          <thead>
            <tr>
              <th scope="col">Ticket</th>
              {r.active.map((n) => (
                <th key={n} scope="col">
                  {n}
                </th>
              ))}
              <th scope="col">Weak label</th>
              <th scope="col">Gold</th>
            </tr>
          </thead>
          <tbody>
            {r.rows.map((row) => {
              const status = row.weak === null ? 'none' : row.weak === row.gold ? 'right' : 'wrong';
              return (
                <tr key={row.text} data-ticket={row.text} data-weak={status} className={cx(row.conflict && t.hl)}>
                  <td className={s.wrapText}>{row.text}</td>
                  {row.votes.map((v, j) => (
                    <td key={r.active[j]}>{vote(v)}</td>
                  ))}
                  <td className={status === 'right' ? t.ok : status === 'wrong' ? t.err : undefined}>
                    {row.weak === null ? '— unlabeled' : `${vote(row.weak)} ${status === 'right' ? '✓' : '✗'}`}
                  </td>
                  <td>{vote(row.gold as 0 | 1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={s.note}>Highlighted rows have conflicting votes.</p>
    </VizFrame>
  );
}
