// Code for the pretrained models and APIs lesson. The retry simulator is src/lib/ai/retry.ts (unit-tested); its
// server is scripted and its times are simulated. The SDK and Transformers samples are not run on this page, so no
// output is shown for them. The pure-Python runner was run with CPython 3.13 and its output copied here.
// SDK usage follows the anthropic Python SDK 1.x documentation (see references).
import { retryExperiment, type RetryState } from '@/lib/ai/retry';
import type { CodeExample } from '@/lib/types';

export const retry = retryExperiment('retry', {
  scenario: 'rate-limit',
  maxRetries: 4,
  baseDelay: 1,
  jitter: true,
  honorRetryAfter: true,
  seed: 7,
});

const st = (s: unknown) => s as RetryState;
const py = (b: boolean) => (b ? 'True' : 'False');

export const apiCall: CodeExample = {
  id: 'api-call',
  language: 'python',
  source: `import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    system="You are the support assistant for Lumen Notes. Answer in two sentences.",
    messages=[{"role": "user", "content": "What does error E-402 mean?"}],
)

for block in response.content:
    if block.type == "text":
        print(block.text)
print(response.stop_reason)                     # "end_turn", or "max_tokens" if cut off
print(response.usage.input_tokens, response.usage.output_tokens)`,
  annotations: [
    {
      id: 'client',
      range: { line: 3 },
      kind: 'framework',
      title: 'anthropic.Anthropic()',
      what: 'Creates a client. With no arguments it reads the API key from the ANTHROPIC_API_KEY environment variable.',
      why: 'Keeping the key in the environment keeps it out of your code and your repository.',
    },
    {
      id: 'model',
      range: { line: 6 },
      kind: 'parameter',
      title: 'model',
      what: 'Which model to run. Providers retire old model names, so keep this in configuration, not scattered through code.',
      why: 'The model is the biggest lever on quality, speed and price.',
    },
    {
      id: 'max-tokens',
      range: { line: 7 },
      kind: 'parameter',
      title: 'max_tokens',
      what: 'The most output tokens the model may produce. Generation stops there, mid-sentence if need be.',
      why: 'It bounds cost and latency. Check stop_reason to know whether the answer was cut off.',
    },
    {
      id: 'system',
      range: { line: 8 },
      kind: 'parameter',
      title: 'system',
      what: 'Instructions that apply to the whole conversation.',
      why: 'Separating instructions from the user’s message makes both easier to change and to test.',
    },
    {
      id: 'messages',
      range: { line: 9 },
      kind: 'parameter',
      title: 'messages',
      what: 'The conversation so far, as a list of user and assistant turns.',
      why: 'The API is stateless: you send the whole history every time, and you pay for it as input tokens.',
    },
    {
      id: 'content',
      range: { line: 12 },
      kind: 'syntax',
      title: 'response.content',
      what: 'A list of content blocks. Text replies are blocks of type "text"; tool calls are blocks of type "tool_use".',
      why: 'Always check a block’s type before reading .text.',
    },
    {
      id: 'usage',
      range: { line: 16 },
      kind: 'variable',
      title: 'response.usage',
      what: 'The tokens you were billed for: input (system, history, question) and output.',
      why: 'Log it with every request. It is how you track cost and spot prompts that grew too long.',
    },
  ],
};

export const responseShape: CodeExample = {
  id: 'response-shape',
  language: 'json',
  source: `{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "model": "claude-opus-5-5",
  "content": [{ "type": "text", "text": "..." }],
  "stop_reason": "end_turn",
  "usage": { "input_tokens": 41, "output_tokens": 37 }
}`,
  annotations: [
    {
      id: 'stop',
      range: { line: 7 },
      kind: 'variable',
      title: 'stop_reason',
      what: 'Why generation ended: "end_turn" (finished), "max_tokens" (cut off), "tool_use" (wants a tool) and others.',
      why: 'A program that ignores it will happily use half an answer.',
    },
    {
      id: 'usage-json',
      range: { line: 8 },
      kind: 'variable',
      title: 'usage',
      what: 'Token counts for this request. The numbers here are illustrative, not from a real call.',
      why: 'Cost = input tokens · input price + output tokens · output price.',
    },
  ],
};

export const localModel: CodeExample = {
  id: 'local-model',
  language: 'python',
  source: `from transformers import pipeline

# Downloads the model once (about 268 MB), then runs on your CPU or GPU.
classifier = pipeline(
    "sentiment-analysis",
    model="distilbert/distilbert-base-uncased-finetuned-sst-2-english",
)
print(classifier(["Sync works again, thank you!", "I was charged twice."]))`,
  annotations: [
    {
      id: 'pipeline',
      range: { line: 1 },
      kind: 'framework',
      title: 'transformers.pipeline',
      what: 'Hugging Face’s high-level helper: it downloads a model and its tokenizer and wraps preprocessing, the forward pass and postprocessing.',
      why: 'The quickest way to run a pretrained model you host yourself.',
    },
    {
      id: 'model-name',
      range: { line: 6 },
      kind: 'parameter',
      title: 'model=',
      what: 'A small (about 67 million parameter) DistilBERT already fine-tuned for positive/negative sentiment.',
      why: 'Name the model explicitly: the default for a task can change between library versions.',
    },
  ],
};

