import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { GateState } from '@/lib/automation/experiments';
import type { GateResult } from '@/lib/automation/gates';
import type { WorkflowInput, WorkflowResult } from '@/lib/automation/workflow';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './AutomationTrack.module.css';

const TONE = { success: 'ok', failure: 'err', skipped: 'skip' } as const;

/** The workflow's jobs on a timeline: when each starts, and whether it succeeds, fails or is skipped. */
export function WorkflowView() {
  const { result: r } = useExperimentContext<WorkflowInput, WorkflowResult>('WorkflowView');
  const span = Math.max(1, r.wall);
  return (
    <VizFrame
      title="Which jobs run"
      badge={<Badge tone="simulated">Assumed durations</Badge>}
      caption={
        r.triggered
          ? `Conclusion: ${r.conclusion}. ${r.jobs.filter((j) => j.status === 'skipped').length} jobs skipped. ${r.wall} minutes of wall-clock time, ${r.billed} runner minutes.`
          : 'paths-ignore matched every changed file, so the workflow did not run at all. A required check from it would wait forever ("Expected").'
      }
      table={r.triggered ? <VizTable caption="Jobs" columns={['job', 'status', 'start', 'end', 'why']} rows={r.jobs.map((j) => [j.id, j.status, j.start, j.end, j.why])} /> : undefined}
    >
      {!r.triggered ? (
        <p className={s.verdict} data-ok="false" data-conclusion={r.conclusion}>
          Workflow not triggered: no jobs, no status checks.
        </p>
      ) : (
        <ul className={s.gantt} data-conclusion={r.conclusion}>
          {r.jobs.map((j) => (
            <li key={j.id} className={s.ganttRow} data-job={j.id} data-status={j.status}>
              <span className={s.mono}>{j.id}</span>
              <span className={s.track} aria-hidden="true">
                <span className={s.mark} data-tone={TONE[j.status]} style={{ left: `${(j.start / span) * 100}%`, width: j.status === 'skipped' ? 6 : `${((j.end - j.start) / span) * 100}%` }} />
              </span>
              <span className={s.tag} data-tone={j.status === 'success' ? 'ok' : j.status === 'failure' ? 'err' : undefined} title={j.why}>
                {j.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </VizFrame>
  );
}

const STAGES = ['registered', 'staging', 'production'] as const;

/** The candidate model's gates, and how far it gets toward production. */
export function GateView() {
  const { result: r } = useExperimentContext<GateState, GateResult>('GateView');
  const reached = STAGES.indexOf(r.stage);
  return (
    <VizFrame
      title="Release gate"
      caption={`Decision: ${r.decision}. ${r.gates.filter((g) => !g.pass).map((g) => g.name).join(', ') || 'Every gate passed'}${r.gates.some((g) => !g.pass) ? ' did not pass.' : '.'}`}
      table={<VizTable caption="Gates" columns={['gate', 'result', 'detail']} rows={r.gates.map((g) => [g.name, g.pass ? 'pass' : 'fail', g.detail])} />}
    >
      <ol className={s.flow} aria-label="Stages" data-stage={r.stage}>
        {STAGES.map((st, k) => (
          <li key={st} data-reached={k <= reached}>
            {k <= reached ? '✓ ' : ''}
            {st}
          </li>
        ))}
      </ol>
      <ul className={s.list}>
        {r.gates.map((g) => (
          <li key={g.name} className={s.row}>
            <span>
              <strong>{g.name}</strong> <span className={s.muted}>{g.detail}</span>
            </span>
            <span className={s.tag} data-tone={g.pass ? 'ok' : 'err'}>
              {g.pass ? 'pass' : 'fail'}
            </span>
          </li>
        ))}
      </ul>
    </VizFrame>
  );
}
