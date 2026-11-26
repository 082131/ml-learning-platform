import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { ComputeInput, ComputeResult } from '@/lib/cloud/compute';
import { num, usd, type SpotResult, type SpotState } from '@/lib/cloud/experiments';
import type { GpuInput, GpuResult } from '@/lib/cloud/gpu';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Bars } from './Bars';
import s from './CloudTrack.module.css';

/** Serverless and always-on VMs priced for the same month of traffic. */
export function ComputeView() {
  const { state: x, result: r } = useExperimentContext<ComputeInput, ComputeResult>('ComputeView');
  return (
    <VizFrame
      title="Pay per request or pay per hour?"
      badge={<Badge tone="warn">Estimate</Badge>}
      caption={`${x.requestsPerMonth.toLocaleString('en-US')} requests a month: serverless ${usd(r.serverless.total, 2)}, VMs ${usd(r.vm.total, 2)}. ${r.cheaper === 'serverless' ? 'Serverless' : 'VMs'} win here${r.breakEven ? `; they cost the same near ${num(r.breakEven / 1e6)} million requests` : ''}.`}
      table={
        <VizTable
          caption="Monthly cost"
          columns={['option', 'formula', 'cost']}
          rows={[
            ['serverless, duration', `${x.requestsPerMonth.toLocaleString('en-US')} × ${x.durationMs / 1000} s × ${x.memoryGb} GB × $0.0000166667`, usd(r.serverless.duration, 2)],
            ['serverless, requests', `${x.requestsPerMonth / 1e6} million × $0.20`, usd(r.serverless.requests, 2)],
            ['VMs', `${r.vm.instances} × 730 h × $${x.vmPricePerHour}`, usd(r.vm.total, 2)],
          ]}
        />
      }
    >
      <div data-cheaper={r.cheaper}>
        <Bars
          label="Monthly cost"
          items={[
            { key: 'serverless', label: 'Serverless functions', value: r.serverless.total, text: usd(r.serverless.total, 2), tone: r.cheaper === 'serverless' ? 'ok' : 'err', formula: `GB-seconds ${usd(r.serverless.duration, 2)} + requests ${usd(r.serverless.requests, 2)}` },
            { key: 'vm', label: 'Always-on VMs', value: r.vm.total, text: usd(r.vm.total, 2), tone: r.cheaper === 'vm' ? 'ok' : 'err', formula: `${r.vm.instances} VMs × 730 h, busy ${Math.round(r.vm.utilization * 100)}% on average (peak ${num(r.vm.peakRps, 1)} req/s)` },
          ]}
        />
      </div>
    </VizFrame>
  );
}

/** Every instance in the catalog against the memory the job needs. */
export function GpuFitView() {
  const { state: x, result: r } = useExperimentContext<GpuInput, GpuResult>('GpuFitView');
  return (
    <VizFrame
      title="Which GPU instances can hold it?"
      badge={<Badge tone="warn">Illustrative prices</Badge>}
      caption={`A ${x.paramsB}B model needs about ${num(r.needGb)} GB. ${r.fits.filter((f) => f.fit !== 'too-small').length} of ${r.fits.length} instances fit; the cheapest is ${r.cheapest ? `${r.cheapest.name} at about ${usd(r.cheapest.price, 2)}/h` : 'none'}.`}
      table={<VizTable caption="Instances" columns={['instance', 'cloud', 'GPUs', 'GPU memory', 'fits', '$/h (illustrative)']} rows={r.fits.map((f) => [f.name, f.cloud, `${f.gpus} × ${f.gpu}`, `${f.totalGb} GB`, f.fit, f.price])} />}
    >
      <ul className={s.list} data-need={Math.round(r.needGb)}>
        {r.fits.map((f) => (
          <li key={f.name} className={s.bar} data-fit={f.fit}>
            <span>
              <span className={s.mono}>{f.name}</span>
              <br />
              <span className={s.muted}>
                {f.gpus} × {f.gpu} {f.gbPerGpu} GB · ${f.price}/h
              </span>
            </span>
            <span className={s.barTrack} aria-hidden="true">
              <span className={s.barFill} data-tone={f.fit === 'too-small' ? 'err' : 'ok'} style={{ width: `${Math.min(100, (r.needGb / f.totalGb) * 100)}%` }} />
            </span>
            <span className={s.tag} data-tone={f.fit === 'too-small' ? 'err' : f.fit === 'split' ? 'warn' : 'ok'}>
              {f.fit === 'one-gpu' ? 'fits on one GPU' : f.fit === 'split' ? 'split across GPUs' : 'too small'}
            </span>
          </li>
        ))}
      </ul>
      <p className={s.muted}>The bar shows how much of the instance's GPU memory the job would fill.</p>
    </VizFrame>
  );
}

