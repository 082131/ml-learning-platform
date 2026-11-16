import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getScreen, roles } from '@/app/interview';
import { HandsOnTask } from '@/components/exam/HandsOnTask';
import { useNow } from '@/components/exam/useExamStore';
import { useInterviewStore } from '@/components/interview/useInterviewStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, ButtonLink } from '@/components/ui';
import { formatClock, taskPoints, timeLeft } from '@/lib/exam/engine';
import { scoreSitting } from '@/lib/interview/practice';
import { clearSitting, recordScreenRun, startSitting, submitSitting } from '@/lib/interview/storage';
import NotFound from './NotFound';
import exam from '@/components/exam/Exam.module.css';
import s from '@/components/interview/Interview.module.css';

const LOW_TIME_MS = 5 * 60_000;

/** One timed coding screen: rules, then the tasks against a clock, then the scored result with solutions. */
export default function ScreenPage() {
  const { id = '' } = useParams();
  const screen = getScreen(id);
  const { state, update } = useInterviewStore();
  const [confirming, setConfirming] = useState(false);
  const sitting = state.sittings[id];
  const running = sitting !== undefined && sitting.submittedAt === undefined;
  const now = useNow(running);

  const finish = useCallback(() => {
    if (!screen) return;
    update((st) => submitSitting(st, id, Date.now(), (done) => scoreSitting(screen, done)));
    window.scrollTo(0, 0);
  }, [id, screen, update]);

  const left = screen && sitting ? timeLeft({ startedAt: sitting.startedAt }, screen.minutes, now) : 0;
  useEffect(() => {
    if (running && left === 0) finish();
  }, [running, left, finish]);

  if (!screen) return <NotFound />;

  const role = roles.find((r) => r.id === screen.role);
  const score = scoreSitting(screen, sitting);
  const history = state.history[id] ?? [];
  const header = <PageHeader code="IV" label={`${role?.title ?? ''} · coding screen`} title={screen.title} />;
  const back = (
    <ButtonLink to="/interview?tab=screens" variant="ghost">
      ← All screens
    </ButtonLink>
  );

  if (!sitting)
    return (
      <>
        {header}
        <div className={s.page}>
          <div className={exam.intro}>
            <p className={exam.lead}>{screen.summary}</p>
            <section className={exam.section} aria-labelledby="screen-rules">
              <h2 id="screen-rules" className={exam.h2}>
                Rules
              </h2>
              <ul className={exam.list}>
                <li>
                  {screen.tasks.length} tasks, {score.total} points, {screen.minutes} minutes. The clock
                  starts when you press Start and keeps running if you leave the page.
                </li>
                <li>
                  Write Python and press <em>Run graded checks</em> as often as you like. Hidden asserts run
                  in your browser (Pyodide); your best run on each task counts.
                </li>
                <li>
                  When time runs out the editors lock and the screen submits itself. Reference solutions
                  appear only after you submit. Pass mark: {screen.passPercent}%.
                </li>
                <li>Talk through your approach as you would with an interviewer listening.</li>
              </ul>
            </section>
            <section className={exam.section} aria-labelledby="screen-tasks">
              <h2 id="screen-tasks" className={exam.h2}>
                Tasks
              </h2>
              <ol className={exam.list}>
                {screen.tasks.map((t) => (
                  <li key={t.id}>
                    {t.title} · {taskPoints(t)} points
                  </li>
                ))}
              </ol>
            </section>
            <div className={exam.row}>
              <Button
                variant="primary"
                onClick={() => {
                  update((st) => startSitting(st, id, Date.now()));
                  window.scrollTo(0, 0);
                }}
              >
                Start the {screen.minutes}-minute screen
              </Button>
              {back}
            </div>
            {history.length > 0 && (
              <section className={exam.section} aria-labelledby="screen-history">
                <h2 id="screen-history" className={exam.h2}>
                  Past sittings
                </h2>
                <ul className={exam.list}>
                  {history.map((h) => (
                    <li key={h.at}>
                      {new Date(h.at).toLocaleString()} · {h.percent}% · {h.passed ? 'pass' : 'not yet'}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </>
    );

  return (
    <>
      {header}
      <div className={s.page}>
        {running ? (
          <>
            <div className={exam.bar}>
              <span className={exam.clock} data-low={left < LOW_TIME_MS} role="timer" aria-label="Time left">
                {formatClock(left)}
              </span>
              <span className={exam.meta} data-screen-score={score.earned}>
                {score.earned} / {score.total} points so far
              </span>
              <Button variant="primary" size="sm" onClick={() => setConfirming(true)}>
                Submit screen
              </Button>
            </div>
            {confirming && (
              <div className={exam.confirm} role="alertdialog" aria-labelledby="screen-confirm">
                <p id="screen-confirm">
                  Submit with {score.earned} of {score.total} points and {formatClock(left)} left? You cannot
                  change your code afterwards.
                </p>
                <div className={exam.row}>
                  <Button variant="primary" onClick={finish}>
                    Submit and see my result
                  </Button>
                  <Button onClick={() => setConfirming(false)}>Keep working</Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <section className={exam.section} aria-labelledby="screen-result">
            <h2 id="screen-result" className={exam.h2}>
              Your result
            </h2>
            <div className={exam.score}>
              <span className={exam.big} data-screen-result={score.percent}>
                {score.earned} / {score.total}
              </span>
              <Badge tone={score.passed ? 'ok' : 'warn'}>
                {score.passed
                  ? `Pass (≥ ${screen.passPercent}%)`
                  : `Below the ${screen.passPercent}% pass mark`}
              </Badge>
              <span className={exam.meta}>
                Used{' '}
                {formatClock(Math.min(sitting.submittedAt! - sitting.startedAt, screen.minutes * 60_000))} of{' '}
                {screen.minutes}:00
              </span>
            </div>
            <p className={s.muted}>
              Compare your code with each reference solution below. In a real round, the interviewer would now
              ask about complexity, edge cases and how you would test it.
            </p>
            <div className={exam.row}>
              <Button
                variant="primary"
                onClick={() => {
                  setConfirming(false);
                  update((st) => clearSitting(st, id));
                }}
              >
                Start a new sitting
              </Button>
              {back}
            </div>
          </section>
        )}

        <div className={s.tasks}>
          {screen.tasks.map((t, i) => (
            <HandsOnTask
              key={`${t.id}:${sitting.startedAt}`}
              task={t}
              index={i}
              record={sitting.tasks[t.id] ? { ...sitting.tasks[t.id]!, revealed: false } : undefined}
              onRun={(run) => update((st) => recordScreenRun(st, id, t.id, run))}
              onReveal={() => undefined}
              locked={!running}
              solution={running ? 'hidden' : 'shown'}
            />
          ))}
        </div>
      </div>
    </>
  );
}
