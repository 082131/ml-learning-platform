import { useEffect, useState } from 'react';
import { composeCte } from '@/lib/sql/cte';
import { DATASETS } from '@/lib/sql/datasets';
import type { SqlCteExample, SqlRunResult } from '@/lib/sql/types';
import { Button } from '@/components/ui';
import { PlainCode } from '@/components/code/PlainCode';
import code from '@/components/code/Code.module.css';
import { SqlOutput } from './SqlOutput';
import { useSqlRunner } from './sqlRuntime';
import s from './SqlTrack.module.css';

/** Walks a CTE query one named step at a time: each step's own rows, run for real in SQLite. */
export function CteSteps({ example, title }: { example: SqlCteExample; title?: string }) {
  const runner = useSqlRunner();
  const final = example.steps.length;
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<SqlRunResult | null>(null);
  const sql = composeCte(example, step === final ? undefined : step);

  useEffect(() => {
    let live = true;
    void runner.run(DATASETS[example.dataset].sql, sql).then((r) => live && setResult(r));
    return () => {
      live = false;
    };
  }, [runner, sql, example.dataset]);

  const note = step === final ? 'The final SELECT reads the last step and produces the answer.' : example.steps[step]!.note;
  return (
    <figure className={code.block} data-wide data-cte-steps={example.id} data-step={step}>
      <div className={code.frame}>
        <div className={code.header}>
          <span>{title ?? 'Query, step by step'} · runs in your browser</span>
        </div>
        <div className={s.actions} role="group" aria-label="Steps">
          {example.steps.map((st, i) => (
            <Button key={st.name} size="sm" variant={i === step ? 'primary' : 'secondary'} aria-pressed={i === step} onClick={() => setStep(i)}>
              {i + 1}. {st.name}
            </Button>
          ))}
          <Button size="sm" variant={step === final ? 'primary' : 'secondary'} aria-pressed={step === final} onClick={() => setStep(final)}>
            {final + 1}. final SELECT
          </Button>
        </div>
        <p className={s.note}>{note}</p>
        <PlainCode source={sql} language="sql" label={`Query up to step ${step + 1}`} />
        {result && <SqlOutput result={result} />}
      </div>
    </figure>
  );
}