const SEG_LABEL = { work: 'useful work', checkpoint: 'saving a checkpoint', lost: 'work lost to an interruption', restart: 'restarting' } as const;

/** One seeded example run on spot capacity, and the expected time and cost. */
export function SpotView() {
  const { state: x, result: r } = useExperimentContext<SpotState, SpotResult>('SpotView');
  const span = Math.max(r.run.hours, 1e-9);
  return (
    <VizFrame
      title="A training run on spot capacity"
      badge={<Badge tone="simulated">Simulated interruptions</Badge>}
      caption={`Example run: ${num(r.run.hours)} h with ${r.run.interruptions} interruption${r.run.interruptions === 1 ? '' : 's'}. Expected: ${Number.isFinite(r.estimate.hours) ? `${num(r.estimate.hours)} h for ${usd(r.estimate.spotCost, 2)}` : 'never finishes'}, against ${num(r.estimate.onDemandHours)} h for ${usd(r.estimate.onDemandCost, 2)} on demand.`}
      table={<VizTable caption="Example run" columns={['from (h)', 'to (h)', 'what']} rows={r.run.segments.slice(0, 60).map((g) => [num(g.start, 2), num(g.end, 2), SEG_LABEL[g.kind]])} />}
    >
      <div data-interruptions={r.run.interruptions} data-finite={Number.isFinite(r.estimate.hours)}>
        <h4 className={s.panelHead}>Example run, 0 to {num(r.run.hours)} h</h4>
        <div className={s.track} aria-hidden="true">
          {r.run.segments.map((g, k) => (
            <span key={k} className={s.mark} data-tone={g.kind} style={{ left: `${(g.start / span) * 100}%`, width: `${((g.end - g.start) / span) * 100}%`, minWidth: g.kind === 'checkpoint' ? 1 : 2 }} />
          ))}
        </div>
        <ul className={s.legend}>
          {(['work', 'checkpoint', 'lost', 'restart'] as const).map((k) => (
            <li key={k}>
              <span className={`${s.swatch}`} data-tone={k === 'work' ? undefined : k === 'checkpoint' ? 'ok' : k === 'lost' ? 'err' : 'warn'} />
              {SEG_LABEL[k]}
            </li>
          ))}
        </ul>
        <Bars
          label="Expected cost"
          items={[
            { key: 'spot', label: 'Spot (expected)', value: r.estimate.spotCost, text: usd(r.estimate.spotCost, 2), tone: r.estimate.spotCost < r.estimate.onDemandCost ? 'ok' : 'err', formula: `${Number.isFinite(r.estimate.hours) ? num(r.estimate.hours) : '∞'} h × $${x.spotPrice}` },
            { key: 'od', label: 'On demand', value: r.estimate.onDemandCost, text: usd(r.estimate.onDemandCost, 2), tone: 'muted', formula: `${num(r.estimate.onDemandHours)} h × $${x.onDemandPrice}` },
          ]}
        />
      </div>
    </VizFrame>
  );
}
