// Code for the cost and security lesson. The cost and latency model and the tool policy live in
// src/lib/ai/costModel.ts and src/lib/ai/toolPolicy.ts (unit-tested); costs are estimates at example prices, and the
// model's tool calls in the injection scenario are scripted. The caching and policy samples are not run here; the
// caching call follows the Anthropic prompt caching docs. The pure-Python runner was run with CPython 3.13.
import { costExperiment } from '@/lib/ai/costModel';
import { policyExperiment } from '@/lib/ai/toolPolicy';
import type { CodeExample } from '@/lib/types';

export const cost = costExperiment('cost', {
  requestsPerDay: 20000,
  fixedPromptTokens: 3000,
  variableTokens: 1500,
  outputTokens: 300,
  inputPrice: 4,
  outputPrice: 20,
  promptCache: false,
  responseCacheRate: 0,
});

export const policy = policyExperiment('tool-policy', {
  taskAllowlist: false,
  confirmSideEffects: false,
  recipientCheck: false,
});

export const costRunner: CodeExample = {
  id: 'cost-runner',
  language: 'python',
  run: 'pyodide',
  source: `PRICE_IN, PRICE_OUT = 4.00, 20.00     # dollars per million tokens (example prices)
CACHE_READ = 0.1                      # cached input billed at 10% (check your provider)
REQUESTS_PER_DAY = 20_000


def monthly_cost(fixed, variable, output, prompt_cache=False, response_cache_rate=0.0):
    cached = fixed if prompt_cache else 0
    uncached = fixed + variable - cached
    per_request = (uncached * PRICE_IN + cached * PRICE_IN * CACHE_READ + output * PRICE_OUT) / 1e6
    return REQUESTS_PER_DAY * 30 * (1 - response_cache_rate) * per_request


print(f"baseline:         \${monthly_cost(3000, 1500, 300):,.0f}")
print(f"+ prompt cache:   \${monthly_cost(3000, 1500, 300, prompt_cache=True):,.0f}")
print(f"+ 20% cache hits: \${monthly_cost(3000, 1500, 300, True, 0.2):,.0f}")
print(f"shorter output:   \${monthly_cost(3000, 1500, 150, True, 0.2):,.0f}")`,
  annotations: [
    {
      id: 'cached',
      range: { line: 7 },
      kind: 'variable',
      title: 'cached',
      what: 'With prompt caching, the fixed prefix (instructions and examples) is read from the provider’s cache.',
      why: 'Only an identical prefix can be cached, so the per-request parts (context, question) stay at full price.',
    },
    {
      id: 'per-request',
      range: { line: 9 },
      kind: 'math',
      title: 'per_request',
      what: 'Uncached input at full price, cached input at 10%, output at the output price.',
      why: 'Output tokens cost five times input tokens here, so shorter answers are often the biggest saving.',
    },
    {
      id: 'response-cache',
      range: { line: 10 },
      kind: 'math',
      title: '(1 - response_cache_rate)',
      what: 'Requests answered from your own cache never reach the model.',
      why: 'Repeated questions (“how do I reset my password?”) are common in support traffic.',
    },
  ],
  expectedOutput: `baseline:         $14,400
+ prompt cache:   $7,920
+ 20% cache hits: $6,336
shorter output:   $4,896`,
};

export const cachingCode: CodeExample = {
  id: 'caching',
  language: 'python',
  source: `import hashlib

def ask(question, context):
    key = hashlib.sha256(f"{PROMPT_VERSION}|{DOCS_VERSION}|{normalize(question)}".encode()).hexdigest()
    if (cached := response_cache.get(key)) is not None:
        return cached                                   # no model call at all

    response = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=400,
        system=[{
            "type": "text",
            "text": SYSTEM_PROMPT,                      # long and identical in every request
            "cache_control": {"type": "ephemeral"},     # cache everything up to here
        }],
        messages=[{"role": "user", "content": f"{context}\\n\\nQuestion: {question}"}],
    )
    log(response.usage.cache_read_input_tokens, response.usage.input_tokens)
    answer = response.content[0].text
    response_cache.set(key, answer, ttl_seconds=86_400)
    return answer`,
  annotations: [
    {
      id: 'key',
      range: { line: 4 },
      kind: 'variable',
      title: 'key',
      what: 'The response cache key: prompt version, documents version and the normalized question.',
      why: 'Including the versions means a new prompt or updated documents never serve stale answers.',
    },
    {
      id: 'hit',
      range: { line: 6 },
      kind: 'syntax',
      title: 'return cached',
      what: 'A cache hit returns in milliseconds and costs nothing.',
      why: 'Only cache answers that don’t depend on who asks: never one user’s account details.',
    },
    {
      id: 'cache-control',
      range: { line: 14 },
      kind: 'parameter',
      title: 'cache_control',
      what: 'Marks the end of the prefix the provider should cache.',
      why: 'Stable content first, changing content after the marker. Any change before it, even a timestamp, misses the cache.',
    },
    {
      id: 'usage',
      range: { line: 18 },
      kind: 'variable',
      title: 'usage.cache_read_input_tokens',
      what: 'How many input tokens were read from the cache in this request.',
      why: 'If it stays 0 across repeated requests, something in the prefix is changing. Log it.',
    },
  ],
};

export const policyCode: CodeExample = {
  id: 'tool-policy-code',
  language: 'python',
  source: `SIDE_EFFECTS = {"send_email", "delete_note"}
TASK_TOOLS = {"summarize": {"search_notes"}, "share": {"search_notes", "send_email"}}

def check_call(task, call, user):
    if call.name not in TASK_TOOLS[task]:
        return "block", "tool not offered for this task"
    if call.name == "send_email" and call.input["to"] != user.email:
        return "block", "email may only go to the signed-in user"
    if call.name in SIDE_EFFECTS:
        return "ask", "show the call to the user and wait for approval"
    return "run", "read-only"

# The tool itself runs with the user's own credentials, never an admin key:
def search_notes(query, user):
    return notes_api.search(query, token=user.token)`,
  annotations: [
    {
      id: 'allowlist',
      range: { line: 2 },
      kind: 'variable',
      title: 'TASK_TOOLS',
      what: 'For each task, the only tools the model is offered.',
      why: 'A summarizing task has no reason to send email. A tool that isn’t offered can’t be misused.',
    },
    {
      id: 'recipient',
      range: { line: 7 },
      kind: 'syntax',
      title: 'Check the arguments',
      what: 'Validates the tool call’s arguments against rules the model can’t change.',
      why: 'The model writes the arguments; an injected note can make it write the attacker’s address.',
    },
    {
      id: 'ask',
      range: { line: 9 },
      kind: 'syntax',
      title: '"ask" for side effects',
      what: 'Calls that change something wait for the user to approve them.',
      why: 'A person seeing “send all notes to audit@evil.example” will say no.',
    },
    {
      id: 'scoped-token',
      range: { line: 15 },
      kind: 'parameter',
      title: 'token=user.token',
      what: 'The tool acts with the signed-in user’s permissions.',
      why: 'Even a fully hijacked agent can then only reach what that user could reach anyway.',
    },
  ],
};
