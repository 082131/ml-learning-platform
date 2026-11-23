import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { HERD_CLIENTS, RERUN_ITEMS, type CronResult, type CronState, type RerunState, type RetryResult, type RetryState } from '@/lib/automation/experiments';
import type { RerunResult } from '@/lib/automation/rerun';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './AutomationTrack.module.css';

const FIELD_NAMES = ['minute', 'hour', 'day of month', 'month', 'day of week'];

/** A cron expression split into its fields, read aloud, with the next run times in UTC. */
export function CronView() {
  const { state, result: r } = useExperimentContext<CronState, CronResult>('CronView');
  const parts = r.parse.ok ? r.parse.spec.fields.map((f) => f.source) : [];
  return (
    <VizFrame
      title="When does it run?"
      caption={r.parse.ok ? `${r.runs.length ? `Next run: ${r.runs[0]} UTC.` : 'This expression never fires.'} Counted from Mon 2026-11-23 14:00 UTC.` : `Not a valid expression: ${r.parse.error}.`}
      table={r.parse.ok ? <VizTable caption="Next runs (UTC)" columns={['#', 'time']} rows={r.runs.map((t, k) => [k + 1, t])} /> : undefined}
    >
      {!r.parse.ok ? (
        <p className={s.verdict} data-ok="false" data-valid="false">
          {state.expr}: {r.parse.error}
        </p>
      ) : (
        <div className={s.grid2} data-valid="true" data-runs={r.runs.length}>
          <section className={s.panel} aria-label="Fields">
            <h4 className={s.panelHead}>Fields</h4>
            <ul className={s.list}>
              {parts.map((p, k) => (
                <li key={k} className={s.row}>
                  <span>
                    <span className={s.muted}>{FIELD_NAMES[k]}</span> <code className={s.mono}>{p}</code>
                  </span>
                  <span className={s.muted}>{r.fields[k]}</span>
                </li>
              ))}
            </ul>
            <p className={s.muted}>{r.parse.spec.dayOr ? 'Both day fields are restricted, so a day matches if EITHER one matches.' : 'At least one day field starts with *, so both must match.'}</p>
          </section>
          <section className={s.panel} aria-label="Next runs">
            <h4 className={s.panelHead}>Next runs (UTC)</h4>
            {r.runs.length ? (
              <ol className={s.list} data-testid="cron-runs">
                {r.runs.map((t) => (
                  <li key={t} className={`${s.row} ${s.mono}`}>
                    {t}
                  </li>
                ))}
              </ol>
            ) : (
              <p className={s.verdict} data-ok="false">
                Never (searched 5 years)
              </p>
            )}
          </section>
        </div>
      )}
    </VizFrame>
  );
}

/** One client's attempts on a time axis, and how 200 clients' retries pile up second by second. */
export function RetryView() {
  const { result: r } = useExperimentContext<RetryState, RetryResult>('RetryView');
  const span = Math.max(1, r.run.elapsed);
  const peak = Math.max(1, ...r.herd);
  return (
    <VizFrame
      title="Retries over time"
      badge={<Badge tone="simulated">Simulated server</Badge>}
      caption={`${r.run.attempts.length} attempts over ${r.run.elapsed} s, ${r.run.ok ? 'ending in success' : 'ending in failure'}. With ${HERD_CLIENTS} clients failing together, the busiest second gets ${Math.max(...r.herd)} requests.`}
      table={<VizTable caption="Attempts" columns={['#', 'at (s)', 'status', 'wait (s)', 'why']} rows={r.run.attempts.map((a) => [a.n, a.at, a.status, a.wait ?? '', a.note])} />}
    >
      <div className={s.grid2} data-attempts={r.run.attempts.length} data-ok={r.run.ok}>
        <section className={s.panel} aria-label="One client">
          <h4 className={s.panelHead}>One client, 0 to {r.run.elapsed} s</h4>
          <div className={s.track} aria-hidden="true">
            {r.run.attempts.map((a) => (
              <span key={a.n} className={s.mark} data-tone={a.status < 400 ? 'ok' : 'err'} style={{ left: `calc(${(a.at / span) * 100}% - ${a.at === span && span > 0 ? 18 : 0}px)`, width: 18 }}>
                {a.n}
              </span>
            ))}
          </div>
          <ul className={s.list}>
            {r.run.attempts.map((a) => (
              <li key={a.n} className={s.row}>
                <span className={s.mono}>
                  #{a.n} at {a.at} s → {a.status}
                </span>
                <span className={s.tag} data-tone={a.status < 400 ? 'ok' : a.wait === null ? 'err' : 'warn'}>
                  {a.wait === null ? a.note : `wait ${a.wait} s (${a.note})`}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className={s.panel} aria-label="Many clients">
          <h4 className={s.panelHead}>
            {HERD_CLIENTS} clients: requests per second, 0 to {r.herd.length} s
          </h4>
          <div className={s.hist} aria-hidden="true">
            {r.herd.map((n, k) => (
              <span key={k} style={{ height: `${(n / peak) * 100}%` }} title={`${k} s: ${n}`} />
            ))}
          </div>
          <p className={s.muted}>Assumes every retry fails until the burst passes: the worst case jitter is designed for.</p>
        </section>
      </div>
    </VizFrame>
  );
}

/** Each key's row count in the output table after a crash and a rerun. */
export function RerunView() {
  const { result: r } = useExperimentContext<RerunState, RerunResult>('RerunView');
  return (
    <VizFrame
      title="The table after a crash and a rerun"
      caption={`${r.rows} rows for ${RERUN_ITEMS} items: ${r.duplicates} duplicates, ${r.missing} missing. ${r.resumeFrom > RERUN_ITEMS ? 'No rerun was needed' : `The rerun started at item ${r.resumeFrom}`}; ${r.processed} items were processed in total.`}
      table={<VizTable caption="Rows per key" columns={['key', 'rows']} rows={r.copies.map((c, k) => [k + 1, c])} />}
    >
      <ul className={s.cells} data-duplicates={r.duplicates} aria-label="Rows per key">
        {r.copies.map((c, k) => (
          <li key={k} className={s.cell} data-copies={c} data-dup={c > 1} data-resume={k + 1 === r.resumeFrom}>
            <span>#{k + 1}</span>
            <span>×{c}</span>
          </li>
        ))}
      </ul>
      <p className={s.muted}>Each cell is one item key; ×2 means the key has two rows. The outlined cell is where the rerun began.</p>
    </VizFrame>
  );
}
