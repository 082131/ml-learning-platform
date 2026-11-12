import type { ExamDef } from '@/lib/exam/types';
import type { SittingRecord } from '@/lib/exam/storage';
import { Button } from '@/components/ui';
import s from './Exam.module.css';

interface ExamIntroProps {
  exam: ExamDef;
  history: SittingRecord[];
  onStart: () => void;
}

const multiCount = (exam: ExamDef) => exam.questions.filter((q) => q.answer.length > 1).length;

/** What the exam is modeled on, its blueprint, the rules, and past sittings. */
export function ExamIntro({ exam, history, onStart }: ExamIntroProps) {
  return (
    <div className={s.intro}>
      <p className={s.lead}>{exam.summary}</p>

      <section className={s.section} aria-labelledby="exam-certs">
        <h2 id="exam-certs" className={s.h2}>
          Certifications this prepares you for
        </h2>
        <div className={s.certs}>
          {exam.certifications.map((c) => (
            <article key={c.name} className={s.cert}>
              <span className={s.vendor}>{c.vendor}</span>
              <a href={c.url} target="_blank" rel="noreferrer">
                {c.name}
              </a>
              <p>{c.format}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={s.section} aria-labelledby="exam-blueprint">
        <h2 id="exam-blueprint" className={s.h2}>
          Blueprint
        </h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Domain</th>
                <th scope="col">Maps to</th>
                <th scope="col" className={s.num}>
                  Items
                </th>
              </tr>
            </thead>
            <tbody>
              {exam.domains.map((d) => (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td className={s.muted}>{d.maps}</td>
                  <td className={s.num}>{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.section} aria-labelledby="exam-rules">
        <h2 id="exam-rules" className={s.h2}>
          Rules
        </h2>
        <ul className={s.list}>
          <li>
            {exam.questions.length} items in {exam.minutes} minutes. The timer keeps running if you leave the
            page, and the exam submits itself when time runs out.
          </li>
          <li>
            {multiCount(exam)} items say “Choose two” (or three). They score only when every pick is right, as
            on the AWS and Google exams.
          </li>
          <li>No feedback until you submit. You can flag items and come back to them.</li>
          <li>
            Pass mark: {exam.passPercent}%. Question and option order are shuffled for every sitting, and
            option lengths are balanced, so neither position nor length gives an answer away.
          </li>
        </ul>
      </section>

      <div className={s.row}>
        <Button variant="primary" onClick={onStart}>
          Start the exam
        </Button>
      </div>

      {history.length > 0 && (
        <section className={s.section} aria-labelledby="exam-history">
          <h2 id="exam-history" className={s.h2}>
            Past sittings
          </h2>
          <ul className={s.list}>
            {history.map((h) => (
              <li key={h.at}>
                {new Date(h.at).toLocaleString()} · {h.percent}% · {h.passed ? 'pass' : 'not yet'}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
