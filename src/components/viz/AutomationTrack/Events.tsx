import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import type { AgentPolicy, AgentRun, Outcome } from '@/lib/automation/agent';
import type { SignatureResult, SignatureState } from '@/lib/automation/experiments';
import type { DeliveryInput, DeliveryResult } from '@/lib/automation/webhook';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './AutomationTrack.module.css';

/** The signature the sender attaches, the one the receiver recomputes, and the verdict. */
export function SignatureView() {
  const { result: r } = useExperimentContext<SignatureState, SignatureResult>('SignatureView');
  return (
    <VizFrame
      title="Verifying a webhook signature"
      caption={r.valid ? 'The recomputed HMAC equals the header: the body is exactly what the secret holder sent.' : 'The recomputed HMAC differs from the header: reject the request.'}
    >
      <div className={s.grid2} data-valid={r.valid}>
        <section className={s.panel} aria-label="Sender">
          <h4 className={s.panelHead}>Sender: X-Hub-Signature-256</h4>
          <pre className={s.code}>{r.header}</pre>
        </section>
        <section className={s.panel} aria-label="Receiver">
          <h4 className={s.panelHead}>Receiver: body it hashes</h4>
          <pre className={s.code}>{r.receivedBody}</pre>
          <h4 className={s.panelHead}>Recomputed</h4>
          <pre className={s.code}>{r.recomputed}</pre>
          <p className={s.verdict} data-ok={r.valid}>
            {r.valid ? '✓ match: process it' : '✗ mismatch: 401'}
          </p>
        </section>
      </div>
    </VizFrame>
  );
}

/** Every delivery attempt per event, what the sender recorded, and whether the side effect ran again. */
export function DeliveryView() {
  const { result: r } = useExperimentContext<DeliveryInput, DeliveryResult>('DeliveryView');
  return (
    <VizFrame
      title="Deliveries and side effects"
      badge={<Badge tone="simulated">Simulated sender</Badge>}
      caption={`${r.attempts.length} deliveries for ${r.effects.length} events; ${r.effects.reduce((a, b) => a + b, 0)} retraining jobs started (${r.duplicates} duplicates).`}
      table={<VizTable caption="Deliveries" columns={['event', 'attempt', 'sender recorded', 'started a job']} rows={r.attempts.map((a) => [a.event, a.attempt, a.recorded, a.sideEffect ? 'yes' : 'no'])} />}
    >
      <ul className={s.list} data-duplicates={r.duplicates}>
        {r.attempts.map((a) => (
          <li key={`${a.event}-${a.attempt}`} className={s.row}>
            <span className={s.mono}>
              event {a.event}, attempt {a.attempt}: {a.recorded}
            </span>
            <span className={s.tag} data-tone={a.sideEffect ? (a.attempt > 1 ? 'err' : 'ok') : undefined}>
              {a.sideEffect ? (a.attempt > 1 ? 'job started AGAIN' : 'job started') : 'duplicate ignored'}
            </span>
          </li>
        ))}
      </ul>
    </VizFrame>
  );
}

const OUTCOME_TONE: Record<Outcome, string | undefined> = {
  ran: 'ok',
  'approved, ran': 'ok',
  'rejected by the person': 'warn',
  'refused by policy': 'warn',
  'blocked by allowlist': 'warn',
  'not reached (step budget)': undefined,
};

/** The agent's tool calls in order and what the harness did with each. */
export function AgentGuardView() {
  const { result: r } = useExperimentContext<AgentPolicy, AgentRun>('AgentGuardView');
  return (
    <VizFrame
      title="What the harness let through"
      badge={<Badge tone="simulated">Scripted model</Badge>}
      caption={`${r.leaked ? 'Secrets left the company through the injected email.' : 'Nothing leaked.'} ${r.approvalsAsked} approval request${r.approvalsAsked === 1 ? '' : 's'}. Work done: ${r.done.join(', ') || 'none'}.`}
      table={<VizTable caption="Tool calls" columns={['#', 'tool', 'tier', 'arguments', 'outcome']} rows={r.steps.map((st, k) => [k + 1, st.call.tool, st.call.tier, st.call.args, st.outcome])} />}
    >
      <ol className={s.list} data-leaked={r.leaked}>
        {r.steps.map((st, k) => (
          <li key={k} className={s.row} data-injected={st.call.injected || undefined}>
            <span>
              <code className={s.mono}>{st.call.tool}</code> <span className={s.tag}>{st.call.tier}</span>{' '}
              <span className={s.muted}>
                {st.call.args}
                {st.call.injected ? ' (asked for by text in an email, not by the task)' : ''}
              </span>
            </span>
            <span className={s.tag} data-tone={st.call.injected && (st.outcome === 'ran' || st.outcome === 'approved, ran') ? 'err' : OUTCOME_TONE[st.outcome]}>
              {st.outcome}
            </span>
          </li>
        ))}
      </ol>
    </VizFrame>
  );
}
