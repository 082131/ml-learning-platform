import type { HandsOnTask } from '@/lib/exam/types';

// Hands-on part of the AI Engineer exam: 5 tasks, 100 points. Standard-library Python only, no API key needed:
// the model in task 4 is a scripted stand-in, so the task tests your agent loop, not a real model.
// Every solution passes all its checks and every starter fails them (content/exams/exams-python.test.ts).

const NOT_DONE = 'raise NotImplementedError';

export const tasks: HandsOnTask[] = [
  {
    id: 'ai-h1',
    title: 'Sentence-aware chunking with overlap',
    domain: 'rag',
    brief: `Write \`chunk(text, max_words, overlap_sentences)\` for a RAG ingestion pipeline.

Split \`text\` into sentences: a sentence ends at \`.\`, \`!\` or \`?\` followed by whitespace or the end of the text; strip each sentence and drop empty ones. Count words with \`str.split()\`.

Build chunks greedily: start a chunk, add sentences while the total word count stays at or below \`max_words\`. When the next sentence does not fit, close the chunk; the next chunk starts with the last \`overlap_sentences\` sentences of the closed chunk (fewer if it had fewer), then continues. A single sentence longer than \`max_words\` becomes a chunk of its own with no overlap carried into or out of it. Every sentence must appear in at least one chunk, and no chunk may repeat the previous chunk exactly.

Return a list of strings, each the chunk's sentences joined by a single space.`,
    starter: `import re

def chunk(text, max_words, overlap_sentences):
    ${NOT_DONE}
`,
    solution: `import re

def chunk(text, max_words, overlap_sentences):
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\\s+', text.strip()) if s.strip()]
    words = lambda group: sum(len(s.split()) for s in group)
    chunks, current, fresh = [], [], 0
    for s in sentences:
        if len(s.split()) > max_words:
            if fresh:
                chunks.append(current)
            chunks.append([s])
            current, fresh = [], 0
            continue
        if current and words(current + [s]) > max_words:
            if fresh:
                chunks.append(current)
            current = current[len(current) - overlap_sentences:] if overlap_sentences else []
            while current and words(current + [s]) > max_words:
                current = current[1:]
            fresh = 0
        current = current + [s]
        fresh += 1
    if fresh:
        chunks.append(current)
    return [' '.join(c) for c in chunks]
`,
    checks: [
      {
        name: 'Packs sentences up to the word limit',
        points: 5,
        tests: `_t = 'One two three. Four five. Six seven eight nine! Ten?'
assert chunk(_t, 5, 0) == ['One two three. Four five.', 'Six seven eight nine! Ten?'], chunk(_t, 5, 0)
assert chunk(_t, 100, 0) == [_t], "everything fits in one chunk"
`,
      },
      {
        name: 'Carries overlap sentences into the next chunk',
        points: 6,
        tests: `_t = 'A b. C d. E f. G h. I j.'
_c = chunk(_t, 6, 1)
assert _c == ['A b. C d. E f.', 'E f. G h. I j.'], _c
_c2 = chunk('W1 w. W2 w. W3 w. W4 w.', 4, 1)
assert _c2 == ['W1 w. W2 w.', 'W2 w. W3 w.', 'W3 w. W4 w.'], _c2
`,
      },
      {
        name: 'Handles sentences longer than the limit',
        points: 4,
        tests: `_t = 'Short one. This sentence is far too long to fit. Tail end.'
_c = chunk(_t, 4, 1)
assert _c == ['Short one.', 'This sentence is far too long to fit.', 'Tail end.'], _c
`,
      },
    ],
  },
  {
    id: 'ai-h2',
    title: 'Hybrid retrieval: BM25, rank fusion and retrieval metrics',
    domain: 'rag',
    brief: `Write four functions. Documents and queries are lists of lower-case tokens.

\`bm25(query, docs, k1=1.5, b=0.75)\` returns one score per document: the sum over query terms \`t\` (each distinct term once) of \`idf(t) * f * (k1 + 1) / (f + k1 * (1 - b + b * len(d) / avgdl))\`, where \`f\` is the count of \`t\` in the document, \`avgdl\` the mean document length, and \`idf(t) = ln((N - n + 0.5) / (n + 0.5) + 1)\` with \`n\` the number of documents containing \`t\`.

\`rrf(rankings, k=60)\` fuses several ranked lists of document IDs: each ID scores \`sum(1 / (k + rank))\` over the lists it appears in (rank starts at 1). Return IDs sorted by score, highest first, ties broken by ID ascending.

\`recall_at_k(ranked, relevant, k)\`: the share of \`relevant\` IDs found in the first \`k\` of \`ranked\`.

\`mrr(results)\`: \`results\` is a list of \`(ranked, relevant)\` pairs; return the mean over queries of \`1 / rank\` of the first relevant ID (0 when none is found).`,
    starter: `import math

def bm25(query, docs, k1=1.5, b=0.75):
    ${NOT_DONE}

def rrf(rankings, k=60):
    ${NOT_DONE}

def recall_at_k(ranked, relevant, k):
    ${NOT_DONE}

def mrr(results):
    ${NOT_DONE}
`,
    solution: `import math

def bm25(query, docs, k1=1.5, b=0.75):
    n_docs = len(docs)
    avgdl = sum(len(d) for d in docs) / n_docs
    scores = [0.0] * n_docs
    for t in set(query):
        n = sum(1 for d in docs if t in d)
        idf = math.log((n_docs - n + 0.5) / (n + 0.5) + 1)
        for i, d in enumerate(docs):
            f = d.count(t)
            if f:
                scores[i] += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * len(d) / avgdl))
    return scores

def rrf(rankings, k=60):
    score = {}
    for ranking in rankings:
        for rank, doc in enumerate(ranking, 1):
            score[doc] = score.get(doc, 0.0) + 1 / (k + rank)
    return sorted(score, key=lambda d: (-score[d], d))

def recall_at_k(ranked, relevant, k):
    return len(set(ranked[:k]) & set(relevant)) / len(relevant)

def mrr(results):
    total = 0.0
    for ranked, relevant in results:
        for rank, doc in enumerate(ranked, 1):
            if doc in relevant:
                total += 1 / rank
                break
    return total / len(results)
`,
    checks: [
      {
        name: 'BM25 matches the formula',
        points: 9,
        tests: `import math
_docs = [['red', 'apple', 'pie'], ['green', 'apple'], ['red', 'red', 'car', 'fast', 'car']]
_s = bm25(['red', 'apple', 'red'], _docs)
_avg = 10 / 3
def _term(f, dl, n):
    return math.log((3 - n + 0.5) / (n + 0.5) + 1) * f * 2.5 / (f + 1.5 * (0.25 + 0.75 * dl / _avg))
_want = [_term(1, 3, 2) + _term(1, 3, 2), _term(1, 2, 2), _term(2, 5, 2)]
assert all(abs(a - b) < 1e-9 for a, b in zip(_s, _want)), f"{_s} vs {_want}"
assert bm25(['zebra'], _docs) == [0.0, 0.0, 0.0]
`,
      },
      {
        name: 'Reciprocal rank fusion',
        points: 8,
        tests: `_f = rrf([['a', 'b', 'c'], ['c', 'a', 'd']], k=60)
assert _f == ['a', 'c', 'b', 'd'], _f
assert rrf([['x', 'y'], ['y', 'x']]) == ['x', 'y'], "equal scores break ties by ID"
`,
      },
      {
        name: 'Recall@k and MRR',
        points: 8,
        tests: `assert recall_at_k(['a', 'b', 'c', 'd'], ['c', 'z'], 3) == 0.5
assert recall_at_k(['a', 'b'], ['a'], 1) == 1.0
_m = mrr([(['x', 'a'], {'a'}), (['a'], {'a'}), (['p', 'q'], {'a'})])
assert abs(_m - (0.5 + 1 + 0) / 3) < 1e-12, _m
`,
      },
    ],
  },
  {
    id: 'ai-h3',
    title: 'Validate and extract structured output',
    domain: 'prompt',
    brief: `Model output must be checked before your code trusts it. Write two functions.

\`extract_json(text)\` returns the first complete top-level JSON object in \`text\` (which may have prose or a fenced block around it) parsed with \`json.loads\`, or \`None\`. Find it by scanning for \`{\` and matching braces, ignoring braces inside JSON strings (watch for escaped quotes). If a candidate fails to parse, keep scanning after its opening brace.

\`validate(value, schema, path="$")\` supports this subset of JSON Schema: \`type\` (\`"object"\`, \`"array"\`, \`"string"\`, \`"integer"\`, \`"number"\`, \`"boolean"\`, \`"null"\`, or a list of these), \`properties\`, \`required\`, \`additionalProperties: false\`, \`items\`, \`enum\`, \`minimum\`, \`maximum\`. Booleans are not integers or numbers. Return a list of error strings \`"<path>: <message>"\` (paths like \`$.items[2].qty\`), checking \`type\` first and stopping at that node if it fails. Return \`[]\` when valid.`,
    starter: `import json

def extract_json(text):
    ${NOT_DONE}

def validate(value, schema, path='$'):
    ${NOT_DONE}
`,
    solution: `import json

def extract_json(text):
    start = text.find('{')
    while start != -1:
        depth, in_str, esc = 0, False, False
        for i in range(start, len(text)):
            ch = text[i]
            if in_str:
                if esc:
                    esc = False
                elif ch == '\\\\':
                    esc = True
                elif ch == '"':
                    in_str = False
            elif ch == '"':
                in_str = True
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except ValueError:
                        break
        start = text.find('{', start + 1)
    return None

def _is(value, t):
    if t == 'object':
        return isinstance(value, dict)
    if t == 'array':
        return isinstance(value, list)
    if t == 'string':
        return isinstance(value, str)
    if t == 'boolean':
        return isinstance(value, bool)
    if t == 'null':
        return value is None
    if isinstance(value, bool):
        return False
    if t == 'integer':
        return isinstance(value, int) or (isinstance(value, float) and value.is_integer())
    if t == 'number':
        return isinstance(value, (int, float))
    return False

def validate(value, schema, path='$'):
    errors = []
    t = schema.get('type')
    if t is not None:
        types = t if isinstance(t, list) else [t]
        if not any(_is(value, x) for x in types):
            return [f'{path}: expected {"/".join(types)}']
    if 'enum' in schema and value not in schema['enum']:
        errors.append(f'{path}: not one of {schema["enum"]}')
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if 'minimum' in schema and value < schema['minimum']:
            errors.append(f'{path}: below minimum {schema["minimum"]}')
        if 'maximum' in schema and value > schema['maximum']:
            errors.append(f'{path}: above maximum {schema["maximum"]}')
    if isinstance(value, dict):
        props = schema.get('properties', {})
        for key in schema.get('required', []):
            if key not in value:
                errors.append(f'{path}: missing required "{key}"')
        for key, v in value.items():
            if key in props:
                errors += validate(v, props[key], f'{path}.{key}')
            elif schema.get('additionalProperties') is False:
                errors.append(f'{path}: unexpected "{key}"')
    if isinstance(value, list) and 'items' in schema:
        for i, v in enumerate(value):
            errors += validate(v, schema['items'], f'{path}[{i}]')
    return errors
`,
    checks: [
      {
        name: 'Extracts JSON from prose and fences',
        points: 6,
        tests: `assert extract_json('Sure! Here it is: {"a": 1, "b": {"c": [1, 2]}} Hope that helps.') == {'a': 1, 'b': {'c': [1, 2]}}
assert extract_json('Some text { not json } and then {"ok": true}') == {'ok': True}
assert extract_json('no json here') is None
`,
      },
      {
        name: 'Ignores braces inside strings',
        points: 4,
        tests: `assert extract_json('x {"msg": "use } and { freely", "q": "say \\\\"}\\\\""} y') == {'msg': 'use } and { freely', 'q': 'say "}"'}
`,
      },
      {
        name: 'Validates types, required fields and paths',
        points: 6,
        tests: `_schema = {'type': 'object', 'required': ['id', 'items'], 'additionalProperties': False, 'properties': {
    'id': {'type': 'string'},
    'items': {'type': 'array', 'items': {'type': 'object', 'required': ['qty'], 'properties': {'qty': {'type': 'integer', 'minimum': 1}}}},
    'note': {'type': ['string', 'null']}}}
assert validate({'id': 'A', 'items': [{'qty': 2}], 'note': None}, _schema) == []
_e = validate({'items': [{'qty': 2}, {'qty': 0}, {'qty': True}], 'extra': 1}, _schema)
assert sorted(_e) == sorted(['$: missing required "id"', '$.items[1].qty: below minimum 1', '$.items[2].qty: expected integer', '$: unexpected "extra"']), _e
`,
      },
      {
        name: 'Enums, numbers and booleans',
        points: 4,
        tests: `assert validate('red', {'enum': ['red', 'blue']}) == []
assert validate('pink', {'type': 'string', 'enum': ['red', 'blue']}) == ["$: not one of ['red', 'blue']"]
assert validate(2.5, {'type': 'number', 'maximum': 2}) == ['$: above maximum 2']
assert validate(False, {'type': 'number'}) == ['$: expected number']
assert validate(3.0, {'type': 'integer'}) == []
`,
      },
    ],
  },
  {
    id: 'ai-h4',
    title: 'A safe tool-calling agent loop',
    domain: 'prompt',
    brief: `Write \`run_agent(model, tools, user_message, max_steps=5, confirm=None)\`.

\`model(messages)\` is a function you call with the conversation so far. It returns either \`{"type": "text", "text": ...}\` (the final answer) or \`{"type": "tool_call", "id": ..., "name": ..., "args": {...}}\`. \`messages\` starts as \`[{"role": "user", "content": user_message}]\`. After each model reply, append \`{"role": "assistant", "content": reply}\`.

For a tool call, append \`{"role": "tool", "id": <call id>, "content": <result>}\` and call the model again, where the result is:

- \`{"error": "unknown tool"}\` if \`name\` is not in \`tools\`;
- \`{"error": "not confirmed"}\` if the tool is in \`tools\` with \`"dangerous": True\` and \`confirm\` is \`None\` or \`confirm(name, args)\` returns False;
- \`{"error": "repeated call"}\` if the same name and args were already called in this run (do not run it again);
- \`{"error": "<ExceptionType>: <message>"}\` if the tool raises;
- otherwise \`{"result": <return value>}\`.

\`tools\` maps names to \`{"fn": callable, "dangerous": bool}\`; call \`fn(**args)\`. Return \`(final_text, messages)\`. If the model has not answered after \`max_steps\` model calls, return \`("Stopped: step limit reached", messages)\`.`,
    starter: `def run_agent(model, tools, user_message, max_steps=5, confirm=None):
    ${NOT_DONE}
`,
    solution: `import json

def run_agent(model, tools, user_message, max_steps=5, confirm=None):
    messages = [{'role': 'user', 'content': user_message}]
    seen = set()
    for _ in range(max_steps):
        reply = model(messages)
        messages.append({'role': 'assistant', 'content': reply})
        if reply['type'] == 'text':
            return reply['text'], messages
        name, args = reply['name'], reply.get('args', {})
        key = (name, json.dumps(args, sort_keys=True))
        tool = tools.get(name)
        if tool is None:
            result = {'error': 'unknown tool'}
        elif tool.get('dangerous') and (confirm is None or not confirm(name, args)):
            result = {'error': 'not confirmed'}
        elif key in seen:
            result = {'error': 'repeated call'}
        else:
            seen.add(key)
            try:
                result = {'result': tool['fn'](**args)}
            except Exception as e:
                result = {'error': f'{type(e).__name__}: {e}'}
        messages.append({'role': 'tool', 'id': reply['id'], 'content': result})
    return 'Stopped: step limit reached', messages
`,
    checks: [
      {
        name: 'Runs a tool and returns the answer',
        points: 6,
        tests: `def _model(msgs):
    if msgs[-1]['role'] == 'user':
        return {'type': 'tool_call', 'id': 't1', 'name': 'add', 'args': {'a': 2, 'b': 3}}
    return {'type': 'text', 'text': f"Sum is {msgs[-1]['content']['result']}"}
_text, _msgs = run_agent(_model, {'add': {'fn': lambda a, b: a + b, 'dangerous': False}}, 'add 2 and 3')
assert _text == 'Sum is 5', _text
assert [m['role'] for m in _msgs] == ['user', 'assistant', 'tool', 'assistant']
assert _msgs[2] == {'role': 'tool', 'id': 't1', 'content': {'result': 5}}
`,
      },
      {
        name: 'Errors go back to the model, not up the stack',
        points: 5,
        tests: `_calls = iter([{'type': 'tool_call', 'id': '1', 'name': 'nope', 'args': {}},
               {'type': 'tool_call', 'id': '2', 'name': 'div', 'args': {'a': 1, 'b': 0}},
               {'type': 'text', 'text': 'done'}])
_text, _msgs = run_agent(lambda m: next(_calls), {'div': {'fn': lambda a, b: a / b, 'dangerous': False}}, 'go')
assert _text == 'done'
assert _msgs[2]['content'] == {'error': 'unknown tool'}
assert _msgs[4]['content'] == {'error': 'ZeroDivisionError: division by zero'}, _msgs[4]
`,
      },
      {
        name: 'Dangerous tools need confirmation',
        points: 5,
        tests: `_ran = []
_tools = {'refund': {'fn': lambda amount: _ran.append(amount) or 'ok', 'dangerous': True}}
def _model(msgs):
    if msgs[-1]['role'] == 'user':
        return {'type': 'tool_call', 'id': 'r', 'name': 'refund', 'args': {'amount': 50}}
    return {'type': 'text', 'text': str(msgs[-1]['content'])}
assert run_agent(_model, _tools, 'refund')[0] == "{'error': 'not confirmed'}" and _ran == [], "no confirm function: must not run"
assert run_agent(_model, _tools, 'refund', confirm=lambda n, a: a['amount'] < 10)[0] == "{'error': 'not confirmed'}" and _ran == []
assert run_agent(_model, _tools, 'refund', confirm=lambda n, a: True)[0] == "{'result': 'ok'}" and _ran == [50]
`,
      },
      {
        name: 'Stops loops and enforces the step limit',
        points: 4,
        tests: `_n = []
def _loop(msgs):
    return {'type': 'tool_call', 'id': str(len(msgs)), 'name': 'search', 'args': {'q': 'same'}}
_text, _msgs = run_agent(_loop, {'search': {'fn': lambda q: _n.append(q) or [], 'dangerous': False}}, 'find', max_steps=4)
assert _text == 'Stopped: step limit reached'
assert len(_n) == 1, f"the repeated search must run only once, ran {len(_n)} times"
assert [m['content'] for m in _msgs if m['role'] == 'tool'][1:] == [{'error': 'repeated call'}] * 3
`,
      },
    ],
  },
  {
    id: 'ai-h5',
    title: 'PII redaction guardrail',
    domain: 'safety',
    brief: `Write \`redact(text)\` that returns \`(clean_text, counts)\` before text is logged or sent to a model.

Replace, in this order:

1. Card numbers: runs of 13 to 19 digits, optionally separated by single spaces or hyphens, that pass the Luhn checksum, with \`[CARD]\`. Digit runs that fail Luhn are left alone (they may be order numbers).
2. Email addresses matching \`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\` with \`[EMAIL]\`.
3. Phone numbers: an optional \`+\` and country code, then 10 digits written as \`XXX-XXX-XXXX\`, \`XXX.XXX.XXXX\`, \`(XXX) XXX-XXXX\` or \`XXX XXX XXXX\`, with \`[PHONE]\`.

\`counts\` maps \`"card"\`, \`"email"\` and \`"phone"\` to how many of each were replaced (include zeros). Also write \`luhn_ok(digits)\` for a string of digits.`,
    starter: `import re

def luhn_ok(digits):
    ${NOT_DONE}

def redact(text):
    ${NOT_DONE}
`,
    solution: `import re

CARD = re.compile(r'(?<![\\d-])\\d(?:[ -]?\\d){12,18}(?![\\d-])')
EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}')
PHONE = re.compile(r'(?<!\\w)(?:\\+\\d{1,3}[ .-]?)?(?:\\(\\d{3}\\) ?|\\d{3}[-. ])\\d{3}[-. ]\\d{4}(?!\\d)')

def luhn_ok(digits):
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0

def redact(text):
    counts = {'card': 0, 'email': 0, 'phone': 0}
    def card(m):
        digits = re.sub(r'\\D', '', m.group())
        if luhn_ok(digits):
            counts['card'] += 1
            return '[CARD]'
        return m.group()
    text = CARD.sub(card, text)
    text, counts['email'] = EMAIL.subn('[EMAIL]', text)
    text, counts['phone'] = PHONE.subn('[PHONE]', text)
    return text, counts
`,
    checks: [
      {
        name: 'Luhn checksum',
        points: 4,
        tests: `assert luhn_ok('4111111111111111') and luhn_ok('79927398713')
assert not luhn_ok('4111111111111112') and not luhn_ok('79927398710')
`,
      },
      {
        name: 'Cards are redacted only when Luhn-valid',
        points: 6,
        tests: `_t, _c = redact('Card 4111 1111 1111 1111 and 5500-0000-0000-0004, order 1234567890123456.')
assert _t == 'Card [CARD] and [CARD], order 1234567890123456.', _t
assert _c['card'] == 2
`,
      },
      {
        name: 'Emails and phone formats',
        points: 6,
        tests: `_t, _c = redact('Mail ann.lee+x@corp.co.uk or call (415) 555-0132, +1 415.555.0199 or 415 555 0100.')
assert _t == 'Mail [EMAIL] or call [PHONE], [PHONE] or [PHONE].', _t
assert _c == {'card': 0, 'email': 1, 'phone': 3}, _c
`,
      },
      {
        name: 'Leaves ordinary text alone',
        points: 4,
        tests: `_s = 'Version 2.10.3 shipped on 2026-11-12 with 1500 users and ticket 12345.'
assert redact(_s) == (_s, {'card': 0, 'email': 0, 'phone': 0}), redact(_s)
`,
      },
    ],
  },
];