export const retryCode: CodeExample = {
  id: 'retry-loop',
  language: 'python',
  source: `import random, time
import anthropic

client = anthropic.Anthropic(max_retries=0)  # we retry ourselves
MAX_RETRIES, BASE, JITTER, HONOR_RETRY_AFTER = {{max_retries}}, {{base}}, {{jitter}}, {{honor}}

def create_with_retries(**request):
    for attempt in range(MAX_RETRIES + 1):
        try:
            return client.messages.create(**request)
        except (anthropic.RateLimitError, anthropic.InternalServerError) as e:
            if attempt == MAX_RETRIES:
                raise
            retry_after = e.response.headers.get("retry-after")
            if HONOR_RETRY_AFTER and retry_after is not None:
                wait = float(retry_after)
            else:
                cap = min(30, BASE * 2 ** attempt)
                wait = random.uniform(0, cap) if JITTER else cap
            time.sleep(wait)
        # 400, 401 and other errors are not caught: a retry cannot fix them`,
  slots: {
    max_retries: (s) => String(st(s).maxRetries),
    base: (s) => st(s).baseDelay.toFixed(1),
    jitter: (s) => py(st(s).jitter),
    honor: (s) => py(st(s).honorRetryAfter),
  },
  annotations: [
    {
      id: 'settings',
      range: { line: 5 },
      kind: 'parameter',
      title: 'Retry settings',
      what: 'The settings of the experiment above, filled from its current state.',
      why: 'The SDK retries 429 and 5xx errors twice by default; writing the loop out shows what that does.',
    },
    {
      id: 'except',
      range: { line: 11 },
      kind: 'syntax',
      title: 'except (RateLimitError, InternalServerError)',
      what: 'Catches only errors a retry can fix: rate limits and server-side failures.',
      why: 'A 400 means the request is wrong. Sending it again gets the same 400 and wastes time.',
    },
    {
      id: 'retry-after',
      range: { line: 14 },
      kind: 'variable',
      title: 'retry-after',
      what: 'The header in which the server says how many seconds to wait.',
      why: 'The server knows when your limit resets; your backoff formula only guesses.',
    },
    {
      id: 'backoff',
      range: { line: 18 },
      kind: 'math',
      title: 'BASE * 2 ** attempt',
      what: 'Exponential backoff: 1, 2, 4, 8 … seconds with BASE = 1, capped at 30.',
      why: 'Each failure suggests the problem lasts longer, so wait longer.',
    },
    {
      id: 'jitter',
      range: { line: 19 },
      kind: 'math',
      title: 'random.uniform(0, cap)',
      what: 'Full jitter: a random wait between 0 and the backoff delay.',
      why: 'Without it, thousands of clients that failed at the same moment retry at the same moment, and fail again together.',
    },
  ],
};

export const retryRunner: CodeExample = {
  id: 'retry-runner',
  language: 'python',
  run: 'pyodide',
  source: `class RateLimited(Exception):
    def __init__(self, retry_after):
        self.retry_after = retry_after


class FakeServer:
    """Rejects requests for the first 4 seconds with 429 and Retry-After: 4."""
    def __init__(self):
        self.clock = 0.0

    def call(self):
        if self.clock < 4:
            self.clock += 0.2
            raise RateLimited(retry_after=4)
        self.clock += 1.6
        return "ok"


def call_with_retries(server, max_retries=4, base=1.0, honor_retry_after=True):
    for attempt in range(max_retries + 1):
        try:
            result = server.call()
            print(f"t={server.clock:4.1f}s attempt {attempt + 1}: 200")
            return result
        except RateLimited as e:
            print(f"t={server.clock:4.1f}s attempt {attempt + 1}: 429")
            if attempt == max_retries:
                raise
            wait = e.retry_after if honor_retry_after else base * 2 ** attempt
            server.clock += wait          # a real client would time.sleep(wait)


call_with_retries(FakeServer(), honor_retry_after=True)
print("---")
call_with_retries(FakeServer(), honor_retry_after=False)`,
  annotations: [],
  expectedOutput: `t= 0.2s attempt 1: 429
t= 5.8s attempt 2: 200
---
t= 0.2s attempt 1: 429
t= 1.4s attempt 2: 429
t= 3.6s attempt 3: 429
t= 9.2s attempt 4: 200`,
};
