import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { duration, percent, type AvailabilityResult, type Layout } from '@/lib/cloud/availability';
import { ROLES, type IamResult, type IamState, type NetExperimentResult, type NetState } from '@/lib/cloud/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Bars } from './Bars';
import s from './CloudTrack.module.css';

/** Regions contain zones, zones contain instances; the layers' chances combine into the service's uptime. */
export function AvailabilityView() {
  const { state: l, result: r } = useExperimentContext<Layout, AvailabilityResult>('AvailabilityView');
  const rows: [string, number][] = [
    ['A zone has a healthy instance', r.zoneServes],
    ['A region can serve', r.regionServes],
    ['The service is up', r.service],
  ];
  return (
    <VizFrame
      title="Where your copies run"
      badge={<Badge tone="warn">Estimate</Badge>}
      caption={`${r.instances} instance${r.instances === 1 ? '' : 's'} across ${l.zonesPerRegion} zone${l.zonesPerRegion === 1 ? '' : 's'} in ${l.regions} region${l.regions === 1 ? '' : 's'}: up ${percent(r.service)} of the time, about ${duration(r.downHoursPerYear)} down a year, if failures are independent.`}
      table={<VizTable caption="Chance each layer can serve" columns={['layer', 'chance up', 'expected down per year']} rows={rows.map(([k, p]) => [k, percent(p), duration((1 - p) * 8760)])} />}
    >
      <div className={s.grid2} data-instances={r.instances}>
        <section className={s.panel} aria-label="Layout">
          <h4 className={s.panelHead}>Layout</h4>
          <div className={s.boxes}>
            {Array.from({ length: l.regions }, (_, g) => (
              <div key={g} className={s.nested} aria-label={`Region ${g + 1}`}>
                <span className={s.muted}>Region {g + 1}</span>
                {Array.from({ length: l.zonesPerRegion }, (_, z) => (
                  <div key={z} className={s.nested}>
                    <span className={s.muted}>Zone {String.fromCharCode(97 + z)}</span>
                    <span className={s.boxes}>
                      {Array.from({ length: l.replicasPerZone }, (_, k) => (
                        <span key={k} className={s.box}>
                          vm-{k + 1}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
        <section className={s.panel} aria-label="Uptime">
          <h4 className={s.panelHead}>Chance of being able to serve</h4>
          <ul className={s.list}>
            {rows.map(([k, p]) => (
              <li key={k} className={s.row}>
                <span>{k}</span>
                <span className={s.mono}>{percent(p)}</span>
              </li>
            ))}
          </ul>
          <p className={s.big} data-testid="downtime">
            {duration(r.downHoursPerYear)} down / year
          </p>
        </section>
      </div>
    </VizFrame>
  );
}

const roleName = (arn: string) => arn.split('/').pop();

/** The IAM decision as the three questions AWS asks, with every statement that matched. */
export function IamView() {
  const { state, result: r } = useExperimentContext<IamState, IamResult>('IamView');
  const e = r.evaluation;
  return (
    <VizFrame
      title="Is this request allowed?"
      caption={`${roleName(ROLES[state.role]!)} asks for ${state.action} on ${r.resource}: ${e.allowed ? 'allowed' : 'denied'} (${e.decision.replace('-', ' ')}).`}
      table={<VizTable caption="Evaluation steps" columns={['step', 'result']} rows={e.steps.map((x) => [x.step, x.result])} />}
    >
      <p className={s.verdict} data-ok={e.allowed} data-decision={e.decision}>
        {e.allowed ? 'Allow' : 'Deny'}: {roleName(ROLES[state.role]!)} → {state.action} on <span className={s.mono}>{r.resource}</span>
      </p>
      <ol className={s.list} aria-label="Evaluation steps">
        {e.steps.map((x) => (
          <li key={x.step} className={s.row}>
            <span>{x.step}</span>
            <span className={s.muted}>{x.result}</span>
          </li>
        ))}
      </ol>
      <h4 className={`${s.panelHead} ${s.spaced}`}>
        Policies in play
      </h4>
      <ul className={s.list}>
        {r.policies.map((p) => (
          <li key={p.name} className={s.row}>
            <span>
              {p.name} <span className={s.muted}>({p.source === 'identity' ? `on ${roleName(p.attachedTo!)}` : p.source})</span>
            </span>
            <span className={s.boxes}>
              {p.statements.map((st) => {
                const hit = e.hits.find((h) => h.policy === p.name && h.sid === st.sid);
                return (
                  <span key={st.sid} className={s.tag} data-tone={hit ? (hit.effect === 'Allow' ? 'ok' : 'err') : undefined}>
                    {st.sid}
                    {hit ? ` ✓ ${hit.effect}` : ''}
                  </span>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
    </VizFrame>
  );
}

/** Four traffic paths through the VPC, hop by hop. */
export function NetworkView() {
  const { result: r } = useExperimentContext<NetState, NetExperimentResult>('NetworkView');
  return (
    <VizFrame
      title="Which traffic gets through?"
      caption={`${r.problems === 0 ? 'Every path behaves as it should.' : `${r.problems} path${r.problems === 1 ? '' : 's'} behave the wrong way.`} ${r.split ? `This VPC splits into ${r.split.count.toLocaleString('en-US')} subnets of ${r.split.size} addresses: ${r.split.first.slice(0, 2).join(', ')} … ${r.split.last}.` : ''}`}
      table={<VizTable caption="Paths" columns={['path', 'reachable', 'blocked at']} rows={r.paths.map((p) => [p.title, p.reachable ? 'yes' : 'no', p.hops.find((h) => !h.ok)?.label ?? ''])} />}
    >
      <ul className={s.list} data-problems={r.problems}>
        {r.paths.map((p) => {
          const good = p.id === 'office' ? undefined : p.reachable === p.wanted;
          return (
            <li key={p.id} className={s.panel} data-path={p.id} data-reachable={p.reachable}>
              <div className={s.row}>
                <strong>{p.title}</strong>
                <span className={s.tag} data-tone={good === undefined ? undefined : good ? 'ok' : 'err'}>
                  {p.reachable ? 'gets through' : 'blocked'}
                  {good === false ? ' (problem)' : ''}
                  {p.id === 's3' && p.reachable ? ` via ${p.via}` : ''}
                </span>
              </div>
              <ol className={s.flow} aria-label={`Hops for: ${p.title}`}>
                {p.hops.map((h) => (
                  <li key={h.label} data-reached={h.ok} title={h.note}>
                    {h.ok ? '✓' : '✗'} {h.label}: {h.note}
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ul>
      {r.split && (
        <Bars
          label="Address space"
          items={[
            { key: 'vpc', label: 'Whole VPC', value: r.split.count * r.split.size, text: (r.split.count * r.split.size).toLocaleString('en-US') },
            { key: 'subnet', label: 'One subnet', value: r.split.size, text: `${r.split.size} (${r.split.usableAws} usable)` },
          ]}
        />
      )}
    </VizFrame>
  );
}
