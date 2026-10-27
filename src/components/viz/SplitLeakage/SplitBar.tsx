import type { SplitResult, SplitState } from '@/lib/classical/splitsExperiment';
import { SPLIT_NAMES, type SplitName } from '@/lib/classical/splits';
import { cx } from '@/components/ui';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SplitLeakage.module.css';

export const SPLIT_LABEL: Record<SplitName, string> = {
  train: 'Train',
  validation: 'Validation',
  test: 'Test',
};
const SHORT: Record<SplitName, string> = { train: 'Tr', validation: 'Va', test: 'Te' };

/**
 * The dataset as a bar of rows (row 0 first), each marked with the split the seeded shuffle put it
 * in, by a label as well as a tone. Rows the feature selection looks at are underlined.
 */
export function SplitBar() {
  const { state, result } = useExperimentContext<SplitState, SplitResult>('SplitBar');
  const seen = new Set(result.selection);
  const n = result.assignment.length;
  const title = 'Rows by split';
  return (
    <VizFrame
      title={title}
      caption={
        <>
          {n} rows shuffled with seed {state.seed}: {result.counts.train} train, {result.counts.validation}{' '}
          validation, {result.counts.test} test. Feature selection looks at the {result.selection.length}{' '}
          underlined rows ({state.leak === 'on' ? 'every row: the leak' : 'training rows only'}).
        </>
      }
      table={
        <VizTable
          caption={title}
          columns={['Split', 'Rows', 'Row numbers', 'Used to choose features']}
          rows={SPLIT_NAMES.map((name) => {
            const rows = result.assignment.flatMap((a, i) => (a === name ? [i] : []));
            return [
              SPLIT_LABEL[name],
              rows.length,
              rows.join(', '),
              rows.every((r) => seen.has(r)) ? 'yes' : 'no',
            ];
          })}
        />
      }
    >
      <ol className={s.bar} data-split-bar aria-label={`${n} rows in file order, labeled by split`}>
        {result.assignment.map((split, row) => (
          <li
            key={row}
            className={cx(s.cell, s[split], seen.has(row) && s.seen)}
            data-row={row}
            data-split={split}
            data-seen={seen.has(row) || undefined}
            title={`Row ${row}: ${SPLIT_LABEL[split]}${seen.has(row) ? ', used to choose features' : ''}`}
          >
            <span className="visually-hidden">
              Row {row}: {SPLIT_LABEL[split]}
              {seen.has(row) ? ', used to choose features' : ''}
            </span>
            <span aria-hidden="true">{SHORT[split]}</span>
          </li>
        ))}
      </ol>
      <ul className={s.counts} aria-label="Rows per split">
        {SPLIT_NAMES.map((name) => (
          <li key={name} data-count={name}>
            <span className={cx(s.swatch, s[name])} aria-hidden="true">
              {SHORT[name]}
            </span>
            {SPLIT_LABEL[name]}: {result.counts[name]} rows
          </li>
        ))}
        <li>
          <span className={cx(s.swatch, s.seen)} aria-hidden="true" />
          Underlined: used to choose features
        </li>
      </ul>
    </VizFrame>
  );
}
