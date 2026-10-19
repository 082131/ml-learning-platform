import { useMemo, useState, type ReactNode } from 'react';
import { CommonMistake } from '@/components/assessment/CommonMistake';
import { KnowledgeCheck } from '@/components/assessment/KnowledgeCheck';
import { MiniExercise } from '@/components/assessment/MiniExercise';
import { ProjectBrief } from '@/components/assessment/ProjectBrief';
import { AnnotatedCode } from '@/components/code/AnnotatedCode';
import { ProgressiveCode } from '@/components/code/ProgressiveCode';
import { PythonRunner } from '@/components/code/PythonRunner';
import { SlotStateContext } from '@/components/code/slotState';
import { StepThrough } from '@/components/code/StepThrough';
import { LessonIdContext } from '@/components/learning/LessonContext';
import { Slider } from '@/components/ui';
import { buildRunningSumTrace } from '@/lib/trace/runningSum';
import * as demo from './demoContent';
import s from './ComponentsDemo.module.css';

function Demo({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={s.demo} aria-labelledby={`${id}-title`} id={id}>
      <h2 id={`${id}-title`} className={s.title}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Every code-learning and assessment component with real examples. Built in dev and e2e builds only. */
export default function ComponentsDemo() {
  const [first, setFirst] = useState(3);
  const state = useMemo(() => ({ xs: [first, 1, 4] }), [first]);
  const trace = useMemo(() => buildRunningSumTrace(state.xs), [state]);

  return (
    <LessonIdContext.Provider value="dev/components">
      <div className={s.page}>
        <h1 className={s.h1}>
          <span className={s.slash} aria-hidden="true">
            /
          </span>{' '}
          Code components
        </h1>
        <p className={s.lead}>Developer demo of the lesson components registered in mdx-components.tsx.</p>

        <Demo id="annotated" title="Annotated code">
          <AnnotatedCode example={demo.matmulExample} title="matmul.py" />
        </Demo>

        <Demo id="step-computed" title="Step-through: computed, linked to state">
          <div className={s.control}>
            <Slider label="First item of xs" value={first} min={0} max={9} onChange={setFirst} />
          </div>
          <SlotStateContext.Provider value={state}>
            <StepThrough example={demo.runningSumExample} trace={trace} title="running_sum.py" />
          </SlotStateContext.Provider>
        </Demo>

        <Demo id="step-simulated" title="Step-through: simulated">
          <StepThrough example={demo.torchExample} trace={demo.torchTrace} title="linear.py" />
        </Demo>

        <Demo id="step-pyodide" title="Step-through: recorded in Python">
          <StepThrough example={demo.squaresExample} title="squares.py" />
        </Demo>

        <Demo id="progressive" title="Progressive code">
          <ProgressiveCode example={demo.stagesExample} title="matmul" />
        </Demo>

        <Demo id="runner" title="Python runner">
          <PythonRunner
            example={{
              id: 'demo-sum',
              language: 'python',
              source: 'print(sum(range(5)))',
              annotations: [],
              expectedOutput: '10',
            }}
          />
        </Demo>

        <Demo id="check" title="Knowledge check">
          <KnowledgeCheck questions={demo.questions} />
        </Demo>

        <Demo id="exercise" title="Mini-exercise">
          <MiniExercise exercise={demo.dotExercise} />
        </Demo>

        <Demo id="mistake" title="Common mistake">
          <CommonMistake {...demo.mismatch} />
        </Demo>

        <Demo id="project" title="Project brief">
          <ProjectBrief brief={demo.brief} />
        </Demo>
      </div>
    </LessonIdContext.Provider>
  );
}
