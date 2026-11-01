import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'validate',
    type: 'choice',
    prompt: 'The API constrains output to your JSON Schema. Do you still need to validate the reply in code?',
    options: [
      {
        text: 'Yes: replies can be cut off by max_tokens, and business rules the schema can’t express still need checking',
        correct: true,
        explain: 'Constrained decoding removes most format errors, not all failures, and it can’t know that a refund over $500 needs a person.',
      },
      {
        text: 'No: the schema guarantees a correct answer',
        correct: false,
        explain: 'It guarantees the shape, not the content. A valid object can still have the wrong category.',
      },
      {
        text: 'Only when the temperature is above 0',
        correct: false,
        explain: 'Temperature changes randomness; truncation and wrong content happen at any temperature.',
      },
    ],
  },
  {
    id: 'fence',
    type: 'choice',
    prompt: 'A reply starts with ```json and ends with ```. What is the most robust fix?',
    options: [
      {
        text: 'Unwrap that exact fence pattern before parsing, and treat any other extra text as a validation failure',
        correct: true,
        explain: 'The fence is a predictable wrapper. Guessing where JSON starts inside arbitrary prose is how silent bugs begin.',
      },
      {
        text: 'Take everything between the first { and the last }',
        correct: false,
        explain: 'It works until the prose contains a brace, or the model returns two objects. Then it silently parses the wrong thing.',
      },
      {
        text: 'Ignore the reply',
        correct: false,
        explain: 'The content is fine; only the wrapper is unexpected. Unwrapping it is safe.',
      },
    ],
  },
  {
    id: 'retry-once',
    type: 'choice',
    prompt: 'A reply fails validation. What should the program do?',
    options: [
      {
        text: 'Send the validation errors back to the model once, then fall back (a default, a person, or an error) if it fails again',
        correct: true,
        explain: 'Models usually fix a precise error message on the first retry. A limit keeps cost and latency bounded.',
      },
      {
        text: 'Retry the same request until it passes',
        correct: false,
        explain: 'Without the error, the model may repeat the mistake, and an unbounded loop is a cost risk.',
      },
      {
        text: 'Use the parts that look right',
        correct: false,
        explain: 'Partially valid data spreads into the rest of your system, where it is much harder to find.',
      },
    ],
  },
  {
    id: 'compare',
    type: 'numeric',
    prompt:
      'Prompt A gets 6 of 10 labeled tickets right and prompt B gets 9 of 10. By how many percentage points does B beat A?',
    answer: 30,
    tolerance: 0,
    hint: 'Convert both to percentages first.',
    explain: '90% − 60% = 30 percentage points. With only 10 examples, though, one ticket is 10 points: collect more before trusting small gaps.',
  },
  {
    id: 'parts',
    type: 'order',
    prompt: 'Put the parts of the triage prompt in the order this lesson uses.',
    items: ['Role and task', 'Category definitions', 'Rules for the other fields', 'Output format', 'A worked example'],
    explain: 'Context first, then the rules, then the exact format, then an example that shows the format in use.',
  },
];

export const parseExercise: Exercise = {
  id: 'parse-ticket',
  prompt:
    'Write `parse_ticket(raw)` that returns the ticket dict if `raw` is valid, or None. Unwrap a ```json fence first.',
  starter: `import json

CATEGORIES = {"billing", "sync", "account", "api", "other"}

def parse_ticket(raw):
    pass`,
  hints: [
    'If the stripped text starts with "```", drop the first line and the last "```".',
    'Wrap json.loads in try/except json.JSONDecodeError and return None on failure.',
    'Check the four keys, the category, and that urgency is an int from 1 to 3.',
  ],
  solution: `import json

CATEGORIES = {"billing", "sync", "account", "api", "other"}

def parse_ticket(raw):
    text = raw.strip()
    if text.startswith("\`\`\`"):
        text = text.split("\\n", 1)[1].rsplit("\`\`\`", 1)[0]
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict) or set(data) != {"category", "urgency", "summary", "needs_human"}:
        return None
    if data["category"] not in CATEGORIES:
        return None
    if type(data["urgency"]) is not int or not 1 <= data["urgency"] <= 3:
        return None
    return data`,
  explanation:
    'Returning None for anything unexpected forces the caller to handle failure explicitly (retry or fall back). `type(...) is not int` rejects True, which Python otherwise treats as the integer 1.',
  tests: `ok = '{"category": "sync", "urgency": 2, "summary": "E-402", "needs_human": false}'
assert parse_ticket(ok)["category"] == "sync", 'a valid reply parses'
assert parse_ticket("\`\`\`json\\n" + ok + "\\n\`\`\`") is not None, 'a fenced reply is unwrapped'
assert parse_ticket("Here you go: " + ok) is None, 'text before the JSON is rejected'
assert parse_ticket(ok.replace("sync", "payments")) is None, 'an unknown category is rejected'
assert parse_ticket(ok.replace('"urgency": 2', '"urgency": "high"')) is None, 'urgency must be an integer'
assert parse_ticket(ok.replace('"urgency": 2', '"urgency": true')) is None, 'True is not an urgency'
assert parse_ticket('{"category": "sync"') is None, 'truncated JSON is rejected'`,
};
