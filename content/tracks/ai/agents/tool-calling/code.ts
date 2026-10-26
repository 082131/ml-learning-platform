// Code for the tool-calling lesson. The model's turns are a script written for the lesson; the agent loop, the
// argument validation and both tools (calculator, search_docs) run in src/lib/ai and are unit-tested. The
// Anthropic loop below was run against a mocked HTTP transport with anthropic 2.1.0, not against the API. The
// pure-Python runner was run with CPython 3.13 and its output copied here.
import { agentExperiment, toolPlayground, type AgentState, type Scenario } from '@/lib/ai/agent';
import { lumenDocs } from '@/lib/ai/lumen';
import { pyStr } from '@/lib/ai/pythonRepr';
import { TOOLS } from '@/lib/ai/tools';
import type { Annotation, CodeExample } from '@/lib/types';

export const scenarios: Scenario[] = [
  {
    id: 'percent',
    title: 'One calculation',
    question: 'What is 17.5% of 2,480?',
    script: [
      {
        kind: 'call',
        say: 'I’ll compute this with the calculator.',
        call: { tool: 'calculator', args: { expression: '2480 * 0.175' } },
      },
      { kind: 'answer', text: '17.5% of 2,480 is 434.' },
    ],
  },
  {
    id: 'team-storage',
    title: 'Search, then calculate',
    question: 'Our team of 12 is on the Team plan. How much storage do we get in total?',
    script: [
      {
        kind: 'call',
        say: 'I need the storage per member on the Team plan.',
        call: { tool: 'search_docs', args: { query: 'Team plan storage per member' } },
      },
      {
        kind: 'call',
        say: 'Each Team member gets 100 GB. Now 12 members:',
        call: { tool: 'calculator', args: { expression: '12 * 100' } },
      },
      {
        kind: 'answer',
        text: 'Each Team member gets 100 GB of storage, so a team of 12 gets 1,200 GB in total (source: Plans and pricing).',
      },
    ],
  },
  {
    id: 'annual-cost',
    title: 'A failed call, then a retry',
    question: 'What would the Team plan cost per year for 12 people if we pay yearly?',
    script: [
      {
        kind: 'call',
        say: 'I need the Team price and the discount for paying yearly.',
        call: { tool: 'search_docs', args: { query: 'Team plan price per member yearly discount' } },
      },
      {
        kind: 'call',
        say: '$10 per member per month, 20% off when paying yearly:',
        call: { tool: 'calculator', args: { expression: '12 × 10 × 12 × 0.8' } },
      },
      {
        kind: 'call',
        say: 'The calculator only accepts * for multiplication. Retrying:',
        call: { tool: 'calculator', args: { expression: '12 * 10 * 12 * 0.8' } },
      },
      {
        kind: 'answer',
        text: 'The Team plan costs $10 per member per month, and paying yearly gives a 20% discount: 12 members × $10 × 12 months × 0.8 = $1,152 per year (source: Plans and pricing).',
      },
    ],
  },
];

export const agent = agentExperiment('agent', scenarios, lumenDocs, {
  scenario: 'annual-cost',
  maxSteps: 6,
  maxToolErrors: 1,
  shown: 1,
});

export const playground = toolPlayground('tool-playground', lumenDocs, {
  tool: 'calculator',
  args: '{"expression": "12 × 10"}',
});

const st = (s: unknown) => s as AgentState;

/** TOOLS as a Python list literal: JSON objects are valid Python dicts here (no true, false or null). */
const toolsBlock = TOOLS.map((t) =>
  JSON.stringify(t, null, 4)
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n'),
).join(',\n');

const agentSource = `import anthropic

client = anthropic.Anthropic()  # reads the ANTHROPIC_API_KEY environment variable

tools = [
${toolsBlock},
]

def run_tool(name, args):
    if name == "calculator":
        return calculator(args["expression"])  # the safe evaluator in agent_loop.py below
    if name == "search_docs":
        return search_docs(args["query"])  # BM25 over the help center, as in the RAG lesson
    raise ValueError(f"unknown tool {name!r}")

def run_agent(question, max_steps={{maxSteps}}, max_tool_errors={{maxToolErrors}}):
    messages = [{"role": "user", "content": question}]
    errors = 0
    for _ in range(max_steps):
        response = client.messages.create(
            model="claude-opus-5-5", max_tokens=4096, tools=tools, messages=messages
        )
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return "".join(b.text for b in response.content if b.type == "text")
        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            try:
                output, failed = str(run_tool(block.name, block.input)), False
            except Exception as e:
                output, failed = f"{type(e).__name__}: {e}", True
                errors += 1
            results.append({"type": "tool_result", "tool_use_id": block.id, "content": output, "is_error": failed})
        messages.append({"role": "user", "content": results})
        if errors > max_tool_errors:
            return f"Stopped: {errors} failed tool call(s), limit {max_tool_errors}."
    return f"Stopped: reached {max_steps} model turns."

print(run_agent({{question}}))`;

