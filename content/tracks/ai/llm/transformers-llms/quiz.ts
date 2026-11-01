import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'generation',
    type: 'order',
    prompt: 'Put one step of text generation in order.',
    items: [
      'Run the transformer over all tokens so far',
      'Take the logits for the next position',
      'Divide by the temperature and apply softmax',
      'Cut the distribution with top-p and sample a token',
      'Append the token and repeat',
    ],
    explain: 'Every generated token repeats this loop, which is why output length drives latency and cost.',
  },
  {
    id: 'temperature',
    type: 'choice',
    prompt: 'You extract invoice numbers from emails and want the same answer every time. Which setting fits?',
    options: [
      {
        text: 'A temperature of 0 (or close to it), so the most likely token is chosen',
        correct: true,
        explain: 'Low temperature makes output nearly deterministic, which suits extraction and classification.',
      },
      {
        text: 'A temperature of 1.5, so the model considers more options',
        correct: false,
        explain: 'High temperature samples unlikely tokens more often: useful for brainstorming, harmful for extraction.',
      },
      {
        text: 'Top-p of 1 with temperature 1',
        correct: false,
        explain: 'That samples from the full distribution, so the same email can give different answers.',
      },
    ],
  },
  {
    id: 'temperature-math',
    type: 'numeric',
    prompt:
      'Two candidates have logits ln 3 and ln 1, so at T = 1 their probabilities are 0.75 and 0.25. What is the first one’s probability at T = 0.5? (Two decimals.)',
    answer: 0.9,
    tolerance: 0.005,
    hint: 'Dividing a log by 0.5 doubles it: ln 3 / 0.5 = ln 9. Softmax of ln 9 and ln 1 is 9 / (9 + 1).',
    explain: 'ln 3 / 0.5 = ln 9 and ln 1 / 0.5 = 0, so the probabilities are 9/10 and 1/10. The first one is 0.90.',
  },
  {
    id: 'context',
    type: 'numeric',
    prompt:
      'Self-attention scores every pair of tokens. How many times more scores does a 16,000-token context need than a 4,000-token one?',
    answer: 16,
    tolerance: 0,
    hint: 'The number of pairs grows with the square of the length.',
    explain: '(16,000 / 4,000)² = 4² = 16. Four times the context, sixteen times the attention scores.',
  },
  {
    id: 'hallucination',
    type: 'choice',
    prompt: 'Why can a language model state something false with complete fluency?',
    options: [
      {
        text: 'It is trained to produce likely text, and likely-sounding text is not the same as checked facts',
        correct: true,
        explain: 'Nothing in next-token prediction checks the claim against a source. Fluency comes from the training objective; truth does not.',
      },
      {
        text: 'It is lying on purpose',
        correct: false,
        explain: 'There is no intent. The model continues text with high-probability tokens.',
      },
      {
        text: 'It only happens when the temperature is above 1',
        correct: false,
        explain: 'Greedy decoding can also produce false statements; the most likely continuation can be wrong.',
      },
    ],
  },
];

export const softmaxExercise: Exercise = {
  id: 'softmax-temperature',
  prompt: 'Write `softmax_t(logits, t)` that returns softmax(logits / t), and returns a one-hot list for t == 0.',
  starter: `import math

def softmax_t(logits, t):
    pass`,
  hints: [
    'For t == 0, put 1.0 at the index of the largest logit and 0.0 everywhere else.',
    'Otherwise divide each logit by t, subtract the maximum, exponentiate and divide by the sum.',
  ],
  solution: `import math

def softmax_t(logits, t):
    if t == 0:
        best = logits.index(max(logits))
        return [1.0 if i == best else 0.0 for i in range(len(logits))]
    scaled = [l / t for l in logits]
    top = max(scaled)
    exps = [math.exp(s - top) for s in scaled]
    total = sum(exps)
    return [e / total for e in exps]`,
  explanation:
    'Temperature 0 is the limit of ever smaller t, where all the probability ends up on the largest logit, so it is implemented as greedy choice instead of dividing by zero.',
  tests: `import math
p = softmax_t([math.log(3), 0.0], 1)
assert abs(p[0] - 0.75) < 1e-9, 'at t = 1, logits ln 3 and 0 give 0.75 and 0.25'
p = softmax_t([math.log(3), 0.0], 0.5)
assert abs(p[0] - 0.9) < 1e-9, 'at t = 0.5 the ratio is squared: 9 to 1'
assert softmax_t([0.1, 2.0, 0.5], 0) == [0.0, 1.0, 0.0], 't = 0 is greedy'
assert abs(sum(softmax_t([5.0, 1.0, -2.0], 2)) - 1) < 1e-9, 'probabilities sum to 1'`,
};
