import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ft-l2-prices',
    type: 'choice',
    prompt: 'A shop assistant bot gives outdated prices. Prices change every week. What should you try first?',
    options: [
      { text: 'Fine-tune weekly on the new price list', correct: false, explain: 'The model would learn prices unreliably and be stale again a week later. Facts that change belong in the prompt, fetched at question time.' },
      { text: 'Retrieve the current prices into the prompt', correct: true, explain: 'Retrieval puts today’s facts in front of the model at question time, and you can show where each price came from.' },
      { text: 'Use a larger model', correct: false, explain: 'A larger model still learned its prices at training time; it does not know this week’s prices either.' },
      { text: 'Raise the temperature so it explores more prices', correct: false, explain: 'Sampling settings cannot supply facts the model never saw.' },
    ],
  },
  {
    id: 'ft-l2-format',
    type: 'choice',
    prompt: 'A prompt with 40 rules and 12 examples gets the format right, but it costs 3,000 tokens per request at a million requests a day. Which pairing of problem and fix fits best?',
    options: [
      { text: 'A knowledge problem; fix it with retrieval', correct: false, explain: 'Nothing is missing: the model already produces the right answers when shown the rules. Retrieval would add tokens, not remove them.' },
      { text: 'A cost problem; fix it with a fine-tune', correct: true, explain: 'The behaviour is known and measurable, and fine-tuning can bake it in so the prompt shrinks. The working prompt also gives you a way to generate and check training data.' },
      { text: 'A safety problem; fix it with a guardrail', correct: false, explain: 'Guardrails check outputs; they do not reduce what each request costs.' },
      { text: 'A capability problem; pretrain a new model', correct: false, explain: 'Far too expensive, and unnecessary: the existing model can already do it.' },
    ],
  },
  {
    id: 'ft-l2-new-facts',
    type: 'choice',
    prompt: 'Why does fine-tuning a model on many new facts tend to increase hallucinations, according to Gekhman et al. (2024)?',
    options: [
      { text: 'It learns to answer confidently past what it knows', correct: true, explain: 'The model learns the habit "always answer in this confident style" faster than the facts themselves, so it applies the style to questions it cannot answer.' },
      { text: 'Fine-tuning overwrites and deletes most of the knowledge from pretraining', correct: false, explain: 'Some forgetting happens, but the effect in the study is about learning to answer without knowing, not about wholesale deletion.' },
      { text: 'Fine-tuning data is always of lower quality than the pretraining corpus', correct: false, explain: 'Curated fine-tuning data is usually higher quality per example. The problem is what the model generalizes from it.' },
    ],
  },
  {
    id: 'ft-l2-payback',
    type: 'numeric',
    prompt: 'A fine-tune costs $9,000 in total (training and people). It removes 2,000 prompt tokens from each of 10,000 requests a day, at $1.50 per million input tokens. In how many months does it pay back? (One decimal; 30-day months.)',
    answer: 10,
    tolerance: 0.1,
    hint: 'Monthly saving = requests per day × 30 × tokens saved × price per token.',
    explain: '10,000 × 30 × 2,000 = 600 M tokens a month; × $1.50 per million = $900. $9,000 / $900 = 10.0 months.',
  },
  {
    id: 'ft-l2-order',
    type: 'order',
    prompt: 'Put these steps of a sensible project in order.',
    items: [
      'Write a careful prompt and measure it on an evaluation set',
      'Add retrieval if answers lack facts',
      'Collect and clean examples of the behaviour you want',
      'Fine-tune and compare against the measured baseline',
    ],
    explain: 'Each step is cheaper than the next and produces what the next needs: the evaluation set from step 1 is how you judge step 4, and the best prompt outputs often become training examples.',
  },
  {
    id: 'ft-l2-both',
    type: 'choice',
    prompt: 'A legal assistant must answer in a strict citation format AND use the latest court decisions. What design fits?',
    options: [
      { text: 'Fine-tune only, on the court decisions in the required format', correct: false, explain: 'The decisions keep changing and would need retraining; and facts learned in weights cannot be cited reliably.' },
      { text: 'Retrieval only, with the format described in the prompt', correct: false, explain: 'This can work and is the right first step, but if the format stays unreliable or the prompt gets huge, it leaves the behaviour problem unsolved.' },
      { text: 'Fine-tune the format, retrieve the decisions', correct: true, explain: 'Each tool does the job it is good at: weights hold stable behaviour, the prompt holds changing facts. This combination is common in production.' },
      { text: 'Neither: use a bigger context window and paste every decision', correct: false, explain: 'Pasting everything is slow and expensive, and models use very long contexts less reliably than a few retrieved passages.' },
    ],
  },
];

export const paybackExercise: Exercise = {
  id: 'ft-payback-months',
  prompt:
    'Write `payback_months(one_time, requests_per_day, saved_tokens, price_per_m)` that returns the months (30-day) until the savings repay `one_time` dollars. `price_per_m` is dollars per million input tokens. Return `None` when nothing is saved.',
  starter: `def payback_months(one_time, requests_per_day, saved_tokens, price_per_m):
    return 0`,
  hints: ['Monthly saving = requests_per_day * 30 * saved_tokens * price_per_m / 1_000_000.', 'Guard against a saving of 0 before dividing.'],
  solution: `def payback_months(one_time, requests_per_day, saved_tokens, price_per_m):
    saved = requests_per_day * 30 * saved_tokens * price_per_m / 1_000_000
    if saved <= 0:
        return None
    return one_time / saved`,
  explanation:
    'The payback period is the one-time cost divided by the monthly saving. It is only half of the decision: a fine-tune that pays back in two months is still wrong if it makes answers worse, which is why the evaluation set comes first.',
  tests: `assert abs(payback_months(6120, 20000, 1500, 3.0) - 6120 / 2700) < 1e-9
assert abs(payback_months(9000, 10000, 2000, 1.5) - 10) < 1e-9
assert payback_months(100, 1000, 0, 3.0) is None`,
};