/** The 1-based line and code-point columns of the nth `token` on the first line containing `lineText`. */
function span(lineText: string, token: string, nth = 0): Pick<Annotation, 'range' | 'match'> {
  const lines = agentSource.split('\n');
  const i = lines.findIndex((l) => l.includes(lineText));
  if (i < 0) throw new Error(`no line contains ${lineText}`);
  let col = -1;
  for (let k = 0; k <= nth; k++) col = lines[i]!.indexOf(token, col + 1);
  if (col < 0) throw new Error(`"${token}" not on line ${i + 1}`);
  return { range: { line: i + 1, startCol: col, endCol: col + token.length }, match: token };
}

export const agentCode: CodeExample = {
  id: 'agent-loop-api',
  language: 'python',
  source: agentSource,
  slots: {
    maxSteps: (s) => String(st(s).maxSteps),
    maxToolErrors: (s) => String(st(s).maxToolErrors),
    question: (s) => pyStr(scenarios.find((x) => x.id === st(s).scenario)?.question ?? ''),
  },
  annotations: [
    {
      id: 'tools',
      ...span('tools = [', 'tools'),
      kind: 'variable',
      title: 'tools',
      what: 'The tool definitions sent with every request: a name, a description and an input_schema for each. They are the same definitions the browser experiment validates against.',
      why: 'The model never sees your Python functions, only these definitions. It picks a tool and writes its arguments from the name, the description and the schema alone.',
    },
    {
      id: 'description',
      ...span('"description": "Evaluate', '"description"'),
      kind: 'parameter',
      title: 'description',
      what: 'Plain-language instructions for the model: what the tool does, what it accepts, and when to use it.',
      why: 'A vague description is the most common reason a model calls the wrong tool or skips it. Say what the tool cannot do, too.',
    },
    {
      id: 'input-schema',
      ...span('"input_schema": {', '"input_schema"'),
      kind: 'parameter',
      title: 'input_schema',
      what: 'A JSON Schema for the arguments: an object with typed, described properties, and the required ones listed.',
      why: 'The model writes arguments that follow the schema, and your code should still check them before running anything.',
    },
    {
      id: 'create',
      ...span('response = client.messages.create(', 'client.messages.create'),
      kind: 'framework',
      title: 'client.messages.create(…, tools=tools, messages=messages)',
      what: 'One model turn. The whole conversation so far goes in, including earlier tool calls and their results.',
      why: 'The API keeps no state between calls: the messages list is the agent’s memory.',
      output: 'A response whose content holds text blocks and tool_use blocks',
    },
    {
      id: 'append-assistant',
      ...span('messages.append({"role": "assistant"', 'response.content'),
      kind: 'variable',
      title: 'response.content',
      what: 'The model’s turn is appended to the conversation exactly as returned, tool_use blocks included.',
      why: 'Each tool result must answer a tool_use block with the same id in the previous assistant turn.',
    },
    {
      id: 'stop-reason',
      ...span('if response.stop_reason != "tool_use":', 'response.stop_reason != "tool_use"'),
      kind: 'syntax',
      title: 'stop_reason != "tool_use"',
      what: 'The model asked for no tool, so its text is the answer and the loop ends.',
      why: 'stop_reason is "tool_use" when the model wants a tool run. Other values include "end_turn", "max_tokens" and "refusal"; production code should handle the last two separately rather than return a partial or refused answer.',
    },
    {
      id: 'run-tool',
      ...span('output, failed = str(run_tool', 'run_tool(block.name, block.input)'),
      kind: 'function',
      title: 'run_tool(block.name, block.input)',
      what: 'Your code runs the tool. The model only proposed the call.',
      why: 'This is where permissions, validation and side effects live. A tool that sends email or deletes data should ask a person first.',
    },
    {
      id: 'except',
      ...span('output, failed = f"{type(e).__name__}', 'output, failed'),
      kind: 'variable',
      title: 'output, failed = error text, True',
      what: 'A failed tool call becomes a result too: the error message, marked as an error.',
      why: 'The model can read the error and retry with corrected arguments, which is exactly what the failure scenario shows.',
    },
    {
      id: 'tool-result',
      ...span('results.append({"type": "tool_result"', '"is_error": failed'),
      kind: 'parameter',
      title: '"is_error": failed',
      what: 'Each tool_result names the tool_use_id it answers, carries the output as content, and says whether it failed.',
      why: 'All results of one turn go back together in a single user message.',
    },
    {
      id: 'error-limit',
      ...span('if errors > max_tool_errors:', 'errors > max_tool_errors'),
      kind: 'syntax',
      title: 'errors > max_tool_errors',
      what: 'Stops the loop once more tool calls have failed than allowed.',
      why: 'A model can repeat the same failing call. Without a limit, that costs money and time until max_steps.',
    },
    {
      id: 'step-limit',
      ...span('for _ in range(max_steps):', 'range(max_steps)'),
      kind: 'syntax',
      title: 'range(max_steps)',
      what: 'At most max_steps model turns, then the loop gives up.',
      why: 'Every agent loop needs a hard stop: each turn is a paid API call, and nothing else guarantees the model will finish.',
    },
  ],
};

