import { roles, screens } from '@/app/interview';
import { scoreSitting } from '@/lib/interview/practice';
import { Badge, ButtonLink } from '@/components/ui';
import { useInterviewStore } from './useInterviewStore';
import s from './Interview.module.css';

const roleTitle = Object.fromEntries(roles.map((r) => [r.id, r.title]));

/** The timed coding screens, one per role, with the state of each sitting. */
export function ScreenList() {
  const { state } = useInterviewStore();
  return (
    <div className={s.panel}>
      <p className={s.lead}>
        Each screen is one sitting against the clock, like a live coding round or a take-home on a timer:
        three tasks, graded by hidden checks that run in your browser. The clock keeps running if you leave
        the page.
      </p>
      <ul className={s.screens}>
        {screens.map((sc) => {
          const sitting = state.sittings[sc.id];
          const running = sitting && sitting.submittedAt === undefined;
          const best = (state.history[sc.id] ?? []).reduce((m, h) => Math.max(m, h.percent), -1);
          return (
            <li key={sc.id} className={s.screen} data-screen={sc.id}>
              <span className={s.tag}>{roleTitle[sc.role]}</span>
              <h3 className={s.screenTitle}>{sc.title}</h3>
              <p className={s.muted}>{sc.summary}</p>
              <p className={s.meta}>
                {sc.tasks.length} tasks · {sc.minutes} minutes · pass at {sc.passPercent}%
              </p>
              <div className={s.row}>
                <ButtonLink to={`/interview/screen/${sc.id}`} variant={running ? 'primary' : 'secondary'}>
                  {running ? 'Continue sitting' : sitting ? 'See your result' : 'Open screen'}
                </ButtonLink>
                {running && <Badge tone="accent">In progress · {scoreSitting(sc, sitting).earned} pts</Badge>}
                {best >= 0 && <Badge tone={best >= sc.passPercent ? 'ok' : 'neutral'}>Best {best}%</Badge>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
