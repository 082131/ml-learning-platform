import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { FunnelLabResult } from '@/lib/sql/experiments';
import { FUNNEL_STEPS, WINDOW_LABEL, formatOffset, type FunnelSpec } from '@/lib/sql/funnel';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SqlViz.module.css';

/** The purchase funnel under one definition: bars per step, and for user counts, when each user reached each step. */
export function FunnelLab() {
  const { result: r, state } = useExperimentContext<FunnelSpec, FunnelLabResult>('FunnelLab');
  const top = r.steps[0]!.value || 1;
  const last = r.steps[r.steps.length - 1]!;
  const users = state.count === 'users';
  return (
    <VizFrame
      title="The same events, one funnel definition"
      caption={`${users ? `Users who reached each step in order within ${WINDOW_LABEL[state.window]} of their first visit` : 'Every event row, counted without order or time limit'}: ${r.steps.map((x) => `${x.step} ${x.value}`).join(', ')}. ${last.step} is ${last.pctFirst} percent of ${r.steps[0]!.step}.`}
      table={<VizTable caption="Funnel" columns={['step', users ? 'users' : 'events', '% of previous', '% of first']} rows={r.steps.map((x) => [x.step, x.value, x.pctPrevious ?? '', x.pctFirst])} />}
    >
      <div className={s.viz} data-values={r.steps.map((x) => x.value).join(',')} data-overall={last.pctFirst}>
        <ol className={s.bars}>
          {r.steps.map((x) => (
            <li key={x.step} className={s.bar}>
              <span className={s.label}>{x.step}</span>
              <span className={s.barTrack}>
                <span className={s.barFill} style={{ width: `${(100 * x.value) / top}%` }} />
                <span className={s.barText}>
                  {x.value} {users ? 'users' : 'events'}
                  {x.pctPrevious !== null && ` · ${x.pctPrevious}% of previous`} · {x.pctFirst}% of first
                </span>
              </span>
            </li>
          ))}
        </ol>
        {users && (
          <>
            <p className={s.note}>When each user reached each step, after their first visit. Greyed times happened, but too late for this window.</p>
            <div className={s.tableWrap}>
              <table className={s.rows}>
                <thead>
                  <tr>
                    <th scope="col">user</th>
                    {FUNNEL_STEPS.slice(1).map((st) => (
                      <th scope="col" key={st}>
                        {st}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.users.map((u) => (
                    <tr key={u.userId}>
                      <td>{u.name}</td>
                      {FUNNEL_STEPS.slice(1).map((st, j) => {
                        const inWindow = u.reached[j + 1];
                        const ever = u.reachedAnyTime[j + 1];
                        const late = (inWindow === null || inWindow === undefined) && ever !== null && ever !== undefined;
                        return (
                          <td key={st} data-hl={inWindow !== null || undefined} data-late={late || undefined}>
                            {inWindow !== null && inWindow !== undefined ? formatOffset(inWindow) : late ? `${formatOffset(ever)} (late)` : '–'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <pre className={s.sql}>{r.sql}</pre>
      </div>
    </VizFrame>
  );
}
