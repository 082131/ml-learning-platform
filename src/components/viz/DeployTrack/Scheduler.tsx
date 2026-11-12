import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { NODES, type SchedResult, type SchedState } from '@/lib/deploy/scheduler';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Status } from '../AiTrack/Status';
import a from '../AiTrack/AiTrack.module.css';
import s from './DeployTrack.module.css';

const pct = (used: number, total: number) => (total ? `${Math.min(100, (used / total) * 100)}%` : '0%');

/** Three nodes with their reserved CPU, memory and GPU, the pods on each, and the pods left Pending. */
export function SchedulerNodes() {
  const { state, result } = useExperimentContext<SchedState, SchedResult>('SchedulerNodes');
  const pending = result.placements.filter((p) => !p.node);
  return (
    <VizFrame
      title="Where the scheduler puts each replica"
      badge={<Badge tone="simulated">Scheduler model</Badge>}
      caption={`${state.replicas - result.pending} of ${state.replicas} pods placed. Each asks for ${state.cpu}m CPU, ${state.memGi} GiB and ${state.gpu} GPU.${pending.length ? ` Pending: ${pending[0]!.message}` : ''}`}
      table={
        <VizTable
          caption="Requests reserved on each node"
          columns={['node', 'CPU (m)', 'memory (GiB)', 'GPU', 'pods']}
          rows={result.nodes.map((u, i) => [
            u.name,
            `${u.cpu} / ${NODES[i]!.cpu}`,
            `${u.memGi} / ${NODES[i]!.memGi}`,
            `${u.gpu} / ${NODES[i]!.gpu}`,
            u.pods.join(' ') || '–',
          ])}
        />
      }
    >
      <div className={s.nodes} data-pending={result.pending} data-placement={result.placements.map((p) => p.node ?? 'pending').join(',')}>
        {result.nodes.map((u, i) => {
          const n = NODES[i]!;
          return (
            <section key={u.name} className={a.panel} aria-label={`Node ${u.name}`}>
              <h4 className={a.panelTitle}>
                {u.name}
                {n.gpuTaint && state.taint === 'on' ? <Badge tone="outline">tainted: GPU pods only</Badge> : null}
              </h4>
              <div className={a.bars}>
                {(
                  [
                    ['CPU', u.cpu, n.cpu, `${u.cpu}/${n.cpu}m`],
                    ['memory', u.memGi, n.memGi, `${u.memGi}/${n.memGi} GiB`],
                    ['GPU', u.gpu, n.gpu, `${u.gpu}/${n.gpu}`],
                  ] as const
                ).map(([label, used, total, text]) => (
                  <div key={label} style={{ display: 'contents' }}>
                    <span>{label}</span>
                    <span className={a.track} aria-hidden="true">
                      <span className={a.fill} style={{ width: pct(used, total) }} />
                    </span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <ul className={a.tokens} aria-label={`Pods on ${u.name}`}>
                {u.pods.length ? u.pods.map((p) => <li key={p} className={a.token}>{p}</li>) : <li className={a.muted}>no pods</li>}
              </ul>
            </section>
          );
        })}
      </div>
      {pending.length ? (
        <section className={a.panel} aria-label="Pending pods">
          <h4 className={a.panelTitle}>
            <Status tone="err">{`${pending.length} Pending`}</Status>
          </h4>
          <ul className={a.list}>
            {pending.map((p) => (
              <li key={p.pod}>
                {p.pod}: FailedScheduling: {p.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </VizFrame>
  );
}
