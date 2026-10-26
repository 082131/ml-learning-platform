import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'who-runs',
    type: 'choice',
    prompt:
      'The model replies with a tool_use block for calculator({"expression": "2480 * 0.175"}). Who computes 434?',
    options: [
      {
        text: 'Your code: it reads the tool_use block, runs the calculator, and sends the result back',
        correct: true,
        explain:
          'The model only proposes a call. Running it, and deciding whether it may run at all, is your program’s job.',
      },
      {
        text: 'The model, while it writes the tool_use block',
        correct: false,
        explain:
          'The model writes the call, not the result. The 434 comes from your calculator, in the next message.',
      },
      {
        text: 'The API provider runs your Python function on its servers',
        correct: false,
        explain:
          'Your functions never leave your machine. The provider only sees the tool definitions and the results you send.',
      },
    ],
  },
  {
    id: 'what-model-sees',
    type: 'choice',
    prompt: 'What does the model know about the calculator tool when it decides whether to call it?',
    options: [
      {
        text: 'Its name, its description and its input_schema',
        correct: true,
        explain:
          'That is the whole definition sent with each request, so the description has to say what the tool is for.',
      },
      {
        text: 'The source code of the calculator function',
        correct: false,
        explain: 'The code is never sent. Two tools with identical definitions look the same to the model.',
      },
      {
        text: 'Nothing: the model calls tools at random until one works',
        correct: false,
        explain: 'The model chooses from the definitions, which is why clear names and descriptions matter.',
      },
    ],
  },
  {
    id: 'errors-as-results',
    type: 'choice',
    prompt:
      'The calculator raises an error on "12 × 10 × 12 × 0.8". Why send the error back as a tool_result with is_error set, instead of stopping the program?',
    options: [
      {
        text: 'The model can read the error and retry with corrected arguments',
        correct: true,
        explain:
          'In the failure task, the next turn retries with * and the run still ends with the right answer.',
      },
      {
        text: 'Errors are cheaper than successful results',
        correct: false,
        explain:
          'Cost is not the point. A retry costs another model turn, which is why the loop also limits failures.',
      },
      {
        text: 'The API rejects any request that has no tool_result',
        correct: false,
        explain:
          'A tool_result is required for each tool_use block when you continue the conversation, but stopping the program is also possible. Returning the error lets the model recover.',
      },
    ],
  },
  {
    id: 'error-limit',
    type: 'numeric',
    prompt:
      'In the task “A failed call, then a retry”, set “Failed tool calls allowed” to 0. How many tool calls run before the loop stops?',
    answer: 2,
    tolerance: 0,
    hint: 'The search succeeds. Count until the first failure: one more failure than allowed stops the loop.',
    explain:
      'The search runs and succeeds (1), then the calculator fails on “×” (2). That is 1 failure, more than the limit of 0, so the loop stops before the retry.',
  },
  {
    id: 'loop-order',
    type: 'order',
    prompt: 'Put one round of the agent loop in order.',
    items: [
      'Send the conversation and the tool definitions to the model',
      'Append the model’s reply, with its tool_use blocks, to the conversation',
      'Run each requested tool in your code',
      'Append the tool results as one user message',
      'Check the limits, then start the next round',
    ],
    explain:
      'The model proposes, your code executes, and the conversation carries every call and result into the next round.',
  },
];

export const toolResultExercise: Exercise = {
  id: 'call-tool',
  prompt:
    'Write `call_tool(tools, name, args)`. `tools` maps names to functions. Return `{"content": str(result), "is_error": False}` on success. On an unknown tool, or when the function raises, return an error result instead of raising.',
  starter: `def call_tool(tools, name, args):
    pass`,
  hints: [
    'Check `name not in tools` first and return an error result that names the tool.',
    'Call the function with `tools[name](**args)` inside `try`.',
    'In `except Exception as e`, build the content with `f"{type(e).__name__}: {e}"`.',
  ],
  solution: `def call_tool(tools, name, args):
    if name not in tools:
        return {"content": f"unknown tool {name!r}", "is_error": True}
    try:
        return {"content": str(tools[name](**args)), "is_error": False}
    except Exception as e:
        return {"content": f"{type(e).__name__}: {e}", "is_error": True}`,
  explanation:
    'Every outcome, good or bad, becomes a result the model can read. Unknown tools, missing arguments and exceptions inside the tool are all reported with is_error set, so the loop keeps control and the model gets a chance to correct itself.',
  tests: `tools = {"add": lambda a, b: a + b, "div": lambda a, b: a / b}
assert call_tool(tools, "add", {"a": 2, "b": 3}) == {"content": "5", "is_error": False}, 'a successful call returns its result as text, with is_error False'
r = call_tool(tools, "div", {"a": 1, "b": 0})
assert r["is_error"] is True, 'an exception should become a result with is_error True'
assert r["content"] == "ZeroDivisionError: division by zero", 'the content should be "ErrorType: message"'
r = call_tool(tools, "mul", {"a": 2, "b": 3})
assert r["is_error"] is True and "mul" in r["content"], 'an unknown tool should be an error that names the tool'
r = call_tool(tools, "add", {"a": 2})
assert r["is_error"] is True and r["content"].startswith("TypeError"), 'a missing argument should come back as a TypeError result, not crash'`,
};
