import type { RecordedVariant, VariantState } from '@/lib/pycourse/recorded';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './StateCards.module.css';

interface StateCardsProps {
  title: string;
  /** Heading of the label column in the table view, for example "Parameter" or "Object". */
  labelHeading?: string;
  /** Heading of the note column in the table view. */
  noteHeading?: string;
}

/**
 * The state after a recorded run (recordedExperiment): one card per name, parameter or object with its
 * repr() and a note, plus the exception if the run raised one. Values come from CPython, not from here.
 */
export function StateCards({ title, labelHeading = 'Name', noteHeading = 'Note' }: StateCardsProps) {
  const { result } = useExperimentContext<VariantState, RecordedVariant>('StateCards');
  const cards = result.cards ?? [];
  const parts = cards.map((c) => `${c.label} is ${c.value}`);
  if (result.error) parts.unshift(`it raises ${result.error.split(':')[0]}`);
  const summary = parts.join('; ') + '.';
  return (
    <VizFrame
      title={title}
      badge={<span className={s.badge}>Recorded in CPython</span>}
      caption={`${result.label}: ${summary}`}
      table={
        <VizTable
          caption={title}
          columns={[labelHeading, 'Value', noteHeading]}
          rows={[
            ...(result.error ? [['raised', result.error, '']] : []),
            ...cards.map((c) => [c.label, c.value, c.note ?? '']),
          ]}
        />
      }
    >
      <div className={s.wrap} data-variant={result.id}>
        {result.error && (
          <p className={s.error} role="status">
            <strong>Raised:</strong> <code>{result.error}</code>
          </p>
        )}
        {cards.length > 0 && (
          <ul className={s.cards}>
            {cards.map((c) => (
              <li key={c.label} className={s.card} data-card={c.label}>
                <span className={s.label}>{c.label}</span>
                <code className={s.value}>{c.value}</code>
                {c.note && <span className={s.note}>{c.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </VizFrame>
  );
}
