import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { BillInput, BillResult } from '@/lib/cloud/bill';
import type { CapstoneResult, CloudPlan } from '@/lib/cloud/capstone';
import { num, usd, type IacResult, type IacState } from '@/lib/cloud/experiments';
import { KNOWN_AFTER_APPLY, SYMBOL } from '@/lib/cloud/iac';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import { Bars } from './Bars';
import s from './CloudTrack.module.css';

/** The month's bill as line items, each with its formula. */
export function BillView() {
  const { result: r } = useExperimentContext<BillInput, BillResult>('BillView');
  return (
    <VizFrame
      title="This month's bill"
      badge={<Badge tone="warn">Estimate</Badge>}
      caption={`Total ${usd(r.total)}${r.total < r.baseline ? `, down from ${usd(r.baseline)} with every control off` : ''}. Largest line: ${[...r.lines].sort((a, b) => b.cost - a.cost)[0]!.label.toLowerCase()}.`}
      table={<VizTable caption="Line items" columns={['line', 'formula', 'cost']} rows={r.lines.map((l) => [l.label, l.formula, usd(l.cost)])} />}
    >
      <div data-total={Math.round(r.total)}>
        <Bars label="Line items" items={r.lines.map((l) => ({ key: l.id, label: l.label, value: l.cost, text: usd(l.cost), formula: l.formula }))} />
        <p className={s.big}>{usd(r.total)} / month</p>
      </div>
    </VizFrame>
  );
}

/** terraform plan output: drift found while refreshing, then each planned change with its symbol. */
export function PlanView() {
  const { result: r } = useExperimentContext<IacState, IacResult>('PlanView');
  const lines: string[] = [];
  if (r.drift.length) {
    lines.push('Note: Objects have changed outside of Terraform', '');
    for (const d of r.drift) lines.push(`  ~ ${d.address}: ${d.attr} "${d.inState}" -> "${d.inCloud}"`);
    lines.push('');
  }
  for (const c of r.changes.filter((x) => x.action !== 'no-op')) {
    const verb = { create: 'will be created', update: 'will be updated in-place', replace: 'must be replaced', delete: 'will be destroyed', 'no-op': '' }[c.action];
    lines.push(`  # ${c.address} ${verb}`);
    lines.push(`  ${SYMBOL[c.action]} ${c.address.split('.')[0]} "${c.address.split('.')[1]}"`);
    for (const [k, before, after, forces] of c.diffs) lines.push(`      ${k}: ${c.action === 'create' ? '' : `"${before}" -> `}${c.action === 'delete' ? 'null' : after === KNOWN_AFTER_APPLY ? after : `"${after}"`}${forces ? '  # forces replacement' : ''}`);
    lines.push('');
  }
  lines.push(r.summary);
  return (
    <VizFrame
      title="terraform plan"
      badge={<Badge tone="simulated">Simulated output</Badge>}
      caption={r.error ? 'The plan stops: prevent_destroy protects the bucket.' : `${r.summary}${r.drift.length ? ' Terraform found drift while refreshing and plans to put it back.' : ''}`}
      table={<VizTable caption="Planned changes" columns={['resource', 'action', 'changed arguments']} rows={r.changes.map((c) => [c.address, c.action, c.diffs.map((d) => d[0]).join(', ')])} />}
    >
      <pre className={s.diff} data-add={r.add} data-change={r.change} data-destroy={r.destroy} data-error={!!r.error}>
        {lines.join('\n')}
      </pre>
    </VizFrame>
  );
}

/** The capstone plan's six checks and its monthly bill. */
export function CapstoneView() {
  const { result: r } = useExperimentContext<CloudPlan, CapstoneResult>('CapstoneView');
  return (
    <VizFrame
      title="Does the plan meet the brief?"
      badge={<Badge tone="warn">Estimate</Badge>}
      caption={`${r.passed} of ${r.checks.length} checks pass. Estimated bill ${usd(r.monthly.total)} a month; one fine-tune takes ${Number.isFinite(r.wallHours) ? `${num(r.wallHours)} h` : 'forever'} of wall clock.`}
      table={<VizTable caption="Checks" columns={['check', 'result', 'detail']} rows={r.checks.map((c) => [c.label, c.ok ? 'pass' : 'fail', c.detail])} />}
    >
      <ul className={s.list} data-passed={r.passed}>
        {r.checks.map((c) => (
          <li key={c.id} className={s.row} data-check={c.id} data-ok={c.ok}>
            <span>
              <strong>{c.label}</strong>
              <br />
              <span className={s.muted}>{c.detail}</span>
            </span>
            <span className={s.tag} data-tone={c.ok ? 'ok' : 'err'}>
              {c.ok ? '✓ pass' : '✗ fail'}
            </span>
          </li>
        ))}
      </ul>
      <Bars
        label="Monthly bill"
        items={[
          { key: 'training', label: 'Training', value: r.monthly.training, text: usd(r.monthly.training) },
          { key: 'serving', label: 'Serving', value: r.monthly.serving, text: usd(r.monthly.serving) },
          { key: 'transfer', label: 'Data transfer', value: r.monthly.transfer, text: usd(r.monthly.transfer), tone: r.monthly.transfer > 0 ? 'err' : undefined },
        ]}
      />
    </VizFrame>
  );
}
