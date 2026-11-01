import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'what-in-set',
    type: 'choice',
    prompt: 'Which of these belongs in an evaluation set for a support assistant?',
    options: [
      {
        text: 'Real questions, hard edge cases, past failures, and questions the documents can’t answer',
        correct: true,
        explain: 'Questions without an answer test whether the assistant admits it; past failures make sure fixed bugs stay fixed.',
      },
      {
        text: 'Only the questions the current prompt already answers well',
        correct: false,
        explain: 'An eval set that always passes can’t tell you when a change makes things worse.',
      },
      {
        text: 'Questions generated from the documents by copying their sentences',
        correct: false,
        explain: 'They share exact words with the answer passage, so they overstate retrieval and answer quality.',
      },
    ],
  },
  {
    id: 'grader-choice',
    type: 'choice',
    prompt: 'You want to check that answers are polite and don’t use internal jargon. Which grader fits?',
    options: [
      {
        text: 'A rubric graded by a model (LLM-as-judge), checked against people’s grades on a sample',
        correct: true,
        explain: 'Tone has no exact answer for code to compare against. A judge scales; a human sample keeps it honest.',
      },
      {
        text: 'An exact string match against a reference answer',
        correct: false,
        explain: 'A polite answer can be worded in countless ways; exact match would fail almost all of them.',
      },
      {
        text: 'A regular expression for rude words',
        correct: false,
        explain: 'It catches a few obvious cases and misses curt or jargon-filled answers entirely.',
      },
    ],
  },
  {
    id: 'unsupported',
    type: 'choice',
    prompt:
      'Source [1] says “up to 60 requests per minute”. The answer says “up to 100 requests per minute [1]”. Which category is it?',
    options: [
      {
        text: 'An unsupported claim: the number 100 appears in no cited source',
        correct: true,
        explain: 'The citation exists, but the source doesn’t back the claim. This is the most common hallucination in RAG answers.',
      },
      {
        text: 'A bad citation',
        correct: false,
        explain: 'The citation points at a real source. The problem is what the answer claims, not where it points.',
      },
      {
        text: 'Correct, because it cites a source',
        correct: false,
        explain: 'A citation is a claim that the source supports the answer; it has to be checked.',
      },
    ],
  },
  {
    id: 'precision',
    type: 'numeric',
    prompt:
      'A guardrail blocks 10 inputs: 7 are real injections and 3 are normal questions. What is the precision of a block? (Two decimals.)',
    answer: 0.7,
    tolerance: 0.001,
    hint: 'Precision = caught / (caught + wrongly blocked).',
    explain: '7 / (7 + 3) = 0.70. Three in ten blocked users did nothing wrong.',
  },
  {
    id: 'injection-defense',
    type: 'choice',
    prompt: 'What is the most reliable defense against prompt injection?',
    options: [
      {
        text: 'Limit what a successful injection can do: few permissions, checked tool calls, a person approving side effects',
        correct: true,
        explain: 'Filters miss rephrased or translated attacks. Limiting the damage works even when detection fails.',
      },
      {
        text: 'A long list of blocked phrases',
        correct: false,
        explain: 'The strict guardrail in this lesson still misses an attack in Spanish, and blocks four normal questions.',
      },
      {
        text: 'Telling the model in the system prompt to ignore injections',
        correct: false,
        explain: 'It helps somewhat, but models can’t reliably separate instructions from data.',
      },
    ],
  },
];

export const graderExercise: Exercise = {
  id: 'grade-refusal',
  prompt:
    'Write `grade(answer, expected)` where `expected` is a phrase, or None when the sources don’t answer the question. Return "pass" or "fail".',
  starter: `REFUSALS = ["does not say", "does not mention", "can't confirm", "don't know"]

def grade(answer, expected):
    pass`,
  hints: [
    'An answer refuses if it contains any phrase in REFUSALS (compare in lowercase).',
    'expected is None: pass only if the answer refuses.',
    'Otherwise: pass only if it doesn’t refuse and contains the expected phrase.',
  ],
  solution: `REFUSALS = ["does not say", "does not mention", "can't confirm", "don't know"]

def grade(answer, expected):
    text = answer.lower()
    refused = any(r in text for r in REFUSALS)
    if expected is None:
        return "pass" if refused else "fail"
    return "pass" if not refused and expected.lower() in text else "fail"`,
  explanation:
    'Grading both directions matters: an assistant that refuses everything never invents facts, and is useless. The lesson’s v2 prompt fails one case exactly this way.',
  tests: `assert grade("The link is valid for 30 minutes [1].", "30 minutes") == "pass", 'a correct answer passes'
assert grade("The link is valid for 24 hours [1].", "30 minutes") == "fail", 'a wrong fact fails'
assert grade("The help center does not mention that.", None) == "pass", 'refusing an unanswerable question passes'
assert grade("Yes, Lumen runs on Linux.", None) == "fail", 'answering an unanswerable question fails'
assert grade("The context does not say.", "not refunded") == "fail", 'refusing an answerable question fails'`,
};
