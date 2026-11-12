import { useCallback } from 'react';
import { useParams } from 'react-router';
import { curriculum } from '@/app/content';
import { getExam } from '@/app/exams';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExamIntro } from '@/components/exam/ExamIntro';
import { ExamResults } from '@/components/exam/ExamResults';
import { ExamRunner } from '@/components/exam/ExamRunner';
import { HandsOnPanel } from '@/components/exam/HandsOnPanel';
import { useExamStore } from '@/components/exam/useExamStore';
import { Tabs } from '@/components/ui';
import { gradeAttempt, startAttempt, submit, type Attempt } from '@/lib/exam/engine';
import { recordSitting, setAttempt } from '@/lib/exam/storage';
import NotFound from './NotFound';
import s from '@/components/exam/Exam.module.css';

export default function ExamPage() {
  const { track: trackId = '' } = useParams();
  const track = curriculum.getTrack(trackId);
  const exam = getExam(trackId);
  const { state, update } = useExamStore();
  const attempt = state.attempts[trackId];

  const save = useCallback(
    (a: Attempt | undefined) => update((st) => setAttempt(st, trackId, a)),
    [update, trackId],
  );
  const finish = useCallback(() => {
    if (!exam) return;
    update((st) => {
      const current = st.attempts[trackId];
      if (!current || current.submittedAt !== undefined) return st;
      const done = submit(current, Date.now());
      const r = gradeAttempt(exam, done);
      return recordSitting(setAttempt(st, trackId, done), trackId, {
        at: done.submittedAt!,
        percent: r.percent,
        passed: r.passed,
      });
    });
    window.scrollTo(0, 0);
  }, [exam, trackId, update]);

  if (!track || !exam) return <NotFound />;

  const start = () => {
    save(startAttempt(exam, `${Date.now()}`, Date.now()));
    window.scrollTo(0, 0);
  };
  const inProgress = attempt && attempt.submittedAt === undefined;

  const mcq = !attempt ? (
    <ExamIntro exam={exam} history={state.history[trackId] ?? []} onStart={start} />
  ) : inProgress ? (
    <ExamRunner exam={exam} attempt={attempt} onChange={save} onSubmit={finish} />
  ) : (
    <ExamResults exam={exam} attempt={attempt} onRetake={() => save(undefined)} />
  );

  return (
    <>
      <PageHeader code={track.code} label="Certification exam" title={exam.title} />
      <div className={s.page}>
        <Tabs
          label="Exam parts"
          tabs={[
            { id: 'mcq', label: 'Multiple choice', content: mcq },
            { id: 'hands-on', label: 'Hands-on', content: <HandsOnPanel exam={exam} /> },
          ]}
        />
      </div>
    </>
  );
}
