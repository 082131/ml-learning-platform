import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'formula',
    type: 'numeric',
    prompt:
      'An HPA targets 60% CPU. There are 4 ready pods averaging 90% CPU. How many replicas does it ask for?',
    answer: 6,
    tolerance: 0,
    hint: 'desired = ceil(current × currentMetric / target). Check the 10% tolerance first.',
    explain: '90 / 60 = 1.5, well outside the tolerance. ceil(4 × 90 / 60) = ceil(6) = 6.',
  },
  {
    id: 'tolerance',
    type: 'numeric',
    prompt: 'Same HPA (target 60%), 10 ready pods averaging 64% CPU. How many replicas does it ask for?',
    answer: 10,
    tolerance: 0,
    hint: 'Compute 64 / 60 − 1 first.',
    explain:
      '64 / 60 − 1 = 0.067, inside the 10% tolerance, so nothing changes. Without the tolerance it would be ceil(10.67) = 11.',
  },
  {
    id: 'saturation',
    type: 'choice',
    prompt:
      'Traffic jumps from 100 to 1,000 requests/s. Two pods, 50 rps each at 100% CPU, target 70%. Why does the HPA not jump straight to the 29 pods the new traffic needs?',
    options: [
      {
        text: 'The scale-up policy only allows one new pod per period',
        correct: false,
        explain: 'The default allows doubling or +4 pods per 15 s. The limit is in what the HPA can measure, not in the policy.',
      },
      {
        text: 'The stabilization window delays scaling up by 300 s',
        correct: false,
        explain: 'The default window applies to scaling down. Scale-up has no stabilization by default.',
      },
      {
        text: 'Saturated pods report 100% CPU, so it sees 100/70 more load, not 10 times more',
        correct: true,
        explain:
          'ceil(2 × 100 / 70) = 3. It has to wait for those pods to be ready to measure again. A request-rate or queue-length metric reveals the real demand at once.',
      },
    ],
  },
  {
    id: 'cold-start-fix',
    type: 'choice',
    prompt:
      'Your LLM server pods take 6 minutes to become ready, and traffic doubles within 2 minutes every morning. Which change helps most?',
    options: [
      {
        text: 'Lower the CPU target so that the existing pods have headroom for the jump',
        correct: false,
        explain:
          'More headroom helps, but a doubling within 2 minutes needs twice the pods; a lower target alone means paying for idle pods all day.',
      },
      {
        text: 'Scale up on a schedule before the morning peak, and cut the load time',
        correct: true,
        explain:
          'Predictable peaks are better handled ahead of time (a scheduled minReplicas or a cron-based scaler such as KEDA’s). Faster loading (local model cache, safetensors, smaller images) shrinks every scale-up.',
      },
      {
        text: 'Set the scale-down stabilization window to 0 seconds',
        correct: false,
        explain: 'That only affects scaling down, and makes pods disappear sooner, which hurts the next spike.',
      },
    ],
  },
  {
    id: 'rollout',
    type: 'choice',
    prompt:
      'A Deployment with 3 replicas uses maxSurge: 1 and maxUnavailable: 0. What is the most pods that exist during the rollout, and the fewest that are ready?',
    options: [
      {
        text: 'At most 3 pods, at least 2 ready',
        correct: false,
        explain: 'That describes maxSurge: 0 and maxUnavailable: 1, which removes an old pod first.',
      },
      {
        text: 'At most 6 pods, at least 3 ready',
        correct: false,
        explain: 'That would need maxSurge: 3 (or 100%), creating a full new set before removing the old one.',
      },
      {
        text: 'At most 4 pods, at least 3 ready',
        correct: true,
        explain:
          'One extra pod at a time; an old pod is removed only after the new one is ready, so capacity never drops. It needs room in the cluster for one extra pod, which for GPU pods means a spare GPU.',
      },
    ],
  },
];

export const hpaExercise: Exercise = {
  id: 'hpa-desired',
  prompt:
    'Write `desired_replicas(current, util, target, min_r, max_r)` with the HPA formula, the 10% tolerance and the min/max limits.',
  starter: `import math


def desired_replicas(current, util, target, min_r, max_r):
    pass`,
  hints: [
    'If abs(util / target - 1) <= 0.1, the answer is current (then still apply min and max).',
    'Otherwise compute math.ceil(current * util / target).',
    'Finish with max(min_r, min(max_r, value)).',
  ],
  solution: `import math


def desired_replicas(current, util, target, min_r, max_r):
    if abs(util / target - 1) <= 0.1:
        n = current
    else:
        n = math.ceil(current * util / target)
    return max(min_r, min(max_r, n))`,
  explanation:
    'This is the core of the HPA. The real controller adds the scale-up rate limit, the scale-down stabilization window and special handling of pods that are not ready yet.',
  tests: `assert desired_replicas(4, 90, 60, 1, 20) == 6, 'ceil(4 * 90 / 60) = 6'
assert desired_replicas(10, 64, 60, 1, 20) == 10, '64/60 is within the 10% tolerance'
assert desired_replicas(5, 100, 70, 2, 10) == 8, 'ceil(5 * 100 / 70) = ceil(7.14) = 8'
assert desired_replicas(10, 100, 50, 2, 12) == 12, 'capped at max_r'
assert desired_replicas(3, 10, 70, 2, 10) == 2, 'ceil(0.43) = 1, raised to min_r'`,
};
