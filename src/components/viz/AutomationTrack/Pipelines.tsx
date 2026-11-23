import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { DagResult } from '@/lib/automation/dag';
import { dagTasks, type DagState, type IntervalState } from '@/lib/automation/experiments';
import { fmt, type DagRunInfo } from '@/lib/automation/intervals';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './AutomationTrack.module.css';

const SEG_TONE = { success: 'ok', failed: 'err', retry: 'warn' } as const;

/** A Gantt chart of one DAG run: every attempt of every task, in its worker slot's time. */
export function DagGantt() {
  const { state, result: r } = useExperimentContext<DagState, DagResult>('DagGantt');
  const span = Math.max(1, r.makespan);
  const tasks = dagTasks(state);
  return (
    <VizFrame
      title="One DAG run, minute by minute"
      badge={<Badge tone="simulated">Simulated scheduler</Badge>}
      caption={`DAG run ${r.dagState} after ${r.makespan} minutes on ${state.slots} worker slot${state.slots > 1 ? 's' : ''}. Order: ${r.order.join(' → ')}.`}
      table={<VizTable caption="Task attempts" columns={['task', 'attempt', 'start', 'end', 'outcome']} rows={r.segments.map((g) => [g.task, g.attempt, g.start, g.end, g.outcome])} />}
    >
      <ul className={s.gantt} data-dag-state={r.dagState} data-makespan={r.makespan}>
        {tasks.map((t) => {
          const st = r.states[t.id];
          return (
            <li key={t.id} className={s.ganttRow} data-task={t.id} data-state={st}>
              <span className={s.mono}>
                {t.id}
                {t.trigger === 'all_done' ? ' (all_done)' : ''}
              </span>
              <span className={s.track} aria-hidden="true">
                {r.segments
                  .filter((g) => g.task === t.id)
                  .map((g) => (
                    <span key={g.attempt} className={s.mark} data-tone={SEG_TONE[g.outcome]} style={{ left: `${(g.start / span) * 100}%`, width: `${((g.end - g.start) / span) * 100}%` }}>
                      {g.attempt}
                    </span>
                  ))}
              </span>
              <span className={s.tag} data-tone={st === 'success' ? 'ok' : 'err'}>
                {st ?? 'none'}
              </span>
            </li>
          );
        })}
      </ul>
      <p className={s.muted}>Numbers are attempt numbers. Amber: failed, will retry. Red: failed for good. A row with no bar never started.</p>
    </VizFrame>
  );
}

/** The runs the scheduler creates when the DAG is switched on, with their logical dates and data intervals. */
export function IntervalRuns() {
  const { state, result: runs } = useExperimentContext<IntervalState, DagRunInfo[]>('IntervalRuns');
  return (
    <VizFrame
      title="Runs created when you switch the DAG on"
      caption={`Now is 2026-11-23 14:00 UTC. ${runs.length} run${runs.length === 1 ? '' : 's'} with catchup=${state.catchup ? 'True' : 'False'} on the ${state.timetable === 'trigger' ? 'trigger' : 'data-interval'} timetable.`}
      table={<VizTable caption="DAG runs" columns={['logical date', 'data interval', 'runs after', 'wave']} rows={runs.map((x) => [fmt(x.logicalDate), `${fmt(x.intervalStart)} to ${fmt(x.intervalEnd)}`, fmt(x.runAfter), x.wave + 1])} />}
    >
      <ul className={s.list} data-runs={runs.length}>
        {runs.length === 0 && <li className={s.muted}>No run yet: the first {state.timetable === 'trigger' ? 'tick' : 'interval'} has not {state.timetable === 'trigger' ? 'arrived' : 'ended'}.</li>}
        {runs.map((x) => (
          <li key={x.logicalDate} className={s.row}>
            <span className={s.mono}>
              logical {fmt(x.logicalDate)} · data {x.intervalStart === x.intervalEnd ? 'the instant itself' : `[${fmt(x.intervalStart).slice(5)}, ${fmt(x.intervalEnd).slice(5)})`}
            </span>
            <span className={s.tag}>wave {x.wave + 1}</span>
          </li>
        ))}
      </ul>
    </VizFrame>
  );
}
