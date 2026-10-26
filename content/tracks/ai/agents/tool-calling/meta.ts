import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/agents/tool-calling',
  title: 'Tool calling, agents and workflows',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Trace the agent loop: model turn, tool call, tool result, next turn, until an answer or a limit',
    'Define a tool with a name, a description and an input schema the model can call',
    'Validate tool arguments and return failures to the model as error results it can recover from',
    'Bound an agent with limits on model turns and failed tool calls',
    'Choose between a fixed workflow and an agent for a task',
  ],
  prerequisites: ['ai/prompting/structured-outputs', 'ai/rag/rag-pipeline'],
  concepts: ['tool-calling', 'tool-schema', 'agent-loop', 'agent', 'llm-workflow'],
  references: [
    {
      title: 'Claude documentation: Tool use with Claude',
      url: 'https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview',
    },
    {
      title: 'Anthropic, Building effective agents',
      url: 'https://www.anthropic.com/engineering/building-effective-agents',
    },
    {
      title: 'Yao et al., ReAct: Synergizing Reasoning and Acting in Language Models',
      url: 'https://arxiv.org/abs/2210.03629',
    },
  ],
} satisfies LessonMeta;
