import { formatValue } from '@/lib/sql/engine';
import type { StatementResult } from '@/lib/sql/types';
import s from './SqlTrack.module.css';

/** One result set as a real table, NULLs marked in words (not only by style). */
export function ResultTable({ result, label }: { result: StatementResult; label: string }) {
  return (
    <div className={s.resultWrap} tabIndex={0} role="group" aria-label={label}>
      <table className={s.result} data-rows={result.rows.length}>
        <caption className="visually-hidden">{label}</caption>
        <thead>
          <tr>
            {result.columns.map((c, i) => (
              <th key={i} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td key={j} className={v === null ? s.null : typeof v === 'number' ? s.num : undefined}>
                  {formatValue(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.rows.length === 0 && <p className={s.muted}>No rows.</p>}
    </div>
  );
}
