import { useCallback, useEffect, useRef, useState } from 'react';
import { DATASETS } from '@/lib/sql/datasets';
import type { SqlExample, SqlRunResult } from '@/lib/sql/types';
import { Button } from '@/components/ui';
import { CodeEditor } from '@/components/code/CodeEditor';
import code from '@/components/code/Code.module.css';
import { SqlOutput } from './SqlOutput';
import { useSqlRunner } from './sqlRuntime';
import s from './SqlTrack.module.css';

interface SqlRunnerProps {
  example: SqlExample;
  title?: string;
  /** Run once when the block scrolls into view, so the reader sees the real result without clicking. */
  autoRun?: boolean;
}

/** Editable SQL that runs in SQLite in the browser, against the lesson's tables. Nothing runs on a server. */
export function SqlRunner({ example, title, autoRun = true }: SqlRunnerProps) {
  const runner = useSqlRunner();
  const [source, setSource] = useState(example.source);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SqlRunResult | null>(null);
  const [tables, setTables] = useState<SqlRunResult | null>(null);
  const ref = useRef<HTMLElement>(null);
  const dataset = DATASETS[example.dataset];

  const run = useCallback(
    async (sql: string) => {
      setRunning(true);
      setResult(await runner.run(dataset.sql, sql));
      setRunning(false);
    },
    [runner, dataset.sql],
  );

  useEffect(() => {
    const el = ref.current;
    if (!autoRun || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        void run(example.source);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [autoRun, run, example.source]);

  const toggleTables = async () => {
    if (tables) return setTables(null);
    setTables(await runner.run(dataset.sql, dataset.tables.map((t) => `SELECT * FROM ${t} LIMIT 20;`).join('\n')));
  };

  return (
    <figure ref={ref} className={code.block} data-wide data-sql-runner={example.id}>
      <div className={code.frame}>
        <div className={code.header}>
          <span>{title ?? 'SQL'} · runs in your browser</span>
          <span>{dataset.title}</span>
        </div>
        <CodeEditor value={source} onChange={setSource} label={`${title ?? 'SQL'} editor`} />
        <div className={s.actions}>
          <Button variant="primary" onClick={() => run(source)} disabled={running}>
            Run
          </Button>
          <Button onClick={() => { setSource(example.source); void run(example.source); }} disabled={running || source === example.source}>
            Reset
          </Button>
          {dataset.tables.length > 0 && (
            <Button variant="ghost" aria-expanded={tables !== null} onClick={toggleTables}>
              {tables ? 'Hide tables' : 'Show tables'}
            </Button>
          )}
          <span className={s.status} role="status">
            {running ? 'Running…' : ''}
          </span>
        </div>
        {tables && (
          <div className={s.tables}>
            <SqlOutput result={tables} showAll />
          </div>
        )}
        {result && <SqlOutput result={result} />}
      </div>
    </figure>
  );
}
