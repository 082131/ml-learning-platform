import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'key',
    type: 'choice',
    prompt: 'Where should the model provider’s API key live in a web app?',
    options: [
      {
        text: 'On your server, read from an environment variable or secret store; the browser calls your server',
        correct: true,
        explain: 'Your server holds the key, validates input, limits usage per user and calls the provider.',
      },
      {
        text: 'In the frontend bundle, minified so nobody can read it',
        correct: false,
        explain: 'Minifying hides nothing. Anyone can open the developer tools and copy it.',
      },
      {
        text: 'In localStorage after the user logs in',
        correct: false,
        explain: 'Anything in the browser is readable by the user and by any script injected into the page.',
      },
    ],
  },
  {
    id: 'stream-time',
    type: 'numeric',
    prompt:
      'Time to first token is 0.8 s and the model writes 50 tokens per second. How many seconds until a 600-token reply is complete?',
    answer: 12.8,
    tolerance: 0.001,
    hint: 'Total = TTFT + tokens / tokens per second.',
    explain: '0.8 + 600 / 50 = 0.8 + 12 = 12.8 s. With streaming, the user starts reading at 0.8 s.',
  },
  {
    id: 'midstream-error',
    type: 'choice',
    prompt: 'The provider fails halfway through a streamed reply. How does the browser find out?',
    options: [
      {
        text: 'Your server sends an error event in the stream, because the 200 status was already sent',
        correct: true,
        explain: 'Once streaming starts, the status line is gone. Errors must be events your frontend handles.',
      },
      {
        text: 'The HTTP status changes to 500',
        correct: false,
        explain: 'A response has one status, sent before the first byte of the body.',
      },
      {
        text: 'It doesn’t need to: the partial answer is good enough',
        correct: false,
        explain: 'A half answer that looks complete is worse than a clear error with a retry button.',
      },
    ],
  },
  {
    id: 'parser',
    type: 'choice',
    prompt: 'Why does an SSE client need a buffer between network reads?',
    options: [
      {
        text: 'A read can end in the middle of a line or event, so incomplete text must wait for the next piece',
        correct: true,
        explain: 'TCP delivers bytes, not events. The parser completes an event only at the blank line that ends it.',
      },
      {
        text: 'To slow the text down so it is readable',
        correct: false,
        explain: 'Buffering here is about correctness, not pacing.',
      },
      {
        text: 'Because each event arrives twice',
        correct: false,
        explain: 'Each byte arrives once; the cut points between reads are what vary.',
      },
    ],
  },
  {
    id: 'validation',
    type: 'choice',
    prompt: 'Why validate the request (for example, a question of 1 to 2,000 characters) before calling the model?',
    options: [
      {
        text: 'Bad or huge inputs are rejected for free with a clear 4xx error instead of costing a model call',
        correct: true,
        explain: 'Every model call costs money and time. Limits on input size also bound your worst-case cost per request.',
      },
      {
        text: 'The model can’t read long text',
        correct: false,
        explain: 'Models read long inputs; the point is controlling cost and abuse.',
      },
      {
        text: 'It makes the answer more accurate',
        correct: false,
        explain: 'Validation protects the system; answer quality is a separate concern.',
      },
    ],
  },
];

export const sseExercise: Exercise = {
  id: 'sse-format',
  prompt: 'Write `sse(event, payload)` that returns one server-sent event with the payload as JSON on the data line.',
  starter: `import json

def sse(event, payload):
    pass`,
  hints: ['Two lines, "event: ..." and "data: ...", then a blank line.', 'The string ends with "\\n\\n".'],
  solution: `import json

def sse(event, payload):
    return f"event: {event}\\ndata: {json.dumps(payload)}\\n\\n"`,
  explanation:
    'json.dumps escapes newlines inside the text as \\n, so a multi-line answer still fits on one data line and can’t end the event early.',
  tests: `assert sse("done", {}) == "event: done\\ndata: {}\\n\\n", 'an event line, a data line and a blank line'
s = sse("text_delta", {"text": "line one\\nline two"})
assert s.count("\\n") == 3, 'a newline inside the text must not add lines to the event'
assert json.loads(s.split("data: ", 1)[1]) == {"text": "line one\\nline two"}, 'the data line is the JSON payload'`,
};
