import {
  LABELED,
  type CompareResult,
  type CompareState,
  type TriageResult,
  type TriageState,
} from '@/lib/ai/triage';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { VizFrame } from '../VizFrame/VizFrame';
import { Status } from './Status';
import s from './AiTrack.module.css';

/** The raw reply, what parsing and validation found, and the retry message the program would send. */
export function SchemaCheck() {
  const { result } = useExperimentContext<TriageState, TriageResult>('SchemaCheck');
  return (
    <VizFrame
      title="Parse, validate, then use or retry"
      badge={<Badge tone="ok">Validated in your browser</Badge>}
      caption={
        result.valid
          ? 'The reply parsed and matched the schema, so the program can use the object.'
          : `The reply failed with ${result.errors.length} problem${result.errors.length === 1 ? '' : 's'}; the program sends the retry message below once, then falls back.`
      }
    >
      <section className={s.panel} aria-label="Model reply">
        <h4 className={s.panelTitle}>
          Model reply <Badge tone="simulated">Scripted</Badge>
        </h4>
        <pre className={s.pre} tabIndex={0}>
          {result.raw}
        </pre>
      </section>
      <section className={s.panel} aria-label="Validation result" data-valid={result.valid}>
        <h4 className={s.panelTitle}>
          Result{' '}
          <Status tone={result.valid ? 'ok' : 'err'}>
            {result.valid ? 'valid' : result.parsed ? 'schema errors' : 'not JSON'}
          </Status>
        </h4>
        {result.valid ? (
          <pre className={s.pre} tabIndex={0}>
            {JSON.stringify(result.value, null, 2)}
          </pre>
        ) : (
          <ul className={s.list}>
            {result.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </section>
      {result.retry && (
        <section className={s.panel} aria-label="Retry message">
          <h4 className={s.panelTitle}>Retry message (sent once)</h4>
          <pre className={s.pre} tabIndex={0}>
            {result.retry}
          </pre>
        </section>
      )}
    </VizFrame>
  );
}

const TONE = { correct: 'ok', 'wrong category': 'warn', invalid: 'err' } as const;

/** Two prompts scored on the same ten labeled tickets. */
export function PromptScoreboard() {
  const { result } = useExperimentContext<CompareState, CompareResult>('PromptScoreboard');
  return (
    <VizFrame
      title="Prompt A against prompt B on 10 labeled tickets"
      badge={<Badge tone="simulated">Scripted replies, real scoring</Badge>}
      caption={`Prompt A: ${result.a.correct} of 10 correct. Prompt B: ${result.b.correct} of 10. Both get ticket t9 wrong, which points at the category definitions rather than the format.`}
    >
      <div className={s.scroll}>
        <table className={s.table}>
          <caption className="visually-hidden">Outcome per ticket for each prompt</caption>
          <thead>
            <tr>
              <th scope="col">Ticket</th>
              <th scope="col">Label</th>
              <th scope="col">Prompt A</th>
              <th scope="col">Prompt B</th>
            </tr>
          </thead>
          <tbody>
            {LABELED.map((t, i) => {
              const a = result.a.rows[i]!;
              const b = result.b.rows[i]!;
              return (
                <tr key={t.id} data-ticket={t.id}>
                  <th scope="row">
                    <span className={s.mono}>{t.id}</span> {t.text}
                  </th>
                  <td className={s.mono}>{t.gold}</td>
                  <td>
                    <Status tone={TONE[a.outcome]}>{a.outcome}</Status>
                    <div className={s.muted}>{a.detail}</div>
                  </td>
                  <td>
                    <Status tone={TONE[b.outcome]}>{b.outcome}</Status>
                    <div className={s.muted}>{b.detail}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </VizFrame>
  );
}
