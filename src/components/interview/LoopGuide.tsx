import { designFramework, roles, sources } from '@/app/interview';
import s from './Interview.module.css';
import exam from '@/components/exam/Exam.module.css';

/** How interview loops are structured, the design-round framework, and where this material comes from. */
export function LoopGuide() {
  return (
    <div className={s.panel}>
      <section className={s.block} aria-labelledby="loops-title">
        <h2 id="loops-title" className={s.h2}>
          What each loop looks like
        </h2>
        <div className={exam.tableWrap}>
          <table className={exam.table}>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Rounds candidates report</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td className={exam.muted}>{r.loop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.block} aria-labelledby="framework-title">
        <h2 id="framework-title" className={s.h2}>
          A 45-minute system design round
        </h2>
        <p className={s.muted}>
          Interviewers score problem framing, data and features, model design, integration and evaluation, and
          how clearly you communicate. Spend your time roughly like this.
        </p>
        <ol className={s.steps}>
          {designFramework.map((f) => (
            <li key={f.step}>
              <span className={s.stepHead}>
                <strong>{f.step}</strong>
                <span className={s.meta}>{f.minutes}</span>
              </span>
              <span className={s.muted}>{f.what}</span>
            </li>
          ))}
        </ol>
        <p className={s.muted}>
          Mistakes that cost the most: skipping clarification, treating the loss function as the business
          goal, listing features without saying why they matter, proposing a complex model with no baseline,
          and ignoring latency and cost.
        </p>
      </section>

      <section className={s.block} aria-labelledby="sources-title">
        <h2 id="sources-title" className={s.h2}>
          Where this comes from
        </h2>
        <p className={s.muted}>
          The questions and model answers were written for this site. They follow the formats and rubrics that
          these public guides describe; they are not real questions leaked from any company.
        </p>
        <ul className={s.sources}>
          {sources.map((src) => (
            <li key={src.url}>
              <a href={src.url} target="_blank" rel="noreferrer">
                {src.title}
              </a>
              <span className={s.muted}>{src.used}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
