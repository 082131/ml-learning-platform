import { EVAL_CASES, type Category, type EvalResult, type EvalState } from '@/lib/ai/evals';
import { activeRules, type GuardResult, type GuardState } from '@/lib/ai/guardrails';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { VizFrame } from '../VizFrame/VizFrame';
import { Status, type StatusTone } from './Status';
import s from './AiTrack.module.css';

const toneOf = (c: Category): StatusTone =>
  c === 'correct' || c === 'correct refusal' ? 'ok' : c === 'missed answer' ? 'warn' : 'err';
const mark = (ok: boolean) => (ok ? '✓' : '✕');

/** Each evaluation case with its answer, the three code checks and the failure category. */
export function EvalScoreboard() {
  const { state, result } = useExperimentContext<EvalState, EvalResult>('EvalScoreboard');
  return (
    <VizFrame
      title={`Evaluation set, prompt ${state.version}`}
      badge={<Badge tone="simulated">Scripted answers, real graders</Badge>}
      caption={`${result.passed} of ${result.rows.length} cases pass. Checks: F = expected fact (or a refusal when the sources don't answer), C = citations point at real sources, S = every number and code is in a cited source.`}
    >
      <div className={s.scroll}>
        <table className={s.table}>
          <caption className="visually-hidden">Graded evaluation cases</caption>
          <thead>
            <tr>
              <th scope="col">Question</th>
              <th scope="col">Answer</th>
              <th scope="col">F C S</th>
              <th scope="col">Category</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r, i) => (
              <tr key={r.id} data-case={r.id} data-category={r.category}>
                <th scope="row">
                  {EVAL_CASES[i]!.question}
                  <div className={s.muted}>
                    sources: {EVAL_CASES[i]!.sources.map((x, j) => `[${j + 1}] ${x}`).join(', ')}
                  </div>
                </th>
                <td>
                  {r.answer}
                  {r.unsupported.length > 0 && (
                    <div className={s.muted}>not in a cited source: {r.unsupported.join(', ')}</div>
                  )}
                </td>
                <td
                  className={s.mono}
                  aria-label={`fact ${r.checks.fact}, citations ${r.checks.citations}, supported ${r.checks.supported}`}
                >
                  {mark(r.checks.fact)} {mark(r.checks.citations)} {mark(r.checks.supported)}
                </td>
                <td>
                  <Status tone={toneOf(r.category)}>{r.category}</Status>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VizFrame>
  );
}

const OUTCOME_TONE = { caught: 'ok', allowed: 'neutral', missed: 'err', 'wrongly blocked': 'warn' } as const;

/** The labeled inputs, what the active rules did with each, and the confusion counts. */
export function GuardrailTable() {
  const { state, result } = useExperimentContext<GuardState, GuardResult>('GuardrailTable');
  return (
    <VizFrame
      title={`Input guardrail: ${state.strictness}`}
      badge={<Badge tone="ok">Rules run in your browser</Badge>}
      caption={`Caught ${result.caught}, missed ${result.missed}, wrongly blocked ${result.wronglyBlocked}, allowed ${result.allowed}. Active rules: ${activeRules(
        state.strictness,
      )
        .map((r) => r.describe)
        .join('; ')}.`}
    >
      <div className={s.scroll}>
        <table className={s.table}>
          <caption className="visually-hidden">Guardrail decisions per input</caption>
          <thead>
            <tr>
              <th scope="col">Input</th>
              <th scope="col">Label</th>
              <th scope="col">Rule</th>
              <th scope="col">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r) => (
              <tr key={r.id} data-input={r.id} data-outcome={r.outcome}>
                <th scope="row">{r.text}</th>
                <td className={s.mono}>{r.label}</td>
                <td className={s.mono}>{r.rule ?? '—'}</td>
                <td>
                  <Status tone={OUTCOME_TONE[r.outcome]}>{r.outcome}</Status>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VizFrame>
  );
}
