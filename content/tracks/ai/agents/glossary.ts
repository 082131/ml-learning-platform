import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the ai/agents chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'tool-calling',
    term: 'Tool calling',
    short:
      'A model replying with a structured request to run a named tool with arguments, which your code executes and answers with the result.',
    long: 'Also called function calling. The model sees tool definitions (name, description, input schema), not code. It proposes calls; your program validates and runs them, and sends the results back in the conversation.',
    introducedIn: 'ai/agents/tool-calling',
    aliases: ['function calling', 'tool use', 'tool call', 'tool calls'],
  },
  {
    id: 'tool-schema',
    term: 'Tool schema',
    short:
      'The JSON Schema that describes a tool’s arguments: their names, types, descriptions and which are required.',
    long: 'Sent with the tool’s name and description on every request. The model writes arguments that follow it; your code should still validate them before running the tool.',
    introducedIn: 'ai/agents/tool-calling',
    aliases: ['input_schema', 'input schema'],
  },
  {
    id: 'agent-loop',
    term: 'Agent loop',
    short:
      'The cycle of calling the model, running the tools it asks for, and sending back the results, until it answers or a limit is reached.',
    long: 'The conversation list is the loop’s memory. A safe loop limits the number of model turns and failed tool calls, and asks a person before any tool with side effects.',
    introducedIn: 'ai/agents/tool-calling',
    aliases: ['agentic loop'],
  },
  {
    id: 'agent',
    term: 'Agent',
    short: 'A program in which a language model decides, step by step, which tools to call to reach a goal.',
    long: 'Contrast with a workflow, where your code fixes the steps and the model fills in parts. Agents handle open-ended tasks at the price of less predictable cost, time and behavior.',
    introducedIn: 'ai/agents/tool-calling',
    aliases: ['agents', 'AI agent'],
  },
  {
    id: 'llm-workflow',
    term: 'Workflow (LLM)',
    short: 'A fixed sequence of steps written in code, some of which call a language model.',
    long: 'Retrieve, then summarize, then classify, always in that order. Easier to test and cheaper to run than an agent; prefer it whenever the steps are known in advance.',
    introducedIn: 'ai/agents/tool-calling',
    aliases: ['workflow', 'workflows'],
  },
] satisfies GlossaryTerm[];
