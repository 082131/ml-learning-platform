import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'liveness-loading',
    type: 'choice',
    prompt:
      'Your llama-server pods restart every 40 seconds and never become Ready. They have a liveness probe on /health (every 10 s, 3 failures) and no startup probe. Loading the model takes about 90 s. Why?',
    options: [
      {
        text: 'The readiness probe fails, and Kubernetes restarts pods that are not Ready',
        correct: false,
        explain: 'A failing readiness probe only removes the pod from the Service. It never restarts the container.',
      },
      {
        text: 'Liveness fails while /health answers 503 during loading, so the kubelet restarts it',
        correct: true,
        explain: 'Add a startup probe with enough failureThreshold × periodSeconds to cover loading; liveness only starts after it passes.',
      },
      {
        text: 'The memory limit is too low, so the container is OOMKilled while loading',
        correct: false,
        explain: 'That is a common cause of restarts too, but describe pod would say OOMKilled. Here the timing matches 3 × 10 s plus start-up.',
      },
    ],
  },
  {
    id: 'surge',
    type: 'numeric',
    prompt:
      'A Deployment has 4 replicas and rollingUpdate maxSurge 1, maxUnavailable 0. During a rollout, what is the most pods (old plus new) that can exist at once?',
    answer: 5,
    tolerance: 0,
    hint: 'maxSurge is how many pods above the desired count are allowed.',
    explain: '4 + 1 = 5. With maxUnavailable 0, an old pod is removed only after a new one is Ready, so capacity never drops below 4.',
  },
  {
    id: 'pick-quant',
    type: 'choice',
    prompt:
      'Your tolerance is perplexity at most 5% above BF16. Measured: Q8_0 +0.4%, Q4_K_M +3.8%, Q4_0 +6.9%. Q4_0 is 4% faster than Q4_K_M. Which do you ship for a CPU-only service?',
    options: [
      {
        text: 'Q8_0, since it is the closest to BF16 and quality matters most',
        correct: false,
        explain: 'It passes, but so does Q4_K_M, which is smaller and faster. The tolerance already says how much quality you can trade.',
      },
      {
        text: 'Q4_0, since it is the fastest and the gap to Q4_K_M is small',
        correct: false,
        explain: 'It fails the tolerance you set before measuring. Shipping it anyway means the tolerance was never a rule.',
      },
      {
        text: 'Q4_K_M, the smallest and fastest variant inside the tolerance',
        correct: true,
        explain: 'Pick the cheapest variant that passes the gate. Record the measurements, so the choice can be revisited.',
      },
    ],
  },
  {
    id: 'ppl-context',
    type: 'choice',
    prompt:
      'A colleague reports perplexity 9.1 for Q4_K_M with -c 2048 and 10.4 for BF16 with -c 512, on the same text. What can you conclude?',
    options: [
      {
        text: 'Nothing about quantization: the context lengths differ',
        correct: true,
        explain: 'With longer context each token is predicted from more text, which lowers perplexity. Re-run both with the same -c.',
      },
      {
        text: 'Q4_K_M improved quality, which happens with some models',
        correct: false,
        explain: 'Small improvements can happen by chance, but a 12% gap here comes from the context lengths, not the quantization.',
      },
      {
        text: 'BF16 is broken, since a quantized model cannot do better',
        correct: false,
        explain: 'The numbers are simply not comparable. Nothing says either file is broken.',
      },
    ],
  },
  {
    id: 'model-in-image',
    type: 'choice',
    prompt: 'Why does the reference Deployment download the GGUF file in an init container instead of baking it into the image?',
    options: [
      {
        text: 'Kubernetes cannot pull container images larger than 2 GB from a registry',
        correct: false,
        explain: 'There is no such limit; large images only pull slowly. Many teams do bake small models in.',
      },
      {
        text: 'llama-server refuses to read model files that are inside its image',
        correct: false,
        explain: 'It reads any path. The choice is about how versions are managed, not what the server can open.',
      },
      {
        text: 'The model version becomes configuration, and one image serves every model',
        correct: true,
        explain: 'Changing MODEL_URL triggers a rollout without rebuilding the image. The trade-off is a download on every pod start.',
      },
    ],
  },
];

export const chooseExercise: Exercise = {
  id: 'choose-quant',
  prompt:
    'Write `choose(variants, base_ppl, max_increase)`. Each variant is a dict with `name`, `mib` and `ppl`. Return the name of the smallest variant whose perplexity is at most `base_ppl * (1 + max_increase)`, or `None` if none passes.',
  starter: `def choose(variants, base_ppl, max_increase):
    pass`,
  hints: [
    'Keep only the variants with v["ppl"] <= base_ppl * (1 + max_increase).',
    'min(passing, key=lambda v: v["mib"]) finds the smallest; handle an empty list first.',
  ],
  solution: `def choose(variants, base_ppl, max_increase):
    limit = base_ppl * (1 + max_increase)
    passing = [v for v in variants if v["ppl"] <= limit]
    if not passing:
        return None
    return min(passing, key=lambda v: v["mib"])["name"]`,
  explanation:
    'This is the gate from the pipelines lesson applied to quantization: a tolerance fixed in advance, then the cheapest variant that meets it.',
  tests: `# Hypothetical measurements for a 1B model (BF16 perplexity 12.0)
v = [{"name": "Q8_0", "mib": 1260, "ppl": 12.05},
     {"name": "Q4_K_M", "mib": 770, "ppl": 12.46},
     {"name": "Q4_0", "mib": 720, "ppl": 12.83}]
assert choose(v, 12.0, 0.05) == "Q4_K_M", 'Q4_0 is 6.9% worse, outside 5%'
assert choose(v, 12.0, 0.10) == "Q4_0", 'with 10% allowed, the smallest passes'
assert choose(v, 12.0, 0.001) is None, 'nothing is within 0.1%'
assert choose(list(reversed(v)), 12.0, 0.05) == "Q4_K_M", 'order of the list does not matter'
assert choose([{"name": "Q8_0", "mib": 1260, "ppl": 12.6}], 12.0, 0.05) == "Q8_0", 'exactly at the limit passes'`,
};
