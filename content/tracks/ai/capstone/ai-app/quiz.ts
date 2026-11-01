import type { Exercise, QuizQuestion } from '@/lib/types';

/** Self-assessment: answer these about your own project before you call it done. */
export const questions: QuizQuestion[] = [
  {
    id: 'approach',
    type: 'choice',
    prompt:
      'Why does this project call a pretrained model with retrieval instead of fine-tuning one on the documents?',
    options: [
      {
        text: 'Retrieval answers from the current documents with citations, and updating a document needs no training',
        correct: true,
        explain:
          'Fine-tuning changes style and behavior well but is a poor way to store facts that change; it also can’t cite.',
      },
      {
        text: 'Fine-tuning is impossible for language models',
        correct: false,
        explain:
          'It is possible and useful for format, tone or narrow tasks. It just isn’t the right tool for answering from changing documents.',
      },
      {
        text: 'Retrieval always gives better answers',
        correct: false,
        explain:
          'Not always: if retrieval misses the right chunk, the answer suffers. That is why you measure recall@k.',
      },
    ],
  },
  {
    id: 'wrong-answer',
    type: 'choice',
    prompt: 'An answer in your evaluation is wrong. What do you check first?',
    options: [
      {
        text: 'Whether the chunk with the answer was retrieved',
        correct: true,
        explain:
          'If it wasn’t, no prompt change will fix it. If it was, the problem is in the prompt or the model.',
      },
      {
        text: 'Whether a larger model gets it right',
        correct: false,
        explain:
          'It might, at a higher cost, while hiding a retrieval problem that affects other questions too.',
      },
      {
        text: 'Whether the question is worded clearly',
        correct: false,
        explain:
          'Users won’t reword their questions for you; the evaluation set should keep the way they really ask.',
      },
    ],
  },
  {
    id: 'one-case',
    type: 'choice',
    prompt: 'Version B passes 32 of 40 cases and version A passes 31. What should the report say?',
    options: [
      {
        text: 'The difference is one case, too small to call B better; which cases flipped, and at what cost?',
        correct: true,
        explain:
          'Per-case comparison may show B fixed one case and broke none, or fixed three and broke two.',
      },
      {
        text: 'B is 2.5 points better and should ship',
        correct: false,
        explain: 'One case out of 40 is within the noise of how the cases were chosen.',
      },
    ],
  },
  {
    id: 'release-order',
    type: 'order',
    prompt: 'Order the steps for releasing your second prompt version.',
    items: [
      'Run the evaluation set on both versions and compare per case',
      'Deploy the new version behind a flag at 0%',
      'Send a small share of users to it and compare checks, latency and cost by version',
      'Widen the release, or roll back with the flag',
    ],
    explain:
      'The evaluation set catches known failure types; the canary catches the rest on a few users first.',
  },
];

export const regressionExercise: Exercise = {
  id: 'regressions',
  prompt:
    'Write `regressions(current, candidate)` that returns the sorted ids of cases that pass with the current version and fail with the candidate. Each argument maps a case id to a category.',
  starter: `PASSING = {"correct", "correct refusal"}

def regressions(current, candidate):
    pass`,
  hints: [
    'A case passes when its category is in PASSING.',
    'Only look at ids that appear in both dictionaries.',
    'Return sorted(...) of the ids that pass in current and fail in candidate.',
  ],
  solution: `PASSING = {"correct", "correct refusal"}

def regressions(current, candidate):
    return sorted(
        case for case in current.keys() & candidate.keys()
        if current[case] in PASSING and candidate[case] not in PASSING
    )`,
  explanation:
    'Totals hide trade-offs: a candidate can pass more cases overall and still break one that matters. Listing regressions per case is the first thing to look at before a release.',
  tests: `cur = {"a": "correct", "b": "unsupported claim", "c": "correct refusal", "d": "correct"}
new = {"a": "correct", "b": "correct", "c": "answered without a source", "d": "missed answer"}
assert regressions(cur, new) == ["c", "d"], 'c and d passed before and fail now'
assert regressions(new, cur) == ["b"], 'swapping the versions finds b'
assert regressions(cur, cur) == [], 'no change, no regressions'
assert regressions({"x": "correct"}, {}) == [], 'cases missing from the candidate are ignored'`,
};
