import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ai/agents/tool-calling',
  title: 'Tool calling, agents and workflows',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain the loop of model output, tool call and tool result',
    'Define a tool with a schema the model can call',
    'Handle tool failures and retries safely',
  ],
  prerequisites: ['ai/prompting/structured-outputs'],
  concepts: [],
} satisfies LessonMeta;
