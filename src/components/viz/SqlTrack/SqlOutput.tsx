import type { SqlRunResult } from '@/lib/sql/types';
import { ResultTable } from './ResultTable';
import s from './SqlTrack.module.css';

const HEADING: Record<SqlRunResult['status'], string> = {
  ok: 'Result',
  error: 'Error',
  timeout: 'Stopped',
  'load-failed': 'SQLite couldn’t load',
};

const firstLine = (sql: string) => {
  const line = sql.trim().split('\n').find((l) => l.trim() && !l.trim().startsWith('--')) ?? '';
  return line.length > 60 ? `${line.slice(0, 57)}…` : line;
};

/** What a run produced: each result set, rows changed by other statements, and the error if one stopped it. */
export function SqlOutput({ result, showAll = false }: { result: SqlRunResult; showAll?: boolean }) {
  const sets = result.statements.filter((st) => st.columns.length > 0);
  const shown = showAll ? sets : sets.slice(-3);
  const changes = result.statements.filter((st) => st.columns.length === 0 && (st.changes ?? 0) > 0);
  return (
    <div className={s.output} data-sql-status={result.status}>
      <div className={s.outputHead}>
        <span>{HEADING[result.status]}</span>
        {result.version && (
          <span>
            Ran in your browser · SQLite {result.version}
            {result.ms !== undefined && ` · ${result.ms < 1 ? '<1' : Math.round(result.ms)} ms`}
          </span>
        )}
      </div>
      {changes.length > 0 && (
        <p className={s.muted}>
          {changes.map((st) => `${firstLine(st.sql)}: ${st.changes} row${st.changes === 1 ? '' : 's'} changed`).join(' · ')}
        </p>
      )}
      {sets.length > shown.length && <p className={s.muted}>Showing the last {shown.length} of {sets.length} result sets.</p>}
      {shown.map((st, i) => (
        <div key={i} className={s.set}>
          {shown.length > 1 && <p className={s.setLabel}>{firstLine(st.sql)}</p>}
          <ResultTable result={st} label={`Result of ${firstLine(st.sql)}`} />
          <p className={s.muted}>
            {st.truncated ? `First ${st.rows.length} rows shown (more exist).` : `${st.rows.length} row${st.rows.length === 1 ? '' : 's'}`}
          </p>
        </div>
      ))}
      {result.status !== 'ok' && result.message && (
        <pre className={s.error} role="alert" tabIndex={0}>
          {result.failedSql ? `${result.message}\nin: ${firstLine(result.failedSql)}` : result.message}
        </pre>
      )}
      {result.status === 'ok' && sets.length === 0 && changes.length === 0 && <p className={s.muted}>The SQL ran and returned no rows.</p>}
    </div>
  );
}
