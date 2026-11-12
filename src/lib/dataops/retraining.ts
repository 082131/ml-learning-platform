/**
 * The retraining-triggers lesson's experiment: 52 weeks of a model in production while the world drifts, slowly
 * every week and suddenly in week 30. Five policies decide when to retrain. The decay model is stated in the
 * lesson and labeled as a model: accuracy falls in proportion to how far the world has moved since the model's
 * training week. retraining.test.ts checks every setting against RETRAIN_SOURCE run with CPython.
 *
 * Drift is counted in whole units so every comparison is exact in both languages.
 */
import { pyFixed } from '../practice/pyFormat';
import type { ExperimentDef } from '../types';

export const WEEKS = 52;
export const JUMP_WEEK = 33;
export const JUMP = 30;
export const BASE_ACCURACY = 0.92;
/** Accuracy lost per unit of drift since training. */
export const DECAY = 0.004;
export const DRIFT_LIMIT = 10;
export const ACCURACY_FLOOR = 0.88;

export const POLICIES = ['never', 'every-13', 'every-4', 'drift', 'accuracy'] as const;
export const DELAYS = [0, 2, 6] as const;
export type Policy = (typeof POLICIES)[number];

export interface RetrainState {
  policy: Policy;
  delay: (typeof DELAYS)[number];
}

export interface RetrainResult {
  accuracy: number[];
  retrains: number[];
  mean: number;
  worst: number;
}

/** How far the world has moved by week w: one unit a week, plus a jump of JUMP units from week JUMP_WEEK. */
export const world = (w: number) => w + (w >= JUMP_WEEK ? JUMP : 0);

export function retrain({ policy, delay }: RetrainState): RetrainResult {
  let trainedAt = 0;
  const accuracy: number[] = [];
  const retrains: number[] = [];
  const acc = (w: number, t: number) => BASE_ACCURACY - DECAY * Math.abs(world(w) - world(t));
  for (let w = 0; w < WEEKS; w++) {
    let go = false;
    if (w > 0) {
      if (policy === 'every-13') go = w % 13 === 0;
      else if (policy === 'every-4') go = w % 4 === 0;
      else if (policy === 'drift') go = Math.abs(world(w) - world(trainedAt)) >= DRIFT_LIMIT;
      else if (policy === 'accuracy') {
        const seen = w - delay; // labels for week w arrive `delay` weeks later
        go = seen >= trainedAt && acc(seen, trainedAt) < ACCURACY_FLOOR;
      }
    }
    if (go) {
      trainedAt = w;
      retrains.push(w);
    }
    accuracy.push(acc(w, trainedAt));
  }
  let total = 0;
  for (const a of accuracy) total += a;
  return { accuracy, retrains, mean: total / WEEKS, worst: Math.min(...accuracy) };
}

/** What RETRAIN_SOURCE prints. */
export function retrainPrintout(r: RetrainResult, s: RetrainState): string {
  return [
    `policy ${s.policy}, label delay ${s.delay} weeks`,
    `retrained in weeks: ${r.retrains.length ? r.retrains.join(', ') : 'none'}`,
    `retrains: ${r.retrains.length}, mean accuracy ${pyFixed(r.mean, 4)}, worst week ${pyFixed(r.worst, 3)}`,
  ].join('\n');
}

export const RETRAIN_SOURCE = `POLICY = "{{policy}}"  # never, every-13, every-4, drift or accuracy
LABEL_DELAY = {{delay}}  # weeks until the true labels of a week's predictions are known


def world(week):  # how far the data has moved: 1 unit a week, plus a jump of 30 units in week 33
    return week + (30 if week >= 33 else 0)


def accuracy(week, trained_at):  # the decay model: 0.004 accuracy lost per unit of drift since training
    return 0.92 - 0.004 * abs(world(week) - world(trained_at))


trained_at, history, retrains = 0, [], []
for week in range(52):
    retrain = False
    if week > 0:
        if POLICY == "every-13":
            retrain = week % 13 == 0
        elif POLICY == "every-4":
            retrain = week % 4 == 0
        elif POLICY == "drift":  # inputs are visible at once: alert when the data moved 10 units
            retrain = abs(world(week) - world(trained_at)) >= 10
        elif POLICY == "accuracy":  # labels arrive late: we see the accuracy of LABEL_DELAY weeks ago
            seen = week - LABEL_DELAY
            retrain = seen >= trained_at and accuracy(seen, trained_at) < 0.88
    if retrain:
        trained_at = week
        retrains.append(week)
    history.append(accuracy(week, trained_at))

total = 0.0
for a in history:
    total += a
print(f"policy {POLICY}, label delay {LABEL_DELAY} weeks")
print(f"retrained in weeks: {', '.join(map(str, retrains)) or 'none'}")
print(f"retrains: {len(retrains)}, mean accuracy {total / 52:.4f}, worst week {min(history):.3f}")`;

export const retrainSlots = (s: RetrainState) => ({ policy: s.policy, delay: String(s.delay) });

const POLICY_LABEL: Record<Policy, string> = {
  never: 'Never retrain',
  'every-13': 'Every 13 weeks (quarterly)',
  'every-4': 'Every 4 weeks (monthly)',
  drift: 'When input drift reaches 10 units',
  accuracy: 'When labeled accuracy falls below 0.88',
};

export function retrainExperiment(id: string): ExperimentDef<RetrainState, RetrainResult> {
  return {
    id,
    initial: { policy: 'every-13', delay: 2 },
    controls: [
      {
        kind: 'select',
        id: 'policy',
        label: 'Retraining policy',
        options: POLICIES.map((p) => ({ value: p, label: POLICY_LABEL[p] })),
        get: (s) => s.policy,
        set: (s, v) => ({ ...s, policy: v as Policy }),
      },
      {
        kind: 'select',
        id: 'delay',
        label: 'Label delay',
        options: DELAYS.map((d) => ({ value: String(d), label: `${d} weeks` })),
        get: (s) => String(s.delay),
        set: (s, v) => ({ ...s, delay: Number(v) as RetrainState['delay'] }),
      },
    ],
    compute: retrain,
    readout: (s, r) => [
      { label: 'Python: what triggers.py prints', value: retrainPrintout(r, s) },
      { label: 'Retraining runs this year', value: String(r.retrains.length) },
    ],
  };
}
