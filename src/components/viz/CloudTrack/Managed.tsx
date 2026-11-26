import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { ApiInput, ApiResult } from '@/lib/cloud/apis';
import { num, usd } from '@/lib/cloud/experiments';
import type { ManagedInput, ManagedResult, Side } from '@/lib/cloud/managed';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Bars } from './Bars';
import s from './CloudTrack.module.css';

function Timeline({ side, span, label }: { side: Side; span: number; label: string }) {
  const starts = side.phases.map((_, k) => side.phases.slice(0, k).reduce((a, p) => a + p.minutes, 0));
  return (
    <section className={s.panel} aria-label={label}>
      <h4 className={s.panelHead}>
        {label}: {num(side.billedHours, 2)} billed instance-hours
      </h4>
      <div className={s.track} aria-hidden="true">
        {side.phases.map((p, k) => (
          <span key={p.name} className={s.mark} data-tone={!p.billed ? 'skip' : p.name.startsWith('Idle') ? 'err' : p.name === 'Training' ? undefined : 'warn'} style={{ left: `${(starts[k]! / span) * 100}%`, width: `${(p.minutes / span) * 100}%` }} />
        ))}
      </div>
      <ul className={s.list}>
        {side.phases.map((p) => (
          <li key={p.name} className={s.row}>
            <span>{p.name}</span>
            <span className={s.mono}>
              {num(p.minutes, 1)} min {p.billed ? '' : '(not billed)'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A managed training job and a hand-run VM doing the same work, phase by phase. */
export function ManagedView() {
  const { state: x, result: r } = useExperimentContext<ManagedInput, ManagedResult>('ManagedView');
  const span = Math.max(...[r.managed, r.vm].map((v) => v.phases.reduce((a, p) => a + p.minutes, 0)), 1);
  return (
    <VizFrame
      title="Managed job vs your own VM"
      badge={<Badge tone="warn">Estimate</Badge>}
      caption={`Same ${x.trainHours} h of training on ${x.instances} instance${x.instances === 1 ? '' : 's'}: the managed job bills ${usd(r.managed.cost, 2)}, the VM ${usd(r.vm.cost, 2)}, mostly because nobody has to remember to turn the job off.`}
      table={<VizTable caption="Phases" columns={['side', 'phase', 'minutes', 'billed']} rows={[...r.managed.phases.map((p) => ['managed', p.name, num(p.minutes, 1), p.billed ? 'yes' : 'no']), ...r.vm.phases.map((p) => ['VM', p.name, num(p.minutes, 1), p.billed ? 'yes' : 'no'])]} />}
    >
      <div className={s.grid2} data-managed={r.managed.cost.toFixed(2)} data-vm={r.vm.cost.toFixed(2)}>
        <Timeline side={r.managed} span={span} label="Managed training job" />
        <Timeline side={r.vm} span={span} label="Your own VM" />
      </div>
    </VizFrame>
  );
}

/** Monthly cost of a model API and of self-hosting, with the break-even volume. */
export function ApiView() {
  const { state: x, result: r } = useExperimentContext<ApiInput, ApiResult>('ApiView');
  return (
    <VizFrame
      title="Model API or your own GPUs?"
      badge={<Badge tone="warn">Illustrative prices</Badge>}
      caption={`${x.requestsPerDay.toLocaleString('en-US')} requests a day: the API costs ${usd(r.api)} a month, self-hosting ${usd(r.selfHost.total)}. ${r.breakEvenPerDay ? `Self-hosting wins above about ${r.breakEvenPerDay.toLocaleString('en-US')} requests a day.` : 'Self-hosting does not win in this range.'}`}
      table={
        <VizTable
          caption="Monthly cost"
          columns={['option', 'formula', 'cost']}
          rows={[
            ['API', `30 × ${x.requestsPerDay} × (${x.inputTokens} × $${x.priceIn} + ${x.outputTokens} × $${x.priceOut}) / 1e6`, usd(r.api)],
            ['GPUs', `${r.selfHost.gpus} × 730 h × $${x.gpuPricePerHour}`, usd(r.selfHost.gpuCost)],
            ['operations', `${x.opsHours} h × $${x.opsRate}`, usd(r.selfHost.ops)],
          ]}
        />
      }
    >
      <div data-cheaper={r.cheaper}>
        <Bars
          label="Monthly cost"
          items={[
            { key: 'api', label: 'Managed API', value: r.api, text: usd(r.api), tone: r.cheaper === 'api' ? 'ok' : 'err', formula: 'pay per token, nothing when idle' },
            { key: 'self', label: 'Self-hosted', value: r.selfHost.total, text: usd(r.selfHost.total), tone: r.cheaper === 'self-host' ? 'ok' : 'err', formula: `GPUs ${usd(r.selfHost.gpuCost)} + people ${usd(r.selfHost.ops)}; GPUs ${Math.round(r.selfHost.utilization * 100)}% busy on average` },
          ]}
        />
      </div>
    </VizFrame>
  );
}
