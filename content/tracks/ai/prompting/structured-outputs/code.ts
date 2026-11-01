// Code for the structured outputs lesson. Parsing, the JSON Schema validator, the retry message and the prompt
// scoring live in src/lib/ai/jsonSchema.ts and src/lib/ai/triage.ts (unit-tested). The model replies are scripted.
// The SDK sample follows the anthropic Python SDK 1.x docs and is not run here. The pure-Python runner was run with
// CPython 3.13 and its output copied here.
import { compareExperiment, triageExperiment } from '@/lib/ai/triage';
import type { CodeExample } from '@/lib/types';

export const triage = triageExperiment('triage', { reply: 'fenced', stripFences: false });
export const compare = compareExperiment('prompt-compare', { stripFences: true });

export const promptCode: CodeExample = {
  id: 'triage-prompt',
  language: 'python',
  source: `SYSTEM = """You triage support tickets for Lumen Notes, a note-taking app.

Categories:
- billing: plans, charges, refunds, payment errors (codes starting with B)
- sync: syncing, offline edits, conflicted copies, sync errors (codes starting with E)
- account: sign-in, passwords, two-factor, locked accounts
- api: API tokens, rate limits, exports through the API
- other: anything else, including feature requests

Urgency: 1 = question, 2 = something is broken, 3 = money or data at risk.
Set needs_human to true when money must be refunded or an account changed.

Reply with only a JSON object with the keys category, urgency, summary (at most 80 characters) and needs_human.

Example ticket: "My old API token stopped working."
Example reply: {"category": "api", "urgency": 2, "summary": "Old API token stopped working", "needs_human": false}
"""`,
  annotations: [
    {
      id: 'role',
      range: { line: 1 },
      kind: 'syntax',
      title: 'Role and task',
      what: 'One sentence saying what the model is doing and for whom.',
      why: 'Context changes how borderline inputs are read: “locked” means something different in a note app and a bank.',
    },
    {
      id: 'definitions',
      range: { line: 3 },
      kind: 'syntax',
      title: 'Category definitions',
      what: 'Each allowed value with what belongs in it, including the error-code hint.',
      why: 'Most classification mistakes are disagreements about definitions. Writing them down fixes the model and your team at once.',
    },
    {
      id: 'rules',
      range: { line: 10 },
      kind: 'syntax',
      title: 'Rules for the other fields',
      what: 'What each urgency level means, and when a person must step in.',
      why: 'A field without a rule gets filled with the model’s guess, differently each time.',
    },
    {
      id: 'format',
      range: { line: 13 },
      kind: 'syntax',
      title: 'Output format',
      what: 'Exactly which keys to return, and nothing else.',
      why: 'Asking for “only a JSON object” reduces the chatty prefixes that break json.loads.',
    },
    {
      id: 'example',
      range: { line: 15 },
      kind: 'syntax',
      title: 'A worked example',
      what: 'One input and the exact reply wanted (few-shot prompting).',
      why: 'The example shows the format and settles a borderline case: an API token problem is api, not account.',
    },
  ],
};

export const sdkCode: CodeExample = {
  id: 'structured-sdk',
  language: 'python',
  source: `import json
import anthropic

client = anthropic.Anthropic()
TICKET_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": ["billing", "sync", "account", "api", "other"]},
        "urgency": {"type": "integer", "enum": [1, 2, 3]},
        "summary": {"type": "string"},
        "needs_human": {"type": "boolean"},
    },
    "required": ["category", "urgency", "summary", "needs_human"],
    "additionalProperties": False,
}

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    system=SYSTEM,
    messages=[{"role": "user", "content": ticket_text}],
    output_config={"format": {"type": "json_schema", "schema": TICKET_SCHEMA}},
)
if response.stop_reason == "max_tokens":
    raise ValueError("reply was cut off")
ticket = json.loads(next(b.text for b in response.content if b.type == "text"))
errors = validate(ticket)  # still check the rules the schema can't express, such as length`,
  annotations: [
    {
      id: 'schema',
      range: { line: 5 },
      kind: 'variable',
      title: 'TICKET_SCHEMA',
      what: 'The JSON Schema of a valid reply: types, allowed values, required keys and no extra keys.',
      why: 'One schema serves three jobs: it constrains the model, documents the format and validates the result.',
    },
    {
      id: 'output-config',
      range: { line: 22 },
      kind: 'parameter',
      title: 'output_config.format',
      what: 'Asks the API to constrain generation so the reply is JSON matching the schema.',
      why: 'Constrained decoding removes most format errors. Supported schema features are limited, so check the provider’s docs.',
    },
    {
      id: 'cut-off',
      range: { line: 24 },
      kind: 'syntax',
      title: 'stop_reason == "max_tokens"',
      what: 'A reply cut off by the token limit is incomplete JSON even with a schema.',
      why: 'Check it before parsing, or json.loads fails with a confusing error.',
    },
    {
      id: 'validate',
      range: { line: 27 },
      kind: 'function',
      title: 'validate(ticket)',
      what: 'Your own checks after parsing.',
      why: 'Business rules (summary length, consistency between fields) are still yours to enforce.',
    },
  ],
};

export const validateRunner: CodeExample = {
  id: 'validate-runner',
  language: 'python',
  run: 'pyodide',
  source: `import json

CATEGORIES = {"billing", "sync", "account", "api", "other"}


def check_ticket(raw):
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        return [f"not valid JSON: {e.msg} at position {e.pos}"]
    if not isinstance(data, dict):
        return ["expected an object"]
    errors = []
    for key in ["category", "urgency", "summary", "needs_human"]:
        if key not in data:
            errors.append(f"missing {key}")
    if "category" in data and data["category"] not in CATEGORIES:
        errors.append(f"category {data['category']!r} is not allowed")
    if "urgency" in data and not (isinstance(data["urgency"], int) and 1 <= data["urgency"] <= 3):
        errors.append("urgency must be an integer from 1 to 3")
    return errors


replies = [
    '{"category": "billing", "urgency": 2, "summary": "Charged twice", "needs_human": true}',
    '{"category": "payments", "urgency": "high", "summary": "Charged twice"}',
    'Sure! Here is the JSON: {"category": "billing"}',
]
for raw in replies:
    print(check_ticket(raw) or "valid")`,
  annotations: [],
  expectedOutput: `valid
['missing needs_human', "category 'payments' is not allowed", 'urgency must be an integer from 1 to 3']
['not valid JSON: Expecting value at position 0']`,
};