/** Runs in the browser with Pyodide. Pure Python: the model is a script, the tools are real. */
export const loopRunner: CodeExample = {
  id: 'agent-loop-runner',
  language: 'python',
  run: 'pyodide',
  source: `import ast
import operator

OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
       ast.Div: operator.truediv, ast.USub: operator.neg}

def calculator(expression):
    def ev(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in OPS:
            return OPS[type(node.op)](ev(node.left), ev(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in OPS:
            return OPS[type(node.op)](ev(node.operand))
        raise ValueError(f"not allowed: {ast.unparse(node)}")
    return ev(ast.parse(expression, mode="eval").body)

PRICES = {"Plus": 6, "Team": 10}  # dollars per member per month

def get_price(plan):
    return PRICES[plan]

TOOLS = {"calculator": calculator, "get_price": get_price}

# The model's turns, written by hand. A real agent asks the model for each turn.
SCRIPT = [
    {"tool": "get_price", "args": {"plan": "Team"}},
    {"tool": "calculator", "args": {"expression": "12 × 10 × 12 × 0.8"}},
    {"tool": "calculator", "args": {"expression": "12 * 10 * 12 * 0.8"}},
    {"answer": "$1,152 per year."},
]

def run_agent(question, script, max_steps=6, max_tool_errors=1):
    messages = [{"role": "user", "content": question}]
    errors = 0
    for step in range(max_steps):
        turn = script[step]  # a real agent: turn = model(messages)
        messages.append({"role": "assistant", "content": turn})
        if "answer" in turn:
            return turn["answer"]
        try:
            result, is_error = TOOLS[turn["tool"]](**turn["args"]), False
        except Exception as e:
            result, is_error = f"{type(e).__name__}: {e}", True
            errors += 1
        print(f"turn {step + 1}: {turn['tool']}({turn['args']}) -> {result}")
        messages.append({"role": "user", "content": result, "is_error": is_error})
        if errors > max_tool_errors:
            return f"Stopped: {errors} failed tool call(s), limit {max_tool_errors}."
    return f"Stopped: reached {max_steps} model turns."

question = "Team plan for 12 people, paid yearly: cost per year?"
print(run_agent(question, SCRIPT))
print(run_agent(question, SCRIPT, max_tool_errors=0))`,
  annotations: [],
  expectedOutput: `turn 1: get_price({'plan': 'Team'}) -> 10
turn 2: calculator({'expression': '12 × 10 × 12 × 0.8'}) -> SyntaxError: invalid character '×' (U+00D7) (<unknown>, line 1)
turn 3: calculator({'expression': '12 * 10 * 12 * 0.8'}) -> 1152.0
$1,152 per year.
turn 1: get_price({'plan': 'Team'}) -> 10
turn 2: calculator({'expression': '12 × 10 × 12 × 0.8'}) -> SyntaxError: invalid character '×' (U+00D7) (<unknown>, line 1)
Stopped: 1 failed tool call(s), limit 0.`,
};
