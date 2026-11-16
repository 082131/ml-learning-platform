import { useState } from 'react';
import { taskPoints, taskScore } from '@/lib/exam/engine';
import type { TaskRecord } from '@/lib/exam/storage';
import type { HandsOnTask as Task } from '@/lib/exam/types';
import { Badge, Button } from '@/components/ui';
import { CodeEditor } from '@/components/code/CodeEditor';
import { PlainCode } from '@/components/code/PlainCode';
import { usePythonRunner } from '@/components/code/pythonRuntime';
import { InlineText } from '@/components/assessment/InlineText';
import s from './Exam.module.css';

interface HandsOnTaskProps {
  task: Task;
  index: number;
  record?: TaskRecord;
  onRun: (run: { code: string; passed: string[]; score: number }) => void;
  onReveal: (code: string) => void;
  /** No more edits or runs: a timed screen after time is up. */
  locked?: boolean;
  /** `penalty` (default): revealing scores 0. `hidden`: no solution during a timed sitting. `shown`: always visible. */
  solution?: 'penalty' | 'hidden' | 'shown';
}

interface CheckResult {
  ok: boolean;
  why?: string;
}

/** Last line of a Python failure, which is the assert message the check wrote. */
const lastLine = (msg?: string) => msg?.trim().split('\n').pop() ?? '';

export function HandsOnTask({
  task,
  index,
  record,
  onRun,
  onReveal,
  locked = false,
  solution = 'penalty',
}: HandsOnTaskProps) {
  const runner = usePythonRunner();
  const [code, setCode] = useState(record?.code ?? task.starter);
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [phase, setPhase] = useState<string | null>(null);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const total = taskPoints(task);

  const runChecks = async () => {
    const next: Record<string, CheckResult> = {};
    for (const [i, c] of task.checks.entries()) {
      setPhase(`Running check ${i + 1} of ${task.checks.length}`);
      const r = await runner.run({ code, tests: c.tests });
      if (r.status === 'load-failed') {
        setPhase(null);
        setResults({ [c.name]: { ok: false, why: `Python could not start: ${r.message ?? ''}` } });
        return;
      }
      next[c.name] = { ok: r.status === 'ok', why: r.status === 'ok' ? undefined : lastLine(r.message) };
      setResults({ ...next });
    }
    setPhase(null);
    const passed = Object.keys(next).filter((k) => next[k]!.ok);
    onRun({ code, passed, score: taskScore(task, passed) });
  };

  const ran = Object.keys(results).length > 0;
  const current = taskScore(
    task,
    Object.keys(results).filter((k) => results[k]!.ok),
  );

  return (
    <article className={s.task} data-task={task.id}>
      <div className={s.taskHead}>
        <h3 className={s.taskTitle}>
          Task {index + 1}. {task.title}
        </h3>
        <span className={s.meta}>
          {record?.revealed && solution === 'penalty' ? (
            <Badge tone="warn">Solution revealed · 0 / {total}</Badge>
          ) : (
            <>
              Best {record?.best ?? 0} / {total} points
            </>
          )}
        </span>
      </div>
      <div className={s.brief}>
        <InlineText text={task.brief} />
      </div>
      <div className={s.editorWrap}>
        <CodeEditor
          value={code}
          onChange={locked ? () => undefined : setCode}
          label={`Task ${index + 1} code editor`}
        />
      </div>
      <div className={s.row}>
        <Button variant="primary" onClick={runChecks} disabled={phase !== null || locked}>
          Run graded checks
        </Button>
        <Button
          onClick={() => setCode(task.starter)}
          disabled={phase !== null || locked || code === task.starter}
        >
          Reset to starter
        </Button>
        <span className={s.meta} role="status">
          {phase ? `${phase}… The first run downloads Python.` : ran ? `This run: ${current} / ${total}` : ''}
        </span>
      </div>
      <ul className={s.checks} aria-label="Graded checks">
        {task.checks.map((c) => {
          const r = results[c.name];
          const state = r ? (r.ok ? 'pass' : 'fail') : 'idle';
          return (
            <li key={c.name} className={s.check} data-state={state}>
              <span className={s.mark} aria-hidden="true">
                {r ? (r.ok ? '✓' : '✗') : '○'}
              </span>
              <span>
                {c.name}
                <span className="visually-hidden">{r ? (r.ok ? ', passed' : ', failed') : ', not run'}</span>
              </span>
              <span className={s.meta}>{c.points} pts</span>
              {r && !r.ok && r.why && <p className={s.why}>{r.why}</p>}
            </li>
          );
        })}
      </ul>
      {solution === 'hidden' ? null : record?.revealed || solution === 'shown' ? (
        <div className={s.section}>
          <span className={s.meta}>Reference solution</span>
          <PlainCode source={task.solution} language="python" label="Reference solution" />
        </div>
      ) : confirmReveal ? (
        <div className={s.confirm}>
          <p>Revealing the solution sets this task to 0 points for this exam. Reveal it?</p>
          <div className={s.row}>
            <Button onClick={() => onReveal(code)}>Reveal and score 0</Button>
            <Button variant="ghost" onClick={() => setConfirmReveal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className={s.row}>
          <Button variant="ghost" onClick={() => setConfirmReveal(true)}>
            Reveal solution…
          </Button>
        </div>
      )}
    </article>
  );
}
