import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { SessionLabResult, SessionLabState } from '@/lib/sql/experiments';
import { USER_NAMES } from '@/lib/sql/funnel';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SqlViz.module.css';

const gapText = (g: number | null) => (g === null ? 'first event' : g < 60 ? `${Math.round(g)} min` : g < 2880 ? `${Math.round(g / 60)} h` : `${Math.round(g / 1440)} d`);

/** One user's events with the gap to the previous event; a gap above the timeout starts a new session. */
export function SessionLab() {
  const { result: r, state } = useExperimentContext<SessionLabState, SessionLabResult>('SessionLab');
  const mine = r.events.filter((e) => e.userId === state.user);
  const name = USER_NAMES[state.user] ?? String(state.user);
  const own = r.sessions.filter((x) => x.userId === state.user);
  return (
    <VizFrame
      title={`${name}'s events, split into sessions`}
      caption={`With a ${state.timeout}-minute timeout, ${name}'s ${mine.length} events form ${own.length} session${own.length === 1 ? '' : 's'}; the whole log forms ${r.totalSessions} sessions, ${r.purchaseSessions} of them with a purchase.`}
      table={<VizTable caption="Events with session numbers" columns={['event_time', 'event', 'gap', 'new_session', 'session_no']} rows={mine.map((e) => [e.time, e.event, gapText(e.gapMin), e.newSession ? 1 : 0, e.sessionNo])} />}
    >
      <div className={s.viz} data-user={state.user} data-sessions={own.length} data-total={r.totalSessions}>
        <p className={s.note}>A row starts a new session (marked by a line above it) when the gap since the previous event is longer than the timeout.</p>
        <div className={s.tableWrap}>
          <table className={s.rows}>
            <thead>
              <tr>
                <th scope="col">event_time</th>
                <th scope="col">event</th>
                <th scope="col">gap</th>
                <th scope="col">new_session</th>
                <th scope="col">session_no</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((e, i) => (
                <tr key={e.id} data-group-start={(i > 0 && e.newSession) || undefined} data-hl={e.event === 'purchase' || undefined}>
                  <td>{e.time}</td>
                  <td>{e.event}</td>
                  <td>{gapText(e.gapMin)}</td>
                  <td>{e.newSession ? 1 : 0}</td>
                  <td>{e.sessionNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={s.label}>Sessions per user</p>
        <p className={s.code}>
          {Object.entries(USER_NAMES)
            .map(([id, n]) => `${n} ${r.sessions.filter((x) => x.userId === Number(id)).length}`)
            .join(' · ')}
        </p>
        <pre className={s.sql}>{r.sql}</pre>
      </div>
    </VizFrame>
  );
}
