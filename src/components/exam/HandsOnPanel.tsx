import { useState } from 'react';
import { taskPoints } from '@/lib/exam/engine';
import { recordTaskRun, resetTasks, revealTask } from '@/lib/exam/storage';
import type { ExamDef } from '@/lib/exam/types';
import { Badge, Button } from '@/components/ui';
import { HandsOnTask } from './HandsOnTask';
import { useExamStore } from './useExamStore';
import s from './Exam.module.css';

/** The 100-point practical: Python tasks graded by hidden checks that run in the browser. */
export function HandsOnPanel({ exam }: { exam: ExamDef }) {
  const { state, update } = useExamStore();
  const { tasks, minutes, passPercent } = exam.handsOn;
  const [generation, setGeneration] = useState(0);
  const total = tasks.reduce((sum, t) => sum + taskPoints(t), 0);
  const earned = tasks.reduce((sum, t) => sum + (state.tasks[t.id]?.best ?? 0), 0);
  const percent = Math.round((earned / total) * 100);

  return (
    <div className={s.intro} style={{ maxWidth: 'none' }}>
      <section className={s.section} aria-labelledby="ho-rules">
        <h2 id="ho-rules" className={s.h2}>
          Hands-on exam · {total} points
        </h2>
        <ul className={s.list}>
          <li>
            {tasks.length} tasks. Budget about {minutes} minutes in one go to simulate exam pressure; the page
            does not stop you.
          </li>
          <li>
            Write Python in the editor and press <em>Run graded checks</em>. Hidden asserts run in your
            browser (Pyodide) and each check that passes earns its points. Your best run per task counts.
          </li>
          <li>Revealing a solution scores that task 0. Pass mark: {passPercent}%.</li>
        </ul>
        <div className={s.score}>
          <span className={s.big} data-handson-score={earned}>
            {earned} / {total}
          </span>
          <Badge tone={percent >= passPercent ? 'ok' : 'neutral'}>
            {percent >= passPercent ? 'Pass' : `Pass mark ${passPercent}%`}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              update((st) =>
                resetTasks(
                  st,
                  tasks.map((t) => t.id),
                ),
              );
              setGeneration((g) => g + 1);
            }}
          >
            Reset all hands-on scores
          </Button>
        </div>
      </section>
      {tasks.map((t, i) => (
        <HandsOnTask
          key={`${t.id}:${generation}`}
          task={t}
          index={i}
          record={state.tasks[t.id]}
          onRun={(run) => update((st) => recordTaskRun(st, t.id, run))}
          onReveal={(code) => update((st) => revealTask(st, t.id, code))}
        />
      ))}
    </div>
  );
}
