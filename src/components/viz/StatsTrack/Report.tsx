import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { fmtP, LOSS_THRESHOLD, REPORT_SCENARIOS, SRM_THRESHOLD, type ReportResult } from '@/lib/stats/experiments';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './StatsTrack.module.css';

const pts = (x: number) => `${(100 * x).toFixed(2)}`;

/** The analysis checklist of the capstone, run on the selected week's data. */
export function ReportView() {
  const { state, result: r } = useExperimentContext<{ scenario: string }, ReportResult>('ReportView');
  const sc = REPORT_SCENARIOS[state.scenario]!;
  const steps: { title: string; tag: string; tone: 'ok' | 'err' | 'warn' | undefined; body: string }[] = [
    {
      title: '1. Sample ratio check',
      tag: r.srmOk ? 'passed' : 'FAILED',
      tone: r.srmOk ? 'ok' : 'err',
      body: `${sc.a.visitors.toLocaleString('en-US')} vs ${sc.b.visitors.toLocaleString('en-US')} visitors on a planned 50/50 split: χ² = ${r.srmChi2.toFixed(2)}, p = ${fmtP(r.srmP)} (fail below ${SRM_THRESHOLD}).`,
    },
    {
      title: '2. Primary metric: orders per visitor',
      tag: r.primary.lo > 0 ? 'B higher' : r.primary.hi < 0 ? 'B lower' : 'unclear',
      tone: r.primary.lo > 0 ? 'ok' : r.primary.hi < 0 ? 'err' : 'warn',
      body: `A ${pts(r.primary.rateA)}%, B ${pts(r.primary.rateB)}%. Difference ${pts(r.primary.diff)} points, 95% CI ${pts(r.primary.lo)} to ${pts(r.primary.hi)}; p = ${fmtP(r.primary.pValue)}.`,
    },
    {
      title: '3. Risk of shipping B',
      tag: r.lossB < LOSS_THRESHOLD ? 'low' : 'too high',
      tone: r.lossB < LOSS_THRESHOLD ? 'ok' : 'warn',
      body: `P(B beats A) = ${(100 * r.probB).toFixed(1)}%. Expected loss if B is actually worse: ${(100 * r.lossB).toFixed(3)} points (threshold ${(100 * LOSS_THRESHOLD).toFixed(2)}).`,
    },
    {
      title: '4. Guardrail: refunds per order',
      tag: r.guardOk ? 'held' : 'BROKEN',
      tone: r.guardOk ? 'ok' : 'err',
      body: `A ${pts(r.guard.rateA)}%, B ${pts(r.guard.rateB)}% of orders refunded (z = ${r.guard.z.toFixed(2)}; broken if significantly worse at 5%, one-sided).`,
    },
  ];
  return (
    <VizFrame
      title={`Experiment report: ${sc.label}`}
      caption={`Decision: ${r.decision}. ${r.reason}`}
      table={<VizTable caption="Checks" columns={['check', 'result', 'detail']} rows={steps.map((st) => [st.title, st.tag, st.body])} />}
    >
      <ol className={s.steps} data-decision={r.decision}>
        {steps.map((st) => (
          <li key={st.title} className={s.step}>
            <span className={s.stepTag} data-tone={st.tone}>
              {st.tag}
            </span>
            <div>
              <h4>{st.title}</h4>
              <p>{st.body}</p>
            </div>
          </li>
        ))}
        <li className={s.step}>
          <span className={s.stepTag} data-tone={r.decision === 'ship' ? 'ok' : r.decision === 'keep' ? 'warn' : 'err'}>
            {r.decision}
          </span>
          <div>
            <h4>5. Decision</h4>
            <p>{r.reason}</p>
          </div>
        </li>
      </ol>
    </VizFrame>
  );
}
