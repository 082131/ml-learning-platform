import type { CleanedRow, CleaningExperimentResult } from '@/lib/classical/cleaning';
import { NUMERIC_COLUMNS, PENGUINS, type NumericColumn } from '@/lib/classical/penguins';
import { formatNumber } from '@/lib/trace/values';
import { cx } from '@/components/ui';
import { VizFrame } from '../VizFrame/VizFrame';
import t from '../VizFrame/VizFrame.module.css';
import s from './CleaningView.module.css';

const SHORT: Record<NumericColumn, string> = {
  bill_length_mm: 'bill length',
  bill_depth_mm: 'bill depth',
  flipper_length_mm: 'flipper',
  body_mass_g: 'body mass',
};

function status(r: CleanedRow): string {
  if (r.dropped === 'numeric') return 'dropped: missing measurements';
  if (r.dropped === 'sex') return 'dropped: missing sex';
  const notes = [
    r.filled.length > 0 && `filled ${r.filled.length} measurement${r.filled.length > 1 ? 's' : ''}`,
    r.sexFilled && 'sex → "unknown"',
    r.typo && 'typo injected',
  ].filter(Boolean);
  return notes.length ? `kept, ${notes.join(', ')}` : 'kept';
}

function Cell({ r, c }: { r: CleanedRow; c: NumericColumn }) {
  const v = r.values[c];
  if (v === null) return <td className={s.na}>NaN</td>;
  const filled = r.filled.includes(c);
  const typo = r.typo && c === 'body_mass_g';
  return (
    <td className={cx(filled && s.filled, typo && s.typo)}>
      {formatNumber(v)}
      {filled && <span className="visually-hidden"> (filled)</span>}
      {typo && <span className="visually-hidden"> (typo)</span>}
    </td>
  );
}

/** Every row of the subset before and after cleaning: filled cells in italics, dropped rows struck through. */
export function CleaningTable({ result }: { result: CleaningExperimentResult }) {
  const missingBefore = result.rows.filter((r) => {
    const p = PENGUINS[r.row]!;
    return p.sex === null || NUMERIC_COLUMNS.some((c) => p[c] === null);
  }).length;
  return (
    <VizFrame
      title="Before and after, row by row"
      caption={`${result.subsetSize} rows before, ${missingBefore} of them with a missing value. ${result.kept.length} rows after cleaning. Italic values were filled; struck-through rows were dropped.`}
    >
      <table className={t.table} data-cleaning-table>
        <caption className="visually-hidden">The penguin subset after cleaning</caption>
        <thead>
          <tr>
            <th scope="col">row</th>
            <th scope="col">species</th>
            {NUMERIC_COLUMNS.map((c) => (
              <th key={c} scope="col">
                {SHORT[c]}
              </th>
            ))}
            <th scope="col">sex</th>
            <th scope="col" className={s.status}>
              status
            </th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r) => (
            <tr
              key={r.row}
              className={cx(r.dropped && s.dropped)}
              data-row={r.row}
              data-status={r.dropped ?? 'kept'}
            >
              <th scope="row">{r.row}</th>
              <td>{r.species}</td>
              {NUMERIC_COLUMNS.map((c) => (
                <Cell key={c} r={r} c={c} />
              ))}
              <td className={cx(r.sex === null && s.na, r.sexFilled && s.filled)}>{r.sex ?? 'NaN'}</td>
              <td className={s.status}>{status(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </VizFrame>
  );
}
